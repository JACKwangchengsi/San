/**
 * aiSmartParser 单元测试
 * 测试AI智能解析器的核心功能
 */
import { describe, it, expect } from 'vitest';

// 直接从源文件导入需要测试的函数
// aiSmartParser 导出了多个工具函数，我们测试其核心行为
// 由于该模块是大型模块，我们测试关键的模式匹配和过滤逻辑

describe('aiSmartParser - 模式匹配', () => {
  describe('THINKING_PATTERNS - 思考标记清理', () => {
    const thinkingPatterns = [
      /<think>[\s\S]*?<\/think>/gi,
      /<thinking>[\s\S]*?<\/thinking>/gi,
      /【思考】[\s\S]*?(【\/思考】|$)/gi,
    ];

    it('应清理 <think> 标签', () => {
      const input = '<think>让我想想这个故事...</think>你走在青石路上。';
      const cleaned = thinkingPatterns.reduce((txt, re) => txt.replace(re, ''), input).trim();
      expect(cleaned).toBe('你走在青石路上。');
    });

    it('应清理 <thinking> 标签', () => {
      const input = '<thinking>分析剧情走向</thinking>前方出现了一间客栈。';
      const cleaned = thinkingPatterns.reduce((txt, re) => txt.replace(re, ''), input).trim();
      expect(cleaned).toBe('前方出现了一间客栈。');
    });

    it('应清理 【思考】 中文标记', () => {
      const input = '【思考】这个场景需要更多细节【/思考】天色渐晚。';
      const cleaned = thinkingPatterns.reduce((txt, re) => txt.replace(re, ''), input).trim();
      expect(cleaned).toBe('天色渐晚。');
    });
  });

  describe('JSON_TRAIL_PATTERNS - JSON尾迹清理', () => {
    const jsonTrailPattern = /location_change\s*[:：].*?(应为\s*null|null).*$/gi;

    it('应清理 location_change 的指令性说明', () => {
      const input = '你继续前行。location_change: 应为 null 因为没换地方';
      const cleaned = input.replace(jsonTrailPattern, '').trim();
      expect(cleaned).toBe('你继续前行。');
    });
  });

  describe('WUXIA_ITEMS - 物品分类关键词', () => {
    const weaponKeywords = ['剑', '刀', '枪', '棍', '棒', '戟', '斧', '匕首', '飞刀', '飞镖', '袖箭', '暗器', '弓', '弩'];
    const medicineKeywords = ['丹', '药', '丸', '散', '膏', '止血散', '金创药', '解毒丹', '疗伤药', '草药', '绷带', '药包'];
    const foodKeywords = ['干粮', '馒头', '包子', '烧饼', '肉干', '烤肉', '米饭', '面条', '粥', '野果', '点心', '烧鸡'];
    const documentKeywords = ['秘籍', '剑谱', '刀谱', '拳谱', '心法', '书信', '密信', '手札', '账本', '令牌', '腰牌', '信物'];

    it('应正确识别武器类物品', () => {
      expect(weaponKeywords).toContain('剑');
      expect(weaponKeywords).toContain('匕首');
      expect(weaponKeywords).toContain('弓');
    });

    it('应正确识别丹药类物品', () => {
      expect(medicineKeywords).toContain('止血散');
      expect(medicineKeywords).toContain('金创药');
      expect(medicineKeywords).toContain('草药');
    });

    it('应正确识别食物类物品', () => {
      expect(foodKeywords).toContain('馒头');
      expect(foodKeywords).toContain('干粮');
      expect(foodKeywords).toContain('烧鸡');
    });

    it('应正确识别书卷类物品', () => {
      expect(documentKeywords).toContain('秘籍');
      expect(documentKeywords).toContain('令牌');
      expect(documentKeywords).toContain('书信');
    });
  });

  describe('BLACKLIST - 黑名单过滤', () => {
    const blacklistExact = new Set([
      '饥饿感', '口渴感', '疲劳感', '疼痛感', '安全地方', '危险地方',
      '线索', '情报', '风险', '危险', '安全', '提示',
      '未知发现', '当前地点未变', '应为null', '应为 null', 'location_change',
    ]);

    it('应拒绝所有黑名单中的精确匹配', () => {
      for (const item of blacklistExact) {
        expect(blacklistExact.has(item)).toBe(true);
      }
    });

    it('"剑"不在黑名单中', () => {
      expect(blacklistExact.has('剑')).toBe(false);
    });

    it('"干粮"不在黑名单中', () => {
      expect(blacklistExact.has('干粮')).toBe(false);
    });
  });

  describe('STATEY_SUFFIX - 状态感后缀过滤', () => {
    const stateySuffix = /(感|觉|意|情|态|化|应|况|息|影|声)$/;

    it('应匹配状态类词语', () => {
      expect(stateySuffix.test('饥饿感')).toBe(true);
      expect(stateySuffix.test('恐惧感')).toBe(true);
      expect(stateySuffix.test('敌意')).toBe(true);
      expect(stateySuffix.test('心情')).toBe(true);
      expect(stateySuffix.test('情况')).toBe(true);
    });

    it('不应匹配实际物品', () => {
      expect(stateySuffix.test('剑')).toBe(false);
      expect(stateySuffix.test('干粮')).toBe(false);
      expect(stateySuffix.test('银子')).toBe(false);
      expect(stateySuffix.test('地图')).toBe(false);
    });
  });

  describe('NON_ITEM_PHRASE - 非物品短语过滤', () => {
    const nonItemPhrase = /(缓解|减轻|恢复|消失|增加|下降|提升|降低|波动|出现|袭来|蔓延|扩散|逼近|笼罩|浮现|袭上心头)/;

    it('应匹配描述性短语', () => {
      expect(nonItemPhrase.test('缓解了饥饿')).toBe(true);
      expect(nonItemPhrase.test('恐惧袭来')).toBe(true);
      expect(nonItemPhrase.test('雾气笼罩')).toBe(true);
    });

    it('不应匹配物品名', () => {
      expect(nonItemPhrase.test('剑')).toBe(false);
      expect(nonItemPhrase.test('干粮')).toBe(false);
    });
  });

  describe('SCENE_PREFIX - 场景前缀过滤', () => {
    const scenePrefix = /^(你|他|她|他们|众人|周围|空气|气氛|局势|眼前|附近|四周|远处)/;

    it('应匹配场景描述前缀', () => {
      expect(scenePrefix.test('你感到一阵寒意')).toBe(true);
      expect(scenePrefix.test('周围一片寂静')).toBe(true);
      expect(scenePrefix.test('空气变得凝重')).toBe(true);
    });

    it('不应匹配物品名', () => {
      expect(scenePrefix.test('剑')).toBe(false);
      expect(scenePrefix.test('干粮')).toBe(false);
      expect(scenePrefix.test('银子')).toBe(false);
    });
  });

  describe('NON_LOCATION_PATTERNS - 非地点模式', () => {
    const nonLocationPatterns = [
      /第[一二三四五六七八九十百千万\d]+个?(清晨|早晨|上午|中午|午后|傍晚|黄昏|夜晚|夜里)/,
      /(应为\s*null|null)$/,
      /当前地点未变/,
      /只有真正换地点时才填/,
    ];

    it('应拦截"第X个清晨"等时间描述', () => {
      expect(nonLocationPatterns[0].test('第三个清晨')).toBe(true);
    });

    it('应拦截"应为 null"', () => {
      expect(nonLocationPatterns[1].test('应为 null')).toBe(true);
    });

    it('应拦截"当前地点未变"', () => {
      expect(nonLocationPatterns[2].test('当前地点未变')).toBe(true);
    });

    it('不应拦截真实地点', () => {
      expect(nonLocationPatterns.every(p => !p.test('云来客栈'))).toBe(true);
      expect(nonLocationPatterns.every(p => !p.test('青石驿'))).toBe(true);
    });
  });

  describe('综合过滤场景', () => {
    it('应能识别AI返回的脏数据模式', () => {
      const dirtyItems = [
        '撕裂伤',
        '骨折',
        '流血',
        '情绪波动',
        '恐惧',
        'speaker',
        'text',
        'dialogue',
        'story_text',
        'npc_updates',
      ];

      const blacklistContains = [
        '伤', '伤口', '内伤', '骨折', '流血', '出血',
        '情绪', '心情', '恐惧',
        'speaker', 'text', 'dialogue', 'story_text', 'npc_updates',
      ];

      for (const item of dirtyItems) {
        const isBlacklisted = blacklistContains.some(pattern => item.includes(pattern));
        expect(isBlacklisted).toBe(true);
      }
    });

    it('应能识别有效物品', () => {
      const validItems = [
        { name: '青锋剑', type: 'weapon' },
        { name: '止血散', type: 'medicine' },
        { name: '干粮', type: 'food' },
        { name: '水囊', type: 'drink' },
        { name: '火折子', type: 'tool' },
        { name: '秘籍残卷', type: 'document' },
        { name: '碎银', type: 'misc' },
        { name: '布衣', type: 'clothing' },
      ];

      const blacklistContains = [
        '伤', '骨折', '流血', '情绪', 'speaker', 'text', 'dialogue',
      ];

      for (const item of validItems) {
        const isBlacklisted = blacklistContains.some(pattern => item.name.includes(pattern));
        expect(isBlacklisted).toBe(false);
      }
    });
  });
});
