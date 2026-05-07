import React, { useState, useEffect } from 'react';
import { BirthSettings } from '../types/game';
import { Sparkles, Sword, Scroll, Shield, Heart, Star, ChevronRight, ChevronLeft, User, BookOpen } from 'lucide-react';

interface BirthSettingsPanelProps {
  onComplete: (settings: BirthSettings) => void;
}

const STEPS = ['身份', '出身', '前世', '性格', '志向'] as const;

const BirthSettingsPanel: React.FC<BirthSettingsPanelProps> = ({ onComplete }) => {
  const [settings, setSettings] = useState<BirthSettings>({
    name: '',
    age: 15,
    gender: 'male',
    origin: 'beggar',
    memory: 'webnovel',
    trait: 'resilient',
    customBackground: ''
  });
  const [extra, setExtra] = useState({
    goal: '先活下去，再寻找立身之本',
    taboo: '不愿轻易害无辜之人',
    secret: '记得前世大量玄幻与武侠套路',
    temper: '表面谨慎，内里不甘平庸'
  });
  const [step, setStep] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    setAnimKey(prev => prev + 1);
  }, [step]);

  const origins = [
    { key: 'beggar', name: '🏚️ 流浪乞丐', desc: '身无分文，熟悉巷陌人情与底层生存法则。', bonus: '体力+10，求生意识更强', icon: '🏚️' },
    { key: 'farmer', name: '🌾 农家子弟', desc: '从小务农，吃苦耐劳，知晓四时与粮食珍贵。', bonus: '耐力+10，饱腹下降较慢', icon: '🌾' },
    { key: 'scholar', name: '📚 落魄书生', desc: '识文断字，知道礼法与典籍，但手无缚鸡之力。', bonus: '学识+2，交涉更稳', icon: '📚' },
    { key: 'soldier', name: '⚔️ 军户遗孤', desc: '幼时见过军阵与刀兵，懂服从，也懂狠劲。', bonus: '近战+5，胆魄更高', icon: '⚔️' },
    { key: 'merchant', name: '🏪 商贾之后', desc: '懂银钱往来和人情场面，知道什么叫市价与人心。', bonus: '初始银钱更多，买卖更划算', icon: '🏪' }
  ];
  const memories = [
    { key: 'webnovel', name: '🎮 网文读者', desc: '熟悉高武、玄幻、门派、秘境、气运等套路。', bonus: '更容易捕捉剧情线索', icon: '🎮' },
    { key: 'martial', name: '🥋 武术爱好者', desc: '前世练过基础搏击和发力方法。', bonus: '初始战斗理解更高', icon: '🥋' },
    { key: 'medical', name: '🏥 医学生', desc: '懂伤口处理、感染风险与人体要害。', bonus: '医术理解更强', icon: '🏥' },
    { key: 'engineer', name: '⚙️ 工科生', desc: '擅长结构、工具与简单制作逻辑。', bonus: '制作和修理判断更好', icon: '⚙️' },
    { key: 'history', name: '📖 历史爱好者', desc: '熟悉古代制度、人情和阶层关系。', bonus: '更容易理解世界秩序', icon: '📖' }
  ];
  const traits = [
    { key: 'resilient', name: '💪 坚韧', desc: '咬牙也能撑过去。', bonus: '逆境恢复更快', icon: '💪' },
    { key: 'agile', name: '⚡ 机敏', desc: '眼快手快，先一步察觉。', bonus: '搜索与闪避更优', icon: '⚡' },
    { key: 'calm', name: '🧘 沉稳', desc: '不轻易乱阵脚。', bonus: '心境波动更低', icon: '🧘' },
    { key: 'passionate', name: '🔥 热血', desc: '愿意出手，容易上头。', bonus: '关键时刻战意更强', icon: '🔥' },
    { key: 'cold', name: '❄️ 冷静', desc: '会权衡利弊，不轻信他人。', bonus: '高压局面判断更稳', icon: '❄️' }
  ];

  const handleSubmit = () => {
    if (!settings.name.trim()) {
      alert('请输入角色姓名');
      setStep(0);
      return;
    }
    onComplete({
      ...settings,
      origin: (settings.origin === 'beggar' ? 'begger' : settings.origin) as BirthSettings['origin'],
      temperament: extra.temper,
      goal: extra.goal,
      bottomLine: extra.taboo,
      hiddenEdge: extra.secret,
      customBackground: settings.customBackground?.trim() || ''
    });
  };

  const nextStep = () => { if (step === 0 && !settings.name.trim()) { alert('请先输入角色姓名'); return; } setStep(Math.min(STEPS.length - 1, step + 1)); };
  const prevStep = () => setStep(Math.max(0, step - 1));

  const renderPreview = () => (
    <div className="p-4 bg-zinc-800/40 rounded-xl border border-zinc-700/60 animate-fade-in">
      <h3 className="text-xs font-semibold text-amber-400/80 mb-3 flex items-center gap-2"><Sparkles size={12} />角色预览</h3>
      <p className="text-zinc-300 text-sm leading-relaxed">
        <span className="text-white font-medium">{settings.name || '???'}</span>，<span className="text-amber-300">{settings.age}岁</span>，{settings.gender === 'male' ? '男' : '女'}。
        你如今以一名<span className="text-amber-200">{origins.find(o => o.key === settings.origin)?.name.replace(/[🏚️🌾📚⚔️🏪]/g, '').trim()}</span>
        {settings.gender === 'male' ? '少年' : '少女'}的身份活在这个世界。
        前世的你是<span className="text-purple-300">{memories.find(m => m.key === settings.memory)?.name.replace(/[🎮🥋🏥⚙️📖]/g, '').trim()}</span>，
        性情偏向<span className="text-red-300">{traits.find(t => t.key === settings.trait)?.name.replace(/[💪⚡🧘🔥❄️]/g, '').trim()}</span>。
        你现在最在意的是"<span className="text-green-300">{extra.goal}</span>"，但你始终坚持"<span className="text-blue-300">{extra.taboo}</span>"。
      </p>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/95 z-50 overflow-y-auto animate-modal-backdrop">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-2xl animate-modal-panel-in">
          {/* 标题横幅 */}
          <div className="relative rounded-t-2xl bg-gradient-to-r from-amber-900/40 via-red-900/30 to-amber-900/40 border border-b-0 border-amber-900/40 p-6 text-center overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,165,86,0.08),transparent_70%)]" />
            <div className="relative z-10">
              <div className="flex items-center justify-center gap-3 mb-2">
                <Sword size={18} className="text-amber-500/70" />
                <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-amber-200 to-amber-500">踏入江湖</h1>
                <Sword size={18} className="text-amber-500/70" />
              </div>
              <p className="text-sm text-zinc-400">你从现代穿越而来，附身在一个濒死的十五岁乞丐身上。</p>
              <p className="text-xs text-zinc-500 mt-1">你的过去、性情、目标，将影响 AI 如何生成你的世界。</p>
            </div>
          </div>

          {/* 步骤指示器 */}
          <div className="bg-zinc-900 border-x border-zinc-800 px-6 pt-5 pb-3">
            <div className="flex items-center justify-between mb-1">
              {STEPS.map((label, i) => (
                <div key={label} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                      i < step ? 'bg-amber-600 text-white shadow-md shadow-amber-900/30' :
                      i === step ? 'bg-amber-500 text-white shadow-lg shadow-amber-900/40 ring-2 ring-amber-400/40 scale-110' :
                      'bg-zinc-800 text-zinc-500'
                    }`}>
                      {i < step ? '✓' : i + 1}
                    </div>
                    <span className={`text-[10px] mt-1.5 transition-colors ${i <= step ? 'text-amber-400' : 'text-zinc-600'}`}>{label}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-1 rounded transition-all duration-500 ${i < step ? 'bg-amber-600' : 'bg-zinc-800'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 步骤内容 */}
          <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-x border-zinc-800 px-6 py-5 space-y-5 min-h-[360px]" key={animKey}>
            {/* 步骤 1: 身份 */}
            {step === 0 && (
              <div className="animate-fade-in-up space-y-5">
                <div className="flex items-center gap-2 text-sm text-amber-400 font-semibold"><User size={15} />你的身份</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5">角色姓名</label>
                    <input type="text" value={settings.name} onChange={(e) => setSettings({ ...settings, name: e.target.value })} placeholder="输入姓名..." className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white placeholder-zinc-500 focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all input-jianghu" maxLength={10} autoFocus />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5">年龄</label>
                    <input type="number" value={settings.age} onChange={(e) => setSettings({ ...settings, age: Math.min(30, Math.max(12, parseInt(e.target.value) || 15)) })} min={12} max={30} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all input-jianghu" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">性别</label>
                  <div className="flex gap-3">
                    <button onClick={() => setSettings({ ...settings, gender: 'male' })} className={`flex-1 p-3 rounded-lg border transition-all duration-300 ${settings.gender === 'male' ? 'bg-blue-900/40 border-blue-500/60 text-blue-300 shadow-md shadow-blue-900/20' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-750'}`}>♂ 男</button>
                    <button onClick={() => setSettings({ ...settings, gender: 'female' })} className={`flex-1 p-3 rounded-lg border transition-all duration-300 ${settings.gender === 'female' ? 'bg-pink-900/40 border-pink-500/60 text-pink-300 shadow-md shadow-pink-900/20' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-750'}`}>♀ 女</button>
                  </div>
                </div>
                {renderPreview()}
              </div>
            )}

            {/* 步骤 2: 出身 */}
            {step === 1 && (
              <div className="animate-fade-in-up space-y-4">
                <div className="flex items-center gap-2 text-sm text-amber-400 font-semibold"><Shield size={15} />出身背景</div>
                <div className="grid grid-cols-1 gap-2">
                  {origins.map((origin) => (
                    <button key={origin.key} onClick={() => setSettings({ ...settings, origin: origin.key as BirthSettings['origin'] })}
                      className={`p-3.5 rounded-xl border text-left transition-all duration-300 ${
                        settings.origin === origin.key
                          ? 'bg-amber-900/30 border-amber-500/60 shadow-md shadow-amber-900/20 scale-[1.01]'
                          : 'bg-zinc-800/60 border-zinc-700/60 hover:bg-zinc-700/60 hover:border-zinc-600'
                      }`}>
                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <div className="text-white font-medium text-sm">{origin.name}</div>
                          <div className="text-xs text-zinc-400 mt-1 leading-relaxed">{origin.desc}</div>
                        </div>
                        <div className="text-[10px] text-green-400 whitespace-nowrap bg-green-950/30 px-2 py-1 rounded-full">{origin.bonus}</div>
                      </div>
                    </button>
                  ))}
                </div>
                {renderPreview()}
              </div>
            )}

            {/* 步骤 3: 前世 */}
            {step === 2 && (
              <div className="animate-fade-in-up space-y-4">
                <div className="flex items-center gap-2 text-sm text-amber-400 font-semibold"><BookOpen size={15} />穿越前的身份</div>
                <div className="grid grid-cols-1 gap-2">
                  {memories.map((memory) => (
                    <button key={memory.key} onClick={() => setSettings({ ...settings, memory: memory.key as BirthSettings['memory'] })}
                      className={`p-3.5 rounded-xl border text-left transition-all duration-300 ${
                        settings.memory === memory.key
                          ? 'bg-purple-900/30 border-purple-500/60 shadow-md shadow-purple-900/20 scale-[1.01]'
                          : 'bg-zinc-800/60 border-zinc-700/60 hover:bg-zinc-700/60 hover:border-zinc-600'
                      }`}>
                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <div className="text-white font-medium text-sm">{memory.name}</div>
                          <div className="text-xs text-zinc-400 mt-1 leading-relaxed">{memory.desc}</div>
                        </div>
                        <div className="text-[10px] text-green-400 whitespace-nowrap bg-green-950/30 px-2 py-1 rounded-full">{memory.bonus}</div>
                      </div>
                    </button>
                  ))}
                </div>
                {renderPreview()}
              </div>
            )}

            {/* 步骤 4: 性格 */}
            {step === 3 && (
              <div className="animate-fade-in-up space-y-4">
                <div className="flex items-center gap-2 text-sm text-amber-400 font-semibold"><Heart size={15} />初始性格特质</div>
                <div className="grid grid-cols-2 gap-2">
                  {traits.map((trait) => (
                    <button key={trait.key} onClick={() => setSettings({ ...settings, trait: trait.key as BirthSettings['trait'] })}
                      className={`p-3 rounded-xl border text-left transition-all duration-300 ${
                        settings.trait === trait.key
                          ? 'bg-red-900/30 border-red-500/60 shadow-md shadow-red-900/20 scale-[1.02]'
                          : 'bg-zinc-800/60 border-zinc-700/60 hover:bg-zinc-700/60 hover:border-zinc-600'
                      }`}>
                      <div className="text-white font-medium text-sm">{trait.name}</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">{trait.desc}</div>
                      <div className="text-[10px] text-green-400 mt-1">{trait.bonus}</div>
                    </button>
                  ))}
                </div>
                {renderPreview()}
              </div>
            )}

            {/* 步骤 5: 志向 */}
            {step === 4 && (
              <div className="animate-fade-in-up space-y-4">
                <div className="flex items-center gap-2 text-sm text-amber-400 font-semibold"><Star size={15} />你的志向与底线</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5">当前最大目标</label>
                    <input value={extra.goal} onChange={(e) => setExtra({ ...extra, goal: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all input-jianghu" placeholder="例：先活下去，再寻找立身之本" />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5">你的底线/忌讳</label>
                    <input value={extra.taboo} onChange={(e) => setExtra({ ...extra, taboo: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all input-jianghu" placeholder="例：不愿轻易害无辜之人" />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5">你隐藏的优势</label>
                    <input value={extra.secret} onChange={(e) => setExtra({ ...extra, secret: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all input-jianghu" placeholder="例：记得前世大量玄幻与武侠套路" />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5">你给人的第一印象</label>
                    <input value={extra.temper} onChange={(e) => setExtra({ ...extra, temper: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all input-jianghu" placeholder="例：表面谨慎，内里不甘平庸" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">补充背景（可选）</label>
                  <textarea value={settings.customBackground} onChange={(e) => setSettings({ ...settings, customBackground: e.target.value })} placeholder="例如：你对宗门、秘籍、复仇、赚钱、女人、权力的态度……" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white placeholder-zinc-500 focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all h-20 resize-none text-sm input-jianghu" maxLength={260} />
                </div>
                {renderPreview()}
              </div>
            )}
          </div>

          {/* 底部导航 */}
          <div className="bg-zinc-900 border border-t-0 border-zinc-800 rounded-b-2xl px-6 py-4 flex items-center justify-between">
            <button onClick={prevStep} disabled={step === 0} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
              <ChevronLeft size={16} />上一步
            </button>
            <div className="text-xs text-zinc-600">{step + 1} / {STEPS.length}</div>
            {step < STEPS.length - 1 ? (
              <button onClick={nextStep} className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-sm font-medium transition-all shadow-md shadow-amber-900/30">
                下一步<ChevronRight size={16} />
              </button>
            ) : (
              <button onClick={handleSubmit} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-white font-bold text-sm transition-all shadow-lg shadow-amber-900/30 hover:scale-[1.02] active:scale-[0.98]">
                <Sword size={14} />开始江湖之旅
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BirthSettingsPanel;
