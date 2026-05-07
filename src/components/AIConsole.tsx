import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, BarChart3, Bot, Brain, CheckCircle, ChevronDown, ChevronUp, Copy, DollarSign, ExternalLink, FileJson, Key, Loader2, MapPin, MessageCircle, Play, RefreshCw, Save, Send, Settings, Sparkles, TestTube, User, Wifi, WifiOff, Zap } from 'lucide-react';
import { AIResponse, AIPromptSettings, BirthSettings, Buff, CraftingRecipe, Debuff, Disease, GameState, Injury, NPC, ParseConfig, OrchestratorSettings } from '../types/game';
import { formatSmartParseResult, smartParseAIResponse } from '../utils/aiSmartParser';
import { orchestrateAIResponse, loadOrchestratorSettings } from '../systems/Orchestrator';
import { logger } from '../utils/logger';

interface APIConfig {
  provider: 'openai' | 'claude' | 'ollama' | 'custom' | 'deepseek' | 'qwen' | 'siliconflow';
  apiKey: string;
  endpoint: string;
  model: string;
  enabled: boolean;
  temperature: number;
  maxTokens: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  tokens?: number;
  msgType?: 'npc_speech' | 'scene' | 'system_info' | 'normal';
  speakerName?: string;
  speakerNpcId?: string;
  mood?: string;
}

interface TokenUsage {
  totalTokens: number;
  sessionTokens: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCost: number;
  callCount: number;
}

interface AIConsoleProps {
  state: GameState;
  lastAction: string;
  onUpdate: (data: AIResponse) => void;
  isProcessing?: boolean;
  autoAIEnabled?: boolean;
  setAutoAIEnabled?: (enabled: boolean) => void;
  onRegisterAIGenerator?: (generator: (action: string) => Promise<void>) => void;
  npcTalkRequest?: { npcId: string; npcName: string; prompt: string } | null;
  onNPCTalkHandled?: () => void;
  webInputDraft?: string;
  onWebInputConsumed?: () => void;
  birthSettings?: BirthSettings | null;
}

const DEFAULT_API_CONFIGS: Record<string, Partial<APIConfig>> = {
  openai: { endpoint: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' },
  claude: { endpoint: 'https://api.anthropic.com/v1/messages', model: 'claude-3-haiku-20240307' },
  ollama: { endpoint: 'http://localhost:11434/api/generate', model: 'llama3' },
  deepseek: { endpoint: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-chat' },
  qwen: { endpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', model: 'qwen-turbo' },
  siliconflow: { endpoint: 'https://api.siliconflow.cn/v1/chat/completions', model: 'Qwen/Qwen2.5-7B-Instruct' },
  custom: { endpoint: '', model: '' },
};

const SILICONFLOW_MODELS = [
  { id: 'Qwen/Qwen2.5-7B-Instruct', name: 'Qwen2.5-7B 指令（免费）', free: true },
  { id: 'Qwen/Qwen2.5-14B-Instruct', name: 'Qwen2.5-14B 指令', free: false },
  { id: 'Qwen/Qwen2.5-32B-Instruct', name: 'Qwen2.5-32B 指令', free: false },
  { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen2.5-72B 指令', free: false },
  { id: 'Qwen/Qwen2.5-72B-Instruct-128K', name: 'Qwen2.5-72B 指令 128K', free: false },
  { id: 'Qwen/QwQ-32B-Preview', name: 'QwQ-32B 推理预览', free: false },
  { id: 'Qwen/Qwen3-8B', name: 'Qwen3-8B', free: false },
  { id: 'Qwen/Qwen3-14B', name: 'Qwen3-14B', free: false },
  { id: 'Qwen/Qwen3-32B', name: 'Qwen3-32B', free: false },
  { id: 'Qwen/Qwen3-72B', name: 'Qwen3-72B', free: false },
  { id: 'Qwen/Qwen-Max', name: 'Qwen-Max', free: false },
  { id: 'Qwen/Qwen-Plus', name: 'Qwen-Plus', free: false },
  { id: 'deepseek-ai/DeepSeek-V2.5', name: 'DeepSeek-V2.5', free: false },
  { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek-V3', free: false },
  { id: 'deepseek-ai/DeepSeek-V3.1', name: 'DeepSeek-V3.1', free: false },
  { id: 'deepseek-ai/DeepSeek-V3-671B', name: 'DeepSeek-V3 671B', free: false },
  { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek-R1', free: false },
  { id: 'deepseek-ai/DeepSeek-R1-671B', name: 'DeepSeek-R1 671B', free: false },
  { id: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-7B', name: 'DeepSeek-R1-Distill-Qwen-7B（免费）', free: true },
  { id: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-14B', name: 'DeepSeek-R1-Distill-Qwen-14B', free: false },
  { id: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B', name: 'DeepSeek-R1-Distill-Qwen-32B', free: false },
  { id: 'deepseek-ai/DeepSeek-R1-Distill-Llama-70B', name: 'DeepSeek-R1-Distill-Llama-70B', free: false },
  { id: 'THUDM/glm-4-9b-chat', name: 'GLM-4-9B Chat', free: true },
  { id: 'THUDM/GLM-4-32B-0414', name: 'GLM-4-32B', free: false },
  { id: 'THUDM/glm-4-plus', name: 'GLM-4-Plus', free: false },
  { id: 'meta-llama/Meta-Llama-3.1-8B-Instruct', name: 'Llama-3.1-8B-Instruct', free: false },
  { id: 'meta-llama/Meta-Llama-3.1-70B-Instruct', name: 'Llama-3.1-70B-Instruct', free: false },
  { id: 'meta-llama/Meta-Llama-3.1-405B-Instruct', name: 'Llama-3.1-405B-Instruct', free: false },
  { id: 'meta-llama/Llama-3.3-70B-Instruct', name: 'Llama-3.3-70B-Instruct', free: false },
  { id: 'mistralai/Mistral-Large-Instruct-2411', name: 'Mistral-Large-Instruct', free: false },
  { id: '01-ai/Yi-Large', name: 'Yi-Large', free: false },
];
const OPENAI_MODELS = [{ id: 'gpt-4o-mini', name: 'GPT-4o Mini', free: false }, { id: 'gpt-4o', name: 'GPT-4o', free: false }, { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', free: false }, { id: 'gpt-4.1', name: 'GPT-4.1', free: false }, { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', free: false }, { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', free: false }];
const DEEPSEEK_MODELS = [{ id: 'deepseek-chat', name: 'DeepSeek Chat', free: false }, { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', free: false }, { id: 'deepseek-v3', name: 'DeepSeek V3', free: false }, { id: 'deepseek-r1', name: 'DeepSeek R1', free: false }];
const CLAUDE_MODELS = [{ id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', free: false }, { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', free: false }, { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', free: false }, { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', free: false }];
const QWEN_MODELS = [{ id: 'qwen-turbo', name: '通义千问 Turbo', free: false }, { id: 'qwen-plus', name: '通义千问 Plus', free: false }, { id: 'qwen-max', name: '通义千问 Max', free: false }, { id: 'qwen-long', name: '通义千问 Long', free: false }, { id: 'qwen2.5-72b-instruct', name: 'Qwen2.5-72B-Instruct', free: false }];

const THINK_PATTERNS = [/ <think>[\s\S]*?<\/think>/gi, /<thinking>[\s\S]*?<\/thinking>/gi, /<reasoning>[\s\S]*?<\/reasoning>/gi, /<analysis>[\s\S]*?<\/analysis>/gi, /【思考】[\s\S]*?(【\/思考】|$)/gi, /【推理】[\s\S]*?(【\/推理】|$)/gi, /（思考：[\s\S]*?）/gi, /\(思考：[\s\S]*?\)/gi].map((r) => new RegExp(r.source.replace(/^ /, ''), r.flags));

const STRICT_SYSTEM_PROMPT = `你是"天玄江湖"文本冒险游戏的主持AI。你的每一次回复都将直接驱动游戏世界运转。\n\n【核心身份与职责】\n你是一个世界模拟器+叙事引擎+游戏裁判的合体。你的输出不是聊天，而是游戏系统能解析的结构化数据。你必须：\n1. 用 story_text 描述玩家看到/听到/感受到的一切（场景氛围、人物言行、事件发展）\n2. 用 dialogue 数组单独列出每个NPC说的每句台词（speaker=说话人姓名, text=台词原文, mood=说话时的情绪）\n3. 用其他字段精确更新游戏世界的所有数值状态\n\n【世界设定】\n- 世界：天玄大陆，高武前期可转玄幻。武林门派、市井百态、朝廷势力、神秘组织并存。\n- 风格：真实、克制、因果明确。NPC有独立人格与行为逻辑，不围着玩家转。\n- 禁止：现代词汇（手机/微信/汽车等）、现代价值观、机械降神式拯救。\n\n【对话与场景区分规则 - 极其重要】\n- story_text = 场景描写 + 叙事推进。用文学性语言描述环境、氛围、人物举止、事件经过。不要在里面塞NPC的直接台词！\n- dialogue = NPC台词。每条台词独立一条，必须包含 speaker（说话NPC的姓名）、text（完整台词）、mood（情绪）。如果 story_text 里已经写出了台词，dialogue 就不要再重复相同内容。\n- 场景描述（没有NPC说话）：用 story_text 写场景，dialogue 留空数组[]。系统会自动将其渲染为\"场景消息\"。\n- NPC对话（有NPC说话）：story_text 写简短的情景引入，dialogue 列出每句台词。系统会将每条台词渲染为该NPC的头像+对话气泡。\n\n【人物交互深度规则】\n- NPC不是工具人。每个人都有性格标签（personalityTags）、立场（faction）、情绪（mood）、边界与秘密。\n- 对话语气必须匹配：relation（好感）、trust（信任）、romance.stage（情感阶段，none/interested/close/ambiguous/lover/engaged/married/broken）。\n- 即使好感很高，NPC也不应失去人格——刀子嘴豆腐心、心口不一、欲言又止都是正常反应。\n- 表白/亲近/试探/安慰/保护/送礼 → 应以人物性格为前提，可能成功也可能碰壁。\n- 情感变化必须写入 npc_updates[].changes.romance，精确到 affinity/attraction/intimacy/commitment/stage 的具体数值变化。\n\n【输出铁律】\n1. 只输出一行原始JSON，不要Markdown包裹（不用\`\`\`json）。\n2. 不要输出任何解释、分析、注释、思考过程。\n3. 禁止输出 <think> <thinking> 【思考】 等审思标签。\n4. JSON必须完整闭合，所有字符串内的双引号必须转义为 \\\"。\n\n【字段精确定义】\n- story_text: 必须是完整的叙事正文，长度不少于80字。用\\n换行分段。禁止包含JSON字段名碎片（txt: story: speaker: mood: npc_updates: 等）。\n- dialogue: NPC台词数组，每个元素 { speaker: \"姓名\", text: \"台词\", mood: \"情绪\" }。如果本回合没有NPC说话则为空数组[]。\n- time_passed_minutes: 本回合经过的游戏分钟数，5-60之间。\n- location_change: 只有真正移动到新地点才填\"新地点名称\"，否则null。不要填\"当前地点未变\"之类的说明文字。\n- weather_change: 只有天气真正变化时才填新天气名，否则null。\n- new_items: 只能放实体物品。不要把\"安全感\"\"温暖\"\"线索\"\"信息\"\"机会\"\"希望\"\"印象\"写成物品。name字段必须是中国古风物品名。type必须是 food|drink|medicine|tool|weapon|document|misc|clothing|material 之一。quantity默认1。\n- removed_items: 被消耗/丢失/用掉的物品名称数组。\n- npc_updates: 只有NPC确实发生变化时才写入。changes里只填变化的字段。romance变化必须同时写 stage 和对应的数值变化（affinity等）。\n- new_npcs: 新登场的NPC。id格式 \"npc_xxx\"，必须包含完整的 name/age/gender/occupation/description/personalityTags。\n- player_stat_changes: 所有玩家状态变化，正值恢复，负值受损。涉及 health/hunger/thirst/energy/sanity/infection/stamina。\n- discoveries: 玩家发现的新信息/新地点线索/新人物传闻，每条一个短句。\n- reputation_change / righteousness_change: 名望/侠义变化值。\n- money_change: { silver: 银两变化, copper: 铜文变化 }。所有货币单位统一为\"两/文\"，绝不使用\"银/银子/铜钱\"。\n- martial_progress: 武学修炼进度变化。\n- realm_breakthrough: 境界突破信息，没有则为null。\n- choices: 3~5个下一步可选行动，每个 { id: \"1\", text: \"行动描述\", consequence_hint: \"可能后果\" }。id从\"1\"开始递增。\n\n【严禁的黑名单】\n- 不要将以下类别写入 new_items：情绪感受、身体状态、风险提示、地点标记、氛围描述、系统提示语、战果摘要、信息线索、社交关系。\n- 不要输出残缺JSON（缺少闭合的引号/括号/花括号）。\n- 货币单位全程\"两/文\"，不要混用\"银/银子/铜钱/元/块\"。\n\n【必须返回的JSON结构】\n{\"story_text\":\"场景描写与叙事推进...\",\"dialogue\":[{\"speaker\":\"姓名\",\"text\":\"台词\",\"mood\":\"情绪\"}],\"time_passed_minutes\":5,\"location_change\":null,\"weather_change\":null,\"new_items\":[],\"removed_items\":[],\"npc_updates\":[],\"new_npcs\":[],\"player_stat_changes\":{\"health\":0,\"hunger\":0,\"thirst\":0,\"energy\":0,\"sanity\":0,\"infection\":0,\"stamina\":0},\"discoveries\":[],\"reputation_change\":0,\"righteousness_change\":0,\"money_change\":{\"silver\":0,\"copper\":0},\"martial_progress\":null,\"realm_breakthrough\":null,\"choices\":[{\"id\":\"1\",\"text\":\"行动选项\",\"consequence_hint\":\"可能后果\"}]}`;

function removeThinkingContent(text: string): string {
  let out = text || '';
  THINK_PATTERNS.forEach((p) => { out = out.replace(p, ''); });
  return out;
}

function decodeEscapes(text: string): string {
  return text.replace(/\\n/g, '\n').replace(/\\t/g, ' ').replace(/\\"/g, '"').replace(/\\r/g, ' ').trim();
}

function extractDisplayText(raw: string): string {
  if (!raw || typeof raw !== 'string') return '（AI返回为空）';
  let text = removeThinkingContent(raw)
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .replace(/location_change\s*[:：].*/gi, '')
    .replace(/只有真正换地点时才填.*/gi, '')
    .replace(/当前地点未变.*/gi, '')
    .replace(/应为\s*null.*/gi, '')
    .trim();
  if (!text.includes('{') && !/"?(story|txt|content|message|reply|narrative|story_text)"?\s*[:：]/i.test(text)) return text.trim() || '（AI未返回有效内容）';

  const tryJson = () => {
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        const parsed = JSON.parse(text.slice(firstBrace, lastBrace + 1));
        const candidate = [parsed.story_text, parsed.story, parsed.txt, parsed.text, parsed.content, parsed.narrative, parsed.message, parsed.reply].find((v) => typeof v === 'string' && v.trim().length > 3);
        if (candidate) return decodeEscapes(candidate);
      } catch {}
    }
    return '';
  };

  const jsonExtract = tryJson();
  if (jsonExtract) return jsonExtract;

  const fields = ['story_text', 'story', 'txt', 'text', 'content', 'narrative', 'message', 'reply'];
  for (const field of fields) {
    const esc = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const exact = text.match(new RegExp(`"${esc}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 's'));
    if (exact?.[1]) return decodeEscapes(exact[1]);
    const trunc = text.match(new RegExp(`"${esc}"\\s*:\\s*"([\\s\\S]{8,})`, 'i'));
    if (trunc?.[1]) {
      let content = trunc[1];
      const boundary = content.match(/^([\s\S]*?)(?:",\s*"(?:dialogue|choices|new_items|npc_updates|player_stat_changes|time_passed_minutes|location_change|weather_change|reputation_change|righteousness_change|money_change|martial_progress|realm_breakthrough)")/i);
      if (boundary?.[1]) content = boundary[1];
      else content = content.replace(/",?\s*"?\w+"\s*:\s*[\s\S]*$/, '').replace(/",?\s*$/, '');
      const cleaned = decodeEscapes(content);
      if (cleaned.length > 5) return cleaned;
    }
  }
  return '（AI返回了结构化数据，正文已交给系统解析）';
}

function classifyMessageType(raw: string, state: GameState): { msgType: ChatMessage['msgType']; speakerName?: string; speakerNpcId?: string; mood?: string } {
  if (!raw) return { msgType: 'normal' };
  try {
    const cleaned = removeThinkingContent(raw).replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace <= firstBrace) return { msgType: 'normal' };
    const obj = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    if (!obj || typeof obj !== 'object') return { msgType: 'normal' };
    const dialogue = obj.dialogue;
    const hasDialogue = !!(dialogue && Array.isArray(dialogue) && dialogue.length > 0);
    const hasStoryText = !!(obj.story_text && typeof obj.story_text === 'string' && obj.story_text.trim().length > 20);
    if (hasDialogue && dialogue[0]) {
      const d = dialogue[0];
      const speakerName = d.speaker || d.name || undefined;
      let npcId = d.npc_id || d.npcId || undefined;
      if (!npcId && speakerName) {
        const found = state.npcs.find(n => n.name === speakerName);
        if (found) npcId = found.id;
      }
      return { msgType: 'npc_speech', speakerName, speakerNpcId: npcId, mood: d.mood || undefined };
    }
    if (hasStoryText && !hasDialogue && obj.story_text.length > 40) return { msgType: 'scene' };
    if (obj.story_text && obj.dialogue && obj.dialogue.length > 0) {
      const d = obj.dialogue[0];
      const speakerName = d.speaker || d.name || undefined;
      return { msgType: 'npc_speech', speakerName, mood: d.mood || undefined };
    }
    return { msgType: 'normal' };
  } catch {
    return { msgType: 'normal' };
  }
}

function estimateTokens(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const otherChars = text.length - chineseChars;
  return Math.ceil(chineseChars * 2 + otherChars * 0.4);
}

function buildNpcDeepContext(npc: NPC, state: GameState) {
  const romance = npc.romance;
  const partnerName = state.player.romance.currentPartnerId === npc.id ? state.player.name : '无';
  return `【NPC深度对话模式】你现在只扮演 NPC：${npc.name}
身份：${npc.occupation}
年龄：${npc.age}
性别：${npc.gender === 'female' ? '女' : npc.gender === 'male' ? '男' : '其他'}
位置：${npc.location}
状态：${npc.status}
当前情绪：${npc.mood || '平静'}
态度：${npc.attitude}
对玩家好感：${npc.relation}
对玩家信任：${npc.trust}
性格标签：${npc.personalityTags.join('、') || '无'}
AI人格摘要：${npc.aiPersona || npc.description}
携带物品：${npc.inventory.map((i) => i.name).join('、') || '无'}
目标：${npc.goals.join('、') || '无'}
秘密：${npc.secrets?.join('、') || '暂无'}
情侣/情感状态：阶段=${romance?.stage || 'none'}；好感=${romance?.affinity || 0}；吸引=${romance?.attraction || 0}；亲密=${romance?.intimacy || 0}；承诺=${romance?.commitment || 0}；独占=${romance?.exclusive ? '是' : '否'}；已告白=${romance?.confessed ? '是' : '否'}
玩家是否是当前伴侣：${partnerName === state.player.name ? '是' : '否'}
最近记忆：${romance?.memories?.slice(-5).join(' | ') || '无'}

【扮演要求】\\n- 你必须像这个人一样说话，而不是旁白。\\n- 你的回复必须受性格、关系、信任、处境、秘密和情感阶段约束。\\n- 不能无缘无故突然示爱、突然泄密、突然完全顺从。\\n- 如果被试探、安慰、示好、表白，你要基于当前关系给出自然反应。\\n- 仍然必须输出严格 JSON。story_text 可以简短，但要主要通过 dialogue 表达。`;
}

export const AIConsole: React.FC<AIConsoleProps> = ({ state, lastAction, onUpdate, autoAIEnabled = false, setAutoAIEnabled, onRegisterAIGenerator, npcTalkRequest, onNPCTalkHandled, webInputDraft, onWebInputConsumed, birthSettings }) => {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAPIConfig, setShowAPIConfig] = useState(false);
  const [showModelSelect, setShowModelSelect] = useState(false);
  const [isCustomModelInput, setIsCustomModelInput] = useState(false);
  const [isCallingAPI, setIsCallingAPI] = useState(false);
  const [apiStatus, setApiStatus] = useState<'idle' | 'connected' | 'error'>('idle');
  const [inputMode, setInputMode] = useState<'chat' | 'json' | 'text' | 'web'>('chat');
  const [manualInput, setManualInput] = useState(() => localStorage.getItem('apoc_ai_manual_draft') || '');
  const [chatInput, setChatInput] = useState(() => localStorage.getItem('apoc_ai_chat_draft') || '');
  const [embedUrl, setEmbedUrl] = useState('https://arena.ai');
  const [embedEnabled, setEmbedEnabled] = useState(false);
  const [clipboardWatcher, setClipboardWatcher] = useState(false);
  const [clipboardStatus, setClipboardStatus] = useState('');
  const [lastClipboard, setLastClipboard] = useState('');
  const [webInput, setWebInput] = useState(() => localStorage.getItem('apoc_ai_web_draft') || '');
  const [accountBalance, setAccountBalance] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => { try { return JSON.parse(localStorage.getItem('apoc_ai_chat_messages') || '[]'); } catch { return []; } });
  const [tokenUsage, setTokenUsage] = useState<TokenUsage>(() => { try { return JSON.parse(localStorage.getItem('apocalypse_token_usage') || ''); } catch { return { totalTokens: 0, sessionTokens: 0, promptTokens: 0, completionTokens: 0, estimatedCost: 0, callCount: 0 }; } });
  const [apiConfig, setApiConfig] = useState<APIConfig>(() => { try { return JSON.parse(localStorage.getItem('apocalypse_api_config') || ''); } catch { return { provider: 'siliconflow', apiKey: '', endpoint: 'https://api.siliconflow.cn/v1/chat/completions', model: 'Qwen/Qwen2.5-7B-Instruct', enabled: false, temperature: 0.7, maxTokens: 1200 }; } });
  const [parseConfig, setParseConfig] = useState<ParseConfig>({ autoAddItems: true, autoUpdateNPCs: true, autoAdvanceTime: true, autoUpdateStats: true, parseDialogue: true, parseEvents: true });
  const [customPromptSettings, setCustomPromptSettings] = useState<AIPromptSettings | null>(() => {
    try { return JSON.parse(localStorage.getItem('jianghu_ai_prompt_settings') || 'null'); } catch { return null; }
  });
  const [orchestratorSettings, setOrchestratorSettings] = useState<OrchestratorSettings>(() => loadOrchestratorSettings());

  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatViewportRef = useRef<HTMLDivElement>(null);
  const chatMessagesRef = useRef<ChatMessage[]>([]);
  const shouldStickToBottomRef = useRef(true);
  const prevMessageCountRef = useRef(0);
  const isCallingRef = useRef(false);
  const sendChatRef = useRef<(overrideMsg?: string) => Promise<void>>(async () => {});
  const savedChatScrollTopRef = useRef(0);

  useEffect(() => { chatMessagesRef.current = chatMessages; }, [chatMessages]);
  useEffect(() => { isCallingRef.current = isCallingAPI; }, [isCallingAPI]);
  useEffect(() => { localStorage.setItem('apoc_ai_chat_messages', JSON.stringify(chatMessages.slice(-50))); }, [chatMessages]);
  useEffect(() => { localStorage.setItem('apoc_ai_chat_draft', chatInput); }, [chatInput]);
  useEffect(() => { localStorage.setItem('apoc_ai_manual_draft', manualInput); }, [manualInput]);
  useEffect(() => { localStorage.setItem('apoc_ai_web_draft', webInput); }, [webInput]);
  useEffect(() => { localStorage.setItem('apocalypse_api_config', JSON.stringify(apiConfig)); }, [apiConfig]);
  useEffect(() => { localStorage.setItem('apocalypse_token_usage', JSON.stringify(tokenUsage)); }, [tokenUsage]);
  useEffect(() => { if (success) { const t = setTimeout(() => setSuccess(false), 2500); return () => clearTimeout(t); } }, [success]);
  useEffect(() => {
    const syncPromptSettings = () => {
      try { setCustomPromptSettings(JSON.parse(localStorage.getItem('jianghu_ai_prompt_settings') || 'null')); } catch {}
      setOrchestratorSettings(loadOrchestratorSettings());
    };
    window.addEventListener('storage', syncPromptSettings);
    const timer = setInterval(syncPromptSettings, 2000);
    return () => {
      window.removeEventListener('storage', syncPromptSettings);
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const viewport = chatViewportRef.current;
    if (!viewport) return;
    if (inputMode === 'chat') viewport.scrollTop = savedChatScrollTopRef.current;
    const onScroll = () => {
      const distanceFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      shouldStickToBottomRef.current = distanceFromBottom < 80;
      savedChatScrollTopRef.current = viewport.scrollTop;
    };
    viewport.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => viewport.removeEventListener('scroll', onScroll);
  }, [inputMode]);

  useEffect(() => {
    const hasNewMessage = chatMessages.length > prevMessageCountRef.current;
    prevMessageCountRef.current = chatMessages.length;
    if (hasNewMessage && shouldStickToBottomRef.current) requestAnimationFrame(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }));
  }, [chatMessages]);

  useEffect(() => {
    if (!clipboardWatcher) return;
    const timer = setInterval(() => { readClipboardAndProcess(true); }, 2500);
    return () => clearInterval(timer);
  }, [clipboardWatcher, lastClipboard]);

  useEffect(() => {
    if (webInputDraft !== undefined && inputMode === 'web') {
      const next = webInputDraft || '';
      if (!next) return;
      setWebInput(next);
      navigator.clipboard.writeText(next).then(() => setClipboardStatus('已自动复制到剪贴板，可粘贴到AI网页')).catch(() => setClipboardStatus('无法自动复制，请手动复制'));
      onWebInputConsumed?.();
    }
  }, [webInputDraft, inputMode, onWebInputConsumed]);

  const getModelList = () => apiConfig.provider === 'siliconflow' ? SILICONFLOW_MODELS : apiConfig.provider === 'openai' ? OPENAI_MODELS : apiConfig.provider === 'deepseek' ? DEEPSEEK_MODELS : apiConfig.provider === 'claude' ? CLAUDE_MODELS : apiConfig.provider === 'qwen' ? QWEN_MODELS : [];
  const sanitizeHeaderValue = (value: string) => value.replace(/[\r\n]/g, '').replace(/[^\x20-\x7E]/g, '').trim();
  const getAuthHeader = () => `Bearer ${sanitizeHeaderValue(apiConfig.apiKey)}`;
  const getCostPerToken = () => apiConfig.provider === 'siliconflow' ? 0.001 / 1000 : apiConfig.provider === 'openai' ? 0.015 / 1000 : apiConfig.provider === 'claude' ? 0.02 / 1000 : 0.002 / 1000;

  const buildBirthInfo = () => {
    if (!birthSettings) return '';
    const originNames: Record<string, string> = { beggar: '流浪乞丐', begger: '流浪乞丐', farmer: '农家子弟', scholar: '落魄书生', soldier: '军户遗孤', merchant: '商贾之后' };
    const memoryNames: Record<string, string> = { webnovel: '网文读者', martial: '武术爱好者', medical: '医学人', engineer: '工科人', history: '历史爱好者' };
    const traitNames: Record<string, string> = { resilient: '坚韧', agile: '机敏', calm: '沉稳', passionate: '热血', cold: '冷静' };
    return `【玩家出生设定】\n姓名：${birthSettings.name}\n年龄：${birthSettings.age}岁\n性别：${birthSettings.gender === 'male' ? '男' : '女'}\n出身：${originNames[birthSettings.origin] || birthSettings.origin}\n穿越记忆：${memoryNames[birthSettings.memory] || birthSettings.memory}\n初始特质：${traitNames[birthSettings.trait] || birthSettings.trait}\n性情：${birthSettings.temperament || '未知'}\n当前目标：${birthSettings.goal || '未知'}\n底线：${birthSettings.bottomLine || '未知'}\n隐藏优势：${birthSettings.hiddenEdge || '未知'}\n自定义背景：${birthSettings.customBackground || '无'}\n`;
  };

  const buildPlayerPersonaInfo = () => {
    const eq = state.player.equipment;
    const portrait = (() => {
      try { return JSON.parse(localStorage.getItem('jianghu_player_portrait') || 'null'); } catch { return null; }
    })();
    return `【玩家即当前角色】\n你在这个世界中的真实身份如下，请始终把"玩家"与"该角色"视为同一人：\n姓名：${state.player.name}\n别号：${state.player.nickname || '无'}\n年龄：${state.player.age}\n性别：${state.player.gender === 'female' ? '女' : state.player.gender === 'male' ? '男' : '其他'}\n身份：${state.player.role}\n门派/传承：${state.player.sect || '无门无派'}\n外貌：${state.player.appearance || '待补充'}\n背景：${state.player.background || '待补充'}\n特质：${(state.player.traits || []).join('、') || '无'}\n画像备注：${portrait?.note || '无'}\n装备：主手=${eq.mainHand?.name || '无'}；副手=${eq.offHand?.name || '无'}；衣物=${eq.body?.name || '无'}；饰品1=${eq.accessory1?.name || '无'}；饰品2=${eq.accessory2?.name || '无'}\n情感状态：魅力=${state.player.romance?.charm || 0}；依恋=${state.player.romance?.attachmentStyle || 'balanced'}；当前伴侣=${state.player.romance?.currentPartnerId || '无'}\n`;
  };

  const customPromptBlock = useMemo(() => {
    if (!customPromptSettings?.enabled) return '';
    return `\n\n【后台自定义AI提示词】\n${customPromptSettings.systemPromptPrefix ? `【系统前置】\n${customPromptSettings.systemPromptPrefix}\n` : ''}${customPromptSettings.worldRules ? `【世界规则补充】\n${customPromptSettings.worldRules}\n` : ''}${customPromptSettings.userCustomInstructions ? `【用户自定义要求】\n${customPromptSettings.userCustomInstructions}\n` : ''}${customPromptSettings.npcBehaviorRules ? `【NPC行为规则】\n${customPromptSettings.npcBehaviorRules}\n` : ''}${customPromptSettings.itemParsingRules ? `【物品解析规则】\n${customPromptSettings.itemParsingRules}\n` : ''}${customPromptSettings.locationRules ? `【地点移动规则】\n${customPromptSettings.locationRules}\n` : ''}${customPromptSettings.romanceRules ? `【情感情侣规则】\n${customPromptSettings.romanceRules}\n` : ''}${customPromptSettings.imagePromptRules ? `【文生图提示规则】\n${customPromptSettings.imagePromptRules}\n` : ''}`;
  }, [customPromptSettings]);

  const orchestratorBlock = useMemo(() => {
    if (!orchestratorSettings?.enabled) return '';
    return `\n\n【统筹调度中枢约束】\nAI约束严谨度：${orchestratorSettings.aiStrictness}\n地图连贯性：${orchestratorSettings.mapCoherence}\n世界主动运行强度：${orchestratorSettings.worldDynamics}\nNPC自主度：${orchestratorSettings.npcAutonomy}\n经济弹性：${orchestratorSettings.economyElasticity}\n图片安全策略：${orchestratorSettings.imageSafetyLevel}\n日志洁净度：${orchestratorSettings.logCleanliness}\n自动难度平衡：${orchestratorSettings.autoBalanceDifficulty ? '开启' : '关闭'}\n自动经济稳定：${orchestratorSettings.autoStabilizeEconomy ? '开启' : '关闭'}\n自动NPC纠偏：${orchestratorSettings.autoCorrectNPCState ? '开启' : '关闭'}\n自动地图修复：${orchestratorSettings.autoRepairMapLinks ? '开启' : '关闭'}\n自动AI结果规范化：${orchestratorSettings.autoNormalizeAIResults ? '开启' : '关闭'}\n自动图片插入协调：${orchestratorSettings.autoSceneImageInsert ? '开启' : '关闭'}\n减少噪音日志：${orchestratorSettings.autoReduceNoiseSpam ? '开启' : '关闭'}\n提纯发现事件：${orchestratorSettings.autoPromoteDiscoveries ? '开启' : '关闭'}\n额外说明：${orchestratorSettings.notes || '无'}\n你必须遵守以上全局调度策略，让所有子系统保持一致，不要输出会导致地图、物品、人物状态、图片或日志错乱的结果。`;
  }, [orchestratorSettings]);

  const contextPrompt = useMemo(() => {
    const ps = state.player.stats;
    const inv = state.player.inventory.map((i) => `${i.name}${i.quantity > 1 ? `×${i.quantity}` : ''}`).join('、') || '无';
    const nearby = state.npcs.filter((n) => n.location === state.world.location);
    const nearbyText = nearby.length ? nearby.map((n) => `${n.name}(${n.occupation},好感${n.relation},信任${n.trust},情感${n.romance?.stage || 'none'},状态：${n.status})`).join('、') : '无';
    const location = state.locations.find((l) => l.name === state.world.location);
    const connectedLocations = location?.connectedLocations
      ?.map(id => state.locations.find(l => l.id === id))
      .filter((l): l is NonNullable<typeof l> => !!l) || [];
    const connected = connectedLocations
      .map(l => `${l.name}(危险${l.dangerLevel},${l.isLocked ? '封锁' : '可达'})`)
      .join('、') || '无';
    const localMap = state.locations
      .slice(0, 24)
      .map((l) => `${l.name}=>[${(l.connectedLocations || []).map(id => state.locations.find(x => x.id === id)?.name).filter(Boolean).join('、') || '无'}]`)
      .join('、');
    const recentLogs = state.logs.slice(-6).filter((l) => l.type !== 'system').map((l) => l.text.slice(0, 100)).join(' | ');
    const romanceSummary = state.npcs.filter((n) => n.romance && n.romance.stage !== 'none').map((n) => `${n.name}:${n.romance?.stage}(好感${n.romance?.affinity}/亲密${n.romance?.intimacy})`).join('、') || '暂无';

    // === AI↔子系统整合：注入子系统状态 ===
    const cultivationInfo = (() => {
      const cs = state.player.cultivationStage;
      const cultivationNames = ['', '凡人', '锻体境', '感气境', '通脉境', '凝气境', '筑基境', '金丹境', '元婴境'];
      return `修为境界：${cultivationNames[cs] || `${cs}境`}；修炼路径：${state.player.cultivationPath || '散修'}`;
    })();
    const factionInfo = (() => {
      const entries = Object.entries(state.player.factions || {});
      if (!entries.length) return '暂无';
      return entries.map(([name, rep]) => `${name}(声望${rep})`).join('、');
    })();
    const recipeInfo = (() => {
      const known = (state.craftingRecipes || []).filter((r: CraftingRecipe) => r.isUnlocked).map((r: CraftingRecipe) => r.name).join('、');
      return known || '暂无';
    })();
    const injuryInfo = (() => {
      if (!state.player.injuries?.length) return '暂无';
      return state.player.injuries.map((inj: Injury) => `${inj.name}(${inj.bodyPart || '?'}, 严重度${inj.severity || 1}, 愈合${Math.round((inj.healingProgress || 0) * 100)}%)`).join('；');
    })();
    const diseaseInfo = (() => {
      if (!state.player.diseases?.length) return '暂无';
      return state.player.diseases.map((d: Disease) => `${d.name}(阶段${d.stage}/${d.maxStage})`).join('、');
    })();
    const buffInfo = (() => {
      if (!state.player.buffs?.length) return '暂无';
      return state.player.buffs.map((b: Buff) => `${b.name}(剩余${Math.round((b.duration || 0) / 60)}分钟)`).join('、');
    })();
    const debuffInfo = (() => {
      if (!state.player.debuffs?.length) return '暂无';
      return state.player.debuffs.map((d: Debuff) => `${d.name}(剩余${Math.round((d.duration || 0) / 60)}分钟)`).join('、');
    })();
    const bodyConditionText = `体温${state.world.weather.temperature}°C`;
    const killStats = `杀怪${state.player.killCount?.monsters || 0}、杀人${state.player.killCount?.humans || 0}、杀异端${state.player.killCount?.heretics || 0}`;
    const nearbyShops = (() => {
      const locName = state.world.location;
      const shopKeywords = ['驿', '客栈', '茶', '楼', '馆', '集', '市', '铺', '街', '坊', '镇'];
      const isShop = shopKeywords.some((k) => locName.includes(k));
      return isShop ? `当前地点${locName}似有商铺可以交易/歇脚/打尖。` : '当前地点无商铺，如想交易需前往城镇集市。';
    })();
    const economyInfo = `市场物价指数：${state.world.currencySystem?.marketIndex ?? 100}（>100通胀/<100通缩）；税率：${state.world.currencySystem?.taxRate ?? 0}%`;

    return `${STRICT_SYSTEM_PROMPT}${customPromptBlock}${orchestratorBlock}\n\n${buildBirthInfo()}${buildPlayerPersonaInfo()}【当前世界状态】\n位置：${state.world.location}${location ? `（${location.description.slice(0, 40)}）` : ''}\n可直达地点：${connected}\n局部地图关系：${localMap || '暂无'}\n当前地点危险：${location?.dangerLevel ?? '未知'}\n当前地点人物：${nearbyText}\n当前时刻：${new Date(state.world.time).toLocaleString('zh-CN')}（${state.world.timeOfDay}）\n天气：${state.world.weather.current}，温度：${state.world.weather.temperature}°C\n经济行情：${economyInfo}\n附近店铺：${nearbyShops}\n\n【玩家状态】\n姓名：${state.player.name}，年龄：${state.player.age}\n气血：${Math.round(ps.health.value)}/${ps.health.max}\n饱腹：${Math.round(ps.hunger.value)}/${ps.hunger.max}\n口渴：${Math.round(ps.thirst.value)}/${ps.thirst.max}\n精力：${Math.round(ps.energy.value)}/${ps.energy.max}\n心境：${Math.round(ps.sanity.value)}/${ps.sanity.max}\n体力：${Math.round(ps.stamina.value)}/${ps.stamina.max}\n中毒：${Math.round(ps.infection.value)}/${ps.infection.max}\n盘缠：${state.player.currency.silver}两${state.player.currency.copper}文（后续所有金钱描述、选项和结算必须保持"两/文"单位，不要改写成银/银子/铜钱）\n名望：${state.player.jianghuFame}\n侠义：${state.player.morality}\n击杀统计：${killStats}\n\n【修为与武学】\n${cultivationInfo}\n所学武学：${(state.player.martialArts || []).map((m) => `${m.name}(Lv.${m.level})`).join('、') || '暂无'}\n技能：${(state.player.skills || []).map((s) => `${s.name}(Lv.${s.level})`).join('、') || '暂无'}\n宗门：${state.player.sect || '无门无派'}\n\n【势力关系】\n${factionInfo}\n\n【锻造配方（已知）】\n${recipeInfo}\n\n【伤势明细】\n${injuryInfo}\n【疾病】${diseaseInfo}\n【正面状态】${buffInfo}\n【负面状态】${debuffInfo}\n\n【装备】\n主手：${state.player.equipment?.mainHand?.name || '无'}；副手：${state.player.equipment?.offHand?.name || '无'}；衣物：${state.player.equipment?.body?.name || '无'}；饰品1：${state.player.equipment?.accessory1?.name || '无'}；饰品2：${state.player.equipment?.accessory2?.name || '无'}\n\n【背包】${inv}\n【情感概况】${romanceSummary}\n\n【系统约束】\n- 地点移动必须尽量基于"可直达地点"或"局部地图关系"；不要无缘无故跳到完全不相干的远地点\n- 若剧情需要跨区赶路，必须在 time_passed_minutes 明显增加，并让体力、精力下降\n- 商铺、茶肆、客栈需考虑营业时间与地点逻辑\n- 吃食、饮水、休息、受伤、盘缠都必须体现在系统字段里\n- 只有真实获得实体物品，才能写入 new_items\n- 情侣/暧昧/亲近变化必须体现在 npc_updates[].changes.romance 中\n- "饥饿感缓解/疼痛减轻/心头一暖/安全地方/危险信息"必须写入 player_stat_changes 或 story_text，绝不能写进 new_items\n- 若有名望、侠义、盘缠、武学、境界变化，必须写对应字段\n- 若有势力声望变化，必须写入 faction_reputation_changes\n- 若有伤势新增/恶化/愈合，必须写入 injury_changes\n- 若有Buff/Debuff增减，必须写入 buff_additions/debuff_additions\n- 若学到新配方，必须写入 recipe_discoveries\n- 若涉及物价/税率波动，必须写入 economy_changes\n- 若有体温异常或疲劳累积，必须写入 body_condition_changes\n\n【最近事件】${recentLogs || '无'}\n\n【本次玩家行动】${lastAction || '（尚未输入）'}\n\n【现在开始输出】只输出严格JSON。`;
  }, [state, lastAction, birthSettings, customPromptBlock, orchestratorBlock]);

  const updateTokenUsage = (usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }, text?: string) => {
    const tokens = usage?.total_tokens || (text ? estimateTokens(text) : 0);
    const prompt = usage?.prompt_tokens || 0;
    const completion = usage?.completion_tokens || 0;
    setTokenUsage((prev) => {
      const totalTokens = prev.totalTokens + tokens;
      return { totalTokens, sessionTokens: prev.sessionTokens + tokens, promptTokens: prev.promptTokens + prompt, completionTokens: prev.completionTokens + completion, estimatedCost: totalTokens * getCostPerToken(), callCount: prev.callCount + 1 };
    });
  };

  const callAIAPI = async (messages: { role: string; content: string }[]) => {
    const { provider, endpoint, model, temperature, maxTokens } = apiConfig;
    if (!apiConfig.apiKey && provider !== 'ollama') throw new Error('请先配置API密钥');

    if (provider === 'openai' || provider === 'deepseek' || provider === 'custom' || provider === 'siliconflow') {
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: getAuthHeader() }, body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens, stream: false, response_format: { type: 'json_object' } }) });
      if (!res.ok) throw new Error(`API错误: ${res.status}`);
      const data = await res.json();
      return { text: data.choices?.[0]?.message?.content || '', usage: data.usage };
    }
    if (provider === 'claude') {
      const system = messages.find((m) => m.role === 'system')?.content || '';
      const userMessages = messages.filter((m) => m.role !== 'system');
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': sanitizeHeaderValue(apiConfig.apiKey), 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: userMessages }) });
      if (!res.ok) throw new Error(`Claude错误: ${res.status}`);
      const data = await res.json();
      return { text: data.content?.[0]?.text || '', usage: data.usage };
    }
    if (provider === 'ollama') {
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model, prompt: messages.map((m) => m.content).join('\n'), stream: false }) });
      if (!res.ok) throw new Error(`Ollama错误: ${res.status}`);
      const data = await res.json();
      return { text: data.response || '' };
    }
    if (provider === 'qwen') {
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: getAuthHeader() }, body: JSON.stringify({ model, input: { messages }, parameters: { temperature, max_tokens: maxTokens } }) });
      if (!res.ok) throw new Error(`通义错误: ${res.status}`);
      const data = await res.json();
      return { text: data.output?.text || data.output?.choices?.[0]?.message?.content || '' };
    }
    throw new Error('不支持的API提供者');
  };

  const processAIResponse = (result: string) => {
    if (!result || typeof result !== 'string') return;
    try {
      const parsed = smartParseAIResponse(result, state);
      const aiResponse: AIResponse = {
        story_text: parsed.story_text,
        dialogue: parseConfig.parseDialogue ? parsed.dialogue : [],
        time_passed_minutes: parseConfig.autoAdvanceTime ? parsed.time_passed_minutes : 0,
        location_change: parsed.location_change,
        weather_change: parsed.weather_change,
        new_items: parseConfig.autoAddItems ? parsed.new_items : [],
        removed_items: parsed.removed_items,
        npc_updates: parseConfig.autoUpdateNPCs ? parsed.npc_updates : [],
        new_npcs: parsed.new_npcs,
        player_stat_changes: parseConfig.autoUpdateStats ? parsed.player_stat_changes : {},
        discoveries: parsed.discoveries,
        reputation_change: parsed.reputationChange,
        righteousness_change: parsed.righteousnessChange,
        money_change: { silver: parsed.silverChange, copper: parsed.copperChange },
        martial_progress: parsed.martialArtsProgress || null,
        realm_breakthrough: parsed.realmChange || null,
        choices: parsed.choices,
        flags: {
          ...(parsed.flags || {}),
        },
      };
      const normalizedResponse = orchestratorSettings.enabled
        ? orchestrateAIResponse(aiResponse, state, orchestratorSettings).response
        : aiResponse;
      logger.ai.info('智能解析摘要:', formatSmartParseResult(parsed).join(' | '));
      onUpdate(normalizedResponse);
    } catch (err) {
      logger.ai.error('解析失败:', err);
      onUpdate({ story_text: extractDisplayText(result) || '（AI响应无法解析）' });
    }
  };

  const initializeAI = async () => {
    if (!apiConfig.enabled || !apiConfig.apiKey || isCallingRef.current) return;
    setError(null);
    setIsCallingAPI(true);
    isCallingRef.current = true;
    try {
      const initPrompt = `${contextPrompt}\n\n【初始化任务】\n请记住世界、人物、经济、武学、天气、地点与情侣系统规则。\n然后生成一.?200-300 字开场，并给.?3-5 个初.?choices。`;
      const result = await callAIAPI([{ role: 'system', content: STRICT_SYSTEM_PROMPT }, { role: 'user', content: initPrompt }]);
        if (!result.text) throw new Error('AI返回空响应');
      updateTokenUsage(result.usage, result.text);
      const display = extractDisplayText(result.text);
        setChatMessages((prev) => [...prev, { id: `init_sys_${Date.now()}`, role: 'system', content: '🎮 AI初始化完成，已加载世界设定。', timestamp: Date.now() }, { id: `init_ai_${Date.now()}`, role: 'assistant', content: display, timestamp: Date.now(), tokens: result.usage?.total_tokens || estimateTokens(result.text) }]);
      processAIResponse(result.text);
      localStorage.setItem('apoc_ai_initialized', 'true');
      setApiStatus('connected');
      setSuccess(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '初始化失败';
      setError(msg);
      setApiStatus('error');
    } finally {
      setIsCallingAPI(false);
      isCallingRef.current = false;
    }
  };

  const testAPIConnection = async () => {
    setError(null);
    setIsCallingAPI(true);
    try {
      const result = await callAIAPI([{ role: 'user', content: '只回复：连接成功' }]);
      updateTokenUsage(result.usage, result.text);
      setApiStatus('connected');
      setSuccess(true);
      if (!localStorage.getItem('apoc_ai_initialized')) setTimeout(() => { initializeAI(); }, 350);
    } catch (err) {
      setApiStatus('error');
      setError(err instanceof Error ? err.message : '连接失败');
    } finally {
      setIsCallingAPI(false);
    }
  };

  const sendChatMessage = async (overrideMsg?: string) => {
    const message = (overrideMsg || chatInput).trim();
    if (!message || isCallingRef.current) return;
    const viewport = chatViewportRef.current;
    if (viewport) {
      const distanceFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      shouldStickToBottomRef.current = distanceFromBottom < 80;
    }
    if (!apiConfig.enabled || !apiConfig.apiKey) {
      setError('请先配置并启用API');
      setShowAPIConfig(true);
      return;
    }
    const userMsg: ChatMessage = { id: `u_${Date.now()}`, role: 'user', content: message, timestamp: Date.now() };
    setChatMessages((prev) => [...prev, userMsg]);
    chatMessagesRef.current = [...chatMessagesRef.current, userMsg];
    setChatInput('');
    setError(null);
    setIsCallingAPI(true);
    isCallingRef.current = true;
    try {
      const messages = [{ role: 'system', content: STRICT_SYSTEM_PROMPT }, { role: 'user', content: contextPrompt }, ...chatMessagesRef.current.slice(-8).map((m) => ({ role: m.role, content: m.content })), { role: 'user', content: message }];
      const result = await callAIAPI(messages);
        if (!result.text) throw new Error('AI返回空响应');
      updateTokenUsage(result.usage, result.text);
      const display = extractDisplayText(result.text);
      const classification = classifyMessageType(result.text, state);
      const assistantMsg: ChatMessage = { id: `a_${Date.now()}`, role: 'assistant', content: display, timestamp: Date.now(), tokens: result.usage?.total_tokens || estimateTokens(result.text), ...classification };
      setChatMessages((prev) => [...prev, assistantMsg]);
      chatMessagesRef.current = [...chatMessagesRef.current, assistantMsg];
      processAIResponse(result.text);
      setApiStatus('connected');
      setSuccess(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '请求失败';
      setError(msg);
      setApiStatus('error');
      setChatMessages((prev) => [...prev, { id: `e_${Date.now()}`, role: 'system', content: `【错误】msg`, timestamp: Date.now() }]);
    } finally {
      setIsCallingAPI(false);
      isCallingRef.current = false;
    }
  };

  sendChatRef.current = sendChatMessage;

  useEffect(() => {
    if (onRegisterAIGenerator && apiConfig.enabled && apiConfig.apiKey) {
      onRegisterAIGenerator(async (action: string) => {
        if (isCallingRef.current) return;
        await sendChatRef.current(action);
      });
    }
  }, [onRegisterAIGenerator, apiConfig.enabled, apiConfig.apiKey]);

  useEffect(() => {
    if (!npcTalkRequest || !apiConfig.enabled || !apiConfig.apiKey || isCallingRef.current) return;
    const npc = state.npcs.find((n) => n.id === npcTalkRequest.npcId);
    const deepContext = npc ? buildNpcDeepContext(npc, state) : '[NPC对话模式] 请扮演对应NPC并严格输出JSON。';
    sendChatRef.current(`${deepContext}\n【玩家对你说】${npcTalkRequest.prompt}`);
    onNPCTalkHandled?.();
  }, [npcTalkRequest, apiConfig.enabled, apiConfig.apiKey, state, onNPCTalkHandled]);

  const handleProviderChange = (provider: APIConfig['provider']) => {
    const defaults = DEFAULT_API_CONFIGS[provider];
    setApiConfig((prev) => ({ ...prev, provider, endpoint: defaults?.endpoint || prev.endpoint, model: defaults?.model || prev.model }));
    setAccountBalance(null);
  };

  const checkBalance = async () => {
    if (!apiConfig.apiKey) return setError('请先输入API密钥');
    if (apiConfig.provider !== 'siliconflow') return setError('仅支持硅基流动余额查询');
    try {
      const res = await fetch('https://api.siliconflow.cn/v1/user/info', { headers: { Authorization: getAuthHeader() } });
      if (!res.ok) throw new Error(`查询失败：${res.status}`);
      const data = await res.json();
      const balance = data.data?.balance ?? data.data?.totalBalance ?? data.balance;
      if (balance === undefined) throw new Error('无法读取余额字段');
      setAccountBalance(parseFloat(balance));
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '查询余额失败');
    }
  };

  const handleCopyPrompt = async () => {
    try { await navigator.clipboard.writeText(contextPrompt); setSuccess(true); } catch { setError('复制失败'); }
  };
  const handleProcessManual = () => {
    if (!manualInput.trim()) return setError('请先输入内容');
    setError(null);
    processAIResponse(manualInput);
    setSuccess(true);
  };

  const readClipboardAndProcess = async (auto = false) => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text || text.trim().length < 5) { if (!auto) setClipboardStatus('剪贴板为空或内容太短'); return; }
      if (text === lastClipboard) { if (!auto) setClipboardStatus('剪贴板没有新内容'); return; }
      setLastClipboard(text);
      setClipboardStatus(auto ? `✅已自动读取并解析（${new Date().toLocaleTimeString()}）` : '✅已读取并解析');
      processAIResponse(text);
      setSuccess(true);
    } catch (err) {
      setClipboardStatus('读取失败，请手动粘贴');
      if (!auto) setError(err instanceof Error ? err.message : '读取失败');
    }
  };

  return (
    <div className="space-y-3 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-purple-400 font-bold"><Brain size={16} className="animate-pulse" /><span>AI 引擎</span>{apiStatus === 'connected' && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}</div>
        <div className="flex gap-1">{['chat', 'text', 'json', 'web'].map((mode) => <button key={mode} onClick={() => setInputMode(mode as any)} className={`px-2 py-1 rounded text-[10px] transition ${inputMode === mode ? 'bg-purple-600 text-white' : 'text-zinc-500 hover:bg-zinc-800'}`}>{mode === 'chat' ? '💬聊天' : mode === 'text' ? '📝文本' : mode === 'json' ? '{}JSON' : '🌐网页'}</button>)}</div>
      </div>

      <div className="bg-zinc-800/60 rounded-lg p-2 space-y-1.5">
        <div className="flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-3"><span className="flex items-center gap-1 text-blue-400"><BarChart3 size={10} /> {tokenUsage.sessionTokens.toLocaleString()} tokens</span><span className="flex items-center gap-1 text-green-400"><DollarSign size={10} /> ¥{tokenUsage.estimatedCost.toFixed(4)}</span><span className="flex items-center gap-1 text-zinc-400"><MessageCircle size={10} /> {tokenUsage.callCount}次</span></div>
          <button onClick={() => setTokenUsage((prev) => ({ ...prev, sessionTokens: 0, callCount: 0, estimatedCost: 0 }))} className="text-zinc-600 hover:text-zinc-400"><RefreshCw size={10} /></button>
        </div>
        {accountBalance !== null && <div className="flex items-center justify-between text-[10px] pt-1 border-t border-zinc-700/50"><span className="text-emerald-400">💰 余额：¥{accountBalance.toFixed(4)}</span><span className="text-zinc-500">约可${Math.floor(accountBalance / (getCostPerToken() * 1000))}K tokens</span></div>}
      </div>

      <div className="bg-zinc-800/50 rounded-lg border border-zinc-700 overflow-hidden">
        <button onClick={() => setShowAPIConfig(!showAPIConfig)} className="w-full flex items-center justify-between p-2.5 hover:bg-zinc-700/30 transition"><div className="flex items-center gap-2"><Key size={12} className="text-yellow-500" /><span className="text-xs font-medium text-zinc-300">API配置</span>{apiConfig.enabled && apiStatus === 'connected' && <span className="flex items-center gap-1 text-[10px] text-green-400 bg-green-900/30 px-1.5 py-0.5 rounded"><Wifi size={8} />已连接</span>}{apiStatus === 'error' && <span className="flex items-center gap-1 text-[10px] text-red-400 bg-red-900/30 px-1.5 py-0.5 rounded"><WifiOff size={8} />失败</span>}</div>{showAPIConfig ? <ChevronUp size={12} className="text-zinc-500" /> : <ChevronDown size={12} className="text-zinc-500" />}</button>
        {showAPIConfig && (
          <div className="p-3 border-t border-zinc-700 space-y-2 animate-fade-in">
            <div className="grid grid-cols-4 gap-1">{[{ id: 'siliconflow', name: '硅基流动' }, { id: 'openai', name: 'OpenAI' }, { id: 'deepseek', name: 'DeepSeek' }, { id: 'claude', name: 'Claude' }, { id: 'qwen', name: '通义' }, { id: 'ollama', name: 'Ollama' }, { id: 'custom', name: '自定义' }].map((p) => <button key={p.id} onClick={() => handleProviderChange(p.id as APIConfig['provider'])} className={`py-1 px-1.5 text-[10px] rounded transition ${apiConfig.provider === p.id ? 'bg-purple-600 text-white' : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'}`}>{p.name}</button>)}</div>
            {apiConfig.provider !== 'ollama' && <div className="flex gap-1"><input type="password" value={apiConfig.apiKey} onChange={(e) => setApiConfig((prev) => ({ ...prev, apiKey: e.target.value }))} placeholder="API密钥" className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-600" />{apiConfig.provider === 'siliconflow' && <button onClick={checkBalance} className="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 text-white text-[10px] rounded whitespace-nowrap">💰余额</button>}</div>}
            <input type="text" value={apiConfig.endpoint} onChange={(e) => setApiConfig((prev) => ({ ...prev, endpoint: e.target.value }))} className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-[10px] text-white font-mono focus:outline-none focus:border-purple-600" />
            {getModelList().length > 0 && !isCustomModelInput ? (
              <div className="relative">
                <div className="flex gap-1">
                  <button onClick={() => setShowModelSelect(!showModelSelect)} className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-left text-white flex justify-between items-center hover:border-purple-600 transition"><span className="truncate">{getModelList().find((m) => m.id === apiConfig.model)?.name || apiConfig.model}</span><span className="flex items-center gap-2"><span className="text-[10px] text-zinc-500">{getModelList().length}个</span><ChevronDown size={12} className={`text-zinc-500 transition ${showModelSelect ? 'rotate-180' : ''}`} /></span></button>
                  <button onClick={() => { setIsCustomModelInput(true); setShowModelSelect(false); }} title="自定义输入模型名" className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-400 hover:text-white rounded text-[10px] whitespace-nowrap transition flex items-center gap-1"><span>✎</span></button>
                </div>
                {showModelSelect && <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl z-50 max-h-80 overflow-y-auto">{getModelList().map((m) => <button key={m.id} onClick={() => { setApiConfig((prev) => ({ ...prev, model: m.id })); setShowModelSelect(false); }} className={`w-full text-left px-3 py-2 text-xs hover:bg-zinc-800 transition flex items-center justify-between ${apiConfig.model === m.id ? 'bg-purple-900/30 text-purple-300' : 'text-zinc-300'}`}><span>{m.name}</span><span className={`text-[9px] px-1.5 py-0.5 rounded ${m.free ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/50 text-yellow-400'}`}>{m.free ? '免费' : '付费'}</span></button>)}</div>}
              </div>
            ) : (
              <div className="flex gap-1">
                <input type="text" value={apiConfig.model} onChange={(e) => setApiConfig((prev) => ({ ...prev, model: e.target.value }))} placeholder="输入模型名称/ID..." className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-600" />
                {getModelList().length > 0 && <button onClick={() => setIsCustomModelInput(false)} title="切换回列表选择" className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-400 hover:text-white rounded text-[10px] whitespace-nowrap transition flex items-center gap-1"><span>☰</span></button>}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2"><div><label className="text-[10px] text-zinc-500">温度 ({apiConfig.temperature})</label><input type="range" min="0" max="1" step="0.1" value={apiConfig.temperature} onChange={(e) => setApiConfig((prev) => ({ ...prev, temperature: parseFloat(e.target.value) }))} className="w-full" /></div><div><label className="text-[10px] text-zinc-500">最大Token</label><input type="number" value={apiConfig.maxTokens} onChange={(e) => setApiConfig((prev) => ({ ...prev, maxTokens: parseInt(e.target.value, 10) || 1000 }))} className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white" /></div></div>
            <div className="flex items-center justify-between pt-2 border-t border-zinc-700"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={apiConfig.enabled} onChange={(e) => setApiConfig((prev) => ({ ...prev, enabled: e.target.checked }))} className="w-3.5 h-3.5 rounded" /><span className="text-xs text-zinc-300">启用</span></label><div className="flex gap-1.5"><button onClick={() => { localStorage.setItem('apocalypse_api_config', JSON.stringify(apiConfig)); setSuccess(true); }} className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-[10px] rounded flex items-center gap-1"><Save size={10} />保存</button><button onClick={testAPIConnection} disabled={isCallingAPI} className="px-2 py-1 bg-yellow-600 hover:bg-yellow-500 text-white text-[10px] rounded flex items-center gap-1 disabled:opacity-50">{isCallingAPI ? <Loader2 size={10} className="animate-spin" /> : <TestTube size={10} />}测试</button></div></div>
            {apiConfig.enabled && apiConfig.apiKey && <div className="flex items-center justify-between pt-2 border-t border-zinc-700 mt-2"><span className="text-[10px] text-zinc-500">初始化后，AI会理解人物性格、货币、武学、情侣系统与世界规则</span><button onClick={() => { localStorage.removeItem('apoc_ai_initialized'); initializeAI(); }} disabled={isCallingAPI} className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] rounded flex items-center gap-1 disabled:opacity-50">{isCallingAPI ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}初始化AI</button></div>}
          </div>
        )}
      </div>

      {apiConfig.enabled && apiConfig.apiKey && <div className="space-y-2"><div className="flex items-center justify-between p-2 bg-gradient-to-r from-green-900/20 to-emerald-900/20 rounded-lg border border-green-800/30"><div className="flex items-center gap-2"><Zap size={14} className={autoAIEnabled ? 'text-green-400 animate-pulse' : 'text-zinc-500'} /><span className="text-xs text-white">自动交互</span></div><button onClick={() => setAutoAIEnabled?.(!autoAIEnabled)} className={`relative w-10 h-5 rounded-full transition-colors ${autoAIEnabled ? 'bg-green-600' : 'bg-zinc-700'}`}><div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${autoAIEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} /></button></div>{!localStorage.getItem('apoc_ai_initialized') && <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-[11px] text-amber-200 flex items-center justify-between gap-2"><span>当前API已配置，但尚未完成世界设定初始化。为避免AI失忆或上下文错乱，建议先初始化</span><button onClick={initializeAI} disabled={isCallingAPI} className="px-2 py-1 rounded bg-amber-700 hover:bg-amber-600 text-white whitespace-nowrap disabled:opacity-50">立即初始化</button></div>}</div>}

      {inputMode === 'chat' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div ref={chatViewportRef} className="flex-1 overflow-y-auto overflow-x-hidden space-y-2 h-[42vh] min-h-[220px] max-h-[42vh] lg:h-[400px] lg:max-h-[400px] p-2 bg-zinc-950/50 rounded-lg border border-zinc-800 overscroll-contain">
            {chatMessages.length === 0 && <div className="flex flex-col items-center justify-center h-full text-zinc-600 text-xs gap-3"><Bot size={32} className="text-zinc-700" /><p>输入行动开始冒险</p><p className="text-[10px]">AI会自动解析并更新人物、物品、时间、地点、天气、江湖状态与情感关系</p>{apiConfig.enabled && apiConfig.apiKey && !localStorage.getItem('apoc_ai_initialized') && <button onClick={initializeAI} disabled={isCallingAPI} className="mt-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs flex items-center gap-2 transition disabled:opacity-50">{isCallingAPI ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}开始游戏 - 初始化AI设定</button>}</div>}
            {chatMessages.map((msg) => {
              const isNpcSpeech = msg.role === 'assistant' && msg.msgType === 'npc_speech';
              const isScene = msg.role === 'assistant' && msg.msgType === 'scene';
              const isSystem = msg.role === 'system';
              const isUser = msg.role === 'user';
              const speakerNpc = msg.speakerNpcId ? state.npcs.find(x => x.id === msg.speakerNpcId) : undefined;
              return (
                <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                  <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${isUser ? 'bg-blue-600 text-white rounded-br-sm' : isSystem ? 'bg-zinc-800/60 text-zinc-400 rounded-bl-sm italic border border-zinc-700/50' : isNpcSpeech ? 'bg-gradient-to-r from-pink-900/40 to-purple-900/40 text-pink-100 rounded-bl-sm border border-pink-800/30 shadow-lg shadow-pink-900/20' : isScene ? 'bg-gradient-to-r from-amber-900/30 to-orange-900/30 text-amber-100 rounded-bl-sm border border-amber-800/30 shadow-lg shadow-amber-900/20' : 'bg-zinc-800 text-zinc-200 rounded-bl-sm'}`}>
                    {isNpcSpeech && msg.speakerName && (
                      <div className="flex items-center gap-2 mb-1.5 pb-1.5 border-b border-pink-700/30">
                        <div className="w-6 h-6 rounded-full bg-pink-600/30 flex items-center justify-center text-white text-[10px] font-bold ring-1 ring-pink-500/50">{speakerNpc ? speakerNpc.name[0] : msg.speakerName[0]}</div>
                        <div className="flex flex-col"><span className="text-pink-300 font-medium text-[11px]">{msg.speakerName}</span>{msg.mood && <span className="text-[9px] text-pink-400/60">{msg.mood}</span>}</div>
                      </div>
                    )}
                    {isScene && (
                      <div className="flex items-center gap-1.5 mb-1.5 pb-1.5 border-b border-amber-700/30 text-amber-400/80"><MapPin size={12} /><span className="text-[10px] font-medium tracking-wider">场景</span></div>
                    )}
                    {isSystem && msg.content.startsWith('🎮') && (
                      <div className="flex items-center gap-1.5 mb-1 text-emerald-400/80"><Sparkles size={11} /><span className="text-[10px] font-medium">系统</span></div>
                    )}
                    <div className="space-y-2"><p className={`whitespace-pre-wrap ${isNpcSpeech ? 'text-pink-50' : isScene ? 'text-amber-50' : ''}`}>{msg.content}</p>{msg.tokens && <span className="text-[9px] text-zinc-600 mt-1 block">{msg.tokens} tokens</span>}</div>
                  </div>
                </div>
              );
            })}
            {isCallingAPI && <div className="flex justify-start animate-fade-in"><div className="bg-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-400 flex items-center gap-2"><Loader2 size={12} className="animate-spin" /> 推演中...</div></div>}
            <div ref={chatEndRef} />
          </div>
          <div className="flex gap-1 py-1.5 overflow-x-auto">{['观察周围', '搜索附近', '与人搭话', '检查随身物品', '原地调息'].map((act) => <button key={act} onClick={() => sendChatMessage(act)} disabled={isCallingAPI} className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded text-[10px] whitespace-nowrap transition disabled:opacity-50">{act}</button>)}</div>
          <div className="flex gap-2"><input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder={`.?{state.player.name || '你的角色'}的身份输入行动或对话...`} className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500" disabled={isCallingAPI} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }} /><button onClick={() => sendChatMessage()} disabled={isCallingAPI || !chatInput.trim()} className="px-3 bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-700 text-white rounded-lg transition disabled:cursor-not-allowed">{isCallingAPI ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}</button></div>
        </div>
      )}

      {(inputMode === 'text' || inputMode === 'json') && <div className="space-y-2"><div className="text-xs p-2 bg-zinc-800/50 rounded border border-zinc-700">{inputMode === 'text' ? <p className="text-purple-300 flex items-center gap-1"><Sparkles size={12} /> 粘贴AI文本，系统会自动清洗思考内容并智能解析</p> : <p className="text-blue-300 flex items-center gap-1"><FileJson size={12} /> 粘贴AI JSON 响应，系统会自动对接各字</p>}</div><div className="flex gap-2 text-xs"><button onClick={handleCopyPrompt} className="flex-1 py-1.5 bg-purple-700 hover:bg-purple-600 text-white rounded flex items-center justify-center gap-1 transition"><Copy size={12} />复制完整提示</button></div><textarea value={manualInput} onChange={(e) => { setManualInput(e.target.value); setError(null); }} placeholder={inputMode === 'json' ? '{"story_text":"..."}' : '粘贴AI响应内容...'} className="w-full h-32 bg-zinc-950 text-xs p-2 rounded-lg border border-zinc-800 font-mono resize-none text-zinc-300 focus:outline-none focus:border-purple-600" /><button onClick={handleProcessManual} disabled={!manualInput.trim()} className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-zinc-700 disabled:to-zinc-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition">{inputMode === 'text' ? <><Sparkles size={14} /> 智能解析</> : <><Play size={14} /> 处理JSON</>}</button></div>}

      <button onClick={() => setShowSettings(!showSettings)} className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-400"><Settings size={10} /> 解析设置 {showSettings ? <ChevronUp size={10} /> : <ChevronDown size={10} />}</button>
      {showSettings && <div className="bg-zinc-800/50 rounded p-2 grid grid-cols-2 gap-1.5 animate-fade-in">{[{ key: 'autoAddItems', label: '自动添加物品' }, { key: 'autoUpdateNPCs', label: '自动更新NPC' }, { key: 'autoAdvanceTime', label: '自动推进时间' }, { key: 'autoUpdateStats', label: '自动更新状态' }, { key: 'parseDialogue', label: '解析对话' }, { key: 'parseEvents', label: '解析事件' }].map(({ key, label }) => <label key={key} className="flex items-center gap-1.5 text-[10px] cursor-pointer"><input type="checkbox" checked={parseConfig[key as keyof ParseConfig]} onChange={(e) => setParseConfig((prev) => ({ ...prev, [key]: e.target.checked }))} className="w-3 h-3 rounded" /><span className="text-zinc-400">{label}</span></label>)}</div>}

      <div className="bg-zinc-800/30 rounded-lg p-2 space-y-1 text-[10px]"><div className="flex justify-between text-zinc-500"><span>累计总Token</span><span className="text-zinc-300">{tokenUsage.totalTokens.toLocaleString()}</span></div><div className="flex justify-between text-zinc-500"><span>本次会话</span><span className="text-blue-400">{tokenUsage.sessionTokens.toLocaleString()}</span></div><div className="flex justify-between text-zinc-500"><span>调用次数</span><span className="text-zinc-300">{tokenUsage.callCount}</span></div><div className="flex justify-between text-zinc-500"><span>预估费用</span><span className="text-green-400">¥{tokenUsage.estimatedCost.toFixed(4)}</span></div><div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden mt-1"><div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all" style={{ width: `${Math.min(100, tokenUsage.sessionTokens / 100)}%` }} /></div></div>

      {error && <div className="flex items-start gap-2 text-red-400 text-xs bg-red-900/20 p-2 rounded border border-red-800/50"><AlertCircle size={12} className="mt-0.5 flex-shrink-0" /><span>{error}</span></div>}
      {success && !error && <div className="flex items-center gap-2 text-green-400 text-xs bg-green-900/20 p-2 rounded border border-green-800/50"><CheckCircle size={12} /> 处理成功</div>}
    </div>
  );
};
