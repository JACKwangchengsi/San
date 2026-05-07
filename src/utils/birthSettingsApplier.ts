/**
 * applyBirthSettings — 将出身设定应用到游戏状态
 * 从 GameLayout.handleBirthSettingsComplete 提取
 */
import type { BirthSettings, GameState } from '../types/game';
import type { Action } from '../context/GameContext';
import { createLog, createItem } from '../context/GameContext';

export interface BirthSettingsApplyParams {
  settings: BirthSettings;
  state: GameState;
  dispatch: React.Dispatch<Action>;
  addLog: (text: string, type: import('../types/game').LogEntry['type'], importance?: number) => void;
}

export function applyBirthSettings({ settings, state, dispatch, addLog }: BirthSettingsApplyParams): void {
  const updates: Record<string, unknown> = {};

  if (settings.name) {
    updates.name = settings.name;
  }
  if (settings.gender) {
    updates.gender = settings.gender;
  }

  // 根据有效出身类型调整初始属性
  switch (settings.origin) {
    case 'merchant':
      updates.currency = { silver: 30, copper: 500 };
      updates.jianghuFame = 5;
      break;
    case 'scholar':
      updates.currency = { silver: 10, copper: 200 };
      break;
    case 'beggar':
    case 'begger':
      updates.currency = { silver: 0, copper: 10 };
      updates.jianghuFame = -5;
      break;
    case 'farmer':
      updates.currency = { silver: 3, copper: 50 };
      break;
    case 'soldier':
      updates.currency = { silver: 20, copper: 300 };
      updates.jianghuFame = 15;
      break;
    default:
      updates.currency = { silver: 10, copper: 100 };
  }

  if (Object.keys(updates).length) {
    dispatch({ type: 'UPDATE_PLAYER', payload: updates });
  }

  // 起始物品（带 id）
  if (settings.origin === 'farmer') {
    const hoe = createItem({ id: `item_hoe_${Date.now()}`, name: '锄头', type: 'tool', rarity: 'common', quantity: 1, description: '一把农具锄头' });
    dispatch({ type: 'ADD_ITEM', payload: hoe });
  } else if (settings.origin === 'scholar') {
    const brush = createItem({ id: `item_brush_${Date.now()}`, name: '毛笔', type: 'misc', rarity: 'common', quantity: 1, description: '一支文人毛笔' });
    dispatch({ type: 'ADD_ITEM', payload: brush });
  } else if (settings.origin === 'soldier') {
    const sword = createItem({ id: `item_sword_${Date.now()}`, name: '军刀', type: 'weapon', rarity: 'common', quantity: 1, description: '一把制式军刀' });
    dispatch({ type: 'ADD_ITEM', payload: sword });
  }

  addLog(`🎭 出身已定：${settings.name || '无名侠客'}，${settings.origin === 'beggar' ? 'begger' : settings.origin}出身`, 'system', 3);
}
