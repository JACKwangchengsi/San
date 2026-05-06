import { NPC } from '../types/game';

const genderBase = {
  female: {
    face: ['眉眼清秀', '轮廓柔和', '唇色偏淡', '鼻梁秀挺'],
    body: ['身形纤细', '肩线柔和', '步伐轻稳'],
    hair: ['乌发高束', '长发半挽', '发丝整洁利落'],
  },
  male: {
    face: ['眉骨分明', '面部线条清朗', '鼻梁笔直', '下颌轮廓清晰'],
    body: ['身形挺拔', '肩背平直', '动作沉稳'],
    hair: ['黑发束起', '短发利落', '发髻简洁'],
  },
  other: {
    face: ['五官清隽', '轮廓中性分明'],
    body: ['身形修长', '动作克制'],
    hair: ['发束整齐', '发丝自然'],
  },
};

export const getAgeGenderLabel = (age: number, gender: NPC['gender']) => {
  if (gender === 'female') {
    if (age <= 16) return '少女';
    if (age <= 24) return '年轻女子';
    if (age <= 42) return '成熟女子';
    return '年长女子';
  }
  if (gender === 'male') {
    if (age <= 16) return '少年';
    if (age <= 24) return '年轻男子';
    if (age <= 42) return '成年男子';
    return '年长男子';
  }
  if (age <= 18) return '年轻人';
  if (age <= 45) return '成年人';
  return '年长之人';
};

const ageTone = (age: number, gender: NPC['gender']) => {
  const title = getAgeGenderLabel(age, gender);
  if (age <= 16) return [title, '面上还带些稚气', '神色尚显青涩'];
  if (age <= 22) return [title, '正值风华', '神采最盛'];
  if (age <= 35) return [title, '气质逐渐沉稳', '神情多了历练'];
  if (age <= 50) return [title, '目光稳重', '神情里有岁月磨砺'];
  return [title, '面容略显风霜', '举止沉定老练'];
};

const occupationLook = (occupation: string) => {
  if (/医|药|郎中|医馆/.test(occupation)) return ['衣襟干净', '袖口利落', '身上若有若无带药香'];
  if (/侠|游侠|散修|剑客|刀客/.test(occupation)) return ['衣袂便于行动', '身上带风尘感', '腰间常见兵刃'];
  if (/镖|护卫|捕头|衙役/.test(occupation)) return ['体格结实', '站姿稳健', '神色警惕'];
  if (/掌柜|商贩|老板|账房/.test(occupation)) return ['衣料尚算体面', '眼神精明', '说话留有余地'];
  if (/弟子|门人|门徒/.test(occupation)) return ['服饰带有门派规整感', '言行仍存师门痕迹'];
  if (/书生|先生|文士/.test(occupation)) return ['衣着素净', '手指修长', '带些书卷气'];
  return ['古风装束整齐', '气质与身份相称'];
};

const personalityLook = (tags: string[]) => {
  const text = tags.join('、');
  const result: string[] = [];
  if (/冷|寡言|谨慎|警觉/.test(text)) result.push('眼神常带戒备', '很少显露多余情绪');
  if (/温和|善良|柔和|细腻/.test(text)) result.push('神态柔和', '目光里少有锋芒');
  if (/豪爽|热血|冲动|直接/.test(text)) result.push('动作幅度偏大', '神情外露');
  if (/狡黠|机敏|聪明|精明/.test(text)) result.push('目光灵动', '神情常似有试探');
  if (/坚韧|沉稳|克制/.test(text)) result.push('站姿稳', '情绪收束得很好');
  return result.length ? result : ['神态自然，不刻意夸张'];
};

export function buildNPCPortraitProfile(npc: NPC) {
  const base = genderBase[npc.gender || 'other'];
  const pieces = [
    ...ageTone(npc.age || 18, npc.gender || 'other'),
    ...base.hair.slice(0, 1),
    ...base.face.slice(0, 2),
    ...base.body.slice(0, 1),
    ...occupationLook(npc.occupation || ''),
    ...personalityLook(npc.personalityTags || []),
  ];
  return pieces.join('，');
}

export function buildNPCVisualSummary(npc: NPC, extraNote?: string) {
  const own = (npc.appearance || '').trim();
  const auto = buildNPCPortraitProfile(npc);
  return [own, auto, (extraNote || '').trim()].filter(Boolean).join('，');
}

export function generatePlayerPortraitProfile(player: { age?: number; gender?: string; role?: string; sect?: string; traits?: string[]; appearance?: string; background?: string }) {
  const gender = (player.gender || 'male') as NPC['gender'];
  const age = player.age || 15;
  const title = getAgeGenderLabel(age, gender);
  const base = genderBase[gender] || genderBase.other;
  const role = player.role || '江湖中人';
  const traitsText = (player.traits || []).join('、');
  const sectText = player.sect ? `身上带有${player.sect}一脉的气息` : '尚无明显门派标记';
  const backgroundHint = player.background?.includes('乞丐')
    ? '衣着略旧，带些风尘与求生的警惕'
    : player.background?.includes('书生')
      ? '神态里带书卷气'
      : player.background?.includes('军')
        ? '站姿稳，动作更利落'
        : '气质仍带初入江湖的青涩与戒备';

  return [
    title,
    ...base.hair.slice(0, 1),
    ...base.face.slice(0, 2),
    ...base.body.slice(0, 1),
    role,
    sectText,
    backgroundHint,
    traitsText ? `性情外显：${traitsText}` : '',
    player.appearance || '',
  ].filter(Boolean).join('，');
}
