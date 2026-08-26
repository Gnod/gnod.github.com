// 程序化音频：全部用 WebAudio 现合成，不含任何音频资源文件。
// 结构：pad 铺底 + 稀疏五声音阶点缀 + 事件音效，紧张度随最近的危险实时调制。
const A2 = 110;
const SEMI = (n) => A2 * Math.pow(2, n / 12);
// 小调五声：root, m3, 4, 5, m7
const PENTA = [0, 3, 5, 7, 10];

function noteFreq(i) {
  const oct = Math.floor(i / PENTA.length);
  return SEMI(PENTA[((i % PENTA.length) + PENTA.length) % PENTA.length] + oct * 12);
}

function makeIR(ctx, seconds = 2.6, decay = 2.8) {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * seconds);
  const buf = ctx.createBuffer(2, len, rate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  return buf;
}

function makeNoise(ctx, seconds = 1) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

export class Sound {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.musicVol = 0.5;
    this.sfxVol = 0.7;
    this.muted = false;
    this.tension = 0;
    this._tensionSmooth = 0;
    this._nextStep = 0;
    this._step = 0;
    this.track = null;        // 当前播放的曲目源
    this.trackName = null;
    this._buffers = new Map();
  }

  /** 必须由用户手势触发（浏览器自动播放策略） */
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();

    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(ctx.destination);

    // 混响总线
    this.verb = ctx.createConvolver();
    this.verb.buffer = makeIR(ctx);
    this.verbGain = ctx.createGain();
    this.verbGain.gain.value = 0.55;
    this.verb.connect(this.verbGain).connect(this.master);

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = this.musicVol * 0.5;
    this.musicBus.connect(this.master);
    this.musicBus.connect(this.verb);

    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = this.sfxVol;
    this.sfxBus.connect(this.master);
    const sfxSend = ctx.createGain();
    sfxSend.gain.value = 0.30;
    this.sfxBus.connect(sfxSend).connect(this.verb);

    this.noiseBuf = makeNoise(ctx, 2);

    // ── 运动声部（常驻）
    // 这游戏最核心的两个动作 —— 移动和停下 —— 原本完全无声：十个音效全是事件
    // （光点/死亡/按钮/推块/传送……），而你每一秒都在做的那件事没有声音。
    //
    // 不能用脚步声：一秒七格会变成机关枪。所以做成一条跟着状态走的持续声，
    // 音量与音色由"在动没有""脚下是不是虚线"决定。
    // 虚线上那层嘶声是有信息量的 —— "你现在没有刹车"目前只有画面在说。
    // 第一版是带通，中心 2100Hz —— 那正好落在人耳最敏感的 2~4kHz，
    // 一条固定的窄带噪声搁在那儿听起来像底噪、像喇叭坏了，不像"在滑"。
    // 改成低通：滤掉高频的噪声读作气流与速度，而不是嘶声。
    this.motionFilter = ctx.createBiquadFilter();
    this.motionFilter.type = 'lowpass';
    this.motionFilter.frequency.value = 300;
    this.motionFilter.Q.value = 0.7;                 // 0.7 = 无谐振峰，别在截止点上鼓包
    this.motionGain = ctx.createGain();
    this.motionGain.gain.value = 0;
    this.motionFilter.connect(this.motionGain).connect(this.sfxBus);
    const mn = ctx.createBufferSource();
    // 单独一段更长的噪声：2 秒的循环在低频上能听出周期，4 秒基本听不出来
    mn.buffer = makeNoise(ctx, 4);
    mn.loop = true;
    mn.connect(this.motionFilter);
    mn.start();

    // ── 铺底 pad：三个失谐锯齿波过低通，滤波频率跟紧张度走
    this.padFilter = ctx.createBiquadFilter();
    this.padFilter.type = 'lowpass';
    this.padFilter.frequency.value = 380;
    this.padFilter.Q.value = 3.5;
    this.padGain = ctx.createGain();
    this.padGain.gain.value = 0;
    this.padFilter.connect(this.padGain).connect(this.musicBus);

    this.pads = [];
    for (const [semi, detune] of [[0, -6], [7, 4], [12, -11], [15, 9]]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = SEMI(semi);
      o.detune.value = detune;
      const g = ctx.createGain();
      g.gain.value = 0.22;
      o.connect(g).connect(this.padFilter);
      o.start();
      this.pads.push(o);
    }
    // pad 缓慢淡入，避免开场突兀
    this.padGain.gain.setTargetAtTime(0.36, ctx.currentTime, 3.5);

    // 低频呼吸
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.055;
    const lfoAmt = ctx.createGain();
    lfoAmt.gain.value = 120;
    lfo.connect(lfoAmt).connect(this.padFilter.frequency);
    lfo.start();

    // 曲目总线：走同一条 tension 调制的低通，所以即使是固定文件，
    // 危险贴近时音色也会跟着变 —— 不然加了文件就丢掉自适应
    this.trackFilter = ctx.createBiquadFilter();
    this.trackFilter.type = 'lowpass';
    this.trackFilter.frequency.value = 1400;
    this.trackGain = ctx.createGain();
    this.trackGain.gain.value = 0;
    this.trackFilter.connect(this.trackGain).connect(this.musicBus);

    this._nextStep = ctx.currentTime + 0.4;
    this.ready = true;
    if (this._pendingTrack) { const u = this._pendingTrack; this._pendingTrack = null; this.setTrack(u.url, u.name); }
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.05);
  }
  setMusicVol(v) { this.musicVol = v; if (this.musicBus) this.musicBus.gain.value = v * 0.5; }
  setSfxVol(v) { this.sfxVol = v; if (this.sfxBus) this.sfxBus.gain.value = v; }

  /** App 切到后台时显式停住音频时钟；回来后从原位置继续，不补播后台音符。 */
  suspend() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    this.ctx.suspend().catch(() => {});
  }

  resume() {
    if (!this.ctx || this.ctx.state !== 'suspended') return;
    this.ctx.resume().catch(() => {});
  }

  // ── 基础发声单元
  _tone(freq, { type = 'sine', dur = 0.3, attack = 0.004, gain = 0.3, to = null, bus = null } = {}) {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(bus || this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  _noise({ dur = 0.3, gain = 0.3, from = 3000, to = 200, type = 'lowpass', Q = 1 } = {}) {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type; f.Q.value = Q;
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(40, to), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.sfxBus);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  // ── 事件音效
  play(name, arg) {
    if (!this.ready || this.muted) return;
    switch (name) {
      case 'orb': {
        const n = 7 + ((arg || 1) % 6);      // 连续收集音高递升
        this._tone(noteFreq(n) * 4, { type: 'sine', dur: 0.55, gain: 0.22 });
        this._tone(noteFreq(n) * 6, { type: 'sine', dur: 0.35, gain: 0.09 });
        break;
      }
      case 'death':
        this._noise({ dur: 0.42, gain: 0.30, from: 2600, to: 90, Q: 2 });
        this._tone(180, { type: 'triangle', dur: 0.45, gain: 0.26, to: 42 });
        break;
      case 'respawn':
        this._tone(noteFreq(5) * 2, { type: 'sine', dur: 0.26, gain: 0.14, to: noteFreq(8) * 2 });
        break;
      case 'checkpoint':
        this._tone(noteFreq(12) * 2, { type: 'sine', dur: 0.5, gain: 0.07 });
        break;
      case 'click':
        this._tone(660, { type: 'square', dur: 0.07, gain: 0.10 });
        this._tone(1320, { type: 'sine', dur: 0.12, gain: 0.06 });
        break;
      case 'timeout':
        this._tone(440, { type: 'square', dur: 0.10, gain: 0.09, to: 300 });
        break;
      case 'push':
        this._noise({ dur: 0.14, gain: 0.22, from: 900, to: 120, Q: 0.7 });
        this._tone(96, { type: 'sine', dur: 0.16, gain: 0.20, to: 62 });
        break;
      case 'portal':
        this._tone(noteFreq(4) * 2, { type: 'triangle', dur: 0.34, gain: 0.16, to: noteFreq(11) * 4 });
        this._noise({ dur: 0.3, gain: 0.10, from: 400, to: 5000, type: 'bandpass', Q: 6 });
        break;
      case 'boost':
        this._noise({ dur: 0.25, gain: 0.14, from: 300, to: 4200, type: 'bandpass', Q: 3 });
        break;
      // 起步 / 停住 —— 极轻，它们是标点不是鼓点（和触觉同一条原则）
      case 'start':
        this._tone(noteFreq(6) * 2, { type: 'sine', dur: 0.09, gain: 0.045, to: noteFreq(8) * 2 });
        break;
      case 'settle':
        this._tone(noteFreq(3), { type: 'sine', dur: 0.13, gain: 0.075, to: noteFreq(1) });
        break;
      // 闸门：开与关必须听得出方向，因为它常常发生在画面外 ——
      // "我刚按的那个钮到底动了什么"这句话经常只能靠耳朵回答
      case 'gate':
        this._tone(noteFreq(7) * 2, { type: 'triangle', dur: 0.22, gain: 0.10, to: noteFreq(11) * 2 });
        break;
      case 'gateShut':
        this._tone(noteFreq(9) * 2, { type: 'triangle', dur: 0.20, gain: 0.09, to: noteFreq(4) * 2 });
        break;
      // 计时钮在走表。原来只有到期那一声 —— 等于表是哑的，只在爆炸时响
      case 'tick':
        this._tone(1180, { type: 'sine', dur: 0.045, gain: 0.05 });
        break;
      // 追兵盯上你 / 放弃。世界六的全部张力就是这个状态位
      case 'hunt':
        this._tone(noteFreq(2), { type: 'sawtooth', dur: 0.3, gain: 0.10, to: noteFreq(5) });
        this._noise({ dur: 0.22, gain: 0.07, from: 180, to: 900, type: 'bandpass', Q: 2 });
        break;
      case 'calm':
        this._tone(noteFreq(5), { type: 'sine', dur: 0.34, gain: 0.06, to: noteFreq(2) });
        break;
      // 光点闸门打开：整局攒下来的那一下
      case 'vault': {
        [0, 7, 12].forEach((s2, i) => setTimeout(() => this._tone(SEMI(s2) * 4, {
          type: 'sine', dur: 0.9, gain: 0.13,
        }), i * 110));
        this._noise({ dur: 0.8, gain: 0.08, from: 200, to: 3600, type: 'bandpass', Q: 4 });
        break;
      }
      case 'win': {
        const t0 = [0, 3, 5, 7, 10, 12];
        t0.forEach((s, i) => setTimeout(() => this._tone(SEMI(s) * 4, {
          type: 'sine', dur: 0.7, gain: 0.16,
        }), i * 95));
        break;
      }
    }
  }

  /**
   * 换成外部曲目。url 为 null 则回到程序化。
   * 文件缺失或解码失败一律静默回落 —— 音乐是可选项，不该让游戏白屏。
   */
  async setTrack(url, name = null) {
    if (!this.ready) { this._pendingTrack = url ? { url, name } : null; return !!url; }
    const ctx = this.ctx;
    // 先淡出旧的
    if (this.track) {
      const old = this.track;
      this.trackGain.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
      setTimeout(() => { try { old.stop(); } catch { /* 已停 */ } }, 900);
      this.track = null;
    }
    this.trackName = null;
    if (!url) { this.padGain.gain.setTargetAtTime(0.36, ctx.currentTime, 0.6); return false; }

    try {
      let buf = this._buffers.get(url);
      if (!buf) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(res.status);
        buf = await ctx.decodeAudioData(await res.arrayBuffer());
        this._buffers.set(url, buf);
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.connect(this.trackFilter);
      src.start(ctx.currentTime + 0.02);
      this.track = src;
      this.trackName = name;
      this.trackGain.gain.setTargetAtTime(0.85, ctx.currentTime, 0.6);
      this.padGain.gain.setTargetAtTime(0.05, ctx.currentTime, 0.6);   // 程序化的垫底退到几乎听不见
      return true;
    } catch {
      this.padGain.gain.setTargetAtTime(0.36, ctx.currentTime, 0.6);
      return false;
    }
  }

  /** 每帧调用：推进环境音乐，并把紧张度映射到音色 */
  /** 每帧喂运动状态。moving = 在动，sliding = 脚下是虚线 */
  motion(dt, moving, sliding) {
    if (!this.ready || !this.motionGain) return;
    const t = this.ctx.currentTime;
    // 实线上几乎听不见，虚线上明显 —— 差值本身就是那条信息
    const g = this.muted || !moving ? 0 : (sliding ? 0.05 : 0.011);
    const f = sliding ? 1150 : 300;
    // 必须走 setTargetAtTime，不能每帧直接赋 .value。
    // AudioParam 直接赋值是瞬时跳变，每秒 60 次跳变叠在噪声上就是 60Hz 的一层嗡 ——
    // 第一版就是这么写的，听起来"怪"的主要来源。这个文件里其他参数
    // （pad 滤波、混响、曲目滤波）本来就都走 setTargetAtTime，只有这条漏了。
    this.motionGain.gain.setTargetAtTime(g * this.sfxVol, t, sliding ? 0.05 : 0.09);
    this.motionFilter.frequency.setTargetAtTime(f, t, 0.10);
  }

  update(dt, tension = 0) {
    if (!this.ready) return;
    const ctx = this.ctx;
    this._tensionSmooth += (tension - this._tensionSmooth) * Math.min(1, dt * 2.2);
    const T = this._tensionSmooth;

    // 紧张时滤波打开、混响收紧
    this.padFilter.frequency.setTargetAtTime(360 + T * 900, ctx.currentTime, 0.35);
    this.verbGain.gain.setTargetAtTime(0.55 - T * 0.28, ctx.currentTime, 0.6);
    // 外部曲目也走同一条调制：贴近危险时闷下去，脱险后打开
    if (this.trackFilter) {
      this.trackFilter.frequency.setTargetAtTime(1500 - T * 900, ctx.currentTime, 0.4);
    }

    // 稀疏点缀：紧张时步进变密
    const stepDur = 1.45 - T * 0.75;
    // 标签页切走时 rAF 停了，但 AudioContext 的时钟照走。回来时 _nextStep
    // 已经落后几十秒，若原样补齐会一次性排出几十个音符全部立刻发声。
    // 落后就直接对齐到当下，不补课。
    if (this._nextStep < ctx.currentTime) this._nextStep = ctx.currentTime + 0.05;
    while (this._nextStep < ctx.currentTime + 0.2) {
      this._scheduleStep(this._nextStep, T);
      this._nextStep += stepDur;
      this._step++;
    }
  }

  _scheduleStep(when, T) {
    const ctx = this.ctx;
    // 有外部曲目时，程序化只留极稀疏的点缀，避免两层打架
    const density = (this.track ? 0.06 : 0.28) + T * (this.track ? 0.10 : 0.4);
    if (Math.random() > density) return;

    const deg = [0, 2, 4, 5, 7, 9, 11][Math.floor(Math.random() * 7)];
    const freq = noteFreq(deg) * (Math.random() < 0.35 ? 8 : 4);

    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = freq;
    const g = ctx.createGain();
    const peak = 0.055 + T * 0.03;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(peak, when + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 1.5);
    o.connect(g).connect(this.musicBus);
    o.start(when);
    o.stop(when + 1.6);

    // 紧张时补一记低频心跳
    if (T > 0.55 && Math.random() < 0.5) {
      const b = ctx.createOscillator();
      b.type = 'sine';
      b.frequency.setValueAtTime(70, when);
      b.frequency.exponentialRampToValueAtTime(44, when + 0.3);
      const bg = ctx.createGain();
      bg.gain.setValueAtTime(0.0001, when);
      bg.gain.exponentialRampToValueAtTime(0.10 * T, when + 0.01);
      bg.gain.exponentialRampToValueAtTime(0.0001, when + 0.35);
      b.connect(bg).connect(this.musicBus);
      b.start(when); b.stop(when + 0.4);
    }
  }
}
