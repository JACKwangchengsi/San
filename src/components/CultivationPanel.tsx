import React, { useMemo, useState } from 'react';
import { useGame } from '../context/GameContext';
import {
  CULTIVATION_REALMS,
  MARTIAL_ARTS_DATABASE,
  SECTS,
  getRealmByLevel,
  MartialArtSkill
} from '../systems/CultivationSystem';
import { Zap, Sword, Users, Star, TrendingUp, BookOpen, Shield, Activity, AlertTriangle } from 'lucide-react';
import SFX from '../utils/sfx';

interface CultivationPanelProps {
  onClose?: () => void;
}

const CultivationPanel: React.FC<CultivationPanelProps> = () => {
  const { state, dispatch, addLog } = useGame();
  const soundEnabled = state.settings.soundEnabled;
  const [activeTab, setActiveTab] = useState<'realm' | 'martial' | 'sect' | 'cultivate'>('realm');
  const [selectedArt, setSelectedArt] = useState<MartialArtSkill | null>(null);

  const currentRealm = getRealmByLevel(state.player.cultivationStage);
  const nextRealm = CULTIVATION_REALMS[state.player.cultivationStage + 1];
  const learnedArts = state.player.martialArts || [];
  const availableArts = MARTIAL_ARTS_DATABASE.filter(art => !learnedArts.some(la => la.id === art.id) && art.requirements.realm <= state.player.cultivationStage);

  const canBreak = useMemo(() => {
    const sanity = state.player.stats.sanity.value;
    const energy = state.player.stats.energy.value;
    const health = state.player.stats.health.value;
    const poisoned = state.player.stats.infection.value;
    return !!nextRealm && sanity >= 80 && energy >= 70 && health >= 55 && poisoned < 40;
  }, [nextRealm, state.player.stats]);

  const cultivate = (hours: number) => {
    if (soundEnabled) SFX.cultivate();
    const qiGain = (1 + state.player.cultivationStage * 2) * hours * 10;
    const staminaLoss = hours * 5;
    const energyLoss = hours * 8;

    dispatch({ type: 'ADVANCE_TIME', payload: hours * 60 });
    dispatch({ type: 'UPDATE_PLAYER_STAT', payload: { stat: 'energy', value: -energyLoss } });
    dispatch({ type: 'UPDATE_PLAYER_STAT', payload: { stat: 'stamina', value: -staminaLoss } });
    dispatch({ type: 'UPDATE_PLAYER_STAT', payload: { stat: 'sanity', value: hours * 4 } });

    addLog(`你盘膝调息了${hours}个时辰，内息缓缓流转，经络微热，真气积蓄更为浑厚。`, 'narrative', 3);
    addLog(`修炼收益：真气感悟+${qiGain}，心境略有提升。`, 'system', 2);
  };

  const attemptBreakthrough = () => {
    if (soundEnabled) SFX.breakthrough();
    if (!nextRealm) {
      addLog('你已达到当前可突破的最高境界。', 'warning', 3);
      return;
    }

    const sanity = state.player.stats.sanity.value;
    const energy = state.player.stats.energy.value;
    const health = state.player.stats.health.value;
    const poison = state.player.stats.infection.value;

    if (sanity < 80 || energy < 70 || health < 55 || poison >= 40) {
      addLog('当前状态不足以突破：需要心境≥80、内力≥70、气血≥55，且暗伤/中毒较轻。', 'warning', 4);
      return;
    }

    const successRate = Math.min(0.88, (sanity * 0.35 + energy * 0.35 + health * 0.2 + (100 - poison) * 0.1) / 100);
    const success = Math.random() < successRate;

    dispatch({ type: 'ADVANCE_TIME', payload: 120 });
    dispatch({ type: 'UPDATE_PLAYER_STAT', payload: { stat: 'energy', value: -50 } });
    dispatch({ type: 'UPDATE_PLAYER_STAT', payload: { stat: 'stamina', value: -30 } });
    dispatch({ type: 'UPDATE_PLAYER_STAT', payload: { stat: 'sanity', value: -8 } });

    if (success) {
      dispatch({ type: 'UPDATE_PLAYER', payload: { cultivationStage: state.player.cultivationStage + 1 } });
      dispatch({ type: 'UPDATE_PLAYER_STAT', payload: { stat: 'health', value: 20 } });
      dispatch({ type: 'UPDATE_PLAYER_STAT', payload: { stat: 'energy', value: 25 } });
      addLog(`你只觉体内气机一震，关隘豁然洞开，真气如潮汐般冲刷经脉，终于迈入【${nextRealm.name}】。`, 'discovery', 5);
      addLog(`突破成功：${currentRealm.name} → ${nextRealm.name}。获得境界加成，气机流转更稳。`, 'system', 4);
    } else {
      dispatch({ type: 'UPDATE_PLAYER_STAT', payload: { stat: 'health', value: -20 } });
      dispatch({ type: 'UPDATE_PLAYER_STAT', payload: { stat: 'infection', value: 8 } });
      addLog('突破失败！真气逆冲，经脉震荡，你当场喷出一口浊血，不得不收束内息。', 'warning', 5);
    }
  };

  const practiceArt = (artId: string) => {
    if (soundEnabled) SFX.use();
    const art = learnedArts.find(a => a.id === artId);
    if (!art) return;

    dispatch({ type: 'ADVANCE_TIME', payload: 60 });
    dispatch({ type: 'UPDATE_PLAYER_STAT', payload: { stat: 'energy', value: -15 } });
    dispatch({ type: 'UPDATE_PLAYER_STAT', payload: { stat: 'stamina', value: -10 } });

    const masteryGain = Math.floor(5 + Math.random() * 10);
    const newMastery = Math.min(100, art.level + masteryGain / 10);

    dispatch({
      type: 'UPDATE_PLAYER',
      payload: {
        martialArts: learnedArts.map(a => a.id === artId ? { ...a, level: newMastery } : a)
      }
    });

    addLog(`你反复演练【${art.name}】，招式衔接更见圆融，熟练度有所提升。`, 'system', 2);
  };

  const tabs = [
    { id: 'realm' as const, label: '境界', icon: Star },
    { id: 'martial' as const, label: '武学', icon: Sword },
    { id: 'sect' as const, label: '门派', icon: Users },
    { id: 'cultivate' as const, label: '修炼', icon: Activity }
  ];

  return (
    <div className="flex flex-col bg-gray-900/95 text-amber-100">
      <div className="flex border-b border-amber-900/50">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-3 flex items-center justify-center gap-1 text-sm transition-all ${activeTab === tab.id ? 'bg-amber-900/40 text-amber-300 border-b-2 border-amber-500' : 'text-amber-100/60 hover:bg-amber-900/20'}`}
          >
            <tab.icon size={14} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="p-3 space-y-3">
        {/* AI→子系统联动：修为变化标记 */}
        {state.lastAIResponseSummary?.cultivationChanged && (
          <div className="flex items-center gap-2 bg-amber-900/40 border border-amber-600/50 rounded-lg px-3 py-2 text-xs text-amber-300 animate-pulse-slow">
            <Zap size={14} className="text-amber-400" />
            <span>AI剧情影响：修为/武学已发生变化</span>
          </div>
        )}
        {activeTab === 'realm' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-amber-900/40 to-orange-900/30 rounded-lg p-4 border border-amber-700/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-amber-600/30 flex items-center justify-center border-2 border-amber-500">
                  <Star className="text-amber-400" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-amber-300">{currentRealm.name}</h3>
                  <p className="text-xs text-amber-100/60">第{currentRealm.level}层境界</p>
                </div>
              </div>
              <p className="text-sm text-amber-100/80 mb-3">{currentRealm.description}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-black/30 rounded px-2 py-1"><span className="text-red-400">气血</span><span className="text-amber-300 ml-1">+{currentRealm.statBonus.health}</span></div>
                <div className="bg-black/30 rounded px-2 py-1"><span className="text-blue-400">内力</span><span className="text-amber-300 ml-1">+{currentRealm.statBonus.energy}</span></div>
                <div className="bg-black/30 rounded px-2 py-1"><span className="text-orange-400">攻击</span><span className="text-amber-300 ml-1">+{currentRealm.statBonus.damage}</span></div>
                <div className="bg-black/30 rounded px-2 py-1"><span className="text-green-400">防御</span><span className="text-amber-300 ml-1">+{currentRealm.statBonus.defense}</span></div>
              </div>
              {currentRealm.abilities.length > 0 && (
                <div className="mt-3 pt-3 border-t border-amber-700/30">
                  <p className="text-xs text-amber-100/60 mb-1">已领悟能力：</p>
                  <div className="flex flex-wrap gap-1">
                    {currentRealm.abilities.map((ab, i) => <span key={i} className="px-2 py-0.5 bg-amber-700/30 rounded text-xs text-amber-300">{ab}</span>)}
                  </div>
                </div>
              )}
            </div>

            {nextRealm && (
              <div className="bg-gray-800/60 rounded-lg p-4 border border-gray-700 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="font-medium text-amber-200 flex items-center gap-2"><TrendingUp size={16} />下一境界：{nextRealm.name}</h4>
                  <button onClick={attemptBreakthrough} className={`px-3 py-1 rounded text-sm font-medium transition-all ${canBreak ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500' : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'}`}>尝试突破</button>
                </div>
                <p className="text-xs text-gray-400">{nextRealm.description}</p>
                <div className="text-xs text-amber-100/60">突破条件：心境≥80，内力≥70，气血≥55，暗伤较轻</div>
                {!canBreak && (
                  <div className="flex items-center gap-2 text-xs text-orange-300 bg-orange-950/30 border border-orange-900/40 rounded px-3 py-2">
                    <AlertTriangle size={12} />当前状态不足，建议先调息养伤再行突破。
                  </div>
                )}
              </div>
            )}

            <div className="bg-gray-800/40 rounded-lg p-3">
              <h4 className="text-sm font-medium text-amber-200 mb-2 flex items-center gap-2"><BookOpen size={14} />境界总览</h4>
              <div className="space-y-1">
                {CULTIVATION_REALMS.map((realm, i) => (
                  <div key={realm.id} className={`flex items-center justify-between text-xs p-1.5 rounded ${i === state.player.cultivationStage ? 'bg-amber-900/40 text-amber-300' : i < state.player.cultivationStage ? 'text-green-400/80' : 'text-gray-500'}`}>
                    <span>{realm.name}</span>
                    <span className="text-gray-500">{i === state.player.cultivationStage ? '← 当前' : i < state.player.cultivationStage ? '✓' : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'martial' && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-amber-200 mb-2 flex items-center gap-2"><Sword size={14} />已学武学 ({learnedArts.length})</h4>
              {learnedArts.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">尚未学习任何武学</p>
              ) : (
                <div className="space-y-2">
                  {learnedArts.map(art => (
                    <div key={art.id} className="bg-gray-800/60 rounded-lg p-3 border border-gray-700 hover:border-amber-700/50 transition-all cursor-pointer" onClick={() => setSelectedArt(MARTIAL_ARTS_DATABASE.find(a => a.id === art.id) || null)}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-amber-300">{art.name}</span>
                        <span className="text-xs px-2 py-0.5 bg-amber-900/40 rounded text-amber-400">熟练 {Math.floor(art.level * 10)}%</span>
                      </div>
                      <p className="text-xs text-gray-400 mb-2">{art.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 bg-gray-700 rounded-full h-1.5 mr-2"><div className="bg-amber-500 h-full rounded-full transition-all" style={{ width: `${art.level * 10}%` }} /></div>
                        <button onClick={(e) => { e.stopPropagation(); practiceArt(art.id); }} className="ml-2 px-2 py-0.5 bg-amber-700/50 rounded text-xs hover:bg-amber-600/50">练习</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {availableArts.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">可学武学</h4>
                <div className="space-y-2">
                  {availableArts.slice(0, 3).map(art => (
                    <div key={art.id} className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/50 opacity-70">
                      <div className="flex items-center justify-between mb-1"><span className="font-medium text-gray-300">{art.name}</span><span className="text-xs text-gray-500">需寻访获取</span></div>
                      <p className="text-xs text-gray-500">{art.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedArt && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setSelectedArt(null)}>
                <div className="bg-gray-900 rounded-lg p-4 max-w-md w-full border border-amber-700/50" onClick={e => e.stopPropagation()}>
                  <h3 className="text-lg font-bold text-amber-300 mb-2">{selectedArt.name}</h3>
                  <p className="text-sm text-gray-400 mb-3">{selectedArt.description}</p>
                  <div className="mb-3">
                    <h4 className="text-sm font-medium text-amber-200 mb-1">招式</h4>
                    <div className="space-y-1">
                      {selectedArt.moves.map(move => (
                        <div key={move.id} className="bg-gray-800 rounded p-2 text-xs">
                          <div className="flex justify-between"><span className="text-amber-300">{move.name}</span><span className="text-red-400">伤害 {move.damage}</span></div>
                          <p className="text-gray-500">{move.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => setSelectedArt(null)} className="w-full py-2 bg-gray-800 rounded hover:bg-gray-700 transition-all">关闭</button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'sect' && (
          <div className="space-y-4">
            <div className="bg-gray-800/60 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-2 mb-3"><Shield size={18} className="text-amber-400" /><h4 className="font-medium text-amber-200">当前门派</h4></div>
              <p className="text-lg text-amber-300">{state.player.sect || '无门无派'}</p>
              <p className="text-xs text-gray-400 mt-1">江湖漂泊，尚未归属</p>
            </div>
            <h4 className="text-sm font-medium text-gray-400">江湖门派</h4>
            <div className="space-y-2">
              {SECTS.map(sect => (
                <div key={sect.id} className={`bg-gray-800/40 rounded-lg p-3 border transition-all ${sect.type === 'righteous' ? 'border-green-900/50 hover:border-green-700/50' : sect.type === 'evil' ? 'border-red-900/50 hover:border-red-700/50' : 'border-gray-700/50 hover:border-gray-600/50'}`}>
                  <div className="flex items-center justify-between mb-1"><span className="font-medium text-amber-300">{sect.name}</span><span className={`text-xs px-2 py-0.5 rounded ${sect.type === 'righteous' ? 'bg-green-900/40 text-green-400' : sect.type === 'evil' ? 'bg-red-900/40 text-red-400' : 'bg-gray-700 text-gray-400'}`}>{sect.type === 'righteous' ? '正派' : sect.type === 'evil' ? '邪派' : '中立'}</span></div>
                  <p className="text-xs text-gray-400 mb-2">{sect.description}</p>
                  <div className="flex items-center justify-between text-xs"><span className="text-gray-500">📍 {sect.location}</span><span className="text-gray-500">掌门：{sect.leader}</span></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'cultivate' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/30 rounded-lg p-4 border border-indigo-700/50">
              <div className="flex items-center gap-2 mb-3"><Zap className="text-indigo-400" size={20} /><h4 className="font-medium text-indigo-200">静心修炼</h4></div>
              <p className="text-xs text-gray-400 mb-4">闭目调息，运转心法，感悟天地灵气，提升修为。</p>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => cultivate(1)} className="py-2 bg-indigo-800/50 rounded hover:bg-indigo-700/50 transition-all text-sm">修炼1时辰</button>
                <button onClick={() => cultivate(2)} className="py-2 bg-indigo-800/50 rounded hover:bg-indigo-700/50 transition-all text-sm">修炼2时辰</button>
                <button onClick={() => cultivate(4)} className="py-2 bg-indigo-800/50 rounded hover:bg-indigo-700/50 transition-all text-sm">修炼4时辰</button>
              </div>
            </div>

            <div className="bg-gray-800/60 rounded-lg p-4 border border-gray-700">
              <h4 className="font-medium text-amber-200 mb-3">当前状态</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">境界</span><span className="text-amber-300">{currentRealm.name}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">内力</span><span className="text-blue-300">{Math.floor(state.player.stats.energy.value)}/{state.player.stats.energy.max}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">心境</span><span className="text-purple-300">{Math.floor(state.player.stats.sanity.value)}/{state.player.stats.sanity.max}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">体力</span><span className="text-green-300">{Math.floor(state.player.stats.stamina.value)}/{state.player.stats.stamina.max}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">暗伤</span><span className="text-red-300">{Math.floor(state.player.stats.infection.value)}/{state.player.stats.infection.max}</span></div>
              </div>
            </div>

            <div className="bg-gray-800/40 rounded-lg p-3 text-xs text-gray-400">
              <p className="mb-1">💡 修炼提示：</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>修炼会消耗内力和体力，但会微幅提升心境。</li>
                <li>暗伤过重、气血不足时，突破风险会明显上升。</li>
                <li>若在江湖险地连续修炼，最好先确认周围安全。</li>
                <li>武学练习会推进时间，也可能让你错过城镇营业时段。</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CultivationPanel;
