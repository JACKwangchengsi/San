import React, { useMemo, useState } from 'react';
import { NPC } from '../types/game';

interface RelationshipGraphProps {
  npcs: NPC[];
  centerName?: string;
}

const getRelationColor = (value: number) => {
  if (value >= 60) return '#22c55e';
  if (value >= 20) return '#84cc16';
  if (value <= -40) return '#ef4444';
  if (value < 0) return '#f97316';
  return '#71717a';
};

const getNodeColor = (npc: NPC) => {
  if (npc.status === 'dead') return '#7f1d1d';
  if (npc.status === 'poisoned' || npc.status === 'corrupted') return '#a16207';
  if (npc.isRecruited) return '#2563eb';
  if (npc.relation >= 40) return '#166534';
  if (npc.relation <= -20) return '#991b1b';
  return '#3f3f46';
};

export const RelationshipGraph: React.FC<RelationshipGraphProps> = ({ npcs, centerName }) => {
  const [selectedNpcId, setSelectedNpcId] = useState<string | null>(null);

  const nodes = useMemo(() => {
    const visible = npcs.slice(0, 14);
    const cx = 170;
    const cy = 170;
    const radius = 115;
    return visible.map((npc, index) => {
      const angle = (Math.PI * 2 * index) / Math.max(1, visible.length);
      return {
        ...npc,
        x: cx + Math.cos(angle - Math.PI / 2) * radius,
        y: cy + Math.sin(angle - Math.PI / 2) * radius,
      };
    });
  }, [npcs]);

  const selected = centerName ? null : (nodes.find((n) => n.id === selectedNpcId) || nodes[0]);
  const edges = useMemo(() => {
    if (centerName) {
      return nodes
        .map((n) => ({ fromCenter: true as const, to: n, relation: n.relation }))
        .filter((e) => Math.abs(e.relation) >= 5)
        .sort((a, b) => Math.abs(b.relation) - Math.abs(a.relation))
        .slice(0, 10);
    }
    if (!selected) return [] as { fromCenter?: false; from: typeof nodes[number]; to: typeof nodes[number]; relation: number }[];
    return nodes
      .filter((n) => n.id !== selected.id)
      .map((n) => ({ fromCenter: false as const, from: selected, to: n, relation: Math.round((selected.relation + n.relation) / 2) }))
      .filter((e) => Math.abs(e.relation) >= 10)
      .sort((a, b) => Math.abs(b.relation) - Math.abs(a.relation))
      .slice(0, 8);
  }, [nodes, selected, centerName]);

  return (
    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm font-bold text-zinc-200">人际关系网络图</div>
          <div className="text-[11px] text-zinc-500">{centerName ? '以主角为中心查看江湖人物态度分布' : '点击人物节点，查看其与周围江湖人物的关系热度'}</div>
        </div>
        <div className="text-[11px] text-zinc-500">当前中心：<span className="text-white">{centerName || selected?.name || '无'}</span></div>
      </div>

      <div className="grid lg:grid-cols-[360px_1fr] gap-4 items-start">
        <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3 overflow-hidden">
          <svg viewBox="0 0 340 340" className="w-full h-auto">
            <circle cx="170" cy="170" r="118" fill="none" stroke="#27272a" strokeDasharray="4 4" />
            {centerName && (
              <g>
                <circle cx="170" cy="170" r="22" fill="#78350f" stroke="#fbbf24" strokeWidth="3" />
                <text x="170" y="173" textAnchor="middle" fontSize="11" fill="white">主</text>
                <text x="170" y="202" textAnchor="middle" fontSize="9" fill="#fef3c7">{centerName}</text>
              </g>
            )}
            {edges.map((edge, idx) => {
              const fromX = edge.fromCenter ? 170 : edge.from.x;
              const fromY = edge.fromCenter ? 170 : edge.from.y;
              const toX = edge.to.x;
              const toY = edge.to.y;
              return (
                <g key={idx}>
                  <line
                    x1={fromX}
                    y1={fromY}
                    x2={toX}
                    y2={toY}
                    stroke={getRelationColor(edge.relation)}
                    strokeWidth={Math.min(5, 1 + Math.abs(edge.relation) / 25)}
                    opacity={0.8}
                  />
                  <text x={(fromX + toX) / 2} y={(fromY + toY) / 2 - 4} fontSize="9" fill="#d4d4d8" textAnchor="middle">
                    {edge.relation > 0 ? `+${edge.relation}` : edge.relation}
                  </text>
                </g>
              );
            })}
            {nodes.map((node) => {
              const isSelected = !centerName && selected?.id === node.id;
              return (
                <g key={node.id} onClick={() => !centerName && setSelectedNpcId(node.id)} style={{ cursor: centerName ? 'default' : 'pointer' }}>
                  <circle cx={node.x} cy={node.y} r={isSelected ? 20 : 16} fill={getNodeColor(node)} stroke={isSelected ? '#fbbf24' : '#a1a1aa'} strokeWidth={isSelected ? 3 : 1.5} />
                  <text x={node.x} y={node.y + 1} textAnchor="middle" fontSize="11" fill="white">{node.name.slice(0, 1)}</text>
                  <text x={node.x} y={node.y + 30} textAnchor="middle" fontSize="9" fill="#d4d4d8">{node.name}</text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="space-y-3">
          {!centerName && selected ? (
            <>
              <div className="rounded-lg bg-zinc-950/70 border border-zinc-800 p-3">
                <div className="text-sm text-white font-medium mb-1">{selected.name}</div>
                <div className="text-[11px] text-zinc-500">{selected.age}岁 · {selected.occupation} · {selected.location}</div>
                <div className="mt-2 text-xs text-zinc-300 leading-relaxed">{selected.description}</div>
                <div className="mt-2 flex flex-wrap gap-1">{selected.personalityTags.map((tag, i) => <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">{tag}</span>)}</div>
              </div>
            </>
          ) : centerName ? (
            <div className="rounded-lg bg-zinc-950/70 border border-zinc-800 p-3">
              <div className="text-sm text-white font-medium mb-1">{centerName}</div>
              <div className="text-[11px] text-zinc-500">主角中心模式 · 观察所有江湖人物对主角的态度倾向</div>
              <div className="mt-2 text-xs text-zinc-400 leading-relaxed">绿色代表较友善或亲近，红色代表敌意与仇视，灰色代表关系尚浅。此视图主要用于把握主角的人脉网络与潜在风险。</div>
            </div>
          ) : null}

          <div className="rounded-lg bg-zinc-950/70 border border-zinc-800 p-3">
            <div className="text-xs font-bold text-zinc-400 mb-2">关系热度列表</div>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {edges.length === 0 ? (
                <div className="text-xs text-zinc-500">暂无明显关系波动。</div>
              ) : edges.map((edge, idx) => (
                <div key={idx} className="rounded-md bg-zinc-900 p-2 border border-zinc-800">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-zinc-300">{edge.to.name}</span>
                    <span style={{ color: getRelationColor(edge.relation) }}>{edge.relation > 0 ? `+${edge.relation}` : edge.relation}</span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full" style={{ width: `${Math.min(100, Math.abs(edge.relation))}%`, background: getRelationColor(edge.relation) }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RelationshipGraph;
