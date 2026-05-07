/**
 * GameHeader — 顶栏子组件
 * 从 GameLayout.tsx 提取（原 ~55行 JSX）
 */

import React from 'react';
import { GameState, BirthSettings, OrchestratorSettings, Item, Location, NPC, WorldState, StatKey } from '../../types/game';
import { Settings, UserCog, Save, RotateCcw, Volume2, VolumeX, Music, Music2 } from 'lucide-react';
import SFX from '../../utils/sfx';

export interface GameHeaderProps {
  state: GameState;
  worldSeed: string;
  isMobileUI: boolean;
  musicEnabled: boolean;
  hasCriticalStatus: boolean;
  isLowHealth: boolean;
  isHungry: boolean;
  isThirsty: boolean;
  isTired: boolean;
  isStaminaLow: boolean;
  deviceMode: 'auto' | 'mobile' | 'desktop';
  onSave: () => void;
  onToggleSound: () => void;
  onToggleMusic: () => void;
  onOpenAdmin: () => void;
  onOpenStartMenu: () => void;
  onOpenDeviceSelector: () => void;
  onOpenSettings: () => void;
  onResetPanelSize: () => void;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  state, worldSeed, isMobileUI, musicEnabled, hasCriticalStatus,
  isLowHealth, isHungry, isThirsty, isTired, isStaminaLow,
  deviceMode, onSave, onToggleSound, onToggleMusic, onOpenAdmin,
  onOpenStartMenu, onOpenDeviceSelector, onOpenSettings, onResetPanelSize,
}) => {
  return (
    <header className={`border-b border-zinc-800/80 bg-gradient-to-b from-zinc-900/95 via-black/95 to-black ${isMobileUI ? 'p-2' : 'p-3'} sticky top-0 z-20 flex justify-between items-center shadow-lg shadow-black/40 flex-wrap gap-2 mobile-app-header backdrop-blur-sm`}>
      <div className="flex items-center gap-4 min-w-0">
        <div className="min-w-0">
          <h1 className={`${isMobileUI ? 'text-base' : 'text-xl'} font-bold tracking-tighter flex items-baseline gap-0.5`}>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 animate-name-glow">江湖侠影</span>
            <span className="text-red-500/90 font-black text-lg sm:text-2xl animate-pulse" style={{ animationDuration: '3.5s' }}>录</span>
          </h1>
          {!isMobileUI && (
            <p className="text-[9px] text-zinc-600 mt-0.5 tracking-wide">
              第{state.gamePhase}卷 · 第{state.world.dayNumber}日 · 已生成 {state.wordCount.toLocaleString()} 字 · 种子 {worldSeed.slice(-8)}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
        {!isMobileUI && (
          <div className={`flex items-center gap-2.5 text-xs mr-3 px-3 py-1.5 rounded-full transition-all duration-500 ${
            hasCriticalStatus
              ? 'bg-red-950/60 animate-pulse-slow border border-red-700/60 shadow-[0_0_12px_rgba(220,38,38,0.15)]'
              : 'bg-zinc-900/80 border border-zinc-800/60'
          }`}>
            <span className={`flex items-center gap-1 ${isLowHealth ? 'text-red-400 animate-pulse font-bold' : 'text-red-400/80'}`} title="气血">❤ {Math.round(state.player.stats.health.value)}</span>
            <span className="w-px h-3 bg-zinc-700/60" />
            <span className={`flex items-center gap-1 ${isHungry ? 'text-orange-400 animate-pulse font-bold' : 'text-orange-400/70'}`} title="饱腹">🍖 {Math.round(state.player.stats.hunger.value)}</span>
            <span className="w-px h-3 bg-zinc-700/60" />
            <span className={`flex items-center gap-1 ${isThirsty ? 'text-blue-400 animate-pulse font-bold' : 'text-blue-400/70'}`} title="口渴">💧 {Math.round(state.player.stats.thirst.value)}</span>
            <span className="w-px h-3 bg-zinc-700/60" />
            <span className={`flex items-center gap-1 ${isTired ? 'text-yellow-400 animate-pulse font-bold' : 'text-yellow-400/70'}`} title="精力">⚡ {Math.round(state.player.stats.energy.value)}</span>
            <span className="w-px h-3 bg-zinc-700/60" />
            <span className={`flex items-center gap-1 ${isStaminaLow ? 'text-amber-400 animate-pulse font-bold' : 'text-amber-400/70'}`} title="体力">🏃 {Math.round(state.player.stats.stamina.value)}</span>
          </div>
        )}
        {isMobileUI && (
          <div className={`flex items-center gap-2 text-[10px] px-2 py-1 rounded-full transition-all duration-500 ${
            hasCriticalStatus ? 'bg-red-950/60 border border-red-700/60 animate-pulse-slow' : 'bg-zinc-900/80 border border-zinc-800/60'
          }`}>
            <span className={isLowHealth ? 'text-red-400 font-bold' : 'text-red-400/80'}>❤{Math.round(state.player.stats.health.value)}</span>
            <span className="text-amber-400/80">💰{state.player.currency.silver}</span>
          </div>
        )}
        <div className="flex items-center gap-0.5 sm:gap-1.5 bg-zinc-900/60 rounded-lg p-0.5 border border-zinc-800/50">
          <button onClick={onToggleSound} className={`p-1.5 sm:p-2 hover:bg-zinc-800 rounded-md transition-all duration-200 ${state.settings.soundEnabled ? 'text-green-400 hover:text-green-300' : 'text-zinc-600 hover:text-zinc-500'}`} title={state.settings.soundEnabled ? '关闭音效/背景氛围' : '开启音效/背景氛围'}>
            {state.settings.soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>
          <button onClick={onToggleMusic} className={`p-1.5 sm:p-2 hover:bg-zinc-800 rounded-md transition-all duration-200 ${musicEnabled ? 'text-purple-400 hover:text-purple-300' : 'text-zinc-600 hover:text-zinc-500'}`} title={musicEnabled ? '关闭背景音乐' : '开启中国风背景音乐'}>
            {musicEnabled ? <Music size={17} /> : <Music2 size={17} />}
          </button>
        </div>
        <div className="w-px h-5 bg-zinc-800/60 hidden sm:block" />
        <button onClick={onSave} className="p-1.5 sm:p-2 hover:bg-zinc-800 rounded-md text-zinc-500 hover:text-green-400 transition-all duration-200" title="保存游戏"><Save size={17} /></button>
        <button onClick={onOpenAdmin} className="p-1.5 sm:p-2 hover:bg-zinc-800 rounded-md text-zinc-500 hover:text-amber-400 transition-all duration-200" title="管理面板"><UserCog size={17} /></button>
        <button onClick={onOpenStartMenu} className="p-1.5 sm:p-2 hover:bg-zinc-800 rounded-md text-zinc-500 hover:text-yellow-400 transition-all duration-200" title="新游戏 / 继续游戏"><RotateCcw size={17} /></button>
        <button onClick={onOpenDeviceSelector} className="p-1.5 sm:p-2 hover:bg-zinc-800 rounded-md text-zinc-500 hover:text-white transition-all duration-200 text-xs" title="设备模式">
          {deviceMode === 'mobile' ? '📱' : deviceMode === 'desktop' ? '💻' : '🔄'}
        </button>
        {!isMobileUI && (
          <button onClick={onResetPanelSize} className="p-1.5 sm:p-2 hover:bg-zinc-800 rounded-md text-zinc-500 hover:text-amber-300 transition-all duration-200" title="重置区域尺寸">↔</button>
        )}
        <button onClick={onOpenSettings} className="p-1.5 sm:p-2 hover:bg-zinc-800 rounded-md text-zinc-500 hover:text-white transition-all duration-200" title="界面与系统设置"><Settings size={17} /></button>
      </div>
    </header>
  );
};
