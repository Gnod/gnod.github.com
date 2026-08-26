// 轨道栅格 + ASCII 房间解析 + 房间串联成连续世界
//
// ASCII 图例（任何非 ' ' / '.' 的字符都算轨道）
//   ' ' '.'          空白
//   '#' '-' '|' '+'  普通轨道
//   '['  ']'         房间入口 / 出口连接点（引擎据此把房间串成一条线）
//   'S'  '@'  '*'    出生点 / 终点 / 检查点
//   'o'              光点（收集物）
//   'x'              静止敌人
//   'X'              追击敌人（沿轨道最短路追玩家，有拴绳范围）
//   '1'..'9'         巡逻敌人路径端点，同一数字出现两次为一对
//   'A'..'F'         按钮      · 模式见 opts.buttons
//   'a'..'f'         闸门      · 与同字母按钮联动，opts.gates 可设为反相
//                    注意：链路的作用域是"房间"。不同房间可以放心重用 A/a
//   'O'              推块
//   '>' '<' '^' 'v'  单向轨道（只能朝该方向通过）
//   '='              光点闸门（收集够 opts.orbGate / orbGates 颗才开；只守可绕开的支路）
//   '&'              回响碑（把已收集的光点重新亮一遍）
//   '~'              加速带
//   ':'              滑行段（松手不会停，一直走到离开滑行段后的第一个格心）
//   'P' / 'p'        传送门（成对，每个房间最多一对）
//
// opts:
//   speeds  { '1': 3.4 }              巡逻速度
//   phases  { '2': 0.5 }              巡逻相位（0~1）
//   buttons { A: 'toggle' | 'hold' | { mode:'timer', time:3 } | { links:'ab' } }
//           links 让一个按钮同时驱动多条链路 —— 配合反相闸门就是"二选一开关"
//   gates   { a: 'invert' }           反相闸门：按钮松开时才开
//   chase   { speed: 4.4, leash: 14 } 追击敌人参数
//   orbGate 18                        光点闸门需要的光点数
//   orbGateAt [-1.7, 1.0]             刻度阵列相对闸门的位置（不写就按几何猜）
//   orbGates [18, 36, 54, 64]         多道光点闸门按 ASCII 中的出现顺序分配门槛
//   orbGateAts [[2,0], ...]           多道闸门各自的刻度阵列偏移

import { key } from '../core/util.js';

const EMPTY = new Set([' ', '.']);
const TRACK_CHARS = new Set(['#', '-', '|', '+']);
const ONEWAY = { '>': 'right', '<': 'left', '^': 'up', 'v': 'down' };

export function parseRoom(ascii) {
  const lines = ascii.replace(/\r/g, '').split('\n');
  // 去掉首尾全空行
  while (lines.length && lines[0].trim() === '') lines.shift();
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();

  const h = lines.length;
  const w = lines.reduce((m, l) => Math.max(m, l.length), 0);

  const cells = [];
  const cellSet = new Set();
  const marks = [];            // { ch, x, y }
  let entry = null, exit = null;

  for (let y = 0; y < h; y++) {
    const line = lines[y];
    for (let x = 0; x < line.length; x++) {
      const ch = line[x];
      if (EMPTY.has(ch)) continue;
      cells.push([x, y]);
      cellSet.add(key(x, y));
      if (ch === '[') entry = { x, y };
      else if (ch === ']') exit = { x, y };
      else if (!TRACK_CHARS.has(ch)) marks.push({ ch, x, y });
    }
  }

  return { w, h, cells, cellSet, marks, entry, exit, lines };
}

/** 在房间内做 BFS，返回 a→b 的最短轨道路径（含端点） */
function bfsPath(cellSet, a, b) {
  const start = key(a.x, a.y), goal = key(b.x, b.y);
  if (start === goal) return [{ ...a }];
  const prev = new Map([[start, null]]);
  const q = [a];
  const D = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (q.length) {
    const cur = q.shift();
    for (const [dx, dy] of D) {
      const nx = cur.x + dx, ny = cur.y + dy, k = key(nx, ny);
      if (!cellSet.has(k) || prev.has(k)) continue;
      prev.set(k, cur);
      if (k === goal) {
        const path = [];
        let node = { x: nx, y: ny };
        while (node) { path.push(node); node = prev.get(key(node.x, node.y)); }
        return path.reverse();
      }
      q.push({ x: nx, y: ny });
    }
  }
  return [a, b]; // 不连通则退化为直连（编辑期应视为关卡错误）
}

/**
 * 把若干房间串成一条连续的线。
 * room: { ascii, name?, gap?, dy?, opts? }
 * 返回 World 数据：cells / rooms / specs / spawn / bounds
 */
export function buildWorld(rooms) {
  const cells = new Set();
  const slide = new Set();
  const out = { cells, slide, rooms: [], specs: [], spawn: null };
  let prevExit = null;

  rooms.forEach((room, idx) => {
    const p = parseRoom(room.ascii);
    const gap = room.gap ?? 5;
    const dy = room.dy ?? 0;

    let ox = 0, oy = 0;
    if (prevExit) {
      if (!p.entry) throw new Error(`房间 #${idx} (${room.name || ''}) 缺少入口 '['`);
      ox = prevExit.x + gap + 1 - p.entry.x;
      oy = prevExit.y + dy - p.entry.y;
    }

    // 房间格子
    for (const [x, y] of p.cells) cells.add(key(x + ox, y + oy));

    // 走廊：上一房间出口 → 本房间入口（水平-垂直-水平）
    if (prevExit) {
      const ex = prevExit.x, ey = prevExit.y;
      const nx = p.entry.x + ox, ny = p.entry.y + oy;
      const midX = ex + Math.max(1, Math.ceil(gap / 2));
      for (let x = ex; x <= midX; x++) cells.add(key(x, ey));
      const y0 = Math.min(ey, ny), y1 = Math.max(ey, ny);
      for (let y = y0; y <= y1; y++) cells.add(key(midX, y));
      for (let x = midX; x <= nx; x++) cells.add(key(x, ny));
    }

    // 链路按房间隔离。全局共享会让前面房间按下的开关把后面所有同名闸门都打开 ——
    // 这个 bug 曾经一次性架空了 28 个房间的机关。
    const scope = (l) => `${l}@${idx}`;

    // 实体
    const digits = new Map();
    const orbNeeds = Array.isArray(room.opts?.orbGates) ? room.opts.orbGates : null;
    const orbAts = Array.isArray(room.opts?.orbGateAts) ? room.opts.orbGateAts : null;
    let orbGateIndex = 0, echoIndex = 0;
    for (const m of p.marks) {
      const x = m.x + ox, y = m.y + oy, ch = m.ch;
      if (ch === 'S') { out.spawn = { x, y }; out.specs.push({ type: 'checkpoint', x, y, silent: true }); }
      else if (ch === '@') out.specs.push({ type: 'goal', x, y });
      else if (ch === '*') out.specs.push({ type: 'checkpoint', x, y });
      else if (ch === 'o') out.specs.push({ type: 'orb', x, y });
      else if (ch === 'x') out.specs.push({ type: 'enemy', x, y });
      else if (ch === 'X') out.specs.push({ type: 'chaser', x, y, ...(room.opts?.chase || {}) });
      else if (ch === 'O') out.specs.push({ type: 'block', x, y, room: { x: ox, y: oy, w: p.w, h: p.h } });
      else if (ch === '~') out.specs.push({ type: 'boost', x, y });
      else if (ch === ':') slide.add(key(x, y));
      else if (ch === '=') {
        const stage = orbGateIndex++;
        out.specs.push({
          type: 'orbgate', x, y,
          need: orbNeeds?.[stage] ?? room.opts?.orbGate ?? 12,
          at: orbAts?.[stage] ?? room.opts?.orbGateAt,
          stage, stages: orbNeeds?.length ?? 1,
        });
      }
      else if (ch === '&') {
        const stage = echoIndex++;
        out.specs.push({
          type: 'echo', x, y,
          need: orbNeeds?.[stage],
          stage, stages: orbNeeds?.length ?? 1,
        });
      }
      else if (ONEWAY[ch]) out.specs.push({ type: 'oneway', x, y, dir: ONEWAY[ch] });
      else if (ch >= '1' && ch <= '9') {
        if (!digits.has(ch)) digits.set(ch, []);
        digits.get(ch).push({ x: m.x, y: m.y });
      }
      else if (ch >= 'A' && ch <= 'F') {
        const cfg = room.opts?.buttons?.[ch] ?? 'hold';
        const { links: linkChars, ...o } = typeof cfg === 'string' ? { mode: cfg } : cfg;
        out.specs.push({
          type: 'button', x, y,
          link: scope(ch.toLowerCase()),
          links: [...(linkChars || ch.toLowerCase())].map(scope),
          mode: 'hold', time: 3, ...o,
        });
      }
      else if (ch >= 'a' && ch <= 'f') {
        out.specs.push({
          type: 'gate', x, y,
          link: scope(ch),
          invert: room.opts?.gates?.[ch] === 'invert',
        });
      }
      else if (ch === 'P' || ch === 'p') {
        out.specs.push({ type: 'portal', x, y, link: scope('p'), side: ch === 'P' ? 0 : 1 });
      }
    }

    // 巡逻敌人：同数字的两点之间走最短路
    for (const [ch, pts] of digits) {
      if (pts.length < 2) continue;
      const path = bfsPath(p.cellSet, pts[0], pts[1]).map(q => ({ x: q.x + ox, y: q.y + oy }));
      out.specs.push({
        type: 'patrol', path,
        speed: room.opts?.speeds?.[ch] ?? 3.4,
        phase: room.opts?.phases?.[ch] ?? 0,
      });
    }

    // 房间入口自动放检查点（保证死亡最多回退一间房）
    if (p.entry) out.specs.push({ type: 'checkpoint', x: p.entry.x + ox, y: p.entry.y + oy, silent: true });

    out.rooms.push({
      name: room.name || `room-${idx}`,
      x: ox, y: oy, w: p.w, h: p.h,
      cx: ox + (p.w - 1) / 2, cy: oy + (p.h - 1) / 2,
      entry: p.entry ? { x: p.entry.x + ox, y: p.entry.y + oy } : null,
      exit: p.exit ? { x: p.exit.x + ox, y: p.exit.y + oy } : null,
      index: idx,
      world: room.world ?? 0,
    });

    if (!p.exit && idx < rooms.length - 1) throw new Error(`房间 #${idx} (${room.name || ''}) 缺少出口 ']'`);
    prevExit = p.exit ? { x: p.exit.x + ox, y: p.exit.y + oy } : null;
  });

  // 世界包围盒
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const k of cells) {
    const [x, y] = k.split(',').map(Number);
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  out.bounds = { minX, minY, maxX, maxY };
  if (!out.spawn) out.spawn = { x: minX, y: minY };
  return out;
}

/** 运行期的轨道查询对象 */
export class Grid {
  constructor(cells) { this.cells = cells; }
  has(x, y) { return this.cells.has(key(x, y)); }
  /** 该格的邻接方向数（1 = 死路，>2 = 岔路口） */
  degree(x, y) {
    let n = 0;
    if (this.has(x + 1, y)) n++;
    if (this.has(x - 1, y)) n++;
    if (this.has(x, y + 1)) n++;
    if (this.has(x, y - 1)) n++;
    return n;
  }
}
