import { AIResponse, GameState, Location, NPC, OrchestratorSettings } from '../types/game';

export const defaultOrchestratorSettings: OrchestratorSettings = {
  enabled: true,
  autoBalanceDifficulty: true,
  autoStabilizeEconomy: true,
  autoCorrectNPCState: true,
  autoRepairMapLinks: true,
  autoNormalizeAIResults: true,
  autoSceneImageInsert: true,
  autoReduceNoiseSpam: true,
  autoPromoteDiscoveries: true,
  aiStrictness: 75,
  mapCoherence: 80,
  worldDynamics: 70,
  npcAutonomy: 68,
  economyElasticity: 60,
  imageSafetyLevel: 78,
  logCleanliness: 85,
  notes: '',
};

export function loadOrchestratorSettings(): OrchestratorSettings {
  try {
    const saved = JSON.parse(localStorage.getItem('jianghu_orchestrator_settings') || 'null');
    return { ...defaultOrchestratorSettings, ...(saved || {}) };
  } catch {
    return defaultOrchestratorSettings;
  }
}

const INVALID_DISCOVERY_PATTERNS = [
  /^未知发现$/i,
  /^null$/i,
  /^location_change$/i,
  /当前地点未变/,
  /只有真正换地点时才填/,
  /应为\s*null/i,
  /只输出严格json/i,
  /story_text/i,
  /npc_updates/i,
  /time_passed_minutes/i,
  /dialogue/i,
];

const INVALID_LOCATION_PATTERNS = [
  /^null$/i,
  /^location_change$/i,
  /当前地点未变/,
  /只有真正换地点时才填/,
  /应为\s*null/i,
  /第[一二三四五六七八九十百千万\d]+个?(清晨|早晨|上午|中午|午后|傍晚|黄昏|夜晚|夜里)$/,
  /(清晨|早晨|上午|中午|午后|傍晚|黄昏|夜晚|夜里)$/,
];

const INVALID_ITEM_PATTERNS = [
  /伤|撕裂|骨折|流血|疼痛|中毒/,
  /饥饿感|口渴感|疲劳感|疼痛感|安全地方|危险地方/,
  /信息|提示|后果|风险|状态|变化|效果/,
  /speaker|text|mood|dialogue|choice|story_text|npc_updates/i,
];

const LOCATION_CONTEXT_RE = /(来到|走到|进入|抵达|到达|前往|赶到|赶往|踏入|转去|动身前往)/;

function clamp(num: number, min: number, max: number) {
  return Math.max(min, Math.min(max, num));
}

function normalizeText(input: string) {
  return (input || '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s"'“”‘’`]+|[\s"'“”‘’`]+$/g, '')
    .trim();
}

function sanitizeDiscovery(input: string) {
  const text = normalizeText(input)
    .replace(/location_change\s*[:：].*/gi, '')
    .replace(/只有真正换地点时才填.*/gi, '')
    .replace(/当前地点未变.*/gi, '')
    .replace(/应为\s*null.*/gi, '')
    .trim();
  if (!text) return '';
  if (INVALID_DISCOVERY_PATTERNS.some((re) => re.test(text))) return '';
  if (text.length < 2 || text.length > 60) return '';
  return text;
}

function sanitizeLocationCandidate(input: string, state: GameState) {
  const text = normalizeText(input)
    .replace(/location_change\s*[:：]/gi, '')
    .replace(/[，。！？、,.!?:：;；]+$/g, '')
    .trim();
  if (!text) return null;
  if (INVALID_LOCATION_PATTERNS.some((re) => re.test(text))) return null;
  if (!LOCATION_CONTEXT_RE.test((input || '') + ' ' + text) && !state.locations.some((l) => text.includes(l.name) || l.name.includes(text))) return null;

  const existing = state.locations.find((l) => l.name === text || text.includes(l.name) || l.name.includes(text));
  if (existing) return existing.name;

  if (text.length < 2 || text.length > 18) return null;
  if (/(这里|那里|里面|外面|前方|周围|附近|某处)$/.test(text)) return null;
  return text;
}

function inferLocationType(name: string): Location['type'] {
  if (/洞|窟|墓|地宫|密道|地下|暗道|石室/.test(name)) return 'underground';
  if (/房|室|阁|楼|殿|院|医馆|客栈|茶肆|铺|店|庙|祠|驿|寨|衙|堂|库|牢|坊/.test(name)) return 'building';
  if (/车|舟|船|马车/.test(name)) return 'vehicle';
  if (/林|山|谷|岭|滩|渡|桥|道|巷|街|集|野|镇|城|崖|湖|河|坡/.test(name)) return 'outdoor';
  return 'outdoor';
}

function normalizeItems(items: AIResponse['new_items'], strictness: number) {
  if (!Array.isArray(items)) return [];
  const dedupe = new Map<string, NonNullable<AIResponse['new_items']>[number]>();
  items.forEach((raw) => {
    if (!raw?.name) return;
    const name = normalizeText(raw.name)
      .replace(/^[一二三四五六七八九十百千万两\d]+(?:个|把|件|袋|包|瓶|壶|封|卷|份|串|块|本|柄)?/, '')
      .trim();
    if (!name || INVALID_ITEM_PATTERNS.some((re) => re.test(name))) return;
    if (strictness >= 70 && (name.length < 2 || name.length > 14)) return;
    const current = dedupe.get(name);
    const next = {
      ...raw,
      name,
      quantity: clamp(raw.quantity || 1, 1, 999),
    };
    if (!current) dedupe.set(name, next);
    else dedupe.set(name, { ...current, quantity: (current.quantity || 1) + (next.quantity || 1) });
  });
  return Array.from(dedupe.values());
}

function mergeNpcUpdates(updates: AIResponse['npc_updates'], state: GameState) {
  if (!Array.isArray(updates)) return [];
  const map = new Map<string, { id: string; changes: any }>();
  updates.forEach((entry) => {
    const id = entry.id;
    const npc = state.npcs.find((n) => n.id === id) || state.npcs.find((n) => n.name === id);
    const key = npc?.id || id;
    const prev = map.get(key) || { id: key, changes: {} };
    const nextChanges = { ...prev.changes, ...(entry.changes || {}) };
    if ((nextChanges as any).location) {
      const normalized = sanitizeLocationCandidate(String((nextChanges as any).location), state);
      if (normalized) (nextChanges as any).location = normalized;
      else delete (nextChanges as any).location;
    }
    if ((nextChanges as any).status === 'corrupted') (nextChanges as any).status = 'poisoned';
    map.set(key, { id: key, changes: nextChanges });
  });
  return Array.from(map.values());
}

function mergeLocations(newLocations: AIResponse['new_locations'], locationChange: string | null, state: GameState) {
  const items = Array.isArray(newLocations) ? [...newLocations] : [];
  if (locationChange && !items.some((l) => l?.name === locationChange)) items.push({ name: locationChange });
  const seen = new Set<string>();
  return items
    .map((loc) => {
      if (!loc?.name) return null;
      const normalizedName = sanitizeLocationCandidate(loc.name, state);
      if (!normalizedName) return null;
      if (seen.has(normalizedName)) return null;
      seen.add(normalizedName);
      return {
        ...loc,
        name: normalizedName,
        type: (loc.type as Location['type']) || inferLocationType(normalizedName),
        dangerLevel: typeof loc.dangerLevel === 'number' ? clamp(loc.dangerLevel, 0, 100) : undefined,
        noiseLevel: typeof loc.noiseLevel === 'number' ? clamp(loc.noiseLevel, 0, 100) : undefined,
        lightLevel: typeof loc.lightLevel === 'number' ? clamp(loc.lightLevel, 0, 100) : undefined,
      };
    })
    .filter(Boolean) as NonNullable<AIResponse['new_locations']>;
}

function normalizePlayerStats(changes: AIResponse['player_stat_changes']) {
  if (!changes || typeof changes !== 'object') return {};
  const allowed = new Set(['health', 'hunger', 'thirst', 'energy', 'sanity', 'infection', 'stamina']);
  const next: Record<string, number> = {};
  Object.entries(changes).forEach(([k, v]) => {
    if (!allowed.has(k)) return;
    if (typeof v !== 'number' || Number.isNaN(v)) return;
    next[k] = clamp(v, -100, 100);
  });
  return next;
}

export function orchestrateAIResponse(raw: AIResponse, state: GameState, settings: OrchestratorSettings) {
  const notes: string[] = [];
  if (!settings.enabled || !settings.autoNormalizeAIResults) {
    return { response: raw, notes };
  }

  const location_change = sanitizeLocationCandidate(raw.location_change || '', state);
  if (raw.location_change && !location_change) notes.push('已拦截无效地点变更');

  const discoveries = (raw.discoveries || [])
    .map((d) => sanitizeDiscovery(typeof d === 'string' ? d : String(d || '')))
    .filter(Boolean);
  if ((raw.discoveries || []).length && !discoveries.length) notes.push('发现事件已净化为空');

  const new_items = normalizeItems(raw.new_items, settings.aiStrictness);
  if ((raw.new_items || []).length > new_items.length) notes.push('部分无效物品已过滤');

  const npc_updates = mergeNpcUpdates(raw.npc_updates, state);
  const player_stat_changes = normalizePlayerStats(raw.player_stat_changes);
  const new_locations = mergeLocations(raw.new_locations, location_change, state);

  const world_state_changes = raw.world_state_changes ? { ...raw.world_state_changes } : undefined;
  if (world_state_changes) {
    delete (world_state_changes as any).location;
    if (world_state_changes.weather && typeof world_state_changes.weather === 'object') {
      (world_state_changes as any).weather = {
        ...state.world.weather,
        ...world_state_changes.weather,
      };
    }
  }

  const choices = Array.isArray(raw.choices)
    ? raw.choices
        .filter((c) => c?.text && typeof c.text === 'string')
        .slice(0, 5)
        .map((c, i) => ({ id: c.id || `choice_${i + 1}`, text: normalizeText(c.text), consequence_hint: normalizeText(c.consequence_hint || '') || undefined }))
    : [];

  const response: AIResponse = {
    ...raw,
    story_text: normalizeText(raw.story_text || ''),
    location_change: location_change || null,
    discoveries,
    new_items,
    npc_updates,
    player_stat_changes,
    new_locations,
    world_state_changes,
    choices,
    time_passed_minutes: typeof raw.time_passed_minutes === 'number' ? clamp(raw.time_passed_minutes, 0, 24 * 60) : raw.time_passed_minutes,
    weather_change: raw.weather_change || null,
  };

  return { response, notes };
}

export function deriveSystemCorrections(state: GameState, settings: OrchestratorSettings) {
  const notes: string[] = [];
  const npcPatches: Array<{ id: string; updates: Partial<NPC> }> = [];
  const locationPatches: Array<{ id: string; updates: Partial<Location> }> = [];
  const validLocationIds = new Set(state.locations.map((l) => l.id));
  const validLocationNames = new Set(state.locations.map((l) => l.name));

  if (settings.enabled && settings.autoCorrectNPCState) {
    state.npcs.forEach((npc) => {
      if (!validLocationNames.has(npc.location)) {
        npcPatches.push({ id: npc.id, updates: { location: state.world.location } });
      }
      const cleanedInventory = (npc.inventory || []).filter((item) => (item.quantity || 0) > 0);
      if (cleanedInventory.length !== (npc.inventory || []).length) {
        npcPatches.push({ id: npc.id, updates: { inventory: cleanedInventory } });
      }
    });
    if (npcPatches.length) notes.push(`已修正 ${npcPatches.length} 处人物脏数据`);
  }

  if (settings.enabled && settings.autoRepairMapLinks) {
    state.locations.forEach((loc) => {
      const cleanedLinks = (loc.connectedLocations || []).filter((id) => validLocationIds.has(id));
      const unique = Array.from(new Set(cleanedLinks));
      if (unique.length !== (loc.connectedLocations || []).length) {
        locationPatches.push({ id: loc.id, updates: { connectedLocations: unique } });
      }
    });
    if (locationPatches.length) notes.push(`已修补 ${locationPatches.length} 处地图连接`);
  }

  const worldPatch: Partial<GameState['world']> = {};
  if (settings.enabled && settings.autoStabilizeEconomy) {
    worldPatch.currencySystem = {
      ...state.world.currencySystem,
      marketIndex: clamp(Math.round(state.world.currencySystem.marketIndex * 0.92 + 100 * 0.08), 60, 180),
      taxRate: clamp(state.world.currencySystem.taxRate, 0, 30),
      silverToCopper: clamp(state.world.currencySystem.silverToCopper, 80, 150),
    };
  }

  const safeZones = state.locations.filter((l) => l.dangerLevel <= 20).map((l) => l.name);
  const dangerZones = state.locations.filter((l) => l.dangerLevel >= 55).map((l) => l.name);
  worldPatch.safeZones = safeZones;
  worldPatch.dangerZones = dangerZones;

  return { npcPatches, locationPatches, worldPatch, notes };
}
