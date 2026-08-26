# LUMEN website

Static GitHub Pages integration, following the existing `/homereel/` layout.

- `/lumen/`: product page (Chinese and English).
- `/lumen/play/`: production browser game, exported from `Vibe/line/dist/`.
- `/lumen/privacy/`: native-app, browser and support privacy information.
- `/lumen/support/`: controls, troubleshooting, support contact and music credits.

The root portfolio card uses the site's existing four-language dictionary.
The LUMEN pages intentionally load only local assets, with no CDN, analytics or font requests.
The game has its own localStorage keys; browser progress is not shared with the iOS app.

## Update the game

In the `line` repository, run `npm run verify`. Copy the **contents** of its
`dist/` directory into this repository's `lumen/play/` directory. Do not copy
development sources, `src/editor`, tests, native projects, credentials or build archives.
Compare the file lists to ensure retired build assets are removed individually.
Keep the landing, support and privacy files outside `play/`.

Current game source: `Gnod/lumen` local baseline `a6c02ff` (2026-08-27 export).
No gameplay or rendering changes were made for this export. The native screenshot
fixture selects an existing room checkpoint; it is compiled for iOS Simulator only.
The hero screenshot is a native Simulator “Save Screen” capture, not a concept image.

## Validate and publish

Run `node tools/check-lumen.mjs` from the site root. A local preview can be served
with `python3 -m http.server 5472 --bind 127.0.0.1` and opened at `/lumen/`.
GitHub Pages currently deploys the root of `new_page` to `https://www.gnodstudio.com`.
After a scoped commit and push, verify the Pages build and the public routes.
The iOS App Store download link is deliberately absent until the app is available.
