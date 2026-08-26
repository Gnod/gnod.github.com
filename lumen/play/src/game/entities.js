// 元素词表：每个元素规则一句话说得清，复杂度只允许来自组合
import { pal, linkColor } from '../core/theme.js';
import { clamp, pingpongSmooth, dist } from '../core/util.js';

export const DEATH_R = 0.40;
const TOUCH_R = 0.5;

export const ONEWAY_STYLE = Object.freeze({
  sleeveAlpha: 0.08,
  coreAlpha: 0.28,
  arrowAlpha: 0.78,
  arrowWidth: 0.065,
  arrowSpacing: 0.29,
});

/** 沿折线路径按 [0,1] 取点 */
export function pathPoint(path, u) {
  const n = path.length - 1;
  if (n <= 0) return { x: path[0].x, y: path[0].y };
  const s = clamp(u, 0, 1) * n;
  const i = Math.min(n - 1, Math.floor(s));
  const f = s - i;
  return {
    x: path[i].x + (path[i + 1].x - path[i].x) * f,
    y: path[i].y + (path[i + 1].y - path[i].y) * f,
  };
}

/** 发光描边：先画一层宽而淡的，再画一层实心的 */
function glow(ctx, color, w, drawFn, alpha = 1) {
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = color; ctx.fillStyle = color;
  ctx.globalAlpha = 0.20 * alpha; ctx.lineWidth = w * 3.4; drawFn(ctx, true);
  ctx.globalAlpha = 0.32 * alpha; ctx.lineWidth = w * 1.9; drawFn(ctx, true);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = alpha; ctx.lineWidth = w; drawFn(ctx, false);
  ctx.globalAlpha = 1;
}

/** 柔光底：中心保留颜色，外沿透明归零。避免再出现半透明实心圆盘的硬边。 */
function bloom(ctx, x, y, r, color, alpha = 0.32, inner = 0.04) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha;
  const g = ctx.createRadialGradient(x, y, inner, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(0.24, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

class Entity {
  constructor(s) { Object.assign(this, s); this.t = 0; this.dead = false; }
  update(dt) { this.t += dt; }
  draw() {}
}

// ─────────────────────────────────────────── 检查点（不可见，仅在激活时脉冲）
export class Checkpoint extends Entity {
  constructor(s) { super(s); this.kind = 'checkpoint'; this.pulse = 0; }
  update(dt, g) {
    this.t += dt;
    this.pulse = Math.max(0, this.pulse - dt * 2.2);
    if (g.checkpoint !== this && dist(g.player.x, g.player.y, this.x, this.y) < TOUCH_R) {
      if (!this.silent) g.sfx?.('checkpoint');   // 房间入口的静默检查点不出声
      g.setCheckpoint(this);
      this.pulse = 1;
    }
  }
  draw(ctx) {
    if (this.pulse <= 0) return;
    const k = this.pulse;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = k * 0.5;
    ctx.strokeStyle = pal().glow;
    ctx.lineWidth = 0.05;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 0.35 + (1 - k) * 1.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
}

// ─────────────────────────────────────────── 光点（收集物）
export class Orb extends Entity {
  constructor(s) { super(s); this.kind = 'orb'; this.taken = false; this.pop = 0; }
  update(dt, g) {
    this.t += dt;
    if (this.pop > 0) this.pop = Math.max(0, this.pop - dt * 3);
    if (this.taken) return;
    if (dist(g.player.x, g.player.y, this.x, this.y) < TOUCH_R) {
      this.taken = true; this.pop = 1;
      g.collectOrb(this);
    }
  }
  reset() { this.taken = false; }
  draw(ctx, g) {
    const p = pal();
    if (this.taken) {
      if (this.pop <= 0) return;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = this.pop * 0.6;
      ctx.strokeStyle = p.orb; ctx.lineWidth = 0.05;
      ctx.beginPath(); ctx.arc(this.x, this.y, 0.3 + (1 - this.pop) * 1.1, 0, Math.PI * 2); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      return;
    }
    const b = g?.reducedMotion ? 1 : 1 + Math.sin(this.t * 2.6) * 0.07;
    bloom(ctx, this.x, this.y, 0.48 * b, p.orb, 0.30);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = p.orb; ctx.fillStyle = p.orb;
    ctx.globalAlpha = 0.88; ctx.lineWidth = 0.065;
    ctx.beginPath(); ctx.arc(this.x, this.y, 0.24 * b, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 0.28; ctx.lineWidth = 0.035;
    ctx.beginPath(); ctx.arc(this.x, this.y, 0.15 * b, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 0.96;
    ctx.beginPath(); ctx.arc(this.x, this.y, 0.075, 0, Math.PI * 2); ctx.fill();
    // 一点偏心高光让它读作可收集的光珠，而不是另一种按钮。
    ctx.fillStyle = p.player; ctx.globalAlpha = 0.72;
    ctx.beginPath(); ctx.arc(this.x - 0.025, this.y - 0.03, 0.032, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// ─────────────────────────────────────────── 终点
export class Goal extends Entity {
  constructor(s) { super(s); this.kind = 'goal'; this.done = 0; }
  update(dt, g) {
    this.t += dt;
    this.done = g.orbTotal ? g.orbCount / g.orbTotal : 0;
    if (!g.won && dist(g.player.x, g.player.y, this.x, this.y) < TOUCH_R) g.win();
  }
  draw(ctx) {
    const p = pal();
    bloom(ctx, this.x, this.y, 0.62 + this.done * 0.16, p.goal, 0.24 + this.done * 0.12);
    // 收集得越全，终点的光环越多、越远 —— 不用文字也能看出完成度
    const rings = 3 + Math.round(this.done * 4);
    glow(ctx, p.goal, 0.075, (c) => {
      for (let i = 0; i < rings; i++) {
        const r = 0.22 + ((this.t * 0.45 + i / rings) % 1) * (0.85 + this.done * 0.9);
        c.globalAlpha = (1 - (r - 0.22) / (0.85 + this.done * 0.9)) * 0.9;
        c.beginPath(); c.arc(this.x, this.y, r, 0, Math.PI * 2); c.stroke();
      }
      c.globalAlpha = 1;
      c.beginPath(); c.arc(this.x, this.y, 0.14, 0, Math.PI * 2); c.fill();
    });
  }
}

// ─────────────────────────────────────────── 静止敌人
export class Enemy extends Entity {
  constructor(s) { super(s); this.kind = 'enemy'; }
  update(dt, g) {
    this.t += dt;
    const d = dist(g.player.x, g.player.y, this.x, this.y);
    g.reportDanger(d);
    if (d < DEATH_R) g.kill();
  }
  draw(ctx, g) {
    const p = pal();
    const b = g?.reducedMotion ? 1 : 1 + Math.sin(this.t * 4) * 0.08;
    const r = 0.34 * b;
    bloom(ctx, this.x, this.y, r * 1.65, p.enemy, 0.30);

    // 危险体保留实心轮廓，但由亮核向暗边过渡，不再是一块平涂红饼。
    ctx.save();
    const body = ctx.createRadialGradient(
      this.x - r * 0.28, this.y - r * 0.30, 0.025,
      this.x, this.y, r,
    );
    body.addColorStop(0, p.player);
    body.addColorStop(0.10, p.enemy);
    body.addColorStop(0.62, p.enemy);
    body.addColorStop(1, p.enemyDim);
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.arc(this.x, this.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.78; ctx.strokeStyle = p.enemy; ctx.lineWidth = 0.055;
    ctx.beginPath(); ctx.arc(this.x, this.y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    // 静止敌是“钉死在线上的雷”：四个固定卡榫让它在缩小和灰度下也不再
    // 与巡逻敌共用同一颗圆球轮廓。卡榫不动，危险本体仍轻微呼吸。
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = p.enemy;
    ctx.globalAlpha = 0.78;
    ctx.lineWidth = 0.055;
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(this.x + Math.cos(a) * 0.41, this.y + Math.sin(a) * 0.41);
      ctx.lineTo(this.x + Math.cos(a) * 0.54, this.y + Math.sin(a) * 0.54);
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

// ─────────────────────────────────────────── 巡逻敌人
export class Patrol extends Entity {
  constructor(s) {
    super(s);
    this.kind = 'patrol';
    this.len = Math.max(1, this.path.length - 1);
    this.period = (this.len * 2) / (this.speed || 3.4);
    this.pos = pathPoint(this.path, 0);
    this.prev = { ...this.pos };
    this.heading = { x: 1, y: 0 };
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const q of this.path) {
      if (q.x < x0) x0 = q.x; if (q.x > x1) x1 = q.x;
      if (q.y < y0) y0 = q.y; if (q.y > y1) y1 = q.y;
    }
    this.x = (x0 + x1) / 2; this.y = (y0 + y1) / 2;
    this.rx = (x1 - x0) / 2; this.ry = (y1 - y0) / 2;
  }
  update(dt, g) {
    this.t += dt;
    this.prev = this.pos;
    const u = pingpongSmooth(this.t + (this.phase || 0) * this.period, this.period);
    this.pos = pathPoint(this.path, u);
    const hx = this.pos.x - this.prev.x, hy = this.pos.y - this.prev.y;
    const hm = Math.hypot(hx, hy);
    if (hm > 1e-5) this.heading = { x: hx / hm, y: hy / hm };
    const d = dist(g.player.x, g.player.y, this.pos.x, this.pos.y);
    g.reportDanger(d);
    if (d < DEATH_R) g.kill();
  }
  draw(ctx, g) {
    const p = pal();
    // 巡逻路径画在轨道**底下**（game.js drawDanger），不在这里。
    // 原来是直接描在轨道正中央的一条暗红线 —— 在滑行章里它把虚线
    // 从中间劈开，那些虚线读起来变成"红线两侧的小刻度"，
    // 而"停不下来"这个提示恰恰在有巡逻的竖井里最要命。

    // 朝向拖影：prev 早就存着了，却一直没画出来。
    // 时机类关卡里"它正往哪边走"和"它在哪"一样重要。
    const vx = this.pos.x - this.prev.x, vy = this.pos.y - this.prev.y;
    const m = Math.hypot(vx, vy);
    if (m > 1e-5) {
      const tail = Math.min(0.85, m * 26);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = p.enemy;
      ctx.lineWidth = 0.2;
      ctx.beginPath();
      ctx.moveTo(this.pos.x, this.pos.y);
      ctx.lineTo(this.pos.x - (vx / m) * tail, this.pos.y - (vy / m) * tail);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }

    // 玩家越近，心跳越快。巡逻敌改成“开口镜片 + 前导叉”，而不是另一颗
    // 实心圆球；即使截一帧看不到拖影，也能直接读出它会移动以及朝哪边移动。
    const T = g ? g.tension : 0;
    const b = 1 + Math.sin(this.t * (5 + T * 9)) * (0.07 + T * 0.06);
    const a = Math.atan2(this.heading.y, this.heading.x);
    bloom(ctx, this.pos.x, this.pos.y, 0.52, p.enemy, 0.22);
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(a);
    glow(ctx, p.enemy, 0.085, (c, isGlow) => {
      const r = 0.34 * b;
      c.beginPath(); c.arc(0, 0, r, Math.PI * 0.34, Math.PI * 1.66); c.stroke();
      c.beginPath();
      c.moveTo(r * 0.72, -r * 0.52); c.lineTo(r * 1.10, 0); c.lineTo(r * 0.72, r * 0.52);
      c.stroke();
      if (!isGlow) { c.beginPath(); c.arc(0, 0, 0.12, 0, Math.PI * 2); c.fill(); }
    });
    ctx.restore();
  }
}

// ─────────────────────────────────────────── 追击敌人
// 沿轨道最短路追玩家；有拴绳半径，出圈就回家 —— 保证它属于某个房间，不会跟着你走完全世界。
export class Chaser extends Entity {
  constructor(s) {
    super(s);
    this.kind = 'chaser';
    this.home = { x: this.x, y: this.y };
    this.speed = this.speed || 4.4;
    this.leash = this.leash || 14;
    this.path = null;
    this.pi = 0;
    this.repathT = 0;
  }
  reset() { this.x = this.home.x; this.y = this.home.y; this.path = null; }
  update(dt, g) {
    this.t += dt;
    this.repathT -= dt;

    const px = Math.round(g.player.x), py = Math.round(g.player.y);
    const far = Math.abs(px - this.home.x) + Math.abs(py - this.home.y) > this.leash;
    const target = far ? this.home : { x: px, y: py };
    if (this.hunting !== undefined && this.hunting === far) g.sfx?.(far ? 'calm' : 'hunt');
    this.hunting = !far;

    if (this.repathT <= 0) {
      this.repathT = 0.18;
      this.path = g.routeOnTrack({ x: Math.round(this.x), y: Math.round(this.y) }, target, this.leash * 2, this.home);
      this.pi = 1;
    }

    // 沿路径推进（先走到当前格中心，再走向下一格）
    if (this.path && this.pi < this.path.length) {
      let rem = this.speed * dt;
      while (rem > 1e-6 && this.pi < this.path.length) {
        const n = this.path[this.pi];
        const dx = n.x - this.x, dy = n.y - this.y;
        const d = Math.hypot(dx, dy);
        if (d <= rem) { this.x = n.x; this.y = n.y; rem -= d; this.pi++; }
        else { this.x += (dx / d) * rem; this.y += (dy / d) * rem; rem = 0; }
      }
    }

    const d = dist(g.player.x, g.player.y, this.x, this.y);
    g.reportDanger(d * 0.7);   // 追击者更让人紧张
    if (d < DEATH_R) g.kill();
  }
  draw(ctx, g) {
    const p = pal();
    const b = g?.reducedMotion ? 1 : 1 + Math.sin(this.t * (this.hunting ? 9 : 3)) * (this.hunting ? 0.12 : 0.06);
    bloom(ctx, this.x, this.y, 0.58, p.enemy, this.hunting ? 0.30 : 0.18);
    glow(ctx, p.enemy, 0.09, (c, isGlow) => {
      // 追击态画成带尖角的多边形，和圆形的巡逻敌一眼可分
      const r = 0.36 * b;
      c.beginPath();
      for (let i = 0; i < 3; i++) {
        // 自转和玩家位置无关，是纯装饰 —— 减弱动效下停住，形状本身照旧可辨
        const a = (g?.reducedMotion ? 0 : this.t * 1.9) + (i / 3) * Math.PI * 2;
        const x = this.x + Math.cos(a) * r, y = this.y + Math.sin(a) * r;
        i ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.closePath();
      if (isGlow) c.stroke(); else c.fill();
    });
  }
}

// ─────────────────────────────────────────── 推块
export class Block extends Entity {
  constructor(s) {
    super(s);
    this.kind = 'block';
    this.home = { x: this.x, y: this.y };
    this.vx = this.x; this.vy = this.y;   // 视觉位置（追赶逻辑位置）
    this.moveT = 0;
  }
  reset() { this.x = this.home.x; this.y = this.home.y; this.vx = this.x; this.vy = this.y; this.moveT = 0; }
  push(tx, ty) { this.from = { x: this.x, y: this.y }; this.x = tx; this.y = ty; this.moveT = PUSH_T; }
  get moving() { return this.moveT > 0; }
  update(dt) {
    this.t += dt;
    if (this.moveT > 0) this.moveT = Math.max(0, this.moveT - dt);
    const k = Math.min(1, dt * 26);
    this.vx += (this.x - this.vx) * k;
    this.vy += (this.y - this.vy) * k;
  }
  draw(ctx) {
    const p = pal();
    const r = 0.34;
    ctx.save();
    ctx.translate(this.vx, this.vy);
    // 暗底 + 双层边框给方块厚度；外形仍与长按按钮的方槽严格对应。
    ctx.fillStyle = p.bg; ctx.globalAlpha = 0.82;
    ctx.fillRect(-r - 0.035, -r - 0.035, r * 2 + 0.07, r * 2 + 0.07);
    ctx.fillStyle = p.block; ctx.globalAlpha = 0.17;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = p.block; ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.88; ctx.lineWidth = 0.075;
    ctx.strokeRect(-r, -r, r * 2, r * 2);
    ctx.globalAlpha = 0.32; ctx.lineWidth = 0.04;
    ctx.strokeRect(-r * 0.58, -r * 0.58, r * 1.16, r * 1.16);
    // 顶边和左边多一层冷光，静止截图里也能读出实体朝向与重量。
    ctx.globalAlpha = 0.58; ctx.lineWidth = 0.045;
    ctx.beginPath();
    ctx.moveTo(-r + 0.08, -r + 0.035); ctx.lineTo(r - 0.08, -r + 0.035);
    ctx.moveTo(-r + 0.035, -r + 0.08); ctx.lineTo(-r + 0.035, r - 0.08);
    ctx.stroke();
    ctx.restore();
  }
}
export const PUSH_T = 0.14;   // ≈ 玩家跨一格的时间，让方块和光同步前进

// ─────────────────────────────────────────── 单向轨道
export class OneWay extends Entity {
  constructor(s) { super(s); this.kind = 'oneway'; }
  update(dt) { this.t += dt; }
  draw(ctx) {
    const p = pal();
    const a = { right: 0, left: Math.PI, up: -Math.PI / 2, down: Math.PI / 2 }[this.dir];
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(a);
    // 把这一格轨道染成方向材质：暗色套管 + 细内芯，再叠箭头。
    // 不再用一条比轨道还粗的发光横杠把符号托在画面上。
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = p.oneway; ctx.globalAlpha = ONEWAY_STYLE.sleeveAlpha; ctx.lineWidth = 0.22;
    ctx.beginPath(); ctx.moveTo(-0.44, 0); ctx.lineTo(0.44, 0); ctx.stroke();
    ctx.globalAlpha = ONEWAY_STYLE.coreAlpha; ctx.lineWidth = 0.04;
    ctx.beginPath(); ctx.moveTo(-0.42, 0); ctx.lineTo(0.42, 0); ctx.stroke();
    glow(ctx, p.oneway, ONEWAY_STYLE.arrowWidth, (c) => {
      for (let i = 0; i < 2; i++) {
        const o = -0.235 + i * ONEWAY_STYLE.arrowSpacing;
        c.beginPath();
        c.moveTo(o - 0.10, -0.20); c.lineTo(o + 0.10, 0); c.lineTo(o - 0.10, 0.20);
        c.stroke();
      }
    }, ONEWAY_STYLE.arrowAlpha);
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// ─────────────────────────────────────────── 按钮（长按 / 开关 / 计时）
export class Button extends Entity {
  constructor(s) { super(s); this.kind = 'button'; this.on = false; this.anim = 0; this.timer = 0; }
  reset() { this.on = false; this.timer = 0; }
  update(dt, g) {
    this.t += dt;
    const touching = dist(g.player.x, g.player.y, this.x, this.y) < TOUCH_R || g.blockOn(this.x, this.y);
    if (this.mode === 'toggle') {
      if (touching && !this._was) { this.on = !this.on; g.sfx?.('click'); }
    } else if (this.mode === 'timer') {
      if (touching && !this._was) { this.timer = this.time; g.sfx?.('click'); }
      if (this.timer > 0) {
        const before = Math.ceil(this.timer);
        this.timer = Math.max(0, this.timer - dt);
        // 表在走就该听得见。原来只有到期那一声 —— 等于表是哑的，只在爆炸时响
        if (this.timer > 0 && Math.ceil(this.timer) !== before) g.sfx?.('tick');
        if (this.timer === 0) g.sfx?.('timeout');
      }
      this.on = this.timer > 0;
    } else {
      if (touching !== this.on) { this.on = touching; g.sfx?.('click'); }
    }
    this._was = touching;
    this.anim += ((this.on ? 1 : 0) - this.anim) * Math.min(1, dt * 16);
  }
  draw(ctx) {
    const p = pal();
    const col = linkColor(this.link);
    const k = this.anim;
    const a = 0.42 + k * 0.58;

    // 所有按钮先有一块低亮度“槽体”，激活时再从槽内发光。
    // 原来只有一圈细描边，缩小时像漂在线上的编辑器标记，没有机关的体积。
    ctx.save();
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.07 + k * 0.11;
    if (this.mode === 'hold') {
      const r = 0.36;
      ctx.fillRect(this.x - r, this.y - r, r * 2, r * 2);
    } else {
      const r = 0.37;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y - r); ctx.lineTo(this.x + r, this.y);
      ctx.lineTo(this.x, this.y + r); ctx.lineTo(this.x - r, this.y);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    if (k > 0.02) bloom(ctx, this.x, this.y, 0.50, col, k * 0.25);

    if (this.mode === 'hold') {
      // 长按式画成方槽 —— 和推块同形。形状本身就在说"把那个方块放进来"，
      // 不用一个字就能区分于"踩一下就锁住"的开关式。
      const r = 0.30 - k * 0.04;
      const s = r * 0.44;
      glow(ctx, col, 0.07, (c, isGlow) => {
        c.beginPath(); c.rect(this.x - r, this.y - r, r * 2, r * 2); c.stroke();
        if (isGlow) return;
        c.beginPath(); c.rect(this.x - s, this.y - s, s * 2, s * 2);
        if (k > 0.5) c.fill(); else c.stroke();
      }, a);
    } else {
      // 开关式 / 计时式：菱形。按下后填实
      const r = 0.3 - k * 0.09;
      glow(ctx, col, 0.07, (c, isGlow) => {
        c.beginPath();
        c.moveTo(this.x, this.y - r); c.lineTo(this.x + r, this.y);
        c.lineTo(this.x, this.y + r); c.lineTo(this.x - r, this.y);
        c.closePath();
        if (isGlow || k < 0.5) c.stroke(); else c.fill();
      }, a);
    }
    // 计时按钮：剩余时间画成收缩的圆弧，玩家能读出还剩多久。
    //
    // 但走表时才画是不够的 —— 开关式和计时式都是菱形，静止时长得一模一样。
    // 于是按下之前你分不出"拨一下常开"和"按下就开始倒计时"，
    // 而这两个的规划方式完全不同：前者可以从容走开，后者是一场赛跑。
    // 你只能靠按一次、然后死一次来学会。
    //
    // 所以静止时也画一圈很淡的表盘。倒计时的圆弧本来就沿着这一圈跑，
    // 它就是那个圆弧空着的样子 —— 不用一个字就说清了"这个有表"。
    if (this.mode === 'timer') {
      const running = this.timer > 0;
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = col;
      if (!running) {
        ctx.globalAlpha = 0.22;
        ctx.lineWidth = 0.05;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 0.46, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.globalAlpha = 0.14;                      // 空表盘留着当底
        ctx.lineWidth = 0.05;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 0.46, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.lineWidth = 0.075;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 0.46, -Math.PI / 2,
                -Math.PI / 2 + (this.timer / this.time) * Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    if (k > 0.55) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (k - 0.55) / 0.45 * 0.82;
      ctx.fillStyle = pal().player;
      ctx.beginPath(); ctx.arc(this.x, this.y, 0.045, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
  }
}

// ─────────────────────────────────────────── 闸门
export class Gate extends Entity {
  constructor(s) { super(s); this.kind = 'gate'; this.anim = 0; }
  init(g) {
    // 依据轨道邻接判断闸门横杆朝向
    this.vertical = g.grid.has(this.x - 1, this.y) || g.grid.has(this.x + 1, this.y);
  }
  get open() { return this._open; }
  update(dt, g) {
    this.t += dt;
    const powered = !!g.circuits.get(this.link);
    const was = this._open;
    this._open = this.invert ? !powered : powered;
    if (this._open !== was && was !== undefined) {
      // 闸门常常开在画面外 —— "我刚按的钮到底动了什么"只能靠耳朵回答
      g.sfx?.(this._open ? 'gate' : 'gateShut');
      if (this._open) g.addPulse(this.x, this.y, { color: linkColor(this.link, 66), r0: 0.2, r1: 1.4, life: 0.35 });
    }
    const target = this._open ? 1 : 0;
    this.anim += (target - this.anim) * Math.min(1, dt * 14);
  }
  draw(ctx) {
    const col = linkColor(this.link);
    const edge = 0.46;
    const gap = 0.025 + this.anim * 0.36;
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.vertical) ctx.rotate(Math.PI / 2);

    if (this.anim < 0.92) bloom(ctx, 0, 0, 0.46, col, (1 - this.anim) * 0.15);

    // 两端门框始终留在轨道两侧；门打开时，两片闸板分别缩回门框，
    // 不再是“一根彩色线逐渐变短”。这让关闭、正在开、已打开三种状态都可读。
    ctx.strokeStyle = col;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.32 + (1 - this.anim) * 0.32;
    ctx.lineWidth = 0.055;
    for (const x of [-edge, edge]) {
      ctx.beginPath();
      ctx.moveTo(x, -0.20); ctx.lineTo(x, 0.20);
      ctx.stroke();
      ctx.beginPath();
      if (x < 0) ctx.arc(x, 0, 0.12, -Math.PI / 2, Math.PI / 2);
      else ctx.arc(x, 0, 0.12, Math.PI / 2, Math.PI * 1.5);
      ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.52;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(x, 0, 0.055, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.32 + (1 - this.anim) * 0.32;
    }

    ctx.globalAlpha = 0.28 + (1 - this.anim) * 0.72;
    glow(ctx, col, 0.095, (c) => {
      c.beginPath(); c.moveTo(-edge, 0); c.lineTo(-gap, 0); c.stroke();
      c.beginPath(); c.moveTo(gap, 0); c.lineTo(edge, 0); c.stroke();
    });

    if (this.anim < 0.72) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (1 - this.anim) * 0.7;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(0, -0.075); ctx.lineTo(0.075, 0); ctx.lineTo(0, 0.075); ctx.lineTo(-0.075, 0);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
}

// ─────────────────────────────────────────── 光点闸门
// 收集到足够的光点才会打开。门上直接把"需要多少 / 已有多少"画成一片光点阵列 ——
// 不用一个字，看一眼就知道还差几颗。它守的永远是可绕开的支路，不挡通关。
export class OrbGate extends Entity {
  constructor(s) { super(s); this.kind = 'orbgate'; this.anim = 0; this.got = 0; }
  init(g) {
    this.vertical = g.grid.has(this.x - 1, this.y) || g.grid.has(this.x + 1, this.y);
    // 阵列摆在轨道的垂直方向上，但那个方向的哪一边空着，得看现场。
    // w6-20 的闸门左边正好是入口走廊，阵列压在上面 ——
    // 读起来像有人在走廊上串了一串珠子，而不像门上的刻度。
    const busy = (sign) => {
      let n = 0;
      for (let d = 1; d <= 3; d++) for (let k = -2; k <= 2; k++) {
        const x = this.x + (this.vertical ? k : sign * d);
        const y = this.y + (this.vertical ? sign * d : k);
        if (g.grid.has(x, y)) n++;
      }
      return n;
    };
    this.side = busy(-1) <= busy(1) ? -1 : 1;
  }
  get open() { return this._open; }
  update(dt, g) {
    this.t += dt;
    this.got = g.orbCount;
    const wasOpen = this._open;
    this._open = g.orbCount >= this.need;
    if (this._open && wasOpen === false) g.sfx?.('vault');
    this.anim += ((this._open ? 1 : 0) - this.anim) * Math.min(1, dt * 9);
  }
  draw(ctx) {
    const p = pal();
    const s = 0.46 * (1 - this.anim);

    // 横杆
    glow(ctx, p.orb, 0.11, (c) => {
      c.beginPath();
      if (this.vertical) { c.moveTo(this.x, this.y - s); c.lineTo(this.x, this.y + s); }
      else { c.moveTo(this.x - s, this.y); c.lineTo(this.x + s, this.y); }
      c.stroke();
    }, 0.28 + (1 - this.anim) * 0.72);

    // 刻度阵列：每颗光点一个位置，拿到的填实，没拿的只留一个暗环。
    // 摆在轨道的垂直方向上、且是空着的那一边（见 init），免得盖住走廊和玩家。
    // 多级宝库若把 36/54/64 颗仍按旧的三列画，会长成二十多格高的“珠帘”。
    // 多门模式改用接近方形的紧凑阵列；单门仍保留原来更易数的宽松间距。
    const compact = this.stages > 1 || this.need > 24;
    const cols = compact ? Math.ceil(Math.sqrt(this.need * 1.45)) : (this.vertical ? 6 : 3);
    const rows = Math.ceil(this.need / cols);
    const sp = compact ? 0.18 : 0.32;
    const off = this.side * (1.15 + (this.vertical ? rows - 1 : cols - 1) * sp / 2);
    // 猜不准就让作者直接指定。奖励门数量很少，与其继续拿几何去猜
    // "哪边空着"（试过两版，一版压走廊、一版撞回响碑铺开的那片光），
    // 不如把它当成关卡数据 —— 摆哪儿是作者的事，不是启发式的事。
    const cx = this.at ? this.x + this.at[0] : this.x + (this.vertical ? 0 : off);
    const cy = this.at ? this.y + this.at[1] : this.y + (this.vertical ? off : 0);
    ctx.lineCap = 'round';
    for (let i = 0; i < this.need; i++) {
      const r = (i / cols) | 0;
      const n = Math.min(cols, this.need - r * cols);
      const x = cx - ((n - 1) * sp) / 2 + (i - r * cols) * sp;
      const y = cy - ((rows - 1) * sp) / 2 + r * sp;
      const has = i < this.got;
      ctx.globalCompositeOperation = has ? 'lighter' : 'source-over';
      ctx.globalAlpha = has ? 0.95 : 0.5;   // 原来 0.28，1× 下几乎是黑的
      ctx.strokeStyle = p.orb; ctx.fillStyle = p.orb;
      ctx.lineWidth = has ? 0.035 : 0.045;
      ctx.beginPath(); ctx.arc(x, y, compact ? 0.055 : 0.10, 0, Math.PI * 2);
      if (has) ctx.fill(); else ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
}

// ─────────────────────────────────────────── 回响碑
// 光点闸门后面那间房里的报酬：你收集到的每一颗光点，在这里重新亮一次。
export class Echo extends Entity {
  constructor(s) {
    super(s); this.kind = 'echo';
    this.rx = this.stages > 1 ? 1.8 : 3.6;
    this.ry = this.stages > 1 ? 1.5 : 2.6;
  }
  update(dt, g) {
    this.t += dt;
    this.n = this.need ? Math.min(g.orbCount, this.need) : g.orbCount;
    this.total = this.need || g.orbTotal || 1;
  }
  draw(ctx, g) {
    const p = pal();
    const n = this.n || 0;
    if (this.stages > 1) {
      // 四个奖励支室各自形成一团逐级变密的星群。它们画的是累计门槛，
      // 所以 18/36/54/64 四级即使没有文字，也能从密度上一眼看出层次。
      const total = Math.max(1, this.total || n);
      const spin = g?.reducedMotion ? 0 : this.t * 0.08;
      const GOLDEN = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / total;
        const a = i * GOLDEN + (this.stage || 0) * 0.65 + spin;
        const rr = 0.24 + Math.sqrt(u) * 1.18;
        const x = this.x + Math.cos(a) * rr;
        const y = this.y + Math.sin(a) * rr * 0.68;
        const b = g?.reducedMotion ? 0.82 : 0.62 + 0.38 * Math.sin(this.t * 1.3 + i * 1.7);
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = p.orb;
        ctx.globalAlpha = 0.16 * b;
        ctx.beginPath(); ctx.arc(x, y, 0.18, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.88 * b;
        ctx.beginPath(); ctx.arc(x, y, 0.05, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      return;
    }
    for (let i = 0; i < n; i++) {
      // 向上铺开的一片扇形，正好填满小室上方那块空白。
      // 按已收集数铺角，不按全局总数 —— 原来是 i/total，
      // 收 13 颗时 13 个光全挤在扇形的一端，看起来像堆在角落的一小撮，
      // 而不是"你点亮的一片"。进度已经由光的数量表达了，不必再压角度。
      const u = (i + 0.5) / Math.max(7, n);
      const a = Math.PI * (0.10 + u * 0.80);
      const rr = 1.45 + ((i * 7) % 5) * 0.20 +
        (g?.reducedMotion ? 0 : Math.sin(this.t * 0.6 + i) * 0.10);
      const x = this.x - Math.cos(a) * rr * 2.1;
      const y = this.y - Math.sin(a) * rr * 0.92 - 0.35;
      const b = g?.reducedMotion ? 0.8 : 0.55 + 0.45 * Math.sin(this.t * 1.6 + i * 1.3);
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = p.orb;
      ctx.globalAlpha = 0.18 * b;
      ctx.beginPath(); ctx.arc(x, y, 0.26, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.9 * b;
      ctx.beginPath(); ctx.arc(x, y, 0.075, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
}

// ─────────────────────────────────────────── 加速带
export class Boost extends Entity {
  constructor(s) { super(s); this.kind = 'boost'; }
  init(g) {
    // 沿轨道方向画，而不是永远朝下
    this.horiz = g.grid.has(this.x - 1, this.y) || g.grid.has(this.x + 1, this.y);
  }
  update(dt, g) {
    this.t += dt;
    if (dist(g.player.x, g.player.y, this.x, this.y) < TOUCH_R) g.boostHit = true;
  }
  draw(ctx, g) {
    // 加速带是"无方向"的：它只让你变快，不限制你往哪走 ——
    // 所以不能画成箭头，会和单向轨道撞语义。
    // 但也不该画成垂直于轨道的刻度：那和单向的箭头同色、同粗细、同尺寸，
    // 放大三倍才分得清，1× 下只能靠位置猜。两个完全不同的动词长成了一族。
    // 改成沿着轨道跑过去的光脉冲 —— 动词是"变快"，那就让它自己在动，
    // 而静止的箭头继续只表示"不许回头"。形状、朝向、动静三处都拉开了。
    const p = pal();
    // 减弱动效：这是全场动得最厉害的东西（一道沿轨道跑过去的光）。
    // 但不能直接不画 —— 那样加速带就消失了，机制本身没了。
    // 改成静止的双段亮线：仍然是"沿轨道"的形状，和单向的箭头区分照旧成立。
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = p.boost;
    ctx.lineCap = 'round';
    // 加速格先成为一段蓝色导轨材质，再让脉冲沿内芯穿过。
    ctx.globalAlpha = 0.09; ctx.lineWidth = 0.20;
    ctx.beginPath();
    if (this.horiz) { ctx.moveTo(this.x - 0.44, this.y); ctx.lineTo(this.x + 0.44, this.y); }
    else { ctx.moveTo(this.x, this.y - 0.44); ctx.lineTo(this.x, this.y + 0.44); }
    ctx.stroke();
    ctx.globalAlpha = 0.24; ctx.lineWidth = 0.026;
    for (const o of [-0.105, 0.105]) {
      ctx.beginPath();
      if (this.horiz) { ctx.moveTo(this.x - 0.42, this.y + o); ctx.lineTo(this.x + 0.42, this.y + o); }
      else { ctx.moveTo(this.x + o, this.y - 0.42); ctx.lineTo(this.x + o, this.y + 0.42); }
      ctx.stroke();
    }
    ctx.restore();
    if (g?.reducedMotion) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = p.boost;
      ctx.lineCap = 'round';
      for (const [a, b] of [[-0.34, -0.06], [0.06, 0.34]]) {
        ctx.globalAlpha = 0.5; ctx.lineWidth = 0.09;
        ctx.beginPath();
        if (this.horiz) { ctx.moveTo(this.x + a, this.y); ctx.lineTo(this.x + b, this.y); }
        else { ctx.moveTo(this.x, this.y + a); ctx.lineTo(this.x, this.y + b); }
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      return;
    }
    // 相位随位置错开，整段连起来像一道波。
    // 注意取正模：世界坐标是 2500 量级，(x+y)*0.3 让 ph 恒为大负数，
    // 而 JS 的 % 对负数返回负值 —— 直接写 ph % 1 会让每一段都落在可见区间外，
    // 结果是加速带一格都画不出来（第一版就是这么静悄悄地全没了）。
    const mod1 = (v) => ((v % 1) + 1) % 1;
    const ph = this.t * 1.5 - (this.x + this.y) * 0.3;
    ctx.lineCap = 'round';
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = p.boost;
    for (let k = 0; k < 2; k++) {
      const head = mod1(ph + k / 2) - 0.5;
      for (let s2 = 0; s2 < 5; s2++) {
        const t0 = head - s2 * 0.085, t1 = t0 - 0.085;
        if (t1 > 0.5 || t0 < -0.5) continue;
        const a0 = Math.max(-0.5, t1), a1 = Math.min(0.5, t0);
        const a = (1 - s2 / 5) ** 2;
        ctx.globalAlpha = a * 0.55;
        ctx.lineWidth = 0.10 - s2 * 0.012;
        ctx.beginPath();
        if (this.horiz) { ctx.moveTo(this.x + a0, this.y); ctx.lineTo(this.x + a1, this.y); }
        else { ctx.moveTo(this.x, this.y + a0); ctx.lineTo(this.x, this.y + a1); }
        ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
}

// ─────────────────────────────────────────── 传送门
export class Portal extends Entity {
  constructor(s) { super(s); this.kind = 'portal'; this.cool = 0; }
  reset() { this.cool = 0; }
  update(dt, g) {
    this.t += dt;
    if (this.cool > 0) { this.cool -= dt; return; }
    if (dist(g.player.x, g.player.y, this.x, this.y) < 0.3) {
      const other = g.entities.find(e => e.kind === 'portal' && e.link === this.link && e !== this);
      if (other) g.teleport(this, other);
    }
  }
  draw(ctx, g) {
    const p = pal();
    bloom(ctx, this.x, this.y, 0.50, p.portal, 0.28);
    // 把轨道压出一个暗孔，传送门因此是空间里的洞，而不只是两只紫色括号。
    ctx.save();
    ctx.globalAlpha = 0.88;
    ctx.fillStyle = p.bg;
    ctx.beginPath(); ctx.arc(this.x, this.y, 0.19, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    const spin = g?.reducedMotion ? 0 : this.t;
    glow(ctx, p.portal, 0.07, (c) => {
      for (let i = 0; i < 2; i++) {
        const a = spin * (i ? -1.4 : 1.1);
        c.beginPath();
        c.arc(this.x, this.y, 0.3 - i * 0.11, a, a + Math.PI * 1.35);
        c.stroke();
      }
    });
    const a = g?.reducedMotion ? -0.6 : this.t * 1.35;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.92; ctx.fillStyle = p.portal;
    ctx.beginPath();
    ctx.arc(this.x + Math.cos(a) * 0.285, this.y + Math.sin(a) * 0.285, 0.045, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

const REGISTRY = {
  checkpoint: Checkpoint, orb: Orb, goal: Goal, enemy: Enemy, patrol: Patrol,
  chaser: Chaser, block: Block, oneway: OneWay,
  button: Button, gate: Gate, orbgate: OrbGate, echo: Echo, boost: Boost, portal: Portal,
};

export function createEntity(spec) {
  const Klass = REGISTRY[spec.type];
  if (!Klass) return null;
  return new Klass(spec);
}
