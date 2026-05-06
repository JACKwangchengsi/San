// 修炼系统 - 武侠世界的核心成长系统

export interface CultivationRealm {
  id: string;
  name: string;
  level: number;
  description: string;
  requiredQi: number;
  statBonus: {
    health: number;
    energy: number;
    damage: number;
    defense: number;
  };
  abilities: string[];
}

export interface MartialArtSkill {
  id: string;
  name: string;
  type: 'sword' | 'fist' | 'palm' | 'leg' | 'internal' | 'lightness' | 'hidden' | 'special';
  tier: number; // 1-9 品
  description: string;
  effects: {
    damage?: number;
    defense?: number;
    speed?: number;
    special?: string;
  };
  requirements: {
    realm: number;
    strength?: number;
    agility?: number;
    comprehension?: number;
  };
  moves: MartialMove[];
  masteryLevel: number; // 0-100
  isLearned: boolean;
}

export interface MartialMove {
  id: string;
  name: string;
  description: string;
  qiCost: number;
  damage: number;
  cooldown: number;
  effects: string[];
}

// 境界体系
export const CULTIVATION_REALMS: CultivationRealm[] = [
  {
    id: 'mortal',
    name: '凡人',
    level: 0,
    description: '未曾修行，筋骨肉体皆为凡俗。',
    requiredQi: 0,
    statBonus: { health: 0, energy: 0, damage: 0, defense: 0 },
    abilities: []
  },
  {
    id: 'body_tempering',
    name: '锻体境',
    level: 1,
    description: '锤炼筋骨，强化肉身，为修行打下根基。',
    requiredQi: 100,
    statBonus: { health: 20, energy: 10, damage: 5, defense: 3 },
    abilities: ['铁布衫初阶']
  },
  {
    id: 'qi_sensing',
    name: '感气境',
    level: 2,
    description: '感知天地灵气，内息初生。',
    requiredQi: 500,
    statBonus: { health: 40, energy: 30, damage: 10, defense: 6 },
    abilities: ['气感', '内视']
  },
  {
    id: 'meridian_opening',
    name: '通脉境',
    level: 3,
    description: '打通经脉，真气运转自如。',
    requiredQi: 2000,
    statBonus: { health: 80, energy: 60, damage: 20, defense: 12 },
    abilities: ['经脉贯通', '气劲外放']
  },
  {
    id: 'qi_condensing',
    name: '凝气境',
    level: 4,
    description: '凝聚真气，可御气于外。',
    requiredQi: 8000,
    statBonus: { health: 150, energy: 100, damage: 40, defense: 25 },
    abilities: ['气罩', '剑气']
  },
  {
    id: 'foundation',
    name: '筑基境',
    level: 5,
    description: '筑就修行根基，踏入修真之门。',
    requiredQi: 30000,
    statBonus: { health: 300, energy: 200, damage: 80, defense: 50 },
    abilities: ['御剑术', '灵识']
  },
  {
    id: 'golden_core',
    name: '金丹境',
    level: 6,
    description: '结成金丹，寿元大增，已非凡俗。',
    requiredQi: 100000,
    statBonus: { health: 600, energy: 400, damage: 160, defense: 100 },
    abilities: ['金丹真元', '神念']
  },
  {
    id: 'nascent_soul',
    name: '元婴境',
    level: 7,
    description: '元婴出窍，神魂离体，已入大能之列。',
    requiredQi: 500000,
    statBonus: { health: 1200, energy: 800, damage: 320, defense: 200 },
    abilities: ['元婴出窍', '神识攻击']
  }
];

// 预设武学
export const MARTIAL_ARTS_DATABASE: MartialArtSkill[] = [
  {
    id: 'basic_sword',
    name: '基础剑法',
    type: 'sword',
    tier: 9,
    description: '江湖通用的基础剑招，简单实用。',
    effects: { damage: 10 },
    requirements: { realm: 0 },
    moves: [
      { id: 'thrust', name: '直刺', description: '简单的前刺', qiCost: 0, damage: 12, cooldown: 0, effects: [] },
      { id: 'slash', name: '横斩', description: '横向挥斩', qiCost: 0, damage: 15, cooldown: 1, effects: [] }
    ],
    masteryLevel: 0,
    isLearned: false
  },
  {
    id: 'qinglan_sword',
    name: '青岚剑法',
    type: 'sword',
    tier: 7,
    description: '青岚门入门剑法，以风为意，剑走轻灵。',
    effects: { damage: 25, speed: 10 },
    requirements: { realm: 1, agility: 30 },
    moves: [
      { id: 'wind_slash', name: '风刃斩', description: '剑随风动，快如疾风', qiCost: 5, damage: 30, cooldown: 2, effects: ['减速'] },
      { id: 'storm_pierce', name: '暴风穿刺', description: '迅猛突刺', qiCost: 10, damage: 45, cooldown: 3, effects: ['穿透'] },
      { id: 'gale_dance', name: '狂风剑舞', description: '周身剑气环绕', qiCost: 20, damage: 60, cooldown: 5, effects: ['群攻'] }
    ],
    masteryLevel: 15,
    isLearned: true
  },
  {
    id: 'iron_fist',
    name: '铁砂掌',
    type: 'fist',
    tier: 8,
    description: '刚猛掌法，以硬碰硬。',
    effects: { damage: 20, defense: 5 },
    requirements: { realm: 1, strength: 40 },
    moves: [
      { id: 'iron_palm', name: '铁掌', description: '刚猛一掌', qiCost: 3, damage: 25, cooldown: 1, effects: [] },
      { id: 'crushing_blow', name: '碎石击', description: '可碎顽石的重击', qiCost: 8, damage: 40, cooldown: 3, effects: ['震慑'] }
    ],
    masteryLevel: 0,
    isLearned: false
  },
  {
    id: 'shadow_step',
    name: '幻影步',
    type: 'lightness',
    tier: 6,
    description: '高明轻功，身形飘忽，难以捉摸。',
    effects: { speed: 30 },
    requirements: { realm: 2, agility: 50 },
    moves: [
      { id: 'shadow_flash', name: '影闪', description: '瞬间移动一小段距离', qiCost: 5, damage: 0, cooldown: 2, effects: ['闪避'] },
      { id: 'phantom_split', name: '残影分身', description: '制造残影迷惑敌人', qiCost: 15, damage: 0, cooldown: 5, effects: ['分身'] }
    ],
    masteryLevel: 0,
    isLearned: false
  },
  {
    id: 'basic_internal',
    name: '吐纳心法',
    type: 'internal',
    tier: 9,
    description: '最基础的内功心法，调息养气。',
    effects: { defense: 5 },
    requirements: { realm: 0 },
    moves: [
      { id: 'qi_recovery', name: '调息', description: '恢复内力', qiCost: 0, damage: 0, cooldown: 10, effects: ['恢复内力20'] }
    ],
    masteryLevel: 10,
    isLearned: true
  },
  {
    id: 'xingqi_jue',
    name: '行气诀',
    type: 'internal',
    tier: 7,
    description: '入门级内功心法，可引导真气运行。',
    effects: { defense: 10 },
    requirements: { realm: 1 },
    moves: [
      { id: 'qi_shield', name: '气护体', description: '真气护体，减少伤害', qiCost: 10, damage: 0, cooldown: 5, effects: ['护盾'] },
      { id: 'qi_heal', name: '内息疗伤', description: '运气疗伤', qiCost: 15, damage: 0, cooldown: 10, effects: ['恢复气血30'] }
    ],
    masteryLevel: 10,
    isLearned: true
  },
  {
    id: 'hidden_weapon',
    name: '暗器术',
    type: 'hidden',
    tier: 8,
    description: '江湖暗器之术，出其不意。',
    effects: { damage: 15 },
    requirements: { realm: 0, agility: 35 },
    moves: [
      { id: 'flying_needle', name: '飞针', description: '袖中飞针', qiCost: 2, damage: 18, cooldown: 1, effects: ['出血'] },
      { id: 'sleeve_arrow', name: '袖箭', description: '袖中暗箭', qiCost: 5, damage: 30, cooldown: 3, effects: ['穿透'] }
    ],
    masteryLevel: 0,
    isLearned: false
  },
  {
    id: 'deadly_palm',
    name: '夺命追魂掌',
    type: 'palm',
    tier: 5,
    description: '狠辣掌法，专攻要害。',
    effects: { damage: 45 },
    requirements: { realm: 3, strength: 60 },
    moves: [
      { id: 'soul_chase', name: '追魂', description: '连环追击', qiCost: 15, damage: 50, cooldown: 2, effects: ['连击'] },
      { id: 'death_palm', name: '夺命', description: '致命一击', qiCost: 30, damage: 100, cooldown: 8, effects: ['必杀'] }
    ],
    masteryLevel: 0,
    isLearned: false
  }
];

// 门派定义
export interface Sect {
  id: string;
  name: string;
  type: 'righteous' | 'neutral' | 'evil';
  description: string;
  location: string;
  leader: string;
  martialArts: string[]; // 门派武学ID
  requirements: {
    morality?: { min?: number; max?: number };
    realm?: number;
    skills?: Record<string, number>;
  };
  benefits: {
    statBonus: Record<string, number>;
    discounts: string[];
    allies: string[];
  };
  ranks: string[]; // 门派职位
}

export const SECTS: Sect[] = [
  {
    id: 'wudang',
    name: '武当派',
    type: 'righteous',
    description: '道家名门，以剑法和内功闻名天下。',
    location: '武当山',
    leader: '清虚真人',
    martialArts: ['wudang_sword', 'taiji_internal'],
    requirements: { morality: { min: 40 }, realm: 1 },
    benefits: {
      statBonus: { energy: 20, sanity: 10 },
      discounts: ['丹药', '道袍'],
      allies: ['少林', '峨眉']
    },
    ranks: ['记名弟子', '外门弟子', '内门弟子', '真传弟子', '长老', '掌门']
  },
  {
    id: 'shaolin',
    name: '少林寺',
    type: 'righteous',
    description: '千年古刹，武学渊源深厚。',
    location: '嵩山',
    leader: '空见方丈',
    martialArts: ['luohan_fist', 'yijin_jing'],
    requirements: { morality: { min: 50 }, realm: 1 },
    benefits: {
      statBonus: { health: 30, defense: 15 },
      discounts: ['僧衣', '佛珠'],
      allies: ['武当', '峨眉']
    },
    ranks: ['俗家弟子', '沙弥', '比丘', '首座', '方丈']
  },
  {
    id: 'emei',
    name: '峨眉派',
    type: 'righteous',
    description: '女子为主的名门正派。',
    location: '峨眉山',
    leader: '灭绝师太',
    martialArts: ['emei_sword', 'emei_internal'],
    requirements: { morality: { min: 30 } },
    benefits: {
      statBonus: { agility: 20, speed: 10 },
      discounts: ['女装', '发簪'],
      allies: ['武当', '少林']
    },
    ranks: ['记名弟子', '外门弟子', '内门弟子', '首席弟子', '掌门']
  },
  {
    id: 'beggar',
    name: '丐帮',
    type: 'neutral',
    description: '天下第一大帮，人多势众。',
    location: '各地分舵',
    leader: '乔峰',
    martialArts: ['dragon_palm', 'dog_stick'],
    requirements: {},
    benefits: {
      statBonus: { perception: 20 },
      discounts: ['食物', '情报'],
      allies: []
    },
    ranks: ['九袋弟子', '八袋弟子', '七袋弟子', '六袋弟子', '五袋弟子', '四袋弟子', '三袋弟子', '二袋弟子', '一袋弟子', '长老', '帮主']
  },
  {
    id: 'ming_cult',
    name: '明教',
    type: 'neutral',
    description: '神秘教派，行事诡异。',
    location: '光明顶',
    leader: '教主',
    martialArts: ['holy_fire', 'qiankun_shift'],
    requirements: { morality: { max: 60 } },
    benefits: {
      statBonus: { damage: 25 },
      discounts: ['火器', '毒药'],
      allies: []
    },
    ranks: ['教众', '旗使', '坛主', '护法', '光明使者', '教主']
  },
  {
    id: 'demon_cult',
    name: '魔教',
    type: 'evil',
    description: '邪道之首，手段狠辣。',
    location: '黑木崖',
    leader: '任我行',
    martialArts: ['xixing_dafa', 'demon_sword'],
    requirements: { morality: { max: 30 } },
    benefits: {
      statBonus: { damage: 40, speed: 15 },
      discounts: ['毒药', '暗器'],
      allies: []
    },
    ranks: ['教众', '堂主', '长老', '副教主', '教主']
  }
];

// 修炼相关函数
export function calculateQiGain(realm: number, meditation: boolean, environment: string): number {
  const baseGain = 1 + realm * 2;
  const meditationBonus = meditation ? 2 : 1;
  const envBonus = environment === '灵气充沛' ? 1.5 : environment === '灵气稀薄' ? 0.5 : 1;
  return Math.floor(baseGain * meditationBonus * envBonus);
}

export function canBreakthrough(currentQi: number, targetRealm: CultivationRealm): boolean {
  return currentQi >= targetRealm.requiredQi;
}

export function getRealmByLevel(level: number): CultivationRealm {
  return CULTIVATION_REALMS.find(r => r.level === level) || CULTIVATION_REALMS[0];
}

export function calculateCombatPower(
  realm: number,
  martialArts: MartialArtSkill[],
  weapon: { damage: number } | null
): number {
  const realmBonus = getRealmByLevel(realm).statBonus.damage;
  const martialBonus = martialArts.reduce((sum, ma) => sum + (ma.effects.damage || 0) * (ma.masteryLevel / 100), 0);
  const weaponBonus = weapon?.damage || 5;
  return Math.floor(realmBonus + martialBonus + weaponBonus);
}
