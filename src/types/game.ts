// 完整的游戏类型定义系统

export type StatKey = 'health' | 'hunger' | 'thirst' | 'energy' | 'sanity' | 'infection' | 'stamina';

export interface Attribute {
  label: string;
  value: number;
  max: number;
  decayRate: number;
  criticalThreshold: number;
}

export type ItemType = 'consumable' | 'tool' | 'weapon' | 'clothing' | 'medicine' | 'material' | 'key' | 'device' | 'food' | 'drink' | 'ammo' | 'container' | 'document' | 'misc';
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface ItemEffect {
  stat: StatKey;
  value: number;
  duration?: number;
}

export interface Message {
  id: string;
  from: string;
  content: string;
  timestamp: number;
  isRead: boolean;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

export interface ItemInteraction {
  id: string;
  name: string;
  description: string;
  requiredItems?: string[];
  consumesItem?: boolean;
  effects?: ItemEffect[];
  resultItems?: string[];
  timeRequired?: number;
  skillRequired?: { skill: string; level: number };
}

export interface Item {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  rarity: ItemRarity;
  quantity: number;
  maxStack: number;
  weight: number;
  durability?: number;
  maxDurability?: number;
  isEquipped?: boolean;
  isConsumable: boolean;
  isReusable: boolean;
  maxUses?: number;
  currentUses?: number;
  canRefill?: boolean;
  refillSource?: string;
  effects?: ItemEffect[];
  deviceData?: {
    battery?: number;
    maxBattery?: number;
    isOn?: boolean;
    messages?: Message[];
    contacts?: Contact[];
    photos?: string[];
    apps?: string[];
  };
  weaponData?: {
    damage: number;
    range: number;
    accuracy: number;
    noiseLevel: number;
    ammoType?: string;
    currentAmmo?: number;
    maxAmmo?: number;
  };
  containerData?: {
    capacity: number;
    contents: Item[];
  };
  canCombineWith?: string[];
  combineResult?: string;
  combineRecipe?: string;
  cookable?: boolean;
  cookedVersion?: string;
  cookTime?: number;
  needsHeat?: boolean;
  repairable?: boolean;
  repairMaterials?: { name: string; quantity: number }[];
  fuelType?: string;
  fuelAmount?: number;
  maxFuel?: number;
  consumesFuel?: boolean;
  lightRadius?: number;
  useNoiseLevel?: number;
  interactions?: ItemInteraction[];
  createdAt: number;
  modifiedAt: number;
}

export type NPCStatus = 'alive' | 'dead' | 'injured' | 'poisoned' | 'hostile' | 'unconscious' | 'missing' | 'unknown' | 'corrupted' | 'qiDeviated';
export type NPCAttitude = 'hostile' | 'unfriendly' | 'neutral' | 'friendly' | 'allied';
export type RomanceStage = 'none' | 'interested' | 'close' | 'ambiguous' | 'lover' | 'engaged' | 'married' | 'broken';

export interface NPCPersonality {
  bravery: number;
  intelligence: number;
  loyalty: number;
  morality: number;
  aggression: number;
  sociability: number;
}

export interface NPCStats {
  health: number;
  maxHealth: number;
  hunger: number;
  thirst: number;
  energy: number;
  combat: number;
  speed: number;
  perception: number;
  infection: number;
}

export interface NPCMemory {
  id: string;
  event: string;
  timestamp: number;
  emotionalImpact: number;
}

export interface DialogueEntry {
  id: string;
  speaker: 'player' | 'npc';
  text: string;
  timestamp: number;
  mood?: string;
}

export interface RomanceState {
  affinity: number;
  attraction: number;
  jealousy: number;
  trust: number;
  intimacy: number;
  commitment: number;
  stage: RomanceStage;
  exclusive: boolean;
  confessed: boolean;
  confessionPending?: boolean;
  loverId?: string;
  firstMetAt?: number;
  lastBondTime?: number;
  memories: string[];
}

export interface NPCSchedule {
  startHour: number;
  endHour: number;
  location: string;
  activity: string;
}

export interface NPC {
  id: string;
  name: string;
  nickname?: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  romancePreference?: 'male' | 'female' | 'both' | 'none';
  occupation: string;
  description: string;
  fertility: number;
  isPregnant?: boolean;
  pregnancyWeeks?: number;
  appearance: string;
  personality: NPCPersonality;
  personalityTags: string[];
  attitude: NPCAttitude;
  relation: number;
  trust: number;
  fear: number;
  mood?: string;
  location: string;
  previousLocation?: string;
  inventory: Item[];
  equipment: {
    weapon?: Item;
    clothing?: Item[];
    accessory?: Item[];
  };
  status: NPCStatus;
  stats: NPCStats;
  skills: Record<string, number>;
  memories: NPCMemory[];
  dialogueHistory: DialogueEntry[];
  goals: string[];
  currentAction?: string;
  schedule?: NPCSchedule[];
  faction?: string;
  isRecruited: boolean;
  joinedAt?: number;
  romance?: RomanceState;
  secrets?: string[];
  aiPersona?: string;
  notes: string;
  createdAt: number;
  modifiedAt: number;
}

export type LogType = 'narrative' | 'dialogue' | 'system' | 'combat' | 'ai' | 'discovery' | 'warning' | 'death' | 'event' | 'romance' | 'image';

export interface LogEntry {
  id: string;
  timestamp: number;
  gameTime: number;
  text: string;
  type: LogType;
  source?: string;
  importance: number;
  metadata?: Record<string, any>;
}

export type WeatherType = 'clear' | 'cloudy' | 'overcast' | 'drizzle' | 'rain' | 'heavy_rain' | 'thunderstorm' | 'fog' | 'snow' | 'blizzard';
export type TimeOfDay = 'dawn' | 'morning' | 'noon' | 'afternoon' | 'dusk' | 'evening' | 'night' | 'midnight';

export interface WeatherState {
  current: WeatherType;
  temperature: number;
  humidity: number;
  windSpeed: number;
  visibility: number;
  forecast: WeatherType[];
}

export interface Location {
  id: string;
  name: string;
  type: 'room' | 'building' | 'outdoor' | 'underground' | 'vehicle';
  description: string;
  isExplored: boolean;
  isLocked: boolean;
  lockDifficulty?: number;
  requiredKey?: string;
  dangerLevel: number;
  noiseLevel: number;
  lightLevel: number;
  hasElectricity: boolean;
  hasWater: boolean;
  lootTable: string[];
  isLooted: boolean;
  connectedLocations: string[];
  npcsPresent: string[];
  hostilePresent: number;
  events: string[];
  notes: string;
}

export interface Building {
  id: string;
  name: string;
  type: string;
  floors: number;
  locations: Location[];
  isSecured: boolean;
  powerSource?: string;
  waterSource?: string;
}

export interface WorldEvent {
  id: string;
  name: string;
  description: string;
  type: 'global' | 'local' | 'personal';
  severity: number;
  startTime: number;
  endTime?: number;
  effects: Record<string, number>;
  isActive: boolean;
}

export interface QuestObjective {
  id: string;
  description: string;
  isCompleted: boolean;
  progress: number;
  target: number;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  objectives: QuestObjective[];
  rewards: Item[];
  isCompleted: boolean;
  isActive: boolean;
  deadline?: number;
  giver?: string;
}

export interface WorldState {
  time: number;
  dayNumber: number;
  timeOfDay: TimeOfDay;
  weather: WeatherState;
  location: string;
  locationHistory: string[];
  electricity: boolean;
  electricityStability: number;
  internet: boolean;
  internetSpeed: number;
  water: boolean;
  waterQuality: number;
  gas: boolean;
  miasmaRate: number;
  chaosLevel: number;
  governmentControl: number;
  militaryPresence: number;
  civilianMorale: number;
  resourceScarcity: number;
  currencySystem: {
    silverToCopper: number;
    marketIndex: number;
    taxRate: number;
  };
  safeZones: string[];
  dangerZones: string[];
  forbiddenZones: string[];
  globalEvents: WorldEvent[];
  activeQuests: Quest[];
  currentNoiseLevel: number;
  lastLoudNoise?: {
    level: number;
    timestamp: number;
    location: string;
  };
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  level: number;
  maxLevel: number;
  experience: number;
  expToNextLevel: number;
  category: 'combat' | 'survival' | 'social' | 'crafting' | 'stealth' | 'medical';
}

export interface MartialArt {
  id: string;
  name: string;
  level: number;
  description: string;
  style: 'sword' | 'fist' | 'internal' | 'lightness' | 'hidden' | 'mixed';
}

export interface Injury {
  id: string;
  name: string;
  bodyPart: string;
  severity: number;
  healingProgress: number;
  effects: ItemEffect[];
  complicationRisk: number;
  needsTreatment: boolean;
  timestamp: number;
}

export interface Disease {
  id: string;
  name: string;
  stage: number;
  maxStage: number;
  progress: number;
  effects: ItemEffect[];
  isCurable: boolean;
  timestamp: number;
}

export interface Buff {
  id: string;
  name: string;
  description: string;
  effects: ItemEffect[];
  duration: number;
  startTime: number;
  source: string;
}

export interface Debuff {
  id: string;
  name: string;
  description: string;
  effects: ItemEffect[];
  duration: number;
  startTime: number;
  source: string;
}

export interface PlayerMemory {
  id: string;
  event: string;
  timestamp: number;
  location: string;
  importance: number;
  emotionalTag: string;
}

export interface PlayerRomanceState {
  currentPartnerId?: string;
  history: { npcId: string; stage: RomanceStage; timestamp: number; note?: string }[];
  charm: number;
  attachmentStyle: 'secure' | 'avoidant' | 'anxious' | 'balanced';
}

export interface PlayerState {
  name: string;
  nickname?: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  romancePreference?: 'male' | 'female' | 'both' | 'none';
  role: string;
  background: string;
  appearance: string;
  stats: Record<StatKey, Attribute>;
  inventory: Item[];
  equipment: {
    head?: Item;
    body?: Item;
    legs?: Item;
    feet?: Item;
    hands?: Item;
    mainHand?: Item;
    offHand?: Item;
    accessory1?: Item;
    accessory2?: Item;
    backpack?: Item;
  };
  maxCarryWeight: number;
  currentCarryWeight: number;
  skills: Skill[];
  perks: string[];
  traits: string[];
  martialArts: MartialArt[];
  sect?: string;
  jianghuFame: number;
  morality: number;
  currency: {
    silver: number;
    copper: number;
  };
  romance: PlayerRomanceState;
  cultivationStage: number;
  cultivationPath?: string;
  cultivationAbilities: string[];
  relationships: Record<string, number>;
  factions: Record<string, number>;
  injuries: Injury[];
  diseases: Disease[];
  buffs: Buff[];
  debuffs: Debuff[];
  memories: PlayerMemory[];
  achievements: string[];
  killCount: {
    monsters: number;
    humans: number;
    heretics: number;
  };
  position?: { x: number; y: number };
  createdAt: number;
  lastSaved: number;
  totalPlayTime: number;
}

export interface CraftingRecipe {
  id: string;
  name: string;
  description: string;
  category: string;
  ingredients: { itemId: string; quantity: number }[];
  tools: string[];
  result: { itemId: string; quantity: number };
  skillRequired?: { skill: string; level: number };
  craftTime: number;
  isUnlocked: boolean;
}

export interface MonsterType {
  id: string;
  name: string;
  description: string;
  tier: number;
  stats: {
    health: number;
    damage: number;
    speed: number;
    perception: number;
    armor: number;
  };
  abilities: string[];
  weaknesses: string[];
  loot: string[];
  spawnWeight: number;
  evolutionFrom?: string;
  evolutionTo?: string;
}

export interface GameSettings {
  difficulty: 'easy' | 'normal' | 'hard' | 'nightmare' | 'custom';
  permadeath: boolean;
  autoSave: boolean;
  autoSaveInterval: number;
  showTutorials: boolean;
  textSpeed: number;
  fontSize: number;
  theme: 'dark' | 'darker' | 'blood';
  soundEnabled: boolean;
  notificationsEnabled: boolean;
}

export interface GameHistoryEntry {
  id: string;
  timestamp: number;
  action: string;
  result: string;
  stateSnapshot?: Partial<GameState>;
}

/** 最近一次AI响应的摘要，供各子系统面板展示AI影响标记 */
export interface AIResponseSummary {
  /** 是否有修为/武学相关变化 */
  cultivationChanged: boolean;
  /** 新解锁的配方名列表 */
  recipesUnlocked: string[];
  /** 受影响的势力名列表 */
  factionChanges: string[];
  /** 伤势变化数量 */
  injuryChangeCount: number;
  /** 关系变化的NPC名列表 */
  relationChangedNpcNames: string[];
  /** 经济是否发生变化 */
  economyChanged: boolean;
  /** 身体状态是否发生变化 */
  bodyConditionChanged: boolean;
  /** 时间戳 */
  timestamp: number;
}

export interface GameState {
  version: string;
  player: PlayerState;
  world: WorldState;
  npcs: NPC[];
  locations: Location[];
  buildings: Building[];
  logs: LogEntry[];
  storyLogs: LogEntry[];
  craftingRecipes: CraftingRecipe[];
  monsterTypes: MonsterType[];
  gamePhase: number;
  chapterNumber: number;
  wordCount: number;
  settings: GameSettings;
  flags: Record<string, boolean | number | string>;
  variables: Record<string, any>;
  history: GameHistoryEntry[];
  createdAt: number;
  lastPlayed: number;
  totalSessions: number;
  /** AI↔子系统联动：最近一次AI响应的摘要标记 */
  lastAIResponseSummary?: AIResponseSummary;
}

export interface AIResponse {
  story_text: string;
  scene_description?: string;
  time_passed_minutes?: number;
  weather_change?: WeatherType | null;
  new_items?: Partial<Item>[];
  removed_items?: string[];
  npc_updates?: {
    id: string;
    changes: Partial<NPC>;
  }[];
  new_npcs?: Partial<NPC>[];
  player_stat_changes?: Partial<Record<StatKey, number>>;
  player_injuries?: Partial<Injury>[];
  location_change?: string | null;
  new_locations?: Partial<Location>[];
  events?: Partial<WorldEvent>[];
  dialogue?: {
    speaker: string;
    text: string;
    mood?: string;
  }[];
  combat?: {
    description: string;
    damage_dealt: number;
    damage_taken: number;
    enemies_killed: number;
  };
  discoveries?: string[];
  quest_updates?: {
    questId: string;
    objectiveId?: string;
    progress?: number;
    completed?: boolean;
  }[];
  world_state_changes?: Partial<WorldState>;
  reputation_change?: number;
  righteousness_change?: number;
  money_change?: {
    silver?: number;
    copper?: number;
  };
  martial_progress?: {
    skill: string;
    progress: number;
  } | null;
  realm_breakthrough?: {
    newRealm: string;
    level: number;
  } | null;
  flags?: Record<string, boolean | number | string>;
  choices?: {
    id: string;
    text: string;
    consequence_hint?: string;
  }[];
  /** AI→子系统整合：势力声望变更 */
  faction_reputation_changes?: {
    faction: string;
    delta: number;
  }[];
  /** AI→子系统整合：新学到的锻造/配方名 */
  recipe_discoveries?: string[];
  /** AI→子系统整合：新增正面状态 */
  buff_additions?: Partial<Buff>[];
  /** AI→子系统整合：新增负面状态 */
  debuff_additions?: Partial<Debuff>[];
  /** AI→子系统整合：伤势变化（新增/恶化/治愈） */
  injury_changes?: (Partial<Injury> & { healed?: boolean })[];
  /** AI→子系统整合：NPC好感/信任/情感变更 */
  npc_relationship_changes?: {
    npcId?: string;
    npcName?: string;
    relationDelta?: number;
    trustDelta?: number;
    romanceStage?: string;
    affinity?: number;
    event?: string;
  }[];
  /** AI→子系统整合：经济指数变化 */
  economy_changes?: {
    marketIndex?: number;
    taxRate?: number;
    resourceScarcity?: number;
  };
  /** AI→子系统整合：身体状态变化（体温/疲劳） */
  body_condition_changes?: {
    temperature?: number;
    fatigue?: number;
  };
}

export interface AutoParseResult {
  items: { name: string; type: ItemType; description: string; quantity: number }[];
  npcs: { name: string; description: string; status: NPCStatus; relation: number }[];
  timeChange: number;
  locationChange: string | null;
  statChanges: Partial<Record<StatKey, number>>;
  events: string[];
  dialogue: { speaker: string; text: string }[];
  mood: string;
  dangerLevel: number;
  keywords: string[];
}

export interface ParseConfig {
  autoAddItems: boolean;
  autoUpdateNPCs: boolean;
  autoAdvanceTime: boolean;
  autoUpdateStats: boolean;
  parseDialogue: boolean;
  parseEvents: boolean;
}

export interface BirthSettings {
  name: string;
  age: number;
  gender: 'male' | 'female';
  origin: 'beggar' | 'begger' | 'farmer' | 'scholar' | 'soldier' | 'merchant';
  memory: 'webnovel' | 'martial' | 'medical' | 'engineer' | 'history';
  trait: 'resilient' | 'agile' | 'calm' | 'passionate' | 'cold';
  temperament?: string;
  goal?: string;
  bottomLine?: string;
  hiddenEdge?: string;
  customBackground?: string;
}

export interface AIPromptSettings {
  enabled: boolean;
  systemPromptPrefix: string;
  worldRules: string;
  userCustomInstructions: string;
  npcBehaviorRules: string;
  itemParsingRules: string;
  locationRules: string;
  romanceRules: string;
  imagePromptRules: string;
}

export interface OrchestratorSettings {
  enabled: boolean;
  autoBalanceDifficulty: boolean;
  autoStabilizeEconomy: boolean;
  autoCorrectNPCState: boolean;
  autoRepairMapLinks: boolean;
  autoNormalizeAIResults: boolean;
  autoSceneImageInsert: boolean;
  autoReduceNoiseSpam: boolean;
  autoPromoteDiscoveries: boolean;
  aiStrictness: number;
  mapCoherence: number;
  worldDynamics: number;
  npcAutonomy: number;
  economyElasticity: number;
  imageSafetyLevel: number;
  logCleanliness: number;
  notes: string;
}
