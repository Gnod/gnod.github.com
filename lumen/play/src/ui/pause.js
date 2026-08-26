// 暂停 / 设置。整个界面画在 canvas 上，保持"世界由线构成"的视觉前提。
// 键盘、手柄、触屏三种输入都能操作。
import { pal, setColorblind } from '../core/theme.js';
import { setHaptics, canVibrate } from '../core/haptics.js';
import { t, setLang, LANGS } from '../core/i18n.js';
import { clamp } from '../core/util.js';
import { saveSettings, clearProgress } from '../core/save.js';
import { WORLD_NAMES } from '../content/rooms.js';

/**
 * 暂停菜单布局。
 * 矮横屏不再把九行内容整体缩到 10px，而是分成两列；桌面和竖屏仍保持单列。
 * 这是纯函数，既供绘制/命中共用，也能在无 Canvas 的测试里守住字号与安全区。
 */
export function computePauseLayout(w, h, itemCount) {
  const compact = w / h >= 1.75 && h <= 520 && itemCount >= 8;
  if (compact) {
    const S = clamp(Math.min(w / 900, h / 420), 0.86, 1);
    const rows = Math.ceil(itemCount / 2);
    const rowH = clamp(42 * S, 36, 44);
    const gap = 36 * S;
    const colW = Math.min(300 * S, (w - gap * 3) / 2);
    const totalW = colW * 2 + gap;
    const firstX = (w - totalW) / 2;
    const listTop = clamp(h / 2 - (rows * rowH) / 2 + 20 * S,
      94 * S, h - rows * rowH - 54 * S);
    const items = [];
    for (let i = 0; i < itemCount; i++) {
      const col = i < rows ? 0 : 1;
      const row = col ? i - rows : i;
      const x0 = firstX + col * (colW + gap);
      const x1 = x0 + colW;
      const yTop = listTop + row * rowH;
      items.push({
        x0, x1, yTop, yBottom: yTop + rowH, y: yTop + rowH / 2,
        sx0: x0 + colW * 0.57, sx1: x1,
      });
    }
    return {
      compact, S, rowH, listTop, items,
      titleY: 42 * S, statsY: 73 * S, hintY: h - 18 * S,
      titleHitBottom: 88 * S,
      titleFont: Math.max(24, Math.round(30 * S)),
      statsFont: Math.max(11, Math.round(13 * S)),
      itemFont: Math.max(13, Math.round(15 * S)),
      hintFont: Math.max(10, Math.round(11 * S)),
    };
  }

  const S = clamp(Math.min(w / 620, h / (itemCount * 46 + 210)), 0.55, 1.15);
  const rowH = 46 * S;
  const listH = itemCount * rowH;
  const listTop = h / 2 - listH / 2 + 56 * S;
  const cx = w / 2;
  const halfW = Math.min(w * 0.42, 175 * S);
  const items = [];
  for (let i = 0; i < itemCount; i++) {
    const yTop = listTop + i * rowH;
    items.push({
      x0: cx - halfW, x1: cx + halfW,
      yTop, yBottom: yTop + rowH, y: yTop + rowH / 2,
      sx0: cx + 30 * S, sx1: cx + halfW,
    });
  }
  return {
    compact, S, rowH, listTop, items,
    titleY: listTop - 74 * S, statsY: listTop - 38 * S, hintY: h - 30 * S,
    titleHitBottom: listTop - 50 * S,
    titleFont: Math.round(30 * S), statsFont: Math.round(13 * S),
    itemFont: Math.round(15 * S), hintFont: Math.round(11 * S),
  };
}

export class Pause {
  constructor(game, sound, settings) {
    this.game = game;
    this.sound = sound;
    this.settings = settings;
    this.open = false;
    this.sel = 0;
    this.anim = 0;
    this.confirmReset = 0;
    this.onReset = null;
    this.onRetry = null;   // 由 main.js 注入：重来本关
    this.layout = null;          // 由 draw 填充，供指针命中测试使用
    this.dragging = -1;
    this.heat = false;      // 热力图那一页
    this.heatSel = 0;       // 热力图上选中的房间（键盘用）
    this.heatLayout = null;
    this.onJump = null;     // 由 main.js 注入：跳到某个房间
    // 任意跳关是调试功能，不该出现在玩家手里。本地开发 / ?debug 时自动打开；
    // 手机上没有地址栏也没有控制台，所以留一个暗门：连点标题 5 下。
    this.dev = false;
    this._titleTaps = 0;
    this.tracks = [{ name: null, url: null }];   // name=null → 绘制时取 t('procedural')
    this.items = [
      { key: 'music', type: 'slider' },
      { key: 'sfx', type: 'slider' },
      { key: 'colorblind', type: 'toggle' },
      { key: 'reducedMotion', type: 'toggle' },
      ...(canVibrate ? [{ key: 'haptics', type: 'toggle' }] : []),
      { key: 'lang', type: 'cycle' },
      { key: 'retry', type: 'action' },
      { key: 'heatmap', type: 'action' },
      { key: 'reset', type: 'action' },
      { key: 'resume', type: 'action' },
    ];
  }

  /** 有 assets/music 里的曲目时，菜单里才多出「曲目」这一行 */
  /** 曲目切换只在调试模式露出来。它是 A/B 试听用的 ——
   *  曲子定下来（「孤」）之后，玩家菜单里多一行"程序化 / 孤"只会让人困惑。
   *  单独成一个方法，是因为 dev 可能在 setTracks 之后才为真
   *  （点标题五下的后门），不能只在装载曲目那一刻判一次。 */
  syncDevItems() {
    const has = this.items.some(i => i.key === 'track');
    if (this.dev && this.tracks.length > 1 && !has) {
      this.items.splice(2, 0, { key: 'track', type: 'cycle' });
    } else if (!this.dev && has) {
      this.items = this.items.filter(i => i.key !== 'track');
      this.sel = Math.min(this.sel, this.items.length - 1);
    }
  }

  setTracks(list) {
    if (!list || !list.length) return;
    this.tracks = [{ name: null, url: null }, ...list];
    this.syncDevItems();
  }

  applyTrack() {
    const i = ((this.settings.track | 0) % this.tracks.length + this.tracks.length) % this.tracks.length;
    const tr = this.tracks[i];
    this.sound.setTrack(tr.url, tr.name);
  }

  toggle() {
    // 热力图开着时，ESC 先退出这一页，而不是直接关掉整个菜单
    if (this.heat) { this.heat = false; return; }
    this.open = !this.open;
    if (this.open) this.sel = 0;
    this.confirmReset = 0;
    this.dragging = -1;
  }

  apply() {
    this.sound.setMusicVol(this.settings.music);
    this.sound.setSfxVol(this.settings.sfx);
    setColorblind(this.settings.colorblind);
    setHaptics(this.settings.haptics);
    setLang(this.settings.lang);
    this.game.reducedMotion = this.settings.reducedMotion;
    saveSettings(this.settings);
  }

  _adjust(i, dir) {
    const item = this.items[i];
    if (item.type === 'slider') {
      this.settings[item.key] = clamp(+(this.settings[item.key] + dir * 0.1).toFixed(2), 0, 1);
      this.apply();
      this.sound.play('orb', 3);
    } else if (item.type === 'toggle') {
      this.settings[item.key] = !this.settings[item.key];
      this.apply();
      this.sound.play('click');
    } else if (item.type === 'cycle') {
      if (item.key === 'lang') {
        const n = LANGS.length;
        const cur = Math.max(0, LANGS.findIndex(l => l.id === this.settings.lang));
        this.settings.lang = LANGS[(cur + dir + n) % n].id;
      } else {
        const n = this.tracks.length;
        this.settings.track = (((this.settings.track | 0) + dir) % n + n) % n;
        this.applyTrack();
      }
      this.apply();
      this.sound.play('click');
    }
  }

  _activate(i) {
    const item = this.items[i];
    if (item.type === 'toggle' || item.type === 'cycle') this._adjust(i, 1);
    else if (item.key === 'resume') this.toggle();
    else if (item.key === 'retry') {
      // 触屏没有键盘，R 键那条路在手机上根本不存在 ——
      // 而"卡住了想重来"恰恰是手机上最常见的诉求
      this.onRetry?.();
      this.toggle();
    }
    else if (item.key === 'heatmap') {
      // 打开时自动选中你当前所在的房间 —— "我这是哪一关"应该在游戏里就能回答
      const cur = this.game.room;
      if (cur) {
        const i = this.game.world.rooms.indexOf(cur);
        if (i >= 0) this.heatSel = i;
      }
      this.heat = true;
      this.sound.play('click');
    }
    else if (item.key === 'reset') {
      if (this.confirmReset > 0) { clearProgress(); this.onReset?.(); this.toggle(); }
      else { this.confirmReset = 3; this.sound.play('timeout'); }
    }
  }

  /** 返回 true 表示本帧的输入被菜单吃掉了 */
  handle(input) {
    if (!this.open) return false;
    if (this.heat) {
      const n = this.game.world.rooms.length;
      if (input.wasPressed('ArrowLeft') || input.wasPressed('KeyA')) {
        this.heatSel = (this.heatSel + n - 1) % n; this.sound.play('click');
      }
      if (input.wasPressed('ArrowRight') || input.wasPressed('KeyD')) {
        this.heatSel = (this.heatSel + 1) % n; this.sound.play('click');
      }
      if (this.dev && (input.wasPressed('Enter') || input.wasPressed('Space'))) this._jump(this.heatSel);
      else if (input.wasPressed('Enter') || input.wasPressed('Space')) this.heat = false;
      return true;
    }
    if (input.wasPressed('ArrowUp') || input.wasPressed('KeyW')) {
      this.sel = (this.sel + this.items.length - 1) % this.items.length;
      this.confirmReset = 0; this.sound.play('click');
    }
    if (input.wasPressed('ArrowDown') || input.wasPressed('KeyS')) {
      this.sel = (this.sel + 1) % this.items.length;
      this.confirmReset = 0; this.sound.play('click');
    }
    if (input.wasPressed('ArrowLeft') || input.wasPressed('KeyA')) this._adjust(this.sel, -1);
    if (input.wasPressed('ArrowRight') || input.wasPressed('KeyD')) this._adjust(this.sel, 1);
    if (input.wasPressed('Enter') || input.wasPressed('Space')) this._activate(this.sel);
    return true;
  }

  // ── 指针 / 触屏
  pointerDown(x, y) {
    if (!this.open) return false;
    if (this.heat) {
      const L = this.heatLayout;
      if (this.dev && L && y > L.base - L.maxH - 20 && y < L.base + 30) {
        const i = Math.floor((x - L.pad) / L.barW);
        if (i >= 0 && i < this.game.world.rooms.length) { this.heatSel = i; this._jump(i); return true; }
      }
      this.heat = false;
      return true;
    }
    if (!this.layout) return false;
    const L = this.layout;
    // 暗门：连点标题 5 下打开调试跳关
    if (!this.dev && y < L.titleHitBottom) {
      if (++this._titleTaps >= 5) { this.dev = true; this.syncDevItems(); this.sound.play('win'); }
      return true;
    }
    const i = L.items.findIndex(b => x >= b.x0 - 14 && x <= b.x1 + 14
      && y >= b.yTop && y < b.yBottom);
    if (i < 0) return true;
    const box = L.items[i];
    this.sel = i;
    // 按 key 判，不能按下标 —— 「曲目」和「震动」是按条件插进来的，下标会浮动
    this.confirmReset = this.items[i].key === 'reset' ? this.confirmReset : 0;
    const item = this.items[i];
    if (item.type === 'cycle') {
      this._adjust(i, x > box.sx0 + (box.sx1 - box.sx0) / 2 ? 1 : -1);
      return true;
    }
    if (item.type === 'slider' && x >= box.sx0 - 14 && x <= box.sx1 + 14) {
      this.dragging = i;
      this.settings[item.key] = clamp((x - box.sx0) / (box.sx1 - box.sx0), 0, 1);
      this.apply();
    } else {
      this._activate(i);
    }
    return true;
  }
  pointerMove(x) {
    if (this.dragging < 0 || !this.layout) return;
    const box = this.layout.items[this.dragging];
    this.settings[this.items[this.dragging].key] = clamp((x - box.sx0) / (box.sx1 - box.sx0), 0, 1);
    this.apply();
  }
  pointerUp() { this.dragging = -1; }

  /** 跳到第 i 间房的入口。热力图上的每一竖都是一个传送点 —— 
   *  诊断和导航是同一个界面：哪根柱子是红的，点它就过去。 */
  _jump(i) {
    const r = this.game.world.rooms[i];
    if (!r || !r.entry) return;
    this.sound.play('respawn');
    this.heat = false;
    this.open = false;
    this.onJump?.(r);
  }

  update(dt) {
    this.anim += ((this.open ? 1 : 0) - this.anim) * Math.min(1, dt * 12);
    if (this.confirmReset > 0) this.confirmReset = Math.max(0, this.confirmReset - dt);
  }

  draw(ctx, w, h) {
    if (this.anim < 0.005) { if (!this.open) this.layout = null; return; }
    const p = pal();
    const k = this.anim;
    const g = this.game;

    if (this.heat) { this.drawHeatmap(ctx, w, h, p, k, g); return; }

    const L = computePauseLayout(w, h, this.items.length);
    const { S, rowH } = L;
    const cx = w / 2;
    this.layout = L;

    ctx.save();
    ctx.globalAlpha = k * 0.96;
    ctx.fillStyle = '#04050a';
    ctx.fillRect(0, 0, w, h);

    ctx.textBaseline = 'middle';

    // 标题
    ctx.globalAlpha = k;
    ctx.textAlign = 'center';
    ctx.fillStyle = p.player;
    ctx.font = `300 ${L.titleFont}px ui-sans-serif, system-ui, sans-serif`;
    ctx.letterSpacing = `${0.42 * S}em`;
    ctx.fillText('LUMEN', cx + 7 * S, L.titleY);
    ctx.letterSpacing = '0px';

    // 统计。原来是 #5d6784（3.63:1，不达标）—— 暗到手机上白天读不出来
    ctx.fillStyle = '#8892ab';
    ctx.font = `400 ${L.statsFont}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    const mins = Math.floor(g.time / 60), secs = Math.floor(g.time % 60);
    ctx.fillText(
      `${g.completed ? '◆     ' : ''}◇ ${g.orbCount}/${g.orbTotal}     ✕ ${g.deaths}     ${mins}:${String(secs).padStart(2, '0')}`,
      cx, L.statsY,
    );

    // 选项
    this.items.forEach((item, i) => {
      const box = L.items[i];
      const y = box.y;
      const on = i === this.sel;

      if (on) {
        ctx.globalAlpha = k * 0.5;
        ctx.strokeStyle = p.glow;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(box.x0, y + rowH * 0.38);
        ctx.lineTo(box.x1, y + rowH * 0.38);
        ctx.stroke();
      }

      // 未选中行原来是 #8892ab @ 0.42 —— 实际落到 #3b404e，对比度 1.97:1，
      // 远低于 WCAG 的 4.5:1。"暗 = 没选中"这个意图没错，但暗过了头就不是
      // 层级而是看不见了。提到 0.82（4.6:1），选中行仍有 20:1，层级照旧成立。
      ctx.globalAlpha = k * (on ? 1 : 0.82);
      ctx.fillStyle = on ? p.player : '#8892ab';
      ctx.font = `400 ${L.itemFont}px ui-sans-serif, system-ui, sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(
        item.key === 'reset' && this.confirmReset > 0 ? t('confirmReset') : t(item.key),
        box.x0, y,
      );

      if (item.type === 'slider') {
        const v = this.settings[item.key];
        ctx.lineCap = 'round';
        ctx.lineWidth = 3 * S;
        ctx.strokeStyle = '#2b3348';
        ctx.beginPath(); ctx.moveTo(box.sx0, y); ctx.lineTo(box.sx1, y); ctx.stroke();
        ctx.strokeStyle = on ? p.glow : '#59637e';
        ctx.beginPath(); ctx.moveTo(box.sx0, y); ctx.lineTo(box.sx0 + (box.sx1 - box.sx0) * v, y); ctx.stroke();
        ctx.fillStyle = on ? p.player : '#8892ab';
        ctx.beginPath(); ctx.arc(box.sx0 + (box.sx1 - box.sx0) * v, y, 4.5 * S, 0, Math.PI * 2); ctx.fill();
      } else if (item.type === 'toggle') {
        ctx.textAlign = 'right';
        ctx.fillStyle = this.settings[item.key] ? p.circuit : '#8892ab';   // 关：原 #4a5268 太暗
        ctx.fillText(t(this.settings[item.key] ? 'on' : 'off'), box.x1, y);
      } else if (item.type === 'cycle') {
        let label;
        if (item.key === 'lang') {
          label = (LANGS.find(l => l.id === this.settings.lang) || LANGS[0]).name;
        } else {
          const n = this.tracks.length;
          const tr = this.tracks[(((this.settings.track | 0) % n) + n) % n];
          label = tr.name ?? t('procedural');
        }
        ctx.textAlign = 'right';
        ctx.fillStyle = on ? p.player : '#8892ab';
        ctx.fillText(`‹ ${label} ›`, box.x1, y);
      }
    });

    // 底部提示。原来 #5d6784 @ 0.32 = 1.32:1 —— 那行字实际上是不存在的
    ctx.globalAlpha = k * 0.85;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#8892ab';
    ctx.font = `400 ${L.hintFont}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.fillText(t('hint'), cx, L.hintY);

    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

// ── 热力图
//
// 机器人能证明"这间房可解"，证明不了"这间房无不无聊"。后者只有真人玩完才知道，
// 而真人是在手机上玩的 —— console.log 拿不到数据，所以这张表得画在游戏里。
//
// 横轴就是世界本身：这游戏的进度即空间，一条线从头到尾，每间房占一竖。
Pause.prototype.drawHeatmap = function (ctx, w, h, p, k, g) {
  const rooms = g.world.rooms;
  const S = clamp(Math.min(w / 620, h / 400), 0.55, 1.15);

  ctx.save();
  // 菜单页留 4% 透出后面的世界是好的 —— "你还在那儿"。
  // 但这是数据页：3% 的残影正好落在图表中间，方块和插槽的幽灵会跟柱子混在一起。
  ctx.globalAlpha = k;
  ctx.fillStyle = '#04050a';
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = k;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  const pad = Math.max(24, w * 0.06);
  const barW = (w - pad * 2) / rooms.length;
  const base = h * 0.66;
  const maxH = h * 0.34;
  this.heatLayout = { pad, barW, base, maxH };
  if (this.heatSel >= rooms.length) this.heatSel = 0;

  let maxDeaths = 0, totalTime = 0, visited = 0;
  const rows = rooms.map((r) => {
    const st = g.roomStats.get(r.name) || { deaths: 0, time: 0 };
    if (st.deaths > maxDeaths) maxDeaths = st.deaths;
    totalTime += st.time;
    if (st.time > 0.5) visited++;
    return { r, st };
  });

  ctx.fillStyle = '#8892ab';
  ctx.font = `400 ${Math.round(12 * S)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  if (!maxDeaths && !visited) {
    ctx.fillText(t('hmEmpty'), w / 2, h / 2);
    ctx.restore();
    return;
  }

  const mins = Math.floor(totalTime / 60);
  ctx.fillText(
    `${g.completed ? '◆   ' : ''}${visited}/${rooms.length}   \u2715 ${g.deaths}   ${mins}:${String(Math.floor(totalTime % 60)).padStart(2, '0')}`,
    w / 2, h * 0.16,
  );

  // 每一竖是一间房。高度按死亡次数归一化，颜色从冷到暖
  for (let i = 0; i < rows.length; i++) {
    const { r, st } = rows[i];
    const x = pad + i * barW;
    const seen = st.time > 0.5;
    if (!seen) {
      ctx.fillStyle = '#1b2132';
      ctx.fillRect(x, base - 2 * S, Math.max(1, barW - 1), 2 * S);
      continue;
    }
    const f = maxDeaths ? st.deaths / maxDeaths : 0;
    const bh = Math.max(2 * S, f * maxH);
    // 冷 → 暖：死得越多越红
    const cr = Math.round(90 + f * 165), cg = Math.round(200 - f * 155), cb = Math.round(230 - f * 150);
    ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
    ctx.fillRect(x, base - bh, Math.max(1, barW - 1), bh);
  }

  // 选中的那一竖：高亮 + 房名。非调试模式下它只是"你在这里"，不是传送点
  {
    const x = pad + this.heatSel * barW;
    ctx.globalAlpha = k * 0.85;
    ctx.strokeStyle = p.glow;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x + barW / 2, base - maxH - 8 * S);
    ctx.lineTo(x + barW / 2, base + 6 * S);
    ctx.stroke();
    ctx.fillStyle = p.player;
    ctx.font = `400 ${Math.round(11 * S)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.textAlign = 'center';
    const sel = rooms[this.heatSel];
    const st = g.roomStats.get(sel.name) || { deaths: 0 };
    ctx.fillText(`${sel.name}  \u2715 ${st.deaths}`, w / 2, base - maxH - 20 * S);
  }
  ctx.globalAlpha = k;

  // 世界分隔与章名
  ctx.font = `400 ${Math.round(10 * S)}px ui-sans-serif, system-ui, sans-serif`;
  let prevWorld = -1;
  for (let i = 0; i < rows.length; i++) {
    const wi = rows[i].r.world;
    if (wi === prevWorld) continue;
    prevWorld = wi;
    const x = pad + i * barW;
    ctx.globalAlpha = k * 0.3;
    ctx.strokeStyle = '#3a4460';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, base - maxH); ctx.lineTo(x, base + 12 * S); ctx.stroke();
    ctx.globalAlpha = k * 0.55;
    ctx.fillStyle = '#6d7896';
    ctx.textAlign = 'left';
    ctx.fillText(WORLD_NAMES[wi] || '', x + 3 * S, base + 18 * S);
  }

  // 死得最多的三间 —— 这才是要拿去改的清单
  const worst = rows.filter(v => v.st.deaths > 0).sort((a, b) => b.st.deaths - a.st.deaths).slice(0, 3);
  ctx.globalAlpha = k * 0.7;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#8892ab';
  ctx.font = `400 ${Math.round(11 * S)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  worst.forEach((v, i) => {
    ctx.fillText(`${v.r.name}  \u2715 ${v.st.deaths}`, w / 2, base + 42 * S + i * 15 * S);
  });

  ctx.globalAlpha = k * 0.32;
  ctx.font = `400 ${Math.round(10 * S)}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillStyle = '#8892ab';
  ctx.fillText(t('hmHint'), w / 2, h - 22 * S);
  ctx.restore();
  ctx.globalAlpha = 1;
};
