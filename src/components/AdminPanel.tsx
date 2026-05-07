import React, { useMemo, useRef, useState } from 'react';
import { AIPromptSettings, GameState, NPC, StatKey, Location, Item, ItemType, RomanceState, OrchestratorSettings } from '../types/game';
import { createItem, createNPCPersonality, createNPCStats } from '../context/GameContext';
import RelationshipGraph from './RelationshipGraph';
import { loadCrashLogs, clearCrashLogs } from '../utils/crashLogger';
import {
  Plus, X, Upload, Trash2, Search, RefreshCw, ChevronDown, ChevronRight,
  MapPin, Clock, DollarSign, Heart, Sparkles, ScrollText, Mountain, Users, Eye, Save,
  Image as ImageIcon, Wand2, User, Palette, Shirt, Brain, Activity, Sword, Gem, BookOpen,
  BadgeInfo, Bug, Shield, FlaskConical, Coins, Package, Skull, Home, FileJson, RotateCcw
} from 'lucide-react';

interface AdminPanelProps {
  state: GameState;
  onUpdate: (type: string, payload: unknown) => void;
  onClose: () => void;
  onGeneratePlayerPortrait?: () => void;
  onGenerateNPCPortrait?: (npc: NPC) => void;
}

type TabType = 'overview' | 'player' | 'npcs' | 'items' | 'locations' | 'monsters' | 'world' | 'economy' | 'events' | 'aiPrompt' | 'orchestrator' | 'data' | 'crash';
type NpcSubTab = 'profile' | 'combat' | 'relations' | 'skills' | 'portrait';
type PlayerSubTab = 'profile' | 'birth' | 'appearance' | 'combat' | 'cultivation' | 'relations' | 'portrait' | 'persona';

type PortraitInfo = {
  imageUrl: string;
  imageKey?: string;
  updatedAt: number;
  source: 'manual' | 'ai';
  note?: string;
  prompt?: string;
  npcName?: string;
};

type PlayerPortraitInfo = {
  imageUrl: string;
  imageKey?: string;
  updatedAt: number;
  source: 'manual' | 'ai';
  note?: string;
  prompt?: string;
  title?: string;
};

const PORTRAIT_KEY = 'jianghu_npc_portraits';
const PLAYER_PORTRAIT_KEY = 'jianghu_player_portrait';
const FULL_CLEAR_KEYS = [
  'jianghu_game_save', 'apocalypse_game_save', 'wuxia_game_save',
  'game_birth_settings', 'jianghu_world_seed',
  'jianghu_npc_portraits', 'jianghu_player_portrait',
  'ai_chat_messages', 'ai_chat_draft', 'ai_web_draft', 'ai_text_draft', 'ai_token_usage', 'ai_api_config', 'ai_initialized',
  'comfyui_config', 'comfyui_workflows', 'comfyui_scene_images',
  'device_mode', 'jianghu_crash_logs', 'jianghu_right_panel_width', 'jianghu_chat_panel_height'
];

const weatherLabel = (weather: string) => ({ clear: '晴朗', cloudy: '多云', overcast: '阴天', drizzle: '细雨', rain: '雨天', heavy_rain: '暴雨', thunderstorm: '雷雨', fog: '浓雾', snow: '小雪', blizzard: '风雪' }[weather] || weather);
const npcStatusLabel = (status: string) => ({ alive: '存活', dead: '已故', poisoned: '中毒', unconscious: '昏迷', missing: '失踪', injured: '负伤', corrupted: '入魔', qiDeviated: '走火入魔', hostile: '敌对' } as Record<string, string>)[status] || status;
const genderLabel = (gender?: string) => gender === 'female' ? '女' : gender === 'male' ? '男' : '其他';
const romanceStageLabel = (stage?: string) => ({ none: '无', interested: '心动', close: '亲近', ambiguous: '暧昧', lover: '恋人', engaged: '婚约', married: '夫妻', broken: '决裂' } as Record<string, string>)[stage || 'none'] || stage;
const itemTypeLabel = (t: string) => ({ consumable: '消耗品', tool: '器具', weapon: '兵器', clothing: '衣物', medicine: '丹药', material: '材料', key: '钥匙', device: '机关器具', food: '吃食', drink: '饮品', ammo: '箭矢', container: '囊袋', document: '书卷', misc: '杂物' } as Record<string, string>)[t] || t;
const locationTypeLabel = (t: string) => ({ room: '房间', building: '建筑', outdoor: '野外', underground: '地下', vehicle: '载具' } as Record<string, string>)[t] || t;
const logTypeLabel = (t: string) => ({ narrative: '叙事', dialogue: '对话', system: '系统', combat: '战斗', ai: 'AI', discovery: '发现', warning: '警示', death: '死亡', event: '事件', romance: '情感', image: '图片' } as Record<string, string>)[t] || t;
const originLabel = (origin?: string) => origin === 'begger' || origin === 'beggar' ? '流浪乞丐' : origin === 'farmer' ? '农家子弟' : origin === 'scholar' ? '落魄书生' : origin === 'soldier' ? '军户遗孤' : origin === 'merchant' ? '商贾之后' : '未知';
const memoryLabel = (memory?: string) => memory === 'webnovel' ? '网文读者' : memory === 'martial' ? '武术爱好者' : memory === 'medical' ? '医学生' : memory === 'engineer' ? '工科生' : memory === 'history' ? '历史爱好者' : '未知';
const traitLabel = (trait?: string) => trait === 'resilient' ? '坚韧' : trait === 'agile' ? '机敏' : trait === 'calm' ? '沉稳' : trait === 'passionate' ? '热血' : trait === 'cold' ? '冷静' : '未知';
const loadPortraitMap = (): Record<string, PortraitInfo> => { try { return JSON.parse(localStorage.getItem(PORTRAIT_KEY) || '{}'); } catch { return {}; } };
const savePortraitMap = (map: Record<string, PortraitInfo>) => localStorage.setItem(PORTRAIT_KEY, JSON.stringify(map));
const loadPlayerPortrait = (): PlayerPortraitInfo | null => { try { return JSON.parse(localStorage.getItem(PLAYER_PORTRAIT_KEY) || 'null'); } catch { return null; } };
const savePlayerPortrait = (portrait: PlayerPortraitInfo | null) => portrait ? localStorage.setItem(PLAYER_PORTRAIT_KEY, JSON.stringify(portrait)) : localStorage.removeItem(PLAYER_PORTRAIT_KEY);
const asItemNames = (value: unknown) => {
  if (!value) return '无';
  if (Array.isArray(value)) return value.map((v) => typeof v === 'string' ? v : (v as Record<string, unknown>)?.name || '').filter(Boolean).join('、') || '无';
  if (typeof value === 'string') return value;
  if ((value as Record<string, unknown>)?.name) return (value as Record<string, unknown>).name as string;
  return '无';
};
const makeItemsFromText = (prefix: string, npcId: string, text: string, type: string = 'misc') =>
  text.split(/[、,，]/).map(v => v.trim()).filter(Boolean).map((name, idx) => createItem({ id: `${prefix}_${npcId}_${idx}_${Date.now()}`, name, type: type as Item['type'], description: '后台录入' }));

export const AdminPanel: React.FC<AdminPanelProps> = ({ state, onUpdate, onClose, onGeneratePlayerPortrait, onGenerateNPCPortrait }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [npcSubTabMap, setNpcSubTabMap] = useState<Record<string, NpcSubTab>>({});
  const [playerSubTab, setPlayerSubTab] = useState<PlayerSubTab>('profile');
  const [expandedNPC, setExpandedNPC] = useState<string | null>(null);
  const [expandedLocation, setExpandedLocation] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [npcFilter, setNpcFilter] = useState<'all' | 'alive' | 'dead' | 'poisoned' | 'recruited'>('all');
  const [itemFilter, setItemFilter] = useState('all');
  const [eventFilter, setEventFilter] = useState('all');
  const [newItemName, setNewItemName] = useState('');
  const [newItemType, setNewItemType] = useState<ItemType>('misc');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newNPCName, setNewNPCName] = useState('');
  const [newNPCAge, setNewNPCAge] = useState(20);
  const [newNPCGender, setNewNPCGender] = useState<'male' | 'female' | 'other'>('male');
  const [newNPCOccupation, setNewNPCOccupation] = useState('江湖客');
  const [newNPCDesc, setNewNPCDesc] = useState('');
  const [newNPCLocation, setNewNPCLocation] = useState('');
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationType, setNewLocationType] = useState<'room' | 'building' | 'outdoor' | 'underground' | 'vehicle'>('outdoor');
  const [newLocationDesc, setNewLocationDesc] = useState('');
  const [newMonsterName, setNewMonsterName] = useState('');
  const [newMonsterTier, setNewMonsterTier] = useState(1);
  const [newMonsterHP, setNewMonsterHP] = useState(100);
  const [newMonsterDmg, setNewMonsterDmg] = useState(20);
  const [newMonsterDesc, setNewMonsterDesc] = useState('');
  const [portraitMap, setPortraitMap] = useState<Record<string, PortraitInfo>>(() => loadPortraitMap());
  const [playerPortrait, setPlayerPortrait] = useState<PlayerPortraitInfo | null>(() => loadPlayerPortrait());
  const [portraitNpcId, setPortraitNpcId] = useState<string | null>(null);
  const [portraitNoteDraft, setPortraitNoteDraft] = useState('');
  const [playerPortraitDraft, setPlayerPortraitDraft] = useState('');
  const [crashLogs, setCrashLogs] = useState(() => loadCrashLogs());
  const [aiPromptSettings, setAiPromptSettings] = useState<AIPromptSettings>(() => {
    try {
      return JSON.parse(localStorage.getItem('jianghu_ai_prompt_settings') || '');
    } catch {
      return {
        enabled: true,
        systemPromptPrefix: '',
        worldRules: '',
        userCustomInstructions: '',
        npcBehaviorRules: '',
        itemParsingRules: '',
        locationRules: '',
        romanceRules: '',
        imagePromptRules: '',
      };
    }
  });
  const [orchestratorSettings, setOrchestratorSettings] = useState<OrchestratorSettings>(() => {
    try {
      return JSON.parse(localStorage.getItem('jianghu_orchestrator_settings') || '');
    } catch {
      return {
        enabled: true,
        autoBalanceDifficulty: true,
        autoStabilizeEconomy: true,
        autoCorrectNPCState: true,
        autoRepairMapLinks: true,
        autoNormalizeAIResults: true,
        autoSceneImageInsert: true,
        autoReduceNoiseSpam: true,
        autoPromoteDiscoveries: true,
        aiStrictness: 75,
        mapCoherence: 80,
        worldDynamics: 70,
        npcAutonomy: 68,
        economyElasticity: 60,
        imageSafetyLevel: 78,
        logCleanliness: 85,
        notes: '',
      };
    }
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const playerFileInputRef = useRef<HTMLInputElement | null>(null);

  const birthSettings = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('game_birth_settings') || 'null'); } catch { return null; }
  }, []);

  const aliveNPCs = state.npcs.filter((n) => n.status === 'alive').length;
  const dangerousLocs = state.locations.filter((l) => l.dangerLevel >= 40).length;
  const exploredLocs = state.locations.filter((l) => l.isExplored).length;
  const totalItems = state.player.inventory.reduce((s, i) => s + i.quantity, 0);
  const currentPortraitNpc = portraitNpcId ? state.npcs.find((n) => n.id === portraitNpcId) || null : null;

  const filteredNPCs = state.npcs
    .filter((n) => npcFilter === 'alive' ? n.status === 'alive' : npcFilter === 'dead' ? n.status === 'dead' : npcFilter === 'poisoned' ? (n.status === 'poisoned' || n.status === 'corrupted') : npcFilter === 'recruited' ? n.isRecruited : true)
    .filter((n) => !searchTerm || n.name.includes(searchTerm) || n.occupation.includes(searchTerm) || n.location.includes(searchTerm));
  const filteredItems = state.player.inventory.filter((i) => (itemFilter === 'all' || i.type === itemFilter) && (!searchTerm || i.name.includes(searchTerm)));
  const filteredEvents = state.logs.filter((l) => eventFilter === 'all' || l.type === eventFilter);

  const updatePortraitForNpc = (npcId: string, updates: Partial<PortraitInfo>) => {
    const next = {
      ...portraitMap,
      [npcId]: {
        ...(portraitMap[npcId] || { imageUrl: '', updatedAt: Date.now(), source: 'manual' as const }),
        ...updates,
        updatedAt: Date.now(),
      },
    };
    setPortraitMap(next);
    savePortraitMap(next);
  };
  const removePortraitForNpc = (npcId: string) => {
    const next = { ...portraitMap };
    delete next[npcId];
    setPortraitMap(next);
    savePortraitMap(next);
  };
  const updatePlayerPortrait = (updates: Partial<PlayerPortraitInfo>) => {
    const next = {
      ...(playerPortrait || { imageUrl: '', updatedAt: Date.now(), source: 'manual' as const }),
      ...updates,
      updatedAt: Date.now(),
    } as PlayerPortraitInfo;
    setPlayerPortrait(next);
    savePlayerPortrait(next);
  };
  const removePlayerPortrait = () => { setPlayerPortrait(null); savePlayerPortrait(null); };
  const syncNpcPortraitsFromStorage = () => setPortraitMap(loadPortraitMap());
  const syncPlayerPortraitFromStorage = () => setPlayerPortrait(loadPlayerPortrait());
  const refreshCrashLogs = () => setCrashLogs(loadCrashLogs());
  const saveAIPromptSettings = () => {
    localStorage.setItem('jianghu_ai_prompt_settings', JSON.stringify(aiPromptSettings));
    alert('AI提示词配置已保存，AI面板会自动同步。');
  };
  const resetAIPromptSettings = () => {
    const next: AIPromptSettings = {
      enabled: true,
      systemPromptPrefix: '',
      worldRules: '',
      userCustomInstructions: '',
      npcBehaviorRules: '',
      itemParsingRules: '',
      locationRules: '',
      romanceRules: '',
      imagePromptRules: '',
    };
    setAiPromptSettings(next);
    localStorage.setItem('jianghu_ai_prompt_settings', JSON.stringify(next));
  };
  const saveOrchestratorSettings = () => {
    localStorage.setItem('jianghu_orchestrator_settings', JSON.stringify(orchestratorSettings));
    alert('统筹调度中枢设置已保存。');
  };
  const resetOrchestratorSettings = () => {
    const next: OrchestratorSettings = {
      enabled: true,
      autoBalanceDifficulty: true,
      autoStabilizeEconomy: true,
      autoCorrectNPCState: true,
      autoRepairMapLinks: true,
      autoNormalizeAIResults: true,
      autoSceneImageInsert: true,
      autoReduceNoiseSpam: true,
      autoPromoteDiscoveries: true,
      aiStrictness: 75,
      mapCoherence: 80,
      worldDynamics: 70,
      npcAutonomy: 68,
      economyElasticity: 60,
      imageSafetyLevel: 78,
      logCleanliness: 85,
      notes: '',
    };
    setOrchestratorSettings(next);
    localStorage.setItem('jianghu_orchestrator_settings', JSON.stringify(next));
  };

  const handlePlayerPortraitFile = (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updatePlayerPortrait({ imageUrl: String(reader.result || ''), source: 'manual', note: playerPortraitDraft || playerPortrait?.note || '', title: state.player.name, prompt: playerPortrait?.prompt });
    reader.readAsDataURL(file);
  };
  const handleNpcPortraitFile = (file?: File | null, npc?: NPC | null) => {
    if (!file || !npc) return;
    const reader = new FileReader();
    reader.onload = () => updatePortraitForNpc(npc.id, { imageUrl: String(reader.result || ''), source: 'manual', note: portraitNoteDraft, npcName: npc.name, prompt: portraitMap[npc.id]?.prompt });
    reader.readAsDataURL(file);
  };

  const handleAddItem = () => {
    if (!newItemName.trim()) return;
    const isConsumable = ['food', 'drink', 'medicine', 'consumable'].includes(newItemType);
    const effects: Item['effects'] = newItemType === 'food' ? [{ stat: 'hunger', value: 20 }] : newItemType === 'drink' ? [{ stat: 'thirst', value: 25 }] : newItemType === 'medicine' ? [{ stat: 'health', value: 20 }] : undefined;
    onUpdate('ADD_ITEM', createItem({ id: `admin_item_${Date.now()}`, name: newItemName, description: newItemDesc || '江湖物品', type: newItemType, isConsumable, effects }));
    setNewItemName(''); setNewItemDesc('');
  };

  const handleAddNPC = () => {
    if (!newNPCName.trim()) return;
    const npc: NPC = {
      id: `admin_npc_${Date.now()}`,
      name: newNPCName,
      age: newNPCAge,
      gender: newNPCGender,
      occupation: newNPCOccupation,
      description: newNPCDesc || '一个初入视线的江湖人物',
      fertility: newNPCGender === 'female' ? 60 : 55,
      isPregnant: false,
      pregnancyWeeks: 0,
      appearance: '',
      personality: createNPCPersonality(),
      personalityTags: ['未知'],
      attitude: 'neutral',
      relation: 0,
      trust: 0,
      fear: 0,
      location: newNPCLocation || state.world.location,
      inventory: [],
      equipment: { clothing: [], accessory: [] },
      status: 'alive',
      stats: createNPCStats(),
      skills: {},
      memories: [],
      dialogueHistory: [],
      goals: ['生存'],
      isRecruited: false,
      notes: '',
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      romance: { affinity: 0, attraction: 0, jealousy: 0, trust: 0, intimacy: 0, commitment: 0, stage: 'none', exclusive: false, confessed: false, memories: [] }
    };
    onUpdate('ADD_NPC', npc);
    setNewNPCName(''); setNewNPCDesc('');
  };

  const handleAddLocation = () => {
    if (!newLocationName.trim()) return;
    const currentLoc = state.locations.find((l) => l.name === state.world.location);
    const newLoc: Location = {
      id: `loc_${Date.now()}`,
      name: newLocationName,
      type: newLocationType,
      description: newLocationDesc || '江湖中的一处新地点。',
      isExplored: false,
      isLocked: false,
      dangerLevel: 20,
      noiseLevel: 10,
      lightLevel: 65,
      hasElectricity: false,
      hasWater: false,
      lootTable: [],
      isLooted: false,
      connectedLocations: currentLoc ? [currentLoc.id] : [],
      npcsPresent: [],
      hostilePresent: 0,
      events: [],
      notes: ''
    };
    onUpdate('ADD_LOCATION', newLoc);
    if (currentLoc) onUpdate('UPDATE_LOCATION', { id: currentLoc.id, updates: { connectedLocations: Array.from(new Set([...(currentLoc.connectedLocations || []), newLoc.id])) } });
    setNewLocationName(''); setNewLocationDesc('');
  };

  const handleAddMonster = () => {
    if (!newMonsterName.trim()) return;
    onUpdate('ADD_INFECTED_TYPE', {
      id: `monster_${Date.now()}`,
      name: newMonsterName,
      description: newMonsterDesc || '江湖异变之物',
      tier: newMonsterTier,
      stats: { health: newMonsterHP, damage: newMonsterDmg, speed: 50, perception: 50, armor: 0 },
      abilities: [], weaknesses: [], loot: [], spawnWeight: 10
    });
    setNewMonsterName(''); setNewMonsterDesc('');
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jianghu_save_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(String(ev.target?.result || '{}'));
        if (!json?.player || !json?.world) return alert('存档文件不完整。');
        onUpdate('LOAD_STATE', json);
        onClose();
      } catch {
        alert('导入失败，JSON 格式错误。');
      }
    };
    reader.readAsText(file);
  };

  const renderTopStatCard = (label: string, value: React.ReactNode, icon?: React.ReactNode, color = 'text-white') => (
    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3">
      <div className="text-[11px] text-zinc-500 flex items-center gap-1">{icon}{label}</div>
      <div className={`text-xl font-bold mt-1 ${color}`}>{value}</div>
    </div>
  );

  const renderPlayerSubTabBtn = (id: PlayerSubTab, label: string) => (
    <button key={id} onClick={() => setPlayerSubTab(id)} className={`px-3 py-1.5 rounded-lg text-xs ${playerSubTab === id ? 'bg-amber-700 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>{label}</button>
  );
  const renderNpcSubTabBtn = (npcId: string, id: NpcSubTab, label: string) => (
    <button key={id} onClick={() => setNpcSubTabMap((m) => ({ ...m, [npcId]: id }))} className={`px-3 py-1.5 rounded-lg text-xs ${((npcSubTabMap[npcId] || 'profile') === id) ? 'bg-fuchsia-700 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>{label}</button>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2" onClick={onClose}>
      <div className="w-full max-w-7xl h-[92vh] bg-zinc-950 border border-amber-900/40 rounded-2xl overflow-hidden shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950">
          <div>
            <div className="text-lg font-bold text-amber-400 flex items-center gap-2"><ScrollText size={18} />江湖管理阁</div>
            <div className="text-[11px] text-zinc-500">总览局势、编辑主角与人物、管理物品地点、查看世界状态、存档与崩溃日志</div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white"><X size={18} /></button>
        </div>

        <div className="flex border-b border-zinc-800 bg-zinc-900/70 overflow-x-auto">
          {[
            ['overview', '📊 总览'], ['player', '👤 你当前的角色'], ['npcs', `👥 人物(${state.npcs.length})`], ['items', `📦 物品(${totalItems})`], ['locations', `🗺️ 地图(${state.locations.length})`], ['monsters', `⚔️ 妖魔(${state.monsterTypes?.length || 0})`], ['world', '🌍 天下'], ['economy', '💰 钱庄'], ['events', `📜 事件(${state.logs.length})`], ['aiPrompt', '🤖 AI提示词'], ['orchestrator', '🧠 统筹调度中枢'], ['data', '💾 存档'], ['crash', `🐞 崩溃日志(${crashLogs.length})`]
          ].map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id as TabType)} className={`px-3 py-2.5 text-xs whitespace-nowrap transition ${activeTab === id ? 'bg-zinc-800 text-white border-b-2 border-amber-500' : 'text-zinc-500 hover:text-zinc-300'}`}>{label}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'overview' && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {renderTopStatCard('江湖人物', state.npcs.length, <Users size={12} />)}
                {renderTopStatCard('活跃人物', aliveNPCs, <Heart size={12} />, 'text-green-400')}
                {renderTopStatCard('危险地点', dangerousLocs, <Skull size={12} />, 'text-red-400')}
                {renderTopStatCard('已探索', `${exploredLocs}/${state.locations.length}`, <MapPin size={12} />)}
                {renderTopStatCard('盘缠', `${state.player.currency.silver}两/${state.player.currency.copper}文`, <Coins size={12} />, 'text-yellow-300')}
              </div>
              <div className="grid lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-zinc-200"><Mountain size={15} />天下态势面板</div>
                  <div className="grid md:grid-cols-2 gap-3 text-xs">
                    <div className="rounded-lg bg-zinc-950/70 p-3 space-y-2">
                      <div className="flex justify-between"><span className="text-zinc-500">所在位置</span><span className="text-white">{state.world.location}</span></div>
                      <div className="flex justify-between"><span className="text-zinc-500">天气</span><span className="text-white">{weatherLabel(state.world.weather.current)} · {state.world.weather.temperature}°</span></div>
                      <div className="flex justify-between"><span className="text-zinc-500">日期时刻</span><span className="text-white">{new Date(state.world.time).toLocaleString('zh-CN')}</span></div>
                      <div className="flex justify-between"><span className="text-zinc-500">当前卷章</span><span className="text-white">第{state.gamePhase}卷 · 第{state.chapterNumber}章</span></div>
                    </div>
                    <div className="rounded-lg bg-zinc-950/70 p-3 space-y-2">
                      <div className="flex justify-between"><span className="text-zinc-500">瘴气浓度</span><span className="text-red-400">{state.world.miasmaRate}%</span></div>
                      <div className="flex justify-between"><span className="text-zinc-500">江湖乱象</span><span className="text-orange-400">{state.world.chaosLevel}%</span></div>
                      <div className="flex justify-between"><span className="text-zinc-500">朝廷管控</span><span className="text-blue-400">{state.world.governmentControl}%</span></div>
                      <div className="flex justify-between"><span className="text-zinc-500">资源紧张</span><span className="text-yellow-300">{state.world.resourceScarcity}%</span></div>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-3">
                  <div className="text-sm font-bold text-zinc-200 flex items-center gap-2"><Sparkles size={14} />快捷掌控</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => onUpdate('SET_PLAYER_STAT', { stat: 'health', value: 100 })} className="bg-red-700 hover:bg-red-600 text-white rounded-lg py-2 text-xs">满气血</button>
                    <button onClick={() => onUpdate('SET_PLAYER_STAT', { stat: 'hunger', value: 100 })} className="bg-orange-700 hover:bg-orange-600 text-white rounded-lg py-2 text-xs">满饱腹</button>
                    <button onClick={() => onUpdate('SET_PLAYER_STAT', { stat: 'thirst', value: 100 })} className="bg-blue-700 hover:bg-blue-600 text-white rounded-lg py-2 text-xs">满口渴</button>
                    <button onClick={() => onUpdate('SET_PLAYER_STAT', { stat: 'energy', value: 100 })} className="bg-yellow-700 hover:bg-yellow-600 text-white rounded-lg py-2 text-xs">满内力</button>
                    <button onClick={() => onUpdate('SET_PLAYER_STAT', { stat: 'infection', value: 0 })} className="bg-green-700 hover:bg-green-600 text-white rounded-lg py-2 text-xs">清暗伤</button>
                    <button onClick={() => onUpdate('ADVANCE_TIME', 60)} className="bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg py-2 text-xs">+一时辰</button>
                  </div>
                </div>
              </div>
              <RelationshipGraph npcs={state.npcs} centerName={state.player.name} />
            </>
          )}

          {activeTab === 'player' && (
            <div className="space-y-4">
              <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-64 shrink-0">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden">
                    <div className="aspect-[3/4] bg-zinc-900 flex items-center justify-center">
                      {playerPortrait?.imageUrl ? <img src={playerPortrait.imageUrl} alt={state.player.name} className="w-full h-full object-contain" /> : <div className="text-center text-zinc-500 p-4"><User size={40} className="mx-auto mb-2" />暂无主角画像</div>}
                    </div>
                    <div className="p-3 text-xs text-zinc-400 border-t border-zinc-800 space-y-1">
                      <div>来源：{playerPortrait ? (playerPortrait.source === 'ai' ? 'AI生成' : '手动导入') : '无'}</div>
                      <div>更新时间：{playerPortrait ? new Date(playerPortrait.updatedAt).toLocaleString('zh-CN') : '--'}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <button onClick={() => playerFileInputRef.current?.click()} className="px-3 py-2 rounded-lg bg-fuchsia-800 hover:bg-fuchsia-700 text-white text-xs flex items-center justify-center gap-1"><Upload size={12} />导入画像</button>
                    <button onClick={() => { syncPlayerPortraitFromStorage(); alert('已从前端同步主角画像缓存。'); }} className="px-3 py-2 rounded-lg bg-cyan-800 hover:bg-cyan-700 text-white text-xs flex items-center justify-center gap-1"><RefreshCw size={12} />同步缓存</button>
                    <button onClick={() => onGeneratePlayerPortrait?.()} className="px-3 py-2 rounded-lg bg-pink-800 hover:bg-pink-700 text-white text-xs flex items-center justify-center gap-1"><Wand2 size={12} />AI生成画像</button>
                    <button onClick={() => { if (confirm('删除主角画像？')) removePlayerPortrait(); }} className="px-3 py-2 rounded-lg bg-red-900 hover:bg-red-800 text-white text-xs flex items-center justify-center gap-1"><Trash2 size={12} />删除画像</button>
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap gap-2">{[
                    ['profile', '档案'], ['birth', '出身设定'], ['appearance', '外貌/画像'], ['combat', '装备/属性'], ['cultivation', '武学/境界'], ['relations', '人脉/情感'], ['persona', 'AI / 生图人设卡']
                  ].map(([id, label]) => renderPlayerSubTabBtn(id as PlayerSubTab, label))}</div>

                  {playerSubTab === 'profile' && (
                    <div className="grid md:grid-cols-2 gap-3 text-sm">
                      <div className="space-y-3">
                        <label className="block text-zinc-400 text-xs">姓名</label>
                        <input value={state.player.name} onChange={(e) => onUpdate('UPDATE_PLAYER', { name: e.target.value })} className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white" />
                        <label className="block text-zinc-400 text-xs">别号</label>
                        <input value={state.player.nickname || ''} onChange={(e) => onUpdate('UPDATE_PLAYER', { nickname: e.target.value })} className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white" />
                        <label className="block text-zinc-400 text-xs">年龄</label>
                        <input type="number" value={state.player.age} onChange={(e) => onUpdate('UPDATE_PLAYER', { age: Number(e.target.value) || 15 })} className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white" />
                        <label className="block text-zinc-400 text-xs">性别</label>
                        <select value={state.player.gender} onChange={(e) => onUpdate('UPDATE_PLAYER', { gender: e.target.value })} className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white">
                          <option value="male">男</option><option value="female">女</option><option value="other">其他</option>
                        </select>
                        <label className="block text-zinc-400 text-xs">身份</label>
                        <input value={state.player.role} onChange={(e) => onUpdate('UPDATE_PLAYER', { role: e.target.value })} className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white" />
                      </div>
                      <div className="space-y-3">
                        <label className="block text-zinc-400 text-xs">门派 / 传承</label>
                        <input value={state.player.sect || ''} onChange={(e) => onUpdate('UPDATE_PLAYER', { sect: e.target.value })} className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white" />
                        <label className="block text-zinc-400 text-xs">名望</label>
                        <input type="number" value={state.player.jianghuFame} onChange={(e) => onUpdate('UPDATE_PLAYER', { jianghuFame: Number(e.target.value) || 0 })} className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white" />
                        <label className="block text-zinc-400 text-xs">侠义</label>
                        <input type="number" value={state.player.morality} onChange={(e) => onUpdate('UPDATE_PLAYER', { morality: Number(e.target.value) || 0 })} className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white" />
                        <label className="block text-zinc-400 text-xs">背景</label>
                        <textarea value={state.player.background} onChange={(e) => onUpdate('UPDATE_PLAYER', { background: e.target.value })} className="w-full h-28 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white resize-none" />
                      </div>
                    </div>
                  )}

                  {playerSubTab === 'birth' && (
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-2">
                        <div className="text-zinc-300 font-semibold">出身设定</div>
                        <div className="text-zinc-500 text-xs">出身：<span className="text-zinc-200">{originLabel(birthSettings?.origin)}</span></div>
                        <div className="text-zinc-500 text-xs">前世记忆：<span className="text-zinc-200">{memoryLabel(birthSettings?.memory)}</span></div>
                        <div className="text-zinc-500 text-xs">初始特征：<span className="text-zinc-200">{traitLabel(birthSettings?.trait)}</span></div>
                        <div className="text-zinc-500 text-xs">性情：<span className="text-zinc-200">{birthSettings?.temperament || '未知'}</span></div>
                        <div className="text-zinc-500 text-xs">目标：<span className="text-zinc-200">{birthSettings?.goal || '未知'}</span></div>
                        <div className="text-zinc-500 text-xs">底线：<span className="text-zinc-200">{birthSettings?.bottomLine || '未知'}</span></div>
                        <div className="text-zinc-500 text-xs">隐藏优势：<span className="text-zinc-200">{birthSettings?.hiddenEdge || '未知'}</span></div>
                      </div>
                      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 text-xs text-zinc-400 whitespace-pre-wrap leading-relaxed">这些字段来自开局的“开始游戏”设定，并已与 AI 提示词、主角背景与画像人设卡联动。</div>
                    </div>
                  )}

                  {playerSubTab === 'appearance' && (
                    <div className="space-y-3 text-sm">
                      <label className="block text-zinc-400 text-xs">外貌描写</label>
                      <textarea value={state.player.appearance} onChange={(e) => onUpdate('UPDATE_PLAYER', { appearance: e.target.value })} className="w-full h-28 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white resize-none" placeholder="发型、眉眼、脸型、身形、气质、服装特征..." />
                      <label className="block text-zinc-400 text-xs">画像备注 / 生图补充</label>
                      <textarea value={playerPortraitDraft} onChange={(e) => setPlayerPortraitDraft(e.target.value)} className="w-full h-32 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white resize-none" placeholder="例如：女，十六岁，黑发高束，眉眼清冷，青布短打，肩披旧斗篷，身形纤细但站姿很稳..." />
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => updatePlayerPortrait({ imageUrl: playerPortrait?.imageUrl || '', source: playerPortrait?.source || 'manual', note: playerPortraitDraft, prompt: playerPortrait?.prompt, title: state.player.name })} className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs flex items-center gap-1"><Save size={12} />保存画像备注</button>
                        <button onClick={() => onGeneratePlayerPortrait?.()} className="px-3 py-2 rounded-lg bg-pink-800 hover:bg-pink-700 text-white text-xs flex items-center gap-1"><Wand2 size={12} />AI生成主角画像</button>
                      </div>
                    </div>
                  )}

                  {playerSubTab === 'combat' && (
                    <div className="space-y-4">
                      <div className="grid md:grid-cols-5 gap-2 text-xs">
                        {[
                          { label: '主手武器', value: state.player.equipment.mainHand?.name || '无', icon: <Sword size={12} /> },
                          { label: '副手', value: state.player.equipment.offHand?.name || '无', icon: <Shield size={12} /> },
                          { label: '衣甲', value: state.player.equipment.body?.name || '无', icon: <Shirt size={12} /> },
                          { label: '饰物一', value: state.player.equipment.accessory1?.name || '无', icon: <Gem size={12} /> },
                          { label: '饰物二', value: state.player.equipment.accessory2?.name || '无', icon: <Gem size={12} /> }
                        ].map(card => <div key={card.label} className="rounded-lg bg-zinc-950/70 border border-zinc-800 p-3"><div className="text-zinc-500 flex items-center gap-1">{card.icon}{card.label}</div><div className="text-white mt-2">{card.value}</div></div>)}
                      </div>
                      <div className="grid md:grid-cols-2 gap-3 text-sm">
                        <div className="space-y-2">
                          {(['health','hunger','thirst','energy','sanity','infection','stamina'] as StatKey[]).map((k) => (
                            <div key={k}><label className="block text-zinc-400 text-xs mb-1">{state.player.stats[k].label}</label><input type="range" min={0} max={state.player.stats[k].max} value={state.player.stats[k].value} onChange={(e)=>onUpdate('SET_PLAYER_STAT',{stat:k,value:Number(e.target.value)})} className="w-full" /><div className="text-right text-xs text-zinc-500">{Math.round(state.player.stats[k].value)}/{state.player.stats[k].max}</div></div>
                          ))}
                        </div>
                        <div className="space-y-3">
                          <label className="block text-zinc-400 text-xs">银两</label>
                          <input type="number" value={state.player.currency.silver} onChange={(e)=>onUpdate('UPDATE_PLAYER',{ currency:{ ...state.player.currency, silver:Number(e.target.value)||0 } })} className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white" />
                          <label className="block text-zinc-400 text-xs">铜钱</label>
                          <input type="number" value={state.player.currency.copper} onChange={(e)=>onUpdate('UPDATE_PLAYER',{ currency:{ ...state.player.currency, copper:Number(e.target.value)||0 } })} className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white" />
                          <label className="block text-zinc-400 text-xs">特质标签（、分隔）</label>
                          <textarea value={(state.player.traits || []).join('、')} onChange={(e)=>onUpdate('UPDATE_PLAYER',{ traits:e.target.value.split(/[、,，]/).map((v:string)=>v.trim()).filter(Boolean) })} className="w-full h-24 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white resize-none" />
                        </div>
                      </div>
                    </div>
                  )}

                  {playerSubTab === 'cultivation' && (
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-3">
                        <label className="block text-zinc-400 text-xs">境界阶段</label>
                        <input type="number" value={state.player.cultivationStage} onChange={(e)=>onUpdate('UPDATE_PLAYER',{ cultivationStage:Number(e.target.value)||0 })} className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white" />
                        <label className="block text-zinc-400 text-xs">门派 / 传承</label>
                        <input value={state.player.sect || ''} onChange={(e)=>onUpdate('UPDATE_PLAYER',{ sect:e.target.value })} className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white" />
                        <label className="block text-zinc-400 text-xs">武学列表（格式：名字:等级）</label>
                        <textarea value={(state.player.martialArts || []).map((m) => `${m.name}:${m.level}`).join('\n')} onChange={(e) => {
                          const martialArts = e.target.value.split('\n').map((line:string, idx:number)=>line.trim()).filter(Boolean).map((line:string, idx:number)=>{ const [name, level] = line.split(':'); return { id:`ma_${idx}_${Date.now()}`, name:name?.trim()||`武学${idx+1}`, level:Number(level)||1, description:'后台录入武学', style:'mixed' as const }; });
                          onUpdate('UPDATE_PLAYER',{ martialArts });
                        }} className="w-full h-40 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white resize-none" />
                      </div>
                      <div className="space-y-3">
                        <label className="block text-zinc-400 text-xs">技能列表（格式：名字:等级）</label>
                        <textarea value={(state.player.skills || []).map((s) => `${s.name}:${s.level}`).join('\n')} onChange={(e) => {
                          const skills = e.target.value.split('\n').map((line:string)=>line.trim()).filter(Boolean).map((line:string, idx:number)=>{ const [name, level] = line.split(':'); return { id:`skill_${idx}_${Date.now()}`, name:name?.trim()||`技能${idx+1}`, description:'后台录入技能', level:Number(level)||1, maxLevel:10, experience:0, expToNextLevel:100, category:'survival' as const }; });
                          onUpdate('UPDATE_PLAYER',{ skills });
                        }} className="w-full h-40 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white resize-none" />
                      </div>
                    </div>
                  )}

                  {playerSubTab === 'relations' && (
                    <div className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-3 text-sm">
                        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 space-y-3">
                          <div className="text-white font-semibold flex items-center gap-2"><Heart size={14} />人脉与情感</div>
                          <label className="block text-zinc-400 text-xs">魅力</label>
                          <input type="number" value={state.player.romance.charm} onChange={(e)=>onUpdate('UPDATE_PLAYER',{ romance:{ ...state.player.romance, charm:Number(e.target.value)||0 } })} className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white" />
                          <label className="block text-zinc-400 text-xs">依恋类型</label>
                          <select value={state.player.romance.attachmentStyle} onChange={(e)=>onUpdate('UPDATE_PLAYER',{ romance:{ ...state.player.romance, attachmentStyle:e.target.value } })} className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white">
                            <option value="secure">稳定</option><option value="avoidant">疏离</option><option value="anxious">焦虑</option><option value="balanced">平衡</option>
                          </select>
                          <div className="text-xs text-zinc-500">当前伴侣：<span className="text-zinc-200">{state.player.romance.currentPartnerId || '无'}</span></div>
                        </div>
                        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3">
                          <div className="text-white font-semibold mb-3">主角关系网络图</div>
                          <RelationshipGraph npcs={state.npcs} centerName={state.player.name} />
                        </div>
                      </div>
                    </div>
                  )}

                  {playerSubTab === 'persona' && (
                    <div className="space-y-3">
                      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3">
                        <div className="text-white font-semibold flex items-center gap-2 mb-2"><Brain size={14} />主角专属 AI / 生图人设卡</div>
                        <div className="text-xs text-zinc-400 whitespace-pre-wrap leading-relaxed">姓名：{state.player.name}\n年龄：{state.player.age}岁\n性别：{genderLabel(state.player.gender)}\n身份：{state.player.role}\n门派/传承：{state.player.sect || '无'}\n境界：{state.player.cultivationStage}\n名望：{state.player.jianghuFame}\n侠义：{state.player.morality}\n外貌：{state.player.appearance || '待补充'}\n特质：{(state.player.traits || []).join('、') || '待补充'}\n背景：{state.player.background || '待补充'}\n画像备注：{playerPortrait?.note || '待补充'}\n出身：{originLabel(birthSettings?.origin)}\n前世记忆：{memoryLabel(birthSettings?.memory)}\n初始特质：{traitLabel(birthSettings?.trait)}\n目标：{birthSettings?.goal || '未知'}\n底线：{birthSettings?.bottomLine || '未知'}\n隐藏优势：{birthSettings?.hiddenEdge || '未知'}\n性情：{birthSettings?.temperament || '未知'}</div>
                        <div className="mt-3 flex gap-2">
                          <button onClick={async()=>{ try { await navigator.clipboard.writeText(`姓名：${state.player.name}\n年龄：${state.player.age}岁\n性别：${genderLabel(state.player.gender)}\n身份：${state.player.role}\n门派/传承：${state.player.sect || '无'}\n境界：${state.player.cultivationStage}\n名望：${state.player.jianghuFame}\n侠义：${state.player.morality}\n外貌：${state.player.appearance || '待补充'}\n特质：${(state.player.traits || []).join('、') || '待补充'}\n背景：${state.player.background || '待补充'}\n画像备注：${playerPortrait?.note || '待补充'}\n出身：${originLabel(birthSettings?.origin)}\n前世记忆：${memoryLabel(birthSettings?.memory)}\n初始特质：${traitLabel(birthSettings?.trait)}\n目标：${birthSettings?.goal || '未知'}\n底线：${birthSettings?.bottomLine || '未知'}\n隐藏优势：${birthSettings?.hiddenEdge || '未知'}\n性情：${birthSettings?.temperament || '未知'}`); alert('已复制主角人设卡'); } catch { alert('复制失败'); } }} className="px-3 py-2 rounded-lg bg-cyan-800 hover:bg-cyan-700 text-white text-xs">复制主角人设卡</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'npcs' && (
            <div className="space-y-4">
              <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 grid lg:grid-cols-[1.3fr_1fr] gap-4">
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-white flex items-center gap-2"><Plus size={14} />新增人物</div>
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <input value={newNPCName} onChange={(e)=>setNewNPCName(e.target.value)} placeholder="姓名" className="bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white" />
                    <input type="number" value={newNPCAge} onChange={(e)=>setNewNPCAge(Number(e.target.value)||20)} placeholder="年龄" className="bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white" />
                    <select value={newNPCGender} onChange={(e)=>setNewNPCGender(e.target.value as 'male' | 'female' | 'other')} className="bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white"><option value="male">男</option><option value="female">女</option><option value="other">其他</option></select>
                    <input value={newNPCOccupation} onChange={(e)=>setNewNPCOccupation(e.target.value)} placeholder="身份/职业" className="bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white" />
                    <input value={newNPCLocation} onChange={(e)=>setNewNPCLocation(e.target.value)} placeholder="所在地点（可留空）" className="bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white md:col-span-2" />
                    <textarea value={newNPCDesc} onChange={(e)=>setNewNPCDesc(e.target.value)} placeholder="人物描述" className="bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white resize-none h-24 md:col-span-2" />
                  </div>
                  <button onClick={handleAddNPC} className="px-3 py-2 rounded-lg bg-fuchsia-800 hover:bg-fuchsia-700 text-white text-xs flex items-center gap-1"><Plus size={12} />添加人物</button>
                </div>
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-white flex items-center gap-2"><Search size={14} />筛选与搜索</div>
                  <input value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} placeholder="搜索姓名/职业/位置" className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white text-sm" />
                  <div className="flex flex-wrap gap-2">
                    {(['all','alive','dead','poisoned','recruited'] as const).map(f => <button key={f} onClick={()=>setNpcFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs ${npcFilter===f?'bg-fuchsia-700 text-white':'bg-zinc-800 text-zinc-300'}`}>{f==='all'?'全部':f==='alive'?'存活':f==='dead'?'已故':f==='poisoned'?'中毒':f==='recruited'?'同行':''}</button>)}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {filteredNPCs.map((npc) => {
                  const subTab = npcSubTabMap[npc.id] || 'profile';
                  const portrait = portraitMap[npc.id];
                  return (
                    <div key={npc.id} className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
                      <button onClick={() => setExpandedNPC(expandedNPC === npc.id ? null : npc.id)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800/40 text-left">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-xl overflow-hidden bg-zinc-800 border border-zinc-700 shrink-0">
                            {portrait?.imageUrl ? <img src={portrait.imageUrl} alt={npc.name} className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-zinc-400"><User size={18} /></div>}
                          </div>
                          <div className="min-w-0">
                            <div className="text-white font-medium flex items-center gap-2 flex-wrap">
                              <span>{npc.name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">{genderLabel(npc.gender)}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">{npc.age}岁</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${npc.status==='alive'?'bg-green-900/40 text-green-300':npc.status==='dead'?'bg-red-900/40 text-red-300':'bg-yellow-900/40 text-yellow-300'}`}>{npcStatusLabel(npc.status)}</span>
                            </div>
                            <div className="text-xs text-zinc-500 truncate">{npc.occupation} · {npc.location} · {npc.faction || '无势力'}</div>
                          </div>
                        </div>
                        {expandedNPC === npc.id ? <ChevronDown size={16} className="text-zinc-500" /> : <ChevronRight size={16} className="text-zinc-500" />}
                      </button>

                      {expandedNPC === npc.id && (
                        <div className="border-t border-zinc-800 p-4 space-y-4">
                          <div className="flex flex-wrap gap-2">{[
                            ['profile','档案'], ['combat','装备/属性'], ['relations','关系/恋爱'], ['skills','武学/境界'], ['portrait','画像']
                          ].map(([id,label])=>renderNpcSubTabBtn(npc.id,id as NpcSubTab,label))}</div>

                          {subTab === 'profile' && (
                            <div className="grid md:grid-cols-2 gap-3 text-sm">
                              <div className="space-y-3">
                                <label className="block text-zinc-400 text-xs">姓名</label>
                                <input value={npc.name} onChange={(e)=>onUpdate('UPDATE_NPC',{ id:npc.id, updates:{ name:e.target.value } })} className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white" />
                                <label className="block text-zinc-400 text-xs">年龄</label>
                                <input type="number" value={npc.age} onChange={(e)=>onUpdate('UPDATE_NPC',{ id:npc.id, updates:{ age:Number(e.target.value)||0 } })} className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white" />
                                <label className="block text-zinc-400 text-xs">性别</label>
                                <select value={npc.gender} onChange={(e)=>onUpdate('UPDATE_NPC',{ id:npc.id, updates:{ gender:e.target.value } })} className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white"><option value="male">男</option><option value="female">女</option><option value="other">其他</option></select>
                                <label className="block text-zinc-400 text-xs">身份/职业</label>
                                <input value={npc.occupation} onChange={(e)=>onUpdate('UPDATE_NPC',{ id:npc.id, updates:{ occupation:e.target.value } })} className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white" />
                                <label className="block text-zinc-400 text-xs">所在地点</label>
                                <input value={npc.location} onChange={(e)=>onUpdate('UPDATE_NPC',{ id:npc.id, updates:{ location:e.target.value } })} className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white" />
                                <label className="block text-zinc-400 text-xs">势力</label>
                                <input value={npc.faction || ''} onChange={(e)=>onUpdate('UPDATE_NPC',{ id:npc.id, updates:{ faction:e.target.value } })} className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white" />
                              </div>
                              <div className="space-y-3">
                                <label className="block text-zinc-400 text-xs">样貌</label>
                                <textarea value={npc.appearance || ''} onChange={(e)=>onUpdate('UPDATE_NPC',{ id:npc.id, updates:{ appearance:e.target.value } })} className="w-full h-24 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white resize-none" />
                                <label className="block text-zinc-400 text-xs">描述</label>
                                <textarea value={npc.description || ''} onChange={(e)=>onUpdate('UPDATE_NPC',{ id:npc.id, updates:{ description:e.target.value } })} className="w-full h-24 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white resize-none" />
                                <label className="block text-zinc-400 text-xs">AI人设</label>
                                <textarea value={npc.aiPersona || ''} onChange={(e)=>onUpdate('UPDATE_NPC',{ id:npc.id, updates:{ aiPersona:e.target.value } })} className="w-full h-20 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white resize-none" />
                                <label className="block text-zinc-400 text-xs">目标（、分隔）</label>
                                <textarea value={(npc.goals || []).join('、')} onChange={(e)=>onUpdate('UPDATE_NPC',{ id:npc.id, updates:{ goals:e.target.value.split(/[、,，]/).map((v:string)=>v.trim()).filter(Boolean) } })} className="w-full h-16 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white resize-none" />
                                <label className="block text-zinc-400 text-xs">秘密（、分隔）</label>
                                <textarea value={(npc.secrets || []).join('、')} onChange={(e)=>onUpdate('UPDATE_NPC',{ id:npc.id, updates:{ secrets:e.target.value.split(/[、,，]/).map((v:string)=>v.trim()).filter(Boolean) } })} className="w-full h-16 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white resize-none" />
                              </div>
                            </div>
                          )}

                          {subTab === 'combat' && (
                            <div className="space-y-4 text-sm">
                              <div className="grid md:grid-cols-4 gap-2 text-xs">
                                <div className="rounded-lg bg-zinc-950/60 border border-zinc-800 p-3"><div className="text-zinc-500 flex items-center gap-1 mb-2"><Sword size={11} />主兵器</div><div className="text-white min-h-[20px]">{asItemNames(npc.equipment?.weapon)}</div></div>
                                <div className="rounded-lg bg-zinc-950/60 border border-zinc-800 p-3"><div className="text-zinc-500 flex items-center gap-1 mb-2"><Shirt size={11} />服饰</div><div className="text-white">{asItemNames(npc.equipment?.clothing)}</div></div>
                                <div className="rounded-lg bg-zinc-950/60 border border-zinc-800 p-3"><div className="text-zinc-500 flex items-center gap-1 mb-2"><Gem size={11} />饰物</div><div className="text-white">{asItemNames(npc.equipment?.accessory)}</div></div>
                                <div className="rounded-lg bg-zinc-950/60 border border-zinc-800 p-3"><div className="text-zinc-500 flex items-center gap-1 mb-2"><Package size={11} />随身物</div><div className="text-white">{asItemNames(npc.inventory)}</div></div>
                              </div>
                              <div className="grid md:grid-cols-2 gap-3">
                                <div className="space-y-2">
                                  <label className="block text-zinc-400 text-xs">主兵器（单个名字）</label>
                                  <input value={asItemNames(npc.equipment?.weapon) === '无' ? '' : asItemNames(npc.equipment?.weapon)} onChange={(e)=>onUpdate('UPDATE_NPC',{ id:npc.id, updates:{ equipment:{ ...npc.equipment, weapon: e.target.value.trim() ? createItem({ id:`weapon_${npc.id}_${Date.now()}`, name:e.target.value.trim(), type:'weapon', description:'后台录入主兵器' }) : undefined } } })} className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white" />
                                  <label className="block text-zinc-400 text-xs">服饰（、分隔）</label>
                                  <textarea value={asItemNames(npc.equipment?.clothing) === '无' ? '' : asItemNames(npc.equipment?.clothing)} onChange={(e)=>onUpdate('UPDATE_NPC',{ id:npc.id, updates:{ equipment:{ ...npc.equipment, clothing: makeItemsFromText('cloth', npc.id, e.target.value, 'clothing') } } })} className="w-full h-16 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white resize-none" />
                                  <label className="block text-zinc-400 text-xs">饰物（、分隔）</label>
                                  <textarea value={asItemNames(npc.equipment?.accessory) === '无' ? '' : asItemNames(npc.equipment?.accessory)} onChange={(e)=>onUpdate('UPDATE_NPC',{ id:npc.id, updates:{ equipment:{ ...npc.equipment, accessory: makeItemsFromText('acc', npc.id, e.target.value, 'misc') } } })} className="w-full h-16 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white resize-none" />
                                  <label className="block text-zinc-400 text-xs">随身物（、分隔）</label>
                                  <textarea value={npc.inventory.map(i=>i.name).join('、')} onChange={(e)=>onUpdate('UPDATE_NPC',{ id:npc.id, updates:{ inventory: makeItemsFromText('inv', npc.id, e.target.value, 'misc') } })} className="w-full h-16 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white resize-none" />
                                </div>
                                <div className="space-y-2">
                                  {(['health','hunger','thirst','energy'] as const).map((k)=><div key={k}><label className="block text-zinc-400 text-xs mb-1">{k==='health'?'气血':k==='hunger'?'饱腹':k==='thirst'?'口渴':'精力'}</label><input type="range" min={0} max={k==='health'?(npc.stats.maxHealth||100):100} value={npc.stats[k] || 0} onChange={(e)=>onUpdate('UPDATE_NPC',{ id:npc.id, updates:{ stats:{ ...npc.stats, [k]: Number(e.target.value) } } })} className="w-full" /><div className="text-right text-xs text-zinc-500">{Math.round(npc.stats[k] || 0)}</div></div>)}
                                  <label className="block text-zinc-400 text-xs">战力</label>
                                  <input type="range" min={0} max={100} value={npc.stats.combat} onChange={(e)=>onUpdate('UPDATE_NPC',{ id:npc.id, updates:{ stats:{ ...npc.stats, combat:Number(e.target.value) } } })} className="w-full" />
                                  <label className="block text-zinc-400 text-xs">感知</label>
                                  <input type="range" min={0} max={100} value={npc.stats.perception} onChange={(e)=>onUpdate('UPDATE_NPC',{ id:npc.id, updates:{ stats:{ ...npc.stats, perception:Number(e.target.value) } } })} className="w-full" />
                                </div>
                              </div>
                            </div>
                          )}

                          {subTab === 'relations' && (
                            <div className="grid md:grid-cols-2 gap-4 text-sm">
                              <div className="space-y-3">
                                <label className="block text-zinc-400 text-xs">关系</label>
                                <input type="range" min={-100} max={100} value={npc.relation} onChange={(e)=>onUpdate('UPDATE_NPC',{ id:npc.id, updates:{ relation:Number(e.target.value) } })} className="w-full" />
                                <label className="block text-zinc-400 text-xs">信任</label>
                                <input type="range" min={0} max={100} value={npc.trust} onChange={(e)=>onUpdate('UPDATE_NPC',{ id:npc.id, updates:{ trust:Number(e.target.value) } })} className="w-full" />
                                <label className="block text-zinc-400 text-xs">畏惧</label>
                                <input type="range" min={0} max={100} value={npc.fear} onChange={(e)=>onUpdate('UPDATE_NPC',{ id:npc.id, updates:{ fear:Number(e.target.value) } })} className="w-full" />
                                <label className="block text-zinc-400 text-xs">情绪</label>
                                <input value={npc.mood || ''} onChange={(e)=>onUpdate('UPDATE_NPC',{ id:npc.id, updates:{ mood:e.target.value } })} className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white" />
                              </div>
                              <div className="space-y-3">
                                <div className="text-white font-semibold flex items-center gap-2"><Heart size={14} />恋爱/婚配</div>
                                <label className="block text-zinc-400 text-xs">阶段</label>
                                <select value={npc.romance?.stage || 'none'} onChange={(e)=>onUpdate('UPDATE_NPC',{ id:npc.id, updates:{ romance:{ ...(npc.romance||{}), stage:e.target.value } } })} className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white">
                                  <option value="none">无</option><option value="interested">心动</option><option value="close">亲近</option><option value="ambiguous">暧昧</option><option value="lover">恋人</option><option value="engaged">婚约</option><option value="married">夫妻</option><option value="broken">决裂</option>
                                </select>
                                {(['affinity','attraction','trust','intimacy','commitment','jealousy'] as const).map(key => <div key={key}><label className="block text-zinc-400 text-xs capitalize">{key}</label><input type="range" min={0} max={100} value={(npc.romance as Partial<RomanceState>)?.[key] || 0} onChange={(e)=>onUpdate('UPDATE_NPC',{ id:npc.id, updates:{ romance:{ ...(npc.romance||{}), [key]: Number(e.target.value) } } })} className="w-full" /></div>)}
                              </div>
                            </div>
                          )}

                          {subTab === 'skills' && (
                            <div className="grid md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <label className="block text-zinc-400 text-xs mb-2">技能（格式：名字:等级）</label>
                                <textarea value={Object.entries(npc.skills || {}).map(([k,v])=>`${k}:${v}`).join('\n')} onChange={(e)=>{
                                  const skills: Record<string, number> = {};
                                  e.target.value.split('\n').map(v=>v.trim()).filter(Boolean).forEach(line=>{ const [k,v] = line.split(':'); if (k) skills[k.trim()] = Number(v)||0; });
                                  onUpdate('UPDATE_NPC',{ id:npc.id, updates:{ skills } });
                                }} className="w-full h-40 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white resize-none" />
                              </div>
                              <div>
                                <label className="block text-zinc-400 text-xs mb-2">性格标签（、分隔）</label>
                                <textarea value={(npc.personalityTags || []).join('、')} onChange={(e)=>onUpdate('UPDATE_NPC',{ id:npc.id, updates:{ personalityTags:e.target.value.split(/[、,，]/).map((v:string)=>v.trim()).filter(Boolean) } })} className="w-full h-24 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white resize-none" />
                                <div className="mt-4 text-xs text-zinc-500">当前行动：<span className="text-zinc-200">{npc.currentAction || '无'}</span></div>
                                <div className="text-xs text-zinc-500 mt-1">同行：<span className="text-zinc-200">{npc.isRecruited ? '是' : '否'}</span></div>
                              </div>
                            </div>
                          )}

                          {subTab === 'portrait' && (
                            <div className="grid md:grid-cols-[260px_1fr] gap-4 text-sm">
                              <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
                                <div className="aspect-[3/4] bg-zinc-950 flex items-center justify-center">{portrait?.imageUrl ? <img src={portrait.imageUrl} alt={npc.name} className="w-full h-full object-contain" /> : <div className="text-center text-zinc-500"><ImageIcon className="mx-auto mb-2" />暂无画像</div>}</div>
                                <div className="p-3 text-xs text-zinc-500 border-t border-zinc-800">来源：{portrait ? (portrait.source === 'ai' ? 'AI生成' : '手动导入') : '无'}</div>
                              </div>
                              <div className="space-y-3">
                                <textarea value={portraitNoteDraft} onChange={(e)=>setPortraitNoteDraft(e.target.value)} className="w-full h-36 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white resize-none" placeholder="补充生图备注：性别、发型、服装、气质、神态..." />
                                <div className="flex flex-wrap gap-2">
                                  <button onClick={() => setPortraitNpcId(npc.id)} className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs flex items-center gap-1"><ImageIcon size={12} />查看大图</button>
                                  <button onClick={() => { setPortraitNpcId(npc.id); fileInputRef.current?.click(); }} className="px-3 py-2 rounded-lg bg-fuchsia-800 hover:bg-fuchsia-700 text-white text-xs flex items-center gap-1"><Upload size={12} />导入画像</button>
                                  <button onClick={() => onGenerateNPCPortrait?.(npc)} className="px-3 py-2 rounded-lg bg-pink-800 hover:bg-pink-700 text-white text-xs flex items-center gap-1"><Wand2 size={12} />AI生成画像</button>
                                  <button onClick={() => { syncNpcPortraitsFromStorage(); alert('已同步前端缓存'); }} className="px-3 py-2 rounded-lg bg-cyan-800 hover:bg-cyan-700 text-white text-xs flex items-center gap-1"><RefreshCw size={12} />同步缓存</button>
                                  {portrait && <button onClick={() => { if (confirm(`删除 ${npc.name} 的画像？`)) removePortraitForNpc(npc.id); }} className="px-3 py-2 rounded-lg bg-red-900 hover:bg-red-800 text-white text-xs flex items-center gap-1"><Trash2 size={12} />删除画像</button>}
                                </div>
                                {portrait?.prompt && <div className="rounded-lg bg-black/30 border border-zinc-800 p-3 text-xs text-zinc-400 whitespace-pre-wrap max-h-48 overflow-y-auto">{portrait.prompt}</div>}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'items' && (
            <div className="space-y-4">
              <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 grid lg:grid-cols-[1.2fr_1fr] gap-4">
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-white flex items-center gap-2"><Plus size={14} />添加物品</div>
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <input value={newItemName} onChange={(e)=>setNewItemName(e.target.value)} placeholder="物品名" className="bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white" />
                    <select value={newItemType} onChange={(e)=>setNewItemType(e.target.value as ItemType)} className="bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white">{['misc','food','drink','medicine','weapon','tool','material','clothing','document','container'].map(t=><option key={t} value={t}>{itemTypeLabel(t)}</option>)}</select>
                    <textarea value={newItemDesc} onChange={(e)=>setNewItemDesc(e.target.value)} placeholder="描述" className="md:col-span-2 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white resize-none h-24" />
                  </div>
                  <button onClick={handleAddItem} className="px-3 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white text-xs flex items-center gap-1"><Plus size={12} />加入背包</button>
                </div>
                <div className="space-y-3">
                  <input value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} placeholder="搜索物品名" className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white text-sm" />
                  <div className="flex flex-wrap gap-2">{['all','food','drink','medicine','weapon','tool','material','document','container','misc'].map(t=><button key={t} onClick={()=>setItemFilter(t)} className={`px-3 py-1.5 rounded-lg text-xs ${itemFilter===t?'bg-emerald-700 text-white':'bg-zinc-800 text-zinc-300'}`}>{t==='all'?'全部':itemTypeLabel(t)}</button>)}</div>
                </div>
              </div>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                {filteredItems.map((item)=> (
                  <div key={item.id} className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-3"><div className="text-white font-medium truncate">{item.name}</div><span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">{itemTypeLabel(item.type)}</span></div>
                    <div className="text-xs text-zinc-500 line-clamp-2">{item.description || '无描述'}</div>
                    <div className="text-xs text-zinc-400">数量：{item.quantity} · 重量：{item.weight}</div>
                    {typeof item.currentUses !== 'undefined' && typeof item.maxUses !== 'undefined' && <div className="text-xs text-cyan-300">使用次数：{item.currentUses}/{item.maxUses}</div>}
                    {typeof item.durability !== 'undefined' && <div className="text-xs text-yellow-300">耐久：{item.durability}/{item.maxDurability || 100}</div>}
                    <button onClick={()=>onUpdate('REMOVE_ITEM', item.id)} className="px-3 py-2 rounded-lg bg-red-900 hover:bg-red-800 text-white text-xs">删除</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'locations' && (
            <div className="space-y-4">
              <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 grid lg:grid-cols-[1.1fr_1fr] gap-4">
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-white flex items-center gap-2"><MapPin size={14} />新增地点</div>
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <input value={newLocationName} onChange={(e)=>setNewLocationName(e.target.value)} placeholder="地点名" className="bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white" />
                    <select value={newLocationType} onChange={(e)=>setNewLocationType(e.target.value as 'room' | 'building' | 'outdoor' | 'underground' | 'vehicle')} className="bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white">{['outdoor','building','room','underground','vehicle'].map(t=><option key={t} value={t}>{locationTypeLabel(t)}</option>)}</select>
                    <textarea value={newLocationDesc} onChange={(e)=>setNewLocationDesc(e.target.value)} placeholder="地点描述" className="md:col-span-2 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white resize-none h-24" />
                  </div>
                  <button onClick={handleAddLocation} className="px-3 py-2 rounded-lg bg-indigo-800 hover:bg-indigo-700 text-white text-xs flex items-center gap-1"><Plus size={12} />添加地点</button>
                </div>
                <div className="rounded-xl bg-zinc-950/60 border border-zinc-800 p-4 text-xs text-zinc-400 leading-relaxed">新增地点会自动连接到你当前所在的位置，并即时写入地图系统，方便手工扩展世界与修正 AI 新发现地点。</div>
              </div>
              <div className="space-y-3">
                {state.locations.map((loc)=> (
                  <div key={loc.id} className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
                    <button onClick={()=>setExpandedLocation(expandedLocation===loc.id?null:loc.id)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800/40">
                      <div className="text-left">
                        <div className="text-white font-medium flex items-center gap-2"><span>{loc.name}</span><span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">{locationTypeLabel(loc.type)}</span>{state.world.location===loc.name && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-300">当前位置</span>}</div>
                        <div className="text-xs text-zinc-500">危险 {loc.dangerLevel}% · 敌影 {loc.hostilePresent} · 人物 {loc.npcsPresent.length}</div>
                      </div>
                      {expandedLocation===loc.id ? <ChevronDown size={16} className="text-zinc-500"/> : <ChevronRight size={16} className="text-zinc-500"/>}
                    </button>
                    {expandedLocation===loc.id && (
                      <div className="border-t border-zinc-800 p-4 grid md:grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          <label className="block text-zinc-400 text-xs">名称</label>
                          <input value={loc.name} onChange={(e)=>onUpdate('UPDATE_LOCATION',{ id:loc.id, updates:{ name:e.target.value } })} className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white" />
                          <label className="block text-zinc-400 text-xs">描述</label>
                          <textarea value={loc.description} onChange={(e)=>onUpdate('UPDATE_LOCATION',{ id:loc.id, updates:{ description:e.target.value } })} className="w-full h-24 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white resize-none" />
                          <label className="block text-zinc-400 text-xs">连接地点ID（、分隔）</label>
                          <textarea value={(loc.connectedLocations || []).join('、')} onChange={(e)=>onUpdate('UPDATE_LOCATION',{ id:loc.id, updates:{ connectedLocations:e.target.value.split(/[、,，]/).map((v:string)=>v.trim()).filter(Boolean) } })} className="w-full h-16 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white resize-none" />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-zinc-400 text-xs">危险度</label>
                          <input type="range" min={0} max={100} value={loc.dangerLevel} onChange={(e)=>onUpdate('UPDATE_LOCATION',{ id:loc.id, updates:{ dangerLevel:Number(e.target.value) } })} className="w-full" />
                          <label className="block text-zinc-400 text-xs">敌影数量</label>
                          <input type="range" min={0} max={20} value={loc.hostilePresent} onChange={(e)=>onUpdate('UPDATE_LOCATION',{ id:loc.id, updates:{ hostilePresent:Number(e.target.value) } })} className="w-full" />
                          <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                            <button onClick={()=>onUpdate('UPDATE_LOCATION',{ id:loc.id, updates:{ isExplored:!loc.isExplored } })} className={`px-3 py-2 rounded-lg ${loc.isExplored?'bg-green-900/40 text-green-300':'bg-zinc-800 text-zinc-300'}`}>{loc.isExplored?'已探明':'未探明'}</button>
                            <button onClick={()=>onUpdate('UPDATE_LOCATION',{ id:loc.id, updates:{ isLocked:!loc.isLocked } })} className={`px-3 py-2 rounded-lg ${loc.isLocked?'bg-red-900/40 text-red-300':'bg-zinc-800 text-zinc-300'}`}>{loc.isLocked?'已封锁':'开放'}</button>
                            <button onClick={()=>onUpdate('UPDATE_LOCATION',{ id:loc.id, updates:{ hasWater:!loc.hasWater } })} className={`px-3 py-2 rounded-lg ${loc.hasWater?'bg-blue-900/40 text-blue-300':'bg-zinc-800 text-zinc-300'}`}>{loc.hasWater?'有水源':'无水源'}</button>
                            <button onClick={()=>onUpdate('UPDATE_LOCATION',{ id:loc.id, updates:{ hasElectricity:!loc.hasElectricity } })} className={`px-3 py-2 rounded-lg ${loc.hasElectricity?'bg-yellow-900/40 text-yellow-300':'bg-zinc-800 text-zinc-300'}`}>{loc.hasElectricity?'有灯火':'无灯火'}</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'monsters' && (
            <div className="space-y-4">
              <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 grid md:grid-cols-2 gap-3 text-sm">
                <input value={newMonsterName} onChange={(e)=>setNewMonsterName(e.target.value)} placeholder="妖魔名" className="bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white" />
                <input type="number" value={newMonsterTier} onChange={(e)=>setNewMonsterTier(Number(e.target.value)||1)} placeholder="品阶" className="bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white" />
                <input type="number" value={newMonsterHP} onChange={(e)=>setNewMonsterHP(Number(e.target.value)||100)} placeholder="气血" className="bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white" />
                <input type="number" value={newMonsterDmg} onChange={(e)=>setNewMonsterDmg(Number(e.target.value)||20)} placeholder="伤害" className="bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white" />
                <textarea value={newMonsterDesc} onChange={(e)=>setNewMonsterDesc(e.target.value)} placeholder="描述" className="md:col-span-2 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white resize-none h-24" />
                <button onClick={handleAddMonster} className="px-3 py-2 rounded-lg bg-red-800 hover:bg-red-700 text-white text-xs flex items-center gap-1"><Plus size={12} />添加妖魔</button>
              </div>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                {(state.monsterTypes || []).map((m) => (
                  <div key={m.id} className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-2 text-sm">
                    <div className="flex items-center justify-between"><div className="text-white font-medium">{m.name}</div><span className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/40 text-red-300">{m.tier}阶</span></div>
                    <div className="text-xs text-zinc-500 line-clamp-2">{m.description}</div>
                    <div className="text-xs text-zinc-400">气血 {m.stats?.health} · 伤害 {m.stats?.damage}</div>
                    <button onClick={()=>onUpdate('REMOVE_INFECTED_TYPE', m.id)} className="px-3 py-2 rounded-lg bg-red-900 hover:bg-red-800 text-white text-xs">删除</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'world' && (
            <div className="grid lg:grid-cols-2 gap-4 text-sm">
              <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-3">
                <div className="text-white font-semibold flex items-center gap-2"><Mountain size={14} />世界参数</div>
                <div><label className="block text-zinc-400 text-xs mb-1">天气</label><select value={state.world.weather.current} onChange={(e)=>onUpdate('UPDATE_WORLD',{ weather:{ ...state.world.weather, current:e.target.value } })} className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white">{['clear','cloudy','overcast','drizzle','rain','heavy_rain','thunderstorm','fog','snow','blizzard'].map(w=><option key={w} value={w}>{weatherLabel(w)}</option>)}</select></div>
                <div><label className="block text-zinc-400 text-xs mb-1">温度</label><input type="range" min={-20} max={45} value={state.world.weather.temperature} onChange={(e)=>onUpdate('UPDATE_WORLD',{ weather:{ ...state.world.weather, temperature:Number(e.target.value) } })} className="w-full" /></div>
                <div><label className="block text-zinc-400 text-xs mb-1">瘴气浓度</label><input type="range" min={0} max={100} value={state.world.miasmaRate} onChange={(e)=>onUpdate('UPDATE_WORLD',{ miasmaRate:Number(e.target.value) })} className="w-full" /></div>
                <div><label className="block text-zinc-400 text-xs mb-1">江湖乱象</label><input type="range" min={0} max={100} value={state.world.chaosLevel} onChange={(e)=>onUpdate('UPDATE_WORLD',{ chaosLevel:Number(e.target.value) })} className="w-full" /></div>
                <div><label className="block text-zinc-400 text-xs mb-1">朝廷管控</label><input type="range" min={0} max={100} value={state.world.governmentControl} onChange={(e)=>onUpdate('UPDATE_WORLD',{ governmentControl:Number(e.target.value) })} className="w-full" /></div>
              </div>
              <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-3">
                <div className="text-white font-semibold flex items-center gap-2"><Clock size={14} />时间与基础设施</div>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={()=>onUpdate('ADVANCE_TIME', 60)} className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs">+一时辰</button>
                  <button onClick={()=>onUpdate('ADVANCE_TIME', 360)} className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs">+半天</button>
                  <button onClick={()=>onUpdate('ADVANCE_TIME', 1440)} className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs">+一天</button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button onClick={()=>onUpdate('UPDATE_WORLD',{ water:!state.world.water })} className={`px-3 py-2 rounded-lg ${state.world.water?'bg-blue-900/40 text-blue-300':'bg-zinc-800 text-zinc-300'}`}>{state.world.water?'井水可用':'井水断绝'}</button>
                  <button onClick={()=>onUpdate('UPDATE_WORLD',{ gas:!state.world.gas })} className={`px-3 py-2 rounded-lg ${state.world.gas?'bg-orange-900/40 text-orange-300':'bg-zinc-800 text-zinc-300'}`}>{state.world.gas?'炊火可用':'炊火断绝'}</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'economy' && (
            <div className="grid lg:grid-cols-2 gap-4 text-sm">
              <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-3">
                <div className="text-white font-semibold flex items-center gap-2"><Coins size={14} />钱庄与行情</div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="rounded-lg bg-zinc-950/70 p-3"><div className="text-zinc-500">银兑铜</div><div className="text-white mt-1">1两={state.world.currencySystem.silverToCopper}文</div></div>
                  <div className="rounded-lg bg-zinc-950/70 p-3"><div className="text-zinc-500">市价指数</div><div className="text-white mt-1">{state.world.currencySystem.marketIndex}</div></div>
                  <div className="rounded-lg bg-zinc-950/70 p-3"><div className="text-zinc-500">税率</div><div className="text-white mt-1">{state.world.currencySystem.taxRate}%</div></div>
                </div>
                <div><label className="block text-zinc-400 text-xs mb-1">银兑铜比</label><input type="range" min={50} max={200} value={state.world.currencySystem.silverToCopper} onChange={(e)=>onUpdate('UPDATE_WORLD',{ currencySystem:{ ...state.world.currencySystem, silverToCopper:Number(e.target.value) } })} className="w-full" /></div>
                <div><label className="block text-zinc-400 text-xs mb-1">市价指数</label><input type="range" min={50} max={200} value={state.world.currencySystem.marketIndex} onChange={(e)=>onUpdate('UPDATE_WORLD',{ currencySystem:{ ...state.world.currencySystem, marketIndex:Number(e.target.value) } })} className="w-full" /></div>
                <div><label className="block text-zinc-400 text-xs mb-1">税率</label><input type="range" min={0} max={30} value={state.world.currencySystem.taxRate} onChange={(e)=>onUpdate('UPDATE_WORLD',{ currencySystem:{ ...state.world.currencySystem, taxRate:Number(e.target.value) } })} className="w-full" /></div>
              </div>
              <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-3">
                <div className="text-white font-semibold">当前角色盘缠</div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg bg-zinc-950/70 p-3"><div className="text-zinc-500">银两</div><div className="text-white mt-1">{state.player.currency.silver}</div></div>
                  <div className="rounded-lg bg-zinc-950/70 p-3"><div className="text-zinc-500">铜钱</div><div className="text-white mt-1">{state.player.currency.copper}</div></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'events' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">{['all','narrative','dialogue','combat','discovery','warning','death','ai','system','event','image'].map(t=><button key={t} onClick={()=>setEventFilter(t)} className={`px-3 py-1.5 rounded-lg text-xs ${eventFilter===t?'bg-zinc-700 text-white':'bg-zinc-800 text-zinc-300'}`}>{t==='all'?'全部':logTypeLabel(t)}</button>)}</div>
              <div className="space-y-2">
                {filteredEvents.slice().reverse().map((log)=> (
                  <div key={log.id} className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 text-sm">
                    <div className="flex items-center justify-between gap-3"><div className="text-white flex items-center gap-2"><span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">{logTypeLabel(log.type)}</span><span>{log.text.slice(0,120)}</span></div><span className="text-[11px] text-zinc-500">{new Date(log.timestamp).toLocaleString('zh-CN')}</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'aiPrompt' && (
            <div className="space-y-4 text-sm">
              <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-white font-semibold flex items-center gap-2"><Brain size={14} />AI 提示词总控</div>
                    <div className="text-xs text-zinc-500 mt-1">你可以在这里自定义 AI 的世界规则、人物行为、物品解析、地点移动、情感与文生图提示规则，从而提高游戏可塑性与个性化。</div>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-zinc-300">
                    <input type="checkbox" checked={aiPromptSettings.enabled} onChange={(e)=>setAiPromptSettings(prev=>({ ...prev, enabled:e.target.checked }))} />启用自定义提示词
                  </label>
                </div>
                <div className="grid lg:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-zinc-400 text-xs mb-1">系统前置指令</label>
                      <textarea value={aiPromptSettings.systemPromptPrefix} onChange={(e)=>setAiPromptSettings(prev=>({ ...prev, systemPromptPrefix:e.target.value }))} className="w-full h-24 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white resize-none" placeholder="例如：强调克制叙事、减少金手指、NPC更独立、更真实..." />
                    </div>
                    <div>
                      <label className="block text-zinc-400 text-xs mb-1">世界规则补充</label>
                      <textarea value={aiPromptSettings.worldRules} onChange={(e)=>setAiPromptSettings(prev=>({ ...prev, worldRules:e.target.value }))} className="w-full h-28 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white resize-none" placeholder="例如：货币、门派、朝廷、妖魔、修行体系、阶层规则..." />
                    </div>
                    <div>
                      <label className="block text-zinc-400 text-xs mb-1">用户自定义要求</label>
                      <textarea value={aiPromptSettings.userCustomInstructions} onChange={(e)=>setAiPromptSettings(prev=>({ ...prev, userCustomInstructions:e.target.value }))} className="w-full h-28 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white resize-none" placeholder="例如：剧情节奏偏慢、重细节、不要无缘无故奖励、强调现实因果..." />
                    </div>
                    <div>
                      <label className="block text-zinc-400 text-xs mb-1">NPC 行为规则</label>
                      <textarea value={aiPromptSettings.npcBehaviorRules} onChange={(e)=>setAiPromptSettings(prev=>({ ...prev, npcBehaviorRules:e.target.value }))} className="w-full h-28 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white resize-none" placeholder="例如：NPC说话风格、边界、情绪反应、秘密暴露规则、行动逻辑..." />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-zinc-400 text-xs mb-1">物品解析规则</label>
                      <textarea value={aiPromptSettings.itemParsingRules} onChange={(e)=>setAiPromptSettings(prev=>({ ...prev, itemParsingRules:e.target.value }))} className="w-full h-24 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white resize-none" placeholder="例如：哪些东西绝不能写成物品、归类偏好、稀有度规则..." />
                    </div>
                    <div>
                      <label className="block text-zinc-400 text-xs mb-1">地点 / 移动规则</label>
                      <textarea value={aiPromptSettings.locationRules} onChange={(e)=>setAiPromptSettings(prev=>({ ...prev, locationRules:e.target.value }))} className="w-full h-28 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white resize-none" placeholder="例如：移动必须合理、不能瞬移、赶路消耗要体现、店铺营业规则..." />
                    </div>
                    <div>
                      <label className="block text-zinc-400 text-xs mb-1">情感 / 情侣规则</label>
                      <textarea value={aiPromptSettings.romanceRules} onChange={(e)=>setAiPromptSettings(prev=>({ ...prev, romanceRules:e.target.value }))} className="w-full h-28 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white resize-none" placeholder="例如：暧昧、恋爱、婚约、拒绝、边界感、嫉妒、专一、情感推进节奏..." />
                    </div>
                    <div>
                      <label className="block text-zinc-400 text-xs mb-1">文生图提示规则</label>
                      <textarea value={aiPromptSettings.imagePromptRules} onChange={(e)=>setAiPromptSettings(prev=>({ ...prev, imagePromptRules:e.target.value }))} className="w-full h-28 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white resize-none" placeholder="例如：人物立绘更写实、场景图构图偏宽、角色必须符合性别与年龄、服装风格统一..." />
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-800">
                  <button onClick={saveAIPromptSettings} className="px-3 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white text-xs flex items-center gap-1"><Save size={12} />保存提示词配置</button>
                  <button onClick={resetAIPromptSettings} className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs flex items-center gap-1"><RotateCcw size={12} />重置为空白模板</button>
                  <button onClick={async()=>{ try { await navigator.clipboard.writeText(JSON.stringify(aiPromptSettings, null, 2)); alert('已复制 AI 提示词配置 JSON'); } catch { alert('复制失败'); } }} className="px-3 py-2 rounded-lg bg-cyan-800 hover:bg-cyan-700 text-white text-xs flex items-center gap-1"><FileJson size={12} />导出配置</button>
                  <button onClick={()=>{
                    const presets: Record<string, Partial<AIPromptSettings>> = {
                      '写实武侠': { worldRules: '保持写实、克制、低爽感，所有事件都要有现实后果。', npcBehaviorRules: 'NPC必须有自我立场，不可无条件顺从。', locationRules: '移动必须合理，跨区要花费时间与体力。' },
                      '黑暗江湖': { worldRules: '整体基调压抑、危险、灰暗，资源稀缺，秩序衰败。', npcBehaviorRules: '人物更警惕、多疑，冲突更频繁。', userCustomInstructions: '描写更冷峻，强调代价与人性阴暗面。'},
                      '慢热恋爱': { romanceRules: '情感推进必须缓慢，心动到亲近需多轮真实互动，不允许突兀告白。', npcBehaviorRules: 'NPC对亲密行为要有边界和迟疑。'},
                      '严谨生存': { itemParsingRules: '只将真实实体物品写入 new_items，所有状态变化必须写入 player_stat_changes。', worldRules: '食物、饮水、休息、受伤和货币流动必须严格记录。' }
                    };
                    const name = prompt('输入要套用的预设名：写实武侠 / 黑暗江湖 / 慢热恋爱 / 严谨生存');
                    if (!name || !presets[name]) return;
                    setAiPromptSettings(prev => ({ ...prev, ...presets[name] }));
                  }} className="px-3 py-2 rounded-lg bg-fuchsia-800 hover:bg-fuchsia-700 text-white text-xs flex items-center gap-1"><Sparkles size={12} />加载预设</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'orchestrator' && (
            <div className="space-y-4 text-sm">
              <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-white font-semibold flex items-center gap-2"><Brain size={14} />统筹调度中枢</div>
                    <div className="text-xs text-zinc-500 mt-1">这是一个面向全局的智能调节层，用来统一协调 AI、地图、人物、经济、图片、日志和世界反馈，避免各模块各自为政造成的信息错乱。</div>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-zinc-300">
                    <input type="checkbox" checked={orchestratorSettings.enabled} onChange={(e)=>setOrchestratorSettings(prev=>({ ...prev, enabled:e.target.checked }))} />启用统筹中枢
                  </label>
                </div>

                <div className="grid lg:grid-cols-2 gap-4">
                  <div className="rounded-xl bg-zinc-950/60 border border-zinc-800 p-4 space-y-3">
                    <div className="text-white font-medium">自动调节开关</div>
                    {[
                      ['autoBalanceDifficulty','动态难度平衡'],
                      ['autoStabilizeEconomy','经济波动稳定'],
                      ['autoCorrectNPCState','人物状态纠偏'],
                      ['autoRepairMapLinks','地图连接修复'],
                      ['autoNormalizeAIResults','AI结果规范化'],
                      ['autoSceneImageInsert','图片插入协调'],
                      ['autoReduceNoiseSpam','噪音日志抑制'],
                      ['autoPromoteDiscoveries','发现事件提纯']
                    ].map(([key,label]) => (
                      <label key={key} className="flex items-center justify-between gap-3 rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs text-zinc-300">
                        <span>{label}</span>
                        <input type="checkbox" checked={!!orchestratorSettings[key as keyof OrchestratorSettings]} onChange={(e)=>setOrchestratorSettings(prev=>({ ...prev, [key]: e.target.checked }))} />
                      </label>
                    ))}
                  </div>

                  <div className="rounded-xl bg-zinc-950/60 border border-zinc-800 p-4 space-y-3">
                    <div className="text-white font-medium">统筹强度参数</div>
                    {[
                      ['aiStrictness','AI约束严谨度', orchestratorSettings.aiStrictness],
                      ['mapCoherence','地图连贯性', orchestratorSettings.mapCoherence],
                      ['worldDynamics','世界主动运行强度', orchestratorSettings.worldDynamics],
                      ['npcAutonomy','NPC自主度', orchestratorSettings.npcAutonomy],
                      ['economyElasticity','经济弹性', orchestratorSettings.economyElasticity],
                      ['imageSafetyLevel','图片安全策略', orchestratorSettings.imageSafetyLevel],
                      ['logCleanliness','日志洁净度', orchestratorSettings.logCleanliness],
                    ].map(([key,label,value]) => (
                      <div key={key} className="space-y-1">
                        <div className="flex justify-between text-xs text-zinc-400"><span>{label}</span><span className="text-zinc-200">{value}</span></div>
                        <input type="range" min={0} max={100} value={value as number} onChange={(e)=>setOrchestratorSettings(prev=>({ ...prev, [key]: Number(e.target.value) }))} className="w-full" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl bg-zinc-950/60 border border-zinc-800 p-4 space-y-2">
                  <div className="text-white font-medium">中枢说明 / 自定义策略</div>
                  <textarea value={orchestratorSettings.notes} onChange={(e)=>setOrchestratorSettings(prev=>({ ...prev, notes:e.target.value }))} className="w-full h-32 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white resize-none" placeholder="你可以在这里写下额外策略，例如：优先保证地点逻辑严谨、减少图片插入频率、NPC更自主但不要脱离当前地图、AI发现必须先过规则清洗后才写入系统……" />
                </div>

                <div className="grid md:grid-cols-3 gap-3 text-xs">
                  <div className="rounded-xl bg-zinc-950/60 border border-zinc-800 p-3 text-zinc-400 leading-relaxed">
                    <div className="text-zinc-200 mb-1">AI 模块</div>
                    规范 AI 响应，过滤说明性脏文本、协调地点/人物/物品/世界状态写回顺序。
                  </div>
                  <div className="rounded-xl bg-zinc-950/60 border border-zinc-800 p-3 text-zinc-400 leading-relaxed">
                    <div className="text-zinc-200 mb-1">世界与地图模块</div>
                    自动修补新地点、连接链、人物位置、危险区与安全区之间的一致性。
                  </div>
                  <div className="rounded-xl bg-zinc-950/60 border border-zinc-800 p-3 text-zinc-400 leading-relaxed">
                    <div className="text-zinc-200 mb-1">人物与图片模块</div>
                    协调主角/NPC画像、场景图插入、前后台人物图像和情感状态一致性。
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-800">
                  <button onClick={saveOrchestratorSettings} className="px-3 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white text-xs flex items-center gap-1"><Save size={12} />保存中枢设置</button>
                  <button onClick={resetOrchestratorSettings} className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs flex items-center gap-1"><RotateCcw size={12} />恢复默认</button>
                  <button onClick={async()=>{ try { await navigator.clipboard.writeText(JSON.stringify(orchestratorSettings, null, 2)); alert('已复制统筹调度中枢配置 JSON'); } catch { alert('复制失败'); } }} className="px-3 py-2 rounded-lg bg-cyan-800 hover:bg-cyan-700 text-white text-xs flex items-center gap-1"><FileJson size={12} />导出配置</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="grid lg:grid-cols-2 gap-4 text-sm">
              <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-3">
                <div className="text-white font-semibold flex items-center gap-2"><FileJson size={14} />存档管理</div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={handleExport} className="px-3 py-2 rounded-lg bg-cyan-800 hover:bg-cyan-700 text-white text-xs">导出存档</button>
                  <label className="px-3 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white text-xs cursor-pointer">导入存档<input type="file" accept="application/json" className="hidden" onChange={handleImport} /></label>
                  <button onClick={() => { if (confirm('确定重置全部游戏数据与缓存？')) { FULL_CLEAR_KEYS.forEach((k)=>localStorage.removeItem(k)); onUpdate('RESET_GAME', null); onClose(); window.location.reload(); } }} className="px-3 py-2 rounded-lg bg-red-900 hover:bg-red-800 text-white text-xs flex items-center gap-1"><RotateCcw size={12} />重置全部</button>
                </div>
                <div className="text-xs text-zinc-500 whitespace-pre-wrap">重置会清空：主存档、出生设定、世界种子、主角/NPC画像、AI聊天草稿、ComfyUI工作流与场景图记录等。</div>
              </div>
              <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-2 text-xs text-zinc-400">
                <div>日志数量：{state.logs.length}</div>
                <div>地点数量：{state.locations.length}</div>
                <div>人物数量：{state.npcs.length}</div>
                <div>背包物品：{state.player.inventory.length}</div>
                <div>世界时间：{new Date(state.world.time).toLocaleString('zh-CN')}</div>
              </div>
            </div>
          )}

          {activeTab === 'crash' && (
            <div className="space-y-4">
              <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 flex flex-wrap gap-2 items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-zinc-200 flex items-center gap-2"><Bug size={15} />崩溃原因日志</div>
                  <div className="text-xs text-zinc-500 mt-1">自动记录脚本错误、Promise 异常、React 渲染失败、初始化失败等问题，方便排查黑屏和崩溃。</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={refreshCrashLogs} className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs flex items-center gap-1"><RefreshCw size={12} />刷新</button>
                  <button onClick={async () => { const text = JSON.stringify(crashLogs, null, 2); try { await navigator.clipboard.writeText(text); alert('崩溃日志已复制'); } catch { alert('复制失败，请手动复制'); } }} className="px-3 py-2 rounded-lg bg-cyan-800 hover:bg-cyan-700 text-cyan-100 text-xs flex items-center gap-1"><BookOpen size={12} />复制日志</button>
                  <button onClick={() => { if (confirm('确定清空本地崩溃日志？')) { clearCrashLogs(); refreshCrashLogs(); } }} className="px-3 py-2 rounded-lg bg-red-900 hover:bg-red-800 text-red-100 text-xs flex items-center gap-1"><Trash2 size={12} />清空日志</button>
                </div>
              </div>
              {crashLogs.length === 0 ? (
                <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6 text-center text-zinc-500 text-sm">当前没有记录到崩溃日志。</div>
              ) : (
                <div className="space-y-3">
                  {crashLogs.slice().reverse().map((log) => (
                    <div key={log.id} className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap"><span className={`px-2 py-1 rounded text-[11px] ${log.type === 'react' ? 'bg-fuchsia-950/60 text-fuchsia-300 border border-fuchsia-900/40' : log.type === 'promise' ? 'bg-purple-950/60 text-purple-300 border border-purple-900/40' : log.type === 'error' ? 'bg-red-950/60 text-red-300 border border-red-900/40' : 'bg-zinc-800 text-zinc-300 border border-zinc-700'}`}>{log.type}</span><span className="text-sm text-white font-medium">{log.message}</span></div>
                        <span className="text-[11px] text-zinc-500">{new Date(log.time).toLocaleString('zh-CN')}</span>
                      </div>
                      <div className="grid md:grid-cols-2 gap-3 text-xs">
                        <div className="rounded-lg bg-zinc-950/60 border border-zinc-800 p-3 space-y-1"><div><span className="text-zinc-500">来源：</span><span className="text-zinc-200">{log.source || '未知'}</span></div><div><span className="text-zinc-500">页面：</span><span className="text-zinc-200 break-all">{log.url}</span></div></div>
                        <div className="rounded-lg bg-zinc-950/60 border border-zinc-800 p-3 space-y-1"><div className="text-zinc-500">用户代理</div><div className="text-zinc-300 break-all">{log.userAgent}</div></div>
                      </div>
                      {log.stack && <div className="rounded-lg bg-black/40 border border-zinc-800 p-3"><div className="text-xs text-zinc-500 mb-2">堆栈</div><pre className="text-[11px] text-red-200 whitespace-pre-wrap break-words max-h-60 overflow-y-auto">{log.stack}</pre></div>}
                      {typeof log.detail !== 'undefined' && <details className="rounded-lg bg-black/30 border border-zinc-800 p-3"><summary className="cursor-pointer text-xs text-zinc-400">查看详细数据</summary><pre className="mt-2 text-[11px] text-zinc-300 whitespace-pre-wrap break-words max-h-60 overflow-y-auto">{JSON.stringify(log.detail, null, 2)}</pre></details>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {portraitNpcId && currentPortraitNpc && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPortraitNpcId(null)}>
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-zinc-950 border border-fuchsia-900/40 rounded-2xl p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-white text-lg font-bold flex items-center gap-2"><ImageIcon size={18} className="text-fuchsia-400" />{currentPortraitNpc.name} · 画像档案</div>
                <div className="text-xs text-zinc-500">后台与前端统一使用同一套人物画像信息</div>
              </div>
              <button onClick={() => setPortraitNpcId(null)} className="p-2 rounded hover:bg-zinc-800 text-zinc-400"><X size={18} /></button>
            </div>
            <div className="grid md:grid-cols-[320px_1fr] gap-4">
              <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
                <div className="aspect-[3/4] bg-zinc-950 flex items-center justify-center">{portraitMap[currentPortraitNpc.id]?.imageUrl ? <img src={portraitMap[currentPortraitNpc.id].imageUrl} alt={currentPortraitNpc.name} className="w-full h-full object-contain" /> : <div className="text-center text-zinc-500 space-y-2 px-4"><ImageIcon className="mx-auto" size={34} /><p className="text-sm">暂无人物画像</p></div>}</div>
                <div className="p-3 border-t border-zinc-800 text-[11px] text-zinc-500 space-y-1"><div>来源：{portraitMap[currentPortraitNpc.id] ? (portraitMap[currentPortraitNpc.id].source === 'ai' ? 'AI生成' : '手动导入') : '无'}</div><div>更新时间：{portraitMap[currentPortraitNpc.id] ? new Date(portraitMap[currentPortraitNpc.id].updatedAt).toLocaleString() : '--'}</div></div>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3"><div className="text-zinc-500">姓名</div><div className="text-white mt-1">{currentPortraitNpc.name}</div></div>
                  <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3"><div className="text-zinc-500">性别</div><div className="text-white mt-1">{genderLabel(currentPortraitNpc.gender)}</div></div>
                  <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3"><div className="text-zinc-500">年龄</div><div className="text-white mt-1">{currentPortraitNpc.age}岁</div></div>
                  <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3"><div className="text-zinc-500">身份</div><div className="text-white mt-1">{currentPortraitNpc.occupation}</div></div>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3"><div className="text-sm font-semibold text-white mb-2 flex items-center gap-2"><Palette size={14} />样貌信息</div><textarea value={currentPortraitNpc.appearance || ''} onChange={(e) => onUpdate('UPDATE_NPC', { id: currentPortraitNpc.id, updates: { appearance: e.target.value } })} className="w-full h-28 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm text-white resize-none" /></div>
                  <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3"><div className="text-sm font-semibold text-white mb-2 flex items-center gap-2"><Shirt size={14} />服装与饰物</div><textarea value={asItemNames(currentPortraitNpc.equipment?.clothing) === '无' ? '' : asItemNames(currentPortraitNpc.equipment?.clothing)} onChange={(e) => onUpdate('UPDATE_NPC', { id: currentPortraitNpc.id, updates: { equipment: { ...currentPortraitNpc.equipment, clothing: makeItemsFromText('cloth', currentPortraitNpc.id, e.target.value, 'clothing') } } })} className="w-full h-28 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm text-white resize-none" /></div>
                </div>
                <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3"><div className="text-sm font-semibold text-white mb-2">画像生成备注 / 补充提示</div><textarea value={portraitNoteDraft} onChange={(e) => setPortraitNoteDraft(e.target.value)} className="w-full h-32 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm text-white resize-none" placeholder="尽量写清性别、发型、脸型、肤色、身形、服装、饰物、神态、气质。" /><div className="flex flex-wrap gap-2 mt-3"><button onClick={() => updatePortraitForNpc(currentPortraitNpc.id, { imageUrl: portraitMap[currentPortraitNpc.id]?.imageUrl || '', source: portraitMap[currentPortraitNpc.id]?.source || 'manual', note: portraitNoteDraft, prompt: portraitMap[currentPortraitNpc.id]?.prompt, npcName: currentPortraitNpc.name })} className="px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs flex items-center gap-1"><Save size={12} />保存画像备注</button><button onClick={() => fileInputRef.current?.click()} className="px-3 py-2 rounded bg-fuchsia-800 hover:bg-fuchsia-700 text-fuchsia-100 text-xs flex items-center gap-1"><Upload size={12} />导入画像</button><button onClick={() => { syncNpcPortraitsFromStorage(); alert('已尝试从前端同步最新 AI 画像。'); }} className="px-3 py-2 rounded bg-pink-800 hover:bg-pink-700 text-pink-100 text-xs flex items-center gap-1"><Wand2 size={12} />同步AI画像</button>{portraitMap[currentPortraitNpc.id] && <button onClick={() => { if (confirm(`确定删除 ${currentPortraitNpc.name} 的画像信息？`)) { removePortraitForNpc(currentPortraitNpc.id); setPortraitNoteDraft(''); } }} className="px-3 py-2 rounded bg-red-900 hover:bg-red-800 text-red-100 text-xs flex items-center gap-1"><Trash2 size={12} />删除画像</button>}</div></div>
                {portraitMap[currentPortraitNpc.id]?.prompt && <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3"><div className="text-sm font-semibold text-white mb-2">最近一次生图提示词</div><div className="text-xs text-zinc-400 whitespace-pre-wrap max-h-44 overflow-y-auto leading-relaxed">{portraitMap[currentPortraitNpc.id]?.prompt}</div></div>}
              </div>
            </div>
          </div>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; handleNpcPortraitFile(file, currentPortraitNpc || null); e.currentTarget.value = ''; }} />
      <input ref={playerFileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; handlePlayerPortraitFile(file); e.currentTarget.value = ''; }} />
    </div>
  );
};
