import React, { useState } from 'react';
import { Item } from '../types/game';
import {
  Package, ScrollText, Trash2, Zap,
  Sword, Pill, UtensilsCrossed, Droplets, Wrench,
  Key, Box, Eye, ChevronDown, ChevronRight, Battery,
  RefreshCw, Shirt, Hammer, FlaskConical, Scroll
} from 'lucide-react';
import { getItemVisual, getItemTypeLabel, getItemIconAsset } from '../utils/itemVisuals';

interface InventoryProps {
  items: Item[];
  onUse: (item: Item) => void;
  onDrop: (itemId: string) => void;
  onSelect?: (item: Item) => void;
  onRefill?: (itemId: string) => void;
}

const getItemIcon = (type: string) => {
  switch (type) {
    case 'device': return ScrollText;
    case 'document': return ScrollText;
    case 'weapon': return Sword;
    case 'medicine': return Pill;
    case 'food': return UtensilsCrossed;
    case 'drink': return Droplets;
    case 'tool': return Wrench;
    case 'clothing': return Shirt;
    case 'key': return Key;
    case 'container': return Box;
    default: return Package;
  }
};

const getRarityColor = (rarity: string) => {
  switch (rarity) {
    case 'legendary': return 'border-yellow-500 bg-yellow-500/10 rarity-legendary';
    case 'epic': return 'border-purple-500 bg-purple-500/10 rarity-epic';
    case 'rare': return 'border-blue-500 bg-blue-500/10 rarity-rare';
    case 'uncommon': return 'border-green-500 bg-green-500/10';
    default: return 'border-zinc-700 bg-zinc-800/50';
  }
};

const getTypeLabel = (type: string) => getItemTypeLabel(type);

const getItemHint = (item: Item): { icon: React.ReactNode; text: string } => {
  if (item.type === 'food') return { icon: <UtensilsCrossed size={10} className="text-orange-400" />, text: '可果腹' };
  if (item.type === 'drink') return { icon: <Droplets size={10} className="text-blue-400" />, text: '可解渴' };
  if (item.type === 'medicine') return { icon: <Pill size={10} className="text-emerald-400" />, text: '可疗伤/解毒' };
  if (item.type === 'weapon') return { icon: <Sword size={10} className="text-red-400" />, text: '可装备战斗' };
  if (item.type === 'device') return { icon: <FlaskConical size={10} className="text-purple-400" />, text: '可作为江湖器具使用' };
  if (item.type === 'tool') return { icon: <Hammer size={10} className="text-yellow-400" />, text: '可用于制作与机关操作' };
  if (item.type === 'document') return { icon: <Scroll size={10} className="text-violet-400" />, text: '可翻阅查阅' };
  return { icon: <Package size={10} className="text-zinc-400" />, text: '普通物品' };
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'food': return 'text-orange-400';
    case 'drink': return 'text-blue-400';
    case 'weapon': return 'text-red-400';
    case 'medicine': return 'text-green-400';
    case 'device': return 'text-purple-400';
    case 'tool': return 'text-yellow-400';
    default: return 'text-zinc-400';
  }
};

const ItemVisualIcon: React.FC<{ item: Item }> = ({ item }) => {
  const visual = getItemVisual(item);
  const asset = getItemIconAsset(item);
  const fallback = getItemIcon(item.type);
  const [failed, setFailed] = useState(false);
  const FallbackIcon = fallback;

  return (
    <div className={`p-1.5 rounded ring-1 ${visual.bgClass} ${visual.ringClass} flex items-center justify-center min-w-10 h-10 overflow-hidden relative`}>
      {asset && !failed ? (
        <img
          src={asset}
          alt={item.name}
          className="w-6 h-6 object-contain drop-shadow-sm"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <>
          <span className="text-xl leading-none" aria-hidden="true">{visual.emoji}</span>
          <FallbackIcon size={11} className="absolute bottom-0.5 right-0.5 text-white/60" />
        </>
      )}
    </div>
  );
};

export const Inventory: React.FC<InventoryProps> = ({ items, onUse, onDrop, onSelect, onRefill }) => {
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const [confirmDrop, setConfirmDrop] = useState<string | null>(null);
  
  const totalWeight = items.reduce((sum, item) => sum + (item.weight * item.quantity), 0);

  if (items.length === 0) {
    return (
      <div className="text-zinc-500 text-sm italic p-8 text-center">
        <Package size={48} className="mx-auto mb-4 opacity-30" />
        <p>背包是空的</p>
        <p className="text-xs mt-2">搜索周围环境获取物资</p>
      </div>
    );
  }

  const groupedItems = items.reduce((acc, item) => {
    const type = item.type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(item);
    return acc;
  }, {} as Record<string, Item[]>);

  const typeOrder = ['food', 'drink', 'medicine', 'weapon', 'tool', 'device', 'container', 'document', 'clothing', 'material', 'misc'];
  const sortedTypes = Object.keys(groupedItems).sort((a, b) => typeOrder.indexOf(a) - typeOrder.indexOf(b));

  return (
    <div className="space-y-3 mobile-text-xs">
      <div className="flex justify-between items-center text-xs bg-zinc-800/50 p-2 rounded-lg border border-zinc-700">
        <div className="flex items-center gap-2">
          <Package size={14} className="text-zinc-400" />
          <span className="text-zinc-300">{items.length} 件物品</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-zinc-500">重量:</span>
          <span className={totalWeight > 15 ? 'text-orange-400' : 'text-zinc-300'}>{totalWeight.toFixed(1)} kg</span>
          <span className="text-zinc-600">/ 20 kg</span>
        </div>
      </div>

      {sortedTypes.map((type) => {
        const typeItems = groupedItems[type];
        const isExpanded = expandedType === type || expandedType === null;
        const Icon = getItemIcon(type);
        return (
          <div key={type} className="border border-zinc-800 rounded-lg overflow-hidden">
            <button
              onClick={() => setExpandedType(expandedType === type ? null : type)}
              className="w-full flex items-center justify-between p-2 bg-zinc-900/50 hover:bg-zinc-800/50 transition"
            >
              <div className="flex items-center gap-2">
                <Icon size={14} className={getTypeColor(type)} />
                <span className="text-sm font-medium text-zinc-300">{getTypeLabel(type)}</span>
                <span className="text-xs text-zinc-500">({typeItems.length})</span>
              </div>
              {isExpanded ? <ChevronDown size={14} className="text-zinc-500" /> : <ChevronRight size={14} className="text-zinc-500" />}
            </button>

            {isExpanded && (
              <div className="p-2 space-y-1.5">
                {typeItems.map((item) => {
                  const visual = getItemVisual(item);
                  const isDropConfirm = confirmDrop === item.id;

                  return (
                    <div key={item.id} className={`p-2.5 rounded-lg border transition-all ${getRarityColor(item.rarity)} hover:shadow-md hover-lift`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer" onClick={() => onSelect?.(item)}>
                          <ItemVisualIcon item={item} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-zinc-200 truncate max-w-[180px]">{item.name}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${visual.bgClass} ${visual.textClass} ${visual.ringClass}`}>{visual.label}</span>
                              {item.quantity > 1 && (
                                <span className="text-xs bg-zinc-700 px-1.5 py-0.5 rounded text-zinc-300">x{item.quantity}</span>
                              )}
                            </div>

                            {(item.deviceData?.battery !== undefined || item.durability !== undefined) && (
                              <div className="flex items-center gap-1 mt-1">
                                <Battery size={10} className="text-zinc-500" />
                                <div className="w-16 h-1 bg-zinc-700 rounded-full overflow-hidden">
                                  <div
                                    className={`${(item.deviceData?.battery || item.durability || 0) > 30 ? 'bg-green-500' : 'bg-red-500'} h-full`}
                                    style={{ width: `${item.deviceData?.battery || (item.durability && item.maxDurability ? (item.durability / item.maxDurability) * 100 : 0)}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-zinc-500">{item.deviceData?.battery || item.durability}%</span>
                              </div>
                            )}

                            {item.maxUses !== undefined && (
                              <div className="flex items-center gap-1 mt-1">
                                <Droplets size={10} className="text-blue-400" />
                                <div className="w-16 h-1 bg-zinc-700 rounded-full overflow-hidden">
                                  <div className={`${(item.currentUses || 0) > 0 ? 'bg-blue-400' : 'bg-zinc-600'} h-full`} style={{ width: `${((item.currentUses || 0) / item.maxUses) * 100}%` }} />
                                </div>
                                <span className="text-[10px] text-zinc-500">{item.currentUses || 0}/{item.maxUses}次</span>
                                {item.canRefill && (item.currentUses || 0) < item.maxUses && (
                                  <span className="text-[10px] text-cyan-400">可填充</span>
                                )}
                              </div>
                            )}

                            {item.effects && item.effects.length > 0 ? (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {item.effects.map((effect, i) => (
                                  <span key={i} className={`text-[10px] ${effect.value > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {effect.value > 0 ? '+' : ''}{effect.value} {effect.stat}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <div className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
                                {(() => { const hint = getItemHint(item); return <>{hint.icon} <span>{hint.text}</span></>; })()}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-1 ml-2">
                          <button onClick={(e) => { e.stopPropagation(); onSelect?.(item); }} className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white transition" title="查看详情">
                            <Eye size={14} />
                          </button>

                          {(item.isConsumable || item.type === 'device' || item.type === 'container' || item.effects || item.maxUses) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onUse(item); }}
                              className={`p-1.5 rounded transition ${item.maxUses !== undefined && (item.currentUses || 0) <= 0 ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed' : 'bg-blue-600/30 hover:bg-blue-600 text-blue-400 hover:text-white'}`}
                              title={item.maxUses !== undefined && (item.currentUses || 0) <= 0 ? '已用完' : '使用'}
                              disabled={item.maxUses !== undefined && (item.currentUses || 0) <= 0}
                            >
                              <Zap size={14} />
                            </button>
                          )}

                          {item.canRefill && (item.currentUses || 0) < (item.maxUses || 0) && onRefill && (
                            <button onClick={(e) => { e.stopPropagation(); onRefill(item.id); }} className="p-1.5 bg-cyan-600/30 hover:bg-cyan-600 rounded text-cyan-400 hover:text-white transition" title="填充">
                              <RefreshCw size={14} />
                            </button>
                          )}

                          {isDropConfirm ? (
                            <div className="flex gap-1">
                              <button onClick={(e) => { e.stopPropagation(); onDrop(item.id); setConfirmDrop(null); }} className="p-1.5 bg-red-600 rounded text-white text-xs">确认</button>
                              <button onClick={(e) => { e.stopPropagation(); setConfirmDrop(null); }} className="p-1.5 bg-zinc-600 rounded text-white text-xs">取消</button>
                            </div>
                          ) : (
                            <button onClick={(e) => { e.stopPropagation(); setConfirmDrop(item.id); }} className="p-1.5 hover:bg-red-600/30 rounded text-zinc-500 hover:text-red-400 transition" title="丢弃">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <div className="text-xs text-zinc-600 pt-2 border-t border-zinc-800 flex items-center gap-2">
        <Eye size={12} className="text-zinc-500" />
        <span>点击物品查看详情</span>
        <Zap size={12} className="text-zinc-500 ml-2" />
        <span>使用物品</span>
      </div>
    </div>
  );
};
