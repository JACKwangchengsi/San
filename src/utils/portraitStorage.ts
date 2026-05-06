export interface NPCPortraitInfo {
  imageUrl?: string;
  imageKey?: string;
  updatedAt: number;
  source: 'manual' | 'ai';
  note?: string;
  prompt?: string;
  npcName?: string;
}

export interface PlayerPortraitInfo {
  imageUrl?: string;
  imageKey?: string;
  updatedAt: number;
  source: 'manual' | 'ai';
  note?: string;
  prompt?: string;
  title?: string;
}

const NPC_PORTRAIT_KEY = 'jianghu_npc_portraits';
const PLAYER_PORTRAIT_KEY = 'jianghu_player_portrait';

function safeJsonParse<T>(text: string | null, fallback: T): T {
  try {
    return text ? (JSON.parse(text) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function loadNPCPortraitMap(): Record<string, NPCPortraitInfo> {
  return safeJsonParse<Record<string, NPCPortraitInfo>>(localStorage.getItem(NPC_PORTRAIT_KEY), {});
}

export function saveNPCPortraitMap(map: Record<string, NPCPortraitInfo>) {
  localStorage.setItem(NPC_PORTRAIT_KEY, JSON.stringify(map));
}

export function updateNPCPortrait(npcId: string, data: Partial<NPCPortraitInfo>) {
  const map = loadNPCPortraitMap();
  map[npcId] = {
    ...(map[npcId] || { imageUrl: '', updatedAt: Date.now(), source: 'manual' as const }),
    ...data,
    updatedAt: Date.now(),
  };
  saveNPCPortraitMap(map);
  return map[npcId];
}

export function removeNPCPortrait(npcId: string) {
  const map = loadNPCPortraitMap();
  delete map[npcId];
  saveNPCPortraitMap(map);
}

export function loadPlayerPortrait(): PlayerPortraitInfo | null {
  return safeJsonParse<PlayerPortraitInfo | null>(localStorage.getItem(PLAYER_PORTRAIT_KEY), null);
}

export function savePlayerPortrait(data: PlayerPortraitInfo) {
  localStorage.setItem(PLAYER_PORTRAIT_KEY, JSON.stringify(data));
}

export async function persistImageAsDataUrl(imageUrl: string): Promise<string> {
  try {
    if (imageUrl.startsWith('data:')) return imageUrl;
    const res = await fetch(imageUrl);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || imageUrl));
      reader.onerror = () => reject(new Error('无法持久化生成图片'));
      reader.readAsDataURL(blob);
    });
  } catch {
    return imageUrl;
  }
}

export function normalizeSpeakerName(name: string) {
  return name.replace(/[·•\s：:（）()【】\[\]“”"'，。,、\-—]/g, '').trim().toLowerCase();
}

export function aliasSpeakerName(name: string) {
  return normalizeSpeakerName(name).replace(/(前辈|姑娘|公子|少侠|女侠|大夫|掌柜|先生|师父|师兄|师姐|师妹|兄|姐|弟|妹|婆婆|老人家|老太太|老丈|老伯)$/, '');
}
