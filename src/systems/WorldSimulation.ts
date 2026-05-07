// 真实世界模拟系统
import { GameState, NPC, LogEntry, WeatherType } from '../types/game';

// 十二时辰系统
export const SHICHEN = [
  { name: '子时', hours: [23, 0, 1], desc: '夜半，万籁俱寂', activity: '歇息' },
  { name: '丑时', hours: [1, 2, 3], desc: '鸡鸣，天色将明', activity: '歇息' },
  { name: '寅时', hours: [3, 4, 5], desc: '平旦，天色微明', activity: '起身' },
  { name: '卯时', hours: [5, 6, 7], desc: '日出，旭日东升', activity: '早课' },
  { name: '辰时', hours: [7, 8, 9], desc: '食时，用早膳', activity: '早膳' },
  { name: '巳时', hours: [9, 10, 11], desc: '隅中，日近正午', activity: '劳作' },
  { name: '午时', hours: [11, 12, 13], desc: '日中，日头正盛', activity: '午歇' },
  { name: '未时', hours: [13, 14, 15], desc: '日昳，日头西斜', activity: '劳作' },
  { name: '申时', hours: [15, 16, 17], desc: '晡时，日落之前', activity: '劳作' },
  { name: '酉时', hours: [17, 18, 19], desc: '日入，日落西山', activity: '晚膳' },
  { name: '戌时', hours: [19, 20, 21], desc: '黄昏，暮色四合', activity: '闲话' },
  { name: '亥时', hours: [21, 22, 23], desc: '人定，夜深人静', activity: '歇息' },
];

export const getShichen = (hour: number): typeof SHICHEN[0] => {
  for (const shi of SHICHEN) {
    if (shi.hours.includes(hour)) return shi;
  }
  return SHICHEN[0];
};

// 季节系统
export const SEASONS = {
  spring: { name: '春', months: [2, 3, 4], tempRange: [8, 22], weatherWeights: { clear: 30, cloudy: 25, rain: 30, fog: 15 } },
  summer: { name: '夏', months: [5, 6, 7], tempRange: [22, 38], weatherWeights: { clear: 40, cloudy: 20, heavy_rain: 25, thunderstorm: 15 } },
  autumn: { name: '秋', months: [8, 9, 10], tempRange: [10, 25], weatherWeights: { clear: 35, cloudy: 30, rain: 20, fog: 15 } },
  winter: { name: '冬', months: [11, 0, 1], tempRange: [-5, 12], weatherWeights: { clear: 25, cloudy: 30, snow: 25, blizzard: 10, fog: 10 } },
};

export const getSeason = (month: number) => {
  for (const [key, season] of Object.entries(SEASONS)) {
    if (season.months.includes(month)) return { key, ...season };
  }
  return { key: 'spring', ...SEASONS.spring };
};

// NPC日程系统
export interface NPCSchedule {
  shichen: string;
  activity: string;
  location: string;
  dialogue?: string;
}

export const NPC_SCHEDULES: Record<string, NPCSchedule[]> = {
  '商贾': [
    { shichen: '卯时', activity: '开门营业', location: '店铺', dialogue: '客官早，看看有什么需要的？' },
    { shichen: '辰时', activity: '做生意', location: '店铺', dialogue: '这个价钱实惠...' },
    { shichen: '午时', activity: '歇息用膳', location: '后院', dialogue: '稍候，正在用饭。' },
    { shichen: '申时', activity: '整理货物', location: '店铺', dialogue: '货物刚到，有新鲜的。' },
    { shichen: '酉时', activity: '关门打烊', location: '店铺', dialogue: '天色不早了，明日再来。' },
    { shichen: '戌时', activity: '在家休息', location: '民宅', dialogue: '店已打烊，有事明日再说。' },
  ],
  '江湖客': [
    { shichen: '卯时', activity: '晨起练功', location: '空地', dialogue: '（正在练剑，无暇理会）' },
    { shichen: '辰时', activity: '用膳打探', location: '茶肆', dialogue: '坐下说话。' },
    { shichen: '午时', activity: '休息', location: '客栈', dialogue: '有事？' },
    { shichen: '申时', activity: '游荡', location: '街道', dialogue: '这位朋友...' },
    { shichen: '酉时', activity: '饮酒', location: '酒肆', dialogue: '来，喝一杯！' },
    { shichen: '戌时', activity: '歇息', location: '客栈', dialogue: '夜深了，明日再谈。' },
  ],
  '医者': [
    { shichen: '卯时', activity: '准备药材', location: '医馆', dialogue: '早，身体不适吗？' },
    { shichen: '辰时', activity: '坐堂问诊', location: '医馆', dialogue: '伸手让我把把脉。' },
    { shichen: '午时', activity: '煎药', location: '医馆后堂', dialogue: '稍候，药正在煎。' },
    { shichen: '申时', activity: '出诊', location: '城中', dialogue: '（正在出诊中）' },
    { shichen: '酉时', activity: '整理医案', location: '医馆', dialogue: '今日看诊结束了。' },
  ],
  '官差': [
    { shichen: '卯时', activity: '点卯当值', location: '衙门', dialogue: '有何事禀报？' },
    { shichen: '辰时', activity: '巡街', location: '街道', dialogue: '守规矩，莫生事！' },
    { shichen: '午时', activity: '歇息', location: '衙门', dialogue: '有事找当值的说。' },
    { shichen: '申时', activity: '巡街', location: '城门', dialogue: '路引拿来看看。' },
    { shichen: '酉时', activity: '换班', location: '衙门', dialogue: '今日当值结束了。' },
  ],
};

// 获取NPC当前应该做什么
export const getNPCCurrentActivity = (npc: NPC, hour: number): NPCSchedule | null => {
  const shichen = getShichen(hour);
  const occupation = npc.occupation || '江湖客';
  const schedules = NPC_SCHEDULES[occupation] || NPC_SCHEDULES['江湖客'];
  return schedules.find(s => s.shichen === shichen.name) || null;
};

// 环境描写生成器
export const generateEnvironmentDescription = (state: GameState): string => {
  const hour = new Date(state.world.time).getHours();
  const shichen = getShichen(hour);
  const weather = state.world.weather.current;
  const location = state.locations.find(l => l.name === state.world.location);
  
  const timeDescs: Record<string, string[]> = {
    '子时': ['夜深人静，万籁俱寂。', '四下漆黑，偶有犬吠远传。', '月色朦胧，寒意袭人。'],
    '丑时': ['天色漆黑，只有零星灯火。', '夜色深沉，远处传来更鼓声。', '露水渐重，寒气逼人。'],
    '寅时': ['天边隐约泛白，晨曦将至。', '雄鸡初鸣，天色微明。', '夜色渐退，薄雾升起。'],
    '卯时': ['旭日初升，金光洒落。', '朝霞满天，新的一天开始。', '晨光熹微，鸟鸣声声。'],
    '辰时': ['日头渐高，街市热闹起来。', '阳光和煦，行人渐多。', '炊烟袅袅，饭香四溢。'],
    '巳时': ['日头正盛，暑气上涌。', '阳光灿烂，街上人来人往。', '天气晴好，适宜出行。'],
    '午时': ['烈日当空，热浪滚滚。', '日头最盛，树影斑驳。', '正午时分，阳光刺眼。'],
    '未时': ['日头西斜，暑气渐退。', '阳光依旧明亮，但已不似正午灼热。', '午后时光，慵懒宁静。'],
    '申时': ['斜阳西照，金光铺地。', '日影渐长，暮色将至。', '晚风习习，带来凉意。'],
    '酉时': ['夕阳西沉，晚霞满天。', '暮色四合，炊烟升起。', '落日余晖，染红天际。'],
    '戌时': ['夜幕降临，灯火初上。', '暮色苍茫，星子初现。', '天色渐暗，街市冷清。'],
    '亥时': ['夜色深沉，灯火阑珊。', '月上中天，四下寂静。', '夜风清凉，万家灯火。'],
  };
  
  const weatherDescs: Record<string, string[]> = {
    'clear': ['天朗气清。', '万里无云。', '碧空如洗。'],
    'cloudy': ['云层厚重，遮住了阳光。', '天色阴沉。', '乌云密布。'],
    'rain': ['细雨霏霏，打湿衣衫。', '雨丝飘洒，润泽万物。', '淅沥小雨，滴答作响。'],
    'heavy_rain': ['大雨如注，视线模糊。', '暴雨倾盆，雷声隆隆。', '狂风暴雨，难以前行。'],
    'fog': ['浓雾弥漫，能见度极低。', '大雾锁城，咫尺难辨。', '雾气氤氲，如入仙境。'],
    'snow': ['雪花飘落，银装素裹。', '飞雪漫天，寒意刺骨。', '瑞雪初降，天地一白。'],
  };
  
  const locationDescs: Record<string, string[]> = {
    '驿': ['驿站里人声嘈杂，马嘶声此起彼伏。', '驿站的伙计忙前忙后，招呼着来往客商。'],
    '茶': ['茶香袅袅，三两客人低声交谈。', '茶馆里说书先生正讲着江湖旧闻。'],
    '集市': ['叫卖声此起彼伏，行人摩肩接踵。', '各式货物琳琅满目，讨价还价声不绝于耳。'],
    '山': ['山风呼啸，林木萧萧。', '崎岖山路，怪石嶙峋。'],
    '峡': ['峡谷幽深，阴气森森。', '两侧绝壁，只有一线天光。'],
  };
  
  let desc = timeDescs[shichen.name]?.[Math.floor(Math.random() * timeDescs[shichen.name].length)] || '';
  desc += weatherDescs[weather]?.[Math.floor(Math.random() * weatherDescs[weather].length)] || '';
  
  if (location) {
    for (const [key, descs] of Object.entries(locationDescs)) {
      if (location.name.includes(key)) {
        desc += descs[Math.floor(Math.random() * descs.length)];
        break;
      }
    }
  }
  
  return desc;
};

// NPC自主行动系统
export const simulateNPCBehavior = (npc: NPC, _state: GameState, hour: number): Partial<NPC> | null => {
  const schedule = getNPCCurrentActivity(npc, hour);
  if (!schedule) return null;
  
  // 根据日程更新NPC位置和状态
  const updates: Partial<NPC> = {
    currentAction: schedule.activity,
  };
  
  // NPC状态消耗
  const stats = { ...npc.stats };
  
  // 每个时辰消耗
  stats.hunger = Math.max(0, stats.hunger - 2);
  stats.thirst = Math.max(0, stats.thirst - 3);
  
  // 夜间恢复精力
  if (['子时', '丑时', '寅时'].includes(getShichen(hour).name)) {
    stats.energy = Math.min(100, stats.energy + 5);
  } else {
    stats.energy = Math.max(0, stats.energy - 1);
  }
  
  // 饥饿/口渴影响健康
  if (stats.hunger < 20 || stats.thirst < 20) {
    stats.health = Math.max(0, stats.health - 1);
  }
  
  updates.stats = stats;
  
  return updates;
};

// 天气变化系统
export const simulateWeather = (state: GameState): Partial<GameState['world']['weather']> => {
  const month = new Date(state.world.time).getMonth();
  const season = getSeason(month);
  
  // 随机决定是否改变天气
  if (Math.random() > 0.1) return {}; // 90%概率不变
  
  const weights = season.weatherWeights;
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let rand = Math.random() * total;
  
  let newWeather = 'clear';
  for (const [weather, weight] of Object.entries(weights)) {
    rand -= weight;
    if (rand <= 0) {
      newWeather = weather;
      break;
    }
  }
  
  // 温度随季节和时间变化
  const hour = new Date(state.world.time).getHours();
  const baseTemp = (season.tempRange[0] + season.tempRange[1]) / 2;
  const tempVariation = (season.tempRange[1] - season.tempRange[0]) / 2;
  
  // 中午最热，凌晨最冷
  const hourFactor = Math.cos((hour - 14) * Math.PI / 12);
  const newTemp = Math.round(baseTemp + tempVariation * hourFactor + (Math.random() - 0.5) * 4);
  
  return {
    current: newWeather as WeatherType,
    temperature: newTemp,
  };
};

// 事件生成系统
export interface WorldEvent {
  id: string;
  type: 'ambient' | 'encounter' | 'discovery' | 'rumor';
  text: string;
  timestamp: number;
}

export const generateRandomEvent = (state: GameState): WorldEvent | null => {
  if (Math.random() > 0.15) return null; // 85%概率无事件
  
  const hour = new Date(state.world.time).getHours();
  const shichen = getShichen(hour);
  const location = state.locations.find(l => l.name === state.world.location);
  const isNight = ['子时', '丑时', '亥时'].includes(shichen.name);
  const isDangerous = (location?.dangerLevel || 0) > 40;
  
  const ambientEvents = [
    '远处传来几声犬吠。',
    '一群飞鸟掠过天际。',
    '风中似乎带着淡淡的血腥味。',
    '路边有人在低声议论着什么。',
    '一个小贩推着车从身边经过。',
    '远处寺庙的钟声悠悠传来。',
    '有人在角落里练剑，剑光闪烁。',
    '茶馆里传出说书先生的声音。',
  ];
  
  const nightEvents = [
    '夜色中，似乎有黑影一闪而过。',
    '远处传来一声凄厉的惨叫。',
    '更鼓声响起，提醒着时辰。',
    '月光下，有人在屋顶上飞掠而过。',
    '野狼的嚎叫从山中传来。',
  ];
  
  const dangerEvents = [
    '前方似乎有打斗的声音。',
    '地上发现了可疑的血迹。',
    '空气中弥漫着危险的气息。',
    '有人在暗处窥视着你。',
    '远处传来兵器交击的声音。',
  ];
  
  let pool = ambientEvents;
  if (isNight) pool = [...pool, ...nightEvents];
  if (isDangerous) pool = [...pool, ...dangerEvents];
  
  const text = pool[Math.floor(Math.random() * pool.length)];
  
  return {
    id: `event_${Date.now()}`,
    type: 'ambient',
    text,
    timestamp: state.world.time,
  };
};

// 声望影响系统
export const getReputationModifier = (fame: number, morality: number): {
  priceModifier: number;
  trustModifier: number;
  encounterModifier: number;
  description: string;
} => {
  let desc = '';
  let priceModifier = 1;
  let trustModifier = 0;
  let encounterModifier = 1;
  
  if (fame >= 80) {
    desc = '名震江湖';
    priceModifier = 0.85;
    trustModifier = 20;
    encounterModifier = 0.7;
  } else if (fame >= 60) {
    desc = '小有名气';
    priceModifier = 0.92;
    trustModifier = 10;
    encounterModifier = 0.85;
  } else if (fame >= 40) {
    desc = '略有耳闻';
    priceModifier = 0.96;
    trustModifier = 5;
  } else if (fame >= 20) {
    desc = '无名小卒';
  } else {
    desc = '籍籍无名';
    priceModifier = 1.05;
    trustModifier = -5;
  }
  
  if (morality >= 80) {
    desc += '·大侠';
    trustModifier += 15;
  } else if (morality >= 60) {
    desc += '·侠士';
    trustModifier += 8;
  } else if (morality <= 20) {
    desc += '·恶名昭彰';
    trustModifier -= 20;
    encounterModifier = 1.3;
  } else if (morality <= 40) {
    desc += '·名声不佳';
    trustModifier -= 10;
  }
  
  return { priceModifier, trustModifier, encounterModifier, description: desc };
};

// 完整的世界模拟tick
export const worldTick = (state: GameState, dispatch: React.Dispatch<any>, addLog: (text: string, type: LogEntry['type']) => void) => {
  const hour = new Date(state.world.time).getHours();
  
  // 1. NPC行为模拟
  state.npcs.forEach(npc => {
    if (npc.status !== 'alive') return;
    const updates = simulateNPCBehavior(npc, state, hour);
    if (updates) {
      dispatch({ type: 'UPDATE_NPC', payload: { id: npc.id, updates } });
    }
  });
  
  // 2. 天气变化
  const weatherUpdates = simulateWeather(state);
  if (Object.keys(weatherUpdates).length > 0) {
    dispatch({
      type: 'UPDATE_WORLD',
      payload: { weather: { ...state.world.weather, ...weatherUpdates } }
    });
  }
  
  // 3. 随机事件
  const event = generateRandomEvent(state);
  if (event) {
    addLog(event.text, 'narrative');
  }
  
  // 4. 经济波动
  if (Math.random() < 0.05) {
    const change = Math.floor((Math.random() - 0.5) * 10);
    dispatch({
      type: 'UPDATE_WORLD',
      payload: {
        currencySystem: {
          ...state.world.currencySystem,
          marketIndex: Math.max(70, Math.min(130, state.world.currencySystem.marketIndex + change))
        }
      }
    });
  }
};
