// 全部房间按世界顺序串成一条连续的线。
// 引擎会自动依据 '[' / ']' 对齐并生成连接走廊 —— 见 grid.js buildWorld。
import { WORLD1 } from './world1.js';
import { WORLD2 } from './world2.js';
import { WORLD3 } from './world3.js';
import { WORLD4 } from './world4.js';
import { WORLD5 } from './world5.js';
import { WORLD6 } from './world6.js';
import { WORLD7 } from './world7.js';

export const WORLDS = [WORLD1, WORLD2, WORLD3, WORLD4, WORLD5, WORLD6, WORLD7];
export const WORLD_NAMES = ['线', '门', '压', '向', '滑', '重', '猎'];
export const ROOMS = WORLDS.flatMap((w, i) => w.map(r => ({ ...r, world: i })));
