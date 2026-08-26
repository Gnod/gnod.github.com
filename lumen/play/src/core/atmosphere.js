// 六章的屏幕空间气氛层。
//
// 世界仍然只由一条线构成；这里不放可被误认成轨道的实体，也不靠雾把空白糊住。
// 每章只使用一套低亮度、低频率的几何母题，让负空间承担章节身份。
import { clamp } from './util.js';

export const ATMOSPHERE_PROFILES = [
  { id: 'line',    label: '平行微光', maxStrokes: 10 },
  { id: 'circuit', label: '电路回路', maxStrokes: 11 },
  { id: 'vector',  label: '方向流束', maxStrokes: 17 },
  { id: 'slide',   label: '折射波纹', maxStrokes: 11 },
  { id: 'weight',  label: '重力压痕', maxStrokes: 18 },
  { id: 'hunt',    label: '猎场收束', maxStrokes: 17 },
];

const Y_BIAS = [-0.08, 0.06, -0.03, 0.04, 0.12, 0.02];

function rgba(rgb, alpha) {
  return `rgba(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0},${alpha})`;
}

function strokeLine(ctx, x0, y0, x1, y1) {
  ctx.beginPath();
  ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
  ctx.stroke();
}

/** 所有章节共用的一层星图流场：只组织负空间，不制造新的玩法实体。 */
function drawConstellationField(ctx, w, h, rgb, t, px, py) {
  ctx.lineWidth = 0.75;
  for (let i = 0; i < 3; i++) {
    const y = h * (0.20 + i * 0.29) + Math.sin(t * 0.055 + i * 2.1) * 5;
    const bow = (i - 1) * h * 0.05;
    ctx.strokeStyle = rgba(rgb, 0.018 + (i === 1 ? 0.010 : 0));
    ctx.beginPath();
    ctx.moveTo(-w * 0.08, y);
    ctx.bezierCurveTo(w * 0.24, y + bow, w * 0.66, y - bow, w * 1.08, y + bow * 0.35);
    ctx.stroke();
  }

  // 两圈几乎不可见的光学波纹把光核嵌进空间，而不是给它加一个实体圆盘。
  ctx.strokeStyle = rgba(rgb, 0.032);
  ctx.lineWidth = 0.7;
  for (let i = 0; i < 2; i++) {
    const r = 42 + i * 54 + Math.sin(t * 0.18 + i) * 2;
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.stroke();
  }

  ctx.fillStyle = rgba(rgb, 0.085);
  for (let i = 0; i < 6; i++) {
    const x = w * (0.10 + ((i * 0.217 + t * 0.0018) % 0.84));
    const y = h * (0.14 + ((i * 0.337) % 0.70)) + Math.sin(t * 0.11 + i) * 2.5;
    ctx.beginPath(); ctx.arc(x, y, i % 3 === 0 ? 1.0 : 0.65, 0, Math.PI * 2); ctx.fill();
  }
}

function drawLineField(ctx, w, h, rgb, t, fx, fy) {
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const y = fy + (i - 2) * h * 0.105 + Math.sin(t * 0.13 + i * 1.7) * 5;
    const drift = ((t * (3 + i * 0.4) + i * w * 0.23) % (w * 1.35)) - w * 0.2;
    ctx.strokeStyle = rgba(rgb, 0.025 + (i === 2 ? 0.022 : 0));
    strokeLine(ctx, Math.max(0, drift - w * 0.30), y, Math.min(w, drift + w * 0.34), y);
  }
  ctx.fillStyle = rgba(rgb, 0.085);
  for (let i = 0; i < 4; i++) {
    const x = ((w * (0.18 + i * 0.24) + t * (2.2 + i * 0.25)) % (w + 80)) - 40;
    const y = fy + Math.sin(i * 2.4 + t * 0.18) * h * 0.17;
    ctx.beginPath(); ctx.arc(x, y, i === 1 ? 1.7 : 1.1, 0, Math.PI * 2); ctx.fill();
  }
}

function drawCircuitField(ctx, w, h, rgb, t) {
  ctx.lineWidth = 1;
  ctx.strokeStyle = rgba(rgb, 0.055);
  for (let i = 0; i < 6; i++) {
    const side = i % 2 ? 1 : -1;
    const x0 = side > 0 ? w * (0.68 + (i % 3) * 0.09) : w * (0.32 - (i % 3) * 0.09);
    const y0 = h * (0.18 + i * 0.115);
    const bend = w * (0.055 + (i % 3) * 0.018);
    ctx.beginPath();
    ctx.moveTo(x0, side > 0 ? 0 : h);
    ctx.lineTo(x0, y0);
    ctx.lineTo(x0 - side * bend, y0);
    ctx.lineTo(x0 - side * bend, y0 + side * h * 0.07);
    ctx.stroke();
  }
  const pulse = (t * 0.07) % 1;
  ctx.fillStyle = rgba(rgb, 0.12);
  for (let i = 0; i < 6; i++) {
    const x = w * (0.20 + ((pulse + i * 0.173) % 1) * 0.60);
    const y = h * (0.22 + (i % 3) * 0.28);
    ctx.beginPath(); ctx.rect(x - 1.2, y - 1.2, 2.4, 2.4); ctx.fill();
  }
}

function drawVectorField(ctx, w, h, rgb, t) {
  ctx.lineWidth = 1;
  ctx.strokeStyle = rgba(rgb, 0.065);
  const drift = (t * 7) % 96;
  for (let i = -2; i < 10; i++) {
    const x = i * w * 0.13 + drift - 80;
    const band = ((i * 37) % 5 + 5) % 5;
    const y = h * (0.18 + band * 0.16);
    ctx.beginPath();
    ctx.moveTo(x - 28, y + 11); ctx.lineTo(x + 16, y - 11);
    ctx.lineTo(x + 8, y - 16);
    ctx.moveTo(x + 16, y - 11); ctx.lineTo(x + 7, y - 6);
    ctx.stroke();
  }
}

function drawSlideField(ctx, w, h, rgb, t) {
  ctx.lineWidth = 1;
  ctx.strokeStyle = rgba(rgb, 0.055);
  for (let row = 0; row < 6; row++) {
    const baseY = h * (0.16 + row * 0.135);
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) {
      const u = i / 24;
      const x = u * w;
      const y = baseY + Math.sin(u * Math.PI * 3.2 + row * 0.9 + t * 0.26) * (5 + row % 2 * 3);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
}

function drawWeightField(ctx, w, h, rgb, t, fx, fy) {
  ctx.lineWidth = 1;
  ctx.strokeStyle = rgba(rgb, 0.06);
  for (let i = 0; i < 6; i++) {
    const r = 60 + i * 54 + Math.sin(t * 0.18 + i) * 3;
    ctx.beginPath();
    ctx.ellipse(fx, fy + h * 0.24, r * 1.8, r * 0.34, 0, Math.PI * 1.08, Math.PI * 1.92);
    ctx.stroke();
  }
  ctx.strokeStyle = rgba(rgb, 0.035);
  for (let i = 0; i < 7; i++) {
    const x = w * (0.16 + i * 0.115);
    strokeLine(ctx, x, h * 0.08, x, h * (0.18 + (i % 3) * 0.05));
  }
}

function drawHuntField(ctx, w, h, rgb, t, fx, fy, tension) {
  const beat = 1 + Math.sin(t * (1.2 + tension * 1.5)) * (0.015 + tension * 0.025);
  ctx.lineWidth = 1;
  ctx.strokeStyle = rgba(rgb, 0.07 + tension * 0.035);
  for (let i = 0; i < 4; i++) {
    const r = (82 + i * 58) * beat;
    const gap = 0.36 + i * 0.06;
    ctx.beginPath();
    ctx.arc(fx, fy, r, -Math.PI + gap, -gap);
    ctx.stroke();
  }
  ctx.strokeStyle = rgba(rgb, 0.05 + tension * 0.03);
  const spin = t * 0.035;
  for (let i = 0; i < 8; i++) {
    const a = spin + (i / 8) * Math.PI * 2;
    const r0 = Math.min(w, h) * 0.36;
    const r1 = r0 + 8 + (i % 3) * 4;
    strokeLine(ctx, fx + Math.cos(a) * r0, fy + Math.sin(a) * r0,
      fx + Math.cos(a) * r1, fy + Math.sin(a) * r1);
  }
}

/** 绘制于玩法层之前：低频、低对比、无碰撞语义。 */
export function drawAtmosphere(ctx, w, h, game) {
  const wi = clamp(game.worldIndex | 0, 0, ATMOSPHERE_PROFILES.length - 1);
  const rgb = game.tint || [147, 169, 208];
  const room = game.room;
  const rx = room ? clamp((game.player.x - room.cx) / Math.max(1, room.w * 0.5), -1, 1) : 0;
  const ry = room ? clamp((game.player.y - room.cy) / Math.max(1, room.h * 0.5), -1, 1) : 0;
  const fx = w * (0.5 + rx * 0.045);
  const fy = h * (0.5 + Y_BIAS[wi] + ry * 0.035);
  const t = game.reducedMotion ? 0 : game.time;
  const ppc = game.camera?.ppc || 1;
  const px = w * 0.5 + (game.player.x - (game.camera?.x ?? game.player.x)) * ppc;
  const py = h * 0.5 + (game.player.y - (game.camera?.y ?? game.player.y)) * ppc;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // 不对称光域把空白组织成取景，而不是均匀铺一层雾。
  const pool = ctx.createRadialGradient(fx, fy, 0, fx, fy, Math.max(w, h) * 0.72);
  pool.addColorStop(0, rgba(rgb, 0.048));
  pool.addColorStop(0.42, rgba(rgb, 0.018));
  pool.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = pool;
  ctx.fillRect(0, 0, w, h);

  drawConstellationField(ctx, w, h, rgb, t, px, py);

  if (wi === 0) drawLineField(ctx, w, h, rgb, t, fx, fy);
  else if (wi === 1) drawCircuitField(ctx, w, h, rgb, t);
  else if (wi === 2) drawVectorField(ctx, w, h, rgb, t);
  else if (wi === 3) drawSlideField(ctx, w, h, rgb, t);
  else if (wi === 4) drawWeightField(ctx, w, h, rgb, t, fx, fy);
  else drawHuntField(ctx, w, h, rgb, t, fx, fy, game.tension || 0);

  // 跨章时 reveal 会高于普通进房间的 1.0；只在这 0.6 的余量里给一次无字章节和弦。
  const chapter = game.reducedMotion ? 0 : clamp((game.reveal - 1) / 0.6, 0, 1);
  if (chapter > 0) {
    ctx.globalAlpha = chapter * 0.18;
    ctx.strokeStyle = rgba(rgb, 0.7);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(fx, fy, w * (0.18 + (1 - chapter) * 0.42), h * (0.11 + (1 - chapter) * 0.25), 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

export function atmosphereDiagnostics(worldIndex = 0) {
  const profile = ATMOSPHERE_PROFILES[clamp(worldIndex | 0, 0, ATMOSPHERE_PROFILES.length - 1)];
  return {
    profile: profile.id,
    maxStrokes: profile.maxStrokes,
    textures: 0,
    offscreenBuffers: 0,
    compositingPasses: 1,
  };
}
