import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";

const root = resolve("four-crowns");
const pages = ["index.html", "privacy/index.html", "support/index.html"];
const allowedExtensions = new Set([".html", ".css", ".jpg", ".png", ".js"]);
const failures = [];

function fail(message) {
  failures.push(message);
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

for (const path of walk(root)) {
  if (!allowedExtensions.has(extname(path))) fail(`forbidden site artifact: ${path}`);
  if (extname(path) === ".js" && path !== join(root, "locale.js")) fail(`forbidden Four Crowns script: ${path}`);
}

for (const relative of pages) {
  const path = join(root, relative);
  if (!existsSync(path)) {
    fail(`missing page: ${relative}`);
    continue;
  }

  const html = readFileSync(path, "utf8");
  for (const marker of ["<html lang=\"en\">", "<title>", 'name="description"', 'rel="canonical"', 'property="og:title"', 'property="og:image"', 'name="twitter:title"', 'name="twitter:image"', 'id="chinese"', 'id="japanese"', 'lang="ja"']) {
    if (!html.includes(marker)) fail(`${relative} missing ${marker}`);
  }

  const allowedLocaleScript = '<script src="/four-crowns/locale.js?v=20260901-localized-shots" defer></script>';
  const executableHtml = relative === "index.html" ? html.replace(allowedLocaleScript, "") : html;
  if (relative === "index.html" && !html.includes(allowedLocaleScript)) fail("landing page missing its screenshot-localization script");
  if (/<script\b|<iframe\b|serviceWorker|\.wasm\b|\.pck\b|manifest\.json|manifest\.webmanifest|\bsw\.js/i.test(executableHtml)) {
    fail(`${relative} references executable Web-game content`);
  }

  for (const match of html.matchAll(/(?:href|src)="(\/four-crowns\/[^"#?]+)"/g)) {
    const sitePath = match[1].replace(/^\/four-crowns\//, "");
    const target = join(root, sitePath);
    const resolved = extname(target) ? target : join(target, "index.html");
    if (!existsSync(resolved) || !statSync(resolved).isFile()) fail(`${relative} has broken local reference: ${match[1]}`);
  }
}

const landing = readFileSync(join(root, "index.html"), "utf8");
for (const fact of ["24 advisors", "13 edicts", "Twelve crises", "No ads or purchases", "Coming to the App Store", "24 名顾问", "24人の顧問"]) {
  if (!landing.toLowerCase().includes(fact.toLowerCase())) fail(`landing page missing product fact: ${fact}`);
}
for (const marker of ['data-shot="battle"', 'data-shot="court"', 'data-shot="map"', 'data-locale="en"', 'data-locale="zh"', 'data-locale="ja"']) {
  if (!landing.includes(marker)) fail(`landing page missing localized screenshot marker: ${marker}`);
}

for (const language of ["en", "zh", "ja"]) {
  for (const shot of ["battle", "court", "map"]) {
    const path = join(root, "assets", "screenshots", language, `${shot}.jpg`);
    if (!existsSync(path)) fail(`missing ${language} screenshot: ${shot}`);
    else if (statSync(path).size < 100_000) fail(`localized screenshot is unexpectedly small: ${path}`);
  }
}

const localeScript = readFileSync(join(root, "locale.js"), "utf8");
if (/canvas|getContext|WebGL|AudioContext|requestAnimationFrame|serviceWorker|fetch\s*\(|\.wasm\b|\.pck\b/i.test(localeScript)) {
  fail("locale.js must remain a screenshot-localization helper, never a Web-game runtime");
}

const privacy = readFileSync(join(root, "privacy/index.html"), "utf8");
if (!privacy.includes("不提供网页版游戏") || !privacy.includes("does not host a browser-playable game") || !privacy.includes("ブラウザーで遊べるゲーム")) fail("privacy page must state the Web-game publication boundary in all three languages");

const support = readFileSync(join(root, "support/index.html"), "utf8");
for (const marker of ["gnodstudio@gmail.com", "Pixel Plebes", "No gambling", "ギャンブル要素について"]) {
  if (!support.includes(marker)) fail(`support page missing ${marker}`);
}

const homepage = readFileSync(resolve("index.html"), "utf8");
for (const marker of ['data-lang-path="/four-crowns/"', 'src="/four-crowns/assets/icon.png"', 'data-i18n="fourCrownsSummary"', 'data-i18n="exploreFourCrowns"', 'src="/i18n.js?v=20260901-four-crowns"']) {
  if (!homepage.includes(marker)) fail(`homepage missing Four Crowns entry marker: ${marker}`);
}
if (/\/four-crowns\/(?:play|game|js|build|dist)\/?|\/four-crowns\/[^"']+\.(?:wasm|pck|js)/i.test(homepage)) {
  fail("homepage must link only to the Four Crowns product page, never a Web-game runtime");
}

const i18n = readFileSync(resolve("i18n.js"), "utf8");
for (const key of ["fourCrownsEyebrow", "fourCrownsSummary", "exploreFourCrowns", "fourCrownsAvailability"]) {
  const start = i18n.indexOf(`${key}:`);
  if (start < 0) {
    fail(`homepage translations missing ${key}`);
    continue;
  }
  const tail = i18n.slice(start);
  const next = tail.slice(1).search(/\n    \w+:/);
  const entry = next < 0 ? tail : tail.slice(0, next + 1);
  for (const lang of ["zh", "en", "ja", "ko"]) {
    if (!entry.includes(`${lang}:`)) fail(`homepage translation ${key} missing ${lang}`);
  }
}

for (const forbiddenDirectory of ["play", "game", "build", "dist", "js"]) {
  if (existsSync(join(root, forbiddenDirectory))) fail(`forbidden Web-game directory exists: ${forbiddenDirectory}`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Four Crowns product site boundary verified: ${walk(root).length} static files, no playable Web build.`);
