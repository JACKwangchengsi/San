/**
 * MainArea — 中间主区域子组件（叙事日志 + 快捷操作 + 输入框）
 * 从 GameLayout.tsx 提取（原 ~90行 JSX）
 */

import React from 'react';
import { NarrativeLog, GameChoice } from '../NarrativeLog';
import { GameState, NPC, BirthSettings } from '../../types/game';
import { Map, Eye, Search, Footprints, MessageSquare, Moon, Droplets, Shield, Hammer, Image as ImageIcon, UserCircle2, Send } from 'lucide-react';
import SFX from '../../utils/sfx';
import { getShichen } from '../../systems/WorldSimulation';

const weatherLabel = (weather: string) => ({ clear: '晴朗', cloudy: '多云', overcast: '阴天', drizzle: '细雨', rain: '雨天', heavy_rain: '暴雨', thunderstorm: '雷雨', fog: '浓雾', snow: '小雪', blizzard: '风雪' }[weather] || weather);
const timeLabel = (time: number) => getShichen(new Date(time).getHours()).name;

export interface MainAreaProps {
  state: GameState;
  isMobileUI: boolean;
  chatPanelHeight: number;
  activeChoices: GameChoice[];
  isWaitingAI: boolean;
  isProcessing: boolean;
  autoAIEnabled: boolean;
  playerInput: string;
  onPlayerInputChange: (v: string) => void;
  onPlayerAction: (e?: React.FormEvent) => void;
  onChoiceSelect: (choice: GameChoice) => void;
  onQuickAction: (actionId: string) => void;
  onRequestSceneImage: (mode: 'scene' | 'portrait') => void;
  onResizeStart: () => void;
}

export const MainArea: React.FC<MainAreaProps> = ({
  state, isMobileUI, chatPanelHeight, activeChoices, isWaitingAI, isProcessing,
  autoAIEnabled, playerInput, onPlayerInputChange, onPlayerAction, onChoiceSelect,
  onQuickAction, onRequestSceneImage, onResizeStart,
}) => {
  const quickActions = [
    { id: 'look', icon: Eye, label: '观察', color: 'bg-blue-600 hover:bg-blue-500' },
    { id: 'search', icon: Search, label: '搜索', color: 'bg-green-600 hover:bg-green-500' },
    { id: 'move', icon: Footprints, label: '移动', color: 'bg-yellow-600 hover:bg-yellow-500' },
    { id: 'talk', icon: MessageSquare, label: '交谈', color: 'bg-purple-600 hover:bg-purple-500' },
    { id: 'rest', icon: Moon, label: '休息', color: 'bg-indigo-600 hover:bg-indigo-500' },
    { id: 'drink', icon: Droplets, label: '饮水', color: 'bg-cyan-600 hover:bg-cyan-500' },
    { id: 'barricade', icon: Shield, label: '加固', color: 'bg-emerald-600 hover:bg-emerald-500' },
    { id: 'craft', icon: Hammer, label: '制作', color: 'bg-orange-600 hover:bg-orange-500' },
  ];

  const isNight = new Date(state.world.time).getHours() >= 21 || new Date(state.world.time).getHours() < 6;
  const isDusk = new Date(state.world.time).getHours() >= 18 && new Date(state.world.time).getHours() < 21;

  return (
    <div className={`flex-1 flex flex-col min-w-0 min-h-0 ${isMobileUI ? 'order-2' : 'order-1'} animate-panel-lift`}>
      {/* 位置/天气信息栏 */}
      <div className={`bg-zinc-900/60 border-b border-zinc-800/80 ${isMobileUI ? 'px-2 py-1.5' : 'px-4 py-2'} flex items-center justify-between text-sm backdrop-blur-sm`}>
        <div className="flex items-center gap-2 min-w-0">
          <Map size={isMobileUI ? 12 : 14} className="text-blue-400 shrink-0" />
          {!isMobileUI && <span className="text-zinc-500 text-xs">位置</span>}
          <span className={`text-white font-medium truncate ${isMobileUI ? 'text-xs max-w-[100px]' : ''}`}>{state.world.location}</span>
          {state.world.location && state.locations.find(l => l.name === state.world.location)?.dangerLevel && state.locations.find(l => l.name === state.world.location)!.dangerLevel >= 50 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-900/50 text-red-400 border border-red-800/50 animate-pulse shrink-0">⚠</span>
          )}
        </div>
        <div className={`flex items-center ${isMobileUI ? 'gap-1.5 text-[10px]' : 'gap-3 text-xs'} text-zinc-500`}>
          <span className="flex items-center gap-1"><span className="text-amber-500/60">🕐</span>{timeLabel(state.world.time)}</span>
          <span className="flex items-center gap-1"><span>{weatherLabel(state.world.weather.current)}</span><span className="text-zinc-600">{state.world.weather.temperature}°</span></span>
          {!isMobileUI && <span className="flex items-center gap-1"><span className="text-amber-400">💰</span>{state.player.currency.silver}两</span>}
          {isNight && <span className="text-indigo-400 animate-pulse">🌙</span>}
          {isDusk && <span className="text-orange-400">🌅</span>}
        </div>
      </div>

      {/* 叙事日志 */}
      <div className={`overflow-hidden min-h-0 ${isMobileUI ? 'h-[42vh]' : ''}`} style={!isMobileUI ? { height: chatPanelHeight > 0 ? `${chatPanelHeight}px` : 'calc(100vh - 315px)' } : undefined}>
        <NarrativeLog logs={state.logs} choices={activeChoices} onChoiceSelect={onChoiceSelect} isWaitingAI={isWaitingAI} player={state.player} npcs={state.npcs} />
      </div>

      {/* 拖拽调整手柄 (desktop only) */}
      {!isMobileUI && (
        <div
          className="h-2 cursor-row-resize bg-zinc-900/80 hover:bg-amber-900/30 transition-all duration-200 border-y border-zinc-800/60 flex items-center justify-center group"
          onMouseDown={onResizeStart}
          title="拖拽调整主聊天框高度"
        >
          <div className="w-16 h-0.5 rounded-full bg-zinc-700 group-hover:bg-amber-700/60 group-hover:w-24 transition-all duration-200" />
        </div>
      )}

      {/* 快捷操作按钮 */}
      <div className={`${isMobileUI ? 'px-2 py-2 gap-1' : 'px-4 py-2 gap-2'} bg-zinc-900/80 border-t border-zinc-800/60 flex overflow-x-auto mobile-buttons backdrop-blur-sm`}>
        {quickActions.map((action) => (
          <button key={action.id} onClick={() => onQuickAction(action.id)} className={`flex items-center gap-1 ${isMobileUI ? 'px-2 py-2 text-xs' : 'px-3 py-1.5 text-xs sm:text-sm'} rounded-lg text-white whitespace-nowrap transition-all duration-200 hover:scale-[1.02] active:scale-[0.96] ${action.color} shadow-sm hover:shadow-md`}>
            <action.icon size={isMobileUI ? 12 : 14} />
            {!isMobileUI && action.label}
          </button>
        ))}
      </div>

      {/* 输入框 */}
      <form onSubmit={onPlayerAction} className={`${isMobileUI ? 'p-2' : 'p-4'} bg-zinc-900/70 border-t border-zinc-800/60 backdrop-blur-sm`}>
        <div className="relative">
          <input
            type="text"
            value={playerInput}
            onChange={(e) => onPlayerInputChange(e.target.value)}
            placeholder={activeChoices.length > 0 ? `输入 1-${activeChoices.length} 快速选择` : (isMobileUI ? '输入行动...' : '输入你的行动...（例如：向掌柜打听黑水峡）')}
            className={`w-full bg-zinc-900/80 border border-zinc-700/80 rounded-xl ${isMobileUI ? 'p-3 pr-12 text-sm' : 'p-4 pr-14'} text-white placeholder-zinc-600 focus:ring-2 focus:ring-amber-600/60 focus:border-amber-600/50 focus:outline-none transition-all duration-300 input-jianghu`}
            autoFocus
            disabled={isProcessing}
          />
          <button
            type="submit"
            disabled={isProcessing || !playerInput.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-gradient-to-br from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 disabled:from-zinc-700 disabled:to-zinc-800 disabled:cursor-not-allowed text-white rounded-xl transition-all duration-200 shadow-md shadow-amber-900/20 hover:shadow-lg hover:shadow-amber-900/30 active:scale-95"
          >
            <Send size={18} />
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 items-center">
          <button type="button" onClick={() => onRequestSceneImage('scene')} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-fuchsia-800/80 hover:bg-fuchsia-700 text-white text-xs sm:text-sm transition-all duration-200 hover-lift shadow-sm shadow-fuchsia-900/20 animate-sword-glint">
            <ImageIcon size={14} />生成情节图
          </button>
          <button type="button" onClick={() => onRequestSceneImage('portrait')} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-pink-800/80 hover:bg-pink-700 text-white text-xs sm:text-sm transition-all duration-200 hover-lift shadow-sm shadow-pink-900/20">
            <UserCircle2 size={14} />生成角色立绘
          </button>
          <span className="text-[10px] sm:text-xs text-zinc-600">想看画面时再点，不影响文字推进。</span>
        </div>
        {!isMobileUI && (
          <p className="text-[10px] text-zinc-700 mt-2">
            {activeChoices.length > 0
              ? `🎯 当前有 ${activeChoices.length} 个选项可选，按数字键 1-${activeChoices.length} 或点击上方按钮选择`
              : autoAIEnabled
                ? '🤖 AI自动模式已开启，输入行动后AI将自动续写剧情并同步人物/物品/时间/地点/天气等系统状态'
                : '💡 开启AI自动模式后，输入行动将自动获取剧情并应用到系统'}
          </p>
        )}
      </form>
    </div>
  );
};
