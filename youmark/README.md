# YouMark public information pages

Static product entry, support, and privacy pages for the existing GitHub Pages
site. No root portfolio changes, App Store metadata changes, remote dependencies,
photo-upload flow, new hosting, or deployment are part of this change.

## Public routes after deployment

- `https://www.gnodstudio.com/youmark/`
- `https://www.gnodstudio.com/youmark/support/`
- `https://www.gnodstudio.com/youmark/privacy/`

English is the default, matching the existing App Store locale. `?lang=zh` shows
Simplified Chinese; `?lang=en` shows English. The small locale script follows
the existing product-page pattern: complete static articles, URL-only language
selection, localized metadata, and language-preserving internal links. It uses
no cookies or browser storage. English content remains readable without JS.
This does not add an App Store localization.

The icon is an unchanged copy of the active native app icon,
`WaterMark/Assets.xcassets/AppIcon.appiconset/app-icon-1024.png`.
Styles and assets are local to `/youmark/`; system fonts and the device's light
or dark preference are used.

## Content evidence

Checked read-only on November 10, 2026 against the YouMark native source checkout
at `554624c` (marketing version 1.0.6). Paths below are relative to `iosNative/`.

| Statement | Source |
| --- | --- |
| No app tracking or collected-data categories declared; app preferences use UserDefaults | `WaterMark/PrivacyInfo.xcprivacy`: tracking false, empty collected-data array, UserDefaults reason CA92.1 |
| User-selected import, optional Live Photo paired video | `WaterMark/Views/PHPickerView.swift`, `HomeView.swift` import path |
| Imported copies in app Documents; edit records in SwiftData | `WaterMark/Services/ImageStore.swift`, `WaterMark/WaterMarkApp.swift`, `WaterMark/Models/ExifEntry.swift` |
| Reads embedded GPS, not live location | `WaterMark/Services/ExifReader.swift`: GPS dictionary and latitude/longitude mapping; no current-location request found |
| Per-photo recent templates, favorites, template icons/formatting, appearance and language | `WaterMark/Services/AppPreferences.swift` |
| Creates photo-library results with add-only permission | `WaterMark/Services/PhotoSaver.swift`, `LivePhotoSaver.swift`; usage descriptions in `WaterMark/Info.plist` |
| Share output goes to system share sheet | `WaterMark/Views/ShareSheet.swift`, `DisplayImagePage.swift` |
| Deletion removes the imported copy, paired video, and edit record, with temporary Undo; preferences may remain | `WaterMark/ViewModels/AppViewModel.swift`, `HomeView.swift` deletion flow; no Photos deletion call; `AppPreferences.swift` also stores custom field text and per-photo template preferences |
| Live Photo and HDR export depend on source/template | `WaterMark/Views/BottomBar.swift`, `DisplayImagePage.swift`, `Services/PhotoSaver.swift` |
| System rating service | `WaterMark/Views/SettingsView.swift`: StoreKit requestReview |
| Public support address | Existing `wandan-forum/support/index.html` and `privacy/index.html`; live `https://www.gnodstudio.com/wandan-forum/support/` returned `mailto:gnodstudio@gmail.com` on the check date |

The support address is the studio's already-public email, not a private App
Store review contact. No ASC credentials or reviewer data were read for these pages.

Source searches identified no business-network implementation, account service,
ad/tracking/analytics SDK, or app-managed cloud-sync entitlement. This is a
source-review conclusion, not a real-device zero-network claim. The policy
explicitly distinguishes local editing from Apple services, backups, selected
sharing destinations, support email, and GitHub Pages request logging. It makes
no end-to-end encryption or complete metadata-removal promise. Deleting an
app-local item is not described as deleting originals, exports, shared copies,
or backups. These pages do not determine or change App Store privacy answers.

Deletion caveat: the reviewed deletion flow does not invoke
`AppPreferences.removeTemplateRenderPreferences(forPhotoKey:)`. The policy and
FAQ therefore explicitly say that template preferences, including custom field
text, can remain after deleting a photo. No native-app behavior was changed.

External policy references checked for the relevant service boundary:

- `https://www.apple.com/legal/privacy/`
- `https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement`

## Local validation

```sh
python3 tools/check-youmark.py
node --check youmark/locale.js
```

Optional browser validation uses an existing Playwright installation. It starts
its own loopback-only server on an available port, tests the three pages at
320/390/768/1440 px in both languages and both color schemes, checks language
navigation, keyboard access, no-JS fallback, console/network errors, and stops
the server and headless browser when finished. It does not use Device Hub or a
user browser session.

```sh
node tools/check-youmark-browser.mjs
```

If Playwright is not available through local Node resolution, set
`PLAYWRIGHT_MODULE` to its existing absolute `index.mjs` path. Set
`YOUMARK_SCREENSHOTS` to a temporary directory to retain review screenshots.
No dependency installation is required for the static checker.

Review these pages before committing, pushing, or deploying through the existing
site repository. The public routes above are intended destinations, not evidence
of deployment. Verify them after deployment before changing App Store URLs.
