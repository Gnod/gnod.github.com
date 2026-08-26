// 玩家：Pac-Man 式栅格移动 + 拖尾
import { DIRS, OPPOSITE } from '../core/util.js';

export const TUNING = {
  SPEED: 7.2,
  TRAIL_LEN: 2.2,       // 常速时的拖尾弧长（静止收到 IDLE_LEN，加速带上按速度拉长）
  IDLE_LEN: 0.95,       // 停下来时收拢到多短 —— 拖尾同时也是速度计
  TRAIL_EASE: 9,        // 伸缩的平滑速率
  // 转向的容错是不对称的：提前按有一整段时间窗，迟到只有一小段距离窗。
  // 人的按键抖动本来就有 ±50~100ms，所以两边都得给够。
  INPUT_BUFFER: 0.20,   // 提前按下的转向能保留多久（按住会持续刷新）
  LATE_TURN_T: 0.12,    // 冲过路口多久以内，迟到的转向仍然算数。
                        // 按时间算而不是按距离：加速带上速度翻倍，
                        // 按距离算会让容错凭空严一倍。
  LATE_TURN_MIN: 0.45,  // 距离下限，慢速时也别太苛刻
  LATE_TURN_MAX: 0.92,  // 距离上限（back 恒 < 1，所以这已接近满格）
  SNAP_SMOOTH: 30,      // 迟到转向要把人拉回路口；这是视觉上追平的速率
  SEEK_CELLS: 3,        // 静止时按垂直方向，沿走廊往两头找路口的最大格数
  NOSE: 0.40,           // 顶住推块时头部探出去多少（纯视觉）。
                        // 玩家被挡在整整一格之外的格心上，而方块只占 0.6 格宽，
                        // 不探出去就会看成"没碰到它就动了"。
  NOSE_SMOOTH: 22,      // 探出/收回的速率
  BUMP: 0.16,           // 撞上死路/闸门时的回弹幅度（纯视觉）
  MAX_POINTS: 24,
};

/**
 * 把从光核到尾端的中心折线扩成一整块连续锥形带。
 * 每个路口只生成一对共享顶点，渲染时一次 fill，避免半透明短段重叠出的亮度台阶。
 */
export function trailRibbon(points, headWidth, tailWidth = 0.004, exponent = 0.72) {
  const clean = [];
  for (const p of points || []) {
    const prev = clean.at(-1);
    if (!prev || Math.hypot(p.x - prev.x, p.y - prev.y) > 1e-9) clean.push(p);
  }
  if (clean.length < 2 || headWidth <= 0) return { left: [], right: [] };

  const cumulative = [0];
  for (let i = 1; i < clean.length; i++) {
    cumulative.push(cumulative.at(-1) + Math.hypot(
      clean[i].x - clean[i - 1].x,
      clean[i].y - clean[i - 1].y,
    ));
  }
  const total = cumulative.at(-1);
  if (total < 1e-9) return { left: [], right: [] };

  const unit = (a, b) => {
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.hypot(dx, dy);
    return { x: dx / d, y: dy / d };
  };
  const left = [], right = [];
  for (let i = 0; i < clean.length; i++) {
    const t = cumulative[i] / total;
    const width = tailWidth + (headWidth - tailWidth) * Math.pow(1 - t, exponent);
    const half = width * 0.5;
    const before = i > 0 ? unit(clean[i - 1], clean[i]) : null;
    const after = i < clean.length - 1 ? unit(clean[i], clean[i + 1]) : null;
    let ox, oy;
    if (!before || !after) {
      const d = after || before;
      ox = -d.y * half; oy = d.x * half;
    } else {
      const n0 = { x: -before.y, y: before.x };
      const n1 = { x: -after.y, y: after.x };
      const ml = Math.hypot(n0.x + n1.x, n0.y + n1.y);
      if (ml < 1e-6) {
        // 极少见的原路折返：退回后一段法线，避免无限长的尖角。
        ox = n1.x * half; oy = n1.y * half;
      } else {
        const mx = (n0.x + n1.x) / ml, my = (n0.y + n1.y) / ml;
        // 栅格 90° 转角的标准 miter 会膨胀到 1.414 倍，形成一个亮结；
        // 受限斜接把外扩压在约 1.22 倍以内，连续但不鼓包。
        const denom = Math.max(0.82, Math.abs(mx * n0.x + my * n0.y));
        ox = mx * half / denom; oy = my * half / denom;
      }
    }
    left.push({ x: clean[i].x + ox, y: clean[i].y + oy });
    right.push({ x: clean[i].x - ox, y: clean[i].y - oy });
  }
  return { left, right };
}

export class Player {
  constructor(game) {
    this.game = game;
    this.x = 0; this.y = 0;
    this.dir = null;
    this.buffer = null;
    this.bufferT = 0;
    this.points = [];       // 历史路口点（下标 0 最新），含进入时的方向
    this.speed = TUNING.SPEED;
    this.moving = false;
    this.trailLen = TUNING.IDLE_LEN;
    this.distance = 0;      // 累计行程，用于统计/音效
  }

  reset(x, y) {
    this.x = x; this.y = y;
    this.dir = null;
    this.buffer = null; this.bufferT = 0;
    this.points = [];
    this.speed = TUNING.SPEED;
    this.moving = false;
    this.wasMoving = false;
    this.trailLen = TUNING.IDLE_LEN;
    this.vox = 0; this.voy = 0;
    this.lean = 0; this.pressing = false;
    this.blocked = false; this.bump = 0;
  }

  atCenter() {
    return Math.abs(this.x - Math.round(this.x)) < 1e-6 &&
           Math.abs(this.y - Math.round(this.y)) < 1e-6;
  }

  canGo(cx, cy, dir) {
    if (!this.game.canLeave(cx, cy, dir)) return false;
    const d = DIRS[dir];
    return this.game.isOpen(cx + d.x, cy + d.y, dir);
  }

  /** 能否"朝这个方向站定"。和 canGo 只差一条：推块不算障碍。
   *  推块挡的是移动，不该挡转身 —— 否则玩家永远没法面对一个方块，
   *  也就永远推不动它。转过去之后移动循环里的 canGo 会让他停在方块前，正合适。 */
  canFace(cx, cy, dir) {
    if (!this.game.canLeave(cx, cy, dir)) return false;
    const d = DIRS[dir];
    return this.game.isOpen(cx + d.x, cy + d.y, dir, true);
  }

  /** 是否正踩在滑行段上。
   *  在格心时看脚下这一格；线段中途时看身后那一格 —— 于是"滑出滑行段"
   *  会精确地停在下一个普通格的格心上，而不是停在两格之间。 */
  onSlide() {
    if (!this.dir || this.atCenter()) {
      return this.game.isSlide(Math.round(this.x), Math.round(this.y));
    }
    const b = this.cellBehind();
    return this.game.isSlide(b.x, b.y);
  }

  /** 迟到转向的容错窗口。按时间折算成距离，加速带上才不会突然变严。 */
  lateWindow() {
    return Math.min(TUNING.LATE_TURN_MAX,
      Math.max(TUNING.LATE_TURN_MIN, this.speed * TUNING.LATE_TURN_T));
  }

  /** 线段中途时，身后那一格的坐标 */
  cellBehind() {
    const d = DIRS[this.dir];
    return {
      x: d.x > 0 ? Math.floor(this.x) : d.x < 0 ? Math.ceil(this.x) : Math.round(this.x),
      y: d.y > 0 ? Math.floor(this.y) : d.y < 0 ? Math.ceil(this.y) : Math.round(this.y),
    };
  }

  _push(cx, cy, dir) {
    const d = DIRS[dir];
    const p0 = this.points[0];
    if (p0 && p0.x === cx && p0.y === cy) { p0.dx = d.x; p0.dy = d.y; return; }
    this.points.unshift({ x: cx, y: cy, dx: d.x, dy: d.y });
    if (this.points.length > TUNING.MAX_POINTS) this.points.length = TUNING.MAX_POINTS;
  }

  update(dt, wish) {
    // 迟到转向的视觉补偿：逻辑上瞬间拉回路口，画面上让它快速追上，
    // 否则会看到一次向后的顿挫。
    const k = Math.min(1, dt * TUNING.SNAP_SMOOTH);
    this.vox -= this.vox * k;
    this.voy -= this.voy * k;

    // 顶住推块时的"探头"：由 Game.tryPush 每帧标记
    this.lean += ((this.pressing ? 1 : 0) - this.lean) * Math.min(1, dt * TUNING.NOSE_SMOOTH);

    // 拖尾长度当速度计：静止收拢，加速带上拉长。不用加任何美术资源，
    // "快"和"停"就都有了体感。
    const wantLen = this.moving
      ? TUNING.IDLE_LEN + (this.speed / TUNING.SPEED) * (TUNING.TRAIL_LEN - TUNING.IDLE_LEN)
      : TUNING.IDLE_LEN;
    this.trailLen += (wantLen - this.trailLen) * Math.min(1, dt * TUNING.TRAIL_EASE);

    // ── 输入缓冲：按住则持续刷新，松开后 INPUT_BUFFER 秒内仍可兑现
    if (wish) { this.buffer = wish; this.bufferT = TUNING.INPUT_BUFFER; }
    else if (this.bufferT > 0) {
      this.bufferT -= dt;
      if (this.bufferT <= 0) this.buffer = null;
    }

    const atC = this.atCenter();
    const cx = Math.round(this.x), cy = Math.round(this.y);

    // ── 反向：格心看前方一格，线段中途看身后一格
    //    （身后可能是单向轨道、刚关上的闸门或被推过来的方块）
    if (this.buffer && this.dir && this.buffer === OPPOSITE[this.dir]) {
      const ok = atC
        ? this.canFace(cx, cy, this.buffer)
        : (() => { const b = this.cellBehind(); return this.game.isOpen(b.x, b.y, this.buffer, true); })();
      if (ok) this.dir = this.buffer;
    }

    if (this.buffer && atC && this.buffer !== this.dir && this.canFace(cx, cy, this.buffer)) {
      // 在格心：转向 / 起步
      this.dir = this.buffer;
    } else if (this.buffer && !atC && this.dir &&
               this.buffer !== this.dir && this.buffer !== OPPOSITE[this.dir]) {
      // 迟到转向补偿：刚冲过路口一点点也认。
      // 就近原则 —— 身后那个路口更近就回拉，前面那个更近就让它过去。
      // 玩家按下转向时想的是"离我最近的那个拐角"。
      const p0 = this.points[0];
      if (p0) {
        const d = DIRS[this.dir];
        const back = (this.x - p0.x) * d.x + (this.y - p0.y) * d.y;
        if (back > 0 && back <= this.lateWindow() && this.canFace(p0.x, p0.y, this.buffer)) {
          const aheadTurns = this.canFace(p0.x + d.x, p0.y + d.y, this.buffer);
          if (back <= 0.5 || !aheadTurns) {
            this.vox += this.x - p0.x;
            this.voy += this.y - p0.y;
            this.x = p0.x; this.y = p0.y;
            this.dir = this.buffer;
          }
        }
      }
    }

    if (!this.dir) { this.moving = false; this.wasMoving = false; return; }

    // ── 松手即停：等待巡逻是核心动词，玩家必须能停在任意位置。
    //    但"按住垂直方向"要保留动量，否则无法把转向排队到下一个路口。
    let go = !!wish && (wish === this.dir || wish === OPPOSITE[this.dir] || this.wasMoving);

    // 滑行段：松手不停。整个游戏花了两小时教会你"停下来等"就是安全，
    // 这里把那条规则拿走 —— 巡逻还在走，而你停不下来。
    // 反向仍然允许：滑进死路又退不出来就是软锁（铁律二）。
    if (!go && this.onSlide()) go = true;

    // 停在线段中途时按下垂直方向：沿走廊找最近的、能转过去的路口并朝它起步，
    // 到了那里缓冲自然会把转向兑现。否则按下去毫无反应，很容易被当成失灵。
    if (!go && wish && !atC && wish !== this.dir && wish !== OPPOSITE[this.dir]) {
      const p0 = this.points[0];
      if (p0) {
        const d = DIRS[this.dir];
        const back = (this.x - p0.x) * d.x + (this.y - p0.y) * d.y;
        let best = null, bestDist = Infinity;
        for (let k = -TUNING.SEEK_CELLS; k <= TUNING.SEEK_CELLS; k++) {
          const cx2 = p0.x + d.x * k, cy2 = p0.y + d.y * k;
          if (!this.game.isOpen(cx2, cy2, null, true) || !this.canFace(cx2, cy2, wish)) continue;
          const dist = Math.abs(k - back);
          if (dist < bestDist) { bestDist = dist; best = k; }
        }
        if (best !== null) {
          if (best < back) this.dir = OPPOSITE[this.dir];
          go = true;
        }
      }
    }

    if (!go) { this.moving = false; this.wasMoving = false; return; }

    let rem = this.speed * dt;
    let moved = 0;
    let guard = 0;
    this.moving = false;

    while (rem > 1e-9 && guard++ < 128) {
      if (this.atCenter()) {
        const ix = Math.round(this.x), iy = Math.round(this.y);
        this.x = ix; this.y = iy;      // 吸附掉累积的浮点误差，保证"在格心"是精确的
        const enter = this.dir;
        // 到达格心：结算缓冲转向
        if (this.buffer && this.buffer !== this.dir && this.canGo(ix, iy, this.buffer)) {
          this.dir = this.buffer;
        }
        if (!this.canGo(ix, iy, this.dir)) {
          // 死路 / 闸门 / 方块：停在格心。第一次撞上时给一记极轻的回弹 ——
          // 完全没反应的话，玩家会以为是输入没被接收。
          const d0 = DIRS[this.dir];
          if (!this.blocked && !this.game.blockAt(ix + d0.x, iy + d0.y)) {
            this.bump = 1;
            this.vox -= d0.x * TUNING.BUMP;
            this.voy -= d0.y * TUNING.BUMP;
          }
          this.blocked = true;
          break;
        }
        this.blocked = false;
        this._push(ix, iy, enter);
      }

      const d = DIRS[this.dir];
      const cur = d.x !== 0 ? this.x : this.y;
      const target = d.x !== 0
        ? (d.x > 0 ? Math.floor(this.x + 1e-9) + 1 : Math.ceil(this.x - 1e-9) - 1)
        : (d.y > 0 ? Math.floor(this.y + 1e-9) + 1 : Math.ceil(this.y - 1e-9) - 1);
      const toCenter = Math.abs(target - cur);

      if (rem >= toCenter) {
        if (d.x !== 0) this.x = target; else this.y = target;
        rem -= toCenter; moved += toCenter;
      } else {
        this.x += d.x * rem; this.y += d.y * rem;
        moved += rem; rem = 0;
      }
      this.moving = true;
    }

    this.distance += moved;
    this.wasMoving = this.moving;

    // ── 回溯清理：头部越过某个历史点（相对其"进入方向"的反向）则丢弃
    while (this.points.length > 1) {
      const p = this.points[0];
      if ((this.x - p.x) * p.dx + (this.y - p.y) * p.dy < -1e-6) this.points.shift();
      else break;
    }
  }

  /** 用于渲染的折线：从头部起，沿历史裁剪出 TRAIL_LEN 弧长 */
  trail(maxLen = TUNING.TRAIL_LEN) {
    const pts = [{ x: this.x, y: this.y }];
    let len = 0;
    for (const p of this.points) {
      const last = pts[pts.length - 1];
      const dx = p.x - last.x, dy = p.y - last.y;
      const d = Math.hypot(dx, dy);
      if (d < 1e-9) continue;
      if (len + d >= maxLen) {
        const t = (maxLen - len) / d;
        pts.push({ x: last.x + dx * t, y: last.y + dy * t });
        return pts;
      }
      pts.push({ x: p.x, y: p.y });
      len += d;
    }
    return pts;
  }
}
