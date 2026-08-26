// 通用数学/方向工具

export const DIRS = {
  up:    { x: 0, y: -1 },
  down:  { x: 0, y:  1 },
  left:  { x:-1, y:  0 },
  right: { x: 1, y:  0 },
};

export const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;

/** 帧率无关的指数逼近。rate 越大越快。 */
export const damp = (a, b, rate, dt) => lerp(a, b, 1 - Math.exp(-rate * dt));

export const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

export const key = (x, y) => x + ',' + y;

/** 三角波：在 [0,1] 之间往返，用于巡逻。period 为一个来回的时长。 */
export function pingpong(t, period) {
  const p = (t % period) / period;
  return p < 0.5 ? p * 2 : 2 - p * 2;
}

/** 平滑的往返缓动（首尾减速），巡逻用它比线性更好看 */
export function pingpongSmooth(t, period) {
  return 0.5 - 0.5 * Math.cos(pingpong(t, period) * Math.PI);
}

let _seed = 1337;
export function rand() {
  _seed = (_seed * 1664525 + 1013904223) >>> 0;
  return _seed / 4294967296;
}
export const randRange = (a, b) => a + rand() * (b - a);
