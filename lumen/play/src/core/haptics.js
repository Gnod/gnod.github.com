// 触觉反馈。手机上"死亡"那一下比任何视觉动效都管用 —— 屏幕上的碎裂你在看，
// 震动是你在感觉，后者才是"我搞砸了"的即时确认。
//
// 零依赖，用 Vibration API。Android WebView 支持；iOS 的 WKWebView 不支持，
// 真要在 iOS 上有触觉得走 Tauri 的 haptics 插件（上架前再补）。
//
// 强度全部压得很轻。这游戏是安静的，一记手机厂商默认的长震会把气氛整个撞碎 ——
// 触觉在这里的角色是标点，不是鼓点。
const PATTERNS = {
  death: 26,                      // 唯一一个"能明确感觉到"的
  timeout: 18,                    // 计时机关到期，是个警告
  checkpoint: 14,
  portal: 12,
  hunt: 16,                       // 追兵盯上你 —— 世界六唯一需要立刻知道的状态
  click: 10,                      // 按钮通断
  gate: 8,                        // 闸门开合常发生在画面外，触觉替眼睛确认一下
  gateShut: 8,
  push: 9,
  orb: 6,                         // 连着吃时不能变成连续嗡鸣
  boost: 5,
  vault: [12, 60, 12],
  win: [16, 70, 16, 70, 34],
  // start / settle / tick / calm 刻意没有触觉：
  // 它们每几秒就发生一次，做成震动会变成持续嗡鸣，正好毁掉"触觉是标点"这条原则
};

// 光判 navigator.vibrate 不够 —— 桌面 Chrome 上它是个存在但什么都不做的函数，
// 于是设置里会多出一行按了没反应的「震动」。得同时是触屏设备。
export const canVibrate = typeof navigator !== 'undefined'
  && typeof navigator.vibrate === 'function'
  && navigator.maxTouchPoints > 0;

let enabled = true;

export function setHaptics(on) { enabled = !!on; }

export function haptic(name) {
  if (!enabled || !canVibrate) return;
  const p = PATTERNS[name];
  if (p === undefined) return;
  try { navigator.vibrate(p); } catch { /* 某些浏览器在无手势时会抛 */ }
}
