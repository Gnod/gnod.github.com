# Wandan Forum product site

Static App Store introduction, privacy, and support pages for Gnod Studio's game:

- 简体中文: 完蛋论坛大冒险
- English: Forum's Over!
- 日本語: 掲示板オワタの大冒険

Canonical routes are `/wandan-forum/`, `/wandan-forum/privacy/`, and `/wandan-forum/support/`. The default language is Simplified Chinese; `?lang=en` and `?lang=ja` select the other languages. The same URLs work on all three pages. Language navigation uses URL parameters only, without browser storage, cookies, analytics, external fonts, or network requests from JavaScript.

App Store app ID: `6821354685`. The app has not launched; the pages accurately show “Coming to the App Store · Free” instead of presenting a download or play button.

## Publication boundary

This directory contains only product text, HTML/CSS, a language selector, an app icon, and static gameplay screenshots. **Never add a playable game, game JavaScript, Godot exports, WASM, PCK, IPA, ZIP, service worker, iframe, game source, or a `/play/` route.** Do not copy the game directory or any game build output here. The small `locale.js` changes language, text, and navigation only.

Run `node tools/check-wandan-forum.mjs` from the website repository root before publication. The check rejects executable game content and unexpected file types, validates the three languages, and verifies local links and screenshot sizes.

## Sources and screenshot provenance

Verified source: `/Users/shangyongdong/Vibe/wandan-forum-adventure` on 2026-10-10. Official names come from `project.godot`. Product details come from `scripts/data/world_map.gd`, `scripts/autoload/game.gd`, localization catalogs, and the current game design. The game stores saves and death logs locally. Font credit comes from `assets/fonts/fusion-pixel/OFL.txt`; the website itself uses system fonts.

- `assets/icon.png` is an unchanged copy of the game's `assets/icons/icon_1024.png`.
- `assets/{zh,en,ja}-01.png` is an unchanged copy of the corresponding `release/appstore/screenshots/{zh-Hans,en-US,ja}/iphone-69/01-forum.png`.
- `assets/{zh,en,ja}-02.png` comes from `02-danmaku.png` in the same folders.
- `assets/{zh,en,ja}-03.png` comes from `03-clouds.png` in the same folders.

All nine screenshot files are 2868×1320 PNGs. They show the actual game rendered by Godot in desktop touch mode at the target phone aspect ratio. The capture pipeline scaled the original 808×372 viewport with nearest-neighbor sampling; these are not photographs or native iOS Simulator/device captures. No gameplay content, UI, or marketing overlays were composited into the screenshots, and this site copies the delivered PNGs byte-for-byte. Full capture metadata and hashes remain in the game's screenshot provenance record.

## Preview and deployment

Serve the existing site root and open `/wandan-forum/`:

```sh
python3 -m http.server 5489 --bind 127.0.0.1 --directory /Users/shangyongdong/codes/gnod.github.com
node tools/check-wandan-forum.mjs
```

GitHub Pages serves the root of `Gnod/gnod.github.com` branch `new_page` at `https://www.gnodstudio.com`. This change is limited to `wandan-forum/` and its checker, leaving the studio homepage and all other game pages unchanged. Publish only the scoped commit and verify the Pages build plus all three HTTPS routes.

## Verification on 2026-10-10

- Static boundary, all internal file links, screenshot dimensions, and three-language content checks pass.
- Screenshot copies were verified byte-for-byte against their capture source files.
- Chinese desktop layout visually checked at 1560 pixels; English and Japanese landing layouts and English support layout visually checked at 390 pixels.
- All nine page/language combinations passed live-browser checks at 390×844: correct content and title, no horizontal overflow, and language-preserving navigation.
- The public pages show an upcoming free release. No game runtime or playable link is included.
