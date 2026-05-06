/**
 * Orchestrator 单元测试
 * 测试 AI 响应净化引擎的核心功能
 */
import { describe, it, expect } from 'vitest';
import {
  orchestrateAIResponse,
  deriveSystemCorrections,
  defaultOrchestratorSettings,
} from '../systems/Orchestrator';
import type { AIResponse, GameState, Location, NPC, GameSettings } from '../types/game';

const createMockSettings = (): GameSettings => ({
  difficulty: 'normal',
  permadeath: false,
  autoSave: true,
  autoSaveInterval: 5,
  showTutorials: true,
  textSpeed: 1,
  fontSize: 16,
  theme: 'dark',
  soundEnabled: false,
  notificationsEnabled: true,
});

const createMockLocation = (overrides: Partial<Location> = {}): Location => ({
  id: 'loc_test',
  name: '青石驿',
  type: 'building',
  description: '测试地点',
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

const createMockNPC = (id: string, name: string): NPC => ({
  id,
  name,
  age: 25,
  gender: 'male',
  occupation: '侠客',
  description: '测试NPC',
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
});

const createMockState = (): GameState => ({
  version: '1.0.0',
  player: {
    name: '测试侠客',
    age: 18,
    gender: 'male',
    role: '测试角色',
    background: '',
    appearance: '',
    stats: {
      health: { label: '气血', value: 100, max: 100, decayRate: 0, criticalThreshold: 20 },
      hunger: { label: '饱腹', value: 80, max: 100, decayRate: 5, criticalThreshold: 20 },
      thirst: { label: '口渴', value: 80, max: 100, decayRate: 8, criticalThreshold: 15 },
      energy: { label: '内力', value: 90, max: 100, decayRate: 3, criticalThreshold: 20 },
      sanity: { label: '心境', value: 90, max: 100, decayRate: 0.5, criticalThreshold: 30 },
      infection: { label: '暗伤', value: 0, max: 100, decayRate: 0, criticalThreshold: 50 },
      stamina: { label: '体力', value: 95, max: 100, decayRate: 4, criticalThreshold: 25 },
    },
    inventory: [],
    equipment: {},
    maxCarryWeight: 25,
    currentCarryWeight: 0,
    skills: [],
    perks: [],
    traits: [],
    martialArts: [],
    jianghuFame: 5,
    morality: 60,
    currency: { silver: 10, copper: 200 },
    romance: { history: [], charm: 5, attachmentStyle: 'balanced' },
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
    createdAt: Date.now(),
    lastSaved: Date.now(),
    totalPlayTime: 0,
  },
  world: {
    time: Date.now(),
    dayNumber: 1,
    timeOfDay: 'morning',
    weather: { current: 'clear', temperature: 20, humidity: 60, windSpeed: 5, visibility: 80, forecast: ['clear', 'cloudy'] },
    location: '青石驿',
    locationHistory: [],
    electricity: false,
    electricityStability: 0,
    internet: false,
    internetSpeed: 0,
    water: true,
    waterQuality: 85,
    gas: false,
    miasmaRate: 0,
    chaosLevel: 10,
    governmentControl: 70,
    militaryPresence: 5,
    civilianMorale: 80,
    resourceScarcity: 10,
    currencySystem: { silverToCopper: 100, marketIndex: 100, taxRate: 5 },
    safeZones: ['青石驿'],
    dangerZones: [],
    forbiddenZones: [],
    globalEvents: [],
    activeQuests: [],
    currentNoiseLevel: 5,
  },
  npcs: [createMockNPC('npc_test', '测试侠')],
  locations: [createMockLocation()],
  buildings: [],
  logs: [],
  storyLogs: [],
  craftingRecipes: [],
  monsterTypes: [],
  gamePhase: 1,
  chapterNumber: 1,
  wordCount: 0,
  settings: createMockSettings(),
  flags: {},
  variables: {},
  history: [],
  createdAt: Date.now(),
  lastPlayed: Date.now(),
  totalSessions: 1,
});

describe('Orchestrator', () => {
  describe('orchestrateAIResponse', () => {
    const settings = defaultOrchestratorSettings;
    const state = createMockState();

    it('应过滤无效的地点变更（null）', () => {
      const raw: AIResponse = {
        story_text: '你来到了一个新的地方。',
        location_change: 'null',
      };
      const result = orchestrateAIResponse(raw, state, settings);
      expect(result.response.location_change).toBeNull();
    });

    it('应过滤"当前地点未变"等无效地点', () => {
      const raw: AIResponse = {
        story_text: '你继续前行。',
        location_change: '当前地点未变',
      };
      const result = orchestrateAIResponse(raw, state, settings);
      expect(result.response.location_change).toBeNull();
    });

    it('应过滤"应为 null"等指令性文本', () => {
      const raw: AIResponse = {
        story_text: '一切如常。',
        location_change: '应为 null',
      };
      const result = orchestrateAIResponse(raw, state, settings);
      expect(result.response.location_change).toBeNull();
    });

    it('应保留有效的地点变更', () => {
      const stateWithLocation = createMockState();
      stateWithLocation.locations = [
        createMockLocation(),
        createMockLocation({ id: 'loc_inn', name: '云来客栈' }),
      ];
      const raw: AIResponse = {
        story_text: '你走进了客栈。',
        location_change: '云来客栈',
      };
      const result = orchestrateAIResponse(raw, stateWithLocation, settings);
      expect(result.response.location_change).toBe('云来客栈');
    });

    it('应过滤无效的物品名称（伤害类）', () => {
      const raw: AIResponse = {
        story_text: '战斗结束了。',
        new_items: [
          { name: '撕裂伤', type: 'misc' as any, description: '伤口', quantity: 1 },
          { name: '骨折', type: 'misc' as any, description: '骨头断了', quantity: 1 },
          { name: '铁剑', type: 'weapon', description: '一把好剑', quantity: 1 },
        ],
      };
      const result = orchestrateAIResponse(raw, state, settings);
      expect(result.response.new_items).toHaveLength(1);
      expect(result.response.new_items![0].name).toBe('铁剑');
    });

    it('应过滤无效物品名称（JSON字段名）', () => {
      const raw: AIResponse = {
        story_text: '你找到了东西。',
        new_items: [
          { name: 'dialogue', type: 'misc' as any, description: '', quantity: 1 },
          { name: 'story_text', type: 'misc' as any, description: '', quantity: 1 },
          { name: '干粮', type: 'food', description: '饼', quantity: 2 },
        ],
      };
      const result = orchestrateAIResponse(raw, state, settings);
      expect(result.response.new_items).toHaveLength(1);
      expect(result.response.new_items![0].name).toBe('干粮');
    });

    it('应过滤无效的发现事件', () => {
      const raw: AIResponse = {
        story_text: '探索中...',
        discoveries: ['未知发现', 'location_change', '找到了宝藏'],
      };
      const result = orchestrateAIResponse(raw, state, settings);
      expect(result.response.discoveries).toHaveLength(1);
      expect(result.response.discoveries![0]).toBe('找到了宝藏');
    });

    it('应净化story_text中的空白', () => {
      const raw: AIResponse = {
        story_text: '  你走在  \n  青石路上。  \n  远处传来马蹄声。  ',
      };
      const result = orchestrateAIResponse(raw, state, settings);
      expect(result.response.story_text).toBe('你走在 青石路上。 远处传来马蹄声。');
    });

    it('应限制choices数量不超过5个', () => {
      const raw: AIResponse = {
        story_text: '请选择。',
        choices: [
          { id: '1', text: '选项1' },
          { id: '2', text: '选项2' },
          { id: '3', text: '选项3' },
          { id: '4', text: '选项4' },
          { id: '5', text: '选项5' },
          { id: '6', text: '选项6' },
        ],
      };
      const result = orchestrateAIResponse(raw, state, settings);
      expect(result.response.choices).toHaveLength(5);
    });

    it('应过滤空文本的choices', () => {
      const raw: AIResponse = {
        story_text: '请选择。',
        choices: [
          { id: '1', text: '' },
          { id: '2', text: '有效选项' },
        ],
      };
      const result = orchestrateAIResponse(raw, state, settings);
      expect(result.response.choices).toHaveLength(1);
      expect(result.response.choices![0].text).toBe('有效选项');
    });

    it('当 orchestrate 禁用时应返回原始数据', () => {
      const disabledSettings = { ...settings, enabled: false, autoNormalizeAIResults: false };
      const raw: AIResponse = {
        story_text: '  脏数据  ',
        location_change: 'null',
        discoveries: ['未知发现'],
        new_items: [{ name: '撕裂伤', type: 'misc' as any, description: '', quantity: 1 }],
      };
      const result = orchestrateAIResponse(raw, state, disabledSettings);
      expect(result.response.location_change).toBe('null');
      expect(result.response.discoveries).toHaveLength(1);
    });
  });

  describe('deriveSystemCorrections', () => {
    it('应在autoCorrectNPCState启用时修正NPC无效位置', () => {
      const state = createMockState();
      state.npcs = [createMockNPC('npc_test', '测试侠')];
      state.npcs[0].location = '不存在的地方';

      const result = deriveSystemCorrections(state, defaultOrchestratorSettings);
      expect(result.npcPatches.length).toBeGreaterThanOrEqual(1);

      const npcPatch = result.npcPatches.find(p => p.id === 'npc_test');
      expect(npcPatch).toBeDefined();
      expect(npcPatch!.updates.location).toBe('青石驿');
    });

    it('应在autoRepairMapLinks启用时修复无效地图连接', () => {
      const state = createMockState();
      state.locations = [
        createMockLocation({ id: 'loc_a', name: '地点A', connectedLocations: ['loc_b', 'loc_invalid', 'loc_b'] }),
        createMockLocation({ id: 'loc_b', name: '地点B', connectedLocations: ['loc_a'] }),
      ];

      const result = deriveSystemCorrections(state, defaultOrchestratorSettings);
      const locAPatch = result.locationPatches.find(p => p.id === 'loc_a');
      if (locAPatch) {
        const connections = locAPatch.updates.connectedLocations as string[];
        expect(connections).not.toContain('loc_invalid');
        expect(connections.filter(c => c === 'loc_b')).toHaveLength(1);
      }
    });

    it('应在autoStabilizeEconomy启用时稳定经济指数', () => {
      const state = createMockState();
      state.world.currencySystem.marketIndex = 200;

      const result = deriveSystemCorrections(state, defaultOrchestratorSettings);
      expect(result.worldPatch.currencySystem).toBeDefined();
      if (result.worldPatch.currencySystem) {
        expect(result.worldPatch.currencySystem.marketIndex).toBeLessThanOrEqual(180);
      }
    });

    it('应自动更新安全区和危险区', () => {
      const state = createMockState();
      state.locations = [
        createMockLocation({ id: 'loc_safe', name: '安全镇', dangerLevel: 10 }),
        createMockLocation({ id: 'loc_danger', name: '危险谷', dangerLevel: 80 }),
      ];

      const result = deriveSystemCorrections(state, defaultOrchestratorSettings);
      expect(result.worldPatch.safeZones).toContain('安全镇');
      expect(result.worldPatch.dangerZones).toContain('危险谷');
    });

    it('禁用状态下不应产生修正', () => {
      const state = createMockState();
      state.npcs[0].location = '不存在的地方';
      const disabledSettings = { ...defaultOrchestratorSettings, enabled: false, autoCorrectNPCState: false };

      const result = deriveSystemCorrections(state, disabledSettings);
      expect(result.npcPatches).toHaveLength(0);
    });
  });

  describe('defaultOrchestratorSettings', () => {
    it('应具有合理的默认值', () => {
      expect(defaultOrchestratorSettings.enabled).toBe(true);
      expect(defaultOrchestratorSettings.autoBalanceDifficulty).toBe(true);
      expect(defaultOrchestratorSettings.aiStrictness).toBeGreaterThanOrEqual(50);
      expect(defaultOrchestratorSettings.aiStrictness).toBeLessThanOrEqual(100);
    });
  });
});
