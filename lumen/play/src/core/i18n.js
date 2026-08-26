// 全游戏的文字就这些。教学是零文字的 —— 每个新机制都在死不了的房间里
// 自己演一遍，所以本地化的成本接近于零，而可触达的人群翻倍。
//
// 键名直接用设置项的 key，菜单绘制时现取 —— 存成 label 的话切语言不会立即生效。

const ZH = {
  music: '音乐',
  sfx: '音效',
  colorblind: '色觉辅助',
  reducedMotion: '减弱动效',
  haptics: '震动',
  track: '曲目',
  lang: '语言',
  retry: '重来本关',
  heatmap: '热力图',
  reset: '重置进度',
  resume: '继续',
  on: '开',
  off: '关',
  confirmReset: '再按一次确认',
  procedural: '程序化',
  hint: '↑↓ 选择   ←→ 调整   ENTER 确认   ESC 返回   R 重来',
  hmHint: '每一竖是一间房 · 高度 = 死亡次数 · 暗 = 还没走到',
  hmDev: '调试模式 · 点一下跳过去 · ←→ 选 ENTER 跳',
  hmEmpty: '还没有数据 —— 先玩一会儿',
};

const EN = {
  music: 'Music',
  sfx: 'Sound',
  colorblind: 'Colorblind',
  reducedMotion: 'Reduced Motion',
  haptics: 'Haptics',
  track: 'Track',
  lang: 'Language',
  retry: 'Retry Room',
  heatmap: 'Heatmap',
  reset: 'Reset Progress',
  resume: 'Resume',
  on: 'On',
  off: 'Off',
  confirmReset: 'Press again',
  procedural: 'Procedural',
  hint: '↑↓ Select   ←→ Adjust   ENTER Confirm   ESC Back   R Retry',
  hmHint: 'one bar per room · height = deaths · dim = not reached yet',
  hmDev: 'dev mode · tap to warp · ←→ select ENTER go',
  hmEmpty: 'no data yet — go play a while',
};

const TABLE = { zh: ZH, en: EN };

/** 每种语言用它自己的名字显示 —— 看不懂当前语言的人才需要这一行 */
export const LANGS = [
  { id: 'auto', name: 'Auto' },
  { id: 'zh', name: '中文' },
  { id: 'en', name: 'English' },
];

function detect() {
  const l = (typeof navigator !== 'undefined' && (navigator.language || '')).toLowerCase();
  return l.startsWith('zh') ? 'zh' : 'en';
}

let current = 'zh';

export function setLang(id) {
  current = id === 'auto' || !TABLE[id] ? detect() : id;
}

export function t(key) {
  return TABLE[current][key] ?? key;
}
