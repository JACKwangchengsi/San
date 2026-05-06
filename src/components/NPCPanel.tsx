import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NPC, Item, RomanceStage } from '../types/game';
import { useGame } from '../context/GameContext';
import SFX from '../utils/sfx';
import {
  AlertTriangle,
  ArrowRightLeft,
  Brain,
  Eye,
  Gift,
  Heart,
  Image as ImageIcon,
  MessageSquare,
  Package,
  Shield,
  Skull,
  Sparkles,
  Swords,
  Upload,
  User,
  UserPlus,
  X,
  ChevronDown,
  ChevronRight,
  Wand2,
  Trash2,
  Save,
  Compass,
  ScrollText,
  Flag,
  Zap,
} from 'lucide-react';
import { buildNPCPortraitProfile, buildNPCVisualSummary } from '../systems/NPCPortraitProfile';
import { loadNPCPortraitMap, loadPlayerPortrait, removeNPCPortrait, saveNPCPortraitMap, updateNPCPortrait, type NPCPortraitInfo, type PlayerPortraitInfo } from '../utils/portraitStorage';

interface NPCPanelProps {
  npcs: NPC[];
  currentLocation: string;
  onTalk?: (npcId: string) => void;
  onGeneratePortrait?: (npc: NPC) => void;
  focusNPCId?: string | null;
  onFocusHandled?: () => void;
}

const PLAYER_PORTRAIT_KEY = 'jianghu_player_portrait';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'alive': return 'bg-green-600';
    case 'dead': return 'bg-red-600';
    case 'poisoned': return 'bg-yellow-600';
    case 'injured': return 'bg-orange-600';
    case 'hostile': return 'bg-red-700';
    default: return 'bg-zinc-600';
  }
};

const getStatusLabel = (status: string) => ({ alive: '安好', dead: '身亡', poisoned: '中毒', injured: '负伤', hostile: '敌意', unconscious: '昏迷', missing: '失踪', unknown: '未知' } as Record<string, string>)[status] || status;
const getAttitudeLabel = (attitude: string) => ({ hostile: '敌对', unfriendly: '不友好', neutral: '中立', friendly: '友好', allied: '同伴' } as Record<string, string>)[attitude] || attitude;
const getAttitudeColor = (attitude: string) => attitude === 'hostile' ? 'text-red-400 bg-red-900/30' : attitude === 'unfriendly' ? 'text-orange-400 bg-orange-900/30' : attitude === 'friendly' ? 'text-green-400 bg-green-900/30' : attitude === 'allied' ? 'text-blue-400 bg-blue-900/30' : 'text-zinc-400 bg-zinc-800';
const getRelationLabel = (relation: number) => relation >= 80 ? '知己' : relation >= 50 ? '好友' : relation >= 20 ? '友善' : relation >= 0 ? '普通' : relation >= -30 ? '疏离' : relation >= -60 ? '厌恶' : '仇视';
const stageLabel = (stage?: RomanceStage) => ({ none: '无', interested: '心动', close: '亲近', ambiguous: '暧昧', lover: '恋人', engaged: '婚约', married: '夫妻', broken: '决裂' } as Record<string, string>)[stage || 'none'] || '无';
const preferenceLabel = (pref?: string) => ({ male: '偏好男性', female: '偏好女性', both: '男女皆可', none: '暂无情爱意向' } as Record<string, string>)[pref || ''] || '未明';
const formatEquipValue = (value: unknown): string => {
  if (!value) return '无';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map((v) => (typeof v === 'string' ? v : (v as Item)?.name || '')).filter(Boolean).join('、') || '无';
  if (typeof value === 'object') return (value as Item).name || '无';
  return String(value);
};

export const NPCPanel: React.FC<NPCPanelProps> = ({ npcs, currentLocation, onTalk, onGeneratePortrait, focusNPCId, onFocusHandled }) => {
  const { state, dispatch, addLog, talkToNPC, assignNPCTask, deepenRelationship } = useGame();
  const soundEnabled = state.settings.soundEnabled;
  const [expandedNPC, setExpandedNPC] = useState<string | null>(null);
  const [showItemsModal, setShowItemsModal] = useState<string | null>(null);
  const [showTradeModal, setShowTradeModal] = useState<string | null>(null);
  const [showGiftModal, setShowGiftModal] = useState<string | null>(null);
  const [showPortraitModal, setShowPortraitModal] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [portraitMap, setPortraitMap] = useState<Record<string, NPCPortraitInfo>>(() => loadNPCPortraitMap());
  const [playerPortrait, setPlayerPortrait] = useState<PlayerPortraitInfo | null>(() => loadPlayerPortrait());
  const [portraitNoteDraft, setPortraitNoteDraft] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const syncPortraits = () => {
      setPortraitMap(loadNPCPortraitMap());
      setPlayerPortrait(loadPlayerPortrait());
    };
    syncPortraits();
    window.addEventListener('storage', syncPortraits);
    const timer = window.setInterval(syncPortraits, 1200);
    return () => {
      window.removeEventListener('storage', syncPortraits);
      window.clearInterval(timer);
    };
  }, []);
  useEffect(() => { if (!showPortraitModal) return; const current = portraitMap[showPortraitModal]; setPortraitNoteDraft(current?.note || ''); }, [showPortraitModal, portraitMap]);
  useEffect(() => {
    if (!focusNPCId) return;
    const npc = npcs.find(n => n.id === focusNPCId);
    if (!npc) return;
    setExpandedNPC(npc.id);
    onFocusHandled?.();
  }, [focusNPCId, npcs, onFocusHandled]);

  const nearbyNPCs = useMemo(() => npcs.filter((n) => n.location === currentLocation && n.status !== 'dead'), [npcs, currentLocation]);
  const otherNPCs = useMemo(() => npcs.filter((n) => n.location !== currentLocation && n.status !== 'dead'), [npcs, currentLocation]);
  const deadNPCs = useMemo(() => npcs.filter((n) => n.status === 'dead'), [npcs]);

  const showFeedback = (msg: string) => { setActionFeedback(msg); setTimeout(() => setActionFeedback(null), 2500); };
  const getNPC = (id: string) => npcs.find((n) => n.id === id);

  const updatePortraitForNpc = (npcId: string, updates: Partial<NPCPortraitInfo>) => {
    const updated = updateNPCPortrait(npcId, updates);
    setPortraitMap(loadNPCPortraitMap());
    return updated;
  };

  const requestItem = (npc: NPC, item: Item) => {
    if (npc.relation < 40) { addLog(`${npc.name}轻轻摇头：“你我交情还不够深，这东西我不能给。”`, 'dialogue', 3); return showFeedback(`好感不足(${npc.relation}/40)`); }
    const chance = Math.min(0.9, (npc.relation - 20) / 100 + 0.3);
    if (Math.random() < chance) {
      dispatch({ type: 'ADD_ITEM', payload: { ...item, id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`, quantity: 1 } });
      dispatch({ type: 'UPDATE_NPC', payload: { id: npc.id, updates: { inventory: npc.inventory.map((i) => i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i).filter((i) => i.quantity > 0), relation: npc.relation - 5 } } });
      addLog(`${npc.name}犹豫了一下，还是把${item.name}递给了你。`, 'dialogue', 3);
      showFeedback(`✅ 获得 ${item.name}`);
    } else {
      dispatch({ type: 'UPDATE_NPC', payload: { id: npc.id, updates: { relation: Math.max(-100, npc.relation - 3) } } });
      addLog(`${npc.name}神色微凝：“这东西我也有用。”`, 'dialogue', 3);
      showFeedback('❌ 对方拒绝了');
    }
  };

  const giveItem = (npc: NPC, item: Item) => {
    if (soundEnabled) SFX.giveItem();
    dispatch({ type: 'REMOVE_ITEM', payload: item.id });
    dispatch({ type: 'UPDATE_NPC', payload: { id: npc.id, updates: { inventory: [...npc.inventory, { ...item, id: `npc_item_${Date.now()}`, quantity: 1 }], trust: Math.min(100, npc.trust + (item.type === 'medicine' ? 10 : item.type === 'food' ? 6 : 4)) } } });
    deepenRelationship(npc.id, 'gift');
    addLog(`你把${item.name}递给了${npc.name}。对方眼神微微一动。`, 'dialogue', 3);
    showFeedback(`🎁 赠送 ${item.name}`);
    setShowGiftModal(null);
  };

  const tradeItem = (npc: NPC, myItem: Item, theirItem: Item) => {
    if (soundEnabled) SFX.buyItem();
    dispatch({ type: 'REMOVE_ITEM', payload: myItem.id });
    dispatch({ type: 'ADD_ITEM', payload: { ...theirItem, id: `item_${Date.now()}`, quantity: 1 } });
    dispatch({ type: 'UPDATE_NPC', payload: { id: npc.id, updates: { inventory: [...npc.inventory.map((i) => i.id === theirItem.id ? { ...i, quantity: i.quantity - 1 } : i).filter((i) => i.quantity > 0), { ...myItem, id: `npc_item_${Date.now()}`, quantity: 1 }] } } });
    addLog(`你与${npc.name}以${myItem.name}换取了${theirItem.name}。`, 'dialogue', 3);
    showFeedback(`🔄 交易成功`);
    setShowTradeModal(null);
  };

  const threatenNPC = (npc: NPC) => {
    if (soundEnabled) SFX.threaten();
    if (npc.inventory.length === 0) return showFeedback('对方没有可夺之物');
    if (npc.personality.aggression > 60 && Math.random() < 0.4) {
      dispatch({ type: 'UPDATE_PLAYER_STAT', payload: { stat: 'health', value: -5 } });
      dispatch({ type: 'UPDATE_NPC', payload: { id: npc.id, updates: { relation: npc.relation - 40, attitude: 'hostile', mood: '愤怒' } } });
      addLog(`${npc.name}被你逼急，反手便推得你后退半步。`, 'combat', 4);
      return showFeedback('⚠️ 威胁失败');
    }
    const randomItem = npc.inventory[0];
    dispatch({ type: 'ADD_ITEM', payload: { ...randomItem, id: `loot_${Date.now()}`, quantity: 1 } });
    dispatch({ type: 'UPDATE_NPC', payload: { id: npc.id, updates: { inventory: npc.inventory.slice(1), relation: npc.relation - 30, trust: Math.max(0, npc.trust - 25), attitude: npc.relation - 30 < -30 ? 'hostile' : 'unfriendly', mood: '惶恐' } } });
    addLog(`${npc.name}脸色发白，只能把${randomItem.name}递了出来。`, 'dialogue', 4);
    showFeedback(`⚔️ 威胁成功，获得 ${randomItem.name}`);
  };

  const recruitNPC = (npc: NPC) => {
    if (soundEnabled) SFX.recruit();
    if (npc.relation < 60) return showFeedback(`招募需好感60，当前${npc.relation}`);
    if (npc.isRecruited) return showFeedback('已经是同行之人');
    dispatch({ type: 'UPDATE_NPC', payload: { id: npc.id, updates: { isRecruited: true, attitude: 'allied', currentAction: '随行' } } });
    addLog(`${npc.name}沉吟片刻，最终点头：“好，我与你同路。”`, 'dialogue', 5);
    showFeedback(`🤝 ${npc.name}加入了队伍`);
  };

  const romanceButtons = (npc: NPC) => (
    <div className="grid grid-cols-3 gap-1.5">
      <button onClick={(e) => { e.stopPropagation(); deepenRelationship(npc.id, 'care'); }} className="py-1.5 bg-pink-900/40 hover:bg-pink-800/60 text-pink-200 rounded text-[11px]">照拂</button>
      <button onClick={(e) => { e.stopPropagation(); deepenRelationship(npc.id, 'comfort'); }} className="py-1.5 bg-fuchsia-900/40 hover:bg-fuchsia-800/60 text-fuchsia-200 rounded text-[11px]">安慰</button>
      <button onClick={(e) => { e.stopPropagation(); deepenRelationship(npc.id, 'flirt'); }} className="py-1.5 bg-rose-900/40 hover:bg-rose-800/60 text-rose-200 rounded text-[11px]">试探</button>
      <button onClick={(e) => { e.stopPropagation(); deepenRelationship(npc.id, 'protect'); }} className="py-1.5 bg-red-900/40 hover:bg-red-800/60 text-red-200 rounded text-[11px]">护住</button>
      <button onClick={(e) => { e.stopPropagation(); deepenRelationship(npc.id, 'gift'); setShowGiftModal(npc.id); }} className="py-1.5 bg-purple-900/40 hover:bg-purple-800/60 text-purple-200 rounded text-[11px]">送礼</button>
      <button onClick={(e) => { e.stopPropagation(); deepenRelationship(npc.id, 'confess'); onTalk?.(npc.id); }} className="py-1.5 bg-yellow-900/40 hover:bg-yellow-800/60 text-yellow-200 rounded text-[11px]">表露心意</button>
    </div>
  );

  const renderNPCCard = (npc: NPC, isNearby = false) => {
    const isExpanded = expandedNPC === npc.id;
    const romance = npc.romance;
    const portrait = portraitMap[npc.id];
    return (
      <div key={npc.id} className={`rounded-lg overflow-hidden ${isNearby ? 'bg-zinc-800/70 border border-zinc-700' : 'bg-zinc-800/30'} ${focusNPCId === npc.id ? 'ring-2 ring-amber-500' : ''}`}>
        <div className="p-3 flex items-center gap-3 cursor-pointer hover:bg-zinc-700/30 transition" onClick={() => setExpandedNPC(isExpanded ? null : npc.id)}>
          <div className="relative shrink-0">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium overflow-hidden ${getStatusColor(npc.status)}`}>
              {portrait?.imageUrl ? <img src={portrait.imageUrl} alt={npc.name} className="w-full h-full object-cover" /> : npc.status === 'dead' ? <Skull size={18} /> : npc.name[0]}
            </div>
            {npc.isRecruited && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center"><span className="text-[8px]">✓</span></div>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-white truncate">{npc.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-200">{npc.gender === 'female' ? '♀' : npc.gender === 'male' ? '♂' : '•'}</span>
              {npc.status !== 'alive' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300">{getStatusLabel(npc.status)}</span>}
              {npc.faction && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-900/30 text-purple-300">{npc.faction}</span>}
              {romance && romance.stage !== 'none' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-900/40 text-pink-300 flex items-center gap-1"><Heart size={10} />{stageLabel(romance.stage)}</span>}
              {portrait?.imageUrl && <span className="text-[10px] px-1.5 py-0.5 rounded bg-fuchsia-900/30 text-fuchsia-300 flex items-center gap-1"><ImageIcon size={10} />画像</span>}
            </div>
            <div className="text-xs text-zinc-500 truncate">{npc.age}岁 · {npc.occupation}</div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1"><Heart size={10} className={npc.relation > 0 ? 'text-red-400' : 'text-zinc-500'} /><span className={`text-xs ${npc.relation > 50 ? 'text-green-400' : npc.relation > 0 ? 'text-zinc-300' : npc.relation > -50 ? 'text-orange-400' : 'text-red-400'}`}>{npc.relation}</span></div>
            {isExpanded ? <ChevronDown size={12} className="text-zinc-500" /> : <ChevronRight size={12} className="text-zinc-500" />}
          </div>
        </div>
        {isExpanded && (
          <div className="px-3 pb-3 space-y-3 border-t border-zinc-700/50">
            {portrait?.imageUrl && (
              <div className="mt-3 rounded-lg overflow-hidden border border-zinc-700 bg-zinc-950">
                <div className="h-36 bg-zinc-900 flex items-center justify-center">
                  <img src={portrait.imageUrl} alt={`${npc.name}画像`} className="w-full h-full object-contain" />
                </div>
                <div className="px-2 py-1.5 text-[10px] text-zinc-500 flex items-center justify-between">
                  <span>{portrait.source === 'ai' ? 'AI生成画像' : '手动导入画像'}</span>
                  <button onClick={(e) => { e.stopPropagation(); setShowPortraitModal(npc.id); }} className="text-fuchsia-400 hover:text-fuchsia-300">查看 / 编辑</button>
                </div>
              </div>
            )}

            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{npc.description}</p>
            {npc.appearance && <div className="text-[11px] text-zinc-400 bg-zinc-900/60 rounded p-2">容貌描写：{npc.appearance}</div>}
            <div className="flex flex-wrap gap-1">{npc.personalityTags.map((tag, i) => <span key={i} className="text-[10px] px-1.5 py-0.5 bg-zinc-700 text-zinc-300 rounded">{tag}</span>)}</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1"><Shield size={10} className="text-zinc-500" /><span className="text-zinc-500">态度:</span><span className={`px-1 py-0.5 rounded text-[10px] ${getAttitudeColor(npc.attitude)}`}>{getAttitudeLabel(npc.attitude)}</span></div>
              <div className="flex items-center gap-1"><Heart size={10} className="text-zinc-500" /><span className="text-zinc-500">关系:</span><span className="text-zinc-300">{getRelationLabel(npc.relation)}</span></div>
              <div className="flex items-center gap-1"><Brain size={10} className="text-zinc-500" /><span className="text-zinc-500">信任:</span><span className="text-zinc-300">{npc.trust}</span></div>
              <div className="flex items-center gap-1"><Swords size={10} className="text-zinc-500" /><span className="text-zinc-500">战力:</span><span className="text-zinc-300">{npc.stats.combat}</span></div>
            </div>

            <div className="grid grid-cols-1 gap-2 text-[11px]">
              {npc.equipment?.weapon && <div className="rounded bg-zinc-900/70 border border-zinc-800 p-2 flex items-center gap-2"><Swords size={12} className="text-red-400" /><span className="text-zinc-500">兵器：</span><span className="text-zinc-300">{formatEquipValue(npc.equipment.weapon)}</span></div>}
              {npc.equipment?.clothing && <div className="rounded bg-zinc-900/70 border border-zinc-800 p-2 flex items-center gap-2"><User size={12} className="text-blue-400" /><span className="text-zinc-500">服饰：</span><span className="text-zinc-300">{formatEquipValue(npc.equipment.clothing)}</span></div>}
              {npc.equipment?.accessory && <div className="rounded bg-zinc-900/70 border border-zinc-800 p-2 flex items-center gap-2"><Sparkles size={12} className="text-yellow-400" /><span className="text-zinc-500">饰物：</span><span className="text-zinc-300">{formatEquipValue(npc.equipment.accessory)}</span></div>}
            </div>

            {npc.goals?.length > 0 && <div className="rounded border border-zinc-800 bg-zinc-950/40 p-2"><div className="text-[11px] text-zinc-500 mb-1 flex items-center gap-1"><Flag size={11} /> 当前目标</div><div className="text-[12px] text-zinc-300">{npc.goals.join('、')}</div></div>}
            {npc.aiPersona && <div className="rounded border border-zinc-800 bg-zinc-950/40 p-2"><div className="text-[11px] text-zinc-500 mb-1 flex items-center gap-1"><ScrollText size={11} /> 人设口吻</div><div className="text-[12px] text-zinc-300 leading-relaxed">{npc.aiPersona}</div></div>}

            {romance && (
              <div className="rounded-lg border border-pink-900/40 bg-pink-950/20 p-2 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-pink-300"><Sparkles size={12} /> 情感状态</div>
                  <div className="text-[10px] text-pink-200">阶段：{stageLabel(romance.stage)}</div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10px] text-zinc-300">
                  <div>好感 {romance.affinity}</div>
                  <div>吸引 {romance.attraction}</div>
                  <div>亲密 {romance.intimacy}</div>
                  <div>信任 {romance.trust}</div>
                  <div>承诺 {romance.commitment}</div>
                  <div>占有 {romance.jealousy}</div>
                </div>
                <div className="text-[10px] text-pink-200/80">情感取向：{preferenceLabel(npc.romancePreference)}</div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-500" style={{ width: `${Math.min(100, (romance.affinity + romance.trust + romance.intimacy) / 3)}%` }} /></div>
                {romanceButtons(npc)}
              </div>
            )}

            {npc.inventory.length > 0 && (
              <div>
                <div className="flex items-center gap-1 text-[10px] text-zinc-500 mb-1"><Package size={10} /><span>携带物品 ({npc.inventory.length})</span></div>
                <div className="flex flex-wrap gap-1">{npc.inventory.slice(0, 5).map((item) => <span key={item.id} className="text-[10px] px-1.5 py-0.5 bg-zinc-900 text-zinc-400 rounded border border-zinc-700">{item.name}{item.quantity > 1 ? ` x${item.quantity}` : ''}</span>)}{npc.inventory.length > 5 && <span className="text-[10px] text-zinc-500">+{npc.inventory.length - 5}更多</span>}</div>
              </div>
            )}

            {isNearby && npc.status !== 'dead' && (
              <div className="space-y-2 pt-2">
                <button onClick={(e) => { e.stopPropagation(); onTalk?.(npc.id); }} className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg text-sm font-medium transition shadow-lg"><MessageSquare size={14} /> 🤖 AI深度对话</button>
                <div className="flex gap-1 overflow-x-auto pb-1">{['你好', '最近如何？', '外面有什么风声？', '你在担心什么？', '愿不愿意与我同行？'].map((preset) => <button key={preset} onClick={(e) => { e.stopPropagation(); talkToNPC(npc.id, preset); if (/担心|同行/.test(preset)) deepenRelationship(npc.id, 'care'); }} className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 rounded text-[10px] whitespace-nowrap transition border border-zinc-700">{preset}</button>)}</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button onClick={(e) => { e.stopPropagation(); setShowItemsModal(npc.id); }} className="py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg text-xs transition flex items-center justify-center gap-1"><Eye size={12} /> 查看物品</button>
                  <button onClick={(e) => { e.stopPropagation(); setShowTradeModal(npc.id); }} className="py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-xs transition flex items-center justify-center gap-1"><ArrowRightLeft size={12} /> 交易</button>
                  <button onClick={(e) => { e.stopPropagation(); setShowGiftModal(npc.id); }} className="py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg text-xs transition flex items-center justify-center gap-1"><Gift size={12} /> 赠送</button>
                  <button onClick={(e) => { e.stopPropagation(); threatenNPC(npc); }} className="py-2 bg-red-800 hover:bg-red-700 text-red-200 rounded-lg text-xs transition flex items-center justify-center gap-1"><AlertTriangle size={12} /> 威胁</button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button onClick={(e) => { e.stopPropagation(); setShowPortraitModal(npc.id); }} className="py-2 bg-fuchsia-800 hover:bg-fuchsia-700 text-fuchsia-100 rounded-lg text-xs transition flex items-center justify-center gap-1"><ImageIcon size={12} /> 画像信息</button>
                  <button onClick={(e) => { e.stopPropagation(); onGeneratePortrait?.(npc); showFeedback(`已为 ${npc.name} 发起画像生成请求`); }} className="py-2 bg-pink-800 hover:bg-pink-700 text-pink-100 rounded-lg text-xs transition flex items-center justify-center gap-1"><Wand2 size={12} /> AI生成画像</button>
                </div>
                {!npc.isRecruited && <button onClick={(e) => { e.stopPropagation(); recruitNPC(npc); }} className={`w-full py-2 rounded-lg text-xs transition flex items-center justify-center gap-1 ${npc.relation >= 60 ? 'bg-yellow-600 hover:bg-yellow-500 text-white' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`} disabled={npc.relation < 60}><UserPlus size={12} /> {npc.relation >= 60 ? '邀请同行' : `邀请同行(需好感60)`}</button>}
                {npc.isRecruited && (
                  <div className="space-y-1">
                    <div className="text-[10px] text-blue-400 bg-blue-900/30 px-2 py-1.5 rounded text-center">✓ 已加入队伍</div>
                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                      {['警戒', '搜寻', '治疗', '加固', '侦查', '休息'].map((task) => <button key={task} onClick={(e) => { e.stopPropagation(); assignNPCTask(npc.id, task); }} className="py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded transition">{task}</button>)}
                    </div>
                  </div>
                )}
              </div>
            )}
            {!isNearby && (
              <div className="text-[11px] text-zinc-500 rounded bg-zinc-900/40 border border-zinc-800 p-2 flex items-center gap-2"><Compass size={12} /> 当前位于：{npc.location}</div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderItemsModal = () => {
    if (!showItemsModal) return null;
    const npc = getNPC(showItemsModal);
    if (!npc) return null;
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4" onClick={() => setShowItemsModal(null)}>
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-md p-4 shadow-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-medium text-white flex items-center gap-2"><Package size={18} /> {npc.name}的物品</h3><button onClick={() => setShowItemsModal(null)} className="p-1 hover:bg-zinc-700 rounded"><X size={18} className="text-zinc-400" /></button></div>
          {npc.inventory.length === 0 ? <p className="text-sm text-zinc-500 text-center py-8">没有任何物品</p> : <div className="space-y-2">{npc.inventory.map((item) => <div key={item.id} className="bg-zinc-800 rounded-lg p-3 flex items-center justify-between"><div className="flex-1"><div className="text-sm text-white font-medium">{item.name}{item.quantity > 1 ? ` x${item.quantity}` : ''}</div><div className="text-xs text-zinc-500">{item.description || item.type}</div></div><button onClick={() => requestItem(npc, item)} className={`px-3 py-1.5 rounded text-xs transition ${npc.relation >= 40 ? 'bg-green-700 hover:bg-green-600 text-white' : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'}`} disabled={npc.relation < 40}>请求</button></div>)}</div>}
        </div>
      </div>
    );
  };

  const renderTradeModal = () => {
    if (!showTradeModal) return null;
    const npc = getNPC(showTradeModal);
    if (!npc) return null;
    const myItems = state.player.inventory.filter((i) => i.type !== 'document');
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4" onClick={() => setShowTradeModal(null)}>
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg p-4 shadow-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-medium text-white flex items-center gap-2"><ArrowRightLeft size={18} /> 与{npc.name}交易</h3><button onClick={() => setShowTradeModal(null)} className="p-1 hover:bg-zinc-700 rounded"><X size={18} className="text-zinc-400" /></button></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <h4 className="text-xs font-bold text-zinc-400 mb-2 uppercase">你的物品</h4>
              <div className="space-y-1 max-h-60 overflow-y-auto">{myItems.map((myItem) => <div key={myItem.id} className="bg-zinc-800 rounded p-2"><div className="text-xs text-white mb-1">{myItem.name}</div><div className="flex flex-wrap gap-1">{npc.inventory.map((theirItem) => <button key={theirItem.id} onClick={() => tradeItem(npc, myItem, theirItem)} className="text-[10px] px-1.5 py-0.5 bg-blue-800 hover:bg-blue-700 text-blue-200 rounded transition">↔ {theirItem.name}</button>)}</div></div>)}</div>
            </div>
            <div>
              <h4 className="text-xs font-bold text-zinc-400 mb-2 uppercase">{npc.name}的物品</h4>
              <div className="space-y-1 max-h-60 overflow-y-auto">{npc.inventory.map((item) => <div key={item.id} className="bg-zinc-800 rounded p-2"><div className="text-xs text-white">{item.name}{item.quantity > 1 ? ` x${item.quantity}` : ''}</div><div className="text-[10px] text-zinc-500">{item.description || item.type}</div></div>)}</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderGiftModal = () => {
    if (!showGiftModal) return null;
    const npc = getNPC(showGiftModal);
    if (!npc) return null;
    const giftableItems = state.player.inventory.filter((i) => i.type !== 'document');
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4" onClick={() => setShowGiftModal(null)}>
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-md p-4 shadow-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-medium text-white flex items-center gap-2"><Gift size={18} /> 赠礼给{npc.name}</h3><button onClick={() => setShowGiftModal(null)} className="p-1 hover:bg-zinc-700 rounded"><X size={18} className="text-zinc-400" /></button></div>
          {giftableItems.length === 0 ? <p className="text-sm text-zinc-500 text-center py-4">你没有可赠送的物品</p> : <div className="space-y-2">{giftableItems.map((item) => <div key={item.id} className="bg-zinc-800 rounded-lg p-3 flex items-center justify-between"><div className="flex-1"><div className="text-sm text-white font-medium">{item.name}</div><div className="text-xs text-zinc-500">赠送后会提升好感与情感联结</div></div><button onClick={() => giveItem(npc, item)} className="px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white rounded text-xs transition">赠送</button></div>)}</div>}
        </div>
      </div>
    );
  };

  const renderPortraitModal = () => {
    if (!showPortraitModal) return null;
    const npc = getNPC(showPortraitModal);
    if (!npc) return null;
    const portrait = portraitMap[npc.id];
    return (
      <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 backdrop-blur-sm p-4" onClick={() => setShowPortraitModal(null)}>
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-2xl p-4 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-medium text-white flex items-center gap-2"><ImageIcon size={18} /> {npc.name} · 人物画像</h3><button onClick={() => setShowPortraitModal(null)} className="p-1 hover:bg-zinc-700 rounded"><X size={18} className="text-zinc-400" /></button></div>
          <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4">
            <div className="rounded-lg border border-zinc-700 bg-zinc-950 overflow-hidden">
              <div className="h-[420px] flex items-center justify-center bg-zinc-950">{portrait?.imageUrl ? <img src={portrait.imageUrl} alt={`${npc.name}画像`} className="w-full h-full object-contain" /> : <div className="text-center text-zinc-500 space-y-2"><ImageIcon className="mx-auto" size={36} /><p className="text-sm">尚无画像</p></div>}</div>
              <div className="px-3 py-2 border-t border-zinc-800 text-[11px] text-zinc-500 space-y-1"><div>来源：{portrait ? (portrait.source === 'ai' ? '文生图自动生成' : '手动导入') : '无'}</div><div>更新：{portrait ? new Date(portrait.updatedAt).toLocaleString() : '--'}</div></div>
            </div>
            <div className="space-y-4">
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 text-sm text-zinc-300 space-y-2">
                <div><span className="text-zinc-500">身份：</span>{npc.age}岁 · {npc.occupation}</div>
                <div><span className="text-zinc-500">外貌：</span>{npc.appearance || '暂无详细外貌记录'}</div>
                <div><span className="text-zinc-500">性格：</span>{npc.personalityTags.join('、') || '暂无'}</div>
                <div><span className="text-zinc-500">描述：</span>{npc.description}</div>
                <div className="rounded-md border border-fuchsia-900/30 bg-fuchsia-950/15 p-2"><div className="text-[11px] text-fuchsia-300 mb-1">系统自动外貌模板</div><div className="text-[12px] text-zinc-300 leading-relaxed">{buildNPCPortraitProfile(npc)}</div><button onClick={() => setPortraitNoteDraft((prev) => prev?.trim() ? `${buildNPCVisualSummary(npc)}，${prev}` : buildNPCVisualSummary(npc))} className="mt-2 px-2 py-1 rounded bg-fuchsia-900/40 hover:bg-fuchsia-800/60 text-fuchsia-100 text-[11px]">一键填入画像备注</button></div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 space-y-2">
                <div className="text-xs text-zinc-400">画像备注（可手动编辑保存）</div>
                <textarea value={portraitNoteDraft} onChange={(e) => setPortraitNoteDraft(e.target.value)} className="w-full h-28 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm text-white resize-none" placeholder="例如：女，黑衣束发，眉眼清冷，身形纤细，肩披薄斗篷，腰悬短剑，唇色淡，目光警觉……尽量写清性别、发型、脸型、身形、服饰、气质。" />
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => { updatePortraitForNpc(npc.id, { imageUrl: portrait?.imageUrl || '', source: portrait?.source || 'manual', note: portraitNoteDraft, npcName: npc.name }); showFeedback(`已保存 ${npc.name} 的画像备注`); }} className="px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs flex items-center gap-1"><Save size={12} /> 保存备注</button>
                  <button onClick={() => fileInputRef.current?.click()} className="px-3 py-2 rounded bg-fuchsia-800 hover:bg-fuchsia-700 text-fuchsia-100 text-xs flex items-center gap-1"><Upload size={12} /> 手动导入画像</button>
                  <button onClick={() => { onGeneratePortrait?.(npc); showFeedback(`已发起 ${npc.name} 的 AI 画像生成`); }} className="px-3 py-2 rounded bg-pink-800 hover:bg-pink-700 text-pink-100 text-xs flex items-center gap-1"><Wand2 size={12} /> 用文生图生成画像</button>
                  {portrait && <button onClick={() => { if (confirm(`确定要删除 ${npc.name} 的画像信息吗？`)) { removeNPCPortrait(npc.id); setPortraitMap(loadNPCPortraitMap()); setPortraitNoteDraft(''); showFeedback(`已删除 ${npc.name} 的画像`); } }} className="px-3 py-2 rounded bg-red-900 hover:bg-red-800 text-red-100 text-xs flex items-center gap-1"><Trash2 size={12} /> 删除画像</button>}
                </div>
              </div>
              {portrait?.prompt && <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 space-y-2"><div className="text-xs text-zinc-400">最近一次生成提示词</div><div className="text-[11px] leading-relaxed text-zinc-500 whitespace-pre-wrap max-h-40 overflow-y-auto">{portrait.prompt}</div></div>}
            </div>
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (!file || !showPortraitModal) return; const reader = new FileReader(); reader.onload = () => { updatePortraitForNpc(showPortraitModal, { imageUrl: String(reader.result || ''), source: 'manual', note: portraitNoteDraft, npcName: getNPC(showPortraitModal)?.name }); setPortraitMap(loadNPCPortraitMap()); showFeedback('画像导入成功'); }; reader.readAsDataURL(file); e.currentTarget.value = ''; }} />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {actionFeedback && <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-zinc-800 border border-zinc-600 text-white text-sm px-4 py-2.5 rounded-lg shadow-2xl animate-fade-in">{actionFeedback}</div>}
      {(state.lastAIResponseSummary?.relationChangedNpcNames?.length ?? 0) > 0 && (
        <div className="flex items-center gap-2 bg-amber-900/40 border border-amber-600/50 rounded-lg px-3 py-2 text-xs text-amber-300 animate-pulse-slow">
          <Zap size={14} className="text-amber-400" />
          <span>AI剧情影响关系：{state.lastAIResponseSummary!.relationChangedNpcNames.join('、')}</span>
        </div>
      )}
      <div className="rounded-lg border border-amber-900/30 bg-amber-950/10 p-3">
        <div className="text-[11px] text-amber-300 mb-2 flex items-center gap-1">
          <User size={12} /> 你当前扮演的角色
        </div>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full overflow-hidden bg-zinc-800 shrink-0 flex items-center justify-center text-white font-semibold">
            {playerPortrait?.imageUrl ? (
              <img src={playerPortrait.imageUrl} alt={state.player.name} className="w-full h-full object-cover" />
            ) : (
              state.player.name?.[0] || '你'
            )}
          </div>
          <div className="min-w-0">
            <div className="text-sm text-white font-medium truncate">{state.player.name} <span className="text-[10px] text-amber-300">(你)</span></div>
            <div className="text-xs text-zinc-400 truncate">{state.player.age}岁 · {state.player.gender === 'female' ? '女' : state.player.gender === 'male' ? '男' : '其他'} · {state.player.role}</div>
            <div className="text-[11px] text-zinc-500 truncate">当前位置：{state.world.location}</div>
          </div>
        </div>
      </div>
      <div><h3 className="text-xs font-bold text-zinc-500 uppercase mb-2 tracking-wider flex items-center gap-1"><User size={12} /> 附近的人 ({nearbyNPCs.length})</h3>{nearbyNPCs.length > 0 ? <div className="space-y-2">{nearbyNPCs.map((npc) => renderNPCCard(npc, true))}</div> : <div className="text-sm text-zinc-500 italic py-4 text-center bg-zinc-800/30 rounded-lg">这里没有其他人</div>}</div>
      {otherNPCs.length > 0 && <div><h3 className="text-xs font-bold text-zinc-500 uppercase mb-2 tracking-wider">其他位置 ({otherNPCs.length})</h3><div className="space-y-1">{otherNPCs.map((npc) => renderNPCCard(npc, false))}</div></div>}
      {deadNPCs.length > 0 && <div><h3 className="text-xs font-bold text-zinc-600 uppercase mb-2 tracking-wider flex items-center gap-1"><Skull size={12} /> 已故 ({deadNPCs.length})</h3><div className="space-y-1 opacity-60">{deadNPCs.map((npc) => renderNPCCard(npc, false))}</div></div>}
      <div className="border-t border-zinc-800 pt-4 text-xs text-zinc-500 space-y-1"><p>🤖 每位 NPC 都可进行 AI 深度对话，系统会携带其性格、情感、关系与秘密上下文。</p><p>🖼️ 新增 NPC 画像系统：可手动导入、编辑备注，或一键调用文生图为该 NPC 生成专属形象。</p><p>💕 新增情侣系统：照拂、安慰、试探、护住、送礼、表露心意都会影响关系发展。</p></div>
      {renderItemsModal()}
      {renderTradeModal()}
      {renderGiftModal()}
      {renderPortraitModal()}
    </div>
  );
};
