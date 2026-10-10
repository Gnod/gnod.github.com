import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const root = resolve('wandan-forum');
const errors = [];
const pages = ['index.html', 'support/index.html', 'privacy/index.html'];
const allowed = new Set(['.html', '.css', '.png', '.js', '.md']);
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]);
const files = walk(root);
for (const file of files) {
  if (!allowed.has(extname(file))) errors.push(`Unexpected public file: ${file}`);
  if (extname(file) === '.js' && file !== join(root, 'locale.js')) errors.push(`Unexpected script: ${file}`);
  if (extname(file) === '.png') {
    const image = readFileSync(file);
    if (image.subarray(1, 4).toString() !== 'PNG') errors.push(`Invalid PNG: ${file}`);
  }
}
for (const name of ['play', 'game', 'dist', 'build', 'js', 'src', 'rooms', 'scripts']) {
  if (existsSync(join(root, name))) errors.push(`Forbidden game directory: ${name}`);
}
for (const page of pages) {
  const html = readFileSync(join(root, page), 'utf8');
  const stripped = html.replace('<script src="/wandan-forum/locale.js" defer></script>', '');
  if (/<script\b|<iframe\b|<canvas\b|\.wasm\b|\.pck\b|serviceWorker|manifest\.json|manifest\.webmanifest|\bsw\.js/i.test(stripped)) errors.push(`Game content in ${page}`);
  for (const lang of ['zh', 'en', 'ja']) {
    if (!html.includes(`data-site-lang="${lang}"`)) errors.push(`Missing ${lang} content: ${page}`);
    if (!html.includes(`data-locale="${lang}"`)) errors.push(`Missing ${lang} selector: ${page}`);
  }
  for (const marker of ['rel="canonical"', 'name="description"', 'property="og:title"', 'property="og:image"', 'name="viewport"']) {
    if (!html.includes(marker)) errors.push(`Missing ${marker}: ${page}`);
  }
  for (const match of html.matchAll(/(?:href|src)="(\/wandan-forum\/[^"#?]*)"/g)) {
    let path = join(root, match[1].slice('/wandan-forum/'.length));
    if (!extname(path)) path = join(path, 'index.html');
    if (!existsSync(path) || !statSync(path).isFile()) errors.push(`Broken link in ${page}: ${match[1]}`);
  }
}
const script = readFileSync(join(root, 'locale.js'), 'utf8');
if (/canvas|getContext|WebGL|AudioContext|requestAnimationFrame|serviceWorker|fetch\s*\(|XMLHttpRequest|\.wasm\b|\.pck\b|localStorage|sessionStorage|document\.cookie|eval\s*\(|innerHTML/i.test(script)) errors.push('Language script must not contain game, network, tracking, or storage code');
const css = readFileSync(join(root, 'style.css'), 'utf8');
if (/@import|url\(/i.test(css)) errors.push('CSS must not load remote assets');
for (const lang of ['zh', 'en', 'ja']) for (const n of ['01', '02', '03']) {
  const path = join(root, 'assets', `${lang}-${n}.png`);
  if (!existsSync(path)) errors.push(`Missing screenshot: ${path}`);
  else {
    const png = readFileSync(path);
    if (png.readUInt32BE(16) !== 2868 || png.readUInt32BE(20) !== 1320) errors.push(`Wrong screenshot size: ${path}`);
  }
}
const privacy = readFileSync(join(root, 'privacy/index.html'), 'utf8');
for (const marker of ['不提供网页版游戏', 'does not host a browser-playable game', 'ブラウザーで遊べるゲーム', 'gnodstudio@gmail.com', '2026']) {
  if (!privacy.includes(marker)) errors.push(`Privacy missing: ${marker}`);
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Wandan product site verified: ${files.length} static files, three languages, nine screenshots, no playable game.`);
