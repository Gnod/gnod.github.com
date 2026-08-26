// 存档：localStorage。
//
// v1 是按「世界坐标 + entities 数组下标」存的，所以任何内容改动都会让下标和
// 坐标整体平移 —— 房间是左右串联的，改一间，后面全平移。当时的办法是存一个
// 内容指纹，一对不上就作废旧档。这在开发期是对的（总比读出诡异状态好），
// 但发出去之后，第一个修 bug 的版本就会清掉所有玩家的进度。
//
// v2 改成按「房间名 + 房间内相对坐标」存。改了第 50 间房，前 49 间的进度照旧
// 有效；删掉或改名的房间在读档时直接跳过，不影响其余。逐房间统计本来就是
// 按房间名存的，这次只是让检查点和光点也这样。
const KEY = 'lumen.save.v2';
const SETTINGS_KEY = 'lumen.settings.v1';

export const DEFAULT_SETTINGS = {
  music: 0.6,
  sfx: 0.75,
  colorblind: false,
  reducedMotion: false,
  lang: 'auto',          // auto 跟随系统；zh / en 手动指定
  haptics: true,         // 只在支持振动的设备上生效（菜单里也只在那时出现）
  track: 1,              // 0 = 程序化；>0 对应 assets/music/manifest.json 里的曲目。
                         // 默认给曲目 —— 程序化那个从不变调的和弦正是被换掉的对象。
                         // manifest 缺失时 applyTrack 会回落到 0，不会越界。
};

function safeParse(raw, fallback) {
  if (!raw) return fallback;
  try { return { ...fallback, ...JSON.parse(raw) }; } catch { return fallback; }
}

export function loadSettings() {
  try { return safeParse(localStorage.getItem(SETTINGS_KEY), DEFAULT_SETTINGS); }
  catch { return { ...DEFAULT_SETTINGS }; }
}

export function saveSettings(s) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* 隐私模式 */ }
}

/** 世界坐标 -> [房间名, 房间内相对坐标]。不在任何房间里（连接走廊）返回 null */
function toLocal(game, x, y) {
  for (const r of game.world.rooms) {
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return [r.name, x - r.x, y - r.y];
  }
  return null;
}

/** [房间名, 相对坐标] -> 世界坐标。房间已不存在则返回 null */
function toWorld(game, ref) {
  if (!ref) return null;
  const r = game.world.rooms.find(v => v.name === ref[0]);
  return r ? { x: r.x + ref[1], y: r.y + ref[2] } : null;
}

export function loadProgress(game) {
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch { return null; }
  if (!raw) return null;
  let d;
  try { d = JSON.parse(raw); } catch { return null; }
  return d;
}

export function saveProgress(game) {
  const cp = game.checkpoint;
  const d = {
    v: 2,
    cp: cp ? toLocal(game, cp.x, cp.y) : null,
    orbs: game.entities.filter(e => e.kind === 'orb' && e.taken)
      .map(e => toLocal(game, e.x, e.y)).filter(Boolean),
    deaths: game.deaths,
    time: Math.round(game.time),
    // completed 是永久记录；won 只是当前是否正停在通关演出。
    // 旧版本写过 won，所以继续保留它作兼容别名，升级后不会丢完成状态。
    completed: !!(game.completed || game.won),
    won: !!(game.completed || game.won),
    completion: game.completion || null,
    // 逐房间统计。只存有内容的房间，避免存档随房间数线性膨胀
    rs: [...game.roomStats].filter(([, v]) => v.deaths || v.time > 1)
      .map(([n, v]) => [n, v.deaths, Math.round(v.time)]),
  };
  try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* 隐私模式 */ }
}

export function clearProgress() {
  try { localStorage.removeItem(KEY); } catch { /* 隐私模式 */ }
}

/** 把存档套用到一局新开的游戏上 */
export function applyProgress(game, d) {
  if (!d) return false;
  // 解析不出来的（房间被删了、改名了、光点被挪走了）直接跳过，不影响其余
  let got = 0;
  for (const ref of d.orbs || []) {
    const w = toWorld(game, ref);
    if (!w) continue;
    const e = game.entities.find(v => v.kind === 'orb' && v.x === w.x && v.y === w.y);
    if (e) { e.taken = true; got++; }
  }
  game.orbCount = got;                 // 按真正恢复上的算，不按存档里的条数
  game.deaths = d.deaths || 0;
  game.completed = !!(d.completed ?? d.won);
  if (d.completion && Number.isFinite(d.completion.time)) {
    game.completion = {
      time: Math.max(0, d.completion.time | 0),
      deaths: Math.max(0, d.completion.deaths | 0),
      orbs: Math.max(0, d.completion.orbs | 0),
    };
  } else if (game.completed) {
    // 老存档只有 won；用当时的总统计补出一份可展示的完成记录。
    game.completion = { time: Math.max(0, d.time | 0), deaths: game.deaths, orbs: got };
  }
  for (const [n, deaths, time] of d.rs || []) game.roomStats.set(n, { deaths, time });
  game.time = d.time || 0;
  const cpw = toWorld(game, d.cp);
  if (cpw) {
    const cp = game.entities.find(e => e.kind === 'checkpoint' && e.x === cpw.x && e.y === cpw.y);
    if (cp) {
      game.introT = -1;              // 续关就不再放标题了
      game.setCheckpoint(cp);
      game.player.reset(cp.x, cp.y);
      game.camera.snap();
      return true;
    }
  }
  return false;
}
