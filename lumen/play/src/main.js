// 入口：画布 / 主循环 / 存档 / 暂停
import { Game } from './game/game.js';
import { Input } from './core/input.js';
import { ROOMS } from './content/rooms.js';
import { Sound } from './core/audio.js';
import { Pause } from './ui/pause.js';
import { setColorblind } from './core/theme.js';
import { haptic, setHaptics } from './core/haptics.js';
import { setLang } from './core/i18n.js';
import { loadSettings, loadProgress, applyProgress, saveProgress } from './core/save.js';

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
const hint = document.getElementById('hint');
const input = new Input(canvas);
if (globalThis.matchMedia?.('(pointer: coarse)').matches) {
  hint.textContent = '';
  hint.classList.add('touch');
}

// 刘海 / 状态栏的安全区。canvas 里用不了 env()，拿一个探针元素量出来 ——
// viewport-fit=cover 会让画布铺到状态栏底下，右上角的暂停键正好被灵动岛盖住。
const probe = document.createElement('div');
probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;' +
  'pointer-events:none;padding-top:env(safe-area-inset-top);' +
  'padding-right:env(safe-area-inset-right);';
document.body.appendChild(probe);
const safe = { top: 0, right: 0 };
function readSafeArea() {
  const cs = getComputedStyle(probe);
  safe.top = parseFloat(cs.paddingTop) || 0;
  safe.right = parseFloat(cs.paddingRight) || 0;
}

const settings = loadSettings();
const sound = new Sound();
let W = 0, H = 0, DPR = 1;

let ROOM_SET = ROOMS;            // 编辑器会就地改它，热替换后是同一个数组

function newGame() {
  const g = new Game(ROOM_SET);
  g.safe = safe;
  g.sfx = (n, a) => { sound.play(n, a); haptic(n); };
  g.reducedMotion = settings.reducedMotion;
  applyProgress(g, loadProgress(g));
  globalThis.game = g;
  return g;
}

let game = newGame();
const pause = new Pause(game, sound, settings);
pause.onJump = (room) => {
  const cp = game.entities.find(e => e.kind === 'checkpoint' && e.x === room.entry.x && e.y === room.entry.y);
  if (cp) game.setCheckpoint(cp);
  game.player.reset(room.entry.x, room.entry.y);
  game.camera.snap();
  game.reveal = Math.max(game.reveal, 1.2);
};
pause.onRetry = () => game.retry();
pause.onReset = () => { game = newGame(); pause.game = game; game.camera.resize(W, H); };

// 浏览器自动播放策略：音频必须由用户手势创建
const wakeAudio = () => {
  sound.init();
  sound.setMusicVol(settings.music);
  sound.setSfxVol(settings.sfx);
};
for (const ev of ['keydown', 'pointerdown', 'touchstart']) {
  addEventListener(ev, wakeAudio, { passive: true });
}
setColorblind(settings.colorblind);
setHaptics(settings.haptics);
setLang(settings.lang);

// 可选的外部曲目。assets/music/manifest.json 不存在或为空时什么都不会发生 ——
// 音乐是加分项，游戏必须在零音频文件的前提下照常工作。
fetch('./assets/music/manifest.json')
  .then(r => (r.ok ? r.json() : null))
  .then(m => {
    const list = (m && m.tracks || []).filter(t => t && t.file)
      .map(t => ({ name: t.name || t.file, url: `./assets/music/${t.file}` }));
    if (!list.length) return;
    pause.setTracks(list);
    if (settings.track) pause.applyTrack();
  })
  .catch(() => {});

// 后台标签页加载时 innerWidth 可能是 0；退回到一个合理默认值，
// 等真正可见后由 ResizeObserver / visibilitychange 纠正。
function resize(fw, fh) {
  DPR = Math.min(devicePixelRatio || 1, 2);
  W = Math.max(1, fw || innerWidth || document.documentElement.clientWidth || 960);
  H = Math.max(1, fh || innerHeight || document.documentElement.clientHeight || 540);
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  readSafeArea();
  game.safe = safe;
  game.camera.resize(W, H);
}
addEventListener('resize', () => resize());
if (typeof ResizeObserver !== 'undefined') {
  new ResizeObserver(() => resize()).observe(document.documentElement);
}
resize();

// 暂停界面的指针 / 触屏操作
const ptr = (e) => {
  const t = e.touches ? e.touches[0] : e;
  return t ? { x: t.clientX, y: t.clientY } : null;
};
canvas.addEventListener('pointerdown', (e) => {
  const q = ptr(e);
  if (q && pause.pointerDown(q.x, q.y)) e.preventDefault();
});
canvas.addEventListener('pointermove', (e) => { const q = ptr(e); if (q) pause.pointerMove(q.x); });
addEventListener('pointerup', () => pause.pointerUp());

// 暂停按钮：右上角一个小方块，触屏也够得到。热区要避开安全区，
// 并留足 44px 的可点面积（触屏最小推荐值）。
canvas.addEventListener('pointerdown', (e) => {
  if (pause.open) return;
  const x0 = W - safe.right - 56, y0 = safe.top;
  if (e.clientX > x0 && e.clientY > y0 - 6 && e.clientY < y0 + 56) {
    pause.toggle();
    e.preventDefault();
  } else if (game.won) {
    game.retry();
    saveProgress(game);
    e.preventDefault();
  }
});

const STEP = 1 / 120;
let acc = 0;
let last = performance.now();
let hintGone = false;
let saveT = 0;
let lastCheckpoint = null;
let lastWon = game.won;

function frame(now) {
  requestAnimationFrame(frame);
  input.beginFrame();
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.25) dt = 0.25;

  // E 开关编辑器。编辑态下世界冻住，但玩家还站在原地 —— 退出即续。
  if (editor && input.wasPressed('KeyE') && !pause.open) editor.toggle(ROOM_SET);
  if (editor) editor.update(dt);
  if (editor && editor.open) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    game.draw(ctx, W, H);
    editor.drawWorld(ctx, game);
    editor.drawUI(ctx, W, H);
    input.endFrame();
    return;
  }
  if (input.wasPressed('Escape')) pause.toggle();
  if (pause.open && !hintGone) { hint.classList.add('gone'); hintGone = true; }
  const eaten = pause.handle(input);
  pause.update(dt);

  const wish = eaten ? null : input.dir;
  if (!hintGone && (wish || input.anyPressed)) { hint.classList.add('gone'); hintGone = true; }

  if (!pause.open) {
    acc += dt;
    let guard = 0;
    while (acc >= STEP && guard++ < 12) { game.update(STEP, wish); acc -= STEP; }
    if (guard >= 12) acc = 0;

    if (input.wasPressed('KeyR') || input.wasPressed('Backspace') ||
        (game.won && (input.wasPressed('Enter') || input.wasPressed('Space')))) {
      game.retry();
      saveProgress(game);
    }
    if (input.wasPressed('KeyM')) sound.setMuted(!sound.muted);

    // 到了新检查点就存，另外每 5 秒兜底存一次
    saveT += dt;
    if (game.checkpoint !== lastCheckpoint || game.won !== lastWon || saveT > 5) {
      lastCheckpoint = game.checkpoint;
      lastWon = game.won;
      saveT = 0;
      saveProgress(game);
    }
  } else {
    acc = 0;
  }

  sound.update(dt, pause.open ? 0 : game.tension);
  // 运动声部：在动没有、脚下是不是虚线。暂停或死亡时收掉
  const live = !pause.open && game.state === 'play';
  sound.motion(dt, live && game.player.moving, live && game.player.onSlide());

  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  game.draw(ctx, W, H);
  pause.draw(ctx, W, H);
  input.endFrame();
}

// 移动端可能不给卸载回调留时间：隐藏和 pagehide 都立即落盘，并停住音频。
addEventListener('visibilitychange', () => {
  if (document.hidden) {
    saveProgress(game);
    sound.suspend();
  } else {
    resize();
    sound.resume();
  }
});
addEventListener('pagehide', () => saveProgress(game));

// 调试/自动化钩子：预览标签页会被浏览器判定为 hidden 并完全节流 rAF，
// 因此提供手动驱动与手动渲染的入口，用于截图核对与录制。
// 只在本地开发或显式 ?debug 时挂上 —— 发布版不该把内部状态摊在全局上。
// 注意必须同时判协议：Tauri 在 iOS/macOS 上的 WebView 地址是 tauri://localhost，
// hostname 正好也是 localhost —— 只看 hostname 会把发布出去的 App 当成开发环境。
const PRODUCTION = !!document.querySelector('meta[name="lumen-build"][content="production"]');
const DEBUG = !PRODUCTION && (/[?&]debug\b/.test(location.search) ||
  (['http:', 'https:'].includes(location.protocol) &&
   ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)));
pause.dev = DEBUG;
pause.syncDevItems();
// ── 可视化编辑器（L1 画 / L2 判 / L3 边玩边改）。动态 import：
//    玩家那边不会下载这些代码，production 路径上它根本不存在。
let editor = null;
if (DEBUG) {
  import('./editor/editor.js').then(({ Editor }) => {
    editor = new Editor();
    editor.attach(canvas, () => game);
    // 换房时把玩家和镜头一起带过去 —— 否则你在改一间看不见的房
    editor.jumpTo = (name) => {
      const r = game.world.rooms.find(v => v.name === name);
      if (r?.entry) pause.onJump(r);
    };
    // L3：改一格就地重建世界，玩家留在原处 —— 不重载、不回到检查点。
    // buildWorld 只要 1.8ms，所以整份重建比外科手术式的局部打补丁更简单也更不会错。
    editor.onRooms = (rooms) => {
      ROOM_SET = rooms;
      const at = { x: game.player.x, y: game.player.y };
      const keep = { deaths: game.deaths, time: game.time, orbCount: game.orbCount };
      let g;
      // 编辑到一半的房间常常是非法的（刚删掉出口、入口还没画上），
      // 而 buildWorld 对这些是直接抛异常的。不接住的话，一次中途落笔
      // 就能把整个游戏打死 —— 编辑器必须扛得住"我正打到一半"。
      // 抛了就保留上一份能跑的世界，错误交给编辑器面板去显示。
      try { g = new Game(ROOM_SET); } catch (e) { editor.flash(`世界暂时不合法：${e.message}`); return; }
      g.safe = safe;
      g.sfx = (n, a) => { sound.play(n, a); haptic(n); };
      g.reducedMotion = settings.reducedMotion;
      g.camera.resize(W, H);
      Object.assign(g, keep);
      g.player.reset(Math.round(at.x), Math.round(at.y));
      const cp = g.entities.find(e => e.kind === 'checkpoint'
        && Math.abs(e.x - at.x) < 24 && Math.abs(e.y - at.y) < 24);
      if (cp) g.setCheckpoint(cp);
      g.camera.snap();
      g.introT = -1;
      globalThis.game = g;
      game = g; pause.game = g;
    };
  }).catch((e) => {
    // dist/ 会刻意剔除开发编辑器；本地预览生产包时允许它安静缺席。
    // 真正的源码错误仍可从调试钩子读取，不把未处理 rejection 冒充游戏故障。
    globalThis.__lumenEditorError = String(e?.message || e);
  });
}

if (DEBUG) globalThis.__lumen = {
  get game() { return game; },
  get rooms() { return ROOM_SET; },
  get editor() { return editor; },
  sound, pause, settings, input,
  setSize(w, h) { resize(w, h); },
  step(seconds = 1, wish = null, dt = 1 / 120) {
    const n = Math.max(1, Math.round(seconds / dt));
    for (let i = 0; i < n; i++) game.update(dt, wish);
  },
  /** 用真实输入驱动 —— 验证键盘 / 手柄 / 触屏整条链路 */
  stepLive(seconds = 1, dt = 1 / 120) {
    const n = Math.max(1, Math.round(seconds / dt));
    for (let i = 0; i < n; i++) game.update(dt, input.dir);
  },
  render() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    game.draw(ctx, W, H);
    pause.draw(ctx, W, H);
  },
  goto(x, y) {
    game.player.reset(x, y);
    game.camera.snap();
    for (let i = 0; i < 3; i++) game.update(1 / 120, null);
  },
  room(nameOrIndex) {
    const r = typeof nameOrIndex === 'number'
      ? game.world.rooms[nameOrIndex]
      : game.world.rooms.find(v => v.name.includes(nameOrIndex));
    if (!r) return null;
    this.goto(r.entry ? r.entry.x : r.x, r.entry ? r.entry.y : r.y);
    return r.name;
  },
};

requestAnimationFrame(frame);
