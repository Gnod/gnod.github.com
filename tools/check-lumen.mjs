// Static deployment checks: local links, metadata, production-only resources and JS imports.
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const product = resolve(root, 'lumen');
const walk = async dir => (await Promise.all((await readdir(dir, { withFileTypes: true }))
  .map(e => e.isDirectory() ? walk(resolve(dir, e.name)) : resolve(dir, e.name)))).flat();
const files = await walk(product);
let checked = 0;
for (const file of files) {
  if (!/\.(html|js|json|css)$/.test(file)) continue;
  const source = await readFile(file, 'utf8');
  if (file.endsWith('.json')) JSON.parse(source);
  if (file.endsWith('.html')) {
    assert.match(source, /<title>[^<]+<\/title>/, file);
    assert.match(source, /name="description" content="[^"]+"/, file);
  }
  const refs = [...source.matchAll(/(?:href|src)="([^"]+)"/g)].map(m => m[1]);
  if (file.endsWith('.js')) refs.push(...[...source.matchAll(/(?:from\s*|import\s*)['"](\.{1,2}\/[^'"]+)['"]/g)].map(m => m[1]));
  for (const ref of refs) {
    if (/^(https?:|mailto:|data:|#)/.test(ref)) continue;
    const [pathname] = ref.split(/[?#]/);
    let target = pathname.startsWith('/') ? resolve(root, '.' + pathname) : resolve(dirname(file), pathname);
    assert(!relative(root, target).startsWith('..'), `Escaped site root: ${ref}`);
    if ((await stat(target)).isDirectory()) target = resolve(target, 'index.html');
    assert((await stat(target)).isFile(), `${file}: missing ${ref}`);
    checked++;
  }
}
for (const route of ['index.html', 'privacy/index.html', 'support/index.html']) {
  const html = await readFile(resolve(product, route), 'utf8');
  assert.match(html, /id="english"/);
  assert.match(html, /rel="canonical" href="https:\/\/www\.gnodstudio\.com\/lumen\//);
  assert.match(html, /property="og:title"/);
  assert.match(html, /name="twitter:title"/);
  assert(!/<script[^>]+src="https?:/.test(html), `${route}: third-party script`);
  assert(!/<link[^>]+rel="(?:stylesheet|preload|preconnect)"[^>]+href="https?:/.test(html), `${route}: third-party asset`);
}
const play = await readFile(resolve(product, 'play/index.html'), 'utf8');
assert.match(play, /name="lumen-build" content="production"/);
assert(!files.some(file => /\/play\/(?:src\/editor|tests|tools|node_modules|src-tauri)(\/|$)/.test(file)));
const manifest = JSON.parse(await readFile(resolve(product, 'play/assets/music/manifest.json'), 'utf8'));
for (const track of manifest.tracks) await stat(resolve(product, 'play/assets/music', track.file));
console.log(`LUMEN static validation passed: ${files.length} files, ${checked} local references.`);
