import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LogEntry, NPC, PlayerState } from '../types/game';
import { format } from 'date-fns';
import { cn } from '../utils/cn';
import { ChevronDown, Filter, Zap, Image as ImageIcon, User } from 'lucide-react';
import { aliasSpeakerName, loadNPCPortraitMap, loadPlayerPortrait, normalizeSpeakerName } from '../utils/portraitStorage';
import { getImageObjectUrl } from '../utils/imageStore';

export interface GameChoice {
  id: string;
  text: string;
  consequence_hint?: string;
  type?: 'normal' | 'danger' | 'social' | 'stealth' | 'combat';
}

interface SpeakerPortrait {
  name: string;
  imageUrl?: string;
  color?: string;
  isPlayer?: boolean;
  subtitle?: string;
}

interface NarrativeLogProps {
  logs: LogEntry[];
  choices?: GameChoice[];
  onChoiceSelect?: (choice: GameChoice) => void;
  isWaitingAI?: boolean;
  player?: PlayerState;
  npcs?: NPC[];
}

const BIRTH_KEY = 'game_birth_settings';

const getLogStyles = (type: string) => {
  switch (type) {
    case 'system': return 'text-yellow-500/80 font-mono text-xs border-l-2 border-yellow-500/50 pl-2 py-1';
    case 'narrative': return 'text-zinc-300 leading-relaxed story-text';
    case 'dialogue': return 'text-cyan-300 italic border-l-2 border-cyan-500/30 pl-3 bg-cyan-900/5';
    case 'combat': return 'text-red-400 font-medium bg-red-900/20 rounded px-3 py-2 border border-red-900/50 shadow-lg shadow-red-900/20';
    case 'ai': return 'text-zinc-200 leading-relaxed story-text bg-zinc-800/30 rounded-lg p-3 border-l-4 border-purple-500/30';
    case 'discovery': return 'text-green-400 bg-green-900/20 rounded px-3 py-2 border border-green-900/30 animate-item-pickup';
    case 'warning': return 'text-orange-400 font-medium bg-orange-900/20 rounded px-3 py-2 border border-orange-900/50 animate-pulse-slow';
    case 'death': return 'text-red-500 font-bold bg-red-900/30 rounded px-3 py-2 border-2 border-red-600/50 animate-border-glow shadow-lg shadow-red-900/30';
    case 'event': return 'text-purple-400 bg-purple-900/20 rounded px-3 py-2 border border-purple-900/30';
    case 'romance': return 'text-pink-300 bg-pink-950/20 rounded px-3 py-2 border border-pink-900/30';
    case 'image': return 'text-fuchsia-200 bg-zinc-900/50 rounded-xl p-3 border border-fuchsia-900/30 shadow-lg';
    default: return 'text-zinc-400';
  }
};

const getLogIcon = (type: string) => {
  switch (type) {
    case 'system': return '⚙️';
    case 'combat': return '⚔️';
    case 'discovery': return '🔍';
    case 'warning': return '⚠️';
    case 'death': return '💀';
    case 'event': return '📢';
    case 'dialogue': return '💬';
    case 'ai': return '🤖';
    case 'romance': return '💞';
    case 'image': return '🖼️';
    default: return null;
  }
};

const getChoiceStyle = (type?: string) => {
  switch (type) {
    case 'danger': return 'border-red-700/60 bg-red-950/30 hover:bg-red-900/40 hover:border-red-600 text-red-300';
    case 'combat': return 'border-orange-700/60 bg-orange-950/30 hover:bg-orange-900/40 hover:border-orange-600 text-orange-300';
    case 'social': return 'border-blue-700/60 bg-blue-950/30 hover:bg-blue-900/40 hover:border-blue-600 text-blue-300';
    case 'stealth': return 'border-emerald-700/60 bg-emerald-950/30 hover:bg-emerald-900/40 hover:border-emerald-600 text-emerald-300';
    default: return 'border-zinc-700/60 bg-zinc-800/40 hover:bg-zinc-700/50 hover:border-purple-600 text-zinc-200';
  }
};

const getChoiceIcon = (type?: string) => {
  switch (type) {
    case 'danger': return '⚠️';
    case 'combat': return '⚔️';
    case 'social': return '💬';
    case 'stealth': return '🤫';
    default: return '▸';
  }
};

const splitDialogueLines = (text: string) => text.split(/\n+/).map(line => line.trim()).filter(Boolean).map(line => line.replace(/^[-•·]\s*/, ''));
const parseSpeakerFromLine = (line: string): { speaker: string; content: string } | null => {
  const m1 = line.match(/^([^：:]{1,24})[：:](.+)$/);
  if (m1) return { speaker: m1[1].replace(/[“”"'（）()]/g, '').trim(), content: m1[2].trim() };
  const m2 = line.match(/^([^“”]{1,24})[说道问答低声轻声沉声笑道冷冷道缓缓道地道]?[“"](.+)[”"]$/);
  if (m2) return { speaker: m2[1].replace(/[，。；、\s]/g, '').trim(), content: m2[2].trim() };
  return null;
};
const portraitColor = (name: string) => {
  const palette = ['from-amber-600 to-orange-700', 'from-emerald-600 to-green-700', 'from-sky-600 to-blue-700', 'from-fuchsia-600 to-pink-700', 'from-violet-600 to-purple-700'];
  const idx = Math.abs(Array.from(name).reduce((s, ch) => s + ch.charCodeAt(0), 0)) % palette.length;
  return palette[idx];
};

export const NarrativeLog: React.FC<NarrativeLogProps> = ({ logs, choices = [], onChoiceSelect, isWaitingAI = false, player, npcs = [] }) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);
  const [highlightedImageId, setHighlightedImageId] = useState<string | null>(null);
  const [resolvedLogImages, setResolvedLogImages] = useState<Record<string, string>>({});
  const [resolvedPortraits, setResolvedPortraits] = useState<{ player?: string; npcs: Record<string, string> }>({ npcs: {} });
  const [portraitMaps, setPortraitMaps] = useState(() => {
    let birth: { name?: string; gender?: string; origin?: string } | null = null;
    try { birth = JSON.parse(localStorage.getItem(BIRTH_KEY) || 'null'); } catch {}
    return { npcMap: loadNPCPortraitMap(), playerPortrait: loadPlayerPortrait(), birth };
  });
  const lastImageIdRef = useRef<string | null>(null);

  useEffect(() => {
    const refresh = () => {
      let birth: { name?: string; gender?: string; origin?: string } | null = null;
      try { birth = JSON.parse(localStorage.getItem(BIRTH_KEY) || 'null'); } catch {}
      setPortraitMaps({ npcMap: loadNPCPortraitMap(), playerPortrait: loadPlayerPortrait(), birth });
    };
    refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    const timer = window.setInterval(refresh, 1200);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', refresh);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, autoScroll, choices]);

  const logImageKeySignature = useMemo(
    () => logs.map((log) => `${log.id}:${String(log.metadata?.imageKey || '')}`).join('|'),
    [logs]
  );
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const next: Record<string, string> = {};
      for (const log of logs) {
        const imageKey = log.metadata?.imageKey as string | undefined;
        if (!imageKey) continue;
        try {
          const url = await getImageObjectUrl(imageKey);
          if (url) next[log.id] = url;
        } catch {}
      }
      if (!cancelled) setResolvedLogImages(next);
    };
    run();
    return () => { cancelled = true; };
  }, [logImageKeySignature]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const next = { player: undefined as string | undefined, npcs: {} as Record<string, string> };
      try {
        if (portraitMaps.playerPortrait?.imageKey) {
          const url = await getImageObjectUrl(portraitMaps.playerPortrait.imageKey);
          if (url) next.player = url;
        } else if (portraitMaps.playerPortrait?.imageUrl) {
          next.player = portraitMaps.playerPortrait.imageUrl;
        }
      } catch {}
      for (const [npcId, info] of Object.entries(portraitMaps.npcMap || {})) {
        try {
          if (info?.imageKey) {
            const url = await getImageObjectUrl(info.imageKey);
            if (url) next.npcs[npcId] = url;
          } else if (info?.imageUrl) {
            next.npcs[npcId] = info.imageUrl;
          }
        } catch {}
      }
      if (!cancelled) setResolvedPortraits(next);
    };
    run();
    return () => { cancelled = true; };
  }, [portraitMaps]);

  useEffect(() => {
    const latestImage = [...logs].reverse().find((log) => log.type === 'image' && (log.metadata?.imageKey || log.metadata?.imageUrl));
    if (!latestImage || latestImage.id === lastImageIdRef.current) return;
    lastImageIdRef.current = latestImage.id;
    setHighlightedImageId(latestImage.id);
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-image-log-id="${latestImage.id}"]`);
      if (el instanceof HTMLElement) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    const timer = window.setTimeout(() => {
      setHighlightedImageId((prev) => (prev === latestImage.id ? null : prev));
    }, 2600);
    return () => window.clearTimeout(timer);
  }, [logs]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 50);
  };

  const speakerPortraits = useMemo(() => {
    const map = new Map<string, SpeakerPortrait>();
    const playerName = player?.name || portraitMaps.birth?.name || '你';
    const playerImageUrl = resolvedPortraits.player || portraitMaps.playerPortrait?.imageUrl;
    const originMap: Record<string, string> = { begger: '流浪乞丐', beggar: '流浪乞丐', farmer: '农家子弟', scholar: '落魄书生', soldier: '军户遗孤', merchant: '商贾之后' };
    const playerSubtitle = player
      ? `${player.gender === 'female' ? '你 · 她' : player.gender === 'male' ? '你 · 他' : '你 · TA'}｜${player.role || originMap[portraitMaps.birth?.origin || ''] || '江湖中人'}`
      : portraitMaps.birth
        ? `${portraitMaps.birth.gender === 'female' ? '你 · 她' : '你 · 他'}｜${originMap[portraitMaps.birth.origin || ''] || '江湖中人'}`
        : '你在江湖中的身份';
    const playerPortraitInfo: SpeakerPortrait = {
      name: playerName,
      imageUrl: playerImageUrl,
      color: 'from-amber-600 to-orange-700',
      isPlayer: true,
      subtitle: playerSubtitle,
    };
    ['你', '主角', playerName, normalizeSpeakerName(playerName), aliasSpeakerName(playerName)].forEach((alias) => {
      map.set(alias, playerPortraitInfo);
    });

    npcs.forEach((npc) => {
      const cache = portraitMaps.npcMap?.[npc.id] || Object.values(portraitMaps.npcMap || {}).find(v => normalizeSpeakerName(v.npcName || '') === normalizeSpeakerName(npc.name) || aliasSpeakerName(v.npcName || '') === aliasSpeakerName(npc.name));
      const portrait = {
        name: npc.name,
        imageUrl: resolvedPortraits.npcs[npc.id] || cache?.imageUrl,
        color: portraitColor(npc.name),
        subtitle: `${npc.occupation}${npc.faction ? `｜${npc.faction}` : ''}`,
      };
      [npc.name, normalizeSpeakerName(npc.name), aliasSpeakerName(npc.name)].forEach((alias) => map.set(alias, portrait));
    });

    Object.entries(portraitMaps.npcMap || {}).forEach(([npcId, info]) => {
      const displayName = info.npcName || npcId;
      if (!map.has(displayName)) {
        const portrait = { name: displayName, imageUrl: resolvedPortraits.npcs[npcId] || info.imageUrl, color: portraitColor(displayName), subtitle: '江湖人物' };
        [displayName, normalizeSpeakerName(displayName), aliasSpeakerName(displayName)].forEach((alias) => map.set(alias, portrait));
      }
    });
    return map;
  }, [portraitMaps, resolvedPortraits, player, npcs]);

  const filteredLogs = useMemo(() => (filter ? logs.filter(log => log.type === filter) : logs), [logs, filter]);
  const anchoredImagesMap = useMemo(() => {
    const map = new Map<string, LogEntry[]>();
    logs.forEach((log) => {
      if (log.type !== 'image') return;
      const anchorId = log.metadata?.anchorLogId as string | undefined;
      if (!anchorId) return;
      const list = map.get(anchorId) || [];
      list.push(log);
      map.set(anchorId, list);
    });
    return map;
  }, [logs]);

  const visibleLogs = useMemo(() => {
    return filter === 'image' ? filteredLogs.filter(log => log.type === 'image') : filteredLogs.filter(log => log.type !== 'image');
  }, [filteredLogs, filter]);

  const standaloneImages = useMemo(() => {
    return filter === 'image' ? filteredLogs : filteredLogs.filter(log => log.type === 'image' && !log.metadata?.anchorLogId);
  }, [filteredLogs, filter]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setAutoScroll(true);
  };

  const resolveSpeakerInfo = (speakerName: string): SpeakerPortrait => {
    const raw = speakerName.trim();
    const norm = normalizeSpeakerName(raw);
    const alias = aliasSpeakerName(raw);
    const playerNorm = normalizeSpeakerName(player?.name || portraitMaps.birth?.name || '');
    const playerAlias = aliasSpeakerName(player?.name || portraitMaps.birth?.name || '');
    const isPlayerSpeaker = raw === '你' || raw === '主角' || norm === playerNorm || alias === playerAlias;
    if (isPlayerSpeaker) {
      const playerName = player?.name || portraitMaps.birth?.name || '你';
      return speakerPortraits.get(playerName) || speakerPortraits.get(playerNorm) || speakerPortraits.get(playerAlias) || {
        name: playerName,
        imageUrl: resolvedPortraits.player || portraitMaps.playerPortrait?.imageUrl,
        color: 'from-amber-600 to-orange-700',
        isPlayer: true,
        subtitle: '你在江湖中的身份',
      };
    }

    const direct = speakerPortraits.get(raw) || speakerPortraits.get(norm) || speakerPortraits.get(alias);
    if (direct) return direct;

    const byNpc = npcs.find((npc) => {
      const nn = normalizeSpeakerName(npc.name);
      const an = aliasSpeakerName(npc.name);
      return nn === norm || an === alias || nn.includes(norm) || norm.includes(nn) || an.includes(alias) || alias.includes(an);
    });

    if (byNpc) {
      const cache = portraitMaps.npcMap?.[byNpc.id];
      return {
        name: byNpc.name,
        imageUrl: resolvedPortraits.npcs[byNpc.id] || cache?.imageUrl,
        color: portraitColor(byNpc.name),
        subtitle: `${byNpc.occupation}${byNpc.faction ? `｜${byNpc.faction}` : ''}`,
      };
    }

    return { name: raw, color: portraitColor(raw), subtitle: '江湖人物' };
  };

  const renderSpeakerAvatar = (speakerName: string) => {
    const info = resolveSpeakerInfo(speakerName);
    return (
      <div className={cn('w-9 h-9 rounded-full shrink-0 overflow-hidden border border-zinc-700 bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold', info.imageUrl ? 'bg-zinc-900' : info.color)}>
        {info.imageUrl ? <img src={info.imageUrl} alt={speakerName} className="w-full h-full object-cover" /> : info.isPlayer ? <User size={15} /> : <span>{info.name[0]}</span>}
      </div>
    );
  };

  const getDialogueRenderData = (log: LogEntry) => {
    if (log.type !== 'dialogue' && log.type !== 'ai') return { cards: null as React.ReactNode, text: log.text };
    const lines = splitDialogueLines(log.text);
    const parsedRows = lines.map((line) => ({ raw: line, parsed: parseSpeakerFromLine(line) })).filter(row => !!row.raw);
    const parsed = parsedRows.filter(row => !!row.parsed) as { raw: string; parsed: { speaker: string; content: string } }[];
    if (!parsed.length) return { cards: null as React.ReactNode, text: log.text };
    const nonDialogueLines = parsedRows.filter(row => !row.parsed).map(row => row.raw);
    const cleanedText = nonDialogueLines.join('\n').trim();

    const cards = (
      <div className="space-y-2 mt-2">
        {parsed.map((row, idx) => {
          const d = row.parsed;
          const portrait = resolveSpeakerInfo(d.speaker);
          const isPlayerSpeaker = !!portrait.isPlayer;
          const displaySpeaker = portrait.name || d.speaker;
          return (
            <div key={`${log.id}_dlg_${idx}`} className={`flex items-start gap-3 rounded-xl border p-3 hover-lift animate-fade-in-up ${isPlayerSpeaker ? 'border-amber-900/40 bg-amber-950/10' : 'border-zinc-800 bg-zinc-950/55'}`}>
              {renderSpeakerAvatar(displaySpeaker)}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-sm font-semibold text-white">{displaySpeaker}</span>
                  {isPlayerSpeaker && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/50 text-amber-300 border border-amber-900/30">你</span>}
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">对话</span>
                  {portrait.subtitle && <span className="text-[10px] text-zinc-500">{portrait.subtitle}</span>}
                </div>
                <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{d.content}</div>
              </div>
            </div>
          );
        })}
      </div>
    );

    return { cards, text: cleanedText };
  };

  const renderImageLog = (log: LogEntry, nested = false) => {
    const imageUrl = (resolvedLogImages[log.id] || log.metadata?.imageUrl) as string | undefined;
    const imagePrompt = log.metadata?.prompt as string | undefined;
    const imageLocation = log.metadata?.location as string | undefined;
    const imageTime = log.metadata?.timeText as string | undefined;
    const imageWeather = log.metadata?.weather as string | undefined;
    const mode = log.metadata?.mode as string | undefined;
    const isHighlighted = highlightedImageId === log.id;
    const isPortrait = mode === 'portrait';

    return (
      <div
        key={log.id}
        data-image-log-id={log.id}
        className={cn(
          getLogStyles('image'),
          nested ? 'mt-3 ml-2 sm:ml-4' : 'animate-fade-in',
          isHighlighted && 'ring-2 ring-fuchsia-400/70 shadow-[0_0_0_1px_rgba(232,121,249,0.35),0_0_30px_rgba(217,70,239,0.18)] animate-pulse'
        )}
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-fuchsia-300 text-sm font-semibold">
            <ImageIcon size={14} />
            <span>{log.text}</span>
            {isPortrait ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-950/50 text-pink-300 border border-pink-900/40">角色立绘</span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-fuchsia-950/50 text-fuchsia-300 border border-fuchsia-900/40">剧情插图</span>
            )}
          </div>
          {imageUrl ? (
            <a href={imageUrl} target="_blank" rel="noreferrer" className={cn('block overflow-hidden rounded-lg border border-zinc-800 bg-black mx-auto hover-lift animate-image-reveal img-vignette', isPortrait ? 'max-w-[260px] sm:max-w-[320px]' : 'max-w-3xl')}>
              <div className={cn('bg-black flex items-center justify-center overflow-hidden', isPortrait ? 'h-[300px] sm:h-[360px]' : 'h-[260px] sm:h-[380px]')}>
                <img src={imageUrl} alt="scene" className="w-full h-full object-contain hover:scale-[1.01] transition-transform duration-300" loading="lazy" />
              </div>
            </a>
          ) : null}
          <div className="flex flex-wrap gap-2 text-[11px] text-zinc-400">
            {imageLocation && <span className="px-2 py-1 rounded bg-zinc-800/70">📍 {imageLocation}</span>}
            {imageTime && <span className="px-2 py-1 rounded bg-zinc-800/70">🕒 {imageTime}</span>}
            {imageWeather && <span className="px-2 py-1 rounded bg-zinc-800/70">🌤️ {imageWeather}</span>}
          </div>
          {imagePrompt && (
            <details className="text-[11px] text-zinc-500 bg-zinc-950/60 rounded p-2">
              <summary className="cursor-pointer text-zinc-400">查看生成提示词</summary>
              <div className="mt-2 whitespace-pre-wrap leading-relaxed">{imagePrompt}</div>
            </details>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="relative h-full min-h-0 flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-zinc-900/95 via-zinc-900/80 to-zinc-900/70 border-b border-zinc-800/60 text-xs backdrop-blur-sm">
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800/50 border border-zinc-700/40 mr-1">
            <Filter size={11} className="text-amber-500/70" />
            <span className="text-[10px] text-zinc-500 tracking-wider">筛</span>
          </div>
          {[
            { key: null, label: '全部', icon: '📜' },
            { key: 'narrative', label: '叙事', icon: '📖' },
            { key: 'dialogue', label: '对话', icon: '💬' },
            { key: 'combat', label: '战斗', icon: '⚔️' },
            { key: 'image', label: '图像', icon: '🖼️' },
            { key: 'system', label: '系统', icon: '⚙️' },
          ].map((f) => (
            <button
              key={f.key ?? 'all'}
              onClick={() => setFilter(f.key)}
              className={cn(
                'px-2.5 py-1 rounded-md transition-all duration-300 font-medium text-[11px] border border-transparent',
                'hover:scale-[1.03] active:scale-[0.96]',
                filter === f.key
                  ? f.key === 'dialogue'
                    ? 'bg-cyan-950/60 text-cyan-300 border-cyan-800/50 shadow-sm shadow-cyan-900/20'
                    : f.key === 'combat'
                    ? 'bg-red-950/60 text-red-300 border-red-800/50 shadow-sm shadow-red-900/20'
                    : f.key === 'image'
                    ? 'bg-fuchsia-950/60 text-fuchsia-300 border-fuchsia-800/50 shadow-sm shadow-fuchsia-900/20'
                    : f.key === 'system'
                    ? 'bg-yellow-950/60 text-yellow-300 border-yellow-800/50 shadow-sm shadow-yellow-900/20'
                    : 'bg-zinc-700/80 text-white border-zinc-600/50 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40'
              )}
            >
              <span className="mr-1">{f.icon}</span>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="w-px h-4 bg-zinc-700/60" />
          <span className="text-[10px] text-zinc-600 font-mono tracking-wider">
            <span className="text-zinc-400 font-semibold">{visibleLogs.length + (filter === 'image' ? 0 : standaloneImages.length)}</span> 条
          </span>
        </div>
      </div>

      <div ref={containerRef} onScroll={handleScroll} className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3 bg-zinc-950/60 font-serif text-base leading-relaxed scroll-texture">
        {(player?.name || portraitMaps.birth?.name) && (
          <div className="rounded-2xl border border-amber-900/30 bg-gradient-to-r from-amber-950/20 to-zinc-900/40 p-3 sm:p-4 flex items-center gap-3 animate-fade-in hover-lift">
            <div className={cn('w-14 h-14 rounded-xl overflow-hidden border border-amber-900/30 bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center text-white shrink-0', (resolvedPortraits.player || portraitMaps.playerPortrait?.imageUrl) ? 'bg-black' : '')}>
              {(resolvedPortraits.player || portraitMaps.playerPortrait?.imageUrl) ? (
                <img src={resolvedPortraits.player || portraitMaps.playerPortrait?.imageUrl} alt={player?.name || portraitMaps.birth?.name || '你'} className="w-full h-full object-cover" />
              ) : (
                <User size={22} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white font-semibold text-sm sm:text-base">你当前在江湖中的身份：{player?.name || portraitMaps.birth?.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/40 border border-amber-900/30 text-amber-300">玩家本人</span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 leading-relaxed">你创建的角色就是你在这个世界中的真实身份。下方出现的“你”、你的名字、以及你的画像，指的都是同一个人。</p>
            </div>
          </div>
        )}

        {visibleLogs.map((log) => {
          const icon = getLogIcon(log.type);
          const isPlayerAction = log.text.startsWith('>');
          const animationClass = log.type === 'combat' ? 'animate-shake' : log.type === 'death' ? 'animate-shake-intense' : log.type === 'warning' ? 'animate-pulse-slow' : log.type === 'discovery' ? 'animate-fade-in-up' : 'animate-fade-in';
          const attachedImages = filter === 'image' ? [] : (anchoredImagesMap.get(log.id) || []).filter((img) => !filter || img.type === filter);
          const dialogueData = getDialogueRenderData(log);
          return (
            <div key={log.id} className="space-y-2 group/log-entry">
              {dialogueData.text ? (
                <div className={cn(
                  animationClass,
                  'relative transition-all duration-300',
                  'border-l-[3px] pl-3 py-2.5',
                  getLogStyles(log.type),
                  isPlayerAction && 'bg-zinc-800/50 rounded-lg p-3 border-l-4 border-blue-500 shadow-lg',
                  'hover:bg-zinc-900/30'
                )}>
                  <div className="absolute -left-[7px] top-2 w-2.5 h-2.5 rounded-full border border-zinc-700 bg-zinc-900 opacity-0 group-hover/log-entry:opacity-100 transition-opacity" />
                  <span className="absolute -left-2 top-0 opacity-0 group-hover/log-entry:opacity-100 transition-opacity text-zinc-600 text-[10px] font-mono">{format(log.gameTime, 'HH:mm')}</span>
                  {icon && !isPlayerAction && <span className="mr-1.5 inline-block align-baseline">{icon}</span>}
                  <span className="whitespace-pre-wrap leading-relaxed">{dialogueData.text}</span>
                  {(log.type === 'combat' || log.type === 'death' || log.type === 'discovery') && <span className="ml-2 text-[10px] opacity-40 uppercase tracking-wider font-mono">[{log.type}]</span>}
                </div>
              ) : null}
              {dialogueData.cards}
              {attachedImages.map((img) => renderImageLog(img, true))}
            </div>
          );
        })}

        {filter !== 'image' && standaloneImages.map((img) => renderImageLog(img))}
        {filter === 'image' && filteredLogs.filter((log) => log.type === 'image').map((img) => renderImageLog(img))}

        {isWaitingAI && (
          <div className="animate-fade-in rounded-xl border border-purple-900/30 bg-gradient-to-b from-purple-950/20 to-zinc-950/40 px-4 py-5 hover-lift overflow-hidden relative">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-purple-600/30 rounded-full blur-3xl animate-ink-spread" />
              <div className="absolute top-1/4 left-1/3 w-16 h-16 bg-amber-500/20 rounded-full blur-2xl animate-dust-float" style={{ animationDelay: '0.8s' }} />
              <div className="absolute bottom-1/4 right-1/3 w-12 h-12 bg-fuchsia-500/20 rounded-full blur-2xl animate-dust-float" style={{ animationDelay: '1.6s' }} />
            </div>
            <div className="relative flex flex-col items-center gap-3">
              <div className="flex items-center gap-2">
                <svg className="w-10 h-10" viewBox="0 0 40 40" fill="none">
                  <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="1.2" className="text-purple-800/60" />
                  <path d="M12 20 Q16 10, 20 18 Q24 26, 28 20" stroke="currentColor" strokeWidth="1.5" fill="none" className="text-purple-400/80 animate-scroll-unroll" strokeLinecap="round" />
                  <circle cx="20" cy="12" r="3" className="fill-purple-400/30 animate-breathe" />
                  <circle cx="20" cy="12" r="1.2" className="fill-purple-300 animate-pulse" />
                </svg>
                <div className="flex items-center gap-1.5">
                  {[0, 180, 360, 540].map((delay, i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-purple-400/70 animate-breathe"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              </div>
              <div className="text-center">
                <span className="text-sm text-purple-300/90 italic tracking-wide animate-pulse">AI正在挥毫泼墨，构思江湖风云...</span>
                <p className="text-[10px] text-purple-500/60 mt-1.5 animate-dust-float">墨染丹青 · 一念江湖</p>
              </div>
              <div className="flex gap-1 opacity-40">
                {['笔', '墨', '纸', '砚'].map((char, i) => (
                  <span
                    key={i}
                    className="text-[11px] text-purple-400 font-serif animate-dust-float"
                    style={{ animationDelay: `${i * 200}ms` }}
                  >{char}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {choices.length > 0 && !isWaitingAI && (
          <div className="animate-fade-in-up mt-4 mb-2">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-zinc-700/50">
              <div className="relative">
                <Zap size={14} className="text-yellow-400 animate-pulse" />
                <span className="absolute inset-0 rounded-full bg-yellow-400/20 blur-sm animate-breathe" />
              </div>
              <span className="text-sm font-bold text-yellow-400/90 tracking-wide">做出你的选择</span>
              <div className="flex-1 h-px bg-gradient-to-r from-yellow-800/50 via-amber-800/30 to-transparent" />
              <span className="text-[9px] text-yellow-700/60 font-mono tracking-wider">按 1-{choices.length}</span>
            </div>
            <div className="space-y-2">
              {choices.map((choice, idx) => (
                <button
                  key={choice.id}
                  onClick={() => onChoiceSelect?.(choice)}
                  className={cn(
                    'w-full text-left px-4 py-3 rounded-xl border transition-all duration-300',
                    'group/choice relative overflow-hidden',
                    'animate-fade-in hover-lift',
                    'hover:shadow-lg',
                    getChoiceStyle(choice.type)
                  )}
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/[0.03] to-white/0 translate-x-[-100%] group-hover/choice:translate-x-[100%] transition-transform duration-700" />
                  <div className="relative flex items-start gap-3">
                    <span className={cn(
                      'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300',
                      'border',
                      choice.type === 'danger' ? 'bg-red-950/40 border-red-700/60 text-red-300 group-hover/choice:border-red-500 group-hover/choice:text-red-200 group-hover/choice:shadow-[0_0_12px_rgba(239,68,68,0.2)]' :
                      choice.type === 'combat' ? 'bg-orange-950/40 border-orange-700/60 text-orange-300 group-hover/choice:border-orange-500 group-hover/choice:text-orange-200 group-hover/choice:shadow-[0_0_12px_rgba(249,115,22,0.2)]' :
                      choice.type === 'social' ? 'bg-blue-950/40 border-blue-700/60 text-blue-300 group-hover/choice:border-blue-500 group-hover/choice:text-blue-200 group-hover/choice:shadow-[0_0_12px_rgba(96,165,250,0.2)]' :
                      choice.type === 'stealth' ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300 group-hover/choice:border-emerald-500 group-hover/choice:text-emerald-200 group-hover/choice:shadow-[0_0_12px_rgba(52,211,153,0.2)]' :
                      'bg-zinc-800/60 border-zinc-600/60 text-zinc-300 group-hover/choice:border-amber-500/60 group-hover/choice:text-amber-200 group-hover/choice:shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                    )}>
                      <span className="text-[11px] font-bold">{idx + 1}</span>
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm leading-relaxed font-medium">{getChoiceIcon(choice.type)} {choice.text}</span>
                      </div>
                      {choice.consequence_hint && (
                        <p className="mt-1.5 text-[10px] text-zinc-500/80 italic opacity-0 group-hover/choice:opacity-100 transition-all duration-300 translate-y-1 group-hover/choice:translate-y-0">💡 {choice.consequence_hint}</p>
                      )}
                    </div>
                    {choice.type && choice.type !== 'normal' && (
                      <span className={cn(
                        'flex-shrink-0 text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider font-medium border',
                        choice.type === 'danger' ? 'bg-red-950/40 text-red-400 border-red-800/40' :
                        choice.type === 'combat' ? 'bg-orange-950/40 text-orange-400 border-orange-800/40' :
                        choice.type === 'social' ? 'bg-blue-950/40 text-blue-400 border-blue-800/40' :
                        choice.type === 'stealth' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40' :
                        'bg-zinc-800/50 text-zinc-500 border-zinc-700/40'
                      )}>
                        {choice.type === 'danger' ? '危险' : choice.type === 'combat' ? '战斗' : choice.type === 'social' ? '社交' : choice.type === 'stealth' ? '潜行' : choice.type}
                      </span>
                    )}
                  </div>
                  <div className={cn(
                    'absolute left-0 top-0 bottom-0 w-0.5 rounded-full transition-all duration-300 group-hover/choice:h-3/4 group-hover/choice:top-[12.5%]',
                    choice.type === 'danger' ? 'bg-red-500/70' :
                    choice.type === 'combat' ? 'bg-orange-500/70' :
                    choice.type === 'social' ? 'bg-blue-500/70' :
                    choice.type === 'stealth' ? 'bg-emerald-500/70' :
                    'bg-amber-500/50'
                  )} />
                </button>
              ))}
            </div>
            <p className="text-center text-[10px] text-zinc-600 mt-3 flex items-center justify-center gap-2">
              <span className="w-8 h-px bg-zinc-800" />
              <span>按数字键快速选择 · 或输入自定义行动</span>
              <span className="w-8 h-px bg-zinc-800" />
            </p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {!autoScroll && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 p-2.5 bg-gradient-to-br from-zinc-800 to-zinc-900 hover:from-zinc-700 hover:to-zinc-800 rounded-full shadow-lg shadow-black/40 border border-zinc-700/50 text-zinc-300 hover:text-white transition-all duration-300 animate-bounce hover:shadow-xl hover:border-amber-700/30 group/scroll-btn"
        >
          <ChevronDown size={18} className="group-hover/scroll-btn:scale-110 transition-transform" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full animate-pulse opacity-70" />
        </button>
      )}
    </div>
  );
};
