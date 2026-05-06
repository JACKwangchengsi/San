import React, { useMemo } from 'react';
import { LogEntry } from '../types/game';

interface MapEventPanelProps {
  logs: LogEntry[];
  currentLocation: string;
}

const typeStyle = (type: string) => {
  if (type === 'combat') return 'border-red-700 bg-red-950/20 text-red-300';
  if (type === 'discovery') return 'border-green-700 bg-green-950/20 text-green-300';
  if (type === 'dialogue') return 'border-blue-700 bg-blue-950/20 text-blue-300';
  if (type === 'warning') return 'border-orange-700 bg-orange-950/20 text-orange-300';
  if (type === 'system') return 'border-zinc-700 bg-zinc-900 text-zinc-300';
  return 'border-purple-700 bg-purple-950/20 text-purple-300';
};

const labelMap: Record<string, string> = {
  combat: '战斗',
  discovery: '发现',
  dialogue: '对话',
  warning: '警示',
  system: '系统',
  ai: '剧情',
  narrative: '叙事',
  event: '事件',
  death: '死亡',
  image: '图像',
};

export const MapEventPanel: React.FC<MapEventPanelProps> = ({ logs, currentLocation }) => {
  const events = useMemo(() => {
    const locationName = currentLocation.trim();
    return [...logs]
      .reverse()
      .filter((log) => log.text.includes(locationName) || ['combat', 'discovery', 'warning', 'event'].includes(log.type))
      .slice(0, 10);
  }, [logs, currentLocation]);

  return (
    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
      <div className="text-sm font-bold text-zinc-200 mb-3">地图事件标记</div>
      <div className="space-y-2">
        {events.length === 0 ? (
          <div className="text-xs text-zinc-500">近期没有可标记到地图上的明显事件。</div>
        ) : events.map((event) => (
          <div key={event.id} className={`rounded-lg border p-3 ${typeStyle(event.type)}`}>
            <div className="flex items-center justify-between mb-1 text-[11px]">
              <span>{labelMap[event.type] || event.type}</span>
              <span className="text-zinc-500">{new Date(event.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="text-xs leading-relaxed text-zinc-200 whitespace-pre-line">{event.text.slice(0, 120)}{event.text.length > 120 ? '…' : ''}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MapEventPanel;
