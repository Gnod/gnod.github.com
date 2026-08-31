import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";

const root = resolve("four-crowns");
const pages = ["index.html", "privacy/index.html", "support/index.html"];
const allowedExtensions = new Set([".html", ".css", ".jpg", ".png"]);
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
}

for (const relative of pages) {
  const path = join(root, relative);
  if (!existsSync(path)) {
    fail(`missing page: ${relative}`);
    continue;
  }

  const html = readFileSync(path, "utf8");
  for (const marker of ["<title>", 'name="description"', 'rel="canonical"', 'property="og:title"', 'property="og:image"', 'name="twitter:title"', 'name="twitter:image"', 'id="english"']) {
    if (!html.includes(marker)) fail(`${relative} missing ${marker}`);
  }

  if (/<script\b|<iframe\b|serviceWorker|\.wasm\b|\.pck\b|manifest\.json|manifest\.webmanifest|\bsw\.js/i.test(html)) {
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
for (const fact of ["24 名顾问", "13 道敕令", "十二场危机", "没有广告与内购", "Coming to the App Store"]) {
  if (!landing.toLowerCase().includes(fact.toLowerCase())) fail(`landing page missing product fact: ${fact}`);
}

const privacy = readFileSync(join(root, "privacy/index.html"), "utf8");
if (!privacy.includes("不提供网页版游戏") || !privacy.includes("does not host a browser-playable game")) fail("privacy page must state the Web-game publication boundary in both languages");

const support = readFileSync(join(root, "support/index.html"), "utf8");
for (const marker of ["gnodstudio@gmail.com", "Pixel Plebes", "No gambling"]) {
  if (!support.includes(marker)) fail(`support page missing ${marker}`);
}

for (const forbiddenDirectory of ["play", "game", "build", "dist", "js"]) {
  if (existsSync(join(root, forbiddenDirectory))) fail(`forbidden Web-game directory exists: ${forbiddenDirectory}`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Four Crowns product site boundary verified: ${walk(root).length} static files, no playable Web build.`);
