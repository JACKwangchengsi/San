import React, { createContext, useContext, useEffect, useReducer, ReactNode, useState, useCallback } from 'react';
import { logger } from '../utils/logger';
import {
  GameState, Item, NPC, PlayerState, WorldState, LogEntry,
  Attribute, NPCStats, NPCPersonality, WeatherState,
  Location, GameSettings, StatKey, RomanceState, CraftingRecipe, AIResponseSummary,
  MonsterType
} from '../types/game';

const INITIAL_DATE = new Date('1203-04-12T09:30:00').getTime();
const SAVE_KEYS = ['jianghu_game_save', 'apocalypse_game_save', 'wuxia_game_save'];
const PRIMARY_SAVE_KEY = SAVE_KEYS[0];

const createAttribute = (label: string, value: number, max: number, decayRate: number = 0, criticalThreshold: number = 20): Attribute => ({
  label, value, max, decayRate, criticalThreshold
});

const createNPCStats = (overrides: Partial<NPCStats> = {}): NPCStats => ({
  health: 100,
  maxHealth: 100,
  hunger: 80,
  thirst: 80,
  energy: 100,
  combat: 5,
  speed: 50,
  perception: 50,
  infection: 0,
  ...overrides
});

const createNPCPersonality = (overrides: Partial<NPCPersonality> = {}): NPCPersonality => ({
  bravery: 50,
  intelligence: 50,
  loyalty: 50,
  morality: 50,
  aggression: 30,
  sociability: 50,
  ...overrides
});

const createRomanceState = (overrides: Partial<RomanceState> = {}): RomanceState => ({
  affinity: 0,
  attraction: 0,
  jealousy: 0,
  trust: 0,
  intimacy: 0,
  commitment: 0,
  stage: 'none',
  exclusive: false,
  confessed: false,
  memories: [],
  ...overrides
});

const createItem = (data: Partial<Item> & { id: string; name: string }): Item => {
  const type = data.type || 'misc';
  const isConsumable = data.isConsumable ?? ['food', 'drink', 'medicine', 'consumable'].includes(type);
  const isReusable = data.isReusable ?? !isConsumable;
  return {
    description: '',
    type,
    rarity: 'common',
    quantity: 1,
    maxStack: 99,
    weight: 0.1,
    isConsumable,
    isReusable,
    createdAt: Date.now(),
    modifiedAt: Date.now(),
    ...data
  };
};

const createWeatherState = (): WeatherState => ({
  current: 'cloudy',
  temperature: 15,
  humidity: 65,
  windSpeed: 10,
  visibility: 70,
  forecast: ['cloudy', 'rain', 'overcast']
});

const calculateCarryWeight = (inventory: Item[]) => inventory.reduce((sum, item) => sum + item.weight * item.quantity, 0);

const initialPlayer: PlayerState = {
  name: '未定名',
  nickname: '',
  age: 15,
  gender: 'male',
  romancePreference: 'female',
  role: '尚未定下身份的穿越者',
  background: '你的真正身份、来历、目标与性情，将在开始游戏时由你亲自决定。',
  appearance: '尚未确定外貌与气质。',
  stats: {
    health: createAttribute('气血', 100, 100, 0, 20),
    hunger: createAttribute('饱腹', 85, 100, 5, 20),
    thirst: createAttribute('口渴', 90, 100, 8, 15),
    energy: createAttribute('内力', 95, 100, 3, 20),
    sanity: createAttribute('心境', 100, 100, 0.5, 30),
    infection: createAttribute('暗伤', 0, 100, 0, 50),
    stamina: createAttribute('体力', 100, 100, 4, 25)
  },
  inventory: [
    createItem({ id: 'sword_1', name: '青锋长剑', description: '随身佩剑，剑身如水，寒光森然。', type: 'weapon', weight: 1.2, durability: 100, maxDurability: 100, weaponData: { damage: 28, range: 1.6, accuracy: 75, noiseLevel: 20 } }),
    createItem({ id: 'medicine_1', name: '止血散', description: '简易止血药粉，能缓解外伤。', type: 'medicine', weight: 0.05, isConsumable: true, effects: [{ stat: 'health', value: 12 }] }),
    createItem({ id: 'water_skin', name: '水囊', description: '牛皮水囊，里面还有小半袋清水。', type: 'drink', weight: 0.4, isConsumable: false, isReusable: true, durability: 100, maxDurability: 100, maxUses: 3, currentUses: 2, canRefill: true, refillSource: 'water', effects: [{ stat: 'thirst', value: 22 }] }),
    createItem({ id: 'bundle_1', name: '行囊', description: '布质行囊，装着干粮与随身杂物。', type: 'container', weight: 1.8, containerData: { capacity: 18, contents: [createItem({ id: 'food_1', name: '干粮', description: '粗粮饼，耐放。', type: 'food', weight: 0.12, quantity: 2, effects: [{ stat: 'hunger', value: 18 }], isConsumable: true }), createItem({ id: 'tool_1', name: '火折子', description: '取火用具。', type: 'tool', weight: 0.08 }), createItem({ id: 'doc_1', name: '师门信物', description: '刻着徽记的玉佩。', type: 'document', weight: 0.05 })] } }),
    createItem({ id: 'tool_2', name: '油布斗笠', description: '遮风挡雨，行路用。', type: 'clothing', weight: 0.3 }),
  ],
  equipment: {},
  maxCarryWeight: 25,
  currentCarryWeight: 4.2,
  skills: [
    { id: 'qinggong', name: '轻功', description: '身法灵动，来去如风', level: 1, maxLevel: 10, experience: 15, expToNextLevel: 100, category: 'stealth' },
    { id: 'swordplay', name: '剑术', description: '剑法基础', level: 1, maxLevel: 10, experience: 20, expToNextLevel: 100, category: 'combat' },
    { id: 'internal', name: '内功', description: '内息运转，增强体魄', level: 1, maxLevel: 10, experience: 10, expToNextLevel: 100, category: 'survival' },
    { id: 'medical', name: '岐黄', description: '基础医理与止血', level: 0, maxLevel: 10, experience: 0, expToNextLevel: 100, category: 'medical' },
    { id: 'social', name: '江湖交际', description: '与人往来之道', level: 1, maxLevel: 10, experience: 20, expToNextLevel: 100, category: 'social' }
  ],
  perks: ['侠义心'],
  traits: ['谨慎', '目力好', '轻身'],
  martialArts: [
    { id: 'art_basic_sword', name: '青岚剑法', level: 1, description: '入门剑式，以稳为主。', style: 'sword' },
    { id: 'art_basic_internal', name: '行气诀', level: 1, description: '基础内息法门。', style: 'internal' }
  ],
  sect: '无门无派',
  jianghuFame: 5,
  morality: 60,
  currency: { silver: 12, copper: 320 },
  romance: {
    history: [],
    charm: 8,
    attachmentStyle: 'balanced'
  },
  cultivationStage: 0,
  cultivationAbilities: [],
  relationships: {},
  factions: {},
  injuries: [],
  diseases: [],
  buffs: [],
  debuffs: [],
  memories: [],
  achievements: [],
  killCount: { monsters: 0, humans: 0, heretics: 0 },
  createdAt: INITIAL_DATE,
  lastSaved: INITIAL_DATE,
  totalPlayTime: 0
};

const createBaseNPC = (data: Partial<NPC> & Pick<NPC, 'id' | 'name' | 'age' | 'gender' | 'occupation' | 'description'>): NPC => ({
  nickname: undefined,
  fertility: data.gender === 'female' ? 60 : 55,
  isPregnant: false,
  pregnancyWeeks: 0,
  appearance: data.appearance || '',
  personality: createNPCPersonality(data.personality),
  personalityTags: data.personalityTags || [],
  romancePreference: data.romancePreference || (data.gender === 'female' ? 'male' : data.gender === 'male' ? 'female' : 'both'),
  attitude: data.attitude || 'neutral',
  relation: data.relation ?? 0,
  trust: data.trust ?? 0,
  fear: data.fear ?? 0,
  mood: data.mood || '平静',
  location: data.location || '青石驿',
  inventory: data.inventory || [],
  equipment: data.equipment || {},
  status: data.status || 'alive',
  stats: createNPCStats(data.stats),
  skills: data.skills || {},
  memories: data.memories || [],
  dialogueHistory: data.dialogueHistory || [],
  goals: data.goals || ['护身自保'],
  schedule: data.schedule,
  faction: data.faction,
  isRecruited: data.isRecruited || false,
  joinedAt: data.joinedAt,
  romance: createRomanceState(data.romance),
  secrets: data.secrets || [],
  aiPersona: data.aiPersona || '',
  notes: data.notes || '',
  createdAt: INITIAL_DATE,
  modifiedAt: INITIAL_DATE,
  ...data,
});

const initialNPCs: NPC[] = [
  createBaseNPC({
    id: 'npc_qi_xuan', name: '齐玄', age: 22, gender: 'male', occupation: '散修',
    description: '游历四方的散修，剑法凌厉，寡言而警觉。',
    personalityTags: ['寡言', '冷静', '谨慎'],
    personality: createNPCPersonality({ bravery: 55, intelligence: 60, loyalty: 45, aggression: 30, sociability: 25 }),
    relation: 22, trust: 38, attitude: 'friendly', location: '青石驿',
    inventory: [createItem({ id: 'item_short_sword', name: '短剑', type: 'weapon', description: '便携短剑，剑身略显斑驳。', weight: 0.7, weaponData: { damage: 20, range: 1.2, accuracy: 70, noiseLevel: 15 } })],
    stats: createNPCStats({ combat: 25, perception: 70 }),
    aiPersona: '外冷内热，言语简短，讨厌虚伪与试探，遇到真正可信的人会慢慢松口。',
  }),
  createBaseNPC({
    id: 'npc_lan_yun', name: '蓝芸', age: 19, gender: 'female', occupation: '医馆弟子',
    description: '医馆弟子，擅长草药与诊脉，心思细腻。',
    personalityTags: ['温和', '细致', '谨慎'],
    personality: createNPCPersonality({ bravery: 35, intelligence: 80, loyalty: 60, aggression: 10, sociability: 55 }),
    relation: 28, trust: 42, attitude: 'friendly', location: '青石驿', mood: '温和平静',
    inventory: [createItem({ id: 'item_herb_bag', name: '草药囊', type: 'medicine', description: '常用草药，能止血消炎。', weight: 0.2, isConsumable: true, effects: [{ stat: 'health', value: 18 }] }), createItem({ id: 'item_silver_needles', name: '银针', type: 'tool', description: '医者所用银针。', weight: 0.05 })],
    stats: createNPCStats({ combat: 6, perception: 60 }),
    romance: createRomanceState({ affinity: 18, attraction: 10, trust: 28, stage: 'interested', memories: ['初见时觉得你虽落魄却有分寸'] }),
    aiPersona: '说话轻柔克制，重视分寸，常从伤势、体力、风险出发考虑问题，对真诚和善意会悄悄记在心里。',
  }),
  createBaseNPC({
    id: 'npc_zhou_feng', name: '周枫', age: 24, gender: 'male', occupation: '镖局护卫',
    description: '镖局出身，善使长枪，护人有责。',
    personalityTags: ['豪爽', '刚直', '可靠'],
    personality: createNPCPersonality({ bravery: 70, intelligence: 55, loyalty: 75, aggression: 40, sociability: 65 }),
    relation: 18, trust: 26, attitude: 'friendly', location: '山道',
    inventory: [createItem({ id: 'item_spear', name: '铁枪', type: 'weapon', description: '镖局长枪，枪尖寒光闪烁。', weight: 1.6, weaponData: { damage: 32, range: 2.2, accuracy: 65, noiseLevel: 25 } })],
    stats: createNPCStats({ combat: 35, speed: 55, health: 120, maxHealth: 120 }),
    aiPersona: '为人豪爽，爱讲江湖义气，但对背信弃义之人零容忍。',
  }),
  createBaseNPC({
    id: 'npc_he_ning', name: '何宁', age: 18, gender: 'male', occupation: '跑堂',
    description: '客栈跑堂出身，消息灵通，擅长打探。',
    personalityTags: ['机灵', '健谈', '圆滑'],
    personality: createNPCPersonality({ bravery: 40, intelligence: 65, loyalty: 45, aggression: 15, sociability: 85 }),
    relation: 12, trust: 18, attitude: 'neutral', location: '云岫镇',
    inventory: [createItem({ id: 'item_map_scroll', name: '江湖地图', type: 'document', description: '标注着各地驿站与门派。', weight: 0.1 })],
    stats: createNPCStats({ combat: 6, perception: 65 }),
    aiPersona: '嘴快、爱卖关子，喜欢拿消息换好处，但不算坏。',
  }),
  createBaseNPC({
    id: 'npc_master_liu', name: '柳师爷', age: 50, gender: 'male', occupation: '门派执事',
    description: '门派执事，城府深，熟知江湖规矩。',
    personalityTags: ['沉稳', '谨慎', '老练'],
    personality: createNPCPersonality({ bravery: 50, intelligence: 80, loyalty: 60, morality: 50, aggression: 20 }),
    relation: 10, trust: 20, location: '青石驿',
    inventory: [createItem({ id: 'item_token', name: '门派令牌', type: 'document', description: '代表门派身份的令牌。', weight: 0.1 })],
    stats: createNPCStats({ combat: 12, perception: 70 }),
    aiPersona: '官腔里带着江湖圆滑，不轻易表态，但每句话都有分量。',
  }),
  createBaseNPC({
    id: 'npc_yan_ru', name: '燕如', age: 20, gender: 'female', occupation: '游侠',
    description: '身手敏捷的女侠，行动飘忽，似在追查某桩旧案。',
    appearance: '眉眼锐利，黑衣束发',
    personalityTags: ['敏捷', '警觉', '寡言'],
    personality: createNPCPersonality({ bravery: 60, intelligence: 70, loyalty: 40, morality: 60, aggression: 35, sociability: 45 }),
    relation: 10, trust: 12, location: '青石驿',
    inventory: [createItem({ id: 'item_dagger', name: '匕首', type: 'weapon', description: '袖中短匕，锋锐无声。', weight: 0.2, weaponData: { damage: 16, range: 0.4, accuracy: 85, noiseLevel: 5 } })],
    stats: createNPCStats({ combat: 22, speed: 70, perception: 65 }),
    romance: createRomanceState({ affinity: 8, attraction: 12, trust: 10, stage: 'interested' }),
    notes: '神秘的女侠',
    aiPersona: '警惕而克制，不轻易吐露真相；若确认你值得信任，会突然变得直接。',
  }),
];

const initialWorld: WorldState = {
  time: INITIAL_DATE,
  dayNumber: 1,
  timeOfDay: 'morning',
  weather: createWeatherState(),
  location: '青石驿',
  locationHistory: [],
  electricity: false,
  electricityStability: 0,
  internet: false,
  internetSpeed: 0,
  water: true,
  waterQuality: 85,
  gas: true,
  miasmaRate: 0.3,
  chaosLevel: 18,
  governmentControl: 65,
  militaryPresence: 10,
  civilianMorale: 72,
  resourceScarcity: 12,
  currencySystem: { silverToCopper: 100, marketIndex: 95, taxRate: 5 },
  safeZones: ['云岫镇', '青石驿'],
  dangerZones: ['黑水峡'],
  forbiddenZones: [],
  globalEvents: [],
  activeQuests: [],
  currentNoiseLevel: 10,
};

const initialLocations: Location[] = [
  { id: 'loc_qingshi_yi', name: '青石驿', type: 'building', description: '驿站庭院石砖斑驳，马槽空置，檐下风铃轻响。', isExplored: true, isLocked: false, dangerLevel: 10, noiseLevel: 15, lightLevel: 70, hasElectricity: false, hasWater: true, lootTable: ['document', 'food_common'], isLooted: false, connectedLocations: ['loc_yunxiu_town', 'loc_mountain_path', 'loc_willow_teahouse'], npcsPresent: ['npc_master_liu', 'npc_yan_ru'], hostilePresent: 0, events: [], notes: '驿站往来消息集中之地' },
  { id: 'loc_yunxiu_town', name: '云岫镇', type: 'building', description: '山脚小镇，人烟尚在，但坊间流言四起。', isExplored: false, isLocked: false, dangerLevel: 20, noiseLevel: 25, lightLevel: 80, hasElectricity: false, hasWater: true, lootTable: ['food_common', 'medicine_common', 'misc_item'], isLooted: false, connectedLocations: ['loc_qingshi_yi', 'loc_market', 'loc_river_ford'], npcsPresent: ['npc_he_ning'], hostilePresent: 0, events: [], notes: '可打探消息' },
  { id: 'loc_willow_teahouse', name: '柳影茶肆', type: 'room', description: '茶香淡淡，客商稀少，角落里有人低声议论江湖传闻。', isExplored: false, isLocked: false, dangerLevel: 15, noiseLevel: 10, lightLevel: 60, hasElectricity: false, hasWater: true, lootTable: ['food_common', 'document'], isLooted: false, connectedLocations: ['loc_qingshi_yi', 'loc_yunxiu_town'], npcsPresent: [], hostilePresent: 0, events: [], notes: '情报与交易的角落' },
  { id: 'loc_market', name: '云岫镇集市', type: 'outdoor', description: '摊贩零落，布幌翻动，偶有行人匆匆。', isExplored: false, isLocked: false, dangerLevel: 25, noiseLevel: 35, lightLevel: 90, hasElectricity: false, hasWater: true, lootTable: ['food_common', 'tool_common', 'misc_item'], isLooted: false, connectedLocations: ['loc_yunxiu_town'], npcsPresent: ['npc_qi_xuan'], hostilePresent: 0, events: [], notes: '可能找到补给' },
  { id: 'loc_river_ford', name: '渡口', type: 'outdoor', description: '江水湍急，木舟泊岸，渡夫不见踪影。', isExplored: false, isLocked: false, dangerLevel: 30, noiseLevel: 20, lightLevel: 85, hasElectricity: false, hasWater: true, lootTable: ['tool_common', 'misc_item'], isLooted: false, connectedLocations: ['loc_yunxiu_town', 'loc_mountain_path'], npcsPresent: [], hostilePresent: 0, events: [], notes: '可通往山道' },
  { id: 'loc_mountain_path', name: '山道', type: 'outdoor', description: '山道蜿蜒，林影重重，偶有野兽痕迹。', isExplored: false, isLocked: false, dangerLevel: 45, noiseLevel: 15, lightLevel: 60, hasElectricity: false, hasWater: false, lootTable: ['material', 'medicine_common'], isLooted: false, connectedLocations: ['loc_qingshi_yi', 'loc_river_ford', 'loc_blackwater_valley'], npcsPresent: ['npc_zhou_feng'], hostilePresent: 0, events: [], notes: '危机四伏' },
  { id: 'loc_blackwater_valley', name: '黑水峡', type: 'outdoor', description: '峡谷阴冷，雾气缭绕，传闻多有亡命之徒出没。', isExplored: false, isLocked: false, dangerLevel: 70, noiseLevel: 10, lightLevel: 30, hasElectricity: false, hasWater: false, lootTable: ['weapon_improvised', 'misc_item'], isLooted: false, connectedLocations: ['loc_mountain_path'], npcsPresent: [], hostilePresent: 0, events: [], notes: '危险禁地' },
];

const createLog = (id: string, text: string, type: LogEntry['type'], timestamp: number = INITIAL_DATE): LogEntry => ({ id, timestamp, gameTime: timestamp, text, type, importance: 3 });

const initialLogs: LogEntry[] = [
  createLog('init_title', '═══════════════════════════════════════\n卷一：江湖初行\n═══════════════════════════════════════', 'system'),
  createLog('init_1', '【大梁·元景三年 四月十二日 辰时】', 'system'),
  createLog('init_2', '江湖风雨将起，而你的身份、过往、目标与模样，尚待你亲自定下。', 'narrative'),
  createLog('init_3', '【系统提示】请先完成你的出身设定。你创建的角色，就是你在这个世界中的唯一主角。', 'system')
];

const initialSettings: GameSettings = {
  difficulty: 'normal', permadeath: false, autoSave: true, autoSaveInterval: 5, showTutorials: true, textSpeed: 1, fontSize: 16, theme: 'dark', soundEnabled: false, notificationsEnabled: true
};

const initialState: GameState = {
  version: '1.0.0',
  player: { ...initialPlayer, currentCarryWeight: calculateCarryWeight(initialPlayer.inventory) },
  world: initialWorld,
  npcs: initialNPCs,
  locations: initialLocations,
  buildings: [],
  logs: initialLogs,
  storyLogs: [],
  craftingRecipes: [],
  monsterTypes: [],
  gamePhase: 1,
  chapterNumber: 1,
  wordCount: 0,
  settings: initialSettings,
  flags: { tutorial_completed: false, first_yao_seen: false, first_duel: false, found_old_clue: false },
  variables: {},
  history: [],
  createdAt: INITIAL_DATE,
  lastPlayed: Date.now(),
  totalSessions: 1
};

export type Action =
  | { type: 'ADD_LOG'; payload: LogEntry }
  | { type: 'ADD_LOGS'; payload: LogEntry[] }
  | { type: 'CLEAR_LOGS' }
  | { type: 'UPDATE_PLAYER'; payload: Partial<PlayerState> }
  | { type: 'UPDATE_PLAYER_STAT'; payload: { stat: StatKey; value: number } }
  | { type: 'SET_PLAYER_STAT'; payload: { stat: StatKey; value: number } }
  | { type: 'UPDATE_WORLD'; payload: Partial<WorldState> }
  | { type: 'ADVANCE_TIME'; payload: number }
  | { type: 'ADD_ITEM'; payload: Item }
  | { type: 'ADD_ITEMS'; payload: Item[] }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_ITEM'; payload: { id: string; updates: Partial<Item> } }
  | { type: 'UPDATE_NPC'; payload: { id: string; updates: Partial<NPC> } }
  | { type: 'ADD_NPC'; payload: NPC }
  | { type: 'REMOVE_NPC'; payload: string }
  | { type: 'UPDATE_LOCATION'; payload: { id: string; updates: Partial<Location> } }
  | { type: 'ADD_LOCATION'; payload: Location }
  | { type: 'SET_FLAG'; payload: { key: string; value: boolean | number | string } }
  | { type: 'SET_VARIABLE'; payload: { key: string; value: unknown } }
  | { type: 'ADD_CRAFTING_RECIPE'; payload: CraftingRecipe }
  | { type: 'SET_AI_RESPONSE_SUMMARY'; payload: AIResponseSummary }
  | { type: 'LOAD_STATE'; payload: GameState }
  | { type: 'RESET_GAME' }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<GameSettings> }
  | { type: 'ADD_MONSTER_TYPE'; payload: MonsterType }
  | { type: 'REMOVE_MONSTER_TYPE'; payload: string }
  | { type: 'UPDATE_MONSTER_TYPE'; payload: { id: string; updates: Partial<MonsterType> } };

const getTimeOfDay = (timestamp: number): WorldState['timeOfDay'] => {
  const hour = new Date(timestamp).getHours();
  if (hour >= 5 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 13) return 'noon';
  if (hour >= 13 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 19) return 'dusk';
  if (hour >= 19 && hour < 22) return 'evening';
  if (hour >= 22 || hour < 1) return 'night';
  return 'midnight';
};

function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'ADD_LOG':
      return { ...state, logs: [...state.logs, action.payload], wordCount: state.wordCount + action.payload.text.length };
    case 'ADD_LOGS':
      return { ...state, logs: [...state.logs, ...action.payload], wordCount: state.wordCount + action.payload.reduce((sum, log) => sum + log.text.length, 0) };
    case 'CLEAR_LOGS':
      return { ...state, logs: [] };
    case 'UPDATE_PLAYER':
      return { ...state, player: { ...state.player, ...action.payload } };
    case 'UPDATE_PLAYER_STAT': {
      const { stat, value } = action.payload;
      const currentStat = state.player.stats[stat];
      if (!currentStat) return state;
      const newValue = Math.max(0, Math.min(currentStat.max, currentStat.value + value));
      return { ...state, player: { ...state.player, stats: { ...state.player.stats, [stat]: { ...currentStat, value: newValue } } } };
    }
    case 'SET_PLAYER_STAT': {
      const { stat, value } = action.payload;
      const currentStat = state.player.stats[stat];
      if (!currentStat) return state;
      const newValue = Math.max(0, Math.min(currentStat.max, value));
      return { ...state, player: { ...state.player, stats: { ...state.player.stats, [stat]: { ...currentStat, value: newValue } } } };
    }
    case 'UPDATE_WORLD':
      return { ...state, world: { ...state.world, ...action.payload } };
    case 'ADVANCE_TIME': {
      const minutes = action.payload;
      const newTime = state.world.time + minutes * 60 * 1000;
      const hoursPassed = minutes / 60;
      const newStats = { ...state.player.stats };
      Object.keys(newStats).forEach((key) => {
        const stat = newStats[key as StatKey];
        if (stat.decayRate > 0) {
          const decay = stat.decayRate * hoursPassed;
          newStats[key as StatKey] = { ...stat, value: Math.max(0, stat.value - decay) };
        }
      });
      const startDay = new Date(state.world.time).getDate();
      const newDay = new Date(newTime).getDate();
      const dayNumber = state.world.dayNumber + (newDay - startDay);
      const noiseDecay = Math.max(0, state.world.currentNoiseLevel - minutes * 0.2);
      return {
        ...state,
        world: { ...state.world, time: newTime, dayNumber: dayNumber > 0 ? dayNumber : state.world.dayNumber, timeOfDay: getTimeOfDay(newTime), currentNoiseLevel: noiseDecay },
        player: { ...state.player, stats: newStats, totalPlayTime: state.player.totalPlayTime + minutes }
      };
    }
    case 'ADD_ITEM': {
      const existingItem = state.player.inventory.find((i) => i.name === action.payload.name && i.quantity < i.maxStack);
      let nextInventory = state.player.inventory;
      if (existingItem && action.payload.quantity) {
        nextInventory = state.player.inventory.map((i) => i.id === existingItem.id ? { ...i, quantity: Math.min(i.maxStack, i.quantity + action.payload.quantity) } : i);
      } else {
        nextInventory = [...state.player.inventory, action.payload];
      }
      return { ...state, player: { ...state.player, inventory: nextInventory, currentCarryWeight: calculateCarryWeight(nextInventory) } };
    }
    case 'ADD_ITEMS': {
      const nextInventory = [...state.player.inventory];
      action.payload.forEach((item) => {
        const existing = nextInventory.find((i) => i.name === item.name && i.quantity < i.maxStack);
        if (existing) existing.quantity = Math.min(existing.maxStack, existing.quantity + item.quantity);
        else nextInventory.push(item);
      });
      return { ...state, player: { ...state.player, inventory: nextInventory, currentCarryWeight: calculateCarryWeight(nextInventory) } };
    }
    case 'REMOVE_ITEM': {
      const nextInventory = state.player.inventory.filter((i) => i.id !== action.payload);
      return { ...state, player: { ...state.player, inventory: nextInventory, currentCarryWeight: calculateCarryWeight(nextInventory) } };
    }
    case 'UPDATE_ITEM': {
      const nextInventory = state.player.inventory.map((i) => i.id === action.payload.id ? { ...i, ...action.payload.updates } : i);
      return { ...state, player: { ...state.player, inventory: nextInventory, currentCarryWeight: calculateCarryWeight(nextInventory) } };
    }
    case 'UPDATE_NPC':
      return { ...state, npcs: state.npcs.map((npc) => {
        if (npc.id !== action.payload.id) return npc;
        const updates = { ...action.payload.updates } as Partial<NPC>;
        if (updates.gender === 'male') {
          updates.isPregnant = false;
          updates.pregnancyWeeks = 0;
        }
        return { ...npc, ...updates, modifiedAt: Date.now() };
      }) };
    case 'ADD_NPC':
      return { ...state, npcs: [...state.npcs, action.payload] };
    case 'REMOVE_NPC':
      return { ...state, npcs: state.npcs.filter((n) => n.id !== action.payload) };
    case 'UPDATE_LOCATION':
      return { ...state, locations: state.locations.map((loc) => loc.id === action.payload.id ? { ...loc, ...action.payload.updates } : loc) };
    case 'ADD_LOCATION':
      return { ...state, locations: [...state.locations, action.payload] };
    case 'SET_FLAG':
      return { ...state, flags: { ...state.flags, [action.payload.key]: action.payload.value } };
    case 'SET_VARIABLE':
      return { ...state, variables: { ...state.variables, [action.payload.key]: action.payload.value } };
    case 'ADD_CRAFTING_RECIPE':
      return { ...state, craftingRecipes: [...state.craftingRecipes, action.payload] };
    case 'SET_AI_RESPONSE_SUMMARY':
      return { ...state, lastAIResponseSummary: action.payload };
    case 'LOAD_STATE':
      return { ...action.payload, lastPlayed: Date.now() };
    case 'RESET_GAME':
      return { ...initialState, createdAt: Date.now(), lastPlayed: Date.now() };
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'ADD_MONSTER_TYPE':
      return { ...state, monsterTypes: [...(state.monsterTypes || []), action.payload] };
    case 'REMOVE_MONSTER_TYPE':
      return { ...state, monsterTypes: (state.monsterTypes || []).filter((m) => m.id !== action.payload) };
    case 'UPDATE_MONSTER_TYPE':
      return { ...state, monsterTypes: (state.monsterTypes || []).map((m) => m.id === action.payload.id ? { ...m, ...action.payload.updates } : m) };
    default:
      return state;
  }
}

interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<Action>;
  addLog: (text: string, type: LogEntry['type'], importance?: number) => void;
  addItem: (item: Partial<Item> & { name: string }) => void;
  useItem: (itemId: string) => void;
  refillItem: (itemId: string) => void;
  moveToLocation: (locationId: string) => void;
  talkToNPC: (npcId: string, message: string) => void;
  deepenRelationship: (npcId: string, actionType: 'care' | 'gift' | 'confess' | 'comfort' | 'protect' | 'flirt') => void;
  setRomanceState: (npcId: string, updates: Partial<RomanceState>) => void;
  searchLocation: () => void;
  rest: (hours: number) => void;
  drinkWater: () => void;
  lookAround: () => void;
  barricadeLocation: () => void;
  assignNPCTask: (npcId: string, task: string) => void;
  addNoise: (level: number, reason?: string) => void;
  spendMoney: (silver: number, copper: number, reason: string) => boolean;
  earnMoney: (silver: number, copper: number, reason: string) => void;
  stayAtInn: (quality: 'basic' | 'standard' | 'luxury') => void;
  buyFood: (foodType: string) => void;
  drinkTea: (teaType: string) => void;
  sellItem: (itemId: string) => void;
  triggerAIGeneration: (action: string) => void;
  setAICallback: (callback: ((action: string) => Promise<void>) | null) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [aiCallback, setAICallbackState] = useState<((action: string) => Promise<void>) | null>(null);

  useEffect(() => {
    const saved = SAVE_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.version === initialState.version || parsed.player?.name) dispatch({ type: 'LOAD_STATE', payload: parsed });
      } catch (e) {
        logger.storage.error('Failed to load save', e);
      }
    }
  }, []);

  useEffect(() => {
    if (state.settings.autoSave) {
      const timer = setTimeout(() => {
        localStorage.setItem(PRIMARY_SAVE_KEY, JSON.stringify(state));
        SAVE_KEYS.filter((key) => key !== PRIMARY_SAVE_KEY).forEach((key) => localStorage.removeItem(key));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  const addLog = (text: string, type: LogEntry['type'], importance: number = 3) => {
    dispatch({ type: 'ADD_LOG', payload: { id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, timestamp: Date.now(), gameTime: state.world.time, text, type, importance } });
  };

  const addItem = (item: Partial<Item> & { name: string }) => {
    const newItem: Item = { id: `item_${Date.now()}`, description: '', type: 'misc', rarity: 'common', quantity: 1, maxStack: 99, weight: 0.1, isConsumable: false, isReusable: true, createdAt: Date.now(), modifiedAt: Date.now(), ...item };
    dispatch({ type: 'ADD_ITEM', payload: newItem });
    addLog(`获得物品: ${newItem.name}`, 'system', 2);
  };

  const updateNpcCore = (npcId: string, updates: Partial<NPC>) => dispatch({ type: 'UPDATE_NPC', payload: { id: npcId, updates } });

  const deepenRelationship = (npcId: string, actionType: 'care' | 'gift' | 'confess' | 'comfort' | 'protect' | 'flirt') => {
    const npc = state.npcs.find((n) => n.id === npcId);
    if (!npc) return;
    const current = npc.romance || createRomanceState();
    const playerPref = state.player.romancePreference || 'female';
    const npcPref = npc.romancePreference || (npc.gender === 'female' ? 'male' : npc.gender === 'male' ? 'female' : 'both');
    const playerCanLove = playerPref === 'both' || playerPref === npc.gender;
    const npcCanLove = npcPref === 'both' || npcPref === state.player.gender;
    const romanceCompatible = playerCanLove && npcCanLove;
    let delta = { affinity: 0, attraction: 0, trust: 0, intimacy: 0, commitment: 0, jealousy: 0 };
    let text = '';
    switch (actionType) {
      case 'care':
        delta = { affinity: 8, attraction: 2, trust: 8, intimacy: 4, commitment: 2, jealousy: 0 };
        text = `你在细微处照顾了${npc.name}，对方神情明显柔和了些。`;
        break;
      case 'gift':
        delta = { affinity: 6, attraction: 3, trust: 4, intimacy: 2, commitment: 1, jealousy: 0 };
        text = `你送给${npc.name}一份心意，对方沉默片刻，轻声道了谢。`;
        break;
      case 'comfort':
        delta = { affinity: 10, attraction: 2, trust: 10, intimacy: 6, commitment: 2, jealousy: 0 };
        text = `你安抚了${npc.name}起伏不定的情绪，对方眼中的戒备少了几分。`;
        break;
      case 'protect':
        delta = { affinity: 12, attraction: 8, trust: 12, intimacy: 8, commitment: 6, jealousy: 0 };
        text = `关键时刻你选择护在${npc.name}身前，这份举动被她/他牢牢记住。`;
        break;
      case 'flirt':
        if (romanceCompatible) {
          delta = { affinity: 3, attraction: 8, trust: 1, intimacy: 5, commitment: 1, jealousy: 2 };
          text = `你用略带试探的语气撩拨了${npc.name}一下，气氛悄悄变了。`;
        } else {
          delta = { affinity: 2, attraction: 0, trust: 1, intimacy: 0, commitment: 0, jealousy: 0 };
          text = `你试着靠近${npc.name}，但对方只是把这份善意当作普通亲近。`;
        }
        break;
      case 'confess':
        if (romanceCompatible) {
          delta = { affinity: 6, attraction: 10, trust: 6, intimacy: 8, commitment: 15, jealousy: 0 };
          text = `你向${npc.name}坦露了自己的心意，这让两人的关系越过了原本的界限。`;
        } else {
          delta = { affinity: 2, attraction: 0, trust: 2, intimacy: 0, commitment: 0, jealousy: 0 };
          text = `你向${npc.name}坦白了情感，可对方只把这份话语收作信任，而非情爱。`;
        }
        break;
    }
    const next: RomanceState = {
      ...current,
      affinity: Math.max(0, Math.min(100, current.affinity + delta.affinity)),
      attraction: Math.max(0, Math.min(100, current.attraction + delta.attraction)),
      trust: Math.max(0, Math.min(100, current.trust + delta.trust)),
      intimacy: Math.max(0, Math.min(100, current.intimacy + delta.intimacy)),
      commitment: Math.max(0, Math.min(100, current.commitment + delta.commitment)),
      jealousy: Math.max(0, Math.min(100, current.jealousy + delta.jealousy)),
      confessed: current.confessed || actionType === 'confess',
      lastBondTime: state.world.time,
      memories: [...current.memories, `${new Date(state.world.time).toLocaleString('zh-CN')}:${actionType}`].slice(-12),
    };

    let stage: RomanceState['stage'] = next.stage;
    if (romanceCompatible) {
      if (next.commitment >= 75 && next.trust >= 75) stage = 'lover';
      else if (next.intimacy >= 50 || next.affinity >= 55) stage = 'close';
      else if (next.attraction >= 25 || next.affinity >= 25) stage = 'interested';
    } else {
      stage = next.affinity >= 25 || next.trust >= 25 ? 'close' : 'none';
      next.attraction = 0;
      next.intimacy = Math.min(next.intimacy, 20);
      next.commitment = 0;
      next.exclusive = false;
      next.loverId = undefined;
    }
    next.stage = stage;
    if (stage === 'lover' && romanceCompatible) {
      next.exclusive = true;
      next.loverId = npc.id;
    }

    updateNpcCore(npcId, {
      relation: Math.min(100, npc.relation + Math.max(2, Math.floor((delta.affinity + delta.trust) / 4))),
      trust: Math.min(100, npc.trust + Math.max(1, Math.floor(delta.trust / 2))),
      romance: next,
      mood: actionType === 'confess' ? '心绪起伏' : '柔和'
    });

    const currentPartnerId = stage === 'lover' ? npc.id : state.player.romance.currentPartnerId;
    dispatch({ type: 'UPDATE_PLAYER', payload: { romance: { ...state.player.romance, currentPartnerId, history: [...state.player.romance.history, { npcId, stage, timestamp: state.world.time, note: actionType }].slice(-30) } } });
    addLog(text, 'romance', 3);
  };

  const setRomanceState = (npcId: string, updates: Partial<RomanceState>) => {
    const npc = state.npcs.find((n) => n.id === npcId);
    if (!npc) return;
    const current = npc.romance || createRomanceState();
    const merged = { ...current, ...updates };
    updateNpcCore(npcId, { romance: merged });
  };

  const useItem = (itemId: string) => {
    const item = state.player.inventory.find((i) => i.id === itemId);
    if (!item) return;
    dispatch({ type: 'UPDATE_PLAYER_STAT', payload: { stat: 'stamina', value: -4 } });
    if (item.name.includes('碎银')) {
      dispatch({ type: 'UPDATE_PLAYER', payload: { currency: { ...state.player.currency, silver: state.player.currency.silver + 1 } } });
      addLog('你将碎银收好，盘缠增加了。', 'system', 1);
      dispatch({ type: 'REMOVE_ITEM', payload: item.id });
      return;
    }
    if (item.name.includes('铜钱')) {
      dispatch({ type: 'UPDATE_PLAYER', payload: { currency: { ...state.player.currency, copper: state.player.currency.copper + 50 } } });
      addLog('你将铜钱串拆开计入盘缠。', 'system', 1);
      dispatch({ type: 'REMOVE_ITEM', payload: item.id });
      return;
    }
    if (item.type === 'document' && item.name.includes('师门')) {
      dispatch({ type: 'UPDATE_PLAYER', payload: { jianghuFame: state.player.jianghuFame + 1 } });
      addLog('你摩挲着师门信物，心中更坚定了追寻真相的念头。名望+1。', 'system', 2);
    }
    if (item.effects && item.effects.length > 0) item.effects.forEach((effect) => dispatch({ type: 'UPDATE_PLAYER_STAT', payload: { stat: effect.stat, value: effect.value } }));
    if (item.maxUses !== undefined) {
      const currentUses = item.currentUses ?? item.maxUses;
      if (currentUses <= 0) {
        addLog(`${item.name}已经用完了。`, 'warning', 2);
        return;
      }
      const newUses = currentUses - 1;
      dispatch({ type: 'UPDATE_ITEM', payload: { id: itemId, updates: { currentUses: newUses } } });
      addLog(`使用了 ${item.name} (剩余${newUses}次)`, 'system', 2);
      if (newUses <= 0 && item.isConsumable) dispatch({ type: 'REMOVE_ITEM', payload: itemId });
      return;
    }
    if (item.isConsumable) {
      if (item.quantity > 1) dispatch({ type: 'UPDATE_ITEM', payload: { id: itemId, updates: { quantity: item.quantity - 1 } } });
      else dispatch({ type: 'REMOVE_ITEM', payload: itemId });
      addLog(`使用了 ${item.name}`, 'system', 2);
      return;
    }
    if (item.durability !== undefined && item.maxDurability !== undefined) {
      const newDurability = Math.max(0, item.durability - 10);
      if (newDurability <= 0) {
        dispatch({ type: 'REMOVE_ITEM', payload: itemId });
        addLog(`${item.name}已经完全损坏了！`, 'warning', 3);
      } else {
        dispatch({ type: 'UPDATE_ITEM', payload: { id: itemId, updates: { durability: newDurability } } });
        addLog(`使用了 ${item.name} (耐久度${newDurability}%)`, 'system', 2);
      }
      return;
    }
    addLog(`使用了 ${item.name}`, 'system', 2);
  };

  const moveToLocation = (locationId: string) => {
    const location = state.locations.find((l) => l.id === locationId);
    if (!location) return;
    if (location.isLocked) {
      addLog(`${location.name} 的门锁着，无法进入。`, 'warning', 3);
      return;
    }
    dispatch({ type: 'UPDATE_WORLD', payload: { location: location.name, locationHistory: [...state.world.locationHistory, state.world.location] } });
    dispatch({ type: 'ADVANCE_TIME', payload: 5 });
    dispatch({ type: 'UPDATE_PLAYER_STAT', payload: { stat: 'energy', value: -3 } });
    dispatch({ type: 'UPDATE_PLAYER_STAT', payload: { stat: 'stamina', value: -6 } });
    dispatch({ type: 'UPDATE_LOCATION', payload: { id: location.id, updates: { isExplored: true } } });
    addNoise(6, '脚步声');
    addLog(`你小心翼翼地移动到了 ${location.name}`, 'narrative', 2);
  };

  const talkToNPC = (npcId: string, message: string) => {
    const npc = state.npcs.find((n) => n.id === npcId);
    if (!npc) return;
    addLog(`你对${npc.name}说：\"${message}\"`, 'dialogue', 3);
    addNoise(4, '交谈声');
    const relationBoost = /关心|照顾|安慰|谢谢|小心|你还好/.test(message) ? 2 : 1;
    const romanceBoost = /(喜欢|想你|担心你|陪你|想和你一起|你很重要)/.test(message) ? 1 : 0;
    dispatch({ type: 'UPDATE_NPC', payload: { id: npcId, updates: { relation: Math.min(100, npc.relation + relationBoost), dialogueHistory: [...npc.dialogueHistory, { id: `dia_${Date.now()}`, speaker: 'player', text: message, timestamp: state.world.time }] } } });
    if (romanceBoost > 0) deepenRelationship(npcId, 'flirt');
    dispatch({ type: 'ADVANCE_TIME', payload: 2 });
  };

  const searchLocation = () => {
    const location = state.locations.find((l) => l.name === state.world.location);
    if (!location) return;
    dispatch({ type: 'ADVANCE_TIME', payload: 15 });
    dispatch({ type: 'UPDATE_PLAYER_STAT', payload: { stat: 'energy', value: -5 } });
    dispatch({ type: 'UPDATE_PLAYER_STAT', payload: { stat: 'stamina', value: -8 } });
    addNoise(8, '搜索时翻动杂物');
    if (location.isLooted) {
      addLog('这里已经被搜索过了，没有发现新的物资。', 'system', 2);
      return;
    }
    const lootChance = Math.random();
    if (lootChance > 0.3) {
      const possibleItems = [
        { name: '清水囊', type: 'drink' as const, effects: [{ stat: 'thirst' as StatKey, value: 28 }], isConsumable: true },
        { name: '干粮', type: 'food' as const, effects: [{ stat: 'hunger' as StatKey, value: 18 }], isConsumable: true },
        { name: '止血散', type: 'medicine' as const, effects: [{ stat: 'health' as StatKey, value: 12 }], isConsumable: true },
        { name: '火石', type: 'tool' as const, description: '取火用具' },
        { name: '熬制肉干', type: 'food' as const, effects: [{ stat: 'hunger' as StatKey, value: 22 }, { stat: 'energy' as StatKey, value: 6 }], isConsumable: true },
        { name: '牛皮水袋', type: 'drink' as const, effects: [{ stat: 'thirst' as StatKey, value: 24 }], isConsumable: true },
        { name: '麻绳', type: 'tool' as const, description: '粗麻绳，适合绑扎或攀爬。' },
        { name: '竹筒', type: 'container' as const, description: '可装水或药材。' },
      ];
      const foundItem = possibleItems[Math.floor(Math.random() * possibleItems.length)];
      addItem({ ...foundItem, id: `found_${Date.now()}` });
      addLog(`搜索发现了 ${foundItem.name}！`, 'discovery', 3);
    } else addLog('仔细搜索后，没有发现有用的东西。', 'system', 2);
    dispatch({ type: 'UPDATE_LOCATION', payload: { id: location.id, updates: { isLooted: true } } });
  };

  const rest = (hours: number) => {
    const location = state.locations.find((l) => l.name === state.world.location);
    if (location && location.dangerLevel > 30) {
      addLog('这里太危险了，无法安心休息。', 'warning', 3);
      return;
    }
    dispatch({ type: 'ADVANCE_TIME', payload: hours * 60 });
    dispatch({ type: 'UPDATE_PLAYER_STAT', payload: { stat: 'energy', value: hours * 15 } });
    dispatch({ type: 'UPDATE_PLAYER_STAT', payload: { stat: 'sanity', value: hours * 5 } });
    dispatch({ type: 'UPDATE_PLAYER_STAT', payload: { stat: 'health', value: hours * 2 } });
    dispatch({ type: 'UPDATE_PLAYER_STAT', payload: { stat: 'stamina', value: hours * 20 } });
    addLog(`休息了${hours}小时，精力恢复了一些。`, 'system', 2);
  };

  const drinkWater = () => {
    const location = state.locations.find((l) => l.name === state.world.location);
    if (location?.hasWater && state.world.water) {
      dispatch({ type: 'UPDATE_PLAYER_STAT', payload: { stat: 'thirst', value: 20 } });
      dispatch({ type: 'UPDATE_PLAYER_STAT', payload: { stat: 'stamina', value: 6 } });
      dispatch({ type: 'ADVANCE_TIME', payload: 2 });
      addLog('你喝了些水，感觉好多了。', 'system', 2);
    } else addLog('这里没有可用的水源。', 'warning', 2);
  };

  const refillItem = (itemId: string) => {
    const item = state.player.inventory.find((i) => i.id === itemId);
    if (!item) return;
    if (!item.canRefill) {
      addLog(`${item.name}无法重新填充。`, 'warning', 2);
      return;
    }
    const location = state.locations.find((l) => l.name === state.world.location);
    if (item.refillSource === 'water') {
      if (location?.hasWater && state.world.water) {
        dispatch({ type: 'UPDATE_ITEM', payload: { id: itemId, updates: { currentUses: item.maxUses, description: `${item.name}重新装满了清水。` } } });
        dispatch({ type: 'ADVANCE_TIME', payload: 2 });
        addLog(`你重新装满了${item.name}。`, 'system', 2);
      } else addLog('这里没有可用的水源来填充。', 'warning', 2);
    }
  };

  const lookAround = () => {
    const location = state.locations.find((l) => l.name === state.world.location);
    if (!location) return;
    const nearbyNPCs = state.npcs.filter((n) => n.location === state.world.location && n.status !== 'dead');
    const connectedLocs = location.connectedLocations.map((id) => state.locations.find((l) => l.id === id)).filter(Boolean);
    let description = `【${location.name}】\n${location.description}\n\n`;
    if (nearbyNPCs.length > 0) description += `👥 附近的人：${nearbyNPCs.map((n) => n.name).join('、')}\n`;
    if (connectedLocs.length > 0) description += `🚪 可以前往：${connectedLocs.map((l) => l!.name).join('、')}\n`;
    description += `\n💡 光线：${location.lightLevel > 50 ? '明亮' : location.lightLevel > 20 ? '昏暗' : '黑暗'}`;
    description += `\n⚠️ 危险等级：${location.dangerLevel}%`;
    description += `\n🧭 江湖名望：${state.player.jianghuFame}  ·  侠义值：${state.player.morality}`;
    addLog(description, 'narrative', 3);
    dispatch({ type: 'ADVANCE_TIME', payload: 1 });
    dispatch({ type: 'UPDATE_PLAYER_STAT', payload: { stat: 'stamina', value: -2 } });
  };

  const barricadeLocation = () => {
    const location = state.locations.find((l) => l.name === state.world.location);
    if (!location) return;
    if (location.isLocked) return addLog('门已锁死，无法从内部加固。', 'warning', 3);
    if (location.dangerLevel <= 10) return addLog('当前区域已经相对安全，无需加固。', 'system', 2);
    const woodPlank = state.player.inventory.find((i) => i.name.includes('木板'));
    const nails = state.player.inventory.find((i) => i.name.includes('铁钉'));
    if (!woodPlank || !nails) return addLog('需要木板和铁钉才能加固。', 'warning', 3);
    dispatch({ type: 'UPDATE_ITEM', payload: { id: woodPlank.id, updates: { quantity: Math.max(0, woodPlank.quantity - 1) } } });
    dispatch({ type: 'UPDATE_ITEM', payload: { id: nails.id, updates: { quantity: Math.max(0, nails.quantity - 2) } } });
    dispatch({ type: 'UPDATE_LOCATION', payload: { id: location.id, updates: { dangerLevel: Math.max(0, location.dangerLevel - 10), noiseLevel: Math.max(0, location.noiseLevel - 5), notes: `${location.notes}\n已加固：门窗封板。` } } });
    addNoise(15, '加固门窗的敲打声');
    addLog('你用木板和铁钉加固了门窗，安全性提升。', 'system', 3);
    dispatch({ type: 'ADVANCE_TIME', payload: 20 });
    dispatch({ type: 'UPDATE_PLAYER_STAT', payload: { stat: 'energy', value: -10 } });
    dispatch({ type: 'UPDATE_PLAYER_STAT', payload: { stat: 'stamina', value: -12 } });
  };

  const assignNPCTask = (npcId: string, task: string) => {
    const npc = state.npcs.find((n) => n.id === npcId);
    if (!npc) return;
    dispatch({ type: 'UPDATE_NPC', payload: { id: npcId, updates: { currentAction: task, goals: Array.from(new Set([task, ...npc.goals])) } } });
    addLog(`${npc.name}开始执行任务：${task}`, 'system', 2);
  };

  const addNoise = (level: number, _reason?: string) => {
    const newNoise = Math.min(100, state.world.currentNoiseLevel + level);
    dispatch({ type: 'UPDATE_WORLD', payload: { currentNoiseLevel: newNoise, lastLoudNoise: { level, timestamp: Date.now(), location: state.world.location } } });
  };

  const triggerAIGeneration = useCallback((action: string) => {
    if (aiCallback) {
      aiCallback(action).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        logger.ai.error('AI generation error:', err);
        addLog(`【系统错误】AI生成失败: ${message}`, 'warning', 5);
      });
    }
  }, [aiCallback]);

  const setAICallback = useCallback((callback: ((action: string) => Promise<void>) | null) => { setAICallbackState(() => callback); }, []);

  const spendMoney = (silver: number, copper: number, reason: string): boolean => {
    const marketRate = Math.max(0.8, Math.min(1.35, state.world.currencySystem.marketIndex / 100));
    const fameDiscount = state.player.jianghuFame >= 80 ? 0.85 : state.player.jianghuFame >= 50 ? 0.92 : state.player.jianghuFame >= 20 ? 0.96 : 1;
    const finalCopperNeed = Math.ceil((silver * 100 + copper) * marketRate * fameDiscount);
    const totalCopperHave = state.player.currency.silver * 100 + state.player.currency.copper;
    if (totalCopperHave < finalCopperNeed) {
      addLog(`银钱不足！需要约${Math.floor(finalCopperNeed / 100)}两${finalCopperNeed % 100}文，但你只有${state.player.currency.silver}两${state.player.currency.copper}文。`, 'warning', 3);
      return false;
    }
    const remainingCopper = totalCopperHave - finalCopperNeed;
    dispatch({ type: 'UPDATE_PLAYER', payload: { currency: { silver: Math.floor(remainingCopper / 100), copper: remainingCopper % 100 } } });
    addLog(`💰 ${reason}，花费${Math.floor(finalCopperNeed / 100)}两${finalCopperNeed % 100}文。`, 'system', 2);
    return true;
  };

  const earnMoney = (silver: number, copper: number, reason: string) => {
    let newCopper = state.player.currency.copper + copper;
    let newSilver = state.player.currency.silver + silver;
    if (newCopper >= 100) {
      newSilver += Math.floor(newCopper / 100);
      newCopper %= 100;
    }
    dispatch({ type: 'UPDATE_PLAYER', payload: { currency: { silver: newSilver, copper: newCopper } } });
    addLog(`💰 ${reason}，获得${silver > 0 ? silver + '两银子' : ''}${copper > 0 ? copper + '文' : ''}。`, 'discovery', 2);
  };

  const stayAtInn = (quality: 'basic' | 'standard' | 'luxury') => {
    const location = state.locations.find((l) => l.name === state.world.location);
    const hour = new Date(state.world.time).getHours();
    const isInn = location?.name.includes('驿') || location?.name.includes('客栈') || location?.name.includes('茶');
    if (!isInn) return addLog('这里不是客栈或驿站，无法投宿。', 'warning', 3);
    if (hour >= 10 && hour <= 14 && quality === 'luxury') return addLog('掌柜拱手道："上房正在收拾，客官晚些再来。"', 'dialogue', 2);
    const innPrices = {
      basic: { silver: 0, copper: 30, energy: 40, sanity: 10, hours: 6, desc: '通铺大通间' },
      standard: { silver: 0, copper: 80, energy: 60, sanity: 20, hours: 8, desc: '单间客房' },
      luxury: { silver: 2, copper: 0, energy: 80, sanity: 35, hours: 10, desc: '上等雅间' }
    };
    const inn = innPrices[quality];
    if (!spendMoney(inn.silver, inn.copper, `住店(${inn.desc})`)) return;
    dispatch({ type: 'ADVANCE_TIME', payload: inn.hours * 60 });
    dispatch({ type: 'UPDATE_PLAYER_STAT', payload: { stat: 'energy', value: inn.energy } });
    dispatch({ type: 'UPDATE_PLAYER_STAT', payload: { stat: 'sanity', value: inn.sanity } });
    dispatch({ type: 'UPDATE_PLAYER_STAT', payload: { stat: 'stamina', value: inn.hours * 12 } });
    dispatch({ type: 'UPDATE_PLAYER_STAT', payload: { stat: 'health', value: inn.hours * 2 } });
    addLog(`你在${location?.name || '客栈'}住了一晚，休息了${inn.hours}个时辰。`, 'narrative', 3);
  };

  const buyFood = (foodType: string) => {
    const location = state.locations.find((l) => l.name === state.world.location);
    const hour = new Date(state.world.time).getHours();
    const isShop = location?.name.includes('集市') || location?.name.includes('茶') || location?.name.includes('镇') || location?.name.includes('驿');
    if (!isShop) return addLog('这里没有卖吃食的地方。', 'warning', 3);
    if (hour >= 22 || hour < 5) {
      addLog('夜色已深，大多数摊贩都收摊了，只能勉强买到极少的吃食。', 'warning', 2);
      if (!['馒头', '干粮', '肉干'].includes(foodType)) return;
    }
    const foodMenu: Record<string, { silver: number; copper: number; hunger: number; thirst: number; energy: number; desc: string; type?: Item['type'] }> = {
      馒头: { silver: 0, copper: 3, hunger: 15, thirst: 0, energy: 5, desc: '热腾腾的白面馒头', type: 'food' },
      包子: { silver: 0, copper: 5, hunger: 20, thirst: 0, energy: 8, desc: '肉馅包子，香气扑鼻', type: 'food' },
      面条: { silver: 0, copper: 8, hunger: 25, thirst: 5, energy: 10, desc: '一碗热汤面', type: 'food' },
      烧鸡: { silver: 0, copper: 25, hunger: 40, thirst: 0, energy: 20, desc: '酥香烧鸡', type: 'food' },
      酒菜: { silver: 0, copper: 50, hunger: 35, thirst: 30, energy: 15, desc: '一壶酒，两碟小菜', type: 'food' },
      素斋: { silver: 0, copper: 15, hunger: 22, thirst: 5, energy: 12, desc: '清淡素斋', type: 'food' },
      干粮: { silver: 0, copper: 10, hunger: 18, thirst: 0, energy: 5, desc: '便于携带的干粮饼', type: 'food' },
      肉干: { silver: 0, copper: 20, hunger: 28, thirst: -5, energy: 15, desc: '熏制肉干', type: 'food' }
    };
    const food = foodMenu[foodType];
    if (!food) return addLog(`没有"${foodType}"这种吃食。`, 'warning', 2);
    if (!spendMoney(food.silver, food.copper, `买${foodType}`)) return;

    const boughtItem = createItem({
      id: `shop_food_${Date.now()}`,
      name: foodType,
      description: food.desc,
      type: food.type || 'food',
      isConsumable: true,
      quantity: 1,
      effects: [
        { stat: 'hunger', value: food.hunger },
        ...(food.thirst !== 0 ? [{ stat: 'thirst' as StatKey, value: food.thirst }] : []),
        ...(food.energy !== 0 ? [{ stat: 'energy' as StatKey, value: food.energy }] : []),
      ]
    });

    dispatch({ type: 'ADD_ITEM', payload: boughtItem });
    dispatch({ type: 'ADVANCE_TIME', payload: 6 });
    addLog(`你买下了${food.desc}，已收入行囊，随时都能食用。`, 'narrative', 2);
  };

  const drinkTea = (teaType: string) => {
    const location = state.locations.find((l) => l.name === state.world.location);
    const hour = new Date(state.world.time).getHours();
    const isTeahouse = location?.name.includes('茶') || location?.name.includes('驿') || location?.name.includes('客栈');
    if (!isTeahouse) return addLog('这里没有茶水供应。', 'warning', 3);
    if (hour >= 1 && hour < 5) return addLog('此时店中灯火昏暗，伙计多半都睡了，没人给你沏茶。', 'warning', 2);
    const teaMenu: Record<string, { silver: number; copper: number; thirst: number; sanity: number; energy: number; desc: string }> = {
      粗茶: { silver: 0, copper: 2, thirst: 20, sanity: 3, energy: 2, desc: '普通粗茶，解渴而已' },
      清茶: { silver: 0, copper: 8, thirst: 25, sanity: 8, energy: 5, desc: '清香淡雅的绿茶' },
      龙井: { silver: 0, copper: 30, thirst: 30, sanity: 15, energy: 10, desc: '上好龙井，香气四溢' },
      药茶: { silver: 0, copper: 20, thirst: 15, sanity: 5, energy: 8, desc: '加了草药的茶，略带苦涩' },
      酒: { silver: 0, copper: 15, thirst: 10, sanity: -5, energy: 8, desc: '一壶浊酒' },
      好酒: { silver: 0, copper: 40, thirst: 15, sanity: -3, energy: 12, desc: '陈年佳酿' }
    };
    const tea = teaMenu[teaType];
    if (!tea) return addLog(`没有"${teaType}"。`, 'warning', 2);
    if (!spendMoney(tea.silver, tea.copper, `喝${teaType}`)) return;
    dispatch({ type: 'UPDATE_PLAYER_STAT', payload: { stat: 'thirst', value: tea.thirst } });
    dispatch({ type: 'UPDATE_PLAYER_STAT', payload: { stat: 'sanity', value: tea.sanity } });
    dispatch({ type: 'UPDATE_PLAYER_STAT', payload: { stat: 'energy', value: tea.energy } });
    dispatch({ type: 'ADVANCE_TIME', payload: 10 });
    addLog(`你饮了${tea.desc}。`, 'narrative', 2);
  };

  const sellItem = (itemId: string) => {
    const item = state.player.inventory.find((i) => i.id === itemId);
    if (!item) return;
    const location = state.locations.find((l) => l.name === state.world.location);
    const hour = new Date(state.world.time).getHours();
    const isMarket = location?.name.includes('集市') || location?.name.includes('镇') || location?.name.includes('铺');
    if (!isMarket) return addLog('这里没有地方可以卖东西。需要去集市或店铺。', 'warning', 3);
    if (hour >= 20 || hour < 6) return addLog('坊市已散，商贩不愿在夜里收货。', 'warning', 2);
    const basePrice: Record<string, number> = { weapon: 50, medicine: 15, food: 5, drink: 3, tool: 20, material: 10, clothing: 25, document: 30, misc: 5 };
    const rarityMultiplier: Record<string, number> = { common: 1, uncommon: 2, rare: 4, epic: 8, legendary: 20 };
    let price = (basePrice[item.type] || 5) * (rarityMultiplier[item.rarity] || 1);
    price = Math.floor(price * item.quantity * (item.durability ? item.durability / 100 : 1));
    earnMoney(Math.floor(price / 100), price % 100, `卖出${item.name}`);
    dispatch({ type: 'REMOVE_ITEM', payload: itemId });
    dispatch({ type: 'ADVANCE_TIME', payload: 5 });
    addLog(`你将${item.name}卖给了商贩。`, 'system', 2);
  };

  return (
    <GameContext.Provider value={{ state, dispatch, addLog, addItem, useItem, refillItem, moveToLocation, talkToNPC, deepenRelationship, setRomanceState, searchLocation, rest, drinkWater, lookAround, barricadeLocation, assignNPCTask, addNoise, spendMoney, earnMoney, stayAtInn, buyFood, drinkTea, sellItem, triggerAIGeneration, setAICallback }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
};

export { createItem, createNPCStats, createNPCPersonality, createLog };
