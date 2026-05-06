import React, { useState } from 'react';
import { Location, LogEntry } from '../types/game';
import { MapPin, Lock, AlertTriangle, Zap, Droplets, Eye, EyeOff, ChevronRight, Skull, Map, List, Users, Package, Search, Shield, Lightbulb } from 'lucide-react';
import VisualMap from './VisualMap';
import MapEventPanel from './MapEventPanel';

interface LocationPanelProps {
  locations: Location[];
  currentLocation: string;
  onMove?: (locationId: string) => void;
  onSelectNPCByName?: (npcName: string) => void;
  npcCounts?: Record<string, number>;
  npcNames?: Record<string, string[]>;
  shopCounts?: Record<string, number>;
  factionMarks?: Record<string, string[]>;
  eventIntensity?: Record<string, number>;
  logs?: LogEntry[];
}

export const LocationPanel: React.FC<LocationPanelProps> = ({
  locations,
  currentLocation,
  onMove,
  onSelectNPCByName,
  npcCounts = {},
  npcNames = {},
  shopCounts = {},
  factionMarks = {},
  eventIntensity = {},
  logs = []
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const current = locations.find(l => l.name === currentLocation);
  const connectedLocations = current?.connectedLocations.map(id => locations.find(l => l.id === id)).filter(Boolean) as Location[] || [];

  const getDangerColor = (level: number) => level >= 70 ? 'text-red-500 bg-red-500/20' : level >= 40 ? 'text-orange-400 bg-orange-400/20' : level >= 20 ? 'text-yellow-400 bg-yellow-400/20' : 'text-green-400 bg-green-400/20';
  const getDangerLabel = (level: number) => level >= 70 ? '极危' : level >= 40 ? '危险' : level >= 20 ? '警戒' : '安全';

  return (
    <div className="space-y-4">
      <div className="flex bg-zinc-800 rounded-lg p-1 mobile-stack">
        <button onClick={() => setViewMode('list')} className={`flex-1 py-2 px-3 rounded text-sm font-medium transition flex items-center justify-center gap-1.5 ${viewMode === 'list' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'}`}><List size={14} />列表视图</button>
        <button onClick={() => setViewMode('map')} className={`flex-1 py-2 px-3 rounded text-sm font-medium transition flex items-center justify-center gap-1.5 ${viewMode === 'map' ? 'bg-green-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'}`}><Map size={14} />地图视图</button>
      </div>

      {viewMode === 'map' && (
        <div className="space-y-4">
          <VisualMap
            locations={locations}
            currentLocation={currentLocation}
            onMove={onMove}
            onSelectNPCByName={onSelectNPCByName}
            npcCounts={npcCounts}
            npcNames={npcNames}
            shopCounts={shopCounts}
            factionMarks={factionMarks}
            eventIntensity={eventIntensity}
          />
          <MapEventPanel logs={logs} currentLocation={currentLocation} />
        </div>
      )}

      {viewMode === 'list' && (
        <>
          {current && (
            <div className={`rounded-lg p-4 border transition-all ${current.dangerLevel >= 50 ? 'bg-red-900/20 border-red-800/50 danger-zone' : 'bg-zinc-800/50 border-zinc-700'}`}>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg transition-colors ${current.dangerLevel >= 50 ? 'bg-red-500/20 animate-pulse-slow' : 'bg-blue-500/20'}`}><MapPin size={20} className={current.dangerLevel >= 50 ? 'text-red-400' : 'text-blue-400'} /></div>
                <div className="flex-1">
                  <h3 className="font-medium text-white flex items-center gap-2">{current.name}{current.dangerLevel >= 70 && <span className="text-xs bg-red-600 text-white px-1.5 py-0.5 rounded animate-pulse">危险</span>}</h3>
                  <p className="text-sm text-zinc-400 mt-1 leading-relaxed">{current.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                <div className="flex items-center gap-2 text-zinc-400"><AlertTriangle size={12} /><span>危险等级:</span><span className={`px-1.5 py-0.5 rounded ${getDangerColor(current.dangerLevel)}`}>{getDangerLabel(current.dangerLevel)} {current.dangerLevel}%</span></div>
                <div className="flex items-center gap-2 text-zinc-400">{current.isExplored ? <><Eye size={12} className="text-green-400" /><span className="text-green-400">已探索</span></> : <><EyeOff size={12} /><span>未探索</span></>}</div>
                <div className="flex items-center gap-2 text-zinc-400"><Zap size={12} className={current.hasElectricity ? 'text-yellow-400' : ''} /><span>{current.hasElectricity ? '有灯火' : '无灯火'}</span></div>
                <div className="flex items-center gap-2 text-zinc-400"><Droplets size={12} className={current.hasWater ? 'text-blue-400' : ''} /><span>{current.hasWater ? '有井水' : '无井水'}</span></div>
              </div>

              {current.hostilePresent > 0 && <div className="mt-3 p-2 bg-red-900/30 border border-red-800/50 rounded text-sm text-red-300 flex items-center gap-2"><Skull size={16} /><span>检测到 {current.hostilePresent} 个敌影！</span></div>}
              {(npcNames[current.name] || []).length > 0 && <div className="mt-3 text-xs text-zinc-400"><Users size={12} className="inline mr-1" />在场人物：{npcNames[current.name].map((name) => <button key={name} onClick={() => onSelectNPCByName?.(name)} className="ml-1 text-amber-300 hover:text-amber-200 underline underline-offset-2">{name}</button>)}</div>}
              <div className="mt-3 text-xs text-zinc-500">{current.isLooted ? <><Package size={12} className="inline mr-1" />已搜索过</> : <><Search size={12} className="inline mr-1" />可以搜索</>}</div>

              <div className="mt-3 pt-3 border-t border-zinc-700">
                <h4 className="text-xs font-medium text-zinc-400 mb-2 flex items-center gap-1"><Shield size={12} />位置防御</h4>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-zinc-900 rounded p-2"><div className="text-zinc-500">光照</div><div className={`text-sm font-bold ${current.lightLevel > 50 ? 'text-yellow-400' : current.lightLevel > 20 ? 'text-orange-400' : 'text-zinc-600'}`}>{current.lightLevel}%</div></div>
                  <div className="bg-zinc-900 rounded p-2"><div className="text-zinc-500">噪音</div><div className={`text-sm font-bold ${current.noiseLevel > 50 ? 'text-red-400' : current.noiseLevel > 20 ? 'text-orange-400' : 'text-green-400'}`}>{current.noiseLevel}</div></div>
                  <div className="bg-zinc-900 rounded p-2"><div className="text-zinc-500">安全</div><div className={`text-sm font-bold ${current.dangerLevel < 20 ? 'text-green-400' : current.dangerLevel < 50 ? 'text-yellow-400' : 'text-red-400'}`}>{100 - current.dangerLevel}%</div></div>
                </div>
              </div>
            </div>
          )}

          <div>
            <h4 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2"><ChevronRight size={14} />可前往的位置 ({connectedLocations.length})</h4>
            {connectedLocations.length > 0 ? (
              <div className="space-y-2">
                {connectedLocations.map(loc => (
                  <button key={loc.id} onClick={() => onMove?.(loc.id)} disabled={loc.isLocked} className={`w-full p-3 rounded-lg border text-left transition-all ${loc.isLocked ? 'bg-zinc-800/30 border-zinc-700 cursor-not-allowed opacity-50' : 'bg-zinc-800/50 border-zinc-700 hover:bg-zinc-700/50 hover:border-zinc-600 hover:shadow-lg'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">{loc.isLocked ? <Lock size={14} className="text-zinc-500" /> : <MapPin size={14} className="text-zinc-400" />}<span className="text-sm text-white">{loc.name}</span>{!loc.isExplored && <span className="text-[10px] bg-blue-900/50 text-blue-300 px-1.5 py-0.5 rounded">未探索</span>}</div>
                      <div className="flex items-center gap-2">{loc.hostilePresent > 0 && <span className="text-[10px] bg-red-900/50 text-red-300 px-1.5 py-0.5 rounded flex items-center gap-1"><Skull size={10} />{loc.hostilePresent}</span>}<span className={`text-xs px-2 py-0.5 rounded ${getDangerColor(loc.dangerLevel)}`}>{getDangerLabel(loc.dangerLevel)}</span></div>
                    </div>
                    {(npcNames[loc.name] || []).length > 0 && <div className="mt-1 text-[11px] text-zinc-500">人物：{npcNames[loc.name].slice(0, 2).join('、')}{npcNames[loc.name].length > 2 ? `等${npcNames[loc.name].length}人` : ''}</div>}
                    {loc.isLocked && <span className="text-[10px] text-zinc-500 ml-6"><Lock size={10} className="inline mr-0.5" />需要钥匙</span>}
                  </button>
                ))}
              </div>
            ) : <div className="text-sm text-zinc-500 italic bg-zinc-800/30 p-4 rounded-lg text-center">没有可以前往的位置</div>}
          </div>

          <MapEventPanel logs={logs} currentLocation={currentLocation} />

          <div className="border-t border-zinc-800 pt-4 text-xs text-zinc-500">
            <p><Lightbulb size={10} className="inline mr-1" />点击位置即可移动</p>
            <p><AlertTriangle size={10} className="inline mr-1" />移动会消耗时间和体力</p>
            <p><Shield size={10} className="inline mr-1" />你可以用木板+铁钉在"快捷操作"中加固当前位置</p>
          </div>
        </>
      )}
    </div>
  );
};
