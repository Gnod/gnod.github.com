// 游戏主体：世界、状态机、渲染
import { Grid, buildWorld } from './grid.js';
import { Player, TUNING, trailRibbon } from './player.js';
import { createEntity, DEATH_R } from './entities.js';
import { Camera } from '../core/camera.js';
import { Particles } from '../core/particles.js';
import { pal, linkColor, WORLD_TINT } from '../core/theme.js';
import { key, damp, clamp, DIRS } from '../core/util.js';
import { drawAtmosphere, atmosphereDiagnostics } from '../core/atmosphere.js';

const RESPAWN_T = 0.30;
const LIT_R = 8.0;
export const TRACK_STYLE = Object.freeze({
  bedWidth: 0.24,
  coreWidth: 0.055,
  coreMinDevicePixels: 2,
  fiberWidth: 0.022,
  fiberOffset: 0.075,
  fiberAlpha: 0.13,
  nodeRingRadius: 0.105,
  nodeRingAlpha: 0.18,
  nearBedAlpha: 0.11,
  nearCoreAlpha: 0.52,
  dangerCoreAlpha: 0.20,
  sweepAlpha: 0.10,
});

/** 把极细轨道内芯量化到完整设备像素，避免镜头缩放后落在 1.x / 2.x 像素间反复抖动。 */
export function alignTrackWidth(width, devicePixelsPerUnit, minDevicePixels = 1) {
  if (!(devicePixelsPerUnit > 0)) return width;
  const pixels = Math.max(minDevicePixels, Math.round(width * devicePixelsPerUnit));
  return pixels / devicePixelsPerUnit;
}
const BOOST_MULT = 1.95;
const PUSH_DELAY = 0.09;   // 从静止开始顶住多久方块才动。给推动一点分量，
                           // 也让"探头贴住"的动画来得及演完。
                           // 连续推的时候不再重复计时，否则一格一顿。

/** 把稀疏格子合并成最长直线段，渲染时只需几百个 path 指令 */
function computeRuns(cells) {
  const runs = [];
  const pts = [];
  for (const k of cells) { const [x, y] = k.split(',').map(Number); pts.push([x, y]); }
  for (const [x, y] of pts) {
    if (!cells.has(key(x - 1, y))) {
      let x2 = x;
      while (cells.has(key(x2 + 1, y))) x2++;
      if (x2 > x) runs.push([x, y, x2, y]);
    }
    if (!cells.has(key(x, y - 1))) {
      let y2 = y;
      while (cells.has(key(x, y2 + 1))) y2++;
      if (y2 > y) runs.push([x, y, x, y2]);
    }
  }
  // 孤立格子：画成点
  for (const [x, y] of pts) {
    if (!cells.has(key(x + 1, y)) && !cells.has(key(x - 1, y)) &&
        !cells.has(key(x, y + 1)) && !cells.has(key(x, y - 1))) runs.push([x, y, x, y]);
  }
  return runs;
}

/** 需要显式补成圆形节点的位置：端点、拐角与三/四岔路口。 */
function computeTrackNodes(cells) {
  const out = [];
  for (const k of cells) {
    const [x, y] = k.split(',').map(Number);
    const l = cells.has(key(x - 1, y)), r = cells.has(key(x + 1, y));
    const u = cells.has(key(x, y - 1)), d = cells.has(key(x, y + 1));
    const n = +l + +r + +u + +d;
    const turn = n === 2 && (l || r) && (u || d);
    if (n !== 2 || turn) out.push({ x, y });
  }
  return out;
}

/** 把每道光点闸门分别当墙挖掉之后，房间里到不了的格子。
 * 分门保存，才能让 18 颗的第一道门打开时只点亮第一间奖励室，
 * 而不是把仍需 36/54/64 颗的后续支路一起照亮。 */
function computeGuarded(world) {
  const out = [];
  const D = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const s of world.specs) {
    if (s.type !== 'orbgate') continue;
    const r = world.rooms.find(v => s.x >= v.x && s.x < v.x + v.w && s.y >= v.y && s.y < v.y + v.h);
    if (!r || !r.entry) continue;
    const gk = key(s.x, s.y);
    const seen = new Set([key(r.entry.x, r.entry.y)]);
    const q = [r.entry];
    for (let h = 0; h < q.length; h++) {
      const c = q[h];
      for (const [dx, dy] of D) {
        const nx = c.x + dx, ny = c.y + dy, k = key(nx, ny);
        if (seen.has(k) || k === gk || !world.cells.has(k)) continue;
        if (nx < r.x || nx >= r.x + r.w || ny < r.y || ny >= r.y + r.h) continue;
        seen.add(k); q.push({ x: nx, y: ny });
      }
    }
    const cells = new Set();
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
      const k = key(x, y);
      if (world.cells.has(k) && !seen.has(k) && k !== gk) cells.add(k);
    }
    if (cells.size) out.push({ gateKey: gk, cells });
  }
  return out;
}

export class Game {
  constructor(rooms) {
    this.world = buildWorld(rooms);
    this.grid = new Grid(this.world.cells);
    // 光点闸门只守报酬，从不挡通关（DESIGN）—— 可画面上主路和支路一样亮，
    // 玩家看不出哪条是必须走的、哪条是可选的。建世界时算一次：
    // 把闸门当墙挖掉之后，房间里哪些格子就到不了了。那些就是"报酬那半边"。
    this.guardedGroups = computeGuarded(this.world);
    this.guarded = new Set(this.guardedGroups.flatMap(v => [...v.cells]));
    const mainCells = new Set([...this.world.cells].filter(k => !this.guarded.has(k)));
    this.runs = computeRuns(mainCells);
    this.trackNodes = computeTrackNodes(mainCells);
    this.guardedRuns = this.guardedGroups.map(v => ({
      gateKey: v.gateKey,
      runs: computeRuns(v.cells),
      nodes: computeTrackNodes(v.cells),
    }));
    this.slide = this.world.slide;
    this.slideRuns = computeRuns(this.slide);
    this.player = new Player(this);
    this.camera = new Camera();
    this.particles = new Particles();
    this.circuits = new Map();
    this.sfx = null;

    this.entities = this.world.specs.map(createEntity).filter(Boolean);
    this.patrols = this.entities.filter(e => e.kind === 'patrol');
    this.gates = new Map();
    this.oneways = new Map();
    this.blocks = [];
    for (const e of this.entities) {
      if (e.init) e.init(this);
      if (e.kind === 'gate' || e.kind === 'orbgate') this.gates.set(key(e.x, e.y), e);
      if (e.kind === 'oneway') this.oneways.set(key(e.x, e.y), e);
      if (e.kind === 'block') this.blocks.push(e);
    }
    this.orbTotal = this.entities.filter(e => e.kind === 'orb').length;

    this.state = 'play';
    this.stateT = 0;
    this.deaths = 0;
    // 逐房间的死亡与停留时长。机器人测得出"这间房可不可解"，
    // 测不出"这间房无不无聊" —— 那只能靠真人玩完之后看这张表。
    this.roomStats = new Map();
    this.orbCount = 0;
    this.time = 0;
    this.won = false;
    this.completed = false;     // 永久完成记录；won 只表示当前正在播放通关画面
    this.completion = null;     // 首次/最佳完成时的时间、死亡与收集数
    this.boostHit = false;
    this.speedMult = 1;
    this.tension = 0;
    this._danger = Infinity;
    this.orbFlash = 0;
    this.freeze = 0;          // 命中停顿：撞上的那一刻把世界冻住几十毫秒
    this.reveal = 0;          // 进新房间时点亮半径的一次外扩（"先看清整个谜题"）
    this.room = null;
    this.pulses = [];         // 扩散光环：重生 / 开门 / 收集 / 推块落位共用一套
    this.streaks = [];        // 连线：传送时把两端连起来，让"折叠"看得见
    this.introT = 0;          // 首次启动的标题时刻；读档续关时跳过
    this.reducedMotion = false;
    this.worldIndex = 0;
    this.safe = { top: 0, right: 0 };   // 刘海 / 状态栏安全区，由 main.js 量好塞进来
    this.tint = [...WORLD_TINT[0]];

    this.checkpoint = null;
    this.checkpointSnap = null;
    this._moveSfxT = -1;
    this.respawnPos = { ...this.world.spawn };
    this.player.reset(this.world.spawn.x, this.world.spawn.y);
    this.camera.snap();
  }

  // ── 轨道查询：dir 为"打算以什么方向占据这一格"，单向轨道据此判定。
  //    ignoreBlocks 用于"转向"判定：推块挡的是移动，不该挡转身 ——
  //    否则玩家永远没法面对一个方块，也就永远推不动它。
  isOpen(x, y, dir, ignoreBlocks = false) {
    if (!this.grid.has(x, y)) return false;
    const g = this.gates.get(key(x, y));
    if (g && !g.open) return false;
    const ow = this.oneways.get(key(x, y));
    if (ow && dir && dir !== ow.dir) return false;
    if (!ignoreBlocks && this.blockAt(x, y)) return false;
    return true;
  }

  /** 这一格是不是滑行段。滑行段上松手不会停 —— 见 Player.onSlide */
  isSlide(x, y) { return this.slide.has(key(x, y)); }

  /** 能否以 dir 方向"离开"这一格 —— 只看单向轨道。
   *  刻意不看闸门：闸门在玩家头顶关上时不应把人冻住（会死锁）。 */
  canLeave(x, y, dir) {
    const ow = this.oneways.get(key(x, y));
    return !(ow && dir && dir !== ow.dir);
  }

  blockAt(x, y) {
    for (const b of this.blocks) if (b.x === x && b.y === y) return b;
    return null;
  }
  blockOn(x, y) { const b = this.blockAt(x, y); return !!b && !b.moving; }

  /** 玩家顶着推块时把它推走。必须站在格心且朝向它。 */
  tryPush(dt, wish) {
    const p = this.player;
    p.pressing = false;
    const d = p.dir ? DIRS[p.dir] : null;
    const stop = () => { this.pressT = 0; this.pushing = null; };
    if (!wish || !d) { stop(); return; }

    // 推动过程中持续保持"顶住"的视觉。方块和玩家是同步前进的，
    // 若只在格心才算顶住，光会一格一格地忽远忽近。
    if (this.pushing && this.pushing.moving && wish === p.dir) p.pressing = true;

    if (!p.atCenter()) return;
    const cx = Math.round(p.x), cy = Math.round(p.y);
    const b = this.blockAt(cx + d.x, cy + d.y);
    if (!b || b.moving) { if (!p.pressing) stop(); return; }
    // 顶住了 —— 无论推不推得动，视觉上都要贴上去
    p.pressing = true;
    const tx = b.x + d.x, ty = b.y + d.y;
    if (!this.grid.has(tx, ty)) return;
    // 方块不能离开它所属的房间 —— 否则会被顶进连接走廊，永久堵死主线
    const r = b.room;
    if (r && (tx < r.x || tx >= r.x + r.w || ty < r.y || ty >= r.y + r.h)) return;
    const g = this.gates.get(key(tx, ty));
    if (g && !g.open) return;
    if (this.blockAt(tx, ty)) return;
    const ow = this.oneways.get(key(tx, ty));
    if (ow && ow.dir !== p.dir) return;

    // 起势时间只在"从静止开始顶"时收一次；连续推不再重复计时
    this.pressT = Math.min((this.pressT || 0) + dt, PUSH_DELAY);
    if (this.pressT < PUSH_DELAY) return;
    this.pushing = b;
    b.push(tx, ty);
    this.particles.spawn(b.x - d.x * 0.5, b.y - d.y * 0.5, {
      count: 5, color: pal().block, speed: [1, 3], life: [0.15, 0.3], len: [0.05, 0.15],
    });
    this.addPulse(b.x, b.y, { color: pal().block, r0: 0.55, r1: 0.2, life: 0.22, width: 0.05 });
    if (!this.reducedMotion) this.camera.kick(0.14);
    this.sfx?.('push');
  }

  /** 轨道上的最短路（供追击敌人用），可限制搜索半径与中心 */
  routeOnTrack(from, to, radius = 999, center = from) {
    const start = key(from.x, from.y), goal = key(to.x, to.y);
    if (!this.grid.has(from.x, from.y) || !this.grid.has(to.x, to.y)) return null;
    if (start === goal) return [from];
    const prev = new Map([[start, null]]);
    const q = [from];
    let head = 0;
    const D = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (head < q.length) {
      const cur = q[head++];
      for (const [dx, dy] of D) {
        const nx = cur.x + dx, ny = cur.y + dy, k = key(nx, ny);
        if (prev.has(k) || !this.grid.has(nx, ny)) continue;
        if (Math.abs(nx - center.x) + Math.abs(ny - center.y) > radius) continue;
        const gate = this.gates.get(k);
        if (gate && !gate.open) continue;
        // 追击者同样受单向轨道约束 —— 否则玩家没法用它甩开追兵
        const d = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
        if (!this.canLeave(cur.x, cur.y, d)) continue;
        const owN = this.oneways.get(k);
        if (owN && owN.dir !== d) continue;
        prev.set(k, cur);
        if (k === goal) {
          const path = [];
          let n = { x: nx, y: ny };
          while (n) { path.push(n); n = prev.get(key(n.x, n.y)); }
          return path.reverse();
        }
        q.push({ x: nx, y: ny });
      }
    }
    return null;
  }

  // ── 状态快照（检查点回滚，杜绝死锁）
  snapshot() {
    return this.entities.map(e => ({ taken: e.taken, on: e.on, timer: e.timer, x: e.x, y: e.y }));
  }
  restore(snap) {
    if (!snap) return;
    snap.forEach((s, i) => {
      const e = this.entities[i];
      if (!e) return;
      if (e.kind === 'orb') e.taken = s.taken;
      if (e.kind === 'button') { e.on = s.on; e.timer = s.timer || 0; e._was = false; }
      if (e.kind === 'portal') e.cool = 0;
      if (e.kind === 'block') { e.x = s.x; e.y = s.y; e.vx = s.x; e.vy = s.y; e.moveT = 0; e.from = null; }
      if (e.kind === 'chaser') e.reset();
    });
    this.orbCount = this.entities.reduce((n, e) => n + (e.kind === 'orb' && e.taken ? 1 : 0), 0);
  }

  setCheckpoint(cp) {
    this.checkpoint = cp;
    this.respawnPos = { x: cp.x, y: cp.y };
    this.checkpointSnap = this.snapshot();
  }

  collectOrb(orb) {
    this.orbCount++;
    this.orbFlash = 2.4;
    this.particles.spawn(orb.x, orb.y, {
      count: 14, color: pal().orb, speed: [2.5, 6.5], life: [0.25, 0.55], len: [0.1, 0.3],
    });
    this.addPulse(orb.x, orb.y, { color: pal().orb, r0: 0.2, r1: 1.5, life: 0.4 });
    if (!this.reducedMotion) this.camera.kick(0.10);
    this.sfx?.('orb', this.orbCount);
  }

  /** 取某间房的统计槽，没有就建一个 */
  stat(name) {
    let v = this.roomStats.get(name);
    if (!v) { v = { deaths: 0, time: 0 }; this.roomStats.set(name, v); }
    return v;
  }

  kill() {
    if (this.state !== 'play') return;
    this.state = 'dying';
    this.stateT = 0;
    this.deaths++;
    if (this.room) this.stat(this.room.name).deaths++;
    const p = this.player;
    // 玩家是一段 2.2 格的光，不是一个点 —— 让它沿自己的形状碎开
    this.particles.spawnAlong(p.trail(), {
      density: this.reducedMotion ? 2 : 5, color: pal().player,
      speed: [1.5, 7], life: [0.25, 0.6], len: [0.12, 0.42],
    });
    this.particles.spawn(p.x, p.y, {
      count: this.reducedMotion ? 5 : 14, color: pal().enemy,
      speed: [2, 8], life: [0.25, 0.6], len: [0.1, 0.4],
    });
    this.addPulse(p.x, p.y, { color: pal().enemy, r0: 0.2, r1: 2.6, life: 0.4, width: 0.07 });
    if (!this.reducedMotion) { this.camera.kick(1.0); this.freeze = 0.07; }
    this.sfx?.('death');
  }

  /** 主动重来一次。推块可以把自己堵死，必须给玩家一个不靠死亡的退出口。 */
  retry() {
    // 通关画面不是死胡同：从最后一个检查点重演终章，但保留永久完成记录。
    if (this.state === 'won') {
      this.won = false;
      this.respawn();
      this.introT = -1;
      return;
    }
    if (this.state !== 'play') return;
    this.particles.spawn(this.player.x, this.player.y, {
      count: 14, color: pal().glow, speed: [2, 6], life: [0.2, 0.45], len: [0.1, 0.3],
    });
    this.respawn();
    this.deaths = Math.max(0, this.deaths);   // 主动重来不计入死亡数
  }

  respawn() {
    this.state = 'play';
    this.stateT = 0;
    this.restore(this.checkpointSnap);
    this.player.reset(this.respawnPos.x, this.respawnPos.y);
    this.particles.spawn(this.respawnPos.x, this.respawnPos.y, {
      count: 10, color: pal().glow, speed: [1.5, 4], life: [0.2, 0.4], len: [0.08, 0.2],
    });
    this.addPulse(this.respawnPos.x, this.respawnPos.y,
      { color: pal().glow, r0: 1.6, r1: 0.15, life: 0.3, width: 0.06 });   // 由外向内收拢 = 点亮
    this.sfx?.('respawn');
  }

  teleport(from, to) {
    const p = this.player;
    this.particles.spawn(p.x, p.y, { count: 12, color: pal().portal, speed: [2, 6], life: [0.2, 0.4] });
    // 把两端连起来。传送门的意义是"把拓扑折叠了"，只在两头各喷一团粒子
    // 是看不出这件事的 —— 得画出那一下的连接。
    if (!this.reducedMotion) {
      this.streaks.push({ x0: from.x, y0: from.y, x1: to.x, y1: to.y,
        t: 0, life: 0.32, color: pal().portal });
    }
    this.addPulse(from.x, from.y, { color: pal().portal, r0: 0.15, r1: 1.3, life: 0.35 });
    p.x = to.x; p.y = to.y;
    p.points = [];
    from.cool = 0.35; to.cool = 0.35;
    if (p.dir && !p.canGo(to.x, to.y, p.dir)) p.dir = null;
    this.particles.spawn(p.x, p.y, { count: 14, color: pal().portal, speed: [2, 7], life: [0.2, 0.5] });
    this.addPulse(to.x, to.y, { color: pal().portal, r0: 1.3, r1: 0.15, life: 0.3 });
    this.camera.kick(0.25);
    this.sfx?.('portal');
  }

  win() {
    if (this.won) return;
    this.won = true;
    this.completed = true;
    const result = { time: Math.round(this.time), deaths: this.deaths, orbs: this.orbCount };
    if (!this.completion || result.time < this.completion.time) this.completion = result;
    this.state = 'won';
    this.stateT = 0;
    this.particles.spawn(this.player.x, this.player.y, {
      count: this.reducedMotion ? 12 : 46, color: pal().goal,
      speed: [2, 11], life: [0.4, 1.2], len: [0.15, 0.55],
    });
    // 三圈依次外扩的光，最后一圈铺满整屏
    for (let i = 0; i < 3; i++) {
      this.addPulse(this.player.x, this.player.y, {
        color: pal().goal, r0: 0.2, r1: 4 + i * 9, life: 0.8 + i * 0.45, width: 0.09 - i * 0.02,
      });
    }
    if (!this.reducedMotion) { this.camera.kick(0.5); this.freeze = 0.10; }
    this.sfx?.('win');
  }

  /** 致命实体每帧上报与玩家的距离，用来驱动音乐紧张度 */
  reportDanger(d) { if (d < this._danger) this._danger = d; }

  /** 扩散光环。所有"某件事发生了"的瞬间共用它，省得每处都写一遍。 */
  addPulse(x, y, { color, r0 = 0.25, r1 = 1.7, life = 0.45, width = 0.05 } = {}) {
    if (this.reducedMotion) return;
    if (this.pulses.length > 24) this.pulses.shift();
    this.pulses.push({ x, y, t: 0, life, color: color || pal().glow, r0, r1, width });
  }

  // ── 主更新
  update(dt, wish) {
    // 命中停顿：世界冻住，但摄像机继续抖 —— 冲击感来自"静止的画面在震"
    if (this.freeze > 0) {
      this.freeze -= dt;
      this.camera.update(dt, this);
      return;
    }
    this.time += dt;
    this.stateT += dt;
    this._danger = Infinity;

    if (this.state === 'play') {
      this.boostHit = false;
      const wasMoving = this.player.moving;
      const target = this.boostWas ? BOOST_MULT : 1;
      this.speedMult = damp(this.speedMult, target, 12, dt);
      this.player.speed = TUNING.SPEED * this.speedMult;
      this.tryPush(dt, wish);
      this.player.update(dt, wish);
      // 起步与停住。debounce 一下：连点方向键不该变成扫射
      if (this.player.moving !== wasMoving && this.time - this._moveSfxT > 0.11) {
        this._moveSfxT = this.time;
        this.sfx?.(this.player.moving ? 'start' : 'settle');
        // 停住的那一下给一个视觉标点。
        //
        // 这游戏的循环是"走 → 停 → 等 → 走"，而"停下来是安全的"是它
        // 教了两小时的核心命题 —— 可停住此前只有拖尾从 2.2 缩到 0.95
        // 的一段缓动，是渐变，不是标点。
        //
        // r0 > r1 让光环向内收，配合 drawPulses 的先快后慢：
        // 光冲进来，然后正好停在头部辉光的半径上。不是庆祝，是确认。
        if (!this.player.moving) {
          this.addPulse(this.player.x, this.player.y,
            { color: pal().glow, r0: 1.5, r1: 0.3, life: 0.19, width: 0.05 });
        }
      }
      if (this.player.bump > 0) {
        this.player.bump = 0;
        const d = DIRS[this.player.dir];
        if (d) {
          this.addPulse(this.player.x + d.x * 0.5, this.player.y + d.y * 0.5,
            { color: pal().track, r0: 0.42, r1: 0.12, life: 0.18, width: 0.06 });
        }
      }
    } else if (this.state === 'dying') {
      if (this.stateT >= RESPAWN_T) this.respawn();
    }

    for (const e of this.entities) e.update(dt, this);
    if (this.boostHit && !this.boostWas) this.sfx?.('boost');   // 音色早就写好了，一直没人调用
    this.boostWas = this.boostHit;

    // 电路：同一 link 的按钮任一按下即导通
    this.circuits.clear();
    for (const e of this.entities) {
      if (e.kind !== 'button') continue;
      for (const l of e.links) this.circuits.set(l, (this.circuits.get(l) || false) || e.on);
    }

    // 3 格内算贴脸，9 格外算安全
    const raw = clamp((9 - this._danger) / 6, 0, 1);
    this.tension = damp(this.tension, raw, raw > this.tension ? 9 : 1.6, dt);

    // 世界色调：走到哪个世界，光就慢慢变成那个世界的颜色
    const room = Camera.roomAt(this.world.rooms, this.player.x, this.player.y);
    // 进入新房间时把点亮半径外扩一次 —— 谜题必须一目了然，
    // 信息不完整的解谜是廉价难度（DESIGN §2.3）。跨世界时给得更多。
    if (room && this.state === 'play') this.stat(room.name).time += dt;
    if (room && room !== this.room) {
      const crossedWorld = this.room && room.world !== this.room.world;
      this.reveal = Math.max(this.reveal, crossedWorld ? 1.6 : 1);
      this.room = room;
    }
    this.reveal = Math.max(0, this.reveal - dt / 1.1);
    if (room) this.worldIndex = room.world;
    const want = WORLD_TINT[this.worldIndex] || WORLD_TINT[0];
    for (let i = 0; i < 3; i++) this.tint[i] = damp(this.tint[i], want[i], 1.2, dt);

    if (this.orbFlash > 0) this.orbFlash = Math.max(0, this.orbFlash - dt);
    // 玩家一动就加速把标题收掉 —— 不挡路
    if (this.introT >= 0) this.introT += dt * (this.player.moving ? 3.2 : 1);

    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const q = this.pulses[i];
      q.t += dt;
      if (q.t >= q.life) this.pulses.splice(i, 1);
    }
    for (let i = this.streaks.length - 1; i >= 0; i--) {
      const q = this.streaks[i];
      q.t += dt;
      if (q.t >= q.life) this.streaks.splice(i, 1);
    }

    this.camera.update(dt, this);
    this.particles.update(dt);
  }

  // ── 渲染
  draw(ctx, w, h) {
    const p = pal();
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, w, h);
    drawAtmosphere(ctx, w, h, this);

    ctx.save();
    this.camera.apply(ctx);
    const vr = this.camera.viewRect();

    this.drawDanger(ctx, vr);
    this.drawTrack(ctx, vr);
    this.drawWires(ctx, vr);

    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const e of this.entities) {
      const rx = (e.rx || 0) + 1.5, ry = (e.ry || 0) + 1.5;
      if (e.x + rx < vr.x0 || e.x - rx > vr.x1 || e.y + ry < vr.y0 || e.y - ry > vr.y1) continue;
      e.draw(ctx, this);
    }

    this.drawStreaks(ctx);
    this.drawPulses(ctx);
    this.particles.draw(ctx);
    ctx.restore();

    // 危险暗角压低世界，但不能把全场唯一的纯白玩家也染灰。
    // 玩家最后单独走一次相同的相机变换，既仍在世界坐标里，又保住最高亮度层级。
    this.drawVignette(ctx, w, h);
    if (this.state !== 'dying') {
      ctx.save();
      this.camera.apply(ctx);
      this.drawPlayer(ctx);
      ctx.restore();
    }
    this.drawHud(ctx, w, h);
    this.drawPauseGlyph(ctx, w);
    this.drawIntro(ctx, w, h);
    if (this.won) this.drawWin(ctx, w, h);
  }

  visualDiagnostics() {
    const visible = {};
    for (const e of this.entities) visible[e.kind] = (visible[e.kind] || 0) + 1;
    return {
      renderer: 'Canvas2D',
      viewport: { width: this.camera.w, height: this.camera.h },
      atmosphere: atmosphereDiagnostics(this.worldIndex),
      worldIndex: this.worldIndex,
      entities: visible,
      textures: 0,
      dprCap: 2,
    };
  }

  /** 右上角的暂停符号。触屏没有 ESC 键，得看得见才点得到。 */
  drawPauseGlyph(ctx, w) {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = pal().player;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    const x = w - this.safe.right - 30, y = this.safe.top + 24;
    ctx.beginPath();
    ctx.moveTo(x - 3, y - 6); ctx.lineTo(x - 3, y + 6);
    ctx.moveTo(x + 3, y - 6); ctx.lineTo(x + 3, y + 6);
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  /** 首次启动的标题：淡入、停留、淡出。不拦输入，玩家一动就加速消失。 */
  drawIntro(ctx, w, h) {
    const t = this.introT;
    if (t < 0 || t > 5.2) return;
    const a = t < 1.0 ? t / 1.0 : t > 3.4 ? Math.max(0, 1 - (t - 3.4) / 1.8) : 1;
    if (a <= 0.001) return;
    ctx.save();
    ctx.globalAlpha = a * 0.9;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = pal().player;
    const S = clamp(Math.min(w / 620, h / 470), 0.7, 1.3);
    ctx.font = `300 ${Math.round(28 * S)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.letterSpacing = `${0.5 * S}em`;
    ctx.fillText('LUMEN', w / 2 + 8 * S, h * 0.30);
    ctx.letterSpacing = '0px';
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  /** 唯一的 HUD：收集光点后短暂浮现的计数，随即消失 */
  drawHud(ctx, w, h) {
    if (this.orbFlash <= 0) return;
    const a = Math.min(1, this.orbFlash / 0.7);
    ctx.save();
    ctx.globalAlpha = a * 0.8;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = pal().orb;
    ctx.font = '400 13px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.letterSpacing = '0.22em';
    ctx.fillText(`\u25c7 ${this.orbCount} / ${this.orbTotal}`, w / 2, 46);
    ctx.letterSpacing = '0px';
    ctx.restore();
  }

  drawWin(ctx, w, h) {
    const t = this.stateT;
    const S = clamp(Math.min(w / 620, h / 470), 0.7, 1.3);
    ctx.save();

    // 0.0~0.5s 白光溢出：抵达的那一下先亮起来，再落回黑
    const bloom = t < 0.7 ? Math.max(0, 1 - Math.abs(t - 0.18) / 0.5) : 0;
    if (bloom > 0 && !this.reducedMotion) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = bloom * 0.5;
      ctx.fillStyle = pal().goal;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
    }

    // 0.5~2.3s 落黑
    const k = clamp((t - 0.5) / 1.8, 0, 1);
    const e = k * k * (3 - 2 * k);
    ctx.globalAlpha = e * 0.985;
    ctx.fillStyle = '#04050a';
    ctx.fillRect(0, 0, w, h);

    // 2.0s 起标题浮现，字距同时收拢
    const ta = clamp((t - 2.0) / 1.4, 0, 1);
    if (ta <= 0) { ctx.restore(); ctx.globalAlpha = 1; return; }
    ctx.globalAlpha = ta;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = pal().player;
    ctx.font = `300 ${Math.round(32 * S)}px ui-sans-serif, system-ui, sans-serif`;
    const sp = (0.9 - ta * 0.46) * S;               // 字距由散到聚
    ctx.letterSpacing = `${sp}em`;
    ctx.fillText('LUMEN', w / 2 + sp * 16 * S, h / 2 - 34 * S);
    ctx.letterSpacing = '0px';

    // 2.9s 起统计浮现
    const sa = clamp((t - 2.9) / 1.2, 0, 1);
    if (sa <= 0) { ctx.restore(); ctx.globalAlpha = 1; return; }
    ctx.globalAlpha = sa;
    const full = this.orbTotal > 0 && this.orbCount >= this.orbTotal;
    ctx.fillStyle = full ? pal().orb : '#6d7896';
    ctx.font = `400 ${Math.round(13 * S)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    const mins = Math.floor(this.time / 60), secs = Math.floor(this.time % 60);
    ctx.fillText(
      `\u25c7 ${this.orbCount}/${this.orbTotal}     \u2715 ${this.deaths}     ${mins}:${String(secs).padStart(2, '0')}`,
      w / 2, h / 2 + 16 * S,
    );
    // 全收集：标题外面多一圈缓缓呼吸的光。没有文字，只有光更亮一点
    if (full) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = sa * (0.34 + 0.16 * Math.sin(t * 1.6));
      ctx.strokeStyle = pal().orb;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(w / 2, h / 2 - 30 * S, 128 * S, 38 * S, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }

    // 通关不是只能清档退出的终态。符号在键盘 / 手柄上表示重演，触屏则直接点屏幕。
    const ra = clamp((t - 4.0) / 0.8, 0, 1);
    ctx.globalAlpha = ra * (0.48 + 0.10 * Math.sin(t * 1.8));
    ctx.fillStyle = '#8892ab';
    ctx.font = `400 ${Math.round(11 * S)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.fillText('R  ·  A  ·  ↵', w / 2, h / 2 + 54 * S);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  /** 巡逻的危险范围：一条垫在轨道底下的暗红光带。
   *  原来是描在轨道正中央的一条细线 —— 在滑行章里它把虚线从中间劈开，
   *  那些虚线读起来变成"红线两侧的小刻度"。垫到底下之后，
   *  轨道和虚线都完整地压在它上面，而范围照样一眼看得见。 */
  drawDanger(ctx, vr) {
    const p = pal();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = p.enemyDim;
    for (const e of this.patrols) {
      if (!e.path) continue;
      const rx = (e.rx || 0) + 1, ry = (e.ry || 0) + 1;
      if (e.x + rx < vr.x0 || e.x - rx > vr.x1 || e.y + ry < vr.y0 || e.y - ry > vr.y1) continue;
      for (const [lw, al] of [[0.42, 0.55], [0.26, 0.85]]) {
        ctx.globalAlpha = al; ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(e.path[0].x, e.path[0].y);
        for (let i = 1; i < e.path.length; i++) ctx.lineTo(e.path[i].x, e.path[i].y);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  drawTrack(ctx, vr) {
    const p = pal();
    const [tr, tg, tb] = this.tint;
    const matrix = ctx.getTransform();
    const devicePixelsPerUnit = Math.max(0.001, Math.hypot(matrix.a, matrix.b));
    const coreWidth = alignTrackWidth(
      TRACK_STYLE.coreWidth,
      devicePixelsPerUnit,
      TRACK_STYLE.coreMinDevicePixels,
    );
    const fiberWidth = alignTrackWidth(TRACK_STYLE.fiberWidth, devicePixelsPerUnit, 1);
    const appendRuns = (path, runs) => {
      for (const r of runs) {
        if (r[2] < vr.x0 || r[0] > vr.x1 || r[3] < vr.y0 || r[1] > vr.y1) continue;
        path.moveTo(r[0], r[1]);
        path.lineTo(r[2], r[3]);
      }
    };
    const appendFiberRuns = (path, runs) => {
      const o = TRACK_STYLE.fiberOffset;
      for (const r of runs) {
        if (r[2] < vr.x0 || r[0] > vr.x1 || r[3] < vr.y0 || r[1] > vr.y1) continue;
        if (r[1] === r[3]) {
          path.moveTo(r[0], r[1] - o); path.lineTo(r[2], r[3] - o);
          path.moveTo(r[0], r[1] + o); path.lineTo(r[2], r[3] + o);
        } else {
          path.moveTo(r[0] - o, r[1]); path.lineTo(r[2] - o, r[3]);
          path.moveTo(r[0] + o, r[1]); path.lineTo(r[2] + o, r[3]);
        }
      }
    };
    const nodePath = (nodes, radius) => {
      const path = new Path2D();
      for (const n of nodes) {
        if (n.x < vr.x0 || n.x > vr.x1 || n.y < vr.y0 || n.y > vr.y1) continue;
        path.moveTo(n.x + radius, n.y);
        path.arc(n.x, n.y, radius, 0, Math.PI * 2);
      }
      return path;
    };
    const drawNetwork = (path, fibers, nodes, alpha = 1) => {
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = p.track;
      ctx.fillStyle = p.track;
      ctx.lineWidth = TRACK_STYLE.bedWidth;
      ctx.stroke(path);
      ctx.fill(nodePath(nodes, TRACK_STYLE.bedWidth * 0.5));

      // 暗底上只压两根一像素光纤和一根中心内芯；仍是线，不长成管道。
      ctx.strokeStyle = `rgb(${tr | 0},${tg | 0},${tb | 0})`;
      ctx.fillStyle = ctx.strokeStyle;
      ctx.globalAlpha = alpha * TRACK_STYLE.fiberAlpha;
      ctx.lineWidth = fiberWidth;
      ctx.stroke(fibers);
      ctx.globalAlpha = alpha * TRACK_STYLE.nodeRingAlpha;
      ctx.stroke(nodePath(nodes, TRACK_STYLE.nodeRingRadius));

      ctx.globalAlpha = alpha * 0.16;
      ctx.lineWidth = coreWidth;
      ctx.stroke(path);
      ctx.fill(nodePath(nodes, coreWidth * 0.5));
      ctx.globalAlpha = 1;
    };

    ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
    const path = new Path2D();
    const fibers = new Path2D();
    appendRuns(path, this.runs);
    appendFiberRuns(fibers, this.runs);
    drawNetwork(path, fibers, this.trackNodes);

    // 只有主路与已经打开的报酬支路参与近场照明。
    // 关闭支路以前被误加进 path，玩家靠近时会绕过 0.3 的压暗重新亮起来。
    const litPath = new Path2D();
    const litFibers = new Path2D();
    appendRuns(litPath, this.runs);
    appendFiberRuns(litFibers, this.runs);
    const litNodes = [...this.trackNodes];

    // 报酬那半边：门关着就压暗，门一开就并回主路的亮度。
    // 玩家因此一眼分得清"必须走的"和"可选的"，而不必先撞一次门。
    if (this.guardedRuns.length) {
      for (const group of this.guardedRuns) {
        const og = this.gates.get(group.gateKey);
        const gp = new Path2D();
        const gf = new Path2D();
        appendRuns(gp, group.runs);
        appendFiberRuns(gf, group.runs);
        drawNetwork(gp, gf, group.nodes, og && !og.open ? 0.26 : 1);
        if (og?.open) {
          appendRuns(litPath, group.runs);
          appendFiberRuns(litFibers, group.runs);
          litNodes.push(...group.nodes);
        }
      }
      ctx.globalAlpha = 1;
    }

    // 危险带保留红色边缘语义，但重新露出一根低亮度冷色内芯。
    // 它只补在巡逻路径正中，不会把危险段洗成普通轨道。
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgb(${tr | 0},${tg | 0},${tb | 0})`;
    ctx.globalAlpha = TRACK_STYLE.dangerCoreAlpha;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = coreWidth;
    for (const e of this.patrols) {
      if (!e.path) continue;
      const rx = (e.rx || 0) + 1, ry = (e.ry || 0) + 1;
      if (e.x + rx < vr.x0 || e.x - rx > vr.x1 || e.y + ry < vr.y0 || e.y - ry > vr.y1) continue;
      ctx.beginPath();
      ctx.moveTo(e.path[0].x, e.path[0].y);
      for (let i = 1; i < e.path.length; i++) ctx.lineTo(e.path[i].x, e.path[i].y);
      ctx.stroke();
    }
    ctx.restore();

    // 玩家周围点亮：宽而暗的感应光 + 窄而亮的导能内芯。
    // 不再把整条 0.24 格轨道抬到近白，光核和机关重新成为最高亮度层。
    const pl = this.player;
    const rv = this.reducedMotion ? Math.min(this.reveal, 0.5) : this.reveal;
    const ease = 1 - (1 - Math.min(1, rv)) * (1 - Math.min(1, rv));
    const litR = LIT_R + ease * 13 + Math.max(0, rv - 1) * 10;
    ctx.globalCompositeOperation = 'lighter';
    const bedGlow = ctx.createRadialGradient(pl.x, pl.y, 0, pl.x, pl.y, litR);
    bedGlow.addColorStop(0, `rgba(${tr | 0},${tg | 0},${tb | 0},${TRACK_STYLE.nearBedAlpha})`);
    bedGlow.addColorStop(0.42, `rgba(${tr | 0},${tg | 0},${tb | 0},0.035)`);
    bedGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.strokeStyle = bedGlow;
    ctx.fillStyle = bedGlow;
    ctx.lineWidth = TRACK_STYLE.bedWidth * 1.28;
    ctx.stroke(litPath);
    ctx.fill(nodePath(litNodes, TRACK_STYLE.bedWidth * 0.64));

    const coreGlow = ctx.createRadialGradient(pl.x, pl.y, 0, pl.x, pl.y, litR);
    coreGlow.addColorStop(0, `rgba(${tr | 0},${tg | 0},${tb | 0},${TRACK_STYLE.nearCoreAlpha})`);
    coreGlow.addColorStop(0.42, `rgba(${tr | 0},${tg | 0},${tb | 0},0.18)`);
    coreGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.strokeStyle = coreGlow;
    ctx.fillStyle = coreGlow;
    ctx.globalAlpha = 0.48;
    ctx.lineWidth = fiberWidth;
    ctx.stroke(litFibers);
    ctx.stroke(nodePath(litNodes, TRACK_STYLE.nodeRingRadius));
    ctx.globalAlpha = 1;
    ctx.lineWidth = coreWidth;
    ctx.stroke(litPath);
    ctx.fill(nodePath(litNodes, coreWidth * 0.5));

    // 极慢的扫光只走内芯，不再让整条轨道像曝光不均的色带。
    if (!this.reducedMotion) {
      const span = vr.x1 - vr.x0;
      const c = vr.x0 + ((this.time * 0.055) % 1.6 - 0.3) * span;
      const lg = ctx.createLinearGradient(c - span * 0.28, 0, c + span * 0.28, 0);
      lg.addColorStop(0, 'rgba(0,0,0,0)');
      lg.addColorStop(0.5, `rgba(${tr | 0},${tg | 0},${tb | 0},${TRACK_STYLE.sweepAlpha})`);
      lg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.strokeStyle = lg;
      ctx.lineWidth = coreWidth;
      ctx.stroke(litPath);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    this.drawSlide(ctx, vr, p);
  }

  /** 滑行段：把线本身画成细虚线，读作"这一段抓不住"。
   *  刻意不做流动方向 —— 滑行段是双向的，带方向的动画会被当成单向轨道。 */
  drawSlide(ctx, vr, p) {
    if (!this.slideRuns.length) return;
    const path = new Path2D();
    let any = false;
    for (const r of this.slideRuns) {
      if (r[2] < vr.x0 || r[0] > vr.x1 || r[3] < vr.y0 || r[1] > vr.y1) continue;
      // 孤立的单格滑行段是合法写法（"-:-"）。butt 端点画不出零长度线段，
      // 给它一点长度，否则那一格会整个消失。
      if (r[0] === r[2] && r[1] === r[3]) { path.moveTo(r[0] - 0.14, r[1]); path.lineTo(r[0] + 0.14, r[1]); }
      else { path.moveTo(r[0], r[1]); path.lineTo(r[2], r[3]); }
      any = true;
    }
    if (!any) return;
    ctx.save();
    // 滑行不再用粗虚线盖掉整条轨道；冻结底座色，只让导能内芯断开。
    ctx.lineCap = 'butt';
    ctx.strokeStyle = p.slide;
    ctx.lineWidth = TRACK_STYLE.bedWidth;
    ctx.globalAlpha = 0.11;
    ctx.stroke(path);
    const matrix = ctx.getTransform();
    const devicePixelsPerUnit = Math.max(0.001, Math.hypot(matrix.a, matrix.b));
    ctx.lineWidth = alignTrackWidth(
      TRACK_STYLE.coreWidth * 1.45,
      devicePixelsPerUnit,
      TRACK_STYLE.coreMinDevicePixels,
    );
    ctx.setLineDash([0.15, 0.17]);
    ctx.globalAlpha = this.reducedMotion ? 0.78 : 0.64 + 0.12 * Math.sin(this.time * 2.0);
    ctx.strokeStyle = p.slide;
    ctx.stroke(path);
    ctx.restore();
    ctx.setLineDash([]);
  }

  /** 按钮 ↔ 闸门的连线。没有它，多链路房间根本读不懂谁配谁。
   *  导通时有一颗光点沿线跑过去 —— 因果关系可视化。 */
  drawWires(ctx, vr) {
    if (!this._wires) {
      this._wires = [];
      const buttons = this.entities.filter(e => e.kind === 'button');
      for (const g of this.entities) {
        if (g.kind !== 'gate') continue;
        let best = null, bd = Infinity;
        for (const b of buttons) {
          if (!b.links.includes(g.link)) continue;
          const d = Math.hypot(b.x - g.x, b.y - g.y);
          if (d < bd) { bd = d; best = b; }
        }
        if (best) this._wires.push({ a: best, b: g, link: g.link });
      }
    }
    ctx.lineCap = 'round';
    for (const w of this._wires) {
      const x0 = Math.min(w.a.x, w.b.x), x1 = Math.max(w.a.x, w.b.x);
      const y0 = Math.min(w.a.y, w.b.y), y1 = Math.max(w.a.y, w.b.y);
      if (x1 < vr.x0 || x0 > vr.x1 || y1 < vr.y0 || y0 > vr.y1) continue;
      const live = !!this.circuits.get(w.link);
      ctx.strokeStyle = linkColor(w.link, live ? 52 : 34);
      ctx.globalAlpha = live ? 0.45 : 0.16;
      ctx.lineWidth = 0.035;
      ctx.setLineDash([0.22, 0.34]);
      ctx.beginPath();
      ctx.moveTo(w.a.x, w.a.y);
      ctx.lineTo(w.b.x, w.b.y);
      ctx.stroke();
      ctx.setLineDash([]);
      if (live) {
        const u = (this.time * 0.75) % 1;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = linkColor(w.link, 72);
        ctx.beginPath();
        ctx.arc(w.a.x + (w.b.x - w.a.x) * u, w.a.y + (w.b.y - w.a.y) * u, 0.075, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    ctx.globalAlpha = 1;
  }

  drawStreaks(ctx) {
    if (!this.streaks.length) return;
    ctx.lineCap = 'round';
    ctx.globalCompositeOperation = 'lighter';
    for (const q of this.streaks) {
      const k = q.t / q.life;
      ctx.globalAlpha = (1 - k) * 0.8;
      ctx.strokeStyle = q.color;
      for (const w of [0.26, 0.075]) {
        ctx.globalAlpha = (1 - k) * (w > 0.15 ? 0.18 : 0.8);
        ctx.lineWidth = w * (1 - k * 0.6);
        ctx.beginPath();
        ctx.moveTo(q.x0, q.y0);
        ctx.lineTo(q.x1, q.y1);
        ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  drawPulses(ctx) {
    if (!this.pulses.length) return;
    ctx.lineCap = 'round';
    ctx.globalCompositeOperation = 'lighter';
    for (const q of this.pulses) {
      const k = q.t / q.life;
      const r = q.r0 + (q.r1 - q.r0) * (1 - (1 - k) * (1 - k));   // 先快后慢
      ctx.globalAlpha = (1 - k) * 0.75;
      ctx.strokeStyle = q.color;
      ctx.lineWidth = q.width;
      ctx.beginPath();
      ctx.arc(q.x, q.y, Math.max(0.02, r), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  drawPlayer(ctx) {
    const p = pal();
    const pl = this.player;
    // 迟到转向把人拉回了路口；画面上整段光先留在原处再追上来，
    // 读起来就是"贴着内角切过去"，而不是一次倒退。
    const ld = pl.lean > 1e-3 && pl.dir ? DIRS[pl.dir] : null;
    const ox = pl.vox + (ld ? ld.x * pl.lean * TUNING.NOSE : 0);
    const oy = pl.voy + (ld ? ld.y * pl.lean * TUNING.NOSE : 0);
    const hasOffset = Math.abs(ox) > 1e-4 || Math.abs(oy) > 1e-4;
    if (hasOffset) { ctx.save(); ctx.translate(ox, oy); }

    const L = pl.trailLen;
    const trailPath = pl.trail(L);
    const trailHead = trailPath[0];
    const trailTail = trailPath.at(-1);
    const rgba = (hex, alpha) => {
      const rgb = parseInt(hex.slice(1), 16);
      return `rgba(${rgb >> 16},${(rgb >> 8) & 255},${rgb & 255},${alpha})`;
    };
    const fillRibbon = (ribbon, fill, composite) => {
      if (ribbon.left.length < 2) return;
      ctx.globalCompositeOperation = composite;
      ctx.globalAlpha = 1;
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.moveTo(ribbon.left[0].x, ribbon.left[0].y);
      for (let i = 1; i < ribbon.left.length; i++) ctx.lineTo(ribbon.left[i].x, ribbon.left[i].y);
      for (let i = ribbon.right.length - 1; i >= 0; i--) ctx.lineTo(ribbon.right[i].x, ribbon.right[i].y);
      ctx.closePath();
      ctx.fill();
    };
    if (trailPath.length > 1) {
      // 每层都只填充一块连续多边形；不再逐小段描边，所以没有周期性的亮斑和分层。
      const gx = Math.abs(trailHead.x - trailTail.x) + Math.abs(trailHead.y - trailTail.y) < 1e-6
        ? trailTail.x + 0.001 : trailTail.x;
      const auraGradient = ctx.createLinearGradient(trailHead.x, trailHead.y, gx, trailTail.y);
      auraGradient.addColorStop(0, rgba(p.glow, 0.28));
      auraGradient.addColorStop(0.52, rgba(p.glow, 0.11));
      auraGradient.addColorStop(1, rgba(p.glow, 0));
      fillRibbon(trailRibbon(trailPath, 0.46, 0.025, 0.62), auraGradient, 'lighter');

      const bodyGradient = ctx.createLinearGradient(trailHead.x, trailHead.y, gx, trailTail.y);
      bodyGradient.addColorStop(0, rgba(p.player, 0.98));
      bodyGradient.addColorStop(0.20, rgba(p.player, 0.90));
      bodyGradient.addColorStop(0.58, rgba(p.glow, 0.58));
      bodyGradient.addColorStop(0.86, rgba(p.glow, 0.16));
      bodyGradient.addColorStop(1, rgba(p.glow, 0));
      // 根部宽度贴住放大后的实体光核，避免光核和尾迹之间出现细脖子。
      fillRibbon(trailRibbon(trailPath, 0.25, 0.003, 0.72), bodyGradient, 'source-over');
    }

    // 停下来的时候让辉光慢慢呼吸。原来这里直接填了一个半透明青色圆盘，
    // 外沿在固定半径处硬切，轨道又完整地透在下面，放大后很像 UI 按钮。
    // 径向渐变把能量收回白色光核，外光在边缘归零，轨道只像被照亮。
    const idle = 1 - Math.min(1, (pl.trailLen - 0.95) / 0.8);
    const moving = pl.moving ? Math.min(1.25, pl.speed / TUNING.SPEED) : 0;
    const pulse = this.reducedMotion ? 0 : Math.sin(this.time * 4.2);
    const breath = 1 + idle * pulse * 0.055;
    const haloR = 0.50 * breath * (1 + moving * 0.055);
    const rgb = parseInt(p.glow.slice(1), 16);
    const glow = (a) => `rgba(${rgb >> 16},${(rgb >> 8) & 255},${rgb & 255},${a})`;
    const halo = ctx.createRadialGradient(pl.x, pl.y, 0.025, pl.x, pl.y, haloR);
    halo.addColorStop(0, 'rgba(255,255,255,0.82)');
    halo.addColorStop(0.18, glow(0.62));
    halo.addColorStop(0.48, glow(0.20));
    halo.addColorStop(1, glow(0));
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(pl.x, pl.y, haloR, 0, Math.PI * 2); ctx.fill();

    // 运动时光核沿速度方向拉长一点，静止时重新收成圆形。
    // 形变只作用于实体光核，不改变碰撞体，也不会干扰路线读取。
    const d = pl.dir ? DIRS[pl.dir] : { x: 1, y: 0 };
    const angle = Math.atan2(d.y, d.x);
    const rx = 0.15 * (1 + moving * 0.27);
    const ry = 0.15 * (1 - moving * 0.07);
    ctx.save();
    ctx.translate(pl.x + d.x * moving * 0.018, pl.y + d.y * moving * 0.018);
    ctx.rotate(angle);
    ctx.globalAlpha = 0.34;
    ctx.fillStyle = p.glow;
    ctx.beginPath(); ctx.ellipse(0, 0, rx + 0.055, ry + 0.045, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = p.player;
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    if (hasOffset) ctx.restore();
  }

  drawVignette(ctx, w, h) {
    // 紧张度之前只喂给了音频。危险贴近时把暗角收紧、微微泛红 ——
    // 值本来就在那儿，接根线就有画面反馈。
    const T = this.reducedMotion ? 0 : this.tension;
    const inner = Math.min(w, h) * (0.32 - T * 0.13);
    const g = ctx.createRadialGradient(w / 2, h / 2, inner, w / 2, h / 2, Math.max(w, h) * 0.72);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(${Math.round(T * 26)},0,${Math.round(T * 6)},${0.55 + T * 0.22})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
}
