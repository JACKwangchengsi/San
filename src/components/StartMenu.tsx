import React, { useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, History, Sparkles, Sword, Scroll, Mountain } from 'lucide-react';

interface StartMenuProps {
  hasSave: boolean;
  onContinue: () => void;
  onNewGame: () => void;
}

const FloatingParticle: React.FC<{ delay: number; left: number; size: number; duration: number; symbol: string; color: string }> = ({ delay, left, size, duration, symbol, color }) => (
  <span
    className="absolute pointer-events-none select-none opacity-0"
    style={{
      left: `${left}%`,
      fontSize: `${size}px`,
      animation: `dustFloat ${duration}s ease-out ${delay}s infinite`,
      color,
    }}
  >
    {symbol}
  </span>
);

export default function StartMenu({ hasSave, onContinue, onNewGame }: StartMenuProps) {
  const [mounted, setMounted] = useState(false);
  const [titleVisible, setTitleVisible] = useState(false);
  const [subtitleVisible, setSubtitleVisible] = useState(false);
  const [buttonsVisible, setButtonsVisible] = useState(false);
  const particlesRef = useRef<{ symbol: string; left: number; size: number; delay: number; duration: number; color: string }[]>([]);

  useEffect(() => {
    setMounted(true);
    const symbols = ['✦', '✧', '⚔', '☯', '⚘', '❖', '◆', '◇', '✿', '⚜', '✥', '❋'];
    const colors = ['rgba(212,165,86,0.35)', 'rgba(139,41,66,0.25)', 'rgba(168,85,247,0.2)', 'rgba(91,140,90,0.2)', 'rgba(255,255,255,0.15)'];
    particlesRef.current = Array.from({ length: 28 }, () => ({
      symbol: symbols[Math.floor(Math.random() * symbols.length)],
      left: Math.random() * 100,
      size: 10 + Math.random() * 18,
      delay: Math.random() * 3,
      duration: 2.5 + Math.random() * 3.5,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    const t1 = setTimeout(() => setTitleVisible(true), 200);
    const t2 = setTimeout(() => setSubtitleVisible(true), 600);
    const t3 = setTimeout(() => setButtonsVisible(true), 1000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-modal-backdrop">
      {/* 动态粒子背景 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {mounted && particlesRef.current.map((p, i) => (
          <FloatingParticle key={i} {...p} />
        ))}
        {/* 背景光晕 */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-amber-900/8 via-amber-900/4 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-gradient-to-b from-purple-900/6 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-[250px] h-[250px] bg-gradient-to-b from-red-900/5 to-transparent rounded-full blur-3xl" />
        {/* 水墨山水底纹 */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-32 opacity-[0.03]">
          <Mountain size={400} className="absolute bottom-0 left-0 text-white" />
          <Mountain size={300} className="absolute bottom-0 right-10 text-white" />
          <Mountain size={250} className="absolute bottom-0 left-1/3 text-white" />
        </div>
      </div>

      {/* 主卡片 - 卷轴风格 */}
      <div className="w-full max-w-xl relative animate-modal-panel-in">
        {/* 卷轴顶部装饰条 */}
        <div className="relative mx-auto w-[90%] h-3 bg-gradient-to-r from-amber-800 via-amber-600 to-amber-800 rounded-t-full shadow-gold opacity-80" />
        <div className="absolute top-1.5 left-[5%] right-[5%] h-[2px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

        {/* 主内容 */}
        <div className="relative rounded-2xl border border-amber-900/30 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black shadow-2xl shadow-black/60 overflow-hidden panel-ornament scroll-texture">
          {/* 内容区域 */}
          <div className="relative z-10">
            {/* 标题区 */}
            <div className="p-8 pb-6 border-b border-zinc-800/60 bg-gradient-to-b from-amber-950/15 to-transparent text-center">
              {/* 剑饰装饰 */}
              <div className={`flex items-center justify-center gap-6 mb-4 transition-all duration-800 ${titleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <div className="w-px h-10 bg-gradient-to-b from-transparent via-amber-600/50 to-transparent animate-silk-wave" />
                <Sword size={22} className="text-amber-600/60 animate-float-slow" />
                <Sparkles size={22} className="text-amber-500/70 animate-pulse" />
                <Sword size={22} className="text-amber-600/60 animate-float-slow" style={{ animationDelay: '1.6s' }} />
                <div className="w-px h-10 bg-gradient-to-b from-transparent via-amber-600/50 to-transparent animate-silk-wave" style={{ animationDelay: '2s' }} />
              </div>

              {/* 标题 */}
              <h1 className={`text-4xl sm:text-5xl font-bold tracking-[0.08em] text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 drop-shadow-lg transition-all duration-800 ${titleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
                江湖侠影<span className="text-red-500/90">录</span>
              </h1>

              {/* 副标题 */}
              <div className={`transition-all duration-700 delay-200 ${subtitleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
                <div className="flex items-center justify-center gap-3 mt-2">
                  <div className="h-px flex-1 max-w-12 bg-gradient-to-r from-transparent to-amber-700/40" />
                  <Scroll size={14} className="text-amber-700/60" />
                  <span className="text-[11px] tracking-[0.2em] text-amber-500/60 uppercase">天玄江湖 · 高武世界</span>
                  <Scroll size={14} className="text-amber-700/60" />
                  <div className="h-px flex-1 max-w-12 bg-gradient-to-l from-transparent to-amber-700/40" />
                </div>
              </div>

              {/* 描述 */}
              <p className={`mt-4 text-sm text-zinc-400 leading-6 max-w-md mx-auto transition-all duration-700 delay-300 ${subtitleVisible ? 'opacity-100' : 'opacity-0'}`}>
                这是一个高武渐近玄幻的武侠世界。你将以自己亲手创建的身份进入这个世界——<span className="text-amber-400/80">不是操控另一个独立主角，而是你本人就是这个角色</span>，在江湖里谋生、立足、修行、结交、爱与被爱。
              </p>

              {/* 装饰分割线 */}
              <div className="flex items-center gap-2 mt-5 max-w-xs mx-auto opacity-0 animate-fade-in" style={{ animationDelay: '1.2s', animationFillMode: 'forwards' }}>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-700/30 to-transparent" />
                <span className="text-[9px] text-zinc-600 tracking-widest">⚔ 江湖 ⚔</span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-700/30 to-transparent" />
              </div>
            </div>

            {/* 按钮区 */}
            <div className={`p-6 space-y-4 transition-all duration-600 delay-500 ${buttonsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
              {hasSave ? (
                <>
                  <button
                    onClick={onContinue}
                    className="w-full flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 hover:from-amber-600 hover:via-amber-500 hover:to-amber-600 text-white px-5 py-4 font-medium transition-all duration-300 shadow-lg shadow-amber-900/30 hover:shadow-amber-900/50 hover:scale-[1.01] active:scale-[0.98] btn-ripple group"
                  >
                    <History size={18} className="group-hover:animate-pulse" />
                    <span>继续游戏</span>
                    <span className="text-xs opacity-70 ml-1">← 读取上次存档</span>
                  </button>
                  <button
                    onClick={onNewGame}
                    className="w-full flex items-center justify-center gap-3 rounded-xl border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 hover:border-zinc-600 text-zinc-200 px-5 py-4 font-medium transition-all duration-300 hover:scale-[1.01] active:scale-[0.98] group"
                  >
                    <RotateCcw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
                    <span>开始新的游戏</span>
                    <span className="text-xs text-zinc-500 ml-1">← 清空进度重新开始</span>
                  </button>
                  <p className="text-[10px] text-zinc-600 text-center pt-1">继续游戏会读取上次存档；开始新的游戏会清空当前进度与聊天记录。</p>
                </>
              ) : (
                <button
                  onClick={onNewGame}
                  className="w-full flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 hover:from-amber-600 hover:via-amber-500 hover:to-amber-600 text-white px-5 py-4 font-medium transition-all duration-300 shadow-lg shadow-amber-900/30 hover:shadow-amber-900/50 hover:scale-[1.01] active:scale-[0.98] btn-ripple group"
                >
                  <Play size={18} className="group-hover:animate-pulse" />
                  <span className="text-lg">踏入江湖</span>
                  <Sword size={14} className="opacity-60 group-hover:translate-x-1 transition-transform" />
                </button>
              )}

              {/* 底部版本信息 */}
              <div className="text-center pt-2">
                <p className="text-[9px] text-zinc-700 tracking-wider">AI驱动 · 无限世界 · 你的江湖你做主</p>
              </div>
            </div>
          </div>

          {/* 卡片角落装饰 */}
          <div className="absolute top-3 left-3 w-8 h-8 border-t border-l border-amber-800/20 rounded-tl-lg pointer-events-none" />
          <div className="absolute top-3 right-3 w-8 h-8 border-t border-r border-amber-800/20 rounded-tr-lg pointer-events-none" />
          <div className="absolute bottom-3 left-3 w-8 h-8 border-b border-l border-amber-800/20 rounded-bl-lg pointer-events-none" />
          <div className="absolute bottom-3 right-3 w-8 h-8 border-b border-r border-amber-800/20 rounded-br-lg pointer-events-none" />
        </div>

        {/* 卷轴底部装饰条 */}
        <div className="relative mx-auto w-[90%] h-3 bg-gradient-to-r from-amber-800 via-amber-600 to-amber-800 rounded-b-full shadow-gold opacity-80" />
        <div className="absolute bottom-1.5 left-[5%] right-[5%] h-[2px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
      </div>
    </div>
  );
}
