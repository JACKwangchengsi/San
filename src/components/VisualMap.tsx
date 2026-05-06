import React, { useMemo, useState } from 'react';
import { Location } from '../types/game';
import { AlertTriangle, Droplets, Eye, Lock, MapPin, Skull, Users, Flame, Search, Map as MapIcon, Navigation, Building2, Trees, Mountain, Store, Coffee, Ship, Home, Crosshair, List, ChevronRight, ArrowUp, X } from 'lucide-react';

interface VisualMapProps {
  locations: Location[];
  currentLocation: string;
  onMove?: (locationId: string) => void;
  onSelectNPCByName?: (npcName: string) => void;
  npcCounts?: Record<string, number>;
  npcNames?: Record<string, string[]>;
  shopCounts?: Record<string, number>;
  factionMarks?: Record<string, string[]>;
  eventIntensity?: Record<string, number>;
}

const getAreaFromLocation = (locationName: string): string => {
  if (/渡口|山道|峡|黑水|林|荒野|野外|古道|野|原/.test(locationName)) return 'wild';
  if (/寺|庙|洞|崖|峰|门|庄|寨|教|宫|观/.test(locationName)) return 'sect';
  return 'town';
};

const getLocationTypeInfo = (name: string): { icon: React.ReactNode; label: string; iconText: string } => {
  if (/客栈|驿|旅|店/.test(name)) return { icon: <Home size={12} />, label: '客栈', iconText: '🏨' };
  if (/茶|楼|馆|肆/.test(name)) return { icon: <Coffee size={12} />, label: '茶楼', iconText: '🍵' };
  if (/市|集|铺|街|坊/.test(name)) return { icon: <Store size={12} />, label: '集市', iconText: '🏪' };
  if (/渡口|码头|船/.test(name)) return { icon: <Ship size={12} />, label: '渡口', iconText: '🚣' };
  if (/山道|山门|峰|岭|崖/.test(name)) return { icon: <Mountain size={12} />, label: '山道', iconText: '⛰️' };
  if (/寺|庙|观/.test(name)) return { icon: <Building2 size={12} />, label: '寺庙', iconText: '🏯' };
  if (/谷|峡|涧|壑/.test(name)) return { icon: <AlertTriangle size={12} />, label: '险谷', iconText: '⚠️' };
  if (/林|森/.test(name)) return { icon: <Trees size={12} />, label: '密林', iconText: '🌲' };
  if (/洞|窟|地宫|地下/.test(name)) return { icon: <Skull size={12} />, label: '洞窟', iconText: '💀' };
  if (/镇|城|村|庄/.test(name)) return { icon: <Store size={12} />, label: '村镇', iconText: '🏘️' };
  if (/宫|殿|阁|堂|院/.test(name)) return { icon: <Building2 size={12} />, label: '建筑', iconText: '🏛️' };
  return { icon: <MapPin size={12} />, label: '地点', iconText: '📍' };
};

function buildAutoLayout(areaLocations: Location[]) {
  const cols = Math.min(3, Math.max(2, Math.ceil(Math.sqrt(areaLocations.length || 1))));
  const cardW = 88;
  const cardH = 42;
  const gapX = 18;
  const gapY = 34;
  return areaLocations.map((loc, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const info = getLocationTypeInfo(loc.name);
    return { id: loc.id, x: 18 + col * (cardW + gapX), y: 24 + row * (cardH + gapY), w: cardW, h: cardH, iconText: info.iconText, iconEl: info.icon, typeLabel: info.label };
  });
}

export const VisualMap: React.FC<VisualMapProps> = ({ locations, currentLocation, onMove, onSelectNPCByName, npcCounts = {}, npcNames = {}, shopCounts = {}, factionMarks = {}, eventIntensity = {} }) => {
  const [selectedArea, setSelectedArea] = useState(getAreaFromLocation(currentLocation));
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showListView, setShowListView] = useState(false);

  const grouped = useMemo(() => {
    const map: Record<string, Location[]> = { town: [], wild: [], sect: [] };
    locations.forEach((loc) => map[getAreaFromLocation(loc.name)]?.push(loc));
    return map;
  }, [locations]);

  const currentLoc = locations.find(l => l.name === currentLocation);
  const connectedIds = currentLoc?.connectedLocations || [];
  const areaLocations = grouped[selectedArea] || [];
  const autoRooms = useMemo(() => buildAutoLayout(areaLocations), [areaLocations]);

  const roomById = useMemo(() => {
    const map: Record<string, { id: string; x: number; y: number; w: number; h: number; iconEl: React.ReactNode; typeLabel: string }> = {};
    autoRooms.forEach(r => { map[r.id] = r; });
    return map;
  }, [autoRooms]);

  const autoPaths = useMemo(() => {
    const paths: { from: [number, number]; to: [number, number]; danger?: boolean }[] = [];
    areaLocations.forEach((loc) => {
      const from = roomById[loc.id];
      if (!from) return;
      (loc.connectedLocations || []).forEach((targetId) => {
        const to = roomById[targetId];
        if (!to || loc.id > targetId) return;
        paths.push({
          from: [from.x + from.w / 2, from.y + from.h / 2],
          to: [to.x + to.w / 2, to.y + to.h / 2],
          danger: (loc.dangerLevel + (locations.find(l => l.id === targetId)?.dangerLevel || 0)) / 2 >= 50,
        });
      });
    });
    return paths;
  }, [areaLocations, roomById, locations]);

  // 搜索过滤：按名称关键词在所有区域中搜索
  const searchFiltered = useMemo(() => {
    if (!searchTerm.trim()) return null; // null 表示不启用搜索过滤
    const term = searchTerm.trim().toLowerCase();
    return locations.filter(loc =>
      loc.name.toLowerCase().includes(term) ||
      (loc.description && loc.description.toLowerCase().includes(term)) ||
      getLocationTypeInfo(loc.name).label.includes(term)
    );
  }, [searchTerm, locations]);

  // 列表视图的排序地点（可按区域分组，也可在搜索模式下显示搜索结果）
  const listViewLocations = useMemo(() => {
    return searchFiltered ?? areaLocations;
  }, [searchFiltered, areaLocations]);

  // 快速定位到当前所在区域
  const jumpToCurrentArea = () => {
    setSelectedArea(getAreaFromLocation(currentLocation));
    setSearchTerm('');
    setShowListView(false);
  };

  const getRoomColor = (loc: Location | undefined, isConnected: boolean, isCurrent: boolean) => {
    if (!loc) return '#27272a';
    if (isCurrent) return '#2563eb';
    if ((eventIntensity[loc.name] || 0) >= 3) return '#7c2d12';
    if (loc.hostilePresent >= 4) return '#7f1d1d';
    if (loc.dangerLevel >= 70) return '#991b1b';
    if (loc.dangerLevel >= 40) return '#b45309';
    if ((npcCounts[loc.name] || 0) >= 3) return '#1d4ed8';
    if (loc.isExplored) return '#166534';
    if (isConnected) return '#4338ca';
    return '#3f3f46';
  };

  const getRoomBorderColor = (loc: Location | undefined, isCurrent: boolean) => {
    if (isCurrent) return '#60a5fa';
    if (!loc) return '#52525b';
    if (loc.isLocked) return '#fbbf24';
    if ((eventIntensity[loc.name] || 0) >= 3) return '#fb923c';
    if (loc.hostilePresent > 0) return '#f87171';
    if ((npcCounts[loc.name] || 0) > 0) return '#a78bfa';
    return '#52525b';
  };

  const hoveredInfo = hoveredRoom ? locations.find(l => l.id === hoveredRoom) : null;
  const currentAreaLabel = selectedArea === 'town' ? '城镇' : selectedArea === 'wild' ? '野外' : '宗门/遗迹';
  const rows = Math.ceil(areaLocations.length / Math.min(3, Math.max(2, Math.ceil(Math.sqrt(areaLocations.length || 1)))));
  const svgHeight = Math.max(220, 40 + rows * 94);
  const isSearching = searchTerm.trim().length > 0;

  return (
    <div className="space-y-3">
      {/* 搜索栏 & 视图切换 */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="搜索地点…"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); if (e.target.value.trim()) setShowListView(true); }}
            className="w-full pl-8 pr-8 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm placeholder-zinc-500 focus:outline-none focus:border-amber-600 transition-colors"
          />
          {searchTerm && (
            <button onClick={() => { setSearchTerm(''); setShowListView(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
              <X size={14} />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowListView(!showListView)}
          title={showListView ? '切换为地图视图' : '切换为列表视图'}
          className={`p-2 rounded-lg border transition-colors ${showListView ? 'bg-amber-700 border-amber-600 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700'}`}
        >
          {showListView ? <MapIcon size={16} /> : <List size={16} />}
        </button>
        <button
          onClick={jumpToCurrentArea}
          title="定位当前位置"
          className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:bg-zinc-700 transition-colors"
        >
          <Crosshair size={16} />
        </button>
      </div>

      {/* 区域切换标签（非搜索模式下显示） */}
      {!isSearching && (
        <div className="flex gap-2 justify-center">
          {[
            { key: 'town', label: '城镇区域' },
            { key: 'wild', label: '野外区域' },
            { key: 'sect', label: '宗门/遗迹' },
          ].map((area) => (
            <button key={area.key} onClick={() => setSelectedArea(area.key)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedArea === area.key ? 'bg-amber-700 text-white shadow-lg' : getAreaFromLocation(currentLocation) === area.key ? 'bg-amber-900/50 text-amber-300 border border-amber-600' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
              {area.label}{getAreaFromLocation(currentLocation) === area.key ? ' 📍' : ''}
            </button>
          ))}
        </div>
      )}

      {/* 列表视图 */}
      {showListView && (
        <div className="bg-zinc-900 rounded-lg border border-zinc-700 divide-y divide-zinc-800 max-h-[400px] overflow-y-auto">
          {listViewLocations.length === 0 ? (
            <div className="p-6 text-center text-zinc-500 text-sm">
              <Search size={24} className="mx-auto mb-2 text-zinc-600" />
              没有找到匹配的地点
            </div>
          ) : (
            listViewLocations.map((loc) => {
              const isCurrent = loc.name === currentLocation;
              const isConnected = connectedIds.includes(loc.id);
              const info = getLocationTypeInfo(loc.name);
              const canMove = isConnected && !loc.isLocked;
              return (
                <div
                  key={loc.id}
                  onClick={() => { if (canMove) onMove?.(loc.id); }}
                  className={`flex items-center gap-3 p-3 transition-colors ${isCurrent ? 'bg-blue-900/30 border-l-2 border-blue-500' : canMove ? 'cursor-pointer hover:bg-zinc-800/80' : 'opacity-50 cursor-default'}`}
                >
                  <span className="text-lg">{info.iconText}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium truncate ${isCurrent ? 'text-blue-300' : 'text-white'}`}>{loc.name}</span>
                      {isCurrent && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-700/50 text-blue-300 whitespace-nowrap">当前</span>}
                      {loc.isLocked && <Lock size={12} className="text-yellow-400 shrink-0" />}
                      {loc.isExplored && !isCurrent && <Eye size={12} className="text-green-400 shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-500">
                      <span className={loc.dangerLevel >= 50 ? 'text-red-400' : loc.dangerLevel >= 20 ? 'text-yellow-400' : 'text-green-400'}>危险{loc.dangerLevel}%</span>
                      {(npcCounts[loc.name] || 0) > 0 && <span>👥{npcCounts[loc.name]}</span>}
                      {(shopCounts[loc.name] || 0) > 0 && <span>🏪{shopCounts[loc.name]}</span>}
                      {(eventIntensity[loc.name] || 0) > 0 && <span>🔥</span>}
                    </div>
                  </div>
                  {isConnected && !loc.isLocked && !isCurrent && (
                    <ChevronRight size={16} className="text-zinc-600 shrink-0" />
                  )}
                  {!isConnected && !isCurrent && (
                    <span className="text-[10px] text-zinc-600 whitespace-nowrap">不可达</span>
                  )}
                </div>
              );
            })
          )}
          {isSearching && (
            <div className="p-2 text-center text-[11px] text-zinc-600">
              共找到 {listViewLocations.length} 个地点
            </div>
          )}
        </div>
      )}

      {/* 地图视图（SVG） */}
      {!showListView && (
        <div className="bg-zinc-900 rounded-lg border border-zinc-700 p-3">
        <svg viewBox={`0 0 330 ${svgHeight}`} className="w-full h-auto">
          <defs>
            <linearGradient id="mapBg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#171717" /><stop offset="100%" stopColor="#0f172a" /></linearGradient>
          </defs>
          <rect x="0" y="0" width="330" height={svgHeight} fill="url(#mapBg)" rx="10" />
          <text x="165" y="16" textAnchor="middle" fill="#a1a1aa" fontSize="10">{currentAreaLabel} · 江湖节点地图</text>

          {autoPaths.map((path, idx) => <line key={idx} x1={path.from[0]} y1={path.from[1]} x2={path.to[0]} y2={path.to[1]} stroke={path.danger ? '#7f1d1d' : '#52525b'} strokeWidth={2} strokeDasharray={path.danger ? '4 3' : '3 3'} opacity="0.8" />)}

          {autoRooms.map((room) => {
            const loc = locations.find(l => l.id === room.id);
            const isCurrent = loc?.name === currentLocation;
            const isConnected = loc ? connectedIds.includes(loc.id) : false;
            const fillColor = getRoomColor(loc, isConnected, isCurrent);
            const borderColor = getRoomBorderColor(loc, isCurrent);
            const shortName = (loc?.name || room.id).length > 7 ? `${(loc?.name || room.id).slice(0, 7)}…` : (loc?.name || room.id);
            const names = npcNames[loc?.name || ''] || [];
            return (
              <g key={room.id} onMouseEnter={() => setHoveredRoom(room.id)} onMouseLeave={() => setHoveredRoom(null)} onClick={() => { if (loc && isConnected && !loc.isLocked) onMove?.(loc.id); }} style={{ cursor: isConnected && loc && !loc.isLocked ? 'pointer' : 'default' }}>
                <rect x={room.x} y={room.y} width={room.w} height={room.h} fill={fillColor} stroke={borderColor} strokeWidth={isCurrent ? 3 : 1.5} rx={7} ry={7} style={{ opacity: loc?.isLocked ? 0.55 : 1 }} />
                <text x={room.x + 7} y={room.y + 17} fontSize={13}>{room.iconText}</text>
                <text x={room.x + 26} y={room.y + 17} textAnchor="start" fill="white" fontSize={9}>{shortName}</text>
                {isCurrent && <circle cx={room.x + room.w - 10} cy={room.y + 10} r={5} fill="#60a5fa" className="animate-ping" />}
                {loc?.isLocked && <text x={room.x + room.w - 16} y={room.y + 13} fontSize={10}>🔒</text>}
                {loc && loc.hostilePresent > 0 && <text x={room.x + 5} y={room.y + room.h - 7} fontSize={10}>💀{loc.hostilePresent > 1 ? loc.hostilePresent : ''}</text>}
                {(npcCounts[loc?.name || ''] || 0) > 0 && <text x={room.x + room.w - 20} y={room.y + room.h - 8} fontSize={10}>👥{npcCounts[loc?.name || '']}</text>}
                {(shopCounts[loc?.name || ''] || 0) > 0 && <text x={room.x + 25} y={room.y + room.h - 8} fontSize={10}>🏪{shopCounts[loc?.name || '']}</text>}
                {factionMarks[loc?.name || '']?.length ? <text x={room.x + room.w / 2} y={room.y + room.h - 8} textAnchor="middle" fontSize={10}>{factionMarks[loc?.name || ''][0]}</text> : null}
                {(eventIntensity[loc?.name || ''] || 0) > 0 ? <text x={room.x + room.w - 10} y={room.y + room.h - 8} textAnchor="middle" fontSize={10}>🔥</text> : null}
                {names.length > 0 && (
                  <g>
                    <rect x={room.x + 4} y={room.y + room.h + 4} width={room.w - 8} height={14} rx={7} fill="#09090b" opacity="0.85" />
                    <text x={room.x + room.w / 2} y={room.y + room.h + 13} textAnchor="middle" fontSize={8} fill="#d4d4d8">
                      {names.slice(0, 2).join('、')}{names.length > 2 ? `等${names.length}人` : ''}
                    </text>
                    {names.length > 0 && (
                      <rect x={room.x + 4} y={room.y + room.h + 4} width={room.w - 8} height={14} rx={7} fill="transparent" style={{ cursor: onSelectNPCByName ? 'pointer' : 'default' }} onClick={(e) => { e.stopPropagation(); onSelectNPCByName?.(names[0]); }} />
                    )}
                  </g>
                )}
                {loc?.isExplored && !isCurrent && <circle cx={room.x + room.w - 7} cy={room.y + room.h - 7} r={3} fill="#22c55e" />}
              </g>
            );
          })}
        </svg>
      </div>
      )}

      {!showListView && hoveredInfo && (
        <div className="bg-zinc-800 rounded-lg p-3 border border-zinc-700 animate-fade-in">
          <div className="flex items-center gap-2 mb-2"><MapPin size={14} className="text-amber-400" /><span className="font-medium text-white">{hoveredInfo.name}</span></div>
          <p className="text-xs text-zinc-400 mb-2">{hoveredInfo.description}</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className={`px-2 py-0.5 rounded ${hoveredInfo.dangerLevel >= 50 ? 'bg-red-900/50 text-red-300' : hoveredInfo.dangerLevel >= 20 ? 'bg-yellow-900/50 text-yellow-300' : 'bg-green-900/50 text-green-300'}`}><AlertTriangle size={10} className="inline mr-1" />危险 {hoveredInfo.dangerLevel}%</span>
            {hoveredInfo.hostilePresent > 0 && <span className="px-2 py-0.5 rounded bg-red-900/50 text-red-300"><Skull size={10} className="inline mr-1" />敌影 x{hoveredInfo.hostilePresent}</span>}
            {(npcCounts[hoveredInfo.name] || 0) > 0 && <span className="px-2 py-0.5 rounded bg-indigo-900/50 text-indigo-300"><Users size={10} className="inline mr-1" />人物 x{npcCounts[hoveredInfo.name]}</span>}
            {(shopCounts[hoveredInfo.name] || 0) > 0 && <span className="px-2 py-0.5 rounded bg-amber-900/50 text-amber-300">🏪 商铺 x{shopCounts[hoveredInfo.name]}</span>}
            {factionMarks[hoveredInfo.name]?.length ? <span className="px-2 py-0.5 rounded bg-purple-900/50 text-purple-300">⚑ {factionMarks[hoveredInfo.name].join(' / ')}</span> : null}
            {(eventIntensity[hoveredInfo.name] || 0) > 0 ? <span className="px-2 py-0.5 rounded bg-orange-900/50 text-orange-300">🔥 异动 {eventIntensity[hoveredInfo.name]}</span> : null}
            {hoveredInfo.hasWater && <span className="px-2 py-0.5 rounded bg-blue-900/50 text-blue-300"><Droplets size={10} className="inline mr-1" />有水</span>}
            {hoveredInfo.noiseLevel >= 50 && <span className="px-2 py-0.5 rounded bg-orange-900/50 text-orange-300"><Flame size={10} className="inline mr-1" />喧闹</span>}
            {hoveredInfo.isLocked && <span className="px-2 py-0.5 rounded bg-yellow-900/50 text-yellow-300"><Lock size={10} className="inline mr-1" />封锁</span>}
            {hoveredInfo.isExplored ? <span className="px-2 py-0.5 rounded bg-green-900/50 text-green-300"><Eye size={10} className="inline mr-1" />已探明</span> : <span className="px-2 py-0.5 rounded bg-zinc-700 text-zinc-400">未探明</span>}
          </div>
          {(npcNames[hoveredInfo.name] || []).length > 0 && <div className="mt-2 text-[11px] text-zinc-400">在场人物：{npcNames[hoveredInfo.name].join('、')}</div>}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-blue-600 border border-blue-400"></div><span className="text-zinc-400">当前</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-green-700"></div><span className="text-zinc-400">已探明</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-indigo-700"></div><span className="text-zinc-400">可前往</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-red-900"></div><span className="text-zinc-400">危险</span></div>
        <div className="flex items-center gap-2"><span className="text-sm">👥</span><span className="text-zinc-400">人物气泡</span></div>
        <div className="flex items-center gap-2"><span className="text-sm">🏪</span><span className="text-zinc-400">商铺</span></div>
        <div className="flex items-center gap-2"><span className="text-sm">⚑</span><span className="text-zinc-400">势力标记</span></div>
        <div className="flex items-center gap-2"><span className="text-sm">🔥</span><span className="text-zinc-400">事件热度</span></div>
      </div>
    </div>
  );
};

export default VisualMap;
