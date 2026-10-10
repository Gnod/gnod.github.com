# DM Adventure static website

Prepared for App Store version 1.0.0. The pages currently say **Coming to the App Store**; no public availability or download link is claimed.

- `/dm-adventure/`: game introduction and real gameplay screenshots.
- `/dm-adventure/privacy/`: native app, support-email, and website privacy information.
- `/dm-adventure/support/`: controls, progression, save data, troubleshooting, contact, and font credits.
- Add `?lang=en` for English; the default is Simplified Chinese. Navigation preserves the selected language without cookies or local storage.

## Publication boundary

Publish **only this static directory**. It contains text, CSS, a small UI-language switcher, the app icon, and screenshot PNGs. Do not add a playable browser game, Godot export, PCK/WASM, game JavaScript, service worker, IPA, ZIP, source assets, or download package. Do not add a `play/` route.

## Content and assets

Product facts come from `/Users/shangyongdong/Vibe/dm-adventure/README.md` and the current project: five worlds, 33 main stages plus five secret stages, English and Simplified Chinese, offline play with local saves, no account, ads, purchases, analytics, or tracking. The fifth world is postgame content.

- `assets/icon.png`: copied without alteration from `assets/icon/icon_1024.png` in the game repository.
- `assets/meadow-{zh,en}.png`: exact copies of `release/appstore/screenshots/{zh-Hans,en-US}/iphone-69/01-meadow.png`.
- `assets/rabbits-{zh,en}.png`: exact copies of `02-rabbits.png` from the same folders.
- `assets/sky-{zh,en}.png`: exact copies of `05-sky.png` from the same folders.

The screenshot set was captured on 2026-10-10 from the game running in Godot 4.6.1 desktop touch mode at the iPhone aspect ratio, replaying actual gameplay routes for 4.5 seconds. These are gameplay captures, not native iOS device captures or marketing mockups. Original screenshot size is 2868×1320 RGB. See the game's `release/appstore/screenshot-provenance.json` and `.md` for capture inputs and SHA-256 hashes.

No new image generation, retouching, or image resizing was used. Browser CSS scales images for layout and keeps pixel rendering.

## Preview and deploy

Serve the existing website repository root:

```sh
python3 -m http.server 5478 --bind 127.0.0.1 --directory /Users/shangyongdong/codes/gnod.github.com
```

Open `http://127.0.0.1:5478/dm-adventure/`. Check both languages, the support/privacy links, and narrow layouts. The production website follows the existing GitHub Pages setup: repository `Gnod/gnod.github.com`, branch `new_page`, root directory, custom domain `www.gnodstudio.com`. Commit and push the scoped directory only when publication is authorized, then verify the Pages build and all three live routes. Existing portfolio and other game directories are outside this change.

## Local verification on 2026-10-10

- All three HTML pages' local links and assets resolved.
- Chinese desktop landing page visually inspected at 1440×1000.
- English landing page and support page visually inspected at 390×844; Chinese privacy page inspected at the same size.
- Language switch changes the document language/title, copy, and screenshots; internal navigation preserves language.
- No horizontal overflow at checked sizes; all website-owned images loaded.
- Copied screenshot hashes match the final release capture source files.
- No commit, push, or deployment performed as part of this preparation.
