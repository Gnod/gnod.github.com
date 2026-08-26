// 摄像机：房间内锁房间取景，走廊内跟随玩家
import { clamp, damp, rand, DIRS } from './util.js';
import { CELL, VIEW_W, VIEW_H } from './theme.js';

const LOOKAHEAD = 2.4;   // 常速时朝前让出多少格视野

export class Camera {
  constructor() {
    this.x = 0; this.y = 0;      // 世界坐标（格）
    this.ppc = CELL;             // 每格像素
    this.shake = 0;
    this.sx = 0; this.sy = 0;
    this.lx = 0; this.ly = 0;      // 前瞻偏移
    this.snapped = false;
  }

  resize(w, h) {
    this.w = w; this.h = h;
    // 竖屏（手机）不能沿用横屏的可见格数，否则一切都被宽度压得极小
    this.base = w / h < 1.2
      ? Math.min(w / 15, h / 26)
      : Math.min(w / VIEW_W, h / VIEW_H);
    if (!this.ppc || !this.snapped) this.ppc = this.base;
    this.viewW = w / this.ppc;
    this.viewH = h / this.ppc;
  }

  /** 找到包含该点的房间（含 1 格外扩） */
  static roomAt(rooms, x, y) {
    for (const r of rooms) {
      if (x >= r.x - 0.5 && x <= r.x + r.w - 0.5 && y >= r.y - 0.5 && y <= r.y + r.h - 0.5) return r;
    }
    return null;
  }

  update(dt, game) {
    const p = game.player;

    // 朝行进方向前瞻。这不只是好看：走廊里视野居中意味着你只能看到
    // 身后和身前一样多，而身后的东西你已经走过了 —— 让出去的那点视野
    // 正好用来提前发现前面的巡逻。速度越快看得越远。
    const d = p.dir && p.moving ? DIRS[p.dir] : null;
    const reach = LOOKAHEAD * (p.speed / 7.2);
    this.lx = damp(this.lx, d ? d.x * reach : 0, 3.2, dt);
    this.ly = damp(this.ly, d ? d.y * reach : 0, 3.2, dt);

    let tx = p.x + this.lx, ty = p.y + this.ly;
    const room = Camera.roomAt(game.world.rooms, p.x, p.y);

    // 缩放跟着房间走：小房间凑近，大房间退远。夹在基准的 0.72~1.45 倍之间，
    // 避免房间之间的比例跳变太大。
    let targetPpc = this.base;
    if (room) {
      const fit = Math.min(this.w / (room.w + 5), this.h / (room.h + 5));
      targetPpc = clamp(fit, this.base * 0.72, this.base * 1.9);
    }
    this.ppc = this.snapped ? damp(this.ppc, targetPpc, 4.5, dt) : targetPpc;
    this.viewW = this.w / this.ppc;
    this.viewH = this.h / this.ppc;

    if (room) {
      // 房间比视野小 → 居中框住整个房间；否则跟随玩家但夹在房间内
      if (room.w <= this.viewW - 1) tx = room.cx;
      else tx = clamp(p.x, room.x + this.viewW / 2 - 1, room.x + room.w - this.viewW / 2);
      if (room.h <= this.viewH - 1) ty = room.cy;
      else ty = clamp(p.y, room.y + this.viewH / 2 - 1, room.y + room.h - this.viewH / 2);
    }

    const rate = room ? 5.5 : 7.5;
    if (!this.snapped) { this.x = tx; this.y = ty; this.snapped = true; }
    else {
      this.x = damp(this.x, tx, rate, dt);
      this.y = damp(this.y, ty, rate, dt);
    }

    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 3.2);
      const m = this.shake * this.shake * 0.55;
      this.sx = (rand() * 2 - 1) * m;
      this.sy = (rand() * 2 - 1) * m;
    } else { this.sx = this.sy = 0; }
  }

  kick(amount = 1) { this.shake = Math.min(1.6, this.shake + amount); }
  snap() { this.snapped = false; }

  apply(ctx) {
    ctx.translate(this.w / 2, this.h / 2);
    ctx.scale(this.ppc, this.ppc);
    ctx.translate(-(this.x + this.sx), -(this.y + this.sy));
  }

  /** 当前可见范围（格坐标，含外扩） */
  viewRect(pad = 2) {
    return {
      x0: this.x - this.viewW / 2 - pad, x1: this.x + this.viewW / 2 + pad,
      y0: this.y - this.viewH / 2 - pad, y1: this.y + this.viewH / 2 + pad,
    };
  }
}
