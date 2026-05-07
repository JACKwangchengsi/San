/**
 * AI智能解析器（深度增强版）
 * 目标：
 * 1. 无论AI返回完整JSON、截断JSON、代码块JSON、混合文本，都尽量稳定提取 story_text
 * 2. 严格防止“状态/情绪/伤势/提示/地点/JSON残片”被误识别为物品
 * 3. 更紧密对接人物、时间、地点、天气、货币、声望、武学、境界等系统
 * 4. 更智能地将 AI 生成的未知物品归类到武侠世界体系中
 */

import { AIResponse, Buff, Debuff, GameState, Injury, Item, ItemEffect, NPC, StatKey, WeatherType, WorldState } from '../types/game';

const THINKING_PATTERNS = [
  /<think>[\s\S]*?<\/think>/gi,
  /<thinking>[\s\S]*?<\/thinking>/gi,
  /<reasoning>[\s\S]*?<\/reasoning>/gi,
  /<analysis>[\s\S]*?<\/analysis>/gi,
  /【思考】[\s\S]*?(【\/思考】|$)/gi,
  /【推理】[\s\S]*?(【\/推理】|$)/gi,
  /（思考：[\s\S]*?）/gi,
  /\(思考:[\s\S]*?\)/gi,
  /\*思考中[\s\S]*?\*/gi,
];

const JSON_TRAIL_PATTERNS = [
  /[\],}]+\s*"?(time_passed_minutes|new_items|npc_updates|player_stat_changes|choices|dialogue|world_state_changes|discoveries|location_change|weather_change|reputation_change|righteousness_change|money_change|martial_progress|realm_breakthrough)"?\s*:[\s\S]*$/gi,
  /"?(speaker|text|mood|id|consequence_hint|status|changes)"?\s*:\s*"[^"]*"\s*,?/gi,
  /\b(dialogue|choices|new_items|npc_updates|player_stat_changes|time_passed_minutes|location_change|weather_change|reputation_change|righteousness_change|money_change|martial_progress|realm_breakthrough)\b\s*[:：][\s\S]*$/gi,
  /\{\s*"id"\s*:\s*"[^"]+"\s*,\s*"text"\s*:\s*"[^"]*"[\s\S]*$/gi,
  /location_change\s*[:：].*?(应为\s*null|null).*$/gi,
  /只输出严格json[\s\S]*$/gi,
  /只有真正换地点时才填[\s\S]*$/gi,
  /当前地点未变[\s\S]*$/gi,
];

const WUXIA_ITEMS: Record<string, { type: string; label: string; keywords: string[] }> = {
  weapon: { type: 'weapon', label: '兵器', keywords: ['剑', '刀', '枪', '棍', '棒', '戟', '斧', '匕首', '飞刀', '飞镖', '袖箭', '暗器', '弓', '弩', '木剑', '铁剑', '长剑', '短剑', '刀鞘', '长枪', '佩剑', '长刀', '短刀', '铜锤', '铁尺', '判官笔'] },
  medicine: { type: 'medicine', label: '丹药', keywords: ['丹', '药', '丸', '散', '膏', '止血散', '金创药', '解毒丹', '疗伤药', '草药', '绷带', '药包', '药粉', '灵芝', '人参', '伤药', '药膏', '药引', '止痛散', '回气丹', '凝血散'] },
  food: { type: 'food', label: '吃食', keywords: ['干粮', '馒头', '包子', '烧饼', '肉干', '烤肉', '米饭', '面条', '粥', '野果', '点心', '烧鸡', '饼', '面饼', '炊饼', '菜团', '腊肉', '饴糖', '月饼'] },
  drink: { type: 'drink', label: '饮品', keywords: ['水囊', '清水', '泉水', '井水', '茶', '酒', '药酒', '浊酒', '烈酒', '水袋', '米酒', '清茶', '热汤', '壶水', '竹筒水'] },
  material: { type: 'material', label: '材料', keywords: ['木材', '竹子', '藤条', '绳索', '布匹', '丝绸', '皮革', '矿石', '玄铁', '寒铁', '兽皮', '铁钉', '木板', '铜块', '银丝', '碎布', '麻绳', '药材', '木炭', '兽骨'] },
  tool: { type: 'tool', label: '器具', keywords: ['火折子', '灯笼', '蜡烛', '钥匙', '锁', '地图', '罗盘', '油灯', '包袱', '行囊', '背篓', '水桶', '火石', '飞鸽', '信筒', '针线', '药杵', '磨刀石', '绳钩'] },
  document: { type: 'document', label: '书卷', keywords: ['秘籍', '剑谱', '刀谱', '拳谱', '心法', '书信', '密信', '手札', '账本', '令牌', '腰牌', '信物', '路引', '信笺', '残卷', '经卷', '图谱', '玉简'] },
  misc: { type: 'misc', label: '杂物', keywords: ['银两', '银子', '碎银', '铜钱', '铜板', '玉佩', '珠宝', '翡翠', '玛瑙', '钱袋', '香囊', '护符', '玉坠', '铃铛', '玉簪'] },
  clothing: { type: 'clothing', label: '衣物', keywords: ['布衣', '长袍', '道袍', '夜行衣', '斗笠', '草鞋', '披风', '护腕', '软甲', '护心镜', '青衫', '短打', '外袍', '披肩', '束带', '靴子'] },
};

const CATEGORY_INFERENCE_PATTERNS: Array<{ type: string; keywords: RegExp[] }> = [
  { type: 'weapon', keywords: [/剑|刀|枪|戟|棍|棒|弩|弓|匕|锤|鞭|镖|箭|矛|刃/] },
  { type: 'medicine', keywords: [/丹|药|散|膏|丸|草|芝|参|包扎|止血|疗伤|解毒|药材/] },
  { type: 'food', keywords: [/饼|粮|肉|鸡|饭|面|粥|果|点心|包子|馒头|烧饼|炊饼/] },
  { type: 'drink', keywords: [/茶|酒|水|汤|泉|井|药酒|米酒|水囊|水袋|竹筒/] },
  { type: 'material', keywords: [/木|竹|藤|绳|布|丝|皮|矿|铁|铜|银|兽骨|木炭|碎布/] },
  { type: 'tool', keywords: [/火折|灯|烛|匙|锁|图|盘|囊|篓|桶|石|飞鸽|信筒|针线|药杵|磨刀石|绳钩/] },
  { type: 'document', keywords: [/秘籍|谱|心法|书信|密信|手札|账本|令牌|信物|路引|信笺|残卷|经卷|图谱|玉简/] },
  { type: 'clothing', keywords: [/袍|衣|笠|鞋|披风|护腕|软甲|护心镜|青衫|短打|外袍|披肩|束带|靴/] },
  { type: 'misc', keywords: [/银|钱|玉|珠|翡翠|玛瑙|香囊|护符|玉坠|铃铛|玉簪/] },
];

const BLACKLIST_EXACT = new Set([
  '饥饿感', '饥饿感缓解', '口渴感', '疲劳感', '疲惫感', '疼痛感', '安全地方', '危险地方', '有用信息', '重要信息', '线索', '情报', '风险', '危险', '安全', '提示', '后果', '情况', '状态', '变化', '效果', '气氛', '氛围', '杀意', '敌意', '信任', '好感', '恐惧', '紧张', '烦躁', '绝望', '饱腹感', '饥饿缓解', '口渴缓解', '内心一松', '老妇人', '老者', '少年感', '少女感', '未知发现', '当前地点未变', '应为null', '应为 null', 'location_change'
]);

const BLACKLIST_CONTAINS = [
  '伤', '伤口', '内伤', '外伤', '撕裂', '骨折', '流血', '出血', '疼痛', '中毒',
  '恐惧', '害怕', '愤怒', '紧张', '烦躁', '情绪', '心情', '心境',
  '地方', '位置', '区域', '房间', '走廊', '街道', '地点', '方向', '去处',
  '信息', '提示', '后果', '风险', '可能', '机会', '选择', '气息', '脚步声', '声响',
  'speaker', 'text', 'mood', 'id', 'dialogue', 'choice', 'npc_updates', 'player_stat_changes', 'time_passed_minutes', 'story_text'
];

const STATEY_SUFFIX = /(感|觉|意|情|态|化|应|况|息|影|声)$/;
const NON_ITEM_PHRASE = /(缓解|减轻|恢复|消失|增加|下降|提升|降低|波动|出现|袭来|蔓延|扩散|逼近|笼罩|浮现|袭上心头)/;
const SCENE_PREFIX = /^(你|他|她|他们|众人|周围|空气|气氛|局势|眼前|附近|四周|远处)/;
const NON_LOCATION_PATTERNS = [
  /第[一二三四五六七八九十百千万\d]+个?(清晨|早晨|上午|中午|午后|傍晚|黄昏|夜晚|夜里)/,
  /(应为\s*null|null)$/, /当前地点未变/, /只有真正换地点时才填/, /只输出严格json/i,
  /^未知发现$/, /^null$/i, /^location_change$/i,
];

const TIME_KEYWORDS: Record<string, number> = {
  '片刻': 5, '须臾': 3, '一盏茶': 15, '半盏茶': 8, '一柱香': 30, '一刻钟': 15,
  '半时辰': 60, '一时辰': 120, '两时辰': 240, '半天': 360, '一夜': 480,
  '瞬间': 1, '良久': 30, '许久': 45, '半晌': 30,
  '半日': 360, '一日': 720, '两天': 1440, '三日': 2160,
  '三天': 2160, '七日': 5040, '七天': 5040,
  '一会儿': 5, '眨眼间': 1, '弹指间': 2,
  '过了几日': 2880, '数日': 2880, '几个时辰': 300,
  '不久': 15, '不久之后': 20, '匆匆': 30,
};

const WEATHER_KEYWORDS: Record<string, string[]> = {
  clear: ['晴朗', '天晴', '阳光', '万里无云', '艳阳', '晴空', '碧空如洗', '日光', '日头', '天朗气清'],
  cloudy: ['多云', '云层', '白云', '天色渐明', '云朵'],
  overcast: ['阴天', '阴沉', '乌云', '天色昏暗', '灰蒙蒙', '铅灰', '阴云密布', '天阴', '晦暗'],
  rain: ['小雨', '细雨', '下雨', '雨丝', '雨点', '淅淅沥沥', '毛毛雨', '微雨', '降雨'],
  heavy_rain: ['大雨', '暴雨', '滂沱大雨', '瓢泼', '倾盆', '雨势猛烈', '豪雨', '骤雨'],
  thunderstorm: ['雷暴', '雷雨', '电闪雷鸣', '惊雷', '雷声隆隆', '闪电', '霹雳', '雷霆'],
  fog: ['浓雾', '雾气', '薄雾', '迷雾', '白雾', '雾霭', '烟霭', '雾蒙蒙', '雾色'],
  snow: ['小雪', '飘雪', '雪花', '落雪', '雪粒', '飞雪', '碎雪', '初雪'],
  blizzard: ['暴风雪', '风雪交加', '寒风凛冽', '风大雪大', '漫天风雪', '大雪纷飞'],
  sandstorm: ['风沙', '黄沙', '飞沙', '沙尘', '漫天黄沙', '沙暴'],
  drizzle: ['毛毛细雨', '细雨蒙蒙', '烟雨', '雨雾', '雨丝飘飘']
};

const NPC_STATUS_KEYWORDS = {
  dead: ['死', '身亡', '毙命', '殒命', '命丧', '倒下不起'],
  injured: ['受伤', '负伤', '重伤', '轻伤', '昏迷', '中毒', '奄奄一息'],
  missing: ['失踪', '消失', '逃走', '离去'],
  hostile: ['敌意', '敌对', '翻脸', '背叛', '杀意']
};

function removeThinkingContent(text: string): string {
  let out = text || '';
  THINKING_PATTERNS.forEach((p) => { out = out.replace(p, ''); });
  return out;
}

function decodeEscapes(text: string): string {
  return text
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, ' ')
    .replace(/\\"/g, '"')
    .replace(/\\r/g, ' ')
    .trim();
}

function normalizeCurrencyText(text: string): string {
  return text
    .replace(/(\d+)\s*(?:两银子|两银|银两)/g, '$1两')
    .replace(/(\d+)\s*(?:银子|碎银|白银)/g, '$1两')
    .replace(/(\d+)\s*(?:铜钱|铜板|文钱)/g, '$1文');
}

function cleanAIText(raw: string): string {
  if (!raw) return '';
  let text = removeThinkingContent(raw)
    .replace(/```json\n?/gi, '')
    .replace(/```\n?/g, '')
    .trim();

  JSON_TRAIL_PATTERNS.forEach((p) => {
    text = text.replace(p, '');
  });

  text = text
    .replace(/^\s*(txt|story|story_text|content|message|reply|narrative)\s*[:：]\s*/i, '')
    .replace(/[\u0000-\u001F]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s"'“”‘’`]+|[\s"'“”‘’`]+$/g, '')
    .trim();

  return normalizeCurrencyText(decodeEscapes(text));
}

function extractStringField(raw: string, fieldNames: string[]): string {
  for (const field of fieldNames) {
    const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const jsonMatch = raw.match(new RegExp(`"${escaped}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 's'));
    if (jsonMatch?.[1]) {
      const value = decodeEscapes(jsonMatch[1]);
      if (value.length > 3) return value;
    }

    const truncMatch = raw.match(new RegExp(`"${escaped}"\\s*:\\s*"([\\s\\S]{8,})`, 'i'));
    if (truncMatch?.[1]) {
      let content = truncMatch[1];
      const boundary = content.match(/^([\s\S]*?)(?:",\s*"(?:dialogue|choices|new_items|npc_updates|player_stat_changes|time_passed_minutes|location_change|weather_change|reputation_change|righteousness_change|money_change|martial_progress|realm_breakthrough)")/i);
      if (boundary?.[1]) content = boundary[1];
      else content = content.replace(/",?\s*"?\w+"\s*:\s*[\s\S]*$/, '').replace(/",?\s*$/, '');
      const value = decodeEscapes(content);
      if (value.length > 8) return value;
    }

    const plainMatch = raw.match(new RegExp(`${escaped}\\s*[:：]\\s*([\\s\\S]*?)(?=\\b(dialogue|choices|new_items|npc_updates|player_stat_changes|time_passed_minutes|location_change|weather_change|reputation_change|righteousness_change|money_change|martial_progress|realm_breakthrough)\\b|$)`, 'i'));
    if (plainMatch?.[1]) {
      const value = cleanAIText(plainMatch[1]);
      if (value.length > 3) return value;
    }
  }
  return '';
}

function safeJsonParse(raw: string): unknown {
  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace <= firstBrace) return null;
  const jsonCandidate = raw.slice(firstBrace, lastBrace + 1);
  try {
    return JSON.parse(jsonCandidate) as unknown;
  } catch {
    return null;
  }
}

function deepExtractStoryText(raw: string): { storyText: string; jsonData: unknown } {
  const cleanedRaw = removeThinkingContent(raw || '')
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  const jsonData = safeJsonParse(cleanedRaw) as Record<string, unknown> | null;
  if (jsonData) {
    const direct = [jsonData.story_text, jsonData.story, jsonData.txt, jsonData.text, jsonData.content, jsonData.narrative, jsonData.message, jsonData.reply]
      .find((v): v is string => typeof v === 'string' && v.trim().length > 3);
    if (direct) return { storyText: cleanAIText(direct), jsonData };
  }

  const extracted = extractStringField(cleanedRaw, ['story_text', 'story', 'txt', 'text', 'content', 'narrative', 'message', 'reply', 'storyText']);
  if (extracted) return { storyText: cleanAIText(extracted), jsonData };

  const fallback = cleanAIText(cleanedRaw)
    .replace(/^\s*\{\s*"?\w+"\s*:\s*"?/i, '')
    .replace(/"\s*,\s*"(dialogue|choices|new_items|npc_updates|player_stat_changes|time_passed_minutes|location_change|weather_change|reputation_change|righteousness_change|money_change|martial_progress|realm_breakthrough)"\s*:\s*[\s\S]*/gi, '')
    .trim();

  return { storyText: fallback || '（AI未返回有效故事正文）', jsonData };
}

function normalizeCandidateName(name: string): string {
  return name
    .replace(/^[一二三四五六七八九十半几两\d]+(?:个|把|件|袋|包|瓶|壶|封|卷|份|串|块|本|柄)?/, '')
    .replace(/[，。！？、,.!?:：;；)）\]}]+$/g, '')
    .replace(/^(了|的|一|些)/, '')
    .trim();
}

function inferItemTypeByPatterns(name: string): string {
  const n = normalizeCandidateName(name);
  for (const rule of CATEGORY_INFERENCE_PATTERNS) {
    if (rule.keywords.some((re) => re.test(n))) return rule.type;
  }
  return 'misc';
}

function isValidItemName(name: string): boolean {
  const n = normalizeCandidateName(name);
  if (!n || n.length < 2 || n.length > 12) return false;
  if (BLACKLIST_EXACT.has(n)) return false;
  if (BLACKLIST_CONTAINS.some((w) => n.includes(w))) return false;
  if (STATEY_SUFFIX.test(n)) return false;
  if (NON_ITEM_PHRASE.test(n)) return false;
  if (SCENE_PREFIX.test(n)) return false;
  if (/^[a-zA-Z_]+$/.test(n)) return false;
  if (/^[\d一二三四五六七八九十百千万两]+$/.test(n)) return false;
  if (/["{}\[\]:]/.test(n)) return false;
  const exactType = Object.values(WUXIA_ITEMS).some((cfg) => cfg.keywords.some((kw) => n.includes(kw) || kw.includes(n)));
  const inferredType = inferItemTypeByPatterns(n);
  return exactType || inferredType !== 'misc' || /银|钱|玉|珠|佩|囊|包|符|牌/.test(n);
}

function getItemType(name: string): string {
  const n = normalizeCandidateName(name);
  for (const [, cfg] of Object.entries(WUXIA_ITEMS)) {
    if (cfg.keywords.some((kw) => n.includes(kw) || kw.includes(n))) return cfg.type;
  }
  return inferItemTypeByPatterns(n);
}

function getItemDescription(name: string, type: string): string {
  const label = Object.values(WUXIA_ITEMS).find((c) => c.type === type)?.label || '物件';
  return `AI解析识别：${label}·${name}`;
}

function parseChineseNumber(str: string): number {
  const map: Record<string, number> = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 几: 2, 半: 1 };
  if (/^\d+$/.test(str)) return parseInt(str, 10);
  if (str === '半') return 1;
  let result = 0;
  let current = 0;
  for (const c of str) {
    const v = map[c];
    if (v === undefined) continue;
    if (v === 10) {
      result += (current || 1) * 10;
      current = 0;
    } else {
      current = v;
    }
  }
  return result + current || 1;
}

function extractItems(text: string, existingItems: Item[]) {
  const items: Array<{ name: string; type: string; description: string; quantity: number }> = [];
  const seen = new Set(existingItems.map((i) => i.name));
  const source = cleanAIText(text);

  const patterns = [
    /(?:找到|发现|获得|拿到|捡到|得到|拾起|取得|收获|缴获|搜到|摸到|掏出|翻出|夺取|抢到|偷得|取走|取下|摘下|采到|挖出|掘得)了?\s*(?:一|二|两|三|四|五|六|七|八|九|十|半|几|\d+)?(?:个|把|件|袋|包|瓶|壶|封|卷|份|串|块|本|柄|支|根|枚|颗)?\s*([^\s，。！？、,.!?:：;；]{2,12})/g,
    /(?:给了?你|递给你|交给你|塞给你|抛给你|赠予你|赏赐你|赠与你)\s*(?:一|二|两|三|四|五|六|七|八|九|十|半|几|\d+)?(?:个|把|件|袋|包|瓶|壶|封|卷|份|串|块|本|柄|支|根|枚|颗)?\s*([^\s，。！？、,.!?:：;；]{2,12})/g,
    /(?:怀里|包袱里|行囊里|手中|袖中|腰间|怀中|衣襟里|包裹中)(?:多了|有了|装着|放着|揣着|藏着)\s*([^\s，。！？、,.!?:：;；]{2,12})/g,
    // 尸体掉落
    /(?:尸体|遗体)(?:旁|边|上|身上)?(?:掉出|散落|遗落|留有)\s*(?:一|二|两|三|四|五|六|七|八|九|十|半|几|\d+)?(?:个|把|件|袋|包|瓶|壶|封|卷|份|串|块|本|柄|支|根|枚|颗)?\s*([^\s，。！？、,.!?:：;；]{2,12})/g,
    // 翻箱倒柜
    /(?:从|在)(?:箱|柜|桌|架|床|缸|瓮|箧)(?:子|里|中|底|下)?(?:翻出|找到|摸出|掏出|发现)\s*([^\s，。！？、,.!?:：;；]{2,12})/g,
    // 采集
    /(?:采(?:了|到|下)|摘(?:了|到|下)|挖(?:了|到|出)|拔(?:了|到|出)|钓(?:了|到|上))\s*(?:一|二|两|三|四|五|六|七|八|九|十|半|几|\d+)?(?:株|朵|根|颗|片|把)?\s*([^\s，。！？、,.!?:：;；]{2,10})/g,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source)) !== null) {
      const rawName = match[1];
      const name = normalizeCandidateName(rawName);
      if (!isValidItemName(name)) continue;
      if (seen.has(name)) continue;

      const qtyText = source.slice(Math.max(0, match.index - 8), match.index + match[0].length).match(/(一|二|两|三|四|五|六|七|八|九|十|半|几|\d+)(?=(个|把|件|袋|包|瓶|壶|封|卷|份|串|块|本|柄|支|根|枚|颗)?\s*[^\s])/);
      const quantity = qtyText ? parseChineseNumber(qtyText[1]) : 1;
      const type = getItemType(name);
      items.push({
        name,
        type,
        description: getItemDescription(name, type),
        quantity: Math.max(1, quantity),
      });
      seen.add(name);
    }
  }

  return items;
}

function extractRemovedItems(text: string, existingItems: Item[]): string[] {
  const source = cleanAIText(text);
  const existingNames = existingItems.map((i) => i.name);
  const removed: Set<string> = new Set();

  // 消耗类动词
  const consumeVerbs = '(?:吃(?:了|掉|完|下)|喝(?:了|掉|完|下|光)|用(?:了|掉|完|尽|光)|烧(?:了|掉|毁)|损(?:坏|毁)|断(?:了|裂)|碎(?:了|裂)|耗尽|花光|用光|喝干)';

  for (const name of existingNames) {
    if (name.length < 2) continue;
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // 精确匹配：消耗动词 + 物品名
    const consumeRe = new RegExp(`${consumeVerbs}(?:了?的?)?(?:你手中|你的|身上的)?${escaped}`, 'g');
    if (consumeRe.test(source)) {
      removed.add(name);
      continue;
    }

    // 被破坏/丢失
    const destroyedRe = new RegExp(`(?:你(?:手中|身上)?的)?${escaped}(?:被)?(?:损坏|碎裂|毁坏|折断|丢失|遗落|掉落|被人偷走|不见了|被夺)`, 'g');
    if (destroyedRe.test(source)) {
      removed.add(name);
      continue;
    }

    // 交出/给予
    const gaveRe = new RegExp(`(?:交出|递出|给了?|送给?|赠予)(?:了?)?${escaped}`, 'g');
    if (gaveRe.test(source)) {
      removed.add(name);
      continue;
    }
  }

  return Array.from(removed);
}

function extractTimeChange(text: string): number {
  const source = cleanAIText(text);
  let maxTime = 0;
  for (const [key, val] of Object.entries(TIME_KEYWORDS)) {
    if (source.includes(key)) maxTime = Math.max(maxTime, val);
  }
  const numeric = [
    { re: /(\d+)\s*分钟/, mul: 1 },
    { re: /(\d+)\s*小时/, mul: 60 },
    { re: /(\d+)\s*时辰/, mul: 120 },
    { re: /(\d+)\s*刻钟/, mul: 15 },
  ];
  numeric.forEach(({ re, mul }) => {
    const m = source.match(re);
    if (m) maxTime = Math.max(maxTime, parseInt(m[1], 10) * mul);
  });
  return maxTime || 5;
}

function extractStatChanges(text: string): Partial<Record<string, number>> {
  const source = cleanAIText(text);
  const changes: Partial<Record<string, number>> = {};

  const rules = {
    health: {
      plus: ['疗伤', '恢复', '治愈', '伤势减轻', '气血回升', '包扎', '服药', '敷药', '金创药', '止血', '回春', '内息平稳', '运功疗伤', '吐纳调息', '丹效发作', '灵药入腹', '药力化开'],
      minus: ['受伤', '负伤', '吐血', '流血', '内伤', '重伤', '中毒', '划伤', '剑伤', '刀伤', '骨裂', '震伤', '掌力透体', '筋脉受损', '咳血', '创口崩裂'],
    },
    hunger: {
      plus: ['吃了', '用膳', '进食', '果腹', '填饱', '吃下', '饱餐', '进食完毕', '狼吞虎咽', '吃饱喝足', '腹中充实', '大快朵颐'],
      minus: ['饥饿', '肚饿', '腹中空空', '饥肠辘辘', '饿得', '腹鸣', '饥火中烧'],
    },
    thirst: {
      plus: ['喝了', '饮水', '品茶', '饮酒', '解渴', '一饮而尽', '润喉', '灌下', '喝了几口', '啜饮'],
      minus: ['口渴', '口干舌燥', '嘴唇发干', '喉中冒烟', '渴得', '口渴难耐'],
    },
    energy: {
      plus: ['休息', '打坐', '调息', '恢复精力', '歇息', '小憩', '睡眠', '入定', '闭目养神', '打了一个盹', '精神了许多', '精力充沛'],
      minus: ['疲惫', '疲劳', '筋疲力尽', '困倦', '气力不支', '昏昏欲睡', '体力透支', '力竭', '全身乏力', '精神萎靡', '头昏眼花'],
    },
    sanity: {
      plus: ['镇定', '冷静', '心如止水', '心境平稳', '心安', '心神安定', '心绪安宁', '禅定', '看破', '释然', '想通了'],
      minus: ['恐惧', '惊恐', '心神不宁', '慌乱', '烦躁', '心乱如麻', '毛骨悚然', '胆寒', '崩溃', '失控', '魂魄震动', '头皮发麻', '夜不能寐'],
    },
    infection: {
      plus: ['毒发', '毒素蔓延', '中毒加深', '毒性发作', '毒气攻心', '黑气弥漫'],
      minus: ['解毒', '逼毒', '毒性减轻', '毒素排出', '服了解药', '毒性消退'],
    },
    stamina: {
      plus: ['活动筋骨', '热身', '恢复体力', '筋骨舒展', '力气恢复'],
      minus: ['体力不支', '脱力', '手臂发麻', '双腿发软', '站不稳'],
    },
  } as const;

  Object.entries(rules).forEach(([stat, cfg]) => {
    let delta = 0;
    cfg.plus.forEach((k) => { if (source.includes(k)) delta += stat === 'infection' ? 8 : stat === 'stamina' ? 10 : 12; });
    cfg.minus.forEach((k) => { if (source.includes(k)) delta -= stat === 'infection' ? 10 : stat === 'stamina' ? 8 : 10; });
    if (delta !== 0) changes[stat] = delta;
  });

  return changes;
}

function extractNPCUpdates(text: string, existingNPCs: NPC[]) {
  const source = cleanAIText(text);
  const updates: Array<{ id: string; changes: Partial<NPC> }> = [];
  existingNPCs.forEach((npc) => {
    if (!source.includes(npc.name)) return;
    Object.entries(NPC_STATUS_KEYWORDS).forEach(([status, kws]) => {
      if (kws.some((kw) => source.includes(`${npc.name}${kw}`) || source.includes(`${kw}${npc.name}`) || source.includes(`${npc.name} ${kw}`))) {
        updates.push({
          id: npc.id,
          changes: { status: status === 'dead' ? 'dead' : status === 'injured' ? 'injured' : status === 'hostile' ? 'hostile' : 'alive' }
        });
      }
    });
  });
  return updates;
}

function extractWeatherChange(text: string): string | null {
  const source = cleanAIText(text);
  for (const [weather, keywords] of Object.entries(WEATHER_KEYWORDS)) {
    if (keywords.some((kw) => source.includes(kw))) return weather;
  }
  return null;
}

function inferNewLocationType(name: string): 'room' | 'building' | 'outdoor' | 'underground' | 'vehicle' {
  if (/洞|窟|墓|地宫|密道|地下|暗道|石室/.test(name)) return 'underground';
  if (/房|室|阁|楼|殿|院|医馆|客栈|茶肆|铺|店|庙|祠|驿|寨|衙|堂|库|牢|坊/.test(name)) return 'building';
  if (/车|舟|船|马车/.test(name)) return 'vehicle';
  if (/林|山|谷|岭|滩|渡|桥|道|巷|街|集|野|镇|城|崖|湖|河|坡|坡道|林地|荒原/.test(name)) return 'outdoor';
  return 'outdoor';
}

function extractLocationChange(text: string, gameState: GameState): string | null {
  const source = cleanAIText(text);
  const allLocations = gameState.locations.map((l) => l.name);

  if (/location_change\s*[:：]/i.test(source) || /当前地点未变|只有真正换地点时才填|应为\s*null/i.test(source)) {
    return null;
  }

  const moveContext = /(来到|走到|进入|抵达|到达|前往|赶到|穿过|去了|动身前往|转去|赶往|踏入)/.test(source);
  if (!moveContext) return null;

  const direct = allLocations.find((name) => {
    if (name === gameState.world.location) return false;
    const index = source.indexOf(name);
    if (index === -1) return false;
    const prefix = source.slice(Math.max(0, index - 8), index + name.length);
    return /(来到|走到|进入|抵达|到达|前往|赶到|穿过|去了|动身前往|转去|赶往|踏入)/.test(prefix);
  });
  if (direct) return direct;

  const moveMatch = source.match(/(?:来到|走到|进入|抵达|到达|前往|赶到|穿过|去了|动身前往|转去|赶往|踏入)\s*([^，。！？、,.!?:：;；\n]{2,18})/);
  if (!moveMatch) return null;
  const candidate = moveMatch[1].trim();
  if (NON_LOCATION_PATTERNS.some((re) => re.test(candidate))) return null;
  const exists = allLocations.find((name) => candidate.includes(name) || name.includes(candidate));
  if (exists && exists !== gameState.world.location) return exists;
  const maybeNew = normalizeCandidateName(candidate);
  if (
    maybeNew.length >= 2 &&
    !BLACKLIST_CONTAINS.some(w => maybeNew.includes(w)) &&
    !/(地方|那里|这里|外面|里面|前方|周围|清晨|黄昏|夜晚|夜里|上午|午后)/.test(maybeNew) &&
    !NON_LOCATION_PATTERNS.some((re) => re.test(maybeNew))
  ) {
    return maybeNew;
  }
  return null;
}

function extractMoneyChanges(text: string) {
  const source = cleanAIText(text);
  let silver = 0;
  let copper = 0;

  // 中文数字 → 阿拉伯数字映射
  const cnNumMap: Record<string, number> = {
    '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9,
    '十': 10, '百': 100, '千': 1000, '万': 10000,
    '两': 2, '半': 0.5, '几': 2, '数': 2, '一些': 3,
  };

  function parseCnNumber(s: string): number {
    const trimmed = s.replace(/\s+/g, '');
    // 直接阿拉伯数字
    if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
    // "半" → 0.5
    if (trimmed === '半') return 0.5;
    // 单个中文数字
    if (cnNumMap[trimmed] !== undefined) {
      const v = cnNumMap[trimmed];
      if (v === 10 || v === 100 || v === 1000 || v === 10000) return v;
      return v;
    }
    // "二十三" / "三十五" 等
    let result = 0;
    let unit = 1;
    for (let i = trimmed.length - 1; i >= 0; i--) {
      const ch = trimmed[i];
      if (ch === '十') { unit = Math.max(unit, 10); continue; }
      if (ch === '百') { unit = Math.max(unit, 100); continue; }
      if (ch === '千') { unit = Math.max(unit, 1000); continue; }
      if (ch === '万') { unit = Math.max(unit, 10000); continue; }
      if (cnNumMap[ch] !== undefined && cnNumMap[ch] < 10) {
        result += cnNumMap[ch] * unit;
        unit = 1;
      }
    }
    if (trimmed.startsWith('十')) result += 10;
    return result || 1;
  }

  const patterns = [
    // 获得类 — 两
    { re: /(?:获得|得到|赚到|收到|挣了|摸出|捡到|拾得|捡了|收了|拿来|递来|塞来|掏出|翻出|找出|拿到|接到)\s*(\d+)\s*两/g, sign: 1, kind: 'silver' },
    { re: /(?:获得|得到|赚到|收到|挣了|摸出|捡到|拾得|捡了|收了|拿来|递来|塞来|掏出|翻出|找出|拿到|接到)\s*([一二三四五六七八九十百千万两半几数]+)\s*两/g, sign: 1, kind: 'silver', cn: true },
    // 获得类 — 文/铜钱
    { re: /(?:获得|得到|赚到|收到|挣了|摸出|捡到|拾得|捡了|收了)\s*(\d+)\s*(?:文|铜钱|枚铜|个铜板)/g, sign: 1, kind: 'copper' },
    { re: /(?:获得|得到|赚到|收到|挣了|摸出|捡到|拾得|捡了|收了)\s*([一二三四五六七八九十百千万两半几数]+)\s*(?:文|铜钱|枚铜|个铜板)/g, sign: 1, kind: 'copper', cn: true },
    // 花费类 — 两
    { re: /(?:花费|花了|付了|支付|给了|赔了|掏出|递出|付过|结账|买单|付账|赔出)\s*(\d+)\s*两/g, sign: -1, kind: 'silver' },
    { re: /(?:花费|花了|付了|支付|给了|赔了|掏出|递出|付过|结账|买单|付账|赔出)\s*([一二三四五六七八九十百千万两半几数]+)\s*两/g, sign: -1, kind: 'silver', cn: true },
    // 花费类 — 文/铜钱
    { re: /(?:花费|花了|付了|支付|给了|赔了|掏出|递出)\s*(\d+)\s*(?:文|铜钱|枚铜|个铜板)/g, sign: -1, kind: 'copper' },
    { re: /(?:花费|花了|付了|支付|给了|赔了|掏出|递出)\s*([一二三四五六七八九十百千万两半几数]+)\s*(?:文|铜钱|枚铜|个铜板)/g, sign: -1, kind: 'copper', cn: true },
    // "X两Y文" 组合模式（收入）
    { re: /(?:获得|得到|赚到|收到|挣了)\s*(\d+)\s*两\s*(\d+)\s*文/g, sign: 1, kind: 'both' },
    // "X两Y文" 组合模式（支出）
    { re: /(?:花费|花了|付了|支付)\s*(\d+)\s*两\s*(\d+)\s*文/g, sign: -1, kind: 'both' },
    // 锭/块/袋 模糊表达 (约等于银两计量)
    { re: /(?:获得|得到|赚到|捡到|拾得)\s*(?:一锭|一袋|一包|一块)\s*(?:银子|碎银|银两|银钱)/g, sign: 1, kind: 'silver', fixed: 5 },
    { re: /(?:花费|花了|付了|给了|赔了)\s*(?:一锭|一袋|一包|一块)\s*(?:银子|碎银|银两|银钱)/g, sign: -1, kind: 'silver', fixed: 5 },
    // 白给/赠送/赏赐 类
    { re: /(?:赏了|赏赐|赠与|赠送|白送|送给|给了)\s*(\d+)\s*两/g, sign: 1, kind: 'silver' },
    { re: /(?:赏了|赏赐|赠与|赠送|白送|送给|给了)\s*(\d+)\s*(?:文|铜钱)/g, sign: 1, kind: 'copper' },
  ] as const;

  patterns.forEach((entry) => {
    const { re, sign, kind, cn: isCn = false, fixed = undefined } = entry as { re: RegExp; sign: number; kind: 'silver' | 'copper' | 'both'; cn?: boolean; fixed?: number };
    const matches = Array.from(source.matchAll(re));
    matches.forEach((m) => {
      if (fixed !== undefined) {
        silver += fixed * sign;
        return;
      }
      if (kind === 'both') {
        silver += parseInt(m[1], 10) * sign;
        copper += parseInt(m[2], 10) * sign;
        return;
      }
      const rawNum = isCn ? String(parseCnNumber(m[1])) : m[1];
      const n = parseFloat(rawNum) * sign;
      if (kind === 'silver') silver += n;
      else copper += isCn ? Math.round(parseFloat(String(parseCnNumber(m[1]))) * sign) : Math.round(parseFloat(m[1]) * sign);
      if (isCn) {
        // cn numbers for copper already handled above
        const parsedCn = parseCnNumber(m[1]);
        if (kind === 'silver') silver += parsedCn * sign;
        else copper += Math.round(parsedCn * sign);
        // undo the first addition for cn patterns
        if (kind === 'silver') silver -= n;
        else copper -= Math.round(n);
      }
    });
  });

  // 规范化：铜钱>=100 进位到银两
  while (copper >= 100) { silver += Math.sign(copper); copper -= 100 * Math.sign(copper); }
  while (copper <= -100) { silver += Math.sign(copper); copper -= 100 * Math.sign(copper); }

  return { silver: Math.round(silver), copper: Math.round(copper) };
}

function extractDialogueFromJson(jsonData: unknown) {
  const jd = jsonData as Record<string, unknown> | null;
  if (!Array.isArray(jd?.dialogue)) return [];
  return (jd.dialogue as Array<Record<string, unknown>>)
    .filter((d) => d && typeof d.speaker === 'string' && typeof d.text === 'string')
    .map((d) => ({ speaker: (d.speaker as string).trim(), text: (d.text as string).trim(), mood: typeof d.mood === 'string' ? (d.mood as string).trim() : undefined }));
}

function stripDialogueDuplication(storyText: string, dialogue: Array<{ speaker: string; text: string }>) {
  let text = storyText;
  dialogue.forEach((d) => {
    const escapedSpeaker = d.speaker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedText = d.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const linePattern = new RegExp(`^\\s*${escapedSpeaker}\\s*[：:]\\s*${escapedText}\\s*$`, 'gm');
    text = text.replace(linePattern, '').trim();
  });
  return text;
}

function extractReputationChanges(text: string) {
  const source = cleanAIText(text);
  let reputation = 0;
  let righteousness = 0;
  ['行侠仗义', '救人', '施舍', '扶危济困', '除暴安良', '仗义出手'].forEach((k) => {
    if (source.includes(k)) { reputation += 5; righteousness += 8; }
  });
  ['背叛', '偷窃', '抢劫', '害人', '暗算', '勒索'].forEach((k) => {
    if (source.includes(k)) { reputation -= 3; righteousness -= 10; }
  });
  return { reputation, righteousness };
}

function extractMartialArtsProgress(text: string) {
  const source = cleanAIText(text);
  const arts = ['剑法', '刀法', '拳法', '掌法', '轻功', '身法', '内功', '心法'];
  const found = arts.find((a) => source.includes(a));
  if (!found) return undefined;
  if (/(领悟|精进|掌握|突破|登堂入室|炉火纯青|运转更顺|略有进境)/.test(source)) return { skill: found, progress: 10 };
  return undefined;
}

function extractRealmChange(text: string) {
  const source = cleanAIText(text);
  const realms: Record<string, number> = { 凡人: 0, 锻体: 1, 感气: 2, 通脉: 3, 凝气: 4, 筑基: 5, 金丹: 6, 元婴: 7 };
  for (const [realm, level] of Object.entries(realms)) {
    if (new RegExp(`(突破|晋升|踏入|迈入).{0,4}${realm}`).test(source)) return { newRealm: realm, level };
  }
  return undefined;
}

// === AI↔子系统整合：新增提取函数 ===

function extractFactionReputationChanges(text: string): { faction: string; delta: number }[] {
  const source = cleanAIText(text);
  const results: { faction: string; delta: number }[] = [];
  const factionNames = ['武当', '少林', '魔教', '丐帮', '官府', '黑风寨', '峨眉', '华山', '嵩山', '唐门', '逍遥'];
  factionNames.forEach((faction) => {
    const increaseRe = new RegExp(`${faction}[派帮教]?(?:(?:声望|好感|印象|名望|关系).{0,6}(?:提升|增加|大涨|大增|上升|好转))`, 'g');
    const decreaseRe = new RegExp(`${faction}[派帮教]?(?:(?:声望|好感|印象|名望|关系).{0,6}(?:下降|降低|大跌|大减|恶化|变差))`, 'g');
    const matchInc = source.match(increaseRe);
    const matchDec = source.match(decreaseRe);
    if (matchInc) results.push({ faction, delta: (matchInc.length >= 2 ? 15 : 8) });
    if (matchDec) results.push({ faction, delta: (matchDec.length >= 2 ? -15 : -8) });
  });
  return results;
}

function extractRecipeDiscoveries(text: string): string[] {
  const source = cleanAIText(text);
  const results: string[] = [];
  const recipeNames = ['淬火', '回春丹', '金疮药', '迷魂香', '毒针', '铁甲', '飞镖', '火药', '补气丹', '筑基丹', '刀剑', '暗器', '丹药'];
  recipeNames.forEach((name) => {
    if (new RegExp(`(领悟|学会|掌握|发现|习得|解锁|知晓).{0,6}${name}(?:之法|的配方|的制作|炼制之法)?`).test(source)) {
      results.push(name);
    }
  });
  const genericMatch = source.match(/(领悟|学会|掌握|发现|习得|解锁|知晓).{0,3}(?:了?锻造|了?炼|了?制|了?配方)/g);
  if (genericMatch && genericMatch.length) {
    const uniqueGeneric = genericMatch.map(m => m.replace(/[了之的法炼制锻造]/g, '').trim().slice(0, 12));
    uniqueGeneric.forEach(u => { if (u && !results.includes(u)) results.push(u); });
  }
  return results;
}

function extractBuffDebuffChanges(text: string): { buffs: Partial<Buff>[]; debuffs: Partial<Debuff>[] } {
  const source = cleanAIText(text);
  const buffs: Partial<Buff>[] = [];
  const debuffs: Partial<Debuff>[] = [];

  const buffPatterns: { re: RegExp; name: string; effect: { stat: string; value: number }; defaultDuration: number }[] = [
    { re: /(真气护体|内息运转|药力发作|行气加速|气血翻涌|内力澎湃|身轻如燕|心如止水)/, name: '', effect: { stat: 'health', value: 3 }, defaultDuration: 60 },
    { re: /(服下.{0,4}丹药)/, name: '药力发作', effect: { stat: 'health', value: 5 }, defaultDuration: 30 },
  ];
  buffPatterns.forEach((p) => {
    const m = source.match(p.re);
    if (m) {
      buffs.push({
        id: `buff_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: p.name || m[0],
        description: `${m[0]}效果持续中`,
        effects: [{ stat: p.effect.stat as StatKey, value: p.effect.value, duration: p.defaultDuration }],
        duration: p.defaultDuration,
        startTime: Date.now(),
        source: 'AI剧情',
      });
    }
  });

  const debuffPatterns: { re: RegExp; name: string; stat: string; value: number; defaultDuration: number }[] = [
    { re: /(中毒|毒发|毒素|剧毒)/, name: '中毒', stat: 'health', value: -5, defaultDuration: 120 },
    { re: /(内伤|寒气入体|经脉受损|气血逆行|丹田紊乱)/, name: '内伤', stat: 'health', value: -8, defaultDuration: 180 },
    { re: /(疲劳过度|筋疲力尽|体力透支)/, name: '力竭', stat: 'stamina', value: -5, defaultDuration: 60 },
  ];
  debuffPatterns.forEach((p) => {
    const m = source.match(p.re);
    if (m) {
      debuffs.push({
        id: `debuff_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: p.name,
        description: `${m[0]}缠身`,
        effects: [{ stat: p.stat as StatKey, value: p.value, duration: p.defaultDuration }],
        duration: p.defaultDuration,
        startTime: Date.now(),
        source: 'AI剧情',
      });
    }
  });

  return { buffs, debuffs };
}

function extractInjuryChanges(text: string): (Partial<Injury> & { healed?: boolean })[] {
  const source = cleanAIText(text);
  const results: (Partial<Injury> & { healed?: boolean })[] = [];

  const injuryNewRe = /(?:受了|中了|挨了|遭到|被.{0,6}砍伤|被.{0,6}刺中|被.{0,6}打伤)(.{2,8}(?:伤|创|裂|折|断))/;
  const mNew = source.match(injuryNewRe);
  if (mNew) {
    const bodyPartMap: Record<string, string> = { 左臂: '左臂', 右臂: '右臂', 左腿: '左腿', 右腿: '右腿', 胸口: '胸口', 腹部: '腹部', 头部: '头部', 肩部: '肩部', 手腕: '手腕', 脚踝: '脚踝', 后背: '后背' };
    let bodyPart = '未知';
    for (const [k, v] of Object.entries(bodyPartMap)) { if (source.includes(k)) { bodyPart = v; break; } }
    const severityMatch = source.match(/(?:重伤|严重|轻微|皮肉|深可见骨|血流如注)/);
    const severity = severityMatch ? (severityMatch[0].includes('重伤') || severityMatch[0].includes('深可见骨') || severityMatch[0].includes('血流如注') ? 4 : severityMatch[0].includes('轻微') || severityMatch[0].includes('皮肉') ? 1 : 2) : 2;
    results.push({
      id: `inj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: mNew[1],
      bodyPart,
      severity,
      healingProgress: 0,
      effects: [{ stat: 'health', value: -severity * 3 }],
      complicationRisk: severity >= 3 ? 30 : 0,
      needsTreatment: severity >= 2,
      timestamp: Date.now(),
    });
  }

  const healRe = /(?:伤势|伤口|剑伤|刀伤|内伤|外伤)(?:愈合|痊愈|好转|恢复|结痂|痊愈)/;
  if (healRe.test(source)) {
    results.push({ id: '', name: '', healed: true });
  }

  return results;
}

function extractNPCRelationshipChanges(text: string, gameState: GameState): { npcId?: string; npcName?: string; relationDelta?: number; trustDelta?: number; romanceStage?: string; affinity?: number; event?: string }[] {
  const source = cleanAIText(text);
  const results: { npcId?: string; npcName?: string; relationDelta?: number; trustDelta?: number; romanceStage?: string; affinity?: number; event?: string }[] = [];

  const npcNames = gameState.npcs.map(n => n.name);
  npcNames.forEach((npcName) => {
    const escaped = npcName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let relationDelta = 0;
    let trustDelta = 0;
    let affinity = 0;

    if (new RegExp(`${escaped}.{0,8}(好感|关系).{0,6}(提升|增加|加深|上升|好转|改善)`).test(source)) relationDelta += 5;
    if (new RegExp(`${escaped}.{0,8}(好感|关系).{0,6}(下降|降低|变差|恶化|疏远)`).test(source)) relationDelta -= 5;
    if (new RegExp(`${escaped}.{0,8}(信任).{0,6}(提升|增加|加深|上升)`).test(source)) trustDelta += 5;
    if (new RegExp(`${escaped}.{0,8}(信任).{0,6}(下降|降低|变差)`).test(source)) trustDelta -= 5;
    if (new RegExp(`${escaped}.{0,8}(好感大增|情愫|心动|一见钟情|倾心|暗生).{0,4}`).test(source)) { relationDelta += 10; affinity += 10; }

    if (relationDelta !== 0 || trustDelta !== 0 || affinity !== 0) {
      const npc = gameState.npcs.find(n => n.name === npcName);
      results.push({
        npcId: npc?.id,
        npcName,
        relationDelta: relationDelta || undefined,
        trustDelta: trustDelta || undefined,
        affinity: affinity || undefined,
        event: source.slice(0, 60),
      });
    }
  });

  return results;
}

function extractEconomyChanges(text: string): { marketIndex?: number; taxRate?: number; resourceScarcity?: number } | undefined {
  const source = cleanAIText(text);
  const changes: { marketIndex?: number; taxRate?: number; resourceScarcity?: number } = {};

  if (/(物价|米价|粮价|物价飞涨|通膨|涨价|价格.{0,4}(涨|升|高))/.test(source)) { changes.marketIndex = 115; }
  else if (/(物价下跌|物价回落|降价|通缩|价格.{0,4}(跌|降|低))/.test(source)) { changes.marketIndex = 85; }

  if (/(税率|赋税|苛税|税.{0,4}(涨|升|加|增))/.test(source)) { changes.taxRate = 12; }
  else if (/(减税|免税|税.{0,4}(降|减))/.test(source)) { changes.taxRate = 3; }

  if (/(物资短缺|供不应求|短缺|稀缺|断货|缺粮|荒)/.test(source)) { changes.resourceScarcity = 75; }
  else if (/(物资丰富|供应充足|丰收|丰裕|充沛)/.test(source)) { changes.resourceScarcity = 25; }

  return Object.keys(changes).length ? changes : undefined;
}

function extractBodyConditionChanges(text: string): { temperature?: number; fatigue?: number } | undefined {
  const source = cleanAIText(text);
  const changes: { temperature?: number; fatigue?: number } = {};

  if (/(体温升高|发热|发烧|中暑|酷热|炙热|灼热)/.test(source)) { changes.temperature = 38; }
  else if (/(体温降低|发冷|受寒|寒意|冻僵|寒冷刺骨)/.test(source)) { changes.temperature = 35; }

  if (/(疲惫|倦意|困倦|昏昏欲睡|疲劳|劳顿)/.test(source)) { changes.fatigue = 70; }

  return Object.keys(changes).length ? changes : undefined;
}

export function smartParseAIResponse(
  rawText: string,
  gameState: GameState
): AIResponse & {
  reputationChange: number;
  righteousnessChange: number;
  silverChange: number;
  copperChange: number;
  martialArtsProgress?: { skill: string; progress: number };
  realmChange?: { newRealm: string; level: number };
  factionReputationChanges: { faction: string; delta: number }[];
  recipeDiscoveries: string[];
  buffAdditions: Partial<Buff>[];
  debuffAdditions: Partial<Debuff>[];
  injuryChanges: (Partial<Injury> & { healed?: boolean })[];
  npcRelationshipChanges: { npcId?: string; npcName?: string; relationDelta?: number; trustDelta?: number; romanceStage?: string; affinity?: number; event?: string }[];
  economyChanges?: { marketIndex?: number; taxRate?: number; resourceScarcity?: number };
  bodyConditionChanges?: { temperature?: number; fatigue?: number };
} {
  const { storyText, jsonData: rawJsonData } = deepExtractStoryText(rawText);
  const jsonData = rawJsonData as Record<string, unknown> | null;
  const dialogue = extractDialogueFromJson(jsonData);
  const cleanedStory = stripDialogueDuplication(storyText, dialogue);

  const jsonItems = Array.isArray(jsonData?.new_items)
    ? (jsonData.new_items as Array<Record<string, unknown>>)
        .filter((i) => i?.name && typeof i.name === 'string' && isValidItemName(i.name as string))
        .map((i) => {
          const itemName = (i.name as string);
          const itemType = (i.type as string) || getItemType(itemName);
          return {
            ...i,
            name: normalizeCandidateName(itemName),
            type: itemType,
            description: (i.description as string) || getItemDescription(itemName, itemType),
          };
        })
    : [];

  const parsedItems = extractItems(cleanedStory, gameState.player.inventory).map((i) => ({
    id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ...i,
  }));

  const dedupItemMap = new Map<string, Record<string, unknown>>();
  [...jsonItems, ...parsedItems].forEach((item) => {
    const rawName = (item.name as string) || '';
    const name = normalizeCandidateName(rawName);
    if (!isValidItemName(name)) return;
    if (!dedupItemMap.has(name)) {
      const itemType = (item.type as string) || getItemType(name);
      dedupItemMap.set(name, { ...item, name, type: itemType, description: (item.description as string) || getItemDescription(name, itemType) });
    }
  });

  const jsonStatChanges = typeof jsonData?.player_stat_changes === 'object' && jsonData?.player_stat_changes
    ? jsonData.player_stat_changes
    : {};

  const playerStatChanges = {
    ...extractStatChanges(cleanedStory),
    ...jsonStatChanges,
  };

  const npcUpdates = [
    ...(Array.isArray(jsonData?.npc_updates) ? jsonData.npc_updates : []),
    ...extractNPCUpdates(cleanedStory, gameState.npcs),
  ];

  const { reputation, righteousness } = extractReputationChanges(cleanedStory);
  const { silver, copper } = extractMoneyChanges(cleanedStory);

  // 合并 JSON 声明的 removed_items 和从文本中提取的消耗物品
  const jsonRemoved: string[] = Array.isArray(jsonData?.removed_items) ? (jsonData.removed_items as string[]) : [];
  const textRemoved = extractRemovedItems(cleanedStory, gameState.player.inventory);
  const mergedRemoved = [...new Set([...jsonRemoved, ...textRemoved])];

  // 对 jsonData 动态属性做安全定型（AI JSON 解析器天然处理未知结构）
  const jd = jsonData as Record<string, unknown> | null;

  return {
    story_text: cleanedStory || '（AI未返回有效故事文本）',
    dialogue,
    time_passed_minutes: typeof jd?.time_passed_minutes === 'number' ? (jd.time_passed_minutes as number) : extractTimeChange(cleanedStory),
    location_change: (typeof jd?.location_change === 'string' ? jd.location_change as string : undefined) || extractLocationChange(cleanedStory, gameState),
    weather_change: ((typeof jd?.weather_change === 'string' ? jd.weather_change : undefined) || extractWeatherChange(cleanedStory) || undefined) as WeatherType | null | undefined,
    new_items: Array.from(dedupItemMap.values()),
    removed_items: mergedRemoved,
    npc_updates: npcUpdates,
    new_npcs: Array.isArray(jd?.new_npcs) ? (jd.new_npcs as AIResponse['new_npcs']) : [],
    player_stat_changes: playerStatChanges,
    discoveries: Array.isArray(jd?.discoveries) ? (jd.discoveries as string[]) : [],
    choices: Array.isArray(jd?.choices) ? (jd.choices as AIResponse['choices']) : [],
    world_state_changes: typeof jd?.world_state_changes === 'object' ? (jd.world_state_changes as Partial<WorldState>) : undefined,
    flags: typeof jd?.flags === 'object' ? (jd.flags as Record<string, string | number | boolean>) : undefined,
    reputationChange: typeof jd?.reputation_change === 'number' ? (jd.reputation_change as number) : reputation,
    righteousnessChange: typeof jd?.righteousness_change === 'number' ? (jd.righteousness_change as number) : righteousness,
    silverChange: (() => {
      const mc = jd?.money_change as Record<string, unknown> | undefined;
      return typeof mc?.silver === 'number' ? (mc.silver as number) : silver;
    })(),
    copperChange: (() => {
      const mc = jd?.money_change as Record<string, unknown> | undefined;
      return typeof mc?.copper === 'number' ? (mc.copper as number) : copper;
    })(),
    martialArtsProgress: (typeof jd?.martial_progress === 'object' && jd.martial_progress ? jd.martial_progress as { skill: string; progress: number } : undefined) || extractMartialArtsProgress(cleanedStory),
    realmChange: (typeof jd?.realm_breakthrough === 'object' && jd.realm_breakthrough ? jd.realm_breakthrough as { newRealm: string; level: number } : undefined) || extractRealmChange(cleanedStory),
    factionReputationChanges: (() => {
      const jsonFaction = Array.isArray(jd?.faction_reputation_changes) ? (jd.faction_reputation_changes as Array<{ faction: string; delta: number }>) : [];
      const textFaction = extractFactionReputationChanges(cleanedStory);
      const merged = new Map<string, number>();
      [...jsonFaction, ...textFaction].forEach((f) => {
        merged.set(f.faction, (merged.get(f.faction) || 0) + f.delta);
      });
      return Array.from(merged.entries()).map(([faction, delta]) => ({ faction, delta }));
    })(),
    recipeDiscoveries: (() => {
      const jsonRecipes: string[] = Array.isArray(jd?.recipe_discoveries) ? (jd.recipe_discoveries as string[]) : [];
      const textRecipes = extractRecipeDiscoveries(cleanedStory);
      return [...new Set([...jsonRecipes, ...textRecipes])];
    })(),
    buffAdditions: (() => {
      const jsonBuffs = Array.isArray(jd?.buff_additions) ? (jd.buff_additions as Partial<Buff>[]) : [];
      const { buffs: textBuffs } = extractBuffDebuffChanges(cleanedStory);
      return [...jsonBuffs, ...textBuffs];
    })(),
    debuffAdditions: (() => {
      const jsonDebuffs = Array.isArray(jd?.debuff_additions) ? (jd.debuff_additions as Partial<Debuff>[]) : [];
      const { debuffs: textDebuffs } = extractBuffDebuffChanges(cleanedStory);
      return [...jsonDebuffs, ...textDebuffs];
    })(),
    injuryChanges: (() => {
      const jsonInjuries = Array.isArray(jd?.injury_changes) ? (jd.injury_changes as (Partial<Injury> & { healed?: boolean })[]) : [];
      const textInjuries = extractInjuryChanges(cleanedStory);
      return [...jsonInjuries, ...textInjuries];
    })(),
    npcRelationshipChanges: (() => {
      const jsonRels = Array.isArray(jd?.npc_relationship_changes) ? (jd.npc_relationship_changes as Array<Record<string, unknown>>) : [];
      const textRels = extractNPCRelationshipChanges(cleanedStory, gameState);
      const merged = new Map<string, Record<string, unknown>>();
      [...jsonRels, ...textRels].forEach((r) => {
        const key = (r.npcId as string) || (r.npcName as string) || 'unknown';
        const prev = merged.get(key);
        if (prev) {
          merged.set(key, {
            ...prev,
            relationDelta: ((prev.relationDelta as number) || 0) + ((r.relationDelta as number) || 0),
            trustDelta: ((prev.trustDelta as number) || 0) + ((r.trustDelta as number) || 0),
            affinity: ((prev.affinity as number) || 0) + ((r.affinity as number) || 0),
            romanceStage: r.romanceStage || prev.romanceStage,
          });
        } else {
          merged.set(key, r);
        }
      });
      return Array.from(merged.values());
    })(),
    economyChanges: (() => {
      const jsonEcon = typeof jd?.economy_changes === 'object' ? (jd.economy_changes as Record<string, unknown>) : undefined;
      const textEcon = extractEconomyChanges(cleanedStory);
      if (!jsonEcon && !textEcon) return undefined;
      return { ...textEcon, ...jsonEcon };
    })(),
    bodyConditionChanges: (() => {
      const jsonBody = typeof jd?.body_condition_changes === 'object' ? (jd.body_condition_changes as Record<string, unknown>) : undefined;
      const textBody = extractBodyConditionChanges(cleanedStory);
      if (!jsonBody && !textBody) return undefined;
      return { ...textBody, ...jsonBody };
    })(),
  };
}

export function formatSmartParseResult(result: ReturnType<typeof smartParseAIResponse>): string[] {
  const lines: string[] = [];

  if (result.new_items?.length) {
    lines.push(`📦 获得: ${result.new_items.map((i) => `${i.name}${(i.quantity || 1) > 1 ? `×${i.quantity}` : ''}`).join('、')}`);
  }
  if (result.time_passed_minutes && result.time_passed_minutes > 0) {
    const hours = Math.floor(result.time_passed_minutes / 60);
    const mins = result.time_passed_minutes % 60;
    lines.push(`⏰ 时间: ${hours > 0 ? `${hours}时辰` : ''}${mins > 0 ? `${mins}分` : ''}`);
  }
  if (result.location_change) lines.push(`📍 去向: ${result.location_change}`);
  if (result.weather_change) lines.push(`🌤️ 天气: ${result.weather_change}`);
  if (result.silverChange || result.copperChange) {
    const money = [];
    if (result.silverChange) money.push(`${result.silverChange > 0 ? '+' : ''}${result.silverChange}两`);
    if (result.copperChange) money.push(`${result.copperChange > 0 ? '+' : ''}${result.copperChange}文`);
    lines.push(`💰 盘缠变动: ${money.join(' ')}`);
  }
  if (result.reputationChange) lines.push(`⭐ 名望: ${result.reputationChange > 0 ? '+' : ''}${result.reputationChange}`);
  if (result.righteousnessChange) lines.push(`⚖️ 侠义: ${result.righteousnessChange > 0 ? '+' : ''}${result.righteousnessChange}`);
  if (result.martialArtsProgress) lines.push(`🥋 武学: ${result.martialArtsProgress.skill} +${result.martialArtsProgress.progress}`);
  if (result.realmChange) lines.push(`🌟 境界: ${result.realmChange.newRealm}`);

  const statNames: Record<string, string> = {
    health: '气血', hunger: '饱腹', thirst: '口渴', energy: '精力', sanity: '心境', infection: '中毒', stamina: '体力'
  };
  const statLines = Object.entries(result.player_stat_changes || {})
    .filter(([, v]) => typeof v === 'number' && v !== 0)
    .map(([k, v]) => `${statNames[k] || k}${(v as number) > 0 ? '+' : ''}${v}`);
  if (statLines.length) lines.push(`📊 状态: ${statLines.join(' ')}`);

  return lines;
}

export function inferLocationBlueprint(name: string) {
  return {
    type: inferNewLocationType(name),
    dangerLevel: /谷|崖|峡|林|墓|寨/.test(name) ? 45 : /镇|集|街|驿/.test(name) ? 18 : 28,
    hasWater: /渡|河|井|湖|泉/.test(name),
    lightLevel: /洞|窟|地宫|地下/.test(name) ? 20 : 60,
    noiseLevel: /集|街|镇|驿/.test(name) ? 25 : 10,
  };
}
