// 输入：键盘 / 手柄 / 触屏（虚拟摇杆 + 滑动）
// 语义：last-pressed-wins —— 最后按下的方向优先，松开后回落到仍按住的上一个方向。

const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
};

// 标准手柄布局：A 确认，B / Start 返回或暂停，X 重试，Y 静音。
// 单独做成纯函数，既能给 Input 用，也能在没有浏览器的 Node 测试里验证映射。
export function readGamepad(p) {
  if (!p) return { dir: null, actions: [] };
  const ax = p.axes?.[0] || 0, ay = p.axes?.[1] || 0;
  const dz = 0.45;
  let dir = null;
  if (Math.abs(ax) > dz || Math.abs(ay) > dz) {
    dir = Math.abs(ax) > Math.abs(ay) ? (ax > 0 ? 'right' : 'left') : (ay > 0 ? 'down' : 'up');
  }
  const b = p.buttons || [];
  if (b[12]?.pressed) dir = 'up';
  else if (b[13]?.pressed) dir = 'down';
  else if (b[14]?.pressed) dir = 'left';
  else if (b[15]?.pressed) dir = 'right';

  const actions = [];
  if (dir) actions.push({ up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }[dir]);
  if (b[0]?.pressed) actions.push('Enter');
  if (b[1]?.pressed || b[8]?.pressed || b[9]?.pressed) actions.push('Escape');
  if (b[2]?.pressed) actions.push('KeyR');
  if (b[3]?.pressed) actions.push('KeyM');
  return { dir, actions };
}

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.stack = [];          // 按住的方向栈，末尾优先
    this.pressed = new Set(); // 本帧新按下的键（用于 UI 确认）
    this.anyPressed = false;
    this.touchDir = null;
    this._touchId = null;
    this._touchStart = null;
    this.padDir = null;
    this._padHeld = new Set();
    this._bind();
  }

  _bind() {
    addEventListener('keydown', (e) => {
      const d = KEYMAP[e.code];
      if (d) {
        e.preventDefault();
        if (!this.stack.includes(d)) this.stack.push(d);
        this.anyPressed = true;
      }
      this.pressed.add(e.code);
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape') e.preventDefault();
    }, { passive: false });

    addEventListener('keyup', (e) => {
      const d = KEYMAP[e.code];
      if (d) {
        const i = this.stack.indexOf(d);
        if (i >= 0) this.stack.splice(i, 1);
      }
    });

    addEventListener('blur', () => { this.stack.length = 0; this.touchDir = null; this._touchId = null; });

    const c = this.canvas;
    c.addEventListener('touchstart', (e) => {
      const t = e.changedTouches[0];
      this._touchId = t.identifier;
      this._touchStart = { x: t.clientX, y: t.clientY };
      this.anyPressed = true;
      e.preventDefault();
    }, { passive: false });

    c.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier !== this._touchId) continue;
        const dx = t.clientX - this._touchStart.x;
        const dy = t.clientY - this._touchStart.y;
        const m = Math.hypot(dx, dy);
        if (m > 18) {
          this.touchDir = Math.abs(dx) > Math.abs(dy)
            ? (dx > 0 ? 'right' : 'left')
            : (dy > 0 ? 'down' : 'up');
          // 摇杆跟手：原点缓慢跟随，允许连续改向
          const k = Math.min(1, (m - 18) / m);
          this._touchStart.x += dx * k * 0.25;
          this._touchStart.y += dy * k * 0.25;
        }
      }
      e.preventDefault();
    }, { passive: false });

    const end = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this._touchId) { this._touchId = null; this.touchDir = null; }
      }
      e.preventDefault();
    };
    c.addEventListener('touchend', end, { passive: false });
    c.addEventListener('touchcancel', end, { passive: false });
  }

  /** 每帧在菜单处理之前轮询一次；动作键只在按下沿触发，不会连点。 */
  beginFrame() {
    if (!navigator.getGamepads) { this.padDir = null; return; }
    const pads = navigator.getGamepads();
    let dir = null;
    const held = new Set();
    for (const p of pads) {
      if (!p) continue;
      const s = readGamepad(p);
      if (!dir && s.dir) dir = s.dir;
      for (const code of s.actions) held.add(code);
    }
    for (const code of held) {
      if (!this._padHeld.has(code)) this.pressed.add(code);
    }
    this._padHeld = held;
    this.padDir = dir;
    if (dir || held.size) this.anyPressed = true;
  }

  /** 当前期望方向，无输入返回 null */
  get dir() {
    if (this.touchDir) return this.touchDir;
    if (this.padDir) return this.padDir;
    return this.stack.length ? this.stack[this.stack.length - 1] : null;
  }

  wasPressed(code) { return this.pressed.has(code); }

  endFrame() { this.pressed.clear(); }
}
