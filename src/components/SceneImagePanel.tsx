import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GameState, BirthSettings, NPC } from '../types/game';
import { logger } from '../utils/logger';
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  Copy,
  Eye,
  Image as ImageIcon,
  Loader2,
  Play,
  PauseCircle,
  Plus,
  RefreshCw,
  Save,
  Settings,
  Sparkles,
  Trash2,
  UserCircle2,
  Clock3,
  Layers3,
  Activity,
  Square,
  Wand2,
  Download,
  X,
} from 'lucide-react';
import { buildNPCVisualSummary, getAgeGenderLabel } from '../systems/NPCPortraitProfile';
import { loadPlayerPortrait, savePlayerPortrait, updateNPCPortrait } from '../utils/portraitStorage';
import { getImageObjectUrl, saveImageFromUrl } from '../utils/imageStore';
import { loadOrchestratorSettings } from '../systems/Orchestrator';

interface SceneImagePanelProps {
  state: GameState;
  birthSettings?: BirthSettings | null;
  latestStoryText?: string;
  anchorLogId?: string | null;
  manualRequest?: { nonce: number; mode: 'scene' | 'portrait'; npcId?: string | null; npcName?: string | null } | null;
  onSceneGenerated?: (scene: GeneratedScene) => void;
}

interface WorkflowPreset {
  id: string;
  name: string;
  description?: string;
  workflowApiJson: string;
  positiveNodeId: string;
  negativeNodeId: string;
  widthNodeId: string;
  heightNodeId: string;
  seedNodeId: string;
  samplerNodeId: string;
  outputNodeId: string;
  width: number;
  height: number;
  negativePrompt: string;
}

interface ComfyConfig {
  endpoint: string;
  enabled: boolean;
  presets: WorkflowPreset[];
  activePresetId: string;
  autoGenerateOnAIStory: boolean;
  autoGeneratePaused: boolean;
  seedMode: 'fixed' | 'random';
  fixedSeed: number;
}

interface RuntimeStatus {
  phase: 'idle' | 'queued' | 'running' | 'checking' | 'completed' | 'error' | 'timeout' | 'cancelled';
  text: string;
  promptId?: string;
  elapsedMs?: number;
  queueSize?: number;
  queuePosition?: number | null;
  currentNode?: string;
  outputNodeId?: string;
}

export interface GeneratedScene {
  id: string;
  prompt: string;
  imageUrl?: string;
  imageKey?: string;
  timestamp: number;
  location: string;
  weather: string;
  timeText: string;
  sourceStory?: string;
  mode?: 'scene' | 'portrait';
  anchorLogId?: string | null;
  npcId?: string | null;
  npcName?: string | null;
}

const SCENE_KEY = 'jianghu_scene_images';
const COMFY_KEY = 'jianghu_comfy_config_v2';
const DEFAULT_NEGATIVE = 'worst quality, low quality, blurry, text, watermark, logo, UI, subtitles, modern city, cyberpunk, sci-fi, gun, car, phone, power line, neon, office, classroom, contemporary clothing, extra fingers, deformed anatomy';

const DEFAULT_PRESET: WorkflowPreset = {
  id: 'preset_default',
  name: '默认流程',
  description: '可用于情节图与人物图的基础流程',
  workflowApiJson: '',
  positiveNodeId: '6',
  negativeNodeId: '7',
  widthNodeId: '5',
  heightNodeId: '5',
  seedNodeId: '3',
  samplerNodeId: '3',
  outputNodeId: '',
  width: 832,
  height: 512,
  negativePrompt: DEFAULT_NEGATIVE,
};

const DEFAULT_CONFIG: ComfyConfig = {
  endpoint: '/api/comfy',
  enabled: false,
  presets: [DEFAULT_PRESET],
  activePresetId: DEFAULT_PRESET.id,
  autoGenerateOnAIStory: false,
  autoGeneratePaused: false,
  seedMode: 'random',
  fixedSeed: 123456789,
};

const weatherMap: Record<string, string> = { clear: '晴朗', cloudy: '多云', overcast: '阴天', drizzle: '细雨', rain: '雨天', heavy_rain: '暴雨', thunderstorm: '雷雨', fog: '浓雾', snow: '降雪', blizzard: '风雪' };

function shichenLabel(time: number) {
  const h = new Date(time).getHours();
  if (h >= 23 || h < 1) return '子时';
  if (h < 3) return '丑时';
  if (h < 5) return '寅时';
  if (h < 7) return '卯时';
  if (h < 9) return '辰时';
  if (h < 11) return '巳时';
  if (h < 13) return '午时';
  if (h < 15) return '未时';
  if (h < 17) return '申时';
  if (h < 19) return '酉时';
  if (h < 21) return '戌时';
  return '亥时';
}

function safeJsonParse<T>(text: string, fallback: T): T { try { return JSON.parse(text) as T; } catch { return fallback; } }
function clampText(text: string, max = 220) { const clean = (text || '').replace(/\s+/g, ' ').trim(); return clean.length > max ? `${clean.slice(0, max)}…` : clean; }
function normalizeEndpoint(url: string) {
  const clean = (url || '').trim().replace(/\/+$/, '');
  const isProxy = clean === '/api/comfy';
  const isLocalComfy = /^https?:\/\/(127\.0\.0\.1|localhost):8188$/i.test(clean);
  if (import.meta.env.DEV) {
    if (!clean || isLocalComfy || isProxy) return '/api/comfy';
  }
  return clean || '/api/comfy';
}
function parseWorkflowJson(text: string): Record<string, unknown> {
  const raw = safeJsonParse<Record<string, unknown>>(text || '{}', {});
  if (raw.prompt && typeof raw.prompt === 'object') return raw.prompt as Record<string, unknown>;
  return raw;
}
function getStoredPortraitNote(npcId?: string | null) {
  if (!npcId) return '';
  try {
    const map = JSON.parse(localStorage.getItem('jianghu_npc_portraits') || '{}');
    return String(map?.[npcId]?.note || '').trim();
  } catch {
    return '';
  }
}
function getStoredPlayerPortraitNote() {
  return String(loadPlayerPortrait()?.note || '').trim();
}
function findFirstImageInObject(obj: unknown): { filename: string; subfolder?: string; type?: string } | null {
  if (!obj || typeof obj !== 'object') return null;
  const o = obj as Record<string, unknown>;
  if (Array.isArray(o.images) && o.images.length > 0) {
    const image = (o.images as Array<Record<string, unknown>>).find((img) => img?.filename);
    if (image?.filename) return { filename: image.filename as string, subfolder: image.subfolder as string | undefined, type: image.type as string | undefined };
  }
  if (o.filename && typeof o.filename === 'string') return { filename: o.filename, subfolder: o.subfolder as string | undefined, type: (o.type as string) || 'output' };
  for (const value of Object.values(o)) {
    const found = findFirstImageInObject(value);
    if (found) return found;
  }
  return null;
}
function detectOutputNodeIds(workflow: Record<string, unknown>) {
  const ids = Object.keys(workflow || {});
  const candidates: string[] = [];
  for (const id of ids) {
    const node = (workflow[id] as Record<string, unknown>) || {};
    const classType = String(node.class_type || '').toLowerCase();
    const title = String((node._meta as Record<string, unknown>)?.title || '').toLowerCase();
    if (/saveimage|previewimage|save image|preview image|imagesaver|saveimagetowebsocket/i.test(`${classType} ${title}`)) candidates.push(id);
    const inputs = (node.inputs as Record<string, unknown>) || {};
    if (inputs.filename_prefix !== undefined && /image|save/i.test(`${classType} ${title}`)) candidates.push(id);
  }
  return [...new Set(candidates)];
}
function findImageInOutputs(outputs: Record<string, unknown> | undefined, preferredNodeId?: string) {
  if (!outputs || typeof outputs !== 'object') return null;
  if (preferredNodeId && outputs[preferredNodeId]) {
    const preferred = findFirstImageInObject(outputs[preferredNodeId]);
    if (preferred) return { image: preferred, outputNodeId: preferredNodeId };
  }
  for (const [nodeId, value] of Object.entries(outputs)) {
    const found = findFirstImageInObject(value);
    if (found) return { image: found, outputNodeId: nodeId };
  }
  return null;
}
async function fetchJson(url: string, init?: RequestInit, timeout = 12000) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) throw new Error(`请求失败：${res.status}`);
    return await res.json();
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw new Error('连接超时：请确认 ComfyUI 已启动，地址正确，且端口可访问。');
    if (err instanceof TypeError) throw new Error('Failed to fetch：通常是 ComfyUI 未启动、地址/端口错误、代理未生效，或被浏览器跨域/协议限制拦截。若刚修改代理配置，请重启 Vite 开发服务器后再试。');
    throw err;
  } finally { window.clearTimeout(timer); }
}
async function getPromptState(endpoint: string, promptId: string, preferredOutputNodeId?: string) {
  const [history, queue] = await Promise.all([
    fetchJson(`${endpoint}/history/${promptId}`, undefined, 12000).catch(() => null),
    fetchJson(`${endpoint}/queue`, undefined, 12000).catch(() => null),
  ]);
  const entry = history?.[promptId] || null;
  const imageResult = entry ? findImageInOutputs(entry.outputs || entry, preferredOutputNodeId) : null;
  const queueRunning = Array.isArray(queue?.queue_running) ? queue.queue_running : [];
  const queuePending = Array.isArray(queue?.queue_pending) ? queue.queue_pending : [];
  const runningIndex = queueRunning.findIndex((item: unknown) => String((item as Record<string, unknown>)?.[1] || (item as Record<string, unknown>)?.prompt_id || (item as Record<string, unknown>)?.id || '') === promptId);
  const pendingIndex = queuePending.findIndex((item: unknown) => String((item as Record<string, unknown>)?.[1] || (item as Record<string, unknown>)?.prompt_id || (item as Record<string, unknown>)?.id || '') === promptId);
  const running = runningIndex >= 0;
  const pending = pendingIndex >= 0;
  const completed = !!entry && !!entry.outputs;
  const hasError = !!entry?.status?.status_str && /error|failed/i.test(String(entry.status.status_str));
  const currentNode = entry?.status?.current_node || entry?.status?.node_id || entry?.meta?.current_node || entry?.current_node || undefined;
  const queuePosition = pending ? pendingIndex + 1 : running ? 0 : null;
  const queueSize = queueRunning.length + queuePending.length;

  let imageReady = false;
  let probedViewUrl = '';
  if (imageResult?.image?.filename) {
    const params = new URLSearchParams();
    params.set('filename', imageResult.image.filename);
    if (imageResult.image.subfolder) params.set('subfolder', imageResult.image.subfolder);
    params.set('type', imageResult.image.type || 'output');
    probedViewUrl = `${normalizeEndpoint(endpoint)}/view?${params.toString()}`;
    try {
      const probeController = new AbortController();
      const probeTimer = setTimeout(() => probeController.abort(), 5000);
      const probe = await fetch(probedViewUrl, {
        method: 'GET',
        cache: 'no-store',
        signal: probeController.signal,
      });
      clearTimeout(probeTimer);
      imageReady = probe.ok;
    } catch {
      imageReady = false;
    }
  }

  const statusText = hasError
    ? '任务执行失败'
    : running
      ? `ComfyUI 正在生成中${currentNode ? ` · 当前节点 ${currentNode}` : '…'}`
      : pending
        ? `ComfyUI 队列排队中${queuePosition ? ` · 前方还有 ${queuePosition - 1} 个任务` : '…'}`
        : completed
          ? imageResult?.image
            ? imageReady ? '已生成图片，正在载入…' : '任务完成，正在等待图片文件就绪…'
            : '任务完成，正在检查输出图像…'
          : '等待 ComfyUI 返回结果…';

  return {
    entry,
    image: imageResult?.image || null,
    outputNodeId: imageResult?.outputNodeId,
    running,
    pending,
    completed,
    hasError,
    currentNode,
    queuePosition,
    queueSize,
    statusText,
    imageReady,
    probedViewUrl,
  };
}
function autoDetectWorkflowNodes(workflowText: string) {
  const workflow = parseWorkflowJson(workflowText);
  const ids = Object.keys(workflow || {});
  if (!ids.length) return null;
  let positiveNodeId = '', negativeNodeId = '', widthNodeId = '', heightNodeId = '', seedNodeId = '', samplerNodeId = '';
  let width = 832, height = 512;
  const isNegativeText = (text: string) => /(lowres|worst|bad anatomy|watermark|text|modern|phone|car|gun|sci-fi)/i.test(text || '');
  for (const id of ids) {
    const node = (workflow[id] as Record<string, unknown>) || {};
    const classType = String(node.class_type || '').toLowerCase();
    const inputs = (node.inputs as Record<string, unknown>) || {};
    if (classType === 'cliptextencode') {
      const text = String(inputs.text || '');
      if (!positiveNodeId && text && !isNegativeText(text)) positiveNodeId = id;
      if (!negativeNodeId && (isNegativeText(text) || /negative/i.test(String((node._meta as Record<string, unknown>)?.title || '')))) negativeNodeId = id;
    }
    if (!negativeNodeId && /negative/i.test(String((node._meta as Record<string, unknown>)?.title || '')) && inputs.text !== undefined) negativeNodeId = id;
    if (classType === 'emptylatentimage' || (inputs.width !== undefined && inputs.height !== undefined)) {
      if (!widthNodeId) widthNodeId = id;
      if (!heightNodeId) heightNodeId = id;
      if (typeof inputs.width === 'number') width = inputs.width;
      if (typeof inputs.height === 'number') height = inputs.height;
    }
    if (/ksampler/i.test(classType) || inputs.seed !== undefined) {
      if (!seedNodeId && inputs.seed !== undefined) seedNodeId = id;
      if (!samplerNodeId) samplerNodeId = id;
    }
  }
  if (!positiveNodeId) {
    const fallbackText = ids.find((id) => ((workflow[id] as Record<string, unknown>)?.inputs as Record<string, unknown>)?.text !== undefined);
    if (fallbackText) positiveNodeId = fallbackText;
  }
  if (!negativeNodeId) {
    const textNodes = ids.filter((id) => ((workflow[id] as Record<string, unknown>)?.inputs as Record<string, unknown>)?.text !== undefined);
    if (textNodes.length > 1) negativeNodeId = textNodes[1];
  }
  const outputCandidates = detectOutputNodeIds(workflow);
  return { positiveNodeId, negativeNodeId, widthNodeId, heightNodeId, seedNodeId, samplerNodeId, outputNodeId: outputCandidates[0] || '', outputCandidates, width, height };
}
function formatElapsed(ms?: number) {
  if (!ms) return '0秒';
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}分${s}秒` : `${s}秒`;
}
function loadConfig(): ComfyConfig {
  const saved = safeJsonParse(localStorage.getItem(COMFY_KEY) || '', DEFAULT_CONFIG);
  const presets = Array.isArray(saved.presets) && saved.presets.length > 0 ? saved.presets : [DEFAULT_PRESET];
  const activePresetId = presets.some((p) => p.id === saved.activePresetId) ? saved.activePresetId : presets[0].id;
  return { ...DEFAULT_CONFIG, ...saved, presets, activePresetId };
}

function genderPrompt(gender: NPC['gender'] | BirthSettings['gender']) {
  if (gender === 'female') return { positive: 'female, woman, feminine face, slim female body, delicate facial features, clearly female', negative: 'male, man, masculine face, beard, moustache, broad male chest, male body' };
  if (gender === 'male') return { positive: 'male, man, masculine face, male body, clearly male', negative: 'female, woman, feminine face, breasts, female body, long eyelashes makeup' };
  return { positive: 'androgynous wuxia character, elegant facial structure', negative: '' };
}

function sanitizeStoryForPortrait(text: string) {
  const raw = clampText(text || '', 260)
    .replace(/前世记忆如潮水般涌上心头[^。！？]*[。！？]?/g, '')
    .replace(/如今你穿越到了[^。！？]*[。！？]?/g, '')
    .replace(/高武[^。！？]*玄幻[^。！？]*[。！？]?/g, '')
    .replace(/天玄大陆[^。！？]*[。！？]?/g, '')
    .replace(/发现自己竟[^。！？]*[。！？]?/g, '')
    .replace(/从昏沉中醒来[^。！？]*[。！？]?/g, '')
    .replace(/背景弱化为[^。！？]*[。！？]?/g, '')
    .trim();
  const sentences = raw.split(/[。！？!?.]/).map(s => s.trim()).filter(Boolean);
  const emotionKeys = ['紧张', '警惕', '疲惫', '冷静', '困惑', '倔强', '悲伤', '愤怒', '沉默', '戒备', '温和', '平静'];
  const poseKeys = ['抬眼', '侧身', '回望', '站立', '持剑', '握拳', '低头', '凝视', '倚墙', '扶伤'];
  const chosen = sentences.filter(s => emotionKeys.some(k => s.includes(k)) || poseKeys.some(k => s.includes(k))).slice(0, 2);
  const compact = chosen.join('，') || sentences.slice(0, 2).join('，');
  return compact || '神情克制，带着江湖人的警觉与疲惫。';
}

function buildNpcVisualDetail(npc: NPC, extraNote?: string) {
  const personality = npc.personalityTags?.join('、') || '克制沉稳';
  const autoSummary = buildNPCVisualSummary(npc, extraNote);
  const occupationLook = npc.occupation.includes('医')
    ? '衣着整洁，袖口利落，身上带淡淡药香，气质清雅'
    : npc.occupation.includes('游侠')
      ? '行动利落，衣袂轻便，身上带风尘与江湖气'
      : npc.occupation.includes('散修')
        ? '打扮简洁，目光警醒，像长期独行于江湖'
        : npc.occupation.includes('镖')
          ? '体格结实，站姿稳，带着护卫与行走四方的粗粝气'
          : '古风江湖装束，气质鲜明';
  return [autoSummary, occupationLook, `性格外化：${personality}`].filter(Boolean).join('，');
}

function buildNpcPortraitPromptText(npc: NPC, context: { location: string; timeText: string; weather: string; story: string; extraNote?: string }) {
  const gender = genderPrompt(npc.gender);
  const visualDetail = buildNpcVisualDetail(npc, context.extraNote);
  const moodText = npc.mood ? `神态倾向：${npc.mood}` : '神态倾向：克制、真实、有分寸';
  const relationText = npc.romance?.stage && npc.romance.stage !== 'none'
    ? `与你当前情感阶段：${npc.romance.stage}，通过眼神、姿态与距离感体现微妙关系。`
    : '与你关系尚在发展中，通过神态保留距离与真实感。';
  const sceneHint = sanitizeStoryForPortrait(context.story);
  const ageGenderTitle = getAgeGenderLabel(npc.age, npc.gender);
  return [
    'masterpiece, best quality, detailed chinese wuxia character portrait, chinese fantasy character concept art, cinematic light, highly detailed face, natural skin texture, period clothing, no modern elements',
    gender.positive,
    `${npc.name}，${ageGenderTitle}，${npc.age}岁，${npc.occupation}`,
    visualDetail,
    moodText,
    relationText,
    `人物情境：${sceneHint}`,
    `背景仅作烘托：${context.location}，${context.timeText}，${context.weather}`,
    '半身到全身人物立绘，人物必须是画面主体，突出服饰、发型、五官轮廓、眼神和姿势；背景弱化，不要把整段剧情写在画面里，不要路人视角，不要画成另一性别。',
    '人物身份必须清晰可辨，不要把角色画成模糊的“你”或无特征路人。'
  ].join('，');
}

function buildPlayerPortraitPromptText(player: GameState['player'], birthSettings: BirthSettings | null | undefined, context: { location: string; timeText: string; weather: string; story: string; extraNote?: string }) {
  const gender = genderPrompt(birthSettings?.gender || player.gender);
  const age = birthSettings?.age || player.age;
  const title = getAgeGenderLabel(age, birthSettings?.gender || player.gender);
  const originMap: Record<string, string> = { beggar: '流浪乞丐', begger: '流浪乞丐', farmer: '农家子弟', scholar: '落魄书生', soldier: '军户遗孤', merchant: '商贾之后' };
  const memoryMap: Record<string, string> = { webnovel: '熟读网文套路', martial: '懂些现代搏击基础', medical: '懂基础医学与伤口处理', engineer: '有结构与工具思维', history: '熟悉古代社会与人情' };
  const traitMap: Record<string, string> = { resilient: '极其坚韧，吃苦能忍', agile: '机敏灵动，动作轻快', calm: '沉稳冷静，不易慌乱', passionate: '血气旺盛，意志外放', cold: '克制理性，情绪收束' };
  const role = player.role || '江湖中人';
  const appearance = (player.appearance || '').trim() || '黑发束起，面容清晰，体态利落，气质带着初入江湖的生涩与警觉';
  const equipmentSummary = [player.equipment.mainHand?.name, player.equipment.offHand?.name, player.equipment.body?.name, player.equipment.accessory1?.name, player.equipment.accessory2?.name].filter(Boolean).join('、');
  const martial = (player.martialArts || []).map((m) => m.name).join('、') || '尚无成体系武学';
  const traits = (player.traits || []).join('、') || traitMap[birthSettings?.trait || ''] || '性情未明';
  const origin = originMap[birthSettings?.origin || ''] || '来历尚隐';
  const memory = memoryMap[birthSettings?.memory || ''] || '前世记忆模糊';
  const sceneHint = sanitizeStoryForPortrait(context.story);
  const extra = (context.extraNote || '').trim();
  return [
    'masterpiece, best quality, chinese wuxia character portrait, chinese fantasy protagonist illustration, highly detailed face, cinematic portrait lighting, ancient costume, natural skin texture, no modern elements',
    gender.positive,
    `${player.name}，${title}，${age}岁`,
    `身份：${role}`,
    `出身：${origin}`,
    `前世记忆：${memory}`,
    `外貌与气质：${appearance}`,
    `性情与特质：${traits}`,
    player.sect ? `门派/传承：${player.sect}` : '无明确门派，带着散修或初入江湖者的气息',
    equipmentSummary ? `常见装备：${equipmentSummary}` : '衣着朴素，尚无华贵装备',
    `武学与修为：境界阶段 ${player.cultivationStage || 0}，武学 ${martial}`,
    birthSettings?.goal ? `当前目标：${birthSettings.goal}` : '当前目标：先活下去，站稳脚跟',
    `人物情境：${sceneHint}`,
    extra ? `补充细节：${extra}` : '',
    `背景仅作弱化烘托：${context.location}，${context.timeText}，${context.weather}`,
    '半身到全身人物立绘，人物必须是唯一主体；必须明确表现性别、年龄感、发型、面部轮廓、眼神、姿态、服装层次；不要只写“你”，不要模糊主角身份，不要群像，不要路人视角，不要画成另一性别。',
    '主角必须是具体可识别的人物，而不是抽象代词。'
  ].filter(Boolean).join('，');
}

export default function SceneImagePanel({ state, birthSettings, latestStoryText, anchorLogId, manualRequest, onSceneGenerated }: SceneImagePanelProps) {
  const [config, setConfig] = useState<ComfyConfig>(() => loadConfig());
  const [showSettings, setShowSettings] = useState(false);
  const [showPresetTools, setShowPresetTools] = useState(false);
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<null | 'test' | 'scene' | 'portrait'>(null);
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus>({ phase: 'idle', text: '尚未提交文生图任务。' });
  const [scenes, setScenes] = useState<GeneratedScene[]>(() => safeJsonParse(localStorage.getItem(SCENE_KEY) || '', []));
  const [detectMessage, setDetectMessage] = useState('');
  const [presetDraftName, setPresetDraftName] = useState('新流程预设');
  const [presetDraftDesc, setPresetDraftDesc] = useState('');
  const [scenePromptDraft, setScenePromptDraft] = useState('');
  const [portraitPromptDraft, setPortraitPromptDraft] = useState('');
  const [scenePromptDirty, setScenePromptDirty] = useState(false);
  const [portraitPromptDirty, setPortraitPromptDirty] = useState(false);
  const [promptEditorMode, setPromptEditorMode] = useState<'scene' | 'portrait'>('scene');
  const [useEditedPromptForAuto, setUseEditedPromptForAuto] = useState(false);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [openSceneTabAfterSceneGen, setOpenSceneTabAfterSceneGen] = useState(true);
  const [autoSwitchToSceneAfterPortrait, setAutoSwitchToSceneAfterPortrait] = useState(false);
  const [resolvedSceneUrls, setResolvedSceneUrls] = useState<Record<string, string>>({});
  const [orchestratorSettings, setOrchestratorSettings] = useState(() => loadOrchestratorSettings());
  const autoLastKeyRef = useRef('');
  const generatingKeyRef = useRef('');
  const lastManualNonceRef = useRef(0);
  const lastManualKeyRef = useRef('');
  const cancelCurrentRef = useRef(false);
  const firstAutoEffectRef = useRef(true);
  const lastObservedAnchorRef = useRef<string | null>(null);

  useEffect(() => { localStorage.setItem(COMFY_KEY, JSON.stringify(config)); }, [config]);
  useEffect(() => { localStorage.setItem(SCENE_KEY, JSON.stringify(scenes.slice(0, 30))); }, [scenes]);
  useEffect(() => {
    const sync = () => setOrchestratorSettings(loadOrchestratorSettings());
    window.addEventListener('storage', sync);
    const timer = setInterval(sync, 2000);
    return () => {
      window.removeEventListener('storage', sync);
      clearInterval(timer);
    };
  }, []);
  const sceneImageKeySignature = useMemo(
    () => scenes.map((scene) => `${scene.id}:${String(scene.imageKey || '')}`).join('|'),
    [scenes]
  );
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const next: Record<string, string> = {};
      for (const scene of scenes) {
        const imageKey = scene.imageKey;
        if (!imageKey) continue;
        try {
          const url = await getImageObjectUrl(imageKey);
          if (url) next[scene.id] = url;
        } catch {
          // 单张图片解析失败时跳过，避免整个面板异常
        }
      }
      if (!cancelled) setResolvedSceneUrls(next);
    };
    run();
    return () => { cancelled = true; };
  }, [sceneImageKeySignature]);

  const currentLocation = state.locations.find((l) => l.name === state.world.location);
  const activePreset = useMemo(() => config.presets.find((p) => p.id === config.activePresetId) || config.presets[0] || DEFAULT_PRESET, [config]);
  const targetNpc = useMemo(() => manualRequest?.npcId ? state.npcs.find((n) => n.id === manualRequest.npcId) || null : null, [manualRequest, state.npcs]);
  const loading = actionLoading !== null;

  const sceneKey = useMemo(() => `${state.world.location}|${weatherMap[state.world.weather.current] || state.world.weather.current}|${shichenLabel(state.world.time)}|${clampText(latestStoryText || '', 160)}`,[state.world.location, state.world.weather.current, state.world.time, latestStoryText]);
  const locationFlavor = useMemo(() => {
    const base = currentLocation?.description ? clampText(currentLocation.description, 80) : state.world.location;
    const weather = weatherMap[state.world.weather.current] || state.world.weather.current;
    const time = shichenLabel(state.world.time);
    const temp = `${state.world.weather.temperature}度`;
    return `${state.world.location}。${base}。${time}${weather}，气温约${temp}。`;
  }, [currentLocation, state.world.location, state.world.weather.current, state.world.weather.temperature, state.world.time]);

  const scenePrompt = useMemo(() => {
    const story = clampText(latestStoryText || '', 120);
    const weather = weatherMap[state.world.weather.current] || state.world.weather.current;
    const time = shichenLabel(state.world.time);
    return [
      'masterpiece, best quality, chinese fantasy wuxia environment, cinematic environment art, ancient chinese town or wilderness, detailed atmosphere, immersive lighting',
      `${state.world.location}, ${time}, ${weather}`,
      locationFlavor,
      story ? `画面情节氛围：${story}` : '画面情节氛围：江湖中一个静中带险的片刻。',
      '以环境与场景本身为主角，强调建筑、山道、雨雾、灯火、河岸、树影、地面痕迹、远景层次；人物若出现，只作为远处小比例陪衬，不要人物特写，不要人物卡面，不要状态说明。',
      'no modern objects, no UI, no text overlay'
    ].join('，');
  }, [latestStoryText, locationFlavor, state.world.location, state.world.weather.current, state.world.time]);

  const portraitPrompt = useMemo(() => {
    const timeText = shichenLabel(state.world.time);
    const weather = weatherMap[state.world.weather.current] || state.world.weather.current;
    const story = clampText(latestStoryText || '', 120);
    const npc = targetNpc;
    if (npc) return buildNpcPortraitPromptText(npc, { location: state.world.location, timeText, weather, story, extraNote: getStoredPortraitNote(npc.id) });
    return buildPlayerPortraitPromptText(state.player, birthSettings, { location: state.world.location, timeText, weather, story, extraNote: getStoredPlayerPortraitNote() });
  }, [birthSettings, latestStoryText, state.player, state.world.location, state.world.time, state.world.weather.current, targetNpc]);

  useEffect(() => { if (!scenePromptDirty) setScenePromptDraft(scenePrompt); }, [scenePrompt, scenePromptDirty]);
  useEffect(() => { if (!portraitPromptDirty) setPortraitPromptDraft(portraitPrompt); }, [portraitPrompt, portraitPromptDirty]);

  const applyPresetField = (updates: Partial<WorkflowPreset>) => setConfig((prev) => ({ ...prev, presets: prev.presets.map((p) => p.id === prev.activePresetId ? { ...p, ...updates } : p) }));
  const cloneCurrentPreset = () => {
    const cloned: WorkflowPreset = { ...activePreset, id: `preset_${Date.now()}`, name: presetDraftName || `${activePreset.name} 副本`, description: presetDraftDesc || activePreset.description || '' };
    setConfig((prev) => ({ ...prev, presets: [...prev.presets, cloned], activePresetId: cloned.id }));
    setDetectMessage(`已创建新流程预设：${cloned.name}`);
  };
  const deletePreset = (presetId: string) => {
    if (config.presets.length <= 1) return setDetectMessage('至少保留一个流程预设。');
    const nextPresets = config.presets.filter((p) => p.id !== presetId);
    setConfig((prev) => ({ ...prev, presets: nextPresets, activePresetId: nextPresets[0]?.id || DEFAULT_PRESET.id }));
    setDetectMessage('已删除流程预设。');
  };
  const applyAutoDetect = () => {
    const detected = autoDetectWorkflowNodes(activePreset.workflowApiJson);
    if (!detected) return setDetectMessage('未识别到有效的 API workflow JSON。');
    applyPresetField({ positiveNodeId: detected.positiveNodeId || activePreset.positiveNodeId, negativeNodeId: detected.negativeNodeId || activePreset.negativeNodeId, widthNodeId: detected.widthNodeId || activePreset.widthNodeId, heightNodeId: detected.heightNodeId || activePreset.heightNodeId, seedNodeId: detected.seedNodeId || activePreset.seedNodeId, samplerNodeId: detected.samplerNodeId || activePreset.samplerNodeId, outputNodeId: detected.outputNodeId || activePreset.outputNodeId, width: detected.width || activePreset.width, height: detected.height || activePreset.height });
    setDetectMessage(detected.outputCandidates?.length ? `已自动识别并填写当前流程节点信息。输出节点：${detected.outputCandidates.join('、')}` : '已自动识别当前流程节点。未识别到明确输出节点，生成时会自动递归查找图像输出。');
  };

  const testConnection = async () => {
    setActionLoading('test'); setError('');
    try {
      const endpoint = normalizeEndpoint(config.endpoint);
      await fetchJson(`${endpoint}/system_stats`, undefined, 8000).catch(async () => { await fetchJson(`${endpoint}/queue`, undefined, 8000); });
      setStatus('ok');
      setRuntimeStatus({ phase: 'idle', text: '连接正常，可以提交文生图任务。' });
    } catch (e) {
      setStatus('error'); setError(e instanceof Error ? e.message : '连接失败');
      setRuntimeStatus({ phase: 'error', text: '连接异常，请检查地址、代理或 ComfyUI 是否已启动。' });
    } finally { setActionLoading(null); }
  };

  const buildWorkflow = (promptText: string, mode: 'scene' | 'portrait') => {
    const workflow = JSON.parse(JSON.stringify(parseWorkflowJson(activePreset.workflowApiJson || '{}')));
    if (!Object.keys(workflow).length) throw new Error('请先在当前流程预设中粘贴 ComfyUI API workflow JSON');
    const setNodeInput = (nodeId: string, key: string, value: unknown) => { if (!workflow[nodeId]) return; if (!workflow[nodeId].inputs) workflow[nodeId].inputs = {}; workflow[nodeId].inputs[key] = value; };
    setNodeInput(activePreset.positiveNodeId, 'text', promptText);
    let negativePrompt = activePreset.negativePrompt || DEFAULT_NEGATIVE;
    if (mode === 'portrait') {
      const gender = targetNpc ? genderPrompt(targetNpc.gender) : genderPrompt(birthSettings?.gender || state.player.gender);
      if (gender.negative) negativePrompt = `${negativePrompt}, ${gender.negative}`;
      negativePrompt = `${negativePrompt}, wrong gender, gender swap, ambiguous gender, male face on female character, female face on male character`;
    }
    setNodeInput(activePreset.negativeNodeId, 'text', negativePrompt);
    const targetWidth = mode === 'portrait' ? Math.min(activePreset.width, activePreset.height) : Math.max(activePreset.width, activePreset.height);
    const targetHeight = mode === 'portrait' ? Math.max(activePreset.width, activePreset.height) : Math.min(activePreset.width, activePreset.height);
    setNodeInput(activePreset.widthNodeId, 'width', targetWidth);
    setNodeInput(activePreset.heightNodeId, 'height', targetHeight);
    const seed = config.seedMode === 'random' ? Math.floor(Math.random() * 1000000000) : config.fixedSeed;
    setNodeInput(activePreset.seedNodeId, 'seed', seed);
    setNodeInput(activePreset.samplerNodeId, 'seed', seed);
    return { prompt: workflow, client_id: `jianghu-${Date.now()}` };
  };

  const cancelGeneration = () => {
    cancelCurrentRef.current = true;
    setRuntimeStatus((prev) => ({ ...prev, phase: 'cancelled', text: '已停止本次前端轮询。ComfyUI 若已开始执行，仍可能在后台继续完成。' }));
    setActionLoading(null);
  };

  const writePortraitResultIfNeeded = async (scene: GeneratedScene & { imageKey?: string }) => {
    if (scene.mode !== 'portrait' || !scene.imageKey) return;
    if (scene.npcId) {
      updateNPCPortrait(scene.npcId, {
        imageUrl: scene.imageUrl,
        imageKey: scene.imageKey,
        source: 'ai',
        prompt: scene.prompt,
        npcName: scene.npcName || '',
        note: getStoredPortraitNote(scene.npcId)
      });
      return;
    }
    const playerPortrait = loadPlayerPortrait();
    savePlayerPortrait({
      ...(playerPortrait || { updatedAt: Date.now(), source: 'ai' as const }),
      imageUrl: scene.imageUrl,
      imageKey: scene.imageKey,
      updatedAt: Date.now(),
      source: 'ai',
      prompt: scene.prompt,
      title: state.player.name,
      note: playerPortrait?.note || ''
    });
  };

  const exportSceneImage = async (scene: GeneratedScene) => {
    if (!scene.imageUrl) return;
    const a = document.createElement('a');
    a.href = scene.imageUrl;
    a.download = `${scene.mode === 'portrait' ? '角色立绘' : '情节图'}_${scene.location}_${scene.timeText}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const generateScene = async (sourceStory?: string, options?: { auto?: boolean; mode?: 'scene' | 'portrait'; anchorLogId?: string | null; npcId?: string | null; npcName?: string | null }) => {
    const autoMode = !!options?.auto;
    const mode = options?.mode || 'scene';
    const autoPrompt = mode === 'portrait' ? portraitPrompt : scenePrompt;
    const editedPrompt = mode === 'portrait' ? portraitPromptDraft : scenePromptDraft;
    const activePrompt = autoMode ? (useEditedPromptForAuto && editedPrompt.trim() ? editedPrompt.trim() : autoPrompt) : (editedPrompt.trim() || autoPrompt);
    const localKey = `${sceneKey}|${mode}|${options?.npcId || ''}`;
    if (loading) return;
    if (autoMode && config.autoGeneratePaused) return;
    if (autoMode && generatingKeyRef.current === localKey) return;
    if (autoMode && autoLastKeyRef.current === localKey) return;
    setActionLoading(mode); setError(''); generatingKeyRef.current = localKey; cancelCurrentRef.current = false;
    try {
      const endpoint = normalizeEndpoint(config.endpoint);
      const workflow = buildWorkflow(activePrompt, mode);
      const data = await fetchJson(`${endpoint}/prompt`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(workflow) }, 15000);
      const promptId = data.prompt_id; if (!promptId) throw new Error('ComfyUI 未返回 prompt_id');
      setRuntimeStatus({ phase: 'queued', text: '任务已提交，等待进入 ComfyUI 队列；即使 ComfyUI 已计算完成，系统也会继续等待图片文件真正可读取后再显示。', promptId, elapsedMs: 0, outputNodeId: activePreset.outputNodeId || undefined });
      let imageUrl = ''; let finalOutputNode = activePreset.outputNodeId || ''; let lastStatus = '等待 ComfyUI 返回结果…'; const started = Date.now(); const maxWaitMs = 20 * 60 * 1000;
      let firstImageDetectedAt = 0; // 首次检测到图片文件名的时间戳
      while (Date.now() - started < maxWaitMs) {
        if (cancelCurrentRef.current) throw new Error('本次轮询已手动停止。');
        await new Promise((r) => setTimeout(r, 900));
        const result = await getPromptState(endpoint, promptId, activePreset.outputNodeId || undefined).catch(() => null);
        if (!result) continue;
        lastStatus = result.statusText; finalOutputNode = result.outputNodeId || finalOutputNode;
        setRuntimeStatus({ phase: result.hasError ? 'error' : result.running ? 'running' : result.pending ? 'queued' : result.completed ? result.image ? (result.imageReady ? 'completed' : 'checking') : 'checking' : 'checking', text: result.statusText, promptId, elapsedMs: Date.now() - started, queueSize: result.queueSize, queuePosition: result.queuePosition, currentNode: result.currentNode, outputNodeId: finalOutputNode || undefined });
        if (result.hasError) throw new Error(`ComfyUI 任务失败：${result.entry?.status?.status_str || 'workflow 执行异常'}`);
        // 图片就绪（探针通过）
        if (result.image?.filename && result.imageReady) {
          imageUrl = result.probedViewUrl;
          break;
        }
        // 回退：图片文件名已知但探针持续失败 > 10 秒，直接信任 URL（代理可能不支持 Range 请求）
        if (result.image?.filename && !result.imageReady && result.probedViewUrl) {
          if (!firstImageDetectedAt) firstImageDetectedAt = Date.now();
          if (Date.now() - firstImageDetectedAt > 10000) {
            imageUrl = result.probedViewUrl;
            break;
          }
        } else {
          firstImageDetectedAt = 0; // 重置（可能图片还没出来或已变化）
        }
        if (result.completed && !result.running && !result.pending) {
          const outputs = JSON.stringify(result.entry?.outputs || {});
          if (/saveimage|previewimage|images/i.test(outputs)) continue;
          throw new Error('ComfyUI 任务已结束，但当前 workflow 输出里没有可识别的图片。请检查是否包含 SaveImage / PreviewImage / 图像输出节点。');
        }
      }
      if (!imageUrl) {
        setRuntimeStatus((prev) => ({ ...prev, phase: 'timeout', text: `等待图片超时。最后状态：${lastStatus}`, elapsedMs: Date.now() - started }));
        throw new Error(`等待图片超时。最后状态：${lastStatus}。如果你的流程较长（如 10~20 分钟），请确认 workflow 最终确实会输出图片，并适当减少高耗时节点。`);
      }
      const imageKey = `sceneimg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      let persistedImageKey: string | undefined = imageKey;
      let runtimeImageUrl = imageUrl;
      const strictImageSafety = orchestratorSettings.enabled && orchestratorSettings.imageSafetyLevel >= 80;
      try {
        await saveImageFromUrl(imageKey, imageUrl);
      } catch (persistErr) {
        persistedImageKey = undefined;
        runtimeImageUrl = strictImageSafety ? '' : imageUrl;
        logger.image.warn('图片本地缓存失败，已降级使用运行时URL：', persistErr);
      }
      const scene: GeneratedScene = {
        id: `scene_${Date.now()}`,
        prompt: activePrompt,
        imageUrl: runtimeImageUrl, 
        timestamp: Date.now(),
        location: state.world.location,
        weather: weatherMap[state.world.weather.current] || state.world.weather.current,
        timeText: shichenLabel(state.world.time),
        sourceStory: sourceStory || latestStoryText || '',
        mode,
        anchorLogId: options?.anchorLogId ?? anchorLogId ?? null,
        npcId: options?.npcId ?? null,
        npcName: options?.npcName ?? null,
        imageKey: persistedImageKey,
      } as GeneratedScene & { imageKey?: string };
      lastObservedAnchorRef.current = scene.anchorLogId || lastObservedAnchorRef.current;
      setScenes((prev) => {
        const filtered = prev.filter((s) => !(s.mode === mode && s.location === scene.location && s.timeText === scene.timeText && s.weather === scene.weather && (s.sourceStory || '').slice(0, 120) === (scene.sourceStory || '').slice(0, 120) && (s.npcId || '') === (scene.npcId || '')));
        return [scene, ...filtered].slice(0, 30);
      });
      autoLastKeyRef.current = localKey;
      await writePortraitResultIfNeeded(scene);
      if (!orchestratorSettings.enabled || orchestratorSettings.autoSceneImageInsert || mode === 'portrait') {
        onSceneGenerated?.(scene);
      }
      setStatus('ok');
      setRuntimeStatus((prev) => ({ ...prev, phase: 'completed', text: '图片已成功生成并载入。', elapsedMs: Date.now() - started, outputNodeId: finalOutputNode || undefined }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : '生成失败';
      if (msg.includes('手动停止')) setRuntimeStatus((prev) => ({ ...prev, phase: 'cancelled', text: msg }));
      else { setStatus('error'); setError(msg); setRuntimeStatus((prev) => ({ ...prev, phase: 'error', text: msg })); }
    } finally { generatingKeyRef.current = ''; setActionLoading(null); cancelCurrentRef.current = false; }
  };

  useEffect(() => {
    if (!config.enabled || !config.autoGenerateOnAIStory || config.autoGeneratePaused || !latestStoryText) return;
    const autoKey = `${sceneKey}|scene|`;
    if (!sceneKey) return;
    if (firstAutoEffectRef.current) {
      firstAutoEffectRef.current = false;
      autoLastKeyRef.current = autoKey;
      lastObservedAnchorRef.current = anchorLogId || null;
      return;
    }
    const hasNewStoryAnchor = !!anchorLogId && anchorLogId !== lastObservedAnchorRef.current;
    if (!hasNewStoryAnchor) return;
    lastObservedAnchorRef.current = anchorLogId || null;
    if (autoLastKeyRef.current === autoKey || generatingKeyRef.current === autoKey || loading) return;
    generateScene(latestStoryText, { auto: true, mode: 'scene', anchorLogId });
  }, [sceneKey, config.enabled, config.autoGenerateOnAIStory, config.autoGeneratePaused, latestStoryText, anchorLogId]);

  useEffect(() => {
    if (!manualRequest || !config.enabled) return;
    const reqKey = `${manualRequest.nonce}|${manualRequest.mode}|${manualRequest.npcId || ''}|${manualRequest.npcName || ''}`;
    if (manualRequest.nonce <= lastManualNonceRef.current) return;
    if (lastManualKeyRef.current === reqKey) return;
    if (loading) return;
    lastManualNonceRef.current = manualRequest.nonce;
    lastManualKeyRef.current = reqKey;
    generateScene(latestStoryText, { auto: false, mode: manualRequest.mode, anchorLogId, npcId: manualRequest.npcId ?? null, npcName: manualRequest.npcName ?? null });
  }, [manualRequest, config.enabled, loading, latestStoryText, anchorLogId]);

  const duplicateActivePreset = () => { setPresetDraftName(`${activePreset.name} 副本`); setPresetDraftDesc(activePreset.description || ''); cloneCurrentPreset(); };

  return (
    <div className="space-y-3 flex flex-col">
      <div className="flex items-center gap-2 text-fuchsia-400 font-bold"><ImageIcon size={16} /><span>场景图像</span></div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 overflow-hidden">
        <button onClick={() => setShowSettings((v) => !v)} className="w-full p-3 flex items-center justify-between hover:bg-zinc-800/30 transition text-xs text-zinc-400">
          <div className="flex items-center gap-2 min-w-0">
            <Activity size={12} className={status === 'ok' ? 'text-green-400' : status === 'error' ? 'text-red-400' : 'text-zinc-500'} />
            <span className="truncate">ComfyUI{status === 'ok' ? ' · 已连接' : status === 'error' ? ' · 异常' : ' · 未检测'}</span>
            <span className="text-[10px] text-zinc-600 truncate hidden sm:inline">{normalizeEndpoint(config.endpoint)}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${runtimeStatus.phase === 'running' ? 'bg-fuchsia-950/60 text-fuchsia-300' : runtimeStatus.phase === 'queued' ? 'bg-amber-950/60 text-amber-300' : runtimeStatus.phase === 'completed' ? 'bg-emerald-950/60 text-emerald-300' : runtimeStatus.phase === 'error' || runtimeStatus.phase === 'timeout' ? 'bg-red-950/60 text-red-300' : 'bg-zinc-800 text-zinc-400'}`}>{runtimeStatus.phase}</span>
            <ChevronDown size={12} className={`transition-transform ${showSettings ? 'rotate-180' : ''}`} />
          </div>
        </button>
        {showSettings && (
          <div className="px-3 pb-3 space-y-3 border-t border-zinc-800 pt-2">
            <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/50 p-2 space-y-2">
              <div className="text-xs text-zinc-200">{runtimeStatus.text}</div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-500">
                <div className="rounded bg-zinc-900/70 px-2 py-1.5 flex items-center gap-1"><Clock3 size={11} />耗时：{formatElapsed(runtimeStatus.elapsedMs)}</div>
                <div className="rounded bg-zinc-900/70 px-2 py-1.5 flex items-center gap-1"><Layers3 size={11} />队列：{runtimeStatus.queueSize ?? 0}{runtimeStatus.queuePosition !== null && runtimeStatus.queuePosition !== undefined ? ` / 位置 ${runtimeStatus.queuePosition}` : ''}</div>
                <div className="rounded bg-zinc-900/70 px-2 py-1.5 col-span-2">当前节点：{runtimeStatus.currentNode || '未知 / 暂未返回'}</div>
                <div className="rounded bg-zinc-900/70 px-2 py-1.5 col-span-2">输出节点：{runtimeStatus.outputNodeId || activePreset.outputNodeId || '自动识别中'}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={testConnection} disabled={loading} className="py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs flex items-center justify-center gap-2 disabled:opacity-50">{actionLoading === 'test' ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}测试连接</button>
              <button onClick={() => generateScene(latestStoryText, { auto: false, mode: 'scene', anchorLogId })} disabled={loading || !config.enabled} className="py-2 rounded bg-fuchsia-700 hover:bg-fuchsia-600 text-white text-xs flex items-center justify-center gap-2 disabled:opacity-50">{actionLoading === 'scene' ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}提交当前情节图提示词</button>
              <button onClick={() => generateScene(latestStoryText, { auto: false, mode: 'portrait', anchorLogId, npcId: targetNpc?.id ?? null, npcName: targetNpc?.name ?? null })} disabled={loading || !config.enabled} className="py-2 rounded bg-pink-700 hover:bg-pink-600 text-white text-xs flex items-center justify-center gap-2 disabled:opacity-50">{actionLoading === 'portrait' ? <Loader2 size={12} className="animate-spin" /> : <UserCircle2 size={12} />}{targetNpc ? `提交 ${targetNpc.name} 立绘提示词` : '提交角色立绘提示词'}</button>
              <button onClick={cancelGeneration} disabled={!loading} className="py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-white text-xs flex items-center justify-center gap-2 disabled:opacity-40">{loading ? <Square size={12} /> : <PauseCircle size={12} />}暂停/停止轮询</button>
            </div>
          <label className="flex items-center gap-2 text-xs text-zinc-300"><input type="checkbox" checked={config.enabled} onChange={(e) => setConfig((prev) => ({ ...prev, enabled: e.target.checked }))} />启用本地 ComfyUI 文生图</label>
          <label className="flex items-center gap-2 text-xs text-zinc-300"><input type="checkbox" checked={config.autoGenerateOnAIStory} onChange={(e) => setConfig((prev) => ({ ...prev, autoGenerateOnAIStory: e.target.checked }))} />AI 新剧情时自动生成场景图</label>
          <label className="flex items-center gap-2 text-xs text-zinc-300"><input type="checkbox" checked={config.autoGeneratePaused} onChange={(e) => setConfig((prev) => ({ ...prev, autoGeneratePaused: e.target.checked }))} />暂停自动生成（只保留手动生成）</label>
          <label className="flex items-center gap-2 text-xs text-zinc-300"><input type="checkbox" checked={openSceneTabAfterSceneGen} onChange={(e) => setOpenSceneTabAfterSceneGen(e.target.checked)} />生成情节图后自动停留在场景图页</label>
          <label className="flex items-center gap-2 text-xs text-zinc-300"><input type="checkbox" checked={autoSwitchToSceneAfterPortrait} onChange={(e) => setAutoSwitchToSceneAfterPortrait(e.target.checked)} />生成角色立绘时也自动切到场景图页</label>
          <div className="space-y-1"><div className="text-[11px] text-zinc-500">ComfyUI 地址</div><input value={config.endpoint} onChange={(e) => setConfig((prev) => ({ ...prev, endpoint: e.target.value }))} className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-2 text-xs text-white" placeholder="/api/comfy（开发环境推荐）或 http://127.0.0.1:8188" /><div className="text-[11px] text-zinc-600">使用 Vite 本地开发时，推荐填写 <span className="text-fuchsia-400">/api/comfy</span>，由开发服务器代理到本地 ComfyUI，避免 403 Host/Origin 校验错误。</div></div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 space-y-3">
            <div className="flex items-center justify-between"><div className="text-xs text-zinc-300 font-medium">流程存档 / 预设</div><button onClick={() => setShowPresetTools((v) => !v)} className="text-zinc-500 hover:text-white text-xs flex items-center gap-1"><ChevronDown size={12} className={`${showPresetTools ? 'rotate-180' : ''} transition`} /> 管理</button></div>
            <select value={config.activePresetId} onChange={(e) => setConfig((prev) => ({ ...prev, activePresetId: e.target.value }))} className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-2 text-xs text-white">{config.presets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}</select>
            <div className="text-[11px] text-zinc-500">当前流程：{activePreset.description || '未填写说明'}</div>
            {showPresetTools && (<div className="space-y-2 border-t border-zinc-800 pt-3"><div className="grid grid-cols-1 md:grid-cols-2 gap-2"><input value={presetDraftName} onChange={(e) => setPresetDraftName(e.target.value)} className="bg-zinc-950 border border-zinc-700 rounded px-2 py-2 text-xs text-white" placeholder="新预设名称" /><input value={presetDraftDesc} onChange={(e) => setPresetDraftDesc(e.target.value)} className="bg-zinc-950 border border-zinc-700 rounded px-2 py-2 text-xs text-white" placeholder="说明（可选）" /></div><div className="flex flex-wrap gap-2"><button onClick={cloneCurrentPreset} className="px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs flex items-center gap-1"><Plus size={12} />按当前内容新建存档</button><button onClick={duplicateActivePreset} className="px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs flex items-center gap-1"><Copy size={12} />复制当前流程</button><button onClick={() => deletePreset(activePreset.id)} className="px-3 py-2 rounded bg-red-900 hover:bg-red-800 text-red-100 text-xs flex items-center gap-1"><Trash2 size={12} />删除当前流程</button></div></div>)}
          </div>
          <div className="grid grid-cols-2 gap-2"><div><div className="text-[11px] text-zinc-500 mb-1">宽度</div><input type="number" value={activePreset.width} onChange={(e) => applyPresetField({ width: parseInt(e.target.value, 10) || 832 })} className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-2 text-xs text-white" /></div><div><div className="text-[11px] text-zinc-500 mb-1">高度</div><input type="number" value={activePreset.height} onChange={(e) => applyPresetField({ height: parseInt(e.target.value, 10) || 512 })} className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-2 text-xs text-white" /></div></div>
          <div className="grid grid-cols-2 gap-2"><div><div className="text-[11px] text-zinc-500 mb-1">正面提示词节点ID</div><input value={activePreset.positiveNodeId} onChange={(e) => applyPresetField({ positiveNodeId: e.target.value })} className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-2 text-xs text-white" /></div><div><div className="text-[11px] text-zinc-500 mb-1">负面提示词节点ID</div><input value={activePreset.negativeNodeId} onChange={(e) => applyPresetField({ negativeNodeId: e.target.value })} className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-2 text-xs text-white" /></div><div><div className="text-[11px] text-zinc-500 mb-1">宽度节点ID</div><input value={activePreset.widthNodeId} onChange={(e) => applyPresetField({ widthNodeId: e.target.value })} className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-2 text-xs text-white" /></div><div><div className="text-[11px] text-zinc-500 mb-1">高度节点ID</div><input value={activePreset.heightNodeId} onChange={(e) => applyPresetField({ heightNodeId: e.target.value })} className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-2 text-xs text-white" /></div><div><div className="text-[11px] text-zinc-500 mb-1">种子节点ID</div><input value={activePreset.seedNodeId} onChange={(e) => applyPresetField({ seedNodeId: e.target.value })} className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-2 text-xs text-white" /></div><div><div className="text-[11px] text-zinc-500 mb-1">采样节点ID</div><input value={activePreset.samplerNodeId} onChange={(e) => applyPresetField({ samplerNodeId: e.target.value })} className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-2 text-xs text-white" /></div><div className="col-span-2"><div className="text-[11px] text-zinc-500 mb-1">输出图像节点ID（可留空自动识别）</div><input value={activePreset.outputNodeId} onChange={(e) => applyPresetField({ outputNodeId: e.target.value })} className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-2 text-xs text-white" /></div></div>
          <div className="space-y-1"><div className="text-[11px] text-zinc-500">负面提示词</div><textarea value={activePreset.negativePrompt} onChange={(e) => applyPresetField({ negativePrompt: e.target.value })} className="w-full h-20 bg-zinc-950 border border-zinc-700 rounded px-2 py-2 text-xs text-white resize-none" /></div>
          <div className="space-y-1"><div className="flex items-center justify-between text-[11px] text-zinc-500"><span>Workflow API JSON（当前流程）</span><span className="text-zinc-600">可为多个流程分别保存</span></div><textarea value={activePreset.workflowApiJson} onChange={(e) => { const value = e.target.value; applyPresetField({ workflowApiJson: value }); const trimmed = value.trim(); const looksComplete = trimmed.startsWith('{') && trimmed.endsWith('}'); if (looksComplete && trimmed.length > 100) { const detected = autoDetectWorkflowNodes(value); if (detected) { applyPresetField({ workflowApiJson: value, positiveNodeId: detected.positiveNodeId || activePreset.positiveNodeId, negativeNodeId: detected.negativeNodeId || activePreset.negativeNodeId, widthNodeId: detected.widthNodeId || activePreset.widthNodeId, heightNodeId: detected.heightNodeId || activePreset.heightNodeId, seedNodeId: detected.seedNodeId || activePreset.seedNodeId, samplerNodeId: detected.samplerNodeId || activePreset.samplerNodeId, outputNodeId: detected.outputNodeId || activePreset.outputNodeId, width: detected.width || activePreset.width, height: detected.height || activePreset.height }); setDetectMessage(detected.outputCandidates?.length ? `已自动识别当前流程关键节点，输出节点候选：${detected.outputCandidates.join('、')}` : '已自动识别当前流程关键节点。未发现明确输出节点，生成时会自动递归查找图像输出。'); } } }} className="w-full h-40 bg-zinc-950 border border-zinc-700 rounded px-2 py-2 text-[11px] text-white font-mono resize-none" placeholder='{"3":{"inputs":...}}' /></div>
          <div className="flex flex-wrap gap-2"><button onClick={applyAutoDetect} className="px-3 py-2 rounded bg-fuchsia-900/70 hover:bg-fuchsia-800 text-fuchsia-100 text-xs flex items-center gap-2"><Wand2 size={12} />自动识别节点</button><button onClick={() => localStorage.setItem(COMFY_KEY, JSON.stringify(config))} className="px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs flex items-center gap-2"><Save size={12} />保存当前配置</button><button onClick={() => { navigator.clipboard.writeText(activePreset.workflowApiJson || '').catch(() => undefined); setDetectMessage('已复制当前流程 JSON。'); }} className="px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs flex items-center gap-2"><Copy size={12} />复制当前流程</button><button onClick={() => { setConfig(DEFAULT_CONFIG); setDetectMessage(''); }} className="px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs flex items-center gap-2"><RefreshCw size={12} />重置全部</button></div>
          {detectMessage && <div className="text-[11px] text-fuchsia-300 bg-fuchsia-950/20 border border-fuchsia-900/50 rounded p-2">{detectMessage}</div>}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 overflow-hidden">
        <button onClick={() => setShowPromptEditor((v) => !v)} className="w-full p-3 flex items-center justify-between hover:bg-zinc-800/30 transition text-xs text-zinc-400">
          <span className="flex items-center gap-2">{promptEditorMode === 'scene' ? <Sparkles size={12} /> : <UserCircle2 size={12} />}<span>提示词编辑器{!showPromptEditor ? '（点击展开）' : ''}</span></span>
          <ChevronDown size={12} className={`transition-transform ${showPromptEditor ? 'rotate-180' : ''}`} />
        </button>
        {showPromptEditor && (
          <div className="px-3 pb-3 space-y-3 border-t border-zinc-800 pt-2">
            <div className="flex items-center gap-2 text-[11px]"><button onClick={() => setPromptEditorMode('scene')} className={`px-2 py-1 rounded border ${promptEditorMode === 'scene' ? 'border-fuchsia-500 text-fuchsia-300 bg-fuchsia-950/30' : 'border-zinc-700 text-zinc-400 bg-zinc-900/40'}`}>情节图</button><button onClick={() => setPromptEditorMode('portrait')} className={`px-2 py-1 rounded border ${promptEditorMode === 'portrait' ? 'border-pink-500 text-pink-300 bg-pink-950/30' : 'border-zinc-700 text-zinc-400 bg-zinc-900/40'}`}>角色立绘</button></div>
            {promptEditorMode === 'scene' ? (<><div className="text-[11px] text-zinc-500 leading-relaxed whitespace-pre-wrap max-h-20 overflow-y-auto bg-zinc-950/60 rounded p-2">{scenePrompt}</div><textarea value={scenePromptDraft} onChange={(e) => { setScenePromptDraft(e.target.value); setScenePromptDirty(true); }} className="w-full h-28 bg-zinc-950 border border-zinc-700 rounded px-2 py-2 text-[11px] text-white resize-none" placeholder="可手动补充镜头、构图、天气、建筑细节、光线、色调等。" /><div className="flex flex-wrap gap-2"><button onClick={() => { setScenePromptDraft(scenePrompt); setScenePromptDirty(false); }} className="px-2 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px]">恢复建议稿</button><button onClick={() => navigator.clipboard.writeText(scenePromptDraft || scenePrompt).catch(() => undefined)} className="px-2 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px]">复制提交稿</button></div></>) : (<><div className="text-[11px] text-zinc-500 leading-relaxed whitespace-pre-wrap max-h-20 overflow-y-auto bg-zinc-950/60 rounded p-2">{portraitPrompt}</div><textarea value={portraitPromptDraft} onChange={(e) => { setPortraitPromptDraft(e.target.value); setPortraitPromptDirty(true); }} className="w-full h-28 bg-zinc-950 border border-zinc-700 rounded px-2 py-2 text-[11px] text-white resize-none" placeholder="可手动补充发型、脸型、服装、材质、饰品、动作、表情、镜头等。" /><div className="flex flex-wrap gap-2"><button onClick={() => { setPortraitPromptDraft(portraitPrompt); setPortraitPromptDirty(false); }} className="px-2 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px]">恢复建议稿</button><button onClick={() => navigator.clipboard.writeText(portraitPromptDraft || portraitPrompt).catch(() => undefined)} className="px-2 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px]">复制提交稿</button></div></>)}
            <label className="flex items-center gap-2 text-xs text-zinc-300"><input type="checkbox" checked={useEditedPromptForAuto} onChange={(e) => setUseEditedPromptForAuto(e.target.checked)} />自动出图也使用手动编辑后的提示词</label>
          </div>
        )}
      </div>

      <div className="space-y-2 pr-1">
        <div className="text-xs text-zinc-400 flex items-center gap-2"><ImageIcon size={12} />最近场景图</div>
        {loading && actionLoading !== 'test' && <div className="rounded-lg border border-fuchsia-900/40 bg-fuchsia-950/20 px-3 py-2 text-[11px] text-fuchsia-200">ComfyUI 任务已提交，系统会持续轮询直到真正拿到输出图片；对于复杂新流程，可能需要数分钟到十几分钟，请耐心等待。</div>}
        {scenes.length === 0 && <div className="rounded-lg border border-dashed border-zinc-800 p-4 text-center text-xs text-zinc-600">尚未生成场景图。连接本地 ComfyUI 后可为当前江湖剧情生成对应画面；当前还支持为指定 NPC 生成专属人物画像。</div>}
        {scenes.map((scene) => {
          const imgSrc = resolvedSceneUrls[scene.id] || scene.imageUrl;
          return (
          <div key={scene.id} className="rounded-lg border border-zinc-800 bg-zinc-900/40 overflow-hidden hover-lift animate-image-reveal">
            {imgSrc ? (
              <div
                className={`bg-zinc-950 flex items-center justify-center cursor-pointer group relative ${scene.mode === 'portrait' ? 'h-[320px]' : 'h-[240px]'}`}
                onClick={() => setFullscreenImage(imgSrc)}
                title="点击放大查看"
              >
                <img
                  src={imgSrc}
                  alt="scene"
                  className={`w-full h-full ${scene.mode === 'portrait' ? 'object-contain' : 'object-cover'} transition-transform group-hover:scale-105`}
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="bg-black/60 rounded-full p-2"><Eye size={18} className="text-white" /></div>
                </div>
              </div>
            ) : null}
            <div className="p-3 space-y-2">
              <div className="text-xs text-white flex items-center gap-2 flex-wrap"><span>{scene.location} · {scene.timeText} · {scene.weather}</span><span className={`text-[10px] px-2 py-0.5 rounded-full ${scene.mode === 'portrait' ? 'bg-pink-950/60 text-pink-300 border border-pink-900/40' : 'bg-fuchsia-950/60 text-fuchsia-300 border border-fuchsia-900/40'}`}>{scene.mode === 'portrait' ? '角色立绘' : '剧情插图'}</span>{scene.npcName && <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">{scene.npcName}</span>}</div>
              <div className="text-[11px] text-zinc-500 line-clamp-3">{scene.prompt}</div>
              <div className="flex flex-wrap gap-2"><button onClick={() => exportSceneImage(scene)} className="px-2.5 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] flex items-center gap-1"><Download size={11} />保存图片</button><button onClick={() => navigator.clipboard.writeText(scene.prompt).catch(() => undefined)} className="px-2.5 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] flex items-center gap-1"><Copy size={11} />复制提示词</button></div>
            </div>
          </div>
        )})}
      </div>
      {error && <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/40 rounded p-2">{error}</div>}

      {fullscreenImage && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 cursor-pointer" onClick={() => setFullscreenImage(null)}>
          <button onClick={() => setFullscreenImage(null)} className="absolute top-4 right-4 p-2 bg-zinc-800/80 hover:bg-zinc-700 text-white rounded-full z-10"><X size={20} /></button>
          <img src={fullscreenImage} alt="全屏查看" className="max-w-full max-h-[95vh] object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
