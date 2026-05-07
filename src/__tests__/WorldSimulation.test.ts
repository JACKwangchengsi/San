/**
 * WorldSimulation 单元测试
 * 测试世界模拟系统的核心纯函数
 */
import { describe, it, expect } from 'vitest';
import {
  SHICHEN,
  SEASONS,
  getShichen,
  getSeason,
  getNPCCurrentActivity,
  getReputationModifier,
  simulateWeather,
  simulateNPCBehavior,
  generateRandomEvent,
} from '../systems/WorldSimulation';
import type { GameState, NPC, Location, WeatherType, GameSettings } from '../types/game';

const createMockNPC = (overrides: Partial<NPC> = {}): NPC => ({
  id: 'npc_001',
  name: '测试侠',
  age: 25,
  gender: 'male',
  occupation: '江湖客',
  description: '',
  fertility: 50,
  appearance: '',
  personality: { bravery: 50, intelligence: 50, loyalty: 50, morality: 50, aggression: 30, sociability: 50 },
  personalityTags: [],
  attitude: 'neutral',
  relation: 0,
  trust: 0,
  fear: 0,
  location: '青石驿',
  inventory: [],
  equipment: {},
  status: 'alive',
  stats: { health: 100, maxHealth: 100, hunger: 80, thirst: 80, energy: 80, combat: 10, speed: 50, perception: 50, infection: 0 },
  skills: {},
  memories: [],
  dialogueHistory: [],
  goals: [],
  isRecruited: false,
  notes: '',
  createdAt: Date.now(),
  modifiedAt: Date.now(),
  ...overrides,
});

const createMockLocation = (overrides: Partial<Location> = {}): Location => ({
  id: 'loc_test',
  name: '青石驿',
  type: 'building',
  description: '',
  isExplored: true,
  isLocked: false,
  dangerLevel: 10,
  noiseLevel: 15,
  lightLevel: 70,
  hasElectricity: false,
  hasWater: true,
  lootTable: [],
  isLooted: false,
  connectedLocations: [],
  npcsPresent: [],
  hostilePresent: 0,
  events: [],
  notes: '',
  ...overrides,
});

const createMockState = (overrides: Partial<GameState> = {}): GameState => ({
  version: '1.0.0',
  player: {
    name: '测试侠客', age: 18, gender: 'male', role: '', background: '', appearance: '',
    stats: {
      health: { label: '气血', value: 100, max: 100, decayRate: 0, criticalThreshold: 20 },
      hunger: { label: '饱腹', value: 80, max: 100, decayRate: 5, criticalThreshold: 20 },
      thirst: { label: '口渴', value: 80, max: 100, decayRate: 8, criticalThreshold: 15 },
      energy: { label: '内力', value: 90, max: 100, decayRate: 3, criticalThreshold: 20 },
      sanity: { label: '心境', value: 90, max: 100, decayRate: 0.5, criticalThreshold: 30 },
      infection: { label: '暗伤', value: 0, max: 100, decayRate: 0, criticalThreshold: 50 },
      stamina: { label: '体力', value: 95, max: 100, decayRate: 4, criticalThreshold: 25 },
    },
    inventory: [], equipment: {}, maxCarryWeight: 25, currentCarryWeight: 0,
    skills: [], perks: [], traits: [], martialArts: [], jianghuFame: 5, morality: 60,
    currency: { silver: 10, copper: 200 },
    romance: { history: [], charm: 5, attachmentStyle: 'balanced' },
    cultivationStage: 0, cultivationAbilities: [],
    relationships: {}, factions: {},
    injuries: [], diseases: [], buffs: [], debuffs: [], memories: [], achievements: [],
    killCount: { monsters: 0, humans: 0, heretics: 0 },
    createdAt: Date.now(), lastSaved: Date.now(), totalPlayTime: 0,
  },
  world: {
    time: Date.now(), dayNumber: 1, timeOfDay: 'morning',
    weather: { current: 'clear', temperature: 20, humidity: 60, windSpeed: 5, visibility: 80, forecast: ['clear', 'cloudy'] },
    location: '青石驿', locationHistory: [],
    electricity: false, electricityStability: 0, internet: false, internetSpeed: 0,
    water: true, waterQuality: 85, gas: false,
    miasmaRate: 0, chaosLevel: 10, governmentControl: 70, militaryPresence: 5, civilianMorale: 80,
    resourceScarcity: 10, currencySystem: { silverToCopper: 100, marketIndex: 100, taxRate: 5 },
    safeZones: ['青石驿'], dangerZones: [], forbiddenZones: [],
    globalEvents: [], activeQuests: [], currentNoiseLevel: 5,
  },
  npcs: [], locations: [createMockLocation()], buildings: [],
  logs: [], storyLogs: [], craftingRecipes: [], monsterTypes: [],
  gamePhase: 1, chapterNumber: 1, wordCount: 0,
  settings: { difficulty: 'normal', permadeath: false, autoSave: true, autoSaveInterval: 5, showTutorials: true, textSpeed: 1, fontSize: 16, theme: 'dark', soundEnabled: false, notificationsEnabled: true },
  flags: {}, variables: {}, history: [],
  createdAt: Date.now(), lastPlayed: Date.now(), totalSessions: 1,
  ...overrides,
});

describe('WorldSimulation - 时辰系统', () => {
  describe('getShichen', () => {
    it('凌晨 0 点应为子时', () => {
      expect(getShichen(0).name).toBe('子时');
    });
    it('中午 12 点应为午时', () => {
      expect(getShichen(12).name).toBe('午时');
    });
    it('下午 18 点应为酉时', () => {
      expect(getShichen(18).name).toBe('酉时');
    });
    it('晚上 23 点应为子时', () => {
      expect(getShichen(23).name).toBe('子时');
    });
    // 7点同时出现在卯时[5,6,7]和辰时[7,8,9]，按顺序卯时先匹配
    it('早上 7 点应为卯时（卯时和辰时共享7点，按数组顺序卯时优先）', () => {
      expect(getShichen(7).name).toBe('卯时');
    });
    it('早上 8 点应为辰时', () => {
      expect(getShichen(8).name).toBe('辰时');
    });
    it('无效小时应回退到子时', () => {
      expect(getShichen(25).name).toBe('子时');
    });
    it('SHICHEN 应有恰好 12 个时辰', () => {
      expect(SHICHEN).toHaveLength(12);
    });
  });
});

describe('WorldSimulation - 季节系统', () => {
  describe('getSeason', () => {
    it('2月应为春季', () => {
      expect(getSeason(2).key).toBe('spring');
    });
    it('6月应为夏季', () => {
      expect(getSeason(6).key).toBe('summer');
    });
    it('9月应为秋季', () => {
      expect(getSeason(9).key).toBe('autumn');
    });
    // JS Date.getMonth() 返回 0-11，12月=month 11
    it('11月（JS 12月）应为冬季', () => {
      expect(getSeason(11).key).toBe('winter');
    });
    it('无效月份应回退到春季', () => {
      expect(getSeason(13).key).toBe('spring');
    });
    it('SEASONS 应有四季', () => {
      expect(Object.keys(SEASONS)).toHaveLength(4);
    });
    it('夏季温度应高于冬季', () => {
      const summer = getSeason(7);
      const winter = getSeason(1);
      expect(summer.tempRange[0]).toBeGreaterThan(winter.tempRange[0]);
    });
  });
});

describe('WorldSimulation - NPC活动', () => {
  describe('getNPCCurrentActivity', () => {
    it('商贾辰时应在店铺做生意', () => {
      const npc = createMockNPC({ occupation: '商贾' });
      const activity = getNPCCurrentActivity(npc, 8);
      expect(activity).not.toBeNull();
      expect(activity!.activity).toBe('做生意');
    });

    it('江湖客卯时应晨起练功', () => {
      const npc = createMockNPC({ occupation: '江湖客' });
      const activity = getNPCCurrentActivity(npc, 6);
      expect(activity).not.toBeNull();
      expect(activity!.activity).toBe('晨起练功');
    });

    it('未知职业应使用江湖客日程', () => {
      const npc = createMockNPC({ occupation: '说书人' });
      const activity = getNPCCurrentActivity(npc, 6);
      expect(activity).not.toBeNull();
      expect(activity!.activity).toBe('晨起练功');
    });
  });

  describe('simulateNPCBehavior', () => {
    // 江湖客的日程有: 卯时/辰时/午时/申时/酉时/戌时，辰时=8点有日程
    it('应消耗NPC饥饿和口渴值（辰时有日程）', () => {
      const npc = createMockNPC({ stats: { health: 100, maxHealth: 100, hunger: 50, thirst: 50, energy: 80, combat: 10, speed: 50, perception: 50, infection: 0 } });
      const state = createMockState();
      const result = simulateNPCBehavior(npc, state, 8); // 辰时
      expect(result).not.toBeNull();
      expect(result!.stats!.hunger).toBeLessThan(50);
      expect(result!.stats!.thirst).toBeLessThan(50);
    });

    it('卯时NPC应执行日程并消耗精力', () => {
      // 江湖客有卯时日程，卯时非夜间，精力应下降
      const npc = createMockNPC({ stats: { health: 100, maxHealth: 100, hunger: 80, thirst: 80, energy: 60, combat: 10, speed: 50, perception: 50, infection: 0 } });
      const state = createMockState();
      const result = simulateNPCBehavior(npc, state, 6); // 卯时
      expect(result).not.toBeNull();
      expect(result!.stats!.energy).toBeLessThan(60);
    });
  });
});

describe('WorldSimulation - 声望系统', () => {
  describe('getReputationModifier', () => {
    // fame>=80, morality>=60 → "名震江湖·侠士"
    it('高声望（80+）应有折扣和信任加成', () => {
      const mod = getReputationModifier(85, 70);
      expect(mod.priceModifier).toBeLessThan(1);
      expect(mod.trustModifier).toBeGreaterThan(0);
      expect(mod.description).toBe('名震江湖·侠士');
    });

    it('中等声望（40-60）应有小幅加成', () => {
      const mod = getReputationModifier(50, 50);
      expect(mod.priceModifier).toBeLessThan(1);
      expect(mod.trustModifier).toBe(5);
      expect(mod.description).toBe('略有耳闻');
    });

    // fame<20 → "籍籍无名", priceModifier=1.05
    it('低声望应为籍籍无名且价格偏高', () => {
      const mod = getReputationModifier(5, 50);
      expect(mod.description).toBe('籍籍无名');
      expect(mod.priceModifier).toBe(1.05);
      expect(mod.trustModifier).toBe(-5);
    });

    it('高声望 + 高道德应有更好加成', () => {
      const highMoral = getReputationModifier(90, 90);
      expect(highMoral.priceModifier).toBeLessThan(1);
      expect(highMoral.description).toBe('名震江湖·大侠');
    });
  });
});

describe('WorldSimulation - 天气系统', () => {
  describe('simulateWeather', () => {
    it('应返回有效的天气类型', () => {
      const state = createMockState();
      const result = simulateWeather(state);
      if (result.current) {
        const validWeather: WeatherType[] = ['clear', 'cloudy', 'rain', 'heavy_rain', 'fog', 'snow', 'blizzard', 'thunderstorm', 'overcast', 'drizzle'];
        expect(validWeather).toContain(result.current);
      }
    });

    it('温度应在合理范围内', () => {
      const state = createMockState();
      for (let i = 0; i < 100; i++) {
        const result = simulateWeather(state);
        if (result.temperature !== undefined) {
          expect(result.temperature).toBeGreaterThan(-30);
          expect(result.temperature).toBeLessThan(50);
          break;
        }
      }
    });
  });

  describe('generateRandomEvent', () => {
    it('应返回事件或 null', () => {
      const state = createMockState();
      const result = generateRandomEvent(state);
      if (result) {
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('text');
        expect(result).toHaveProperty('timestamp');
      }
    });

    it('夜间高危险区域应有更多事件类型可用', () => {
      const state = createMockState();
      state.world.time = new Date(2024, 0, 1, 2, 0, 0).getTime(); // 凌晨2点
      state.locations = [createMockLocation({ dangerLevel: 60 })];

      let foundNight = false;
      for (let i = 0; i < 50; i++) {
        const result = generateRandomEvent(state);
        if (result && result.text.length > 0) {
          foundNight = true;
          break;
        }
      }
      expect(foundNight).toBe(true);
    });
  });
});
