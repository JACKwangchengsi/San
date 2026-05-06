/**
 * useWorldTick Hook
 * 从 GameLayout 中提取的世界模拟时钟
 * 每 30 游戏分钟触发一次，驱动 NPC 自主行为、天气变化、世界状态演化
 */
import { useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import type { NPC } from '../types/game';

export function useWorldTick() {
  const { state, dispatch, addLog } = useGame();
  const lastTickRef = useRef(state.world.time);

  useEffect(() => {
    const elapsed = state.world.time - lastTickRef.current;
    if (elapsed < 30 * 60 * 1000) return;
    lastTickRef.current = state.world.time;

    const hour = new Date(state.world.time).getHours();
    const isNight = hour >= 21 || hour < 6;

    // NPC 自主行为
    state.npcs.filter(n => n.status === 'alive' && !n.isRecruited).forEach(npc => {
      const npcLoc = state.locations.find(l => l.name === npc.location);
      if (!npcLoc) return;

      // 暗伤恶化
      if (npc.stats.infection > 0) {
        const newPoison = Math.min(100, npc.stats.infection + 2);
        if (newPoison >= 100) {
          dispatch({
            type: 'UPDATE_NPC',
            payload: { id: npc.id, updates: { status: 'dead', stats: { ...npc.stats, infection: 100 } } }
          });
          addLog(`☠️ ${npc.name}因伤毒恶化，不治身亡。`, 'death', 5);
        } else {
          dispatch({
            type: 'UPDATE_NPC',
            payload: { id: npc.id, updates: { status: 'poisoned' as NPC['status'], stats: { ...npc.stats, infection: newPoison } } }
          });
        }
      }

      // NPC 随机移动
      if (Math.random() < (isNight ? 0.03 : 0.06) && npcLoc.connectedLocations.length > 0) {
        const possible = npcLoc.connectedLocations
          .map(id => state.locations.find(l => l.id === id))
          .filter((l): l is NonNullable<typeof l> => !!l && !l.isLocked);
        if (possible.length) {
          dispatch({
            type: 'UPDATE_NPC',
            payload: { id: npc.id, updates: { location: possible[Math.floor(Math.random() * possible.length)].name } }
          });
        }
      }
    });

    // 天气随机变化
    if (Math.random() < 0.1) {
      const weathers = ['clear', 'cloudy', 'overcast', 'drizzle', 'rain', 'fog'] as const;
      const next = weathers[Math.floor(Math.random() * weathers.length)];
      dispatch({
        type: 'UPDATE_WORLD',
        payload: {
          weather: {
            ...state.world.weather,
            current: next,
            temperature: Math.round(state.world.weather.temperature + (Math.random() - 0.5) * 4),
          }
        }
      });
    }

    // 世界动态参数演化
    dispatch({
      type: 'UPDATE_WORLD',
      payload: {
        chaosLevel: Math.min(100, state.world.chaosLevel + 0.08),
        governmentControl: Math.max(0, state.world.governmentControl - 0.05),
        civilianMorale: Math.max(0, state.world.civilianMorale - 0.03),
      }
    });

    // 随机氛围描写
    if (Math.random() < 0.25) {
      const events = isNight
        ? ['夜风掠过檐角，街巷越发寂静。', '远处似有犬吠与马蹄声交错传来。', '昏灯下，有人影在巷口一闪而过。']
        : ['晨光透窗，街上已有挑担小贩来回走动。', '不远处传来叫卖声，夹杂着茶肆里的谈笑。', '风里裹着泥土和炊烟的气味，镇子渐渐活了起来。'];
      addLog(events[Math.floor(Math.random() * events.length)], 'narrative', 1);
    }
  }, [state.world.time, state.npcs, state.locations, state.world, dispatch, addLog]);
}
