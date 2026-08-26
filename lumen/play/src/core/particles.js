// 极简粒子：只画短线段，符合"世界由线构成"的美术前提
import { randRange, rand } from './util.js';

export class Particles {
  constructor(max = 600) {
    this.list = [];
    this.max = max;
  }

  spawn(x, y, opts = {}) {
    const {
      count = 12, speed = [2, 7], life = [0.25, 0.6],
      color = '#fff', len = [0.12, 0.35], gravity = 0, spread = Math.PI * 2, angle = 0,
    } = opts;
    for (let i = 0; i < count; i++) {
      if (this.list.length >= this.max) this.list.shift();
      const a = angle + (rand() - 0.5) * spread;
      const sp = randRange(speed[0], speed[1]);
      this.list.push({
        x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: randRange(life[0], life[1]), t: 0,
        len: randRange(len[0], len[1]), color, gravity,
      });
    }
  }

  /** 沿一条折线均匀撒粒子。死亡时让玩家按自身形状碎开，而不是从一个点喷。 */
  spawnAlong(pts, opts = {}) {
    const { density = 4 } = opts;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const n = Math.max(1, Math.round(len * density));
      for (let k = 0; k < n; k++) {
        const f = (k + 0.5) / n;
        this.spawn(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f, { ...opts, count: 1 });
      }
    }
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.t += dt;
      if (p.t >= p.life) { this.list.splice(i, 1); continue; }
      p.vy += p.gravity * dt;
      p.vx *= 1 - 2.4 * dt;
      p.vy *= 1 - 2.4 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  draw(ctx) {
    ctx.lineCap = 'round';
    for (const p of this.list) {
      const k = 1 - p.t / p.life;
      const m = Math.hypot(p.vx, p.vy) || 1;
      ctx.globalAlpha = k * k;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 0.075 * k + 0.02;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - (p.vx / m) * p.len * k, p.y - (p.vy / m) * p.len * k);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  clear() { this.list.length = 0; }
}
