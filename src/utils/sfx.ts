// 中国五声音阶 (pentatonic) - 宫商角徵羽
export const PENTATONIC = {
  宫: [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00],
  商: [293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00, 1046.50],
  角: [329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66],
  徵: [392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66, 1318.51],
  羽: [440.00, 523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66, 1318.51, 1567.98],
};

// 预定义旋律片段 (使用五声音阶)
export const MELODIES = {
  jianghu: [
    { freq: 523.25, dur: 0.45, gap: 0.12 }, { freq: 587.33, dur: 0.25, gap: 0.08 },
    { freq: 659.25, dur: 0.55, gap: 0.15 }, { freq: 783.99, dur: 0.35, gap: 0.10 },
    { freq: 880.00, dur: 0.50, gap: 0.20 }, { freq: 783.99, dur: 0.30, gap: 0.10 },
    { freq: 659.25, dur: 0.60, gap: 0.25 }, { freq: 523.25, dur: 0.40, gap: 0.15 },
    { freq: 587.33, dur: 0.35, gap: 0.10 }, { freq: 659.25, dur: 0.70, gap: 0.30 },
  ],
  combat: [
    { freq: 440.00, dur: 0.15, gap: 0.05 }, { freq: 523.25, dur: 0.12, gap: 0.04 },
    { freq: 659.25, dur: 0.10, gap: 0.05 }, { freq: 587.33, dur: 0.12, gap: 0.04 },
    { freq: 783.99, dur: 0.10, gap: 0.05 }, { freq: 659.25, dur: 0.12, gap: 0.04 },
    { freq: 880.00, dur: 0.20, gap: 0.08 }, { freq: 783.99, dur: 0.15, gap: 0.06 },
    { freq: 659.25, dur: 0.15, gap: 0.06 }, { freq: 523.25, dur: 0.20, gap: 0.10 },
    { freq: 440.00, dur: 0.25, gap: 0.12 }, { freq: 523.25, dur: 0.15, gap: 0.06 },
    { freq: 587.33, dur: 0.15, gap: 0.06 }, { freq: 659.25, dur: 0.30, gap: 0.15 },
  ],
  explore: [
    { freq: 659.25, dur: 0.30, gap: 0.20 }, { freq: 783.99, dur: 0.25, gap: 0.15 },
    { freq: 880.00, dur: 0.40, gap: 0.25 }, { freq: 783.99, dur: 0.20, gap: 0.12 },
    { freq: 659.25, dur: 0.35, gap: 0.22 }, { freq: 587.33, dur: 0.30, gap: 0.18 },
    { freq: 523.25, dur: 0.25, gap: 0.15 }, { freq: 659.25, dur: 0.50, gap: 0.30 },
  ],
  town: [
    { freq: 392.00, dur: 0.50, gap: 0.18 }, { freq: 440.00, dur: 0.40, gap: 0.15 },
    { freq: 523.25, dur: 0.55, gap: 0.20 }, { freq: 440.00, dur: 0.35, gap: 0.12 },
    { freq: 392.00, dur: 0.45, gap: 0.18 }, { freq: 329.63, dur: 0.40, gap: 0.15 },
    { freq: 392.00, dur: 0.60, gap: 0.25 }, { freq: 440.00, dur: 0.35, gap: 0.12 },
    { freq: 523.25, dur: 0.70, gap: 0.30 },
  ],
  romance: [
    { freq: 587.33, dur: 0.55, gap: 0.20 }, { freq: 659.25, dur: 0.45, gap: 0.15 },
    { freq: 783.99, dur: 0.50, gap: 0.25 }, { freq: 659.25, dur: 0.40, gap: 0.12 },
    { freq: 523.25, dur: 0.60, gap: 0.22 }, { freq: 587.33, dur: 0.35, gap: 0.12 },
    { freq: 659.25, dur: 0.70, gap: 0.30 },
  ],
  cultivation: [
    { freq: 261.63, dur: 0.60, gap: 0.30 }, { freq: 329.63, dur: 0.50, gap: 0.25 },
    { freq: 392.00, dur: 0.65, gap: 0.35 }, { freq: 523.25, dur: 0.80, gap: 0.40 },
    { freq: 659.25, dur: 1.00, gap: 0.50 }, { freq: 783.99, dur: 1.20, gap: 0.60 },
  ],
  shop: [
    { freq: 523.25, dur: 0.20, gap: 0.10 }, { freq: 587.33, dur: 0.20, gap: 0.10 },
    { freq: 659.25, dur: 0.30, gap: 0.15 }, { freq: 523.25, dur: 0.40, gap: 0.20 },
  ],
  craft: [
    { freq: 440.00, dur: 0.10, gap: 0.05 }, { freq: 523.25, dur: 0.10, gap: 0.05 },
    { freq: 587.33, dur: 0.10, gap: 0.05 }, { freq: 659.25, dur: 0.15, gap: 0.10 },
    { freq: 783.99, dur: 0.30, gap: 0.20 },
  ],
};

const SFX = {
  ctx: null as AudioContext | null,
  ambientOn: false,
  musicOn: false,
  musicTimeout: null as ReturnType<typeof setTimeout> | null,
  musicNodes: [] as OscillatorNode[],
  musicGain: null as GainNode | null,
  ambientNodes: null as null | { osc1: OscillatorNode; osc2: OscillatorNode; gain: GainNode },
  currentTheme: 'jianghu' as keyof typeof MELODIES,

  getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.ctx;
  },

  play(freq: number, dur: number, type: OscillatorType = 'sine', vol: number = 0.12) {
    try {
      const ctx = this.getCtx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.value = vol;
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + dur);
    } catch {}
  },

  playMelody(notes: Array<{ freq: number; dur: number; gap: number }>, vol: number = 0.06, waveType: OscillatorType = 'triangle') {
    try {
      const ctx = this.getCtx();
      let time = ctx.currentTime;
      notes.forEach(({ freq, dur, gap }) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = waveType;
        o.frequency.value = freq;
        g.gain.setValueAtTime(vol, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + dur);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(time);
        o.stop(time + dur);
        this.musicNodes.push(o);
        time += dur + gap;
      });
    } catch {}
  },

  startMusic(theme?: keyof typeof MELODIES) {
    if (theme) this.currentTheme = theme;
    if (this.musicOn) this.stopMusic();
    const ctx = this.getCtx();
    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = 0.05;
    this.musicGain.connect(ctx.destination);
    this.musicOn = true;
    this._loopMusic();
  },

  _loopMusic() {
    if (!this.musicOn) return;
    const notes = MELODIES[this.currentTheme];
    const totalDur = notes.reduce((sum, n) => sum + n.dur + n.gap, 0) + 0.8;
    try {
      const ctx = this.getCtx();
      let time = ctx.currentTime;
      notes.forEach(({ freq, dur, gap }) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'triangle';
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.05, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + dur);
        o.connect(g);
        if (this.musicGain) g.connect(this.musicGain);
        else g.connect(ctx.destination);
        o.start(time);
        o.stop(time + dur);
        time += dur + gap;
      });
    } catch {}
    this.musicTimeout = setTimeout(() => this._loopMusic(), totalDur * 1000);
  },

  stopMusic() {
    this.musicOn = false;
    if (this.musicTimeout) { clearTimeout(this.musicTimeout); this.musicTimeout = null; }
    if (this.musicGain) { try { this.musicGain.disconnect(); } catch {} this.musicGain = null; }
    this.musicNodes.forEach((n) => { try { n.stop(); } catch {} });
    this.musicNodes = [];
  },

  switchTheme(theme: keyof typeof MELODIES) {
    if (this.currentTheme === theme) return;
    this.currentTheme = theme;
    if (this.musicOn) {
      this.stopMusic();
      setTimeout(() => this.startMusic(theme), 200);
    }
  },

  startAmbient() {
    if (this.ambientOn) return;
    const ctx = this.getCtx();
    const gain = ctx.createGain();
    gain.gain.value = 0.015;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.value = 98;
    osc2.frequency.value = 146.83;
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc1.start();
    osc2.start();
    this.ambientNodes = { osc1, osc2, gain };
    this.ambientOn = true;
  },

  stopAmbient() {
    if (!this.ambientOn || !this.ambientNodes) return;
    const { osc1, osc2, gain } = this.ambientNodes;
    try { osc1.stop(); osc2.stop(); } catch {}
    try { gain.disconnect(); } catch {}
    this.ambientNodes = null;
    this.ambientOn = false;
  },

  // UI interaction sounds
  click() { this.play(760, 0.05, 'sine', 0.06); },
  send() { this.play(560, 0.08, 'triangle', 0.1); },
  pickup() { this.play(523, 0.1, 'sine', 0.1); setTimeout(() => this.play(659, 0.12, 'sine', 0.08), 70); },
  danger() { this.play(140, 0.45, 'sawtooth', 0.06); },
  move() { this.play(380, 0.05, 'sine', 0.05); },
  talk() { this.play(430, 0.05, 'triangle', 0.05); },
  use() { this.play(660, 0.08, 'triangle', 0.08); },
  save() { this.play(523, 0.08, 'sine', 0.08); setTimeout(() => this.play(784, 0.1, 'sine', 0.08), 100); },
  combat() { this.play(220, 0.12, 'sawtooth', 0.08); setTimeout(() => this.play(330, 0.15, 'sawtooth', 0.06), 80); },
  dodge() { this.play(440, 0.06, 'sine', 0.06); setTimeout(() => this.play(380, 0.06, 'sine', 0.05), 50); },
  block() { this.play(180, 0.1, 'triangle', 0.08); },

  // Subsystem interaction sounds
  breakthrough() { this.play(523, 0.15, 'sine', 0.1); setTimeout(() => this.play(659, 0.18, 'sine', 0.09), 120); setTimeout(() => this.play(784, 0.25, 'triangle', 0.08), 260); },
  cultivate() { this.play(392, 0.12, 'sine', 0.07); setTimeout(() => this.play(523, 0.15, 'sine', 0.06), 100); },
  buyItem() { this.play(660, 0.06, 'sine', 0.07); setTimeout(() => this.play(880, 0.08, 'triangle', 0.06), 60); },
  sellItem() { this.play(880, 0.06, 'triangle', 0.07); setTimeout(() => this.play(660, 0.08, 'sine', 0.06), 60); },
  craftItem() { this.play(440, 0.06, 'sine', 0.06); setTimeout(() => this.play(554, 0.07, 'triangle', 0.05), 70); setTimeout(() => this.play(659, 0.1, 'sine', 0.06), 150); },
  giveItem() { this.play(523, 0.08, 'triangle', 0.07); setTimeout(() => this.play(659, 0.09, 'sine', 0.06), 80); },
  threaten() { this.play(180, 0.15, 'sawtooth', 0.06); setTimeout(() => this.play(220, 0.18, 'sawtooth', 0.05), 100); },
  recruit() { this.play(440, 0.08, 'triangle', 0.06); setTimeout(() => this.play(554, 0.1, 'sine', 0.07), 90); setTimeout(() => this.play(659, 0.12, 'triangle', 0.06), 200); },
  cultivateBreak() { this.play(523, 0.15, 'sine', 0.1); setTimeout(() => this.play(659, 0.18, 'sine', 0.09), 120); setTimeout(() => this.play(784, 0.25, 'triangle', 0.08), 260); },
};

export default SFX;
