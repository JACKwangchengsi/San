// 真实世界深度模拟系统
import { GameState, NPC, LogEntry, Item, StatKey } from '../types/game';

// ==================== 身体系统 ====================
export interface BodyCondition {
  temperature: number; // 体温 36-42
  bloodLoss: number; // 失血量 0-100
  fatigue: number; // 疲劳累积 0-100
  drunk: number; // 醉酒程度 0-100
  poison: number; // 中毒程度 0-100
}

export const calculateBodyCondition = (state: GameState): BodyCondition => {
  const { stats } = state.player;
  const weather = state.world.weather;
  
  // 基础体温
  let temp = 36.5;
  if (weather.temperature < 5) temp -= (5 - weather.temperature) * 0.1;
  if (weather.temperature > 35) temp += (weather.temperature - 35) * 0.1;
  if (stats.energy.value < 30) temp -= 0.5;
  if (stats.infection.value > 30) temp += stats.infection.value * 0.02;
  
  return {
    temperature: Math.round(temp * 10) / 10,
    bloodLoss: Math.max(0, 100 - stats.health.value),
    fatigue: Math.max(0, 100 - stats.stamina.value),
    drunk: 0,
    poison: stats.infection.value
  };
};

// ==================== 社会关系系统 ====================
export interface SocialRelation {
  npcId: string;
  type: 'stranger' | 'acquaintance' | 'friend' | 'close_friend' | 'enemy' | 'rival' | 'mentor' | 'disciple';
  trust: number;
  favor: number;
  fear: number;
  respect: number;
  history: string[];
}

export const getRelationType = (npc: NPC): SocialRelation['type'] => {
  if (npc.relation < 0) return 'enemy';
  if (npc.relation < 20) return 'stranger';
  if (npc.relation < 40) return 'acquaintance';
  if (npc.relation < 60) return 'friend';
  if (npc.relation < 80) return 'close_friend';
  return 'close_friend';
};

export const getRelationDescription = (type: SocialRelation['type']): string => {
  const descs: Record<SocialRelation['type'], string> = {
    stranger: '素不相识',
    acquaintance: '点头之交',
    friend: '泛泛之交',
    close_friend: '莫逆之交',
    enemy: '势不两立',
    rival: '亦敌亦友',
    mentor: '授业恩师',
    disciple: '门下弟子'
  };
  return descs[type];
};

// ==================== 江湖势力系统 ====================
export interface Faction {
  id: string;
  name: string;
  type: 'sect' | 'gang' | 'official' | 'merchant' | 'bandit';
  influence: number; // 势力范围 0-100
  attitude: 'hostile' | 'unfriendly' | 'neutral' | 'friendly' | 'allied';
  description: string;
  territory: string[];
  rivals: string[];
  allies: string[];
}

export const FACTIONS: Faction[] = [
  {
    id: 'wudang',
    name: '武当派',
    type: 'sect',
    influence: 85,
    attitude: 'neutral',
    description: '道门正宗，以太极剑法闻名天下',
    territory: ['武当山', '襄阳'],
    rivals: ['魔教'],
    allies: ['少林派', '峨眉派']
  },
  {
    id: 'shaolin',
    name: '少林派',
    type: 'sect',
    influence: 90,
    attitude: 'neutral',
    description: '武林泰斗，少林七十二绝技威震四方',
    territory: ['嵩山', '洛阳'],
    rivals: ['魔教'],
    allies: ['武当派']
  },
  {
    id: 'demon_cult',
    name: '魔教',
    type: 'sect',
    influence: 70,
    attitude: 'unfriendly',
    description: '邪道魁首，行事诡异，武功邪门',
    territory: ['黑木崖', '西域'],
    rivals: ['少林派', '武当派'],
    allies: []
  },
  {
    id: 'beggar_gang',
    name: '丐帮',
    type: 'gang',
    influence: 75,
    attitude: 'friendly',
    description: '天下第一大帮，弟子遍布九州',
    territory: ['各大城镇'],
    rivals: [],
    allies: ['少林派']
  },
  {
    id: 'yamen',
    name: '官府',
    type: 'official',
    influence: 60,
    attitude: 'neutral',
    description: '朝廷势力，维持地方治安',
    territory: ['各县城'],
    rivals: ['黑风寨'],
    allies: []
  },
  {
    id: 'black_wind',
    name: '黑风寨',
    type: 'bandit',
    influence: 40,
    attitude: 'hostile',
    description: '占山为王的土匪，劫掠商旅',
    territory: ['黑水峡', '荒山'],
    rivals: ['官府', '镖局'],
    allies: []
  }
];

// ==================== 天气影响系统 ====================
export interface WeatherEffect {
  visibility: number; // 能见度修正
  movement: number; // 移动速度修正
  combat: number; // 战斗修正
  mood: number; // 心情修正
  description: string;
}

export const getWeatherEffect = (weather: string, temperature: number): WeatherEffect => {
  const effects: Record<string, WeatherEffect> = {
    clear: { visibility: 0, movement: 0, combat: 0, mood: 5, description: '天朗气清，适宜出行' },
    cloudy: { visibility: -5, movement: 0, combat: 0, mood: 0, description: '云层厚重，天色阴沉' },
    rain: { visibility: -20, movement: -10, combat: -5, mood: -5, description: '细雨霏霏，道路泥泞' },
    heavy_rain: { visibility: -40, movement: -25, combat: -15, mood: -15, description: '暴雨如注，寸步难行' },
    fog: { visibility: -50, movement: -15, combat: -10, mood: -10, description: '浓雾弥漫，咫尺难辨' },
    snow: { visibility: -30, movement: -20, combat: -10, mood: -5, description: '飞雪漫天，银装素裹' },
    blizzard: { visibility: -60, movement: -40, combat: -25, mood: -20, description: '暴风雪肆虐，难以前行' },
    thunderstorm: { visibility: -35, movement: -30, combat: -20, mood: -25, description: '电闪雷鸣，风雨交加' }
  };
  
  let effect = effects[weather] || effects.clear;
  
  // 温度修正
  if (temperature < 0) {
    effect = { ...effect, movement: effect.movement - 10, mood: effect.mood - 10, description: effect.description + '，寒意刺骨' };
  } else if (temperature > 35) {
    effect = { ...effect, movement: effect.movement - 5, mood: effect.mood - 5, description: effect.description + '，酷热难当' };
  }
  
  return effect;
};

// ==================== 时辰活动系统 ====================
export interface TimeActivity {
  shichen: string;
  npcActivities: Record<string, string[]>; // 职业 -> 可能的活动
  shopStatus: Record<string, boolean>; // 店铺类型 -> 是否营业
  dangerModifier: number;
  description: string;
}

export const TIME_ACTIVITIES: TimeActivity[] = [
  {
    shichen: '子时',
    npcActivities: {
      '商贾': ['熟睡', '在家休息'],
      '江湖客': ['警戒', '夜间修炼', '熟睡'],
      '官差': ['夜巡', '值守城门'],
      '医者': ['休息', '急诊待命'],
      '游侠': ['夜行', '潜入', '休息']
    },
    shopStatus: { '茶肆': false, '客栈': true, '医馆': false, '集市': false, '酒肆': true },
    dangerModifier: 30,
    description: '夜半时分，万籁俱寂，只有更夫的梆子声回响在空旷的街道'
  },
  {
    shichen: '卯时',
    npcActivities: {
      '商贾': ['起床', '准备开店'],
      '江湖客': ['晨练', '早起'],
      '官差': ['点卯', '换班'],
      '医者': ['准备药材', '开门'],
      '游侠': ['起身', '检查装备']
    },
    shopStatus: { '茶肆': true, '客栈': true, '医馆': true, '集市': false, '酒肆': false },
    dangerModifier: -10,
    description: '旭日初升，鸡鸣声声，街巷渐渐热闹起来'
  },
  {
    shichen: '辰时',
    npcActivities: {
      '商贾': ['开门营业', '招呼客人'],
      '江湖客': ['用膳', '打探消息'],
      '官差': ['巡街', '处理公务'],
      '医者': ['坐堂问诊', '配药'],
      '游侠': ['早膳', '收集情报']
    },
    shopStatus: { '茶肆': true, '客栈': true, '医馆': true, '集市': true, '酒肆': false },
    dangerModifier: -20,
    description: '早市繁忙，人声鼎沸，是一天中最热闹的时候'
  },
  {
    shichen: '午时',
    npcActivities: {
      '商贾': ['午歇', '用膳'],
      '江湖客': ['休息', '闭目养神'],
      '官差': ['换班', '午歇'],
      '医者': ['煎药', '整理医案'],
      '游侠': ['休息', '养精蓄锐']
    },
    shopStatus: { '茶肆': true, '客栈': true, '医馆': true, '集市': true, '酒肆': true },
    dangerModifier: 0,
    description: '日头正盛，街上行人稀少，大多躲避暑气'
  },
  {
    shichen: '酉时',
    npcActivities: {
      '商贾': ['关门', '盘账'],
      '江湖客': ['饮酒', '江湖闲谈'],
      '官差': ['收工', '回衙'],
      '医者': ['关门', '整理'],
      '游侠': ['晚膳', '夜行准备']
    },
    shopStatus: { '茶肆': true, '客栈': true, '医馆': false, '集市': false, '酒肆': true },
    dangerModifier: 10,
    description: '夕阳西沉，暮色四合，一天的忙碌渐渐平息'
  },
  {
    shichen: '亥时',
    npcActivities: {
      '商贾': ['休息', '在家'],
      '江湖客': ['歇息', '守夜'],
      '官差': ['夜巡', '值守'],
      '医者': ['休息', '待命'],
      '游侠': ['夜行', '休息']
    },
    shopStatus: { '茶肆': false, '客栈': true, '医馆': false, '集市': false, '酒肆': true },
    dangerModifier: 20,
    description: '夜深人静，灯火阑珊，只有零星几处还亮着光'
  }
];

// ==================== 物价波动系统 ====================
export interface MarketPrice {
  itemType: string;
  basePrice: number;
  currentPrice: number;
  trend: 'rising' | 'falling' | 'stable';
  supply: number; // 0-100
  demand: number; // 0-100
}

export const calculateMarketPrices = (state: GameState): MarketPrice[] => {
  const marketIndex = state.world.currencySystem.marketIndex;
  const chaosLevel = state.world.chaosLevel;
  
  const basePrices: Record<string, number> = {
    '粮食': 10,
    '药材': 30,
    '兵器': 100,
    '布匹': 20,
    '盐铁': 15,
    '茶叶': 25,
    '酒水': 12
  };
  
  return Object.entries(basePrices).map(([type, base]) => {
    // 混乱度影响供需
    const supplyModifier = 100 - chaosLevel * 0.5;
    const demandModifier = 100 + chaosLevel * 0.3;
    
    const supply = Math.max(10, Math.min(100, supplyModifier + (Math.random() - 0.5) * 20));
    const demand = Math.max(10, Math.min(100, demandModifier + (Math.random() - 0.5) * 20));
    
    // 价格 = 基础价 * 市场指数 * (需求/供应)
    const price = Math.round(base * (marketIndex / 100) * (demand / supply));
    
    return {
      itemType: type,
      basePrice: base,
      currentPrice: price,
      trend: price > base ? 'rising' : price < base ? 'falling' : 'stable',
      supply,
      demand
    };
  });
};

// ==================== 随机遭遇系统 ====================
export interface Encounter {
  id: string;
  type: 'combat' | 'social' | 'discovery' | 'event' | 'quest';
  title: string;
  description: string;
  choices: { text: string; consequence: string; requirements?: Record<string, number> }[];
  rewards?: { items?: Partial<Item>[]; money?: { silver: number; copper: number }; fame?: number; morality?: number };
  danger: number;
}

export const generateEncounter = (state: GameState, locationType: string): Encounter | null => {
  const hour = new Date(state.world.time).getHours();
  const isNight = hour >= 21 || hour < 5;
  const dangerLevel = state.locations.find(l => l.name === state.world.location)?.dangerLevel || 20;
  
  // 遭遇概率基于危险度和时间
  const encounterChance = (dangerLevel / 100) * (isNight ? 1.5 : 0.8);
  if (Math.random() > encounterChance) return null;
  
  const encounters: Encounter[] = [
    {
      id: 'robber_ambush',
      type: 'combat',
      title: '路遇劫匪',
      description: '前方树林中突然冲出几个蒙面汉子，手持朴刀，拦住去路："此路是我开，此树是我栽，要想从此过，留下买路财！"',
      choices: [
        { text: '交出银两', consequence: '你掏出几两碎银，匪徒们满意地让开了路。', requirements: { silver: 3 } },
        { text: '拔剑迎战', consequence: '你剑出如龙，与匪徒们战作一团...', requirements: { combat: 15 } },
        { text: '试图逃跑', consequence: '你转身就跑，匪徒们在后面紧追不舍...', requirements: { qinggong: 2 } }
      ],
      danger: 60
    },
    {
      id: 'injured_traveler',
      type: 'social',
      title: '路遇伤者',
      description: '路边躺着一个衣衫褴褛的人，浑身是血，微微呻吟。看起来是被人打劫过了。',
      choices: [
        { text: '上前救治', consequence: '你蹲下身，为伤者包扎伤口...', requirements: {} },
        { text: '假装没看见', consequence: '你绕道而行，但心中略有不安...', requirements: {} },
        { text: '搜身（可能有财物）', consequence: '你在伤者身上翻找，找到了一些东西...', requirements: {} }
      ],
      rewards: { fame: 5, morality: 10 },
      danger: 10
    },
    {
      id: 'mysterious_merchant',
      type: 'social',
      title: '神秘商贩',
      description: '一个戴着斗笠的人拦住你，压低声音说："这位少侠，小的有些奇货，不知可有兴趣一观？"',
      choices: [
        { text: '看看有什么', consequence: '商贩打开包袱，里面竟是些稀罕物件...', requirements: {} },
        { text: '没兴趣', consequence: '你摆摆手，继续赶路。', requirements: {} },
        { text: '这人有古怪，小心提防', consequence: '你按住剑柄，警惕地打量着此人...', requirements: {} }
      ],
      danger: 20
    },
    {
      id: 'sect_recruitment',
      type: 'quest',
      title: '门派招收',
      description: '路边贴着一张告示，是某门派招收弟子的公告。告示上写明了入门条件和考核时间。',
      choices: [
        { text: '记下信息', consequence: '你将告示内容记在心里，或许日后有用。', requirements: {} },
        { text: '撕下告示', consequence: '你撕下告示，免得被别人看到。', requirements: {} },
        { text: '不感兴趣', consequence: '你瞥了一眼，继续前行。', requirements: {} }
      ],
      danger: 0
    }
  ];
  
  // 根据位置类型筛选合适的遭遇
  const validEncounters = encounters.filter(e => {
    if (locationType === 'outdoor' && e.type === 'combat') return true;
    if (locationType === 'building' && e.type === 'social') return true;
    return Math.random() > 0.5;
  });
  
  if (validEncounters.length === 0) return null;
  return validEncounters[Math.floor(Math.random() * validEncounters.length)];
};

// ==================== NPC 记忆系统 ====================
export interface NPCMemory {
  id: string;
  type: 'interaction' | 'gift' | 'help' | 'conflict' | 'trade' | 'rumor';
  description: string;
  impact: number; // -100 to 100
  timestamp: number;
  decayRate: number; // 每天衰减多少
}

export const createNPCMemory = (
  type: NPCMemory['type'],
  description: string,
  impact: number
): NPCMemory => ({
  id: `mem_${Date.now()}`,
  type,
  description,
  impact,
  timestamp: Date.now(),
  decayRate: Math.abs(impact) > 50 ? 0.5 : 1 // 重大事件衰减慢
});

export const processNPCMemories = (memories: NPCMemory[], daysPassed: number): NPCMemory[] => {
  return memories
    .map(m => ({
      ...m,
      impact: m.impact > 0
        ? Math.max(0, m.impact - m.decayRate * daysPassed)
        : Math.min(0, m.impact + m.decayRate * daysPassed)
    }))
    .filter(m => Math.abs(m.impact) > 5); // 移除影响过小的记忆
};

// ==================== 食物腐败系统 ====================
export interface FoodState {
  freshness: number; // 0-100
  spoilRate: number; // 每小时腐败速度
  isCooked: boolean;
  preserveMethod?: 'salted' | 'dried' | 'smoked' | 'pickled';
}

export const calculateFoodFreshness = (
  item: Item,
  hoursPassed: number,
  temperature: number
): number => {
  if (item.type !== 'food') return 100;
  
  const baseRate = 1; // 基础腐败速度
  let rate = baseRate;
  
  // 温度影响
  if (temperature > 30) rate *= 2;
  else if (temperature > 20) rate *= 1.5;
  else if (temperature < 5) rate *= 0.3;
  
  // 保存方式影响
  if (item.name.includes('干') || item.name.includes('熏')) rate *= 0.2;
  if (item.name.includes('腌') || item.name.includes('咸')) rate *= 0.3;
  
  const currentFreshness = (item as Item & { freshness?: number }).freshness ?? 100;
  return Math.max(0, currentFreshness - rate * hoursPassed);
};

// ==================== 声望影响详细系统 ====================
export interface ReputationEffect {
  shopDiscount: number;
  npcInitialTrust: number;
  questAvailability: string[];
  specialDialogues: string[];
  factionReactions: Record<string, string>;
}

export const getDetailedReputationEffect = (fame: number, morality: number): ReputationEffect => {
  const effect: ReputationEffect = {
    shopDiscount: 0,
    npcInitialTrust: 0,
    questAvailability: [],
    specialDialogues: [],
    factionReactions: {}
  };
  
  // 名望影响
  if (fame >= 80) {
    effect.shopDiscount = 15;
    effect.npcInitialTrust = 20;
    effect.questAvailability.push('门派高层任务', '朝廷秘密任务');
    effect.specialDialogues.push('"原来是大名鼎鼎的{name}，久仰大名！"');
  } else if (fame >= 50) {
    effect.shopDiscount = 8;
    effect.npcInitialTrust = 10;
    effect.questAvailability.push('江湖委托', '镖局护送');
    effect.specialDialogues.push('"这位少侠看着面善，可是{name}？"');
  }
  
  // 侠义值影响
  if (morality >= 80) {
    effect.npcInitialTrust += 15;
    effect.factionReactions['正派'] = '敬重有加';
    effect.factionReactions['邪派'] = '有所忌惮';
    effect.specialDialogues.push('"听闻少侠行侠仗义，今日一见，果然不凡。"');
  } else if (morality <= 20) {
    effect.npcInitialTrust -= 20;
    effect.factionReactions['正派'] = '心存戒备';
    effect.factionReactions['邪派'] = '愿意结交';
    effect.specialDialogues.push('"阁下...似乎名声不太好啊。"');
  }
  
  return effect;
};

// ==================== 综合世界更新 ====================
export const comprehensiveWorldUpdate = (
  state: GameState,
  dispatch: React.Dispatch<any>,
  addLog: (text: string, type: LogEntry['type']) => void
) => {
  const hour = new Date(state.world.time).getHours();
  const weather = state.world.weather;
  const weatherEffect = getWeatherEffect(weather.current, weather.temperature);
  
  // 1. 天气对玩家的影响
  if (weatherEffect.mood !== 0) {
    dispatch({
      type: 'UPDATE_PLAYER_STAT',
      payload: { stat: 'sanity' as StatKey, value: weatherEffect.mood * 0.1 }
    });
  }
  
  // 2. 检查极端天气
  if (weather.temperature < -5) {
    dispatch({
      type: 'UPDATE_PLAYER_STAT',
      payload: { stat: 'health' as StatKey, value: -2 }
    });
    addLog('寒风刺骨，你感到阵阵寒意侵入骨髓。', 'warning');
  } else if (weather.temperature > 38) {
    dispatch({
      type: 'UPDATE_PLAYER_STAT',
      payload: { stat: 'thirst' as StatKey, value: -5 }
    });
    addLog('酷热难当，你感到口干舌燥。', 'warning');
  }
  
  // 3. 时辰相关的环境描写
  const activities = TIME_ACTIVITIES.find(a => {
    const shichen = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    const idx = Math.floor(((hour + 1) % 24) / 2);
    return a.shichen === shichen[idx] + '时';
  });
  
  if (activities && Math.random() < 0.1) {
    addLog(activities.description, 'narrative');
  }
  
  // 4. 随机事件
  const location = state.locations.find(l => l.name === state.world.location);
  if (location && Math.random() < 0.08) {
    const encounter = generateEncounter(state, location.type);
    if (encounter) {
      addLog(`【${encounter.title}】${encounter.description}`, 'narrative');
    }
  }
};
