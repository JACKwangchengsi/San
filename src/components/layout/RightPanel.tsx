/**
 * RightPanel — 右侧面板子组件（Tab 路由 + 内容区）
 * 从 GameLayout.tsx 提取（原 ~80行 JSX）
 * 每个 Tab 面板使用独立的 PanelErrorBoundary 降级
 */

import React, { Suspense } from 'react';
import { StatsPanel } from '../StatsPanel';
import { Inventory } from '../Inventory';
import { NPCPanel } from '../NPCPanel';
import { LocationPanel } from '../LocationPanel';
import { PanelErrorBoundary } from '../PanelErrorBoundary';
import { lazy } from 'react';
import { Sword, Package, Users, Map, Hammer, Coins, Star, Eye, Image as ImageIcon, Bot, RefreshCw } from 'lucide-react';
import type { GameState, BirthSettings, Item, NPC, OrchestratorSettings, AIResponse } from '../../types/game';
import type { GeneratedScene } from '../SceneImagePanel';

const CraftingPanel = lazy(() => import('../CraftingPanel').then(m => ({ default: m.CraftingPanel })));
const ShopPanel = lazy(() => import('../ShopPanel'));
const CultivationPanel = lazy(() => import('../CultivationPanel'));
const WorldDetailPanel = lazy(() => import('../WorldDetailPanel'));
const SceneImagePanel = lazy(() => import('../SceneImagePanel'));
const AIConsole = lazy(() => import('../AIConsole').then(m => ({ default: m.AIConsole })));

type TabType = 'stats' | 'inventory' | 'npcs' | 'map' | 'ai' | 'craft' | 'shop' | 'cultivation' | 'world' | 'scene';

const panelFallback = (
  <div className="h-full min-h-[240px] flex items-center justify-center text-zinc-500 text-sm">
    <div className="flex items-center gap-2 animate-pulse"><RefreshCw size={16} className="animate-spin" />正在载入面板…</div>
  </div>
);

const TABS: { id: TabType; icon: typeof Sword; label: string }[] = [
  { id: 'stats', icon: Sword, label: '状态' },
  { id: 'inventory', icon: Package, label: '物品' },
  { id: 'craft', icon: Hammer, label: '制作' },
  { id: 'npcs', icon: Users, label: '人物' },
  { id: 'map', icon: Map, label: '地图' },
  { id: 'shop', icon: Coins, label: '店铺' },
  { id: 'cultivation', icon: Star, label: '修炼' },
  { id: 'world', icon: Eye, label: '世界' },
  { id: 'scene', icon: ImageIcon, label: '场景图' },
  { id: 'ai', icon: Bot, label: 'AI' },
];

export interface RightPanelProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  isMobileUI: boolean;
  rightPanelWidth: number;
  state: GameState;
  birthSettings: BirthSettings | null;
  pendingSceneStoryRef: React.MutableRefObject<string>;
  latestStoryText: string;
  pendingSceneAnchorRef: React.MutableRefObject<string | null>;
  latestStoryAnchorId: string | null;
  sceneRequest: { nonce: number; mode: 'scene' | 'portrait'; npcId?: string | null; npcName?: string | null } | null;
  focusedNPCId: string | null;
  onSceneGenerated: (scene: GeneratedScene) => void;
  playerInput: string;
  isProcessing: boolean;
  autoAIEnabled: boolean;
  setAutoAIEnabled: (v: boolean) => void;
  npcTalkRequest: { npcId: string; npcName: string; prompt: string } | null;
  webInputDraft: string;
  onWebInputConsumed: () => void;
  onAIUpdate: (data: AIResponse) => void;
  onRegisterAIGenerator: (generator: (action: string) => Promise<void>) => void;
  onNPCTalkHandled: () => void;
  setFocusedNPCId: (id: string | null) => void;
  npcCountsByLocation: Record<string, number>;
  npcNamesByLocation: Record<string, string[]>;
  shopCountsByLocation: Record<string, number>;
  factionMarksByLocation: Record<string, string[]>;
  eventIntensityByLocation: Record<string, number>;
  handleUseItem: (item: Item) => void;
  handleDropItem: (itemId: string) => void;
  setSelectedItem: (item: Item | null) => void;
  refillItem: (itemId: string) => void;
  handleTalkToNPC: (npcId: string) => void;
  moveToLocation: (locationId: string) => void;
  handleSelectNPCByName: (npcName: string) => void;
  requestSceneImage: (mode: 'scene' | 'portrait', npc?: NPC | null) => void;
  setAICallback: (cb: ((action: string) => Promise<void>) | null) => void;
  aiGeneratorRef: React.MutableRefObject<((action: string) => Promise<void>) | null>;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  activeTab, onTabChange, isMobileUI, rightPanelWidth, state, birthSettings,
  pendingSceneStoryRef, latestStoryText, pendingSceneAnchorRef, latestStoryAnchorId,
  sceneRequest, focusedNPCId, onSceneGenerated, playerInput, isProcessing,
  autoAIEnabled, setAutoAIEnabled, npcTalkRequest, webInputDraft,
  onWebInputConsumed, onAIUpdate, onRegisterAIGenerator, onNPCTalkHandled,
  setFocusedNPCId, npcCountsByLocation, npcNamesByLocation, shopCountsByLocation,
  factionMarksByLocation, eventIntensityByLocation, handleUseItem, handleDropItem,
  setSelectedItem, refillItem, handleTalkToNPC, moveToLocation, handleSelectNPCByName,
  requestSceneImage, setAICallback, aiGeneratorRef,
}) => {
  const renderContent = () => {
    switch (activeTab) {
      case 'stats': return <PanelErrorBoundary panelName="状态面板" compact><StatsPanel player={state.player} world={state.world} /></PanelErrorBoundary>;
      case 'inventory': return <PanelErrorBoundary panelName="物品面板" compact><Inventory items={state.player.inventory} onUse={handleUseItem} onDrop={handleDropItem} onSelect={setSelectedItem} onRefill={refillItem} /></PanelErrorBoundary>;
      case 'npcs': return <PanelErrorBoundary panelName="人物面板" compact><NPCPanel npcs={state.npcs} currentLocation={state.world.location} onTalk={handleTalkToNPC} onGeneratePortrait={(npc) => requestSceneImage('portrait', npc)} focusNPCId={focusedNPCId} onFocusHandled={() => setFocusedNPCId(null)} /></PanelErrorBoundary>;
      case 'map': return <PanelErrorBoundary panelName="地图面板" compact><LocationPanel locations={state.locations} currentLocation={state.world.location} onMove={moveToLocation} onSelectNPCByName={handleSelectNPCByName} npcCounts={npcCountsByLocation} npcNames={npcNamesByLocation} shopCounts={shopCountsByLocation} factionMarks={factionMarksByLocation} eventIntensity={eventIntensityByLocation} logs={state.logs} /></PanelErrorBoundary>;
      case 'craft': return <Suspense fallback={panelFallback}><PanelErrorBoundary panelName="制作面板" compact><CraftingPanel /></PanelErrorBoundary></Suspense>;
      case 'shop': return <Suspense fallback={panelFallback}><PanelErrorBoundary panelName="店铺面板" compact><ShopPanel isMobile={isMobileUI} /></PanelErrorBoundary></Suspense>;
      case 'cultivation': return <Suspense fallback={panelFallback}><PanelErrorBoundary panelName="修炼面板" compact><CultivationPanel /></PanelErrorBoundary></Suspense>;
      case 'world': return <Suspense fallback={panelFallback}><PanelErrorBoundary panelName="世界面板" compact><WorldDetailPanel /></PanelErrorBoundary></Suspense>;
      case 'scene': return <Suspense fallback={panelFallback}><PanelErrorBoundary panelName="场景图面板" compact><SceneImagePanel state={state} birthSettings={birthSettings} latestStoryText={pendingSceneStoryRef.current || latestStoryText} anchorLogId={pendingSceneAnchorRef.current || latestStoryAnchorId} manualRequest={sceneRequest} onSceneGenerated={onSceneGenerated} /></PanelErrorBoundary></Suspense>;
      case 'ai': return <Suspense fallback={panelFallback}><PanelErrorBoundary panelName="AI面板" compact><AIConsole state={state} lastAction={playerInput || '等待输入...'} birthSettings={birthSettings} onUpdate={onAIUpdate} isProcessing={isProcessing} autoAIEnabled={autoAIEnabled} setAutoAIEnabled={setAutoAIEnabled} onRegisterAIGenerator={(generator: (action: string) => Promise<void>) => { aiGeneratorRef.current = generator; if (autoAIEnabled) setAICallback(generator); }} npcTalkRequest={npcTalkRequest} onNPCTalkHandled={onNPCTalkHandled} webInputDraft={webInputDraft} onWebInputConsumed={onWebInputConsumed} /></PanelErrorBoundary></Suspense>;
      default: return null;
    }
  };

  return (
    <div className={`${isMobileUI ? 'w-full h-[45vh] order-1 border-b' : 'h-[calc(100vh-72px)] order-2 border-l'} min-h-0 border-zinc-800 glass-jianghu flex flex-col mobile-panel animate-panel-lift`} style={!isMobileUI ? { width: `${rightPanelWidth}px` } : undefined}>
      <div className="flex border-b border-zinc-800 bg-zinc-900/50 overflow-x-auto mobile-tabbar">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 ${isMobileUI ? 'py-2' : 'py-3'} flex flex-col items-center gap-1 text-xs transition ${activeTab === tab.id ? 'bg-zinc-800 text-white border-b-2 border-amber-500' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
          >
            <tab.icon size={isMobileUI ? 14 : 16} />
            {!isMobileUI && <span>{tab.label}</span>}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-3 lg:p-4">
        {renderContent()}
      </div>
    </div>
  );
};
