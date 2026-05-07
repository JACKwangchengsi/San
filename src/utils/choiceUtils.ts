/**
 * inferChoiceType — 根据选项文本推断选项类型
 * 从 GameLayout 的 handleAIUpdate 提取
 *
 * 所有模式映射到 GameChoice.type 的有效值：
 * 'combat' | 'social' | 'stealth' | 'normal' | 'danger'
 */

const CHOICE_PATTERNS: Array<{ pattern: RegExp; type: 'combat' | 'social' | 'stealth' | 'normal' | 'danger' }> = [
  { pattern: /逃跑|撤退|离开|躲避|溜走|脱身/, type: 'normal' },
  { pattern: /攻击|战斗|出手|斩杀|击杀|决斗|搏斗/, type: 'combat' },
  { pattern: /交涉|谈判|劝说|说服|提议|商量/, type: 'social' },
  { pattern: /帮助|救人|援手|救助|支援|搭救/, type: 'social' },
  { pattern: /潜入|潜行|偷偷|暗中|秘密|隐藏/, type: 'stealth' },
  { pattern: /调查|探查|查看|检查|观察|搜寻|搜索/, type: 'stealth' },
  { pattern: /接受|答应|同意|允许|认可/, type: 'normal' },
  { pattern: /拒绝|回绝|推辞|婉拒|不答/, type: 'normal' },
  { pattern: /探索|前进|继续|深入|前行|考察/, type: 'normal' },
  { pattern: /交谈|对话|询问|打听|问候|攀谈/, type: 'social' },
  { pattern: /等待|静观|观望|看看|再等|暂且/, type: 'normal' },
  { pattern: /威胁|恐吓|威逼|震慑|吓唬/, type: 'danger' },
  { pattern: /欺骗|撒谎|编造|隐瞒|谎言|伪装/, type: 'danger' },
  { pattern: /交易|买卖|交换|出售|购买|讲价/, type: 'social' },
  { pattern: /休息|睡觉|打坐|休整|调息/, type: 'normal' },
];

export function inferChoiceType(text: string): 'combat' | 'social' | 'stealth' | 'normal' | 'danger' | undefined {
  if (!text) return undefined;
  for (const { pattern, type } of CHOICE_PATTERNS) {
    if (pattern.test(text)) return type;
  }
  return undefined;
}
