#!/usr/bin/env python3
"""Check the isolated YouMark static pages using only the Python standard library."""

from html.parser import HTMLParser
from pathlib import Path
import re
import struct
import sys
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "youmark"
PUBLIC = "https://www.gnodstudio.com"
PAGES = ("index.html", "support/index.html", "privacy/index.html")
EMAIL = "gnodstudio@gmail.com"
ERRORS = []


class Page(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.elements = []
        self.content = {}
        self.language = None
        self.feed(source)
        self.close()

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "article":
            self.language = attrs.get("data-site-lang")
            self.content.setdefault(self.language, [])
        self.elements.append((tag, attrs, self.language))

    def handle_endtag(self, tag):
        if tag == "article":
            self.language = None

    def handle_data(self, data):
        if self.language:
            self.content[self.language].append(data)

    def find(self, tag):
        return [(attrs, lang) for name, attrs, lang in self.elements if name == tag]


def check(condition, message):
    if not condition:
        ERRORS.append(message)


for path in SITE.rglob("*"):
    if path.is_file():
        check(path.suffix in {".html", ".css", ".js", ".png", ".md"}, f"Unexpected public file: {path}")
        if path.suffix == ".js":
            check(path == SITE / "locale.js", f"Unexpected script: {path}")

parsed = {}
for name in PAGES:
    path = SITE / name
    check(path.is_file(), f"Missing page: {name}")
    if not path.is_file():
        continue
    source = path.read_text()
    page = parsed[name] = Page(source)
    expected_path = "/youmark/" + name.removesuffix("index.html")
    metas = {a.get("name") or a.get("property"): a.get("content") for a, _ in page.find("meta")}
    canonical = [a.get("href") for a, _ in page.find("link") if a.get("rel") == "canonical"]
    check(canonical == [PUBLIC + expected_path], f"Wrong canonical: {name}")
    check(metas.get("og:url") == PUBLIC + expected_path, f"Wrong OG URL: {name}")
    for key in ("description", "og:title", "og:description", "og:image", "viewport", "color-scheme"):
        check(bool(metas.get(key)), f"Missing metadata {key}: {name}")
    check(len(page.find("main")) == 1, f"Expected one main: {name}")
    check(len(page.find("article")) == 2, f"Expected two language articles: {name}")
    for lang in ("en", "zh"):
        articles = [a for a, language in page.find("article") if language == lang]
        check(len(articles) == 1, f"Missing or duplicate {lang} article: {name}")
        for article in articles:
            check(bool(article.get("data-title") and article.get("data-description")), f"Missing {lang} metadata: {name}")
            check(("hidden" in article) == (lang == "zh"), f"Default English fallback missing: {name}")
            check(article.get("lang") == {"en": "en", "zh": "zh-CN"}[lang], f"Wrong language attribute: {name}")
        check(len([1 for _, language in page.find("h1") if language == lang]) == 1, f"Expected one {lang} heading: {name}")
        check(any(a.get("data-locale") == lang and a.get("href") == f"?lang={lang}" for a, _ in page.find("a")), f"Missing {lang} switch: {name}")
        text = "".join(page.content.get(lang, []))
        check("YouMark" in text and EMAIL in text, f"Missing {lang} identity or contact: {name}")
    scripts = page.find("script")
    check(len(scripts) == 1 and scripts[0][0].get("src") == "/youmark/locale.js" and "defer" in scripts[0][0], f"Unexpected script: {name}")
    ids = [a["id"] for _, a, _ in page.elements if "id" in a]
    check(len(ids) == len(set(ids)), f"Duplicate element IDs: {name}")
    for tag, attrs, _ in page.elements:
        check(tag not in {"iframe", "form", "input", "canvas", "object", "embed", "video", "audio"}, f"Non-informational element {tag}: {name}")
        check(not any(key.startswith("on") for key in attrs), f"Inline event handler: {name}")
        if tag == "img":
            check("alt" in attrs and "width" in attrs and "height" in attrs, f"Image accessibility/dimensions missing: {name}")
        for key in ("src", "href"):
            if key not in attrs:
                continue
            url = urlsplit(attrs[key])
            check(url.scheme in {"", "https", "mailto"}, f"Unsafe/non-HTTPS link: {name}: {attrs[key]}")
            if key == "src":
                check(not url.scheme and not url.netloc and url.path.startswith("/youmark/"), f"Remote or unscoped asset: {name}")
            if url.scheme == "mailto":
                check(url.path == EMAIL, f"Unverified contact: {name}")
            if "data-local" in attrs:
                check(url.path.startswith("/youmark/"), f"Unscoped locale link: {name}")
            if not url.scheme and not url.netloc and url.path.startswith("/"):
                target = ROOT / url.path.lstrip("/")
                if target.is_dir():
                    target /= "index.html"
                check(target.is_file(), f"Broken local reference: {name}: {attrs[key]}")
            if not url.path and url.fragment:
                check(url.fragment in ids, f"Broken anchor: {name}: {attrs[key]}")

privacy = parsed.get("privacy/index.html")
if privacy:
    required = {
        "en": ["GPS coordinates", "not automatically uploaded", "Apple services and network access", "metadata-removal", "exported images in Photos", "backup copies", "offloading", "email address", "GitHub Pages"],
        "zh": ["GPS 坐标", "不会自动上传", "Apple 服务和网络", "隐藏显示字段不等于清除元数据", "已导出的图片", "备份副本", "卸载 App", "邮箱地址", "GitHub Pages"],
    }
    for lang, markers in required.items():
        text = "".join(privacy.content[lang])
        for marker in markers:
            check(marker in text, f"Privacy boundary missing ({lang}): {marker}")

script = (SITE / "locale.js").read_text()
check(not re.search(r"fetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|localStorage|sessionStorage|document\.cookie|innerHTML|eval\s*\(|serviceWorker", script), "Locale script has network/storage/dynamic HTML code")
css = (SITE / "style.css").read_text()
check(not re.search(r"@import|url\s*\(", css), "CSS loads additional assets")
check("prefers-color-scheme: dark" in css, "Missing dark scheme")
check("focus-visible" in css and "[hidden]" in css, "Missing keyboard focus or hidden-content rule")
icon = (SITE / "assets/icon.png").read_bytes()
check(icon[:8] == b"\x89PNG\r\n\x1a\n" and struct.unpack(">II", icon[16:24]) == (1024, 1024), "Invalid app icon")

if ERRORS:
    print("\n".join(ERRORS), file=sys.stderr)
    sys.exit(1)
print("YouMark static checks passed: 3 bilingual pages, local assets, verified contact, privacy boundaries, no upload/tracking code.")
