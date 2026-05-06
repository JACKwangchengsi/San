// 智能文本解析器 - 自动识别剧情中的物品、NPC、时间变化等
import { AutoParseResult, ItemType, NPCStatus, StatKey } from '../types/game';

// 预清洗：去除JSON残片、字段标签、对话结构
const sanitizeNarrativeText = (raw: string) => {
  if (!raw) return '';
  return raw
    .replace(/```json|```/gi, '')
    .replace(/"?(story_text|story|txt|content|message|reply)"?\s*[:：]\s*/gi, '')
    .replace(/"?(choices|dialogue|new_items|removed_items|npc_updates|new_npcs|time_passed_minutes|player_stat_changes|world_state_changes|discoveries|consequence_hint|location_change|weather_change)"?\s*[:：][\s\S]*$/gi, '')
    .replace(/"?speaker"?\s*:\s*"[^"]*"?/gi, '')
    .replace(/"?text"?\s*:\s*"[^"]*"?/gi, '')
    .replace(/"?mood"?\s*:\s*"[^"]*"?/gi, '')
    .replace(/"?id"?\s*:\s*"[^"]*"?/gi, '')
    .replace(/\}\s*,\s*"?[a-z_]+"?\s*:\s*/gi, '')
    .replace(/[\[\]{}]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

// 尝试从JSON响应中提取story_text，保证与AI提示词一致
const normalizeInputText = (raw: string) => {
  if (!raw) return '';
  const trimmed = raw.replace(/```json|```/gi, '').trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    const candidate = trimmed.slice(start, end + 1);
    try {
      const data = JSON.parse(candidate) as Record<string, any>;
      const story = data.story_text || data.story || data.txt || data.content || data.message || data.reply;
      if (typeof story === 'string' && story.trim()) {
        return story.trim();
      }
    } catch {
      // fallthrough to raw
    }
  }
  return raw;
};

// 物品关键词映射
const ITEM_KEYWORDS: Record<string, { type: ItemType; keywords: string[] }> = {
  food: {
    type: 'food',
    keywords: ['食物', '面包', '饼干', '零食', '泡面', '方便面', '罐头', '饭', '肉', '水果', '苹果', '香蕉', '蔬菜', '巧克力', '糖果', '点心', '蛋糕', '三明治', '汉堡', '披萨', '寿司']
  },
  drink: {
    type: 'drink',
    keywords: ['水', '饮料', '矿泉水', '可乐', '茶', '咖啡', '牛奶', '果汁', '啤酒', '饮品', '汽水', '功能饮料', '瓶装水']
  },
  weapon: {
    type: 'weapon',
    keywords: ['刀', '棍', '棒', '枪', '武器', '锤子', '斧头', '铁管', '铁棒', '匕首', '剑', '弓', '弩', '手枪', '步枪', '砍刀', '菜刀', '水果刀', '工兵铲', '球棒', '撬棍', '扳手', '螺丝刀']
  },
  medicine: {
    type: 'medicine',
    keywords: ['药', '绷带', '纱布', '急救包', '医疗包', '消毒', '止痛药', '抗生素', '创可贴', '酒精', '碘伏', '药品', '药物', '胶囊', '药片', '注射器', '针筒']
  },
  tool: {
    type: 'tool',
    keywords: ['工具', '手电筒', '手电', '打火机', '火柴', '绳子', '胶带', '剪刀', '钳子', '锁', '钥匙', '指南针', '望远镜', '对讲机', '收音机', '地图', '开罐器', '万能钥匙']
  },
  device: {
    type: 'device',
    keywords: ['手机', '电话', '电脑', '平板', '充电宝', '电池', '耳机', '相机', '摄像头', '监控', 'GPS', '定位器', '对讲机', '收音机']
  },
  clothing: {
    type: 'clothing',
    keywords: ['衣服', '外套', '裤子', '鞋子', '帽子', '手套', '口罩', '防护服', '雨衣', '背心', '头盔', '护目镜', '夹克', '毛衣']
  },
  material: {
    type: 'material',
    keywords: ['木板', '铁块', '螺丝', '钉子', '零件', '材料', '布料', '皮革', '塑料', '金属', '电线', '管道']
  },
  container: {
    type: 'container',
    keywords: ['背包', '书包', '袋子', '箱子', '盒子', '容器', '包裹', '行李', '手提箱', '收纳箱']
  },
  document: {
    type: 'document',
    keywords: ['文件', '文档', '笔记', '日记', '信', '纸条', '便条', '证件', '身份证', '学生证', '通行证', '地图', '说明书']
  }
};

const ITEM_STOPWORDS = [
  '伤', '伤口', '撕裂', '擦伤', '咬伤', '割伤', '骨折', '出血', '疼痛', '痛感', '眩晕', '恶心', '恐惧', '害怕',
  '风险', '信息', '提示', '情况', '氛围', '地方', '区域', '位置', '走廊', '宿舍', '教室', '操场', '大门',
  '安全', '危险', '声音', '脚步', '尖叫', '动静', '影子', '目光', '人影', '可能', '选择', '后果',
  '伤势', '感染', '病情', '状态', '对话', '情绪',
  '手机', '电脑', '电池', '充电', '网络', '对讲机', '枪', '子弹', '手枪', '步枪', '摄像', '屏幕'
];

const ITEM_STOP_SUFFIX = /(伤|伤口|撕裂|擦伤|咬伤|割伤|骨折|疼痛|风险|信息|提示|情况|氛围|地方|区域|位置|动作|选择|后果|手机|电脑|电池|充电|网络|对讲机|枪|子弹)$/;

const ITEM_STOP_REGEX = /^(?:手掌|胳膊|手臂|腿|脚|胸口|腹部|背部|脸|头部)(?:伤|伤口|撕裂|擦伤|咬伤|割伤)$/;

// 时间关键词
const TIME_KEYWORDS = {
  instant: { keywords: ['瞬间', '立刻', '马上', '立即', '刹那'], minutes: 1 },
  veryShort: { keywords: ['几秒', '片刻', '一会儿', '须臾'], minutes: 2 },
  short: { keywords: ['几分钟', '一小会', '不久', '很快'], minutes: 5 },
  medium: { keywords: ['一阵', '许久', '好一会', '半天'], minutes: 15 },
  long: { keywords: ['很久', '长时间', '大半天', '几个小时'], minutes: 60 },
  halfHour: { keywords: ['半小时', '三十分钟', '半个小时'], minutes: 30 },
  oneHour: { keywords: ['一小时', '一个小时', '60分钟'], minutes: 60 },
  twoHours: { keywords: ['两小时', '两个小时', '2小时'], minutes: 120 },
  night: { keywords: ['一夜', '整晚', '彻夜', '通宵'], minutes: 480 },
  day: { keywords: ['一天', '一整天', '整日', '白天'], minutes: 720 }
};

// 状态变化关键词
const STAT_KEYWORDS = {
  health: {
    positive: ['恢复', '治愈', '好转', '康复', '痊愈', '舒服'],
    negative: ['受伤', '疼痛', '流血', '伤害', '损伤', '虚弱', '被打', '被咬', '被抓']
  },
  hunger: {
    positive: ['吃', '进食', '饱', '饭', '食物'],
    negative: ['饿', '饥饿', '空腹', '没吃']
  },
  thirst: {
    positive: ['喝', '饮', '解渴', '水'],
    negative: ['渴', '口干', '脱水']
  },
  energy: {
    positive: ['休息', '睡眠', '恢复精力', '精神', '振作'],
    negative: ['疲惫', '疲劳', '累', '精疲力竭', '困倦', '筋疲力尽', '虚脱']
  },
  sanity: {
    positive: ['冷静', '镇定', '放松', '安心', '平静'],
    negative: ['恐惧', '害怕', '惊恐', '疯狂', '崩溃', '绝望', '恶心', '呕吐']
  }
};

// NPC状态关键词
const NPC_STATUS_KEYWORDS = {
  dead: ['死', '死亡', '尸体', '倒下', '没了', '牺牲', '阵亡', '遇难'],
  corrupted: ['入魔', '魔化', '被魔气侵蚀', '心魔发作', '走火', '发狂'],
  unconscious: ['昏迷', '晕倒', '失去意识', '昏厥', '不省人事'],
  missing: ['失踪', '消失', '不见', '找不到', '离开']
};

// 危险等级关键词
const DANGER_KEYWORDS = {
  safe: ['安全', '平静', '正常', '没事'],
  low: ['警觉', '小心', '注意'],
  medium: ['危险', '紧张', '有风险'],
  high: ['极度危险', '凶险', '致命', '必死'],
  combat: ['战斗', '攻击', '厮杀', '搏斗', '打斗']
};

// 情绪关键词
const MOOD_KEYWORDS = {
  calm: ['平静', '冷静', '镇定', '从容'],
  happy: ['开心', '高兴', '快乐', '愉快', '欣喜'],
  sad: ['难过', '悲伤', '伤心', '哭', '哀伤'],
  angry: ['愤怒', '生气', '恼火', '暴怒'],
  scared: ['害怕', '恐惧', '惊恐', '惶恐', '胆怯'],
  nervous: ['紧张', '焦虑', '不安', '慌张'],
  hopeful: ['希望', '期待', '憧憬'],
  desperate: ['绝望', '无望', '心灰意冷']
};

// 提取物品
function extractItems(text: string): AutoParseResult['items'] {
  const items: AutoParseResult['items'] = [];
  const foundItems = new Set<string>();
  const stopWords = ['地方', '那里', '这里', '安全', '安全的', '安全地方', '安全区域', '一片', '一处', '什么', '事情', '动静', '声音', '尸体', '人影', '风险', '可能', '危险', '信息', '提示', '动作', '场景', '对话', '情绪', '氛围', '影子', '脚步', '惨叫', '低语', '后果', '建议', '选择', '提示词', '手机', '电脑', '电池', '充电', '网络', '对讲机', '枪', '子弹'];
  const cleanedText = sanitizeNarrativeText(text);
  const negativeContext = /(不是|并非|没有|无|缺少|缺乏).{0,6}(水|食物|药|武器|工具|钥匙|物资)/;

  const isValidItemName = (name: string) => {
    if (name.length < 2 || name.length > 10) return false;
    if (stopWords.some(w => name.includes(w))) return false;
    if (ITEM_STOPWORDS.some(w => name.includes(w))) return false;
    if (ITEM_STOP_SUFFIX.test(name)) return false;
    if (ITEM_STOP_REGEX.test(name)) return false;
    if (/^[\d一二三四五六七八九十]+$/.test(name)) return false;
    if (/(的|地|得|风险|信息|提示|选择|后果|情况)$/.test(name)) return false;
    if (/(走廊|宿舍|教室|操场|学校|楼梯|门口|角落|区域|地点|位置)$/.test(name)) return false;
    if (/^[a-zA-Z_]+$/.test(name)) return false;
    return true;
  };

  // 物品获取模式
  const itemPatterns = [
    /(?:找到|发现|获得|拿到|捡到|得到|拾起|取得|收获)了?(?:一[个只把件块瓶包袋盒])?([^\s,，。！？]+)/g,
    /([^\s,，。！？]+)(?:被|给)(?:找到|发现)/g,
    /(?:背包|口袋|手中|手里)(?:多了|有了)([^\s,，。！？]+)/g
  ];

  for (const pattern of itemPatterns) {
    let match;
    while ((match = pattern.exec(cleanedText)) !== null) {
      const itemName = match[1].trim();
      if (!isValidItemName(itemName) || foundItems.has(itemName)) continue;
      if (negativeContext.test(cleanedText) && /(水|食物|药|武器|工具|钥匙|物资)/.test(itemName)) continue;
      if (ITEM_STOP_SUFFIX.test(itemName) || ITEM_STOP_REGEX.test(itemName)) continue;

      // 确定物品类型
      let itemType: ItemType = 'misc';
      for (const [, config] of Object.entries(ITEM_KEYWORDS)) {
        if (config.keywords.some(kw => itemName.includes(kw))) {
          itemType = config.type;
          break;
        }
      }

      // 过滤掉无类型且疑似非物品的词
      if (itemType === 'misc' && !ITEM_KEYWORDS.misc?.keywords?.some(kw => itemName.includes(kw))) {
        const commonNonItems = ['地方', '房间', '走廊', '楼梯', '操场', '门口', '学校', '风险', '伤', '伤口', '感染'];
        if (commonNonItems.some(w => itemName.includes(w))) continue;
      }
      
      // 提取数量
      let quantity = 1;
      const qtyMatch = text.match(new RegExp(`([一二三四五六七八九十\\d]+)[个只把件块瓶包袋盒]?${itemName}`));
      if (qtyMatch) {
        const qtyStr = qtyMatch[1];
        quantity = parseChineseNumber(qtyStr);
      }

      items.push({
        name: itemName,
        type: itemType,
        description: `从场景中发现的${itemName}`,
        quantity
      });
      foundItems.add(itemName);
    }
  }

  // 直接检查物品关键词
  for (const [, config] of Object.entries(ITEM_KEYWORDS)) {
    for (const keyword of config.keywords) {
      if (cleanedText.includes(keyword) && !foundItems.has(keyword)) {
        // 检查是否在获取语境中
        const contextPatterns = [
          new RegExp(`(?:找到|发现|获得|拿|捡|取)[^。]*${keyword}`),
          new RegExp(`${keyword}[^。]*(?:放入|装进|塞进|收起)`)
        ];
        
        if (contextPatterns.some(p => p.test(cleanedText))) {
          items.push({
            name: keyword,
            type: config.type,
            description: `发现的${keyword}`,
            quantity: 1
          });
          foundItems.add(keyword);
        }
      }
    }
  }

  return items;
}

// 提取时间变化
function extractTimeChange(text: string): number {
  let maxTime = 0;

  for (const [, config] of Object.entries(TIME_KEYWORDS)) {
    if (config.keywords.some(kw => text.includes(kw))) {
      maxTime = Math.max(maxTime, config.minutes);
    }
  }

  // 提取具体数字时间
  const timePatterns = [
    /(\d+)\s*分钟/,
    /(\d+)\s*小时/,
    /过了\s*(\d+)\s*分/,
    /过了\s*(\d+)\s*个?小时/
  ];

  for (const pattern of timePatterns) {
    const match = text.match(pattern);
    if (match) {
      const num = parseInt(match[1]);
      if (pattern.source.includes('小时')) {
        maxTime = Math.max(maxTime, num * 60);
      } else {
        maxTime = Math.max(maxTime, num);
      }
    }
  }

  return maxTime || 5; // 默认5分钟
}

// 提取状态变化
function extractStatChanges(text: string): Partial<Record<StatKey, number>> {
  const changes: Partial<Record<StatKey, number>> = {};

  for (const [stat, keywords] of Object.entries(STAT_KEYWORDS)) {
    // 检查正面影响
    const positiveCount = keywords.positive.filter(kw => text.includes(kw)).length;
    // 检查负面影响
    const negativeCount = keywords.negative.filter(kw => text.includes(kw)).length;

    if (positiveCount > 0 || negativeCount > 0) {
      let value = 0;
      if (positiveCount > 0) value += positiveCount * 10;
      if (negativeCount > 0) value -= negativeCount * 10;
      changes[stat as StatKey] = value;
    }
  }

  return changes;
}

// 提取NPC信息
function extractNPCs(text: string): AutoParseResult['npcs'] {
  const npcs: AutoParseResult['npcs'] = [];
  
  // 检查NPC状态变化
  for (const [status, keywords] of Object.entries(NPC_STATUS_KEYWORDS)) {
    for (const keyword of keywords) {
      // 查找谁受到了影响
      const patterns = [
        new RegExp(`([\\u4e00-\\u9fa5]{2,4})(?:已经|已|被)?${keyword}`),
        new RegExp(`${keyword}的([\\u4e00-\\u9fa5]{2,4})`)
      ];
      
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          const name = match[1];
          if (name && name.length >= 2 && name.length <= 4) {
            npcs.push({
              name,
              description: '',
              status: status as NPCStatus,
              relation: 0
            });
          }
        }
      }
    }
  }

  // 新增：识别“对话/说话人”中的NPC名字
  const dialogueNameMatches = text.match(/([\u4e00-\u9fa5]{2,4})(?:说|喊|低声说|嘟囔|叫道|回答)/g) || [];
  dialogueNameMatches.forEach(m => {
    const name = m.replace(/说|喊|低声说|嘟囔|叫道|回答/g, '').trim();
    if (name && name.length >= 2 && name.length <= 4) {
      if (!npcs.find(n => n.name === name)) {
        npcs.push({ name, description: '', status: 'alive', relation: 0 });
      }
    }
  });

  return npcs;
}

// 提取对话
function extractDialogue(text: string): AutoParseResult['dialogue'] {
  const dialogue: AutoParseResult['dialogue'] = [];
  
  // 匹配对话模式
  const patterns = [
    /([^\s:：]+)[说道喊叫嚷嘟囔低语呢喃][:：]?\s*["「『]([^"」』]+)["」』]/g,
    /["「『]([^"」』]+)["」』]\s*([^\s,，。]+)(?:说|道)/g,
    /([^\s:：]{2,6})[:：]\s*["「『]([^"」』]+)["」』]/g,
    /([\u4e00-\u9fa5]{2,4})\s*[:：]\s*([^\n\r]{2,50})/g
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      let speaker = match[1]?.trim();
      let content = match[2]?.trim();
      
      // 处理顺序可能不同的情况
      if (!speaker || speaker.length > 6) continue;
      if (!content || content.length < 2) continue;
      if (/time_passed_minutes|new_items|npc_updates|player_stat_changes|choices|story_text|txt/i.test(content)) continue;
      
      dialogue.push({ speaker, text: content });
    }
  }

  return dialogue;
}

// 提取情绪
function extractMood(text: string): string {
  for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) {
      return mood;
    }
  }
  return 'neutral';
}

// 提取危险等级
function extractDangerLevel(text: string): number {
  if (DANGER_KEYWORDS.combat.some(kw => text.includes(kw))) return 90;
  if (DANGER_KEYWORDS.high.some(kw => text.includes(kw))) return 80;
  if (DANGER_KEYWORDS.medium.some(kw => text.includes(kw))) return 50;
  if (DANGER_KEYWORDS.low.some(kw => text.includes(kw))) return 30;
  if (DANGER_KEYWORDS.safe.some(kw => text.includes(kw))) return 10;
  return 30; // 默认警觉
}

// 提取关键词
function extractKeywords(text: string): string[] {
  const keywords: string[] = [];
  
  // 提取所有匹配的关键词
  for (const [category, config] of Object.entries(ITEM_KEYWORDS)) {
    const found = config.keywords.filter(kw => text.includes(kw));
    if (found.length > 0) {
      keywords.push(`[${category}]`);
      keywords.push(...found.slice(0, 3));
    }
  }

  // 补充对话/事件关键词
  const eventKeys = ['枪声', '爆炸', '警报', '哭声', '脚步', '求救'];
  eventKeys.forEach(k => { if (text.includes(k)) keywords.push(k); });

  return keywords.slice(0, 12);
}

// 提取位置变化
function extractLocationChange(text: string): string | null {
  const locationPatterns = [
    /(?:来到|走到|进入|到达|抵达|移动到|跑到|逃到|躲到)了?\s*([^\s,，。！？]{2,10})/,
    /(?:在|位于)\s*([^\s,，。！？]{2,10})(?:里|内|中)/
  ];

  const exclude = ['情况', '时候', '地方', '那里', '这里', '目前', '当下'];
  for (const pattern of locationPatterns) {
    const match = text.match(pattern);
    if (match) {
      const loc = match[1];
      if (exclude.some(w => loc.includes(w))) continue;
      return loc;
    }
  }

  return null;
}

// 中文数字转阿拉伯数字
function parseChineseNumber(str: string): number {
  const map: Record<string, number> = {
    '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
    '六': 6, '七': 7, '八': 8, '九': 9, '十': 10
  };
  
  if (/^\d+$/.test(str)) return parseInt(str);
  
  let result = 0;
  for (const char of str) {
    if (map[char]) result += map[char];
  }
  return result || 1;
}

// 提取战斗信息
function extractCombat(text: string): { description: string; damage: number; kills: number } | null {
  const combatKeywords = ['攻击', '打', '砍', '刺', '射击', '战斗', '杀', '击倒', '搏斗'];
  const hasCombat = combatKeywords.some(kw => text.includes(kw));
  
  if (!hasCombat) return null;
  
  let damage = 0;
  let kills = 0;
  
  // 提取伤害
  const damagePatterns = [
    /受到了?(\d+)点?伤害/,
    /损失了?(\d+)点?(?:生命|血)/,
    /被(?:咬|抓|打)(?:伤)?/
  ];
  
  for (const pattern of damagePatterns) {
    const match = text.match(pattern);
    if (match) {
      damage = match[1] ? parseInt(match[1]) : 10;
      break;
    }
  }
  
  // 提取击杀
  const killPatterns = [
    /(?:杀死|击杀|消灭|干掉)了?(\d+)?个?(?:感染者|僵尸|丧尸)/,
    /(\d+)个?(?:感染者|僵尸)(?:倒下|死亡)/
  ];
  
  for (const pattern of killPatterns) {
    const match = text.match(pattern);
    if (match) {
      kills = match[1] ? parseInt(match[1]) : 1;
      break;
    }
  }
  
  return {
    description: text.substring(0, 100),
    damage,
    kills
  };
}

// 提取新发现的NPC详细信息
function extractNewNPCDetails(text: string): { name: string; age?: number; occupation?: string; description?: string }[] {
  const newNPCs: { name: string; age?: number; occupation?: string; description?: string }[] = [];
  
  // 模式：遇到/发现/看到 + 名字
  const patterns = [
    /(?:遇到|发现|看到|出现)了?(?:一个|一位)?([^\s,，。！？的]{2,4})(?:，|,|。|！)?/g,
    /一个?(?:叫|名叫|名为)([^\s,，。！？的]{2,4})的/g,
    /([\u4e00-\u9fa5]{2,4})\s*\((?:\d{1,2})岁\)/g
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const name = match[1].trim();
      // 过滤掉常见的非人名词
      const excludeWords = ['感染者', '僵尸', '丧尸', '怪物', '尸体', '东西', '声音', '地方', '问题', '危险', '安全'];
      if (name.length >= 2 && name.length <= 4 && !excludeWords.some(w => name.includes(w))) {
        newNPCs.push({ name });
      }
    }
  }
  
  return newNPCs;
}

// 提取天气变化
function extractWeatherChange(text: string): string | null {
  const weatherPatterns: Record<string, string[]> = {
    'clear': ['晴朗', '阳光', '晴天', '天晴'],
    'cloudy': ['多云', '阴云', '云层'],
    'overcast': ['阴天', '乌云', '天阴'],
    'rain': ['下雨', '雨天', '雨水', '细雨'],
    'heavy_rain': ['大雨', '暴雨', '倾盆大雨'],
    'thunderstorm': ['雷暴', '打雷', '闪电', '雷雨'],
    'fog': ['雾', '迷雾', '雾气', '浓雾'],
    'snow': ['下雪', '雪花', '小雪'],
    'blizzard': ['暴风雪', '大雪', '雪暴']
  };

  for (const [weather, keywords] of Object.entries(weatherPatterns)) {
    if (keywords.some(kw => text.includes(kw))) {
      return weather;
    }
  }
  return null;
}

// 提取新位置
function extractNewLocations(text: string): { name: string; type: string; description: string }[] {
  const newLocations: { name: string; type: string; description: string }[] = [];
  
  const locationPatterns = [
    /(?:发现|找到|看到)了?(?:一[个间处座])?([^\\s,，。！？]{2,10})(?:的入口|的门)/g,
    /(?:来到|走进|进入)了?(?:一[个间处座])?([^\\s,，。！？]{2,15})/g
  ];

  for (const pattern of locationPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const locName = match[1].trim();
      const excludeWords = ['自己', '他们', '我们', '一个', '这里', '那里'];
      if (locName.length >= 2 && locName.length <= 10 && !excludeWords.some(w => locName.includes(w))) {
        const locType = locName.includes('室') || locName.includes('房') ? 'room' : 
                       locName.includes('楼') ? 'building' : 
                       locName.includes('外') || locName.includes('院') ? 'outdoor' : 'room';
        newLocations.push({
          name: locName,
          type: locType,
          description: `新发现的区域：${locName}`
        });
      }
    }
  }

  return newLocations;
}

// 主解析函数
export function parseStoryText(text: string): AutoParseResult {
  const normalizedInput = normalizeInputText(text);
  const cleanedText = sanitizeNarrativeText(normalizedInput);
  return {
    items: extractItems(cleanedText),
    npcs: extractNPCs(cleanedText),
    timeChange: extractTimeChange(cleanedText),
    locationChange: extractLocationChange(cleanedText),
    statChanges: extractStatChanges(cleanedText),
    events: [],
    dialogue: extractDialogue(cleanedText),
    mood: extractMood(cleanedText),
    dangerLevel: extractDangerLevel(cleanedText),
    keywords: extractKeywords(cleanedText)
  };
}

// 完整解析函数 - 包含所有系统的自动解析
export function parseStoryTextComplete(text: string): AutoParseResult & {
  combat: { description: string; damage: number; kills: number } | null;
  newNPCs: { name: string; age?: number; occupation?: string; description?: string }[];
  weatherChange: string | null;
  newLocations: { name: string; type: string; description: string }[];
  worldEvents: string[];
  wordCount: number;
} {
  const cleaned = sanitizeNarrativeText(text);
  const basic = parseStoryText(cleaned);
  
  // 提取世界事件
  const worldEvents: string[] = [];
  const eventPatterns = [
    /(?:突然|忽然)([^。！？]{10,50})/g,
    /(?:警报|警笛|爆炸|枪声)([^。！？]{5,30})/g,
    /(?:广播|电台|通知|广播里说)([^。！？]{5,40})/g,
    /(?:地面震动|大楼摇晃|天花板震落)([^。！？]{5,40})/g
  ];
  for (const pattern of eventPatterns) {
    let match;
    while ((match = pattern.exec(cleaned)) !== null) {
      worldEvents.push(match[1].trim());
    }
  }

  return {
    ...basic,
    combat: extractCombat(cleaned),
    newNPCs: extractNewNPCDetails(cleaned),
    weatherChange: extractWeatherChange(cleaned),
    newLocations: extractNewLocations(cleaned),
    worldEvents,
    wordCount: cleaned.length
  };
}

// 增强版解析函数 - 返回更多信息
export function parseStoryTextEnhanced(text: string): AutoParseResult & {
  combat: { description: string; damage: number; kills: number } | null;
  newNPCs: { name: string; age?: number; occupation?: string; description?: string }[];
  wordCount: number;
} {
  const basic = parseStoryText(text);
  return {
    ...basic,
    combat: extractCombat(text),
    newNPCs: extractNewNPCDetails(text),
    wordCount: text.length
  };
}

// 格式化解析结果用于显示
export function formatParseResult(result: AutoParseResult): string {
  const lines: string[] = [];

  if (result.items.length > 0) {
    lines.push(`📦 发现物品: ${result.items.map(i => `${i.name}${i.quantity > 1 ? `x${i.quantity}` : ''}`).join(', ')}`);
  } else {
    lines.push(`📦 物品发现: 无`);
  }

  if (result.npcs.length > 0) {
    lines.push(`👥 NPC变化: ${result.npcs.map(n => `${n.name}[${n.status}]`).join(', ')}`);
  }

  if (result.timeChange > 0) {
    lines.push(`⏰ 时间流逝: ${result.timeChange}分钟`);
  }

  if (result.locationChange) {
    lines.push(`📍 位置变化: ${result.locationChange}`);
  }

  if (Object.keys(result.statChanges).length > 0) {
    const changes = Object.entries(result.statChanges)
      .map(([k, v]) => `${k}${v! > 0 ? '+' : ''}${v}`)
      .join(', ');
    lines.push(`📊 状态变化: ${changes}`);
  }

  if (result.dialogue.length > 0) {
    lines.push(`💬 对话: ${result.dialogue.length}条`);
  }

  lines.push(`🎭 情绪: ${result.mood}`);
  lines.push(`⚠️ 危险等级: ${result.dangerLevel}%`);

  return lines.join('\n');
}
