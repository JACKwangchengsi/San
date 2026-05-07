/**
 * choiceUtils 单元测试
 * 测试选项类型推断函数
 */
import { describe, it, expect } from 'vitest';
import { inferChoiceType } from '../utils/choiceUtils';

describe('choiceUtils - inferChoiceType', () => {
  describe('combat 类型', () => {
    it('"攻击" → combat', () => {
      expect(inferChoiceType('拔剑攻击')).toBe('combat');
    });
    it('"战斗" → combat', () => {
      expect(inferChoiceType('准备战斗')).toBe('combat');
    });
    it('"决斗" → combat', () => {
      expect(inferChoiceType('与他决斗')).toBe('combat');
    });
    it('"斩杀" → combat', () => {
      expect(inferChoiceType('斩杀敌人')).toBe('combat');
    });
  });

  describe('social 类型', () => {
    it('"交涉" → social', () => {
      expect(inferChoiceType('进行交涉')).toBe('social');
    });
    it('"帮助" → social', () => {
      expect(inferChoiceType('帮助村民')).toBe('social');
    });
    it('"交谈" → social', () => {
      expect(inferChoiceType('与他交谈')).toBe('social');
    });
    it('"交易" → social', () => {
      expect(inferChoiceType('进行交易')).toBe('social');
    });
    it('"说服" → social', () => {
      expect(inferChoiceType('说服守卫')).toBe('social');
    });
  });

  describe('stealth 类型', () => {
    it('"潜入" → stealth', () => {
      expect(inferChoiceType('潜入敌营')).toBe('stealth');
    });
    it('"调查" → stealth', () => {
      expect(inferChoiceType('调查现场')).toBe('stealth');
    });
    it('"暗中" → stealth', () => {
      expect(inferChoiceType('暗中观察')).toBe('stealth');
    });
    it('"隐藏" → stealth', () => {
      expect(inferChoiceType('隐藏身形')).toBe('stealth');
    });
  });

  describe('danger 类型', () => {
    it('"威胁" → danger', () => {
      expect(inferChoiceType('威胁对方')).toBe('danger');
    });
    it('"欺骗" → danger', () => {
      expect(inferChoiceType('欺骗守卫')).toBe('danger');
    });
    it('"恐吓" → danger', () => {
      expect(inferChoiceType('恐吓小贩')).toBe('danger');
    });
  });

  describe('normal 类型', () => {
    it('"逃跑" → normal', () => {
      expect(inferChoiceType('逃跑撤退')).toBe('normal');
    });
    it('"接受" → normal', () => {
      expect(inferChoiceType('接受邀请')).toBe('normal');
    });
    it('"拒绝" → normal', () => {
      expect(inferChoiceType('拒绝请求')).toBe('normal');
    });
    it('"探索" → normal', () => {
      expect(inferChoiceType('继续探索')).toBe('normal');
    });
    it('"休息" → normal', () => {
      expect(inferChoiceType('休息一下')).toBe('normal');
    });
  });

  describe('边界情况', () => {
    it('空字符串 → undefined', () => {
      expect(inferChoiceType('')).toBeUndefined();
    });

    it('无匹配文本 → undefined', () => {
      expect(inferChoiceType('随便走走')).toBeUndefined();
    });

    it('部分匹配——先匹配到优先返回', () => {
      // "逃跑" 最先匹配 normal，不是 combat
      expect(inferChoiceType('逃跑')).toBe('normal');
    });

    it('多关键词匹配——返回第一个匹配的类型', () => {
      // "攻击谈判" 先匹配 "攻击" → combat
      expect(inferChoiceType('攻击谈判')).toBe('combat');
    });

    it('"等待" → normal', () => {
      expect(inferChoiceType('等待时机')).toBe('normal');
    });
  });
});
