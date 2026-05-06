/**
 * useOrchestration Hook
 * 从 GameLayout 中提取的智能统筹自愈层
 * 定期运行 deriveSystemCorrections 来修复脏数据
 */
import { useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { deriveSystemCorrections } from '../systems/Orchestrator';
import type { OrchestratorSettings } from '../types/game';

export function useOrchestration(settings: OrchestratorSettings) {
  const { state, dispatch, addLog } = useGame();
  const lastCorrectionRef = useRef(0);

  useEffect(() => {
    // 每 3 秒运行一次自愈检查
    const now = Date.now();
    if (now - lastCorrectionRef.current < 3000) return;
    lastCorrectionRef.current = now;

    const result = deriveSystemCorrections(state, settings);

    result.npcPatches.forEach((patch) => {
      dispatch({ type: 'UPDATE_NPC', payload: { id: patch.id, updates: patch.updates } });
    });
    result.locationPatches.forEach((patch) => {
      dispatch({ type: 'UPDATE_LOCATION', payload: { id: patch.id, updates: patch.updates } });
    });

    const cleanedPlayerInventory = state.player.inventory.filter((it) => (it.quantity || 0) > 0);
    if (cleanedPlayerInventory.length !== state.player.inventory.length) {
      dispatch({ type: 'UPDATE_PLAYER', payload: { inventory: cleanedPlayerInventory } });
    }

    if (result.worldPatch && Object.keys(result.worldPatch).length) {
      dispatch({ type: 'UPDATE_WORLD', payload: result.worldPatch });
    }

    if (result.notes.length) {
      const recent = state.logs.slice(-3).some((l) => l.text.includes('统筹中枢'));
      if (!recent) addLog(`统筹中枢已执行纠偏：${result.notes.join('；')}`, 'system', 1);
    }
  }, [state, settings, dispatch, addLog]);
}
