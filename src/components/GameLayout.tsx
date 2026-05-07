import React, { useState, useCallback, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import { useGame, createLog, createItem, type Action } from '../context/GameContext';
import { getShichen } from '../systems/WorldSimulation';
import { orchestrateAIResponse, loadOrchestratorSettings } from '../systems/Orchestrator';
import { useWorldTick } from '../hooks/useWorldTick';
import { useOrchestration } from '../hooks/useOrchestration';
import { GameChoice } from './NarrativeLog';
import { useNotifications } from './Notification';
import { logger } from '../utils/logger';
import { GameHeader } from './layout/GameHeader';
import { MainArea } from './layout/MainArea';
import { RightPanel } from './layout/RightPanel';
import { PanelErrorBoundary } from './PanelErrorBoundary';
import { applyBirthSettings } from '../utils/birthSettingsApplier';
import { inferChoiceType } from '../utils/choiceUtils';
import SFX from '../utils/sfx';

const AdminPanel = lazy(() => import('./AdminPanel').then(m => ({ default: m.AdminPanel })));
const SettingsPanel = lazy(() => import('./SettingsPanel'));
const ItemInteraction = lazy(() => import('./ItemInteraction'));
const SceneImagePanel = lazy(() => import('./SceneImagePanel'));
const BirthSettingsPanel = lazy(() => import('./BirthSettingsPanel'));
const StartMenu = lazy(() => import('./StartMenu'));
const NotificationContainer = lazy(() => import('./Notification').then(m => ({ default: m.NotificationContainer })));

import type { BirthSettings, Item, Location, AIResponse, NPC, AIResponseSummary, WorldEvent, WorldState, StatKey, RomanceStage, OrchestratorSettings } from '../types/game';
import type { GeneratedScene } from './SceneImagePanel';

type TabType = 'stats' | 'inventory' | 'npcs' | 'map' | 'ai' | 'craft' | 'shop' | 'cultivation' | 'world' | 'scene';
type DeviceMode = 'auto' | 'mobile' | 'desktop';

const weatherLabel = (weather: string) => ({ clear: '晴朗', cloudy: '多云', overcast: '阴天', drizzle: '细雨', rain: '雨天', heavy_rain: '暴雨', thunderstorm: '雷雨', fog: '浓雾', snow: '小雪', blizzard: '风雪' }[weather] || weather);
const timeLabel = (time: number) => getShichen(new Date(time).getHours()).name;
const SAVE_KEYS = ['jianghu_game_save', 'apocalypse_game_save', 'wuxia_game_save'];

// ============================================================
// GameLayout — 主界面编排组件
// 已提取子组件: GameHeader / MainArea / RightPanel
// 已提取工具函数: applyBirthSettings / inferChoiceType
// 保留: 全局 state、手柄、AI 响应处理（handleAIUpdate）
// ============================================================

export const GameLayout: React.FC = () => {
  const { state, dispatch, addLog, useItem, refillItem, moveToLocation, searchLocation, rest, drinkWater, lookAround, barricadeLocation, addNoise, triggerAIGeneration, setAICallback, earnMoney } = useGame();
  const { notifications, removeNotification, notify } = useNotifications();

  // ---- UI State ----
  const [showAdmin, setShowAdmin] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [playerInput, setPlayerInput] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('stats');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDangerOverlay, setShowDangerOverlay] = useState(false);
  const [autoAIEnabled, setAutoAIEnabled] = useState(false);
  const [npcTalkRequest, setNpcTalkRequest] = useState<{ npcId: string; npcName: string; prompt: string } | null>(null);
  const [focusedNPCId, setFocusedNPCId] = useState<string | null>(null);
  const [activeChoices, setActiveChoices] = useState<GameChoice[]>([]);
  const [isWaitingAI, setIsWaitingAI] = useState(false);
  const [webInputDraft, setWebInputDraft] = useState('');
  const [showBirthSettings, setShowBirthSettings] = useState(() => !localStorage.getItem('game_birth_settings'));
  const [birthSettings, setBirthSettings] = useState<BirthSettings | null>(() => { const saved = localStorage.getItem('game_birth_settings'); return saved ? JSON.parse(saved) : null; });
  const [worldSeed, setWorldSeed] = useState(() => localStorage.getItem('jianghu_world_seed') || `seed-${Date.now()}`);
  const [deviceMode, setDeviceMode] = useState<DeviceMode>(() => (localStorage.getItem('game_device_mode') as DeviceMode) || 'auto');
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  const [actualIsMobile, setActualIsMobile] = useState(window.innerWidth < 768);
  const [sceneRequest, setSceneRequest] = useState<{ nonce: number; mode: 'scene' | 'portrait'; npcId?: string | null; npcName?: string | null } | null>(null);
  const [showStartMenu, setShowStartMenu] = useState(() => SAVE_KEYS.some((k) => !!localStorage.getItem(k)));
  const [mapHighlights, setMapHighlights] = useState<{ movedTo?: string; movedNpcIds: string[]; discoveredLocationIds: string[] }>({ movedNpcIds: [], discoveredLocationIds: [] });
  const [orchestratorSettings, setOrchestratorSettings] = useState(() => loadOrchestratorSettings());
  const [rightPanelWidth, setRightPanelWidth] = useState<number>(() => {
    const saved = Number(localStorage.getItem('jianghu_right_panel_width') || 384);
    return Number.isFinite(saved) ? Math.min(640, Math.max(320, saved)) : 384;
  });
  const [chatPanelHeight, setChatPanelHeight] = useState<number>(() => {
    const saved = Number(localStorage.getItem('jianghu_chat_panel_height') || 0);
    return Number.isFinite(saved) ? saved : 0;
  });

  // ---- Derived state ----
  const isMobileUI = deviceMode === 'mobile' || (deviceMode === 'auto' && actualIsMobile);
  const aiGeneratorRef = useRef<((action: string) => Promise<void>) | null>(null);
  const pendingSceneStoryRef = useRef('');
  const pendingSceneAnchorRef = useRef<string | null>(null);
  const resizingRef = useRef<null | 'right' | 'chat'>(null);

  // a11y: 屏幕阅读器播报工具函数 — 清空后下一帧再写入以确保重复播报
  const announceToScreenReader = useCallback((message: string) => {
    const el = document.getElementById('aria-live-announcer');
    if (el) {
      el.textContent = '';
      requestAnimationFrame(() => { el.textContent = message; });
    }
  }, []);

  const latestStoryText = useMemo(() => {
    const latest = [...state.logs].reverse().find((l) => ['ai', 'narrative', 'dialogue'].includes(l.type));
    return latest?.text || '';
  }, [state.logs]);
  const latestStoryAnchorId = useMemo(() => {
    const latest = [...state.logs].reverse().find((l) => ['ai', 'narrative', 'dialogue'].includes(l.type));
    return latest?.id || null;
  }, [state.logs]);

  // Location-derived memoized maps
  const npcCountsByLocation = useMemo(() => {
    const map: Record<string, number> = {};
    state.npcs.forEach((npc) => { map[npc.location] = (map[npc.location] || 0) + 1; });
    return map;
  }, [state.npcs]);
  const npcNamesByLocation = useMemo(() => {
    const map: Record<string, string[]> = {};
    state.npcs.forEach((npc) => { if (!map[npc.location]) map[npc.location] = []; map[npc.location].push(npc.name); });
    return map;
  }, [state.npcs]);
  const shopCountsByLocation = useMemo(() => {
    const map: Record<string, number> = {};
    state.npcs.forEach((npc) => { if (/掌柜|商贩|老板|铁匠|郎中|大夫|店小二|摊主|茶博士/.test(npc.occupation)) map[npc.location] = (map[npc.location] || 0) + 1; });
    return map;
  }, [state.npcs]);
  const factionMarksByLocation = useMemo(() => {
    const marks: Record<string, string[]> = {};
    state.npcs.forEach((npc) => {
      if (!npc.faction) return;
      if (!marks[npc.location]) marks[npc.location] = [];
      const mark = /武当|少林|峨眉|丐帮|明教|魔教/.test(npc.faction) ? '⚑' : '☯';
      if (!marks[npc.location].includes(mark)) marks[npc.location].push(mark);
    });
    return marks;
  }, [state.npcs]);
  const eventIntensityByLocation = useMemo(() => {
    const map: Record<string, number> = {};
    const recent = state.logs.slice(-80);
    state.locations.forEach((loc) => {
      const count = recent.filter((log) => log.text.includes(loc.name) || (loc.name === state.world.location && ['combat', 'warning', 'discovery', 'event'].includes(log.type))).length;
      if (count > 0) map[loc.name] = count;
    });
    return map;
  }, [state.logs, state.locations, state.world.location]);

  // ---- Handlers (defined BEFORE effects that reference them) ----
  // CRITICAL: handleChoiceSelect must be defined before the keyboard useEffect

  const handleChoiceSelect = useCallback((choice: GameChoice) => {
    const action = choice.text;
    setActiveChoices([]);
    dispatch({ type: 'ADD_LOG', payload: createLog(`choice_${Date.now()}`, `> [选择] ${action}`, 'narrative', state.world.time) });
    dispatch({ type: 'ADVANCE_TIME', payload: 2 });
    dispatch({ type: 'UPDATE_PLAYER_STAT', payload: { stat: 'stamina', value: -3 } });
    addNoise(3);
    setIsWaitingAI(true);
    setWebInputDraft(action);
    navigator.clipboard?.writeText(action).catch(() => undefined);
    if (aiGeneratorRef.current) aiGeneratorRef.current(action).finally(() => setIsWaitingAI(false));
    else { triggerAIGeneration(action); setTimeout(() => setIsWaitingAI(false), 800); }
  }, [dispatch, state.world.time, addNoise, triggerAIGeneration]);

  // ---- Effects ----
  useEffect(() => { localStorage.setItem('game_device_mode', deviceMode); }, [deviceMode]);
  useEffect(() => {
    const sync = () => setOrchestratorSettings(loadOrchestratorSettings());
    window.addEventListener('storage', sync);
    const timer = setInterval(sync, 2000);
    return () => { window.removeEventListener('storage', sync); clearInterval(timer); };
  }, []);
  useEffect(() => { const handleResize = () => setActualIsMobile(window.innerWidth < 768); window.addEventListener('resize', handleResize); return () => window.removeEventListener('resize', handleResize); }, []);
  useEffect(() => { localStorage.setItem('jianghu_right_panel_width', String(rightPanelWidth)); }, [rightPanelWidth]);
  useEffect(() => { localStorage.setItem('jianghu_chat_panel_height', String(chatPanelHeight)); }, [chatPanelHeight]);
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!resizingRef.current || isMobileUI) return;
      if (resizingRef.current === 'right') setRightPanelWidth(Math.min(640, Math.max(320, window.innerWidth - e.clientX)));
      if (resizingRef.current === 'chat') setChatPanelHeight(Math.min(window.innerHeight - 220, Math.max(260, e.clientY - 120)));
    };
    const onUp = () => { resizingRef.current = null; };
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [isMobileUI]);
  useEffect(() => { if (autoAIEnabled && aiGeneratorRef.current) setAICallback(aiGeneratorRef.current); else setAICallback(null); }, [autoAIEnabled, setAICallback]);
  useEffect(() => { if (state.settings.soundEnabled) SFX.startAmbient(); else SFX.stopAmbient(); return () => SFX.stopAmbient(); }, [state.settings.soundEnabled]);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      const num = parseInt(e.key);
      if (!Number.isNaN(num) && num >= 1 && num <= activeChoices.length) { e.preventDefault(); handleChoiceSelect(activeChoices[num - 1]); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeChoices, handleChoiceSelect]);

  useWorldTick();
  useOrchestration(orchestratorSettings);

  const handleSceneGenerated = useCallback((scene: GeneratedScene) => {
    if (!scene.imageKey && !scene.imageUrl) return;
    const dedupeKey = `${scene.location}|${scene.timeText}|${scene.weather}|${scene.mode || 'scene'}|${(scene.sourceStory || '').slice(0, 80)}|${scene.npcId || ''}`;
    const exists = [...state.logs].reverse().find(log => log.type === 'image' && log.metadata?.dedupeKey === dedupeKey);
    if (exists) return;
    const imageLog = createLog(`image_${scene.id}`, scene.mode === 'portrait' ? (scene.npcName ? `【${scene.npcName}】的人物立绘已经绘成。` : '你的人物立绘已经绘成。') : '一幅贴合当前经历的场景画面已经绘成。', 'image', state.world.time);
    imageLog.metadata = { imageUrl: scene.imageUrl, imageKey: scene.imageKey, prompt: scene.prompt, location: scene.location, timeText: scene.timeText, weather: scene.weather, dedupeKey, mode: scene.mode || 'scene', anchorLogId: scene.anchorLogId || pendingSceneAnchorRef.current || latestStoryAnchorId || undefined, npcId: scene.npcId || undefined, npcName: scene.npcName || undefined };
    dispatch({ type: 'ADD_LOG', payload: imageLog });
    if (activeTab !== 'scene') notify.success(scene.mode === 'portrait' ? '人物立绘已绘成' : '场景图已绘成', scene.npcName ? `${scene.npcName} · ${scene.location}` : `${scene.location} · ${scene.timeText} · ${scene.weather}`);
  }, [dispatch, state.logs, state.world.time, activeTab, notify, latestStoryAnchorId]);

  const requestSceneImage = useCallback((mode: 'scene' | 'portrait', npc?: NPC | null) => {
    pendingSceneStoryRef.current = latestStoryText;
    pendingSceneAnchorRef.current = latestStoryAnchorId;
    setSceneRequest({ nonce: Date.now(), mode, npcId: npc?.id || null, npcName: npc?.name || null });
    if (mode === 'scene') setActiveTab('scene');
    notify.info(mode === 'portrait' ? '正在后台生成角色立绘' : '正在为你准备场景图', mode === 'portrait' ? `${npc?.name ? `会优先生成 ${npc.name} 的人物画像，生成完成后自动写入人物资料。` : '会根据你当前的角色设定生成角色立绘。'}` : '会根据当前情节生成对应场景插图。');
  }, [latestStoryText, latestStoryAnchorId, notify]);

  const handlePlayerAction = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (!playerInput.trim() || isProcessing) return;
    const action = playerInput.trim();
    const choiceNum = parseInt(action);
    if (!Number.isNaN(choiceNum) && choiceNum >= 1 && choiceNum <= activeChoices.length) { handleChoiceSelect(activeChoices[choiceNum - 1]); setPlayerInput(''); return; }
    setActiveChoices([]);
    dispatch({ type: 'ADD_LOG', payload: createLog(`player_${Date.now()}`, `> ${action}`, 'narrative', state.world.time) });
    dispatch({ type: 'ADVANCE_TIME', payload: 2 });
    dispatch({ type: 'UPDATE_PLAYER_STAT', payload: { stat: 'stamina', value: -4 } });
    addNoise(4);
    setWebInputDraft(action);
    navigator.clipboard?.writeText(action).catch(() => undefined);
    if (autoAIEnabled) { setIsWaitingAI(true); if (aiGeneratorRef.current) aiGeneratorRef.current(action).finally(() => setIsWaitingAI(false)); else { triggerAIGeneration(action); setTimeout(() => setIsWaitingAI(false), 800); } }
    setPlayerInput('');
  }, [playerInput, isProcessing, activeChoices, handleChoiceSelect, dispatch, state.world.time, addNoise, autoAIEnabled, triggerAIGeneration]);

  // ============================================================
  // handleAIUpdate — AI 响应处理核心（~530行，保留在原文件以维持状态闭环）
  // 标记: SECTION::AI_UPDATE_START
  // ============================================================
  const handleAIUpdate = useCallback((data: AIResponse) => {
    setIsProcessing(true);
    try {
      if (!data || (!data.story_text && !data.scene_description && !data.dialogue && !data.new_items && !data.player_stat_changes && !data.choices)) { addLog('【系统提示】AI未返回有效内容，已跳过处理。', 'warning', 3); return; }

      const mergeAIResult = (raw: AIResponse): AIResponse => {
        const merged: AIResponse = { ...raw };
        const wsLocation = typeof raw.world_state_changes?.location === 'string' ? raw.world_state_changes.location : undefined;
        const candidateLocations = [raw.location_change, wsLocation].filter((v): v is string => typeof v === 'string' && !!v.trim());
        if (candidateLocations.length) {
          const unique = Array.from(new Set(candidateLocations.map(s => s.trim())));
          merged.location_change = unique[0];
          if (merged.world_state_changes && 'location' in merged.world_state_changes) {
            const { location, ...rest } = merged.world_state_changes;
            merged.world_state_changes = rest as Partial<WorldState>;
          }
        }
        const rawNewLocations = Array.isArray(raw.new_locations) ? raw.new_locations : [];
        const extraFromMovement: Partial<Location>[] = merged.location_change && !rawNewLocations.some((l) => l?.name === merged.location_change) ? [{ name: merged.location_change }] : [];
        merged.new_locations = [...rawNewLocations, ...extraFromMovement].filter((loc, idx, arr) => !!loc?.name && arr.findIndex((x) => x?.name === loc.name) === idx);
        if (Array.isArray(raw.npc_updates)) {
          const mergedNpc: Record<string, { id: string; changes: Partial<NPC> }> = {};
          raw.npc_updates.forEach((u) => { const key = u.id; const prev = mergedNpc[key] || { id: key, changes: {} }; mergedNpc[key] = { id: key, changes: { ...prev.changes, ...(u.changes || {}) } }; });
          merged.npc_updates = Object.values(mergedNpc);
        }
        return merged;
      };

      const mergedData = orchestratorSettings.enabled ? orchestrateAIResponse(mergeAIResult(data), state, orchestratorSettings).response : mergeAIResult(data);

      const ensureLocationExists = (name: string, sourceLocationName?: string) => {
        let existing = state.locations.find(l => l.name === name || l.id === name);
        if (existing) return existing;
        const inferredId = `loc_${String(name).replace(/\s+/g, '_').replace(/[^\u4e00-\u9fa5a-zA-Z0-9_]/g, '').toLowerCase()}_${Date.now().toString().slice(-4)}`;
        const inferredType = /镇|城|集|市|铺|楼|馆|驿|客栈|茶肆|医馆|铁匠/.test(name) ? 'building' : /山|谷|峡|林|野|道|崖|峰|渡|河|湖/.test(name) ? 'outdoor' : 'room';
        const sourceLoc = state.locations.find(l => l.name === (sourceLocationName || state.world.location));
        const newLocation: Location = { id: inferredId, name, type: inferredType as Location['type'], description: `${name}，一处在江湖行路中被新近踏入的地点。`, isExplored: true, isLocked: false, dangerLevel: /谷|崖|峡|林|墓|寨/.test(name) ? 45 : /镇|集|街|驿/.test(name) ? 18 : 30, noiseLevel: /集|街|镇|驿/.test(name) ? 25 : 10, lightLevel: /洞|窟|地宫|地下/.test(name) ? 20 : 60, hasElectricity: false, hasWater: /河|湖|渡|井|泉/.test(name), lootTable: ['misc_item'], isLooted: false, connectedLocations: sourceLoc ? [sourceLoc.id] : [], npcsPresent: [], hostilePresent: 0, events: [], notes: '由AI剧情自动发现' };
        dispatch({ type: 'ADD_LOCATION', payload: newLocation });
        if (sourceLoc) dispatch({ type: 'UPDATE_LOCATION', payload: { id: sourceLoc.id, updates: { connectedLocations: Array.from(new Set([...(sourceLoc.connectedLocations || []), inferredId])) } } });
        addLog(`🗺️ 地图上新增地点：${name}`, 'discovery', 2);
        return newLocation;
      };

      const applyAIMovement = (targetName: string) => {
        const currentLoc = state.locations.find(l => l.name === state.world.location);
        const targetLoc = ensureLocationExists(targetName, currentLoc?.name);
        const isConnected = !!currentLoc?.connectedLocations?.includes(targetLoc.id);
        if (isConnected) { moveToLocation(targetLoc.id); addLog(`📍 AI剧情推动你前往了：${targetLoc.name}`, 'system', 2); }
        else { dispatch({ type: 'UPDATE_WORLD', payload: { location: targetLoc.name, locationHistory: [...state.world.locationHistory, state.world.location] } }); dispatch({ type: 'ADVANCE_TIME', payload: 12 }); dispatch({ type: 'UPDATE_PLAYER_STAT', payload: { stat: 'energy', value: -6 } }); dispatch({ type: 'UPDATE_PLAYER_STAT', payload: { stat: 'stamina', value: -8 } }); dispatch({ type: 'UPDATE_LOCATION', payload: { id: targetLoc.id, updates: { isExplored: true } } }); addNoise(5, '赶路'); addLog(`📍 你辗转抵达了：${targetLoc.name}`, 'system', 2); }
        if (targetLoc.dangerLevel >= 50) { setShowDangerOverlay(true); if (state.settings.soundEnabled) SFX.danger(); setTimeout(() => setShowDangerOverlay(false), 1500); }
      };

      let mainLogId: string | null = null;
      const changedNpcIds: string[] = [];
      const discoveredLocationIds: string[] = [];

      if (mergedData.story_text) { const normalizedStory = mergedData.story_text.replace(/\s+/g, ' ').trim(); pendingSceneStoryRef.current = normalizedStory; const aiLog = createLog(`ai_${Date.now()}`, normalizedStory, 'ai', state.world.time); mainLogId = aiLog.id; pendingSceneAnchorRef.current = aiLog.id; dispatch({ type: 'ADD_LOG', payload: aiLog }); const brief = normalizedStory.slice(0, 80); announceToScreenReader(`新剧情：${brief}${normalizedStory.length > 80 ? '…' : ''}`); }
      if (mergedData.scene_description) { const sceneLog = createLog(`scene_${Date.now()}`, mergedData.scene_description, 'narrative', state.world.time); if (!mainLogId) pendingSceneAnchorRef.current = sceneLog.id; dispatch({ type: 'ADD_LOG', payload: sceneLog }); }
      if (mergedData.dialogue && Array.isArray(mergedData.dialogue)) { const storyText = (mergedData.story_text || '').replace(/\s+/g, ''); mergedData.dialogue.forEach((d, i) => { const combined = `${d.speaker}${d.text}`.replace(/\s+/g, ''); const onlyText = (d.text || '').replace(/\s+/g, ''); if (storyText.includes(combined) || (onlyText && storyText.includes(onlyText))) return; setTimeout(() => dispatch({ type: 'ADD_LOG', payload: createLog(`dialogue_${Date.now()}_${i}`, `${d.speaker}${d.mood ? `（${d.mood}）` : ''}：${d.text}`, 'dialogue', state.world.time) }), i * 200); }); }
      if (mergedData.new_locations?.length) { mergedData.new_locations.forEach((rawLoc) => { if (!rawLoc?.name) return; const created = ensureLocationExists(rawLoc.name, state.world.location); if (!discoveredLocationIds.includes(created.id)) discoveredLocationIds.push(created.id); const mergedUpdates: Record<string, unknown> = {}; if (typeof rawLoc.description === 'string' && rawLoc.description.trim()) mergedUpdates.description = rawLoc.description.trim(); if (typeof rawLoc.dangerLevel === 'number') mergedUpdates.dangerLevel = Math.max(0, Math.min(100, rawLoc.dangerLevel)); if (typeof rawLoc.noiseLevel === 'number') mergedUpdates.noiseLevel = Math.max(0, Math.min(100, rawLoc.noiseLevel)); if (typeof rawLoc.lightLevel === 'number') mergedUpdates.lightLevel = Math.max(0, Math.min(100, rawLoc.lightLevel)); if (typeof rawLoc.hasWater === 'boolean') mergedUpdates.hasWater = rawLoc.hasWater; if (typeof rawLoc.isLocked === 'boolean') mergedUpdates.isLocked = rawLoc.isLocked; if (Array.isArray(rawLoc.connectedLocations) && rawLoc.connectedLocations.length) { const normalizedConnected = rawLoc.connectedLocations.map((entry) => state.locations.find((l) => l.name === entry || l.id === entry)?.id).filter((id): id is string => !!id); mergedUpdates.connectedLocations = Array.from(new Set([...(created.connectedLocations || []), ...normalizedConnected])); } if (Object.keys(mergedUpdates).length) dispatch({ type: 'UPDATE_LOCATION', payload: { id: created.id, updates: mergedUpdates as Partial<Location> } }); }); }
      if (mergedData.new_items?.length) { mergedData.new_items.forEach((item, index) => { if (!item.name || item.name.length < 2 || item.name.length > 14) return; setTimeout(() => { const newItem: Item = { id: item.id || `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, name: item.name || '未知物品', description: item.description || '', type: item.type || 'misc', rarity: item.rarity || 'common', quantity: item.quantity || 1, maxStack: item.maxStack || 99, weight: item.weight || 0.1, isConsumable: item.isConsumable ?? ['food', 'drink', 'medicine'].includes(item.type || ''), isReusable: item.isReusable ?? true, createdAt: Date.now(), modifiedAt: Date.now(), effects: item.effects || undefined }; dispatch({ type: 'ADD_ITEM', payload: newItem }); if (state.settings.soundEnabled) SFX.pickup(); addLog(`📦 获得物品: ${newItem.name}${newItem.quantity > 1 ? ` x${newItem.quantity}` : ''}`, 'discovery', 2); announceToScreenReader(`获得物品：${newItem.name}${newItem.quantity > 1 ? `，${newItem.quantity}个` : ''}`); }, index * 180); }); }
      if (mergedData.removed_items?.length) { mergedData.removed_items.forEach((entry) => { const byId = state.player.inventory.find((i) => i.id === entry); const byName = state.player.inventory.find((i) => i.name === entry); const target = byId || byName; if (!target) return; if (target.quantity > 1) dispatch({ type: 'UPDATE_ITEM', payload: { id: target.id, updates: { quantity: target.quantity - 1 } } }); else dispatch({ type: 'REMOVE_ITEM', payload: target.id }); addLog(`📤 失去物品: ${target.name}`, 'system', 1); }); }
      if (mergedData.npc_updates?.length) { mergedData.npc_updates.forEach(update => { const npc = state.npcs.find(n => n.id === update.id) || state.npcs.find(n => n.name === update.id); if (!npc) return; const mappedChanges: Partial<NPC> = { ...update.changes }; if (mappedChanges.status === 'corrupted') mappedChanges.status = 'poisoned'; if (mappedChanges.location && mappedChanges.location !== npc.location) ensureLocationExists(mappedChanges.location, npc.location); dispatch({ type: 'UPDATE_NPC', payload: { id: npc.id, updates: mappedChanges } }); if (mappedChanges.status === 'dead') addLog(`☠️ ${npc.name} 已身亡。`, 'death', 5); else if (mappedChanges.status === 'poisoned') addLog(`⚠️ ${npc.name}似乎中了毒或受了暗伤。`, 'warning', 4); if (mappedChanges.location && mappedChanges.location !== npc.location) { changedNpcIds.push(npc.id); addLog(`${npc.name}动身前往了${mappedChanges.location}。`, 'system', 2); } }); }
      if (mergedData.new_npcs?.length) { mergedData.new_npcs.forEach(raw => { if (!raw.name || state.npcs.some(n => n.name === raw.name)) return; const npc: NPC = { id: `npc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, name: raw.name, age: raw.age || 22, gender: (raw.gender as NPC['gender']) || 'male', occupation: raw.occupation || '江湖客', description: raw.description || '一位初见的江湖人物。', fertility: 50, isPregnant: false, pregnancyWeeks: 0, appearance: raw.appearance || '', personality: raw.personality || { bravery: 50, intelligence: 50, loyalty: 50, morality: 50, aggression: 30, sociability: 50 }, personalityTags: raw.personalityTags || ['谨慎'], attitude: raw.attitude || 'neutral', relation: raw.relation || 0, trust: raw.trust || 0, fear: raw.fear || 0, location: raw.location || state.world.location, inventory: raw.inventory || [], equipment: {}, status: (raw.status as NPC['status']) || 'alive', stats: raw.stats || { health: 100, maxHealth: 100, hunger: 80, thirst: 80, energy: 80, combat: 10, speed: 50, perception: 50, infection: 0 }, skills: {}, memories: [], dialogueHistory: [], goals: ['生存'], faction: undefined, isRecruited: false, notes: '', createdAt: Date.now(), modifiedAt: Date.now() }; dispatch({ type: 'ADD_NPC', payload: npc }); addLog(`遇到了新人物：${npc.name}`, 'event', 3); }); }
      if (mergedData.player_stat_changes) Object.entries(mergedData.player_stat_changes).forEach(([stat, val]) => { if (typeof val === 'number' && val !== 0) dispatch({ type: 'UPDATE_PLAYER_STAT', payload: { stat: stat as StatKey, value: val } }); });
      if (typeof mergedData.time_passed_minutes === 'number' && mergedData.time_passed_minutes > 0) { dispatch({ type: 'ADVANCE_TIME', payload: mergedData.time_passed_minutes }); if (mergedData.time_passed_minutes >= 30) addLog(`⏰ 过去了${Math.floor(mergedData.time_passed_minutes / 60) > 0 ? `${Math.floor(mergedData.time_passed_minutes / 60)}时辰` : `${mergedData.time_passed_minutes}分钟`}。`, 'system', 1); }
      if (mergedData.weather_change) { dispatch({ type: 'UPDATE_WORLD', payload: { weather: { ...state.world.weather, current: mergedData.weather_change } } }); addLog(`天色有变，已转为${weatherLabel(mergedData.weather_change)}。`, 'system', 2); }
      if (mergedData.location_change) applyAIMovement(mergedData.location_change);
      if (mergedData.world_state_changes) { const ws = mergedData.world_state_changes; const { location, weather, locationHistory, safeZones, dangerZones, ...safeWorldChanges } = ws; if (Object.keys(safeWorldChanges).length) dispatch({ type: 'UPDATE_WORLD', payload: safeWorldChanges }); if (weather && typeof weather === 'object') dispatch({ type: 'UPDATE_WORLD', payload: { weather: { ...state.world.weather, ...weather } } }); if (Array.isArray(safeZones) || Array.isArray(dangerZones)) dispatch({ type: 'UPDATE_WORLD', payload: { safeZones: Array.isArray(safeZones) ? safeZones : state.world.safeZones, dangerZones: Array.isArray(dangerZones) ? dangerZones : state.world.dangerZones } }); if (location && typeof location === 'string' && location !== state.world.location) applyAIMovement(location); }
      if (typeof mergedData.reputation_change === 'number' && mergedData.reputation_change !== 0) { const next = Math.max(-100, Math.min(999, state.player.jianghuFame + mergedData.reputation_change)); dispatch({ type: 'UPDATE_PLAYER', payload: { jianghuFame: next } }); addLog(`⭐ 名望${mergedData.reputation_change > 0 ? '提升' : '下降'}了${Math.abs(mergedData.reputation_change)}点。`, 'system', 2); }
      if (typeof mergedData.righteousness_change === 'number' && mergedData.righteousness_change !== 0) { const next = Math.max(-100, Math.min(999, state.player.morality + mergedData.righteousness_change)); dispatch({ type: 'UPDATE_PLAYER', payload: { morality: next } }); addLog(`⚖️ 侠义${mergedData.righteousness_change > 0 ? '提升' : '下降'}了${Math.abs(mergedData.righteousness_change)}点。`, 'system', 2); }
      if (mergedData.money_change && (typeof mergedData.money_change.silver === 'number' || typeof mergedData.money_change.copper === 'number')) { const silverDelta = mergedData.money_change.silver || 0; const copperDelta = mergedData.money_change.copper || 0; if (silverDelta > 0 || copperDelta > 0) earnMoney(Math.max(0, silverDelta), Math.max(0, copperDelta), 'AI剧情结算'); else if (silverDelta < 0 || copperDelta < 0) { const totalCopperHave = state.player.currency.silver * 100 + state.player.currency.copper; const totalDelta = silverDelta * 100 + copperDelta; const remain = Math.max(0, totalCopperHave + totalDelta); dispatch({ type: 'UPDATE_PLAYER', payload: { currency: { silver: Math.floor(remain / 100), copper: remain % 100 } } }); addLog(`💰 花费了${Math.abs(silverDelta)}两${Math.abs(copperDelta)}文。`, 'system', 2); } }
      if (mergedData.martial_progress?.skill && typeof mergedData.martial_progress.progress === 'number') { const currentArts = [...(state.player.martialArts || [])]; const idx = currentArts.findIndex((m) => m.name.includes(mergedData.martial_progress!.skill) || mergedData.martial_progress!.skill.includes(m.name)); if (idx >= 0) currentArts[idx] = { ...currentArts[idx], level: Math.min(10, currentArts[idx].level + Math.max(1, Math.round(mergedData.martial_progress.progress / 10))) }; else currentArts.push({ id: `art_${Date.now()}`, name: mergedData.martial_progress.skill, level: 1, description: 'AI剧情中新领悟的武学', style: 'mixed' as import('../types/game').MartialArt['style'] }); dispatch({ type: 'UPDATE_PLAYER', payload: { martialArts: currentArts } }); addLog(`🥋 你在${mergedData.martial_progress.skill}上又有进境。`, 'system', 2); }
      if (mergedData.realm_breakthrough?.newRealm) { const lvl = typeof mergedData.realm_breakthrough.level === 'number' ? mergedData.realm_breakthrough.level : state.player.cultivationStage + 1; dispatch({ type: 'UPDATE_PLAYER', payload: { cultivationStage: Math.max(state.player.cultivationStage, lvl) } }); addLog(`🌟 你成功突破，踏入了${mergedData.realm_breakthrough.newRealm}。`, 'event', 4); }
      if (mergedData.flags) Object.entries(mergedData.flags).forEach(([key, value]) => dispatch({ type: 'SET_FLAG', payload: { key, value } }));
      // ---- AI→子系统整合 ----
      if (mergedData.player_injuries?.length) { const currentInjuries = [...(state.player.injuries || [])]; mergedData.player_injuries.forEach((inj) => { if (!inj.name) return; currentInjuries.push({ id: inj.id || `inj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, name: inj.name, bodyPart: inj.bodyPart || '未知部位', severity: inj.severity || 1, healingProgress: inj.healingProgress || 0, effects: inj.effects || [], complicationRisk: inj.complicationRisk || 0, needsTreatment: inj.needsTreatment ?? true, timestamp: Date.now() }); addLog(`🩹 新增伤势：${inj.name}（${inj.bodyPart || '未知部位'}，严重度${inj.severity || 1}）`, 'warning', 3); }); dispatch({ type: 'UPDATE_PLAYER', payload: { injuries: currentInjuries } }); }
      if (mergedData.events?.length) { mergedData.events.forEach((evt) => { if (!evt.name && !evt.description) return; dispatch({ type: 'ADD_LOG', payload: createLog(`event_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`, `🌍 ${evt.name || '世界事件'}：${evt.description || ''}`, 'event', state.world.time) }); if (evt.name && evt.description) dispatch({ type: 'UPDATE_WORLD', payload: { globalEvents: [...state.world.globalEvents, { id: `we_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, name: evt.name, description: evt.description, type: 'global' as const, severity: (evt.severity || 3) as number, endTime: state.world.time + 1440 * 60 * 1000, startTime: state.world.time, effects: (evt.effects || {}) as Record<string, number>, isActive: true }] } }); }); }
      if (mergedData.faction_reputation_changes?.length) { const nextFactions = { ...(state.player.factions || {}) }; mergedData.faction_reputation_changes.forEach((fc) => { const prev = nextFactions[fc.faction] || 0; nextFactions[fc.faction] = Math.max(-100, Math.min(100, prev + (fc.delta || 0))); addLog(`🏛️ 你在${fc.faction}的声望${fc.delta > 0 ? '提升' : '下降'}了${Math.abs(fc.delta)}点。`, 'system', 2); }); dispatch({ type: 'UPDATE_PLAYER', payload: { factions: nextFactions } }); }
      if (mergedData.recipe_discoveries?.length) { mergedData.recipe_discoveries.forEach((recipeName) => { if (!recipeName || state.craftingRecipes.some((r) => r.name === recipeName)) return; dispatch({ type: 'ADD_CRAFTING_RECIPE', payload: { id: `recipe_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, name: recipeName, description: `AI剧情中领悟的${recipeName}锻造之法`, category: 'misc', ingredients: [], tools: [], result: { itemId: '', quantity: 1 }, skillRequired: undefined, craftTime: 60, isUnlocked: true } }); addLog(`📜 领悟了新配方：${recipeName}`, 'discovery', 3); }); }
      if (mergedData.buff_additions?.length) { const currentBuffs = [...(state.player.buffs || [])]; mergedData.buff_additions.forEach((b) => { if (!b.name) return; currentBuffs.push({ id: b.id || `buff_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, name: b.name, description: b.description || '', effects: b.effects || [], duration: b.duration || 60, startTime: Date.now(), source: b.source || 'AI剧情' }); addLog(`✨ 获得正面状态：${b.name}（持续${b.duration || 60}分钟）`, 'system', 2); }); dispatch({ type: 'UPDATE_PLAYER', payload: { buffs: currentBuffs } }); }
      if (mergedData.debuff_additions?.length) { const currentDebuffs = [...(state.player.debuffs || [])]; mergedData.debuff_additions.forEach((d) => { if (!d.name) return; currentDebuffs.push({ id: d.id || `debuff_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, name: d.name, description: d.description || '', effects: d.effects || [], duration: d.duration || 60, startTime: Date.now(), source: d.source || 'AI剧情' }); addLog(`⚠️ 获得负面状态：${d.name}（持续${d.duration || 60}分钟）`, 'warning', 3); }); dispatch({ type: 'UPDATE_PLAYER', payload: { debuffs: currentDebuffs } }); }
      if (mergedData.injury_changes?.length) { let currentInjuries2 = [...(state.player.injuries || [])]; mergedData.injury_changes.forEach((ic) => { if (!ic.name) return; const existingIdx = currentInjuries2.findIndex((i) => i.name === ic.name); if (ic.healed) { if (existingIdx >= 0) { addLog(`💚 伤势痊愈：${ic.name}`, 'system', 3); currentInjuries2.splice(existingIdx, 1); } } else if (existingIdx >= 0) { currentInjuries2[existingIdx] = { ...currentInjuries2[existingIdx], severity: Math.min(10, currentInjuries2[existingIdx].severity + (ic.severity || 1)), healingProgress: Math.max(0, (currentInjuries2[existingIdx].healingProgress || 0) - (ic.healingProgress || 0.1)) }; addLog(`🔴 伤势恶化：${ic.name}`, 'warning', 4); } else { currentInjuries2.push({ id: ic.id || `inj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, name: ic.name, bodyPart: ic.bodyPart || '未知部位', severity: ic.severity || 1, healingProgress: ic.healingProgress || 0, effects: ic.effects || [], complicationRisk: ic.complicationRisk || 0, needsTreatment: ic.needsTreatment ?? true, timestamp: Date.now() }); addLog(`🩹 新增伤势：${ic.name}（${ic.bodyPart || '未知部位'}，严重度${ic.severity || 1}）`, 'warning', 3); } }); dispatch({ type: 'UPDATE_PLAYER', payload: { injuries: currentInjuries2 } }); }
      if (mergedData.npc_relationship_changes?.length) { mergedData.npc_relationship_changes.forEach((rc) => { const npc = rc.npcId ? state.npcs.find((n) => n.id === rc.npcId) : rc.npcName ? state.npcs.find((n) => n.name === rc.npcName) : undefined; if (!npc) { if (rc.npcName) addLog(`💬 与${rc.npcName}的关系发生了变化。`, 'system', 1); return; } const updates: Partial<NPC> = {}; if (typeof rc.relationDelta === 'number') { updates.relation = Math.max(-100, Math.min(100, (npc.relation || 0) + rc.relationDelta)); addLog(`💬 与${npc.name}的好感${rc.relationDelta > 0 ? '提升' : '下降'}了${Math.abs(rc.relationDelta)}点。`, 'system', 2); } if (typeof rc.trustDelta === 'number') updates.trust = Math.max(0, Math.min(100, (npc.trust || 0) + rc.trustDelta)); if (rc.event) updates.dialogueHistory = [...(npc.dialogueHistory || []), { id: `sys_${Date.now()}`, speaker: 'npc', text: rc.event, timestamp: Date.now() }]; if (npc.romance && (rc.romanceStage || typeof rc.affinity === 'number')) { const romanceUpdates: Partial<import('../types/game').RomanceState> = {}; if (rc.romanceStage) romanceUpdates.stage = rc.romanceStage as RomanceStage; if (typeof rc.affinity === 'number') romanceUpdates.affinity = Math.max(0, Math.min(100, rc.affinity)); updates.romance = { ...npc.romance, ...romanceUpdates }; } if (Object.keys(updates).length) dispatch({ type: 'UPDATE_NPC', payload: { id: npc.id, updates } }); }); }
      if (mergedData.economy_changes) { const ec = mergedData.economy_changes; const currencySystem = { ...state.world.currencySystem }; if (typeof ec.marketIndex === 'number') { currencySystem.marketIndex = Math.max(0.1, Math.min(10, currencySystem.marketIndex + ec.marketIndex)); addLog(`📈 市场行情${ec.marketIndex > 0 ? '上扬' : '下跌'}，当前指数${currencySystem.marketIndex.toFixed(1)}`, 'system', 1); } if (typeof ec.taxRate === 'number') currencySystem.taxRate = Math.max(0, Math.min(1, currencySystem.taxRate + ec.taxRate)); if (typeof ec.resourceScarcity === 'number') dispatch({ type: 'UPDATE_WORLD', payload: { resourceScarcity: Math.max(0, Math.min(100, state.world.resourceScarcity + ec.resourceScarcity)) } }); if (typeof ec.marketIndex === 'number' || typeof ec.taxRate === 'number') dispatch({ type: 'UPDATE_WORLD', payload: { currencySystem } }); }
      if (mergedData.body_condition_changes) { const bc = mergedData.body_condition_changes; if (typeof bc.temperature === 'number') dispatch({ type: 'UPDATE_WORLD', payload: { weather: { ...state.world.weather, temperature: Math.round((state.world.weather.temperature + bc.temperature) * 10) / 10 } } }); if (typeof bc.fatigue === 'number' && bc.fatigue !== 0) { dispatch({ type: 'UPDATE_PLAYER_STAT', payload: { stat: 'energy', value: -bc.fatigue } }); addLog(`😴 疲劳${bc.fatigue > 0 ? '增加' : '减轻'}了${Math.abs(bc.fatigue)}点。`, 'system', 1); } }
      if (mergedData.combat) { dispatch({ type: 'ADD_LOG', payload: createLog(`combat_${Date.now()}`, `⚔️ ${mergedData.combat.description}`, 'combat', state.world.time) }); if (mergedData.combat.damage_taken > 0) dispatch({ type: 'UPDATE_PLAYER_STAT', payload: { stat: 'health', value: -mergedData.combat.damage_taken } }); }
      // FIX: 显式类型化中间变量，避免 {} 没有 .replace() 的类型错误
      if (mergedData.discoveries?.length) {
        mergedData.discoveries.forEach(discovery => {
          const rawText: string = (() => {
            if (typeof discovery === 'string') return discovery;
            if (discovery && typeof discovery === 'object') {
              const d = discovery as Record<string, unknown>;
              return String(d.name || d.title || d.description || '');
            }
            return String(discovery || '');
          })();
          const text = rawText
            .replace(/location_change\s*[:：].*/gi, '')
            .replace(/只有真正换地点时才填.*/gi, '')
            .replace(/当前地点未变.*/gi, '')
            .replace(/应为\s*null.*/gi, '')
            .replace(/^\s*未知发现\s*$/g, '')
            .trim();
          if (!text) return;
          addLog(`🔍 发现：${text}`, 'discovery', 2);
        });
      }
      if (mergedData.choices?.length) { const mapped = mergedData.choices.map((c, i) => ({ id: c.id || `choice_${i}`, text: c.text, consequence_hint: c.consequence_hint, type: inferChoiceType(c.text) })); setActiveChoices(mapped); announceToScreenReader(`可选行动：${mapped.map(c => c.text).join('；')}`); } else setActiveChoices([]);
      if (mergedData.location_change || changedNpcIds.length || discoveredLocationIds.length) { setMapHighlights({ movedTo: mergedData.location_change || undefined, movedNpcIds: changedNpcIds, discoveredLocationIds }); setTimeout(() => setMapHighlights({ movedNpcIds: [], discoveredLocationIds: [] }), 3500); }
      const summary: AIResponseSummary = { cultivationChanged: !!(mergedData.martial_progress || mergedData.realm_breakthrough), recipesUnlocked: (mergedData.recipe_discoveries || []).filter(Boolean), factionChanges: (mergedData.faction_reputation_changes || []).map((f) => f.faction), injuryChangeCount: (mergedData.injury_changes?.length || 0) + (mergedData.player_injuries?.length || 0), relationChangedNpcNames: (mergedData.npc_relationship_changes || []).map((r) => r.npcName || '').filter(Boolean), economyChanged: !!mergedData.economy_changes, bodyConditionChanged: !!mergedData.body_condition_changes, timestamp: Date.now() };
      dispatch({ type: 'SET_AI_RESPONSE_SUMMARY', payload: summary });
      setIsWaitingAI(false);
      setPlayerInput('');
    } catch (error) { logger.game.error('AI Update Error:', error); addLog(`【系统错误】处理AI响应时出错：${error instanceof Error ? error.message : '未知错误'}`, 'warning', 5); } finally { setIsProcessing(false); }
    // 标记: SECTION::AI_UPDATE_END
  }, [dispatch, state, addLog, earnMoney, moveToLocation, orchestratorSettings, addNoise, announceToScreenReader]);

  // ---- Small handlers ----
  const handleAdminUpdate = useCallback((type: string, payload: unknown) => { dispatch({ type, payload } as Action); }, [dispatch]);
  const handleUseItem = useCallback((item: Item) => { if (item.type === 'device' || item.type === 'container') setSelectedItem(item); else { useItem(item.id); notify.success(`使用了 ${item.name}`); } }, [useItem, notify]);
  const handleDropItem = useCallback((itemId: string) => { const item = state.player.inventory.find(i => i.id === itemId); if (!item) return; if (item.quantity > 1) dispatch({ type: 'UPDATE_ITEM', payload: { id: itemId, updates: { quantity: item.quantity - 1 } } }); else dispatch({ type: 'REMOVE_ITEM', payload: itemId }); addLog(`你丢下了 ${item.name}。`, 'system', 1); }, [dispatch, state.player.inventory, addLog]);
  const handleSave = useCallback(() => { localStorage.setItem('jianghu_game_save', JSON.stringify(state)); ['apocalypse_game_save', 'wuxia_game_save'].forEach(key => localStorage.removeItem(key)); addLog('【游戏已保存】', 'system', 1); notify.success('游戏已保存', '当前江湖进度已记入本地'); if (state.settings.soundEnabled) SFX.save(); }, [state, addLog, notify]);
  const clearAllSavesAndReset = useCallback(() => { SAVE_KEYS.forEach(key => localStorage.removeItem(key)); localStorage.removeItem('game_birth_settings'); localStorage.removeItem('jianghu_world_seed'); ['apoc_ai_chat_messages', 'apoc_ai_chat_draft', 'apoc_ai_manual_draft', 'apoc_ai_web_draft', 'jianghu_scene_images'].forEach(key => localStorage.removeItem(key)); dispatch({ type: 'RESET_GAME' }); setBirthSettings(null); setShowBirthSettings(true); setShowStartMenu(false); }, [dispatch]);
  const handleBirthSettingsComplete = useCallback((settings: BirthSettings) => { applyBirthSettings({ settings, state, dispatch, addLog }); const normalized = { ...settings, origin: (settings.origin === 'beggar' ? 'begger' : settings.origin) as BirthSettings['origin'], temperament: settings.temperament || '表面谨慎，内里不甘平庸', goal: settings.goal || '先活下去，再寻找立身之本', bottomLine: settings.bottomLine || '不愿轻易害无辜之人', hiddenEdge: settings.hiddenEdge || '记得前世大量玄幻与武侠套路' }; setBirthSettings(normalized); localStorage.setItem('game_birth_settings', JSON.stringify(normalized)); const generatedSeed = `seed-${normalized.name}-${Date.now()}`; setWorldSeed(generatedSeed); localStorage.setItem('jianghu_world_seed', generatedSeed); setShowBirthSettings(false); }, [state, dispatch, addLog]);

  const handleTalkToNPC = useCallback((npcId: string) => { const npc = state.npcs.find(n => n.id === npcId); if (!npc) return; const prompt = `我走向${npc.name}，想与${npc.gender === 'female' ? '她' : '他'}交谈。请以江湖场景写出自然对话。${npc.name}是${npc.age}岁的${npc.occupation}，性格${npc.personalityTags.join('、')}，对我的好感度是${npc.relation}/100，当前态度${npc.attitude}。`; if (autoAIEnabled && aiGeneratorRef.current) { triggerAIGeneration(prompt); addLog(`你走向${npc.name}，准备攀谈。`, 'narrative', 2); } else { setNpcTalkRequest({ npcId, npcName: npc.name, prompt }); addLog(`你走向${npc.name}，准备攀谈。`, 'narrative', 2); } addNoise(2); }, [state.npcs, autoAIEnabled, triggerAIGeneration, addLog, addNoise]);
  const handleSelectNPCByName = useCallback((npcName: string) => { const npc = state.npcs.find(n => n.name === npcName); if (!npc) return; setActiveTab('npcs'); setFocusedNPCId(npc.id); notify.info(`已定位人物：${npc.name}`, `当前位置：${npc.location}`); }, [state.npcs, notify]);
  const handleQuickAction = useCallback((actionId: string) => { if (state.settings.soundEnabled) SFX.click(); switch (actionId) { case 'look': lookAround(); break; case 'search': if (state.settings.soundEnabled) SFX.use(); searchLocation(); break; case 'move': if (state.settings.soundEnabled) SFX.move(); setActiveTab('map'); break; case 'talk': if (state.settings.soundEnabled) SFX.talk(); setActiveTab('npcs'); break; case 'rest': rest(1); break; case 'drink': if (state.settings.soundEnabled) SFX.use(); drinkWater(); break; case 'barricade': if (state.settings.soundEnabled) SFX.use(); barricadeLocation(); break; case 'craft': if (state.settings.soundEnabled) SFX.click(); setActiveTab('craft'); break; } }, [state.settings.soundEnabled, lookAround, searchLocation, rest, drinkWater, barricadeLocation]);

  // ---- Computed flags ----
  const isLowHealth = state.player.stats.health.value < 25;
  const isHungry = state.player.stats.hunger.value < 20;
  const isThirsty = state.player.stats.thirst.value < 15;
  const isTired = state.player.stats.energy.value < 20;
  const isStaminaLow = state.player.stats.stamina.value < 20;
  const isPoisoned = state.player.stats.infection.value > 0;
  const hasCriticalStatus = isLowHealth || isHungry || isThirsty || isTired || isStaminaLow;
  const hour = new Date(state.world.time).getHours();
  const isNight = hour >= 21 || hour < 6;
  const isDusk = hour >= 18 && hour < 21;

  // ---- Render ----
  return (
    <div className={`min-h-screen bg-jianghu-gradient text-zinc-300 font-sans selection:bg-amber-900 selection:text-white flex flex-col mobile-app-shell ${isLowHealth ? 'animate-danger-pulse' : ''}`}>
      {/* a11y: 跳过导航链接，键盘用户可直达主内容区 */}
      <a href="#main-content" className="skip-link">跳到主要内容</a>
      {/* a11y: aria-live 区域供屏幕阅读器动态播报游戏事件 */}
      <div id="aria-live-announcer" className="sr-only" aria-live="polite" aria-atomic="true" />
      <div className="noise-overlay" />
      <div className="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(ellipse_at_top,rgba(212,165,86,0.03),transparent_60%)]" />
      {isNight && <div className="fixed inset-0 pointer-events-none z-10 bg-gradient-to-b from-blue-950/30 via-blue-950/15 to-transparent transition-opacity duration-1000" />}
      {isDusk && <div className="fixed inset-0 pointer-events-none z-10 bg-gradient-to-t from-orange-950/25 via-orange-950/8 to-blue-950/5 transition-opacity duration-1000" />}
      {['rain', 'heavy_rain', 'drizzle'].includes(state.world.weather.current) && <div className="fixed inset-0 pointer-events-none z-10 weather-rain opacity-25" />}
      {state.world.weather.current === 'fog' && <div className="fixed inset-0 pointer-events-none z-10 weather-fog opacity-35" />}
      {state.world.weather.current === 'thunderstorm' && <div className="fixed inset-0 pointer-events-none z-10 bg-blue-950/15 weather-lightning" />}
      {isPoisoned && <div className="fixed inset-0 pointer-events-none z-30 bg-gradient-to-t from-green-900/12 to-transparent animate-pulse-slow" />}

      <PanelErrorBoundary panelName="顶部状态栏" compact className="mx-2 mt-1">
        <GameHeader
          state={state}
          worldSeed={worldSeed}
          isMobileUI={isMobileUI}
          musicEnabled={musicEnabled}
          hasCriticalStatus={hasCriticalStatus}
          isLowHealth={isLowHealth}
          isHungry={isHungry}
          isThirsty={isThirsty}
          isTired={isTired}
          isStaminaLow={isStaminaLow}
          deviceMode={deviceMode}
          onSave={handleSave}
          onToggleSound={() => { dispatch({ type: 'UPDATE_SETTINGS', payload: { soundEnabled: !state.settings.soundEnabled } }); if (!state.settings.soundEnabled) SFX.click(); }}
          onToggleMusic={() => { const next = !musicEnabled; setMusicEnabled(next); if (next) { SFX.getCtx(); SFX.startMusic(); } else SFX.stopMusic(); }}
          onOpenAdmin={() => setShowAdmin(true)}
          onOpenStartMenu={() => setShowStartMenu(true)}
          onOpenDeviceSelector={() => setShowDeviceSelector(true)}
          onOpenSettings={() => setShowSettings(true)}
          onResetPanelSize={() => { setRightPanelWidth(384); setChatPanelHeight(0); }}
        />
      </PanelErrorBoundary>

      <main id="main-content" aria-label="游戏主区域" tabIndex={-1} className={`flex-1 flex overflow-hidden min-h-0 ${isMobileUI ? 'flex-col' : 'flex-row'}`}>
        <PanelErrorBoundary panelName="主叙事区" className="flex-1 min-w-0 min-h-0 flex">
          <MainArea
            state={state}
            isMobileUI={isMobileUI}
            chatPanelHeight={chatPanelHeight}
            activeChoices={activeChoices}
            isWaitingAI={isWaitingAI}
            isProcessing={isProcessing}
            autoAIEnabled={autoAIEnabled}
            playerInput={playerInput}
            onPlayerInputChange={setPlayerInput}
            onPlayerAction={handlePlayerAction}
            onChoiceSelect={handleChoiceSelect}
            onQuickAction={handleQuickAction}
            onRequestSceneImage={requestSceneImage}
            onResizeStart={() => { resizingRef.current = 'chat'; }}
          />
        </PanelErrorBoundary>

        {!isMobileUI && (
          <div className="w-2 cursor-col-resize bg-zinc-900/70 hover:bg-amber-900/40 transition border-l border-zinc-800 flex items-center justify-center" onMouseDown={() => { resizingRef.current = 'right'; }} title="拖拽调整侧边栏宽度">
            <div className="h-20 w-1 rounded-full bg-zinc-700" />
          </div>
        )}

        <PanelErrorBoundary panelName="右侧面板" className={isMobileUI ? 'w-full' : ''}>
          <RightPanel
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab)}
            isMobileUI={isMobileUI}
            rightPanelWidth={rightPanelWidth}
            state={state}
            birthSettings={birthSettings}
            pendingSceneStoryRef={pendingSceneStoryRef}
            latestStoryText={latestStoryText}
            pendingSceneAnchorRef={pendingSceneAnchorRef}
            latestStoryAnchorId={latestStoryAnchorId}
            sceneRequest={sceneRequest}
            focusedNPCId={focusedNPCId}
            onSceneGenerated={handleSceneGenerated}
            playerInput={playerInput}
            isProcessing={isProcessing}
            autoAIEnabled={autoAIEnabled}
            setAutoAIEnabled={setAutoAIEnabled}
            npcTalkRequest={npcTalkRequest}
            webInputDraft={webInputDraft}
            onWebInputConsumed={() => setWebInputDraft('')}
            onAIUpdate={handleAIUpdate}
            onRegisterAIGenerator={(generator) => { aiGeneratorRef.current = generator; if (autoAIEnabled) setAICallback(generator); }}
            onNPCTalkHandled={() => setNpcTalkRequest(null)}
            setFocusedNPCId={setFocusedNPCId}
            npcCountsByLocation={npcCountsByLocation}
            npcNamesByLocation={npcNamesByLocation}
            shopCountsByLocation={shopCountsByLocation}
            factionMarksByLocation={factionMarksByLocation}
            eventIntensityByLocation={eventIntensityByLocation}
            handleUseItem={handleUseItem}
            handleDropItem={handleDropItem}
            setSelectedItem={setSelectedItem}
            refillItem={refillItem}
            handleTalkToNPC={handleTalkToNPC}
            moveToLocation={moveToLocation}
            handleSelectNPCByName={handleSelectNPCByName}
            requestSceneImage={requestSceneImage}
            setAICallback={setAICallback}
            aiGeneratorRef={aiGeneratorRef}
          />
        </PanelErrorBoundary>
      </main>

      {selectedItem && <Suspense fallback={<div className="h-full min-h-[240px] flex items-center justify-center text-zinc-500"><div className="flex items-center gap-2"><span className="animate-spin">⟳</span>正在载入…</div></div>}><ItemInteraction item={selectedItem} onClose={() => setSelectedItem(null)} /></Suspense>}
      {showAdmin && <Suspense fallback={<div className="h-full min-h-[240px] flex items-center justify-center text-zinc-500"><span className="animate-spin">⟳</span></div>}><AdminPanel state={state} onUpdate={handleAdminUpdate} onClose={() => setShowAdmin(false)} onGeneratePlayerPortrait={() => requestSceneImage('portrait')} onGenerateNPCPortrait={(npc) => requestSceneImage('portrait', npc)} /></Suspense>}
      {showSettings && <Suspense fallback={<div className="h-full min-h-[240px] flex items-center justify-center text-zinc-500"><span className="animate-spin">⟳</span></div>}><SettingsPanel state={state} onClose={() => setShowSettings(false)} onUpdate={handleAdminUpdate} deviceMode={deviceMode} setDeviceMode={setDeviceMode} /></Suspense>}
      {showStartMenu && <Suspense fallback={null}><StartMenu hasSave={SAVE_KEYS.some((k) => !!localStorage.getItem(k))} onContinue={() => setShowStartMenu(false)} onNewGame={() => { if (confirm('开始新的游戏会清空当前存档、聊天记录与场景记录，确定继续吗？')) clearAllSavesAndReset(); }} /></Suspense>}
      {showBirthSettings && <Suspense fallback={null}><BirthSettingsPanel onComplete={handleBirthSettingsComplete} /></Suspense>}
      {state.player.stats.health.value <= 0 && <div className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center animate-fade-in"><div className="text-6xl mb-4">☠️</div><h1 className="text-4xl font-bold text-red-600 mb-2">你死了</h1><p className="text-zinc-500 mb-8">在第 {state.world.dayNumber} 日，你的江湖路就此断绝。</p><button onClick={() => setShowStartMenu(true)} className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium">返回开始菜单</button></div>}
      <Suspense fallback={null}><NotificationContainer notifications={notifications} onClose={removeNotification} /></Suspense>
      {showDangerOverlay && <div className="fixed inset-0 pointer-events-none z-40 animate-fade-in"><div className="absolute inset-0 bg-gradient-to-t from-red-900/30 to-transparent" /><div className="absolute inset-0 border-4 border-red-500/30 animate-pulse" /><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-500 text-4xl font-bold animate-shake">⚠️ 危险地带</div></div>}
    </div>
  );
};
