import React, { useState } from 'react';
import { Item, ItemType } from '../types/game';
import { useGame } from '../context/GameContext';
import { getItemVisual, getItemTypeLabel } from '../utils/itemVisuals';

interface ItemInteractionProps {
  item: Item;
  onClose: () => void;
}

const ItemInteraction: React.FC<ItemInteractionProps> = ({ item, onClose }) => {
  const { state, dispatch, addLog, useItem } = useGame();
  const [activeTab, setActiveTab] = useState<'info' | 'use' | 'combine' | 'device'>('info');
  const [noteDraft, setNoteDraft] = useState('');

  const combineRecipes: Record<string, { items: string[]; result: { name: string; type: string; description: string } }> = {
    '止血药包': { items: ['草药', '布条'], result: { name: '止血药包', type: 'medicine', description: '简单包扎外伤用的药包' } },
    '火把': { items: ['木棍', '布条'], result: { name: '简易火把', type: 'tool', description: '夜行照明之物，需要点燃' } },
    '钉棒': { items: ['木棍', '铁钉'], result: { name: '钉头棒', type: 'weapon', description: '钉满铁钉的木棒，适合近身缠斗' } },
    '净水': { items: ['浑水', '净水丸'], result: { name: '清水', type: 'drink', description: '经过净化的饮水' } },
    '药囊': { items: ['草药', '麻绳', '布袋'], result: { name: '草药囊', type: 'medicine', description: '装满草药的小药囊' } },
    '简易弩箭': { items: ['箭杆', '铁片', '羽毛'], result: { name: '简易弩箭', type: 'weapon', description: '临时拼成的箭支' } },
  };

  const getCombinable = () => {
    const inventory = state.player.inventory;
    const possibleCombines: { recipe: string; missing: string[] }[] = [];
    Object.entries(combineRecipes).forEach(([recipeName, recipe]) => {
      if (recipe.items.includes(item.name)) {
        const missing = recipe.items.filter(reqItem => reqItem !== item.name && !inventory.some(i => i.name === reqItem));
        possibleCombines.push({ recipe: recipeName, missing });
      }
    });
    return possibleCombines;
  };

  const handleCombine = (recipeName: string) => {
    const recipe = combineRecipes[recipeName];
    if (!recipe) return;
    const hasAllItems = recipe.items.every(reqItem => state.player.inventory.some(i => i.name === reqItem));
    if (!hasAllItems) { addLog('缺少必要的材料！', 'warning', 3); return; }
    recipe.items.forEach(reqItem => {
      const invItem = state.player.inventory.find(i => i.name === reqItem);
      if (!invItem) return;
      if (invItem.quantity > 1) dispatch({ type: 'UPDATE_ITEM', payload: { id: invItem.id, updates: { quantity: invItem.quantity - 1 } } });
      else dispatch({ type: 'REMOVE_ITEM', payload: invItem.id });
    });
    dispatch({
      type: 'ADD_ITEM',
      payload: {
        id: `crafted_${Date.now()}`,
        name: recipe.result.name,
        description: recipe.result.description,
        type: recipe.result.type as ItemType,
        rarity: 'uncommon', quantity: 1, maxStack: 10, weight: 0.3,
        isConsumable: recipe.result.type === 'medicine' || recipe.result.type === 'food' || recipe.result.type === 'drink',
        isReusable: recipe.result.type === 'tool' || recipe.result.type === 'weapon',
        createdAt: Date.now(), modifiedAt: Date.now()
      }
    });
    addLog(`🔧 成功制作了 ${recipe.result.name}！`, 'discovery', 4);
    dispatch({ type: 'ADVANCE_TIME', payload: 10 });
    onClose();
  };

  const handleUseDevice = (action: 'lantern' | 'pigeon' | 'compass' | 'notes') => {
    if ((item.deviceData?.battery || 0) < 3) {
      addLog(`${item.name}的灯油或灵机不足，暂时无法使用。`, 'warning', 2);
      return;
    }
    if (action === 'lantern') addLog('你举起灯笼，昏黄的火光让周围轮廓清晰了许多。', 'system', 2);
    if (action === 'pigeon') addLog('你整理好字条，试着以信鸽传讯，但不知对方能否收到。', 'system', 2);
    if (action === 'compass') addLog('你掏出罗盘辨认方位，重新确认了山道与镇口方向。', 'system', 2);
    if (action === 'notes') addLog(`你记下了当前见闻：${noteDraft || '无特别备注。'}`, 'system', 2);
    dispatch({ type: 'UPDATE_ITEM', payload: { id: item.id, updates: { deviceData: { ...item.deviceData, battery: Math.max(0, (item.deviceData?.battery || 100) - 3) } } } });
  };

  const handleRefuel = () => {
    const oil = state.player.inventory.find(i => /灯油|油壶|桐油/.test(i.name));
    if (!oil) {
      addLog('你身上没有可补充的灯油。', 'warning', 2);
      return;
    }
    if (oil.quantity > 1) dispatch({ type: 'UPDATE_ITEM', payload: { id: oil.id, updates: { quantity: oil.quantity - 1 } } });
    else dispatch({ type: 'REMOVE_ITEM', payload: oil.id });
    dispatch({ type: 'UPDATE_ITEM', payload: { id: item.id, updates: { deviceData: { ...item.deviceData, battery: Math.min(100, (item.deviceData?.battery || 0) + 40) } } } });
    addLog(`你为${item.name}添了灯油。`, 'system', 2);
  };

  const combinables = getCombinable();
  const isDevice = item.type === 'device' || /灯笼|火折|信鸽|罗盘|机关/.test(item.name);
  const visual = getItemVisual(item);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col animate-zoom-in">
        <div className="p-4 border-b border-gray-700 flex items-center gap-3">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ring-1 ${visual.bgClass} ${visual.ringClass}`}>
            {visual.emoji}
          </div>
          <div className="flex-1"><h3 className="text-lg font-bold text-white">{item.name}</h3><p className="text-sm text-gray-400">{getItemTypeLabel(item.type)} · {item.rarity} · {item.weight}kg{item.quantity > 1 && ` · x${item.quantity}`}</p></div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        <div className="flex border-b border-gray-700">
          <button onClick={() => setActiveTab('info')} className={`flex-1 py-2 text-sm ${activeTab === 'info' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'}`}>📋 信息</button>
          <button onClick={() => setActiveTab('use')} className={`flex-1 py-2 text-sm ${activeTab === 'use' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'}`}>✋ 使用</button>
          {combinables.length > 0 && <button onClick={() => setActiveTab('combine')} className={`flex-1 py-2 text-sm ${activeTab === 'combine' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'}`}>🔧 组合</button>}
          {isDevice && <button onClick={() => setActiveTab('device')} className={`flex-1 py-2 text-sm ${activeTab === 'device' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'}`}>🪔 器具</button>}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'info' && (
            <div className="space-y-3">
              <p className="text-gray-300">{item.description}</p>
              {item.effects && item.effects.length > 0 && (
                <div className="bg-gray-800 rounded p-3">
                  <h4 className="text-sm font-bold text-green-400 mb-2">效果</h4>
                  {item.effects.map((eff, i) => <div key={i} className="text-sm text-gray-300">{eff.stat}: {eff.value > 0 ? '+' : ''}{eff.value}{eff.duration && ` (${eff.duration}分钟)`}</div>)}
                </div>
              )}
              {item.weaponData && (
                <div className="bg-gray-800 rounded p-3">
                  <h4 className="text-sm font-bold text-red-400 mb-2">兵器属性</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-300">
                    <div>伤害: {item.weaponData.damage}</div>
                    <div>范围: {item.weaponData.range}m</div>
                    <div>精准: {item.weaponData.accuracy}%</div>
                    <div>动静: {item.weaponData.noiseLevel}</div>
                  </div>
                </div>
              )}
              {isDevice && (
                <div className="bg-gray-800 rounded p-3">
                  <h4 className="text-sm font-bold text-blue-400 mb-2">器具状态</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">灯油/灵机:</span>
                    <div className="flex-1 h-3 bg-gray-700 rounded-full overflow-hidden"><div className={`h-full transition-all ${(item.deviceData?.battery || 0) > 50 ? 'bg-green-500' : (item.deviceData?.battery || 0) > 20 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${item.deviceData?.battery || 0}%` }} /></div>
                    <span className="text-sm text-white">{item.deviceData?.battery || 0}%</span>
                  </div>
                </div>
              )}
              {item.durability !== undefined && (
                <div className="bg-gray-800 rounded p-3">
                  <h4 className="text-sm font-bold text-yellow-400 mb-2">耐久</h4>
                  <div className="flex items-center gap-2"><div className="flex-1 h-3 bg-gray-700 rounded-full overflow-hidden"><div className="h-full bg-yellow-500 transition-all" style={{ width: `${(item.durability / (item.maxDurability || 100)) * 100}%` }} /></div><span className="text-sm text-white">{item.durability}/{item.maxDurability}</span></div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'use' && (
            <div className="space-y-3">
              {item.isConsumable && <button onClick={() => { useItem(item.id); onClose(); }} className="w-full py-3 bg-green-600 hover:bg-green-500 rounded-lg text-white font-bold transition-all hover:scale-105">🍽️ 使用物品</button>}
              {isDevice && (item.deviceData?.battery || 0) < 100 && <button onClick={handleRefuel} className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-bold transition-all hover:scale-105">🪔 添补灯油 / 灵机</button>}
              {item.type === 'weapon' && <button onClick={() => { dispatch({ type: 'UPDATE_ITEM', payload: { id: item.id, updates: { isEquipped: !item.isEquipped } } }); addLog(`${item.isEquipped ? '收起' : '装备'}了 ${item.name}`, 'system', 2); onClose(); }} className="w-full py-3 bg-red-600 hover:bg-red-500 rounded-lg text-white font-bold transition-all hover:scale-105">⚔️ {item.isEquipped ? '收起兵器' : '装备兵器'}</button>}
              <button onClick={() => {
                const hasContents = item.containerData?.contents && item.containerData.contents.length > 0;
                const confirmText = hasContents ? `【注意】${item.name}内仍有物件，确定连同内容物一起丢弃吗？` : `确定要丢弃 ${item.name} 吗？`;
                if (confirm(confirmText)) {
                  dispatch({ type: 'REMOVE_ITEM', payload: item.id });
                  addLog(`丢弃了 ${item.name}${hasContents ? '（含内部物件）' : ''}`, 'system', 2);
                  onClose();
                }
              }} className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 font-bold transition-all">🗑️ 丢弃</button>
            </div>
          )}

          {activeTab === 'combine' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-400 mb-3">可以与其他物品组合制成新的江湖器物</p>
              {combinables.map((combo, i) => (
                <div key={i} className="bg-gray-800 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2"><span className="text-white font-bold">{combo.recipe}</span>{combo.missing.length === 0 ? <span className="text-green-400 text-sm">✓ 可制作</span> : <span className="text-red-400 text-sm">缺少材料</span>}</div>
                  {combo.missing.length > 0 && <p className="text-sm text-gray-400">需要: {combo.missing.join('、')}</p>}
                  {combo.missing.length === 0 && <button onClick={() => handleCombine(combo.recipe)} className="mt-2 w-full py-2 bg-green-600 hover:bg-green-500 rounded text-white font-bold text-sm transition-all">🔧 制作</button>}
                </div>
              ))}
              {combinables.length === 0 && <p className="text-gray-500 text-center py-4">没有可用的组合配方</p>}
            </div>
          )}

          {activeTab === 'device' && isDevice && (
            <div className="space-y-3">
              {(item.deviceData?.battery || 0) < 20 && <div className="bg-red-900/50 border border-red-500 rounded p-2 text-red-400 text-sm animate-pulse">⚠️ 灯油或灵机不足，请及时补充。</div>}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => handleUseDevice('lantern')} className="py-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-center transition-all"><div className="text-xl">🪔</div><div className="text-xs text-gray-400 mt-1">灯笼照明</div></button>
                <button onClick={() => handleUseDevice('pigeon')} className="py-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-center transition-all"><div className="text-xl">🕊️</div><div className="text-xs text-gray-400 mt-1">飞鸽传讯</div></button>
                <button onClick={() => handleUseDevice('compass')} className="py-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-center transition-all"><div className="text-xl">🧭</div><div className="text-xs text-gray-400 mt-1">罗盘辨位</div></button>
                <button onClick={() => handleUseDevice('notes')} className="py-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-center transition-all"><div className="text-xl">📜</div><div className="text-xs text-gray-400 mt-1">记闻录</div></button>
              </div>
              <div className="bg-gray-800 rounded-lg p-3">
                <h4 className="text-white font-bold text-sm mb-2">📜 记闻补充</h4>
                <textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder="记下当前见闻、人物去向、地形与线索……" className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white text-sm resize-none h-20" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ItemInteraction;
