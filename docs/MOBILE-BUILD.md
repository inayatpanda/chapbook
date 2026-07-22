# Chapbook — Mobile + Store Native Build Guide

Self-contained runbook for building Chapbook as **native mobile (Android APK, iOS)** and
**licence-free / store-ready desktop** apps, on top of the existing Tauri 2 desktop project.

This document is written to be followed by a fresh session on a different Mac (an **M5
MacBook Air with Xcode installed**) that has **none** of the context in which it was
written. Everything you need is here or is a command you run. Where a command's exact
flags depend on the installed CLI version, that is called out — run `npx tauri --help`
and `npx tauri <sub> --help` rather than trusting a flag from memory.

All paths are relative to the **repo root** (the directory containing `build.mjs`,
`package.json`, `desktop/`, `scripts/`, `src/`). The GitHub repo is
`inayatpanda/chapbook`; the hosted site is `https://chapbook.rqai.co.uk` with the app
served at `/app`.

---

## 1. Purpose & current state

**What already ships today:**

- Chapbook is a **client-side SPA** (no server). `build.mjs` esbuild-bundles the engine
  from `src/` into a large root-level `dist/studio.js` and emits a static site into
  `dist/` (marketing pages at the root, the app document at `dist/app/index.html`).
- A **Tauri 2 desktop wrapper** lives in `desktop/src-tauri` (productName `Chapbook`,
  identifier `uk.co.rqai.chapbook`). It currently **loads the remote hosted app**
  (`https://chapbook.rqai.co.uk/app`) inside the webview; `frontendDist` points at a tiny
  offline placeholder (`desktop/fallback/index.html`) shown only if the site is
  unreachable.
- **DMG (notarized macOS) + EXE (Windows NSIS)** are built in **GitHub Actions CI**
  (`.github/workflows/desktop-release.yml`), triggered by pushing a `desktop-v*` tag,
  and published as a draft `desktop-v*` GitHub Release (latest is **`desktop-v1.0.1`**).
  The marketing `/download` page is fed from that release by `scripts/stage-installers.mjs`.
- **On-device Whisper dictation** was just added: `@huggingface/transformers` 4.2.0 running
  the self-hosted `whisper-tiny.en` q8 model, single-thread WASM, all same-origin. It is the
  **default** mic; the browser's Web Speech (cloud) engine is an explicit opt-in. The model
  (~65 MB) is **never in git** — it is staged at build time by `scripts/stage-stt.mjs`.

**What this document adds:**

1. An **Android APK** you can sideload (and the foundation for a Play Store build).
2. **iOS** load-on-device + signing with the owner's Apple Developer identity (and the
   realistic outside-App-Store paths: TestFlight / ad-hoc).
3. A **bundle-local** build that loads the app's own bundled assets instead of the remote
   gated site. This same bundle-local build gives you a **licence-free Windows EXE** (gate
   disabled) and is the mandatory foundation for any App Store / Play Store submission.

---

## 2. The bundle-local decision (READ THIS FIRST)

Everything mobile and store-related in this doc depends on one change: the app must load
**local bundled assets**, not the remote `https://chapbook.rqai.co.uk/app` URL the desktop
wrapper currently opens. Three independent reasons force this:

1. **Apple Guideline 4.2 (minimum functionality).** Apple rejects apps that are just a thin
   web view onto a website. A store iOS build must ship and run the app's own assets.
2. **WKWebView has no service-worker offline story.** On iOS the webview is WKWebView. A
   remote-URL wrapper gets **no** service-worker offline caching unless you adopt the
   App-Bound-Domains entitlement (a heavy, restrictive commitment). Bundling the assets
   locally sidesteps the whole problem — the files are on disk.
3. **The licence-free EXE needs the gate disabled.** You cannot disable the gate on the
   remote site (that would unlock it for everyone). A gate-disabled build must be a
   **local** build shipped in the installer.

### What "bundle-local" means concretely in this repo

The Tauri config currently is (`desktop/src-tauri/tauri.conf.json`):

```jsonc
{
  "build": {
    "frontendDist": "../fallback",              // tiny offline placeholder
    "devUrl": "https://chapbook.rqai.co.uk/app"
  },
  "app": {
    "windows": [
      { "label": "main", "url": "https://chapbook.rqai.co.uk/app", ... }   // ← remote
    ],
    "security": { "csp": "default-src 'self' https://chapbook.rqai.co.uk; ..." }
  }
}
```

To make it bundle-local you produce the real `dist/` and point Tauri at it:

```bash
# from repo root — produce the full static app, then add the dictation model
npm ci
npm run build          # → dist/ (dist/app/index.html + root-level studio.js, stt.js, …)
npm run stage:stt      # → dist/app/vendor/stt/* + dist/app/models/*  (~65 MB, verified)
```

Then change **`desktop/src-tauri/tauri.conf.json`** so the webview serves that tree:

- **`build.frontendDist`** → point at the built `dist` root, e.g. `"../../dist"`
  (relative to `desktop/src-tauri/`, the repo-root `dist/` is `../../dist`). It must be the
  **`dist` root**, not `dist/app`, because the app's assets are referenced with **absolute
  root paths** (`/studio.js`, `/stt.js`, and the worker imports `/app/vendor/stt/…` and
  sets `env.localModelPath = '/app/models/'` — see `src/stt-worker.src.js`). Only with
  `dist/` as the web root do `/app/…`, `/studio.js`, `/stt.js` all resolve.
- **`app.windows[0].url`** → the app document **within** that root. The hosted site relies
  on a Netlify redirect (`/app` → `/app/index.html`) that does **not** exist under Tauri's
  file protocol, so you must point at the real file: `app/index.html` (Tauri resolves a
  window `url` that is not `http(s)://` as a path under `frontendDist`). **Verify the exact
  form** (`app/index.html` vs `/app/index.html`) against your installed CLI — load the app
  and confirm it boots rather than showing a blank frame.
- **`app.security.csp`** → the current CSP is scoped to `https://chapbook.rqai.co.uk`
  because it loads remotely. For a local bundle, re-scope it to the app's own origin.
  The **app-page CSP already used by the hosted site** is the correct template — it lives in
  `netlify.toml` under `for = "/*"`:

  ```
  default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval';
  style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:;
  media-src 'self' blob: https:;
  connect-src 'self' https://api.anthropic.com https://api.openai.com
    https://generativelanguage.googleapis.com https://api.groq.com
    https://api.crossref.org https://github.com https://api.github.com
    https://*.workers.dev https://*.r2.dev https://inayatpanda.com;
  font-src 'self'; frame-src 'self' https://www.youtube-nocookie.com
    https://player.vimeo.com; object-src 'none'; base-uri 'self'
  ```

  `'wasm-unsafe-eval'` is **required** — the on-device Whisper engine compiles its ONNX
  WASM and nothing weaker works. `connect-src` keeps the BYOK AI providers reachable (users
  bring their own keys) and `inayatpanda.com` for the licence-revocation list. The desktop
  wrapper's current CSP already contains `'wasm-unsafe-eval'`; the change here is dropping
  the `https://chapbook.rqai.co.uk` origins in favour of the local `'self'` origin.

> **Do not commit these `tauri.conf.json` edits to `main` casually.** The remote-loading
> config is what CI uses to build the shipping DMG/EXE that point at the live site. Keep the
> bundle-local edits on a branch (or a second config) so the two build modes don't collide.
> A clean way is a separate config file passed with `--config` (see `npx tauri build --help`).

---

## 3. Prerequisites the OWNER must confirm on the M5

Run each check. "Good" output is described. Do not proceed past a failing check.

### Xcode (required for iOS, and for the notarized DMG)

```bash
xcode-select -p           # good: /Applications/Xcode.app/Contents/Developer
                          # bad:  .../CommandLineTools  → run: sudo xcode-select -s /Applications/Xcode.app
sudo xcodebuild -license accept    # accept the licence once (needs admin)
xcodebuild -version       # good: prints "Xcode 16.x" (or whatever is installed) + build id
```

Then confirm an **Apple Developer signing identity** is available to Xcode:

- Open Xcode → **Settings → Accounts**, ensure the owner's Apple ID (enrolled in the Apple
  Developer Program) is signed in and its team is listed. The team used by CI is
  **`Inayat Panda (G3RVS73AU3)`** (team id `G3RVS73AU3`, per
  `.github/workflows/desktop-release.yml`).
- Check installed signing identities from the terminal:

  ```bash
  security find-identity -v -p codesigning
  # good: at least one "Apple Development: …" and/or "Developer ID Application: … (G3RVS73AU3)"
  ```

### Android Studio + SDK + NDK (required for the APK) — status on the M5 is UNKNOWN, verify

Tauri Android needs the Android SDK **and NDK** and the `JAVA_HOME`/`ANDROID_HOME`/
`NDK_HOME` env vars. Verify:

```bash
# JDK (Android Studio bundles one under its app dir; any JDK 17+ is fine)
java -version                     # good: 17 or newer

# SDK location — Android Studio default on macOS:
echo "$ANDROID_HOME"              # good: ~/Library/Android/sdk  (set it if empty, see below)
ls "$HOME/Library/Android/sdk"    # good: lists platform-tools, platforms, ndk, …

# sdkmanager + installed packages (path may differ by Studio version)
"$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" --list_installed
# good: shows platform-tools, a platforms;android-3x, build-tools;3x.x.x, and an ndk;xx.x.x
adb --version                     # good: prints Android Debug Bridge version
```

If missing: install **Android Studio**, then in its **SDK Manager** install the SDK
Platform, **Platform-Tools**, **Build-Tools**, and the **NDK (Side by side)**. Then set the
env vars (add to `~/.zshrc`):

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export NDK_HOME="$ANDROID_HOME/ndk/<installed-ndk-version>"   # e.g. ndk/26.3.11579264
export PATH="$ANDROID_HOME/platform-tools:$PATH"
```

Tauri reads `NDK_HOME` (some versions accept `ANDROID_NDK_HOME`); if `tauri android init`
complains it can't find the NDK, set both to the same path. Confirm the exact expected var
with `npx tauri android init --help`.

### Rust / cargo (required for every native build)

```bash
rustc --version && cargo --version     # good: both print a version (1.77.2+ per Cargo.toml)
# if missing: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### Node (required to run the web build)

```bash
node --version     # good: >= 22.5  (package.json engines pins node >=22.5)
```

---

## 4. Toolchain setup

Install the Tauri CLI (the desktop project already declares `@tauri-apps/cli` `^2.11.4` as
a devDependency of `desktop/`, so `npm ci` in `desktop/` is enough; a global install is
optional):

```bash
cd desktop
npm ci                       # installs @tauri-apps/cli locally → use `npx tauri …`
npx tauri --version          # good: 2.x
```

Add the Rust targets the mobile bundlers cross-compile to:

```bash
# iOS (device + simulator on Apple Silicon)
rustup target add aarch64-apple-ios aarch64-apple-ios-sim

# Android (all ABIs Tauri packages into a universal APK)
rustup target add aarch64-linux-android armv7-linux-androideabi \
  i686-linux-android x86_64-linux-android
```

Initialise the mobile projects **from the `desktop/` directory** (that is where the Tauri
project root — `src-tauri/` — lives):

```bash
cd desktop
npx tauri ios init         # generates src-tauri/gen/apple/  (Xcode project)
npx tauri android init     # generates src-tauri/gen/android/ (Gradle project)
```

Notes:

- These **mutate the `desktop/src-tauri/gen/` tree**. That tree is **gitignored**
  (`desktop/.gitignore` ignores `src-tauri/gen/`), so it is regenerable scaffolding, not
  source — safe to delete and re-init. App icons for both platforms are already present
  under `desktop/src-tauri/icons/android/` and `desktop/src-tauri/icons/ios/`, so init seeds
  real icons rather than placeholders.
- The mobile bundle identifier derives from `identifier` in `tauri.conf.json`
  (`uk.co.rqai.chapbook`). Keep it stable — it is the App/Play Store application id.
- Do the bundle-local config change from Section 2 **before** you build for mobile
  (a mobile app must serve local assets; a remote-URL window will be rejected by Apple and
  gives no offline dictation on iOS).

---

## 5. Licence-free Windows EXE (bundle-local, gate disabled)

This is the owner's own app, shipped without the paywall **for now** — not a crack. The
gate is disabled at the source, cleanly, before building.

### Where the gate lives

The Ed25519 licence gate is inline in `src/index.html`. Its entry point is the
`licenceGate()` IIFE near the end of the file. The very first line is the disable point:

```js
// src/index.html, inside (async function licenceGate(){ ... })
if(!LIC_PUBKEY){ proceedAfterLicence(); return; } // unlicensed build → behave as before
```

`LIC_PUBKEY` comes from `window.__LICENCE_PUBLIC_KEY`, set inline in `src/index.html`:

```html
<script>window.__LICENCE_PUBLIC_KEY='20e5e11738c29f3ee250dd38fa1b72695a327a2eb18cf4f9b817c56c664c7201';</script>
```

So **an empty public key disables the gate entirely** — the app boots straight through.
This is the app's own supported "unlicensed build" path, not a bypass hack.

### The least-invasive change (empty the baked key)

`build.mjs` has a **drift guard**: it reads the inline `window.__LICENCE_PUBLIC_KEY` from
`src/index.html` and asserts it equals `PUBLIC_KEY` exported from
`src/lib/licence-pubkey.js`; a mismatch **fails the build** (this is deliberate — it stops a
half-edit). Its comment states empty-on-both is a valid unlicensed build:

> `(Empty on both = unlicensed build, which is fine.)`

Therefore, to ship gate-free, empty **both** values (keep them in lockstep):

1. In `src/index.html`, change the inline script to:
   `<script>window.__LICENCE_PUBLIC_KEY='';</script>`
2. In `src/lib/licence-pubkey.js`, change:
   `export const PUBLIC_KEY = '';`

Then `npm run build` passes the guard and prints `licence verify key: (none — unlicensed
build)`. Do this on a branch; **do not** commit an empty key to whatever branch feeds the
paid hosted/CI builds.

> There is no `npm run licence:init` script in this repo despite the comment referencing one
> — edit the two values by hand (or with a scripted `sed`), then let `build.mjs`'s guard
> confirm they match.

### Produce the local build, then wrap as the Windows EXE

```bash
# 1. gate-free static app + model (from repo root)
npm ci
npm run build
npm run stage:stt

# 2. bundle-local tauri config (Section 2): frontendDist → ../../dist, window url → app/index.html,
#    CSP → the self-scoped app CSP. (Prefer a --config override so main config is untouched.)

# 3. build the Windows NSIS installer.
#    NOTE: an .exe target must be built ON WINDOWS (or a Windows CI runner) — you cannot
#    cross-compile a Windows NSIS installer from macOS. On a Windows machine with Rust +
#    the desktop deps:
cd desktop
npx tauri build --bundles nsis
# → desktop/src-tauri/target/release/bundle/nsis/*.exe
```

The `nsis` target is already declared in `tauri.conf.json` `bundle.targets`. This EXE is
**intentionally unsigned-of-licence** (it has no verify key baked in, so it never shows the
gate) and, as today, **unsigned for Windows code-signing** (no Windows cert in this repo) —
Windows SmartScreen will warn on first run, which is expected for an unsigned installer.

---

## 6. Android APK (sideload)

### 6.1 Generate a signing keystore (once, keep it safe and out of git)

```bash
keytool -genkeypair -v \
  -keystore ~/chapbook-release.jks \
  -alias chapbook \
  -keyalg RSA -keysize 2048 -validity 10000
# prompts for a keystore password, a key password, and a distinguished name.
# STORE THESE SECRETS SAFELY — the same key must sign every future update, or Play/Android
# will refuse the upgrade.
```

### 6.2 Point Tauri's Android build at the keystore

Tauri reads the signing config from the generated Gradle project. Create
`desktop/src-tauri/gen/android/keystore.properties` (this file is inside the gitignored
`gen/` tree — never commit it):

```properties
storeFile=/Users/<you>/chapbook-release.jks
storePassword=<keystore password>
keyAlias=chapbook
keyPassword=<key password>
```

The exact property names / file location can shift between Tauri CLI versions. Confirm what
your version expects with `npx tauri android build --help` and the generated
`gen/android/app/build.gradle.kts` (look for where it reads `keystore.properties`). If the
generated Gradle doesn't wire a `release` signingConfig yet, add one that reads these
properties — the Tauri mobile docs for your CLI version show the current snippet.

### 6.3 Build the APK

```bash
cd desktop
npx tauri android build --apk        # verify the flag name with: npx tauri android build --help
```

Output lands under the generated Gradle project, typically:

```
desktop/src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk
```

(Path can vary by CLI/Gradle version — if in doubt, `find desktop/src-tauri/gen/android -name '*.apk'`.)
`--apk` produces the sideloadable APK; an `.aab` (App Bundle) is the Play Store format for
later.

### 6.4 Sideload it

```bash
# USB, device in Developer Mode with USB debugging on:
adb install -r .../app-universal-release.apk

# or copy the .apk to the phone (email/Drive/USB) and tap it — the user must allow
# "Install unknown apps" for the installing app (Files/Chrome). That's the sideload path.
```

Play Store submission is a later step (upload the signed `.aab`, complete the Play Console
listing) and is out of scope here.

---

## 7. iOS (owner enrolled)

The owner **is** enrolled in the Apple Developer Program and Xcode is installed, so signing
is available.

### 7.1 Build / open the Xcode project

```bash
cd desktop
npx tauri ios build         # builds; verify flags/targets with: npx tauri ios build --help
# or open the generated project in Xcode to drive signing + device runs interactively:
open src-tauri/gen/apple/*.xcodeproj      # (or .xcworkspace if one was generated)
```

### 7.2 Set the signing Team

In Xcode: select the app target → **Signing & Capabilities** → tick **Automatically manage
signing** → set **Team** to the owner's Apple Developer team (**Inayat Panda —
`G3RVS73AU3`**). The bundle identifier is `uk.co.rqai.chapbook` (from `tauri.conf.json`);
if Xcode reports it's unavailable, register it once in the Apple Developer portal
(Certificates, Identifiers & Profiles → Identifiers).

### 7.3 Run on a connected device

Connect an iPhone/iPad (trusted, Developer Mode enabled in iOS Settings → Privacy &
Security). In Xcode pick the device as the run destination and **Run** (⌘R). First install
requires trusting the developer profile on the device (Settings → General → VPN & Device
Management).

### 7.4 Distribution outside the App Store — realistic options

True open sideloading (like Android's APK) is **not** available on stock iOS. Practical
outside-store paths:

- **TestFlight** (recommended): upload a build via Xcode → App Store Connect, invite testers
  by email or public link. Up to 90-day builds, no full App Store review for internal
  testers. This is the closest thing to "download outside the store."
- **Ad-hoc distribution**: an ad-hoc provisioning profile embeds specific device UDIDs; you
  produce an `.ipa` those exact devices can install. Fine for a handful of known devices,
  not for public distribution.
- **App Store**: full submission + review (see Section 11 for the compliance blocker to
  resolve first).

Flag for the owner: **there is no general "download the iOS app from our website and install
it" path** on stock iOS. Plan for TestFlight or the App Store.

---

## 8. DMG / EXE recap (already automated)

These already build in **GitHub Actions CI** — you normally don't build them by hand:

```bash
# tag-triggered CI build → draft desktop-v* GitHub Release (mac DMG signed+notarized, win EXE)
git tag desktop-v1.0.2
git push origin desktop-v1.0.2
```

CI (`.github/workflows/desktop-release.yml`) builds a **universal** macOS DMG
(`--target universal-apple-darwin --bundles dmg`) and a Windows NSIS EXE
(`--bundles nsis`), signs+notarizes the mac app **and** the DMG container when the Apple
secrets are present, and publishes a draft release. `scripts/stage-installers.mjs` then
pulls those assets into `/download` on the next site deploy.

For a **one-off local build** (matches what CI does, minus CI orchestration):

```bash
cd desktop
# macOS (Apple Silicon host): a native-arch DMG
npx tauri build --bundles dmg
# → desktop/src-tauri/target/release/bundle/dmg/*.dmg
# universal (Intel+ARM), like CI:
npx tauri build --target universal-apple-darwin --bundles dmg
```

Notarization needs the Apple identity signed into the machine (Section 3) and the same env
vars CI sets (`APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`,
`APPLE_TEAM_ID=G3RVS73AU3`, plus the certificate). Without them you still get a **working
but unsigned** `.app`/DMG (Gatekeeper will warn). The current CI DMG loads the **remote**
site; a bundle-local DMG (Section 2) is what you want for an offline-capable desktop app.

---

## 9. Whisper model in the bundle

On the web, the ~65 MB dictation model is fetched on first use and cached by the **service
worker** (`STT_CACHE` in `src/sw.js`, cache-first over `/app/vendor/stt/` and
`/app/models/`). **Native builds (iOS especially) have no service-worker cache**, so the
model must be **on disk inside the bundled assets**. That is exactly what `stage:stt`
produces, and since bundle-local (Section 2) uses `dist/` as the web root, the staged files
are already in the right place:

```bash
npm run build          # dist/app/index.html etc. (wipes dist/ first)
npm run stage:stt      # → dist/app/vendor/stt/*  +  dist/app/models/<model id>/*
```

`scripts/stage-stt.mjs` downloads and **sha-256-verifies every file** against the pins in
`scripts/stt-files.mjs` (a size/hash mismatch aborts the build — no silently-different
model ever ships). The staged set (single export) is:

- **runtime** (`dist/app/vendor/stt/`): `transformers.min.js` (~0.56 MB),
  `ort-wasm-simd-threaded.asyncify.mjs` (~0.05 MB), `ort-wasm-simd-threaded.asyncify.wasm`
  (~23.6 MB).
- **model** (`dist/app/models/onnx-community/whisper-tiny.en/`): 5 JSON/config files +
  `onnx/encoder_model_quantized.onnx` (~10.1 MB) + `onnx/decoder_model_merged_quantized.onnx`
  (~30.7 MB).
- **Total ≈ 68 MB** on disk (the code comments round to "~65 MB"; the app's own first-use
  toast says "~30 MB" — that's the runtime-requested subset, not the full staged set). Treat
  the source of truth as the pinned sizes in `scripts/stt-files.mjs`.

**Offline staging** — if the M5 has no network (or you want to reuse an already-verified set
from another machine), point `CHAPBOOK_STT_SRC` at a previously-staged `dist/app` directory;
files are **copied and still hash-checked**:

```bash
CHAPBOOK_STT_SRC=/path/to/known-good/dist/app npm run stage:stt
```

There is also a verified fallback export: `CHAPBOOK_STT_MODEL=xenova npm run stage:stt`
stages `Xenova/whisper-tiny.en` instead of the default `onnx-community/whisper-tiny.en`.

**App-size implication:** bundling the model adds ~68 MB to every native binary. That's the
price of on-device dictation on iOS (where there is no other private mic — see Section 10).
Acceptable, but factor it into store size limits and the download experience.

---

## 10. WKWebView / platform caveats

- **Ed25519 licence gate needs Safari/iOS ≥ 17.** The gate verifies keys with WebCrypto
  Ed25519, which Safari/iOS only gained in 17. The repo already handles older engines: when
  the native path throws, it falls back to a **bundled pure verifier**
  (`src/lib/ed25519Verify.js`, exposed as `window.__studioEd25519`) — see `_ed25519Verify()`
  in `src/index.html`. So activation still works on iOS 16 / older Mac Safari. For the
  **licence-free** builds (Section 5) this is moot — the gate is off.
- **Web Speech dictation is dead in WKWebView.** iOS WKWebView has no usable Web Speech API,
  so the cloud opt-in engine is unavailable there. This is **fine**: on-device Whisper is the
  **default** mic and works in WKWebView (it's just WASM + a worker). On iOS, Whisper is the
  **only** dictation engine — which is the private, preferred one anyway.
- **No service-worker offline in plain WKWebView.** Without the App-Bound-Domains
  entitlement there is no SW offline caching in WKWebView. Bundle-local (Sections 2 & 9)
  makes this irrelevant — assets and the model are on disk, not fetched-then-cached.
- **`'wasm-unsafe-eval'` must be in the native CSP** or Whisper won't compile (Section 2).

---

## 11. Store-launch open questions (resolve BEFORE submitting)

> ### ⚠️ BIGGEST COMPLIANCE DECISION — Apple Guideline 3.1.1 (In-App Purchase)
> Chapbook sells its licence via **Stripe on the website** (£49, one-time). Apple's 3.1.1
> generally requires that unlocking paid functionality **inside** an iOS app go through
> **Apple In-App Purchase** (Apple's cut), and forbids in-app links/steering to external
> purchase in most cases. Options to evaluate before any App Store submission:
> - Ship the iOS app **gate-free** (like the licence-free build) and monetise elsewhere —
>   avoids IAP entirely but changes the business model on iOS.
> - Add **Apple IAP** for the in-app unlock (Apple takes its commission; reconcile with the
>   Stripe licence system).
> - Qualify as a **"reader" app** or use an approved **external-purchase/link entitlement**
>   (region-dependent, extra review, specific rules).
>
> This is a **business + legal decision, not just a build step.** Do not submit to the App
> Store until it's resolved. **Do not** paste a Stripe checkout link into the iOS UI and hope
> — that's a common, near-automatic rejection.

- **Apple Guideline 4.2 (thin wrapper):** solved by the bundle-local build (Section 2). Make
  sure the submitted build loads local assets, not the remote URL.
- **Privacy / permissions:** the app uses the microphone (dictation) — the iOS build needs an
  `NSMicrophoneUsageDescription` string, and the App Store privacy questionnaire must
  reflect that dictation is **on-device** (Whisper) while the opt-in Web Speech engine (not
  present on iOS) would be cloud. BYOK AI calls go to third-party APIs the user configures —
  disclose the network usage accordingly.
- **Google Play** is comparatively lenient: sideload APK works today (Section 6), and Play's
  payment rules have more room (and the website-Stripe model is less of a flashpoint than on
  iOS), but review Play billing policy before listing a paid unlock.

---

## 12. Verification checklist

Run these after each build to confirm it actually works. "Observe" means launch the app and
look — a green compile is not proof.

### All platforms (functional)
- [ ] **App launches** to the Chapbook UI (not the `desktop/fallback` placeholder, not a
      blank frame). A blank frame usually means the window `url` / `frontendDist` rooting
      (Section 2) is wrong.
- [ ] **Offline works:** disable network, cold-launch — the app still boots and renders
      (local assets, no dependence on `chapbook.rqai.co.uk`).
- [ ] **On-device dictation works:** tap the mic, allow microphone, speak — text appears.
      First use may show "Preparing dictation…". Confirm no network egress for the model on a
      bundle-local build (it's on disk).
- [ ] **Licence gate state is as intended:**
      - Licence-free builds (Section 5): app boots straight in, **no** licence prompt. Build
        log shows `licence verify key: (none — unlicensed build)`.
      - Gated builds: the licence screen appears and a valid key unlocks it.

### Android
- [ ] `adb install -r <apk>` succeeds; app icon appears; launches on the device.
- [ ] APK is signed by your release keystore: `jarsigner -verify -verbose <apk>` (or
      `apksigner verify --print-certs <apk>`) shows your key, not a debug key.

### iOS
- [ ] Runs on a **physical device** from Xcode (simulator is a smoke test only; mic + WASM
      behave differently on-device).
- [ ] Signing shows the owner's team (`G3RVS73AU3`) and no provisioning errors.
- [ ] Dictation works on-device (Whisper is the only iOS engine — confirm the mic isn't
      silently hidden).

### macOS / Windows desktop
- [ ] `npx tauri build` produces the DMG/EXE in
      `desktop/src-tauri/target/**/bundle/`.
- [ ] Bundle-local desktop build boots offline; remote-config build boots online (know which
      config you built).
- [ ] (Signed mac) `spctl -a -t open --context context:primary-signature <app-or-dmg>` /
      `spctl -a -t install <dmg>` passes for a notarized build.

---

### Appendix — key files referenced

| Path | Role |
| --- | --- |
| `build.mjs` | esbuild bundler → `dist/`; licence-key drift guard; SW cache stamping |
| `package.json` | scripts: `build`, `stage:stt`, `stage:installers`, `deploy:draft/prod` |
| `scripts/stage-stt.mjs` | stages the ~65 MB Whisper model into `dist/app/vendor/stt` + `dist/app/models` (hash-verified; `CHAPBOOK_STT_SRC` offline, `CHAPBOOK_STT_MODEL=xenova` fallback) |
| `scripts/stt-files.mjs` | pinned STT file manifest (sizes + sha-256 — source of truth) |
| `scripts/stage-installers.mjs` | pulls DMG/EXE from the newest `desktop-v*` release into `dist/downloads` |
| `scripts/sw-cache-name.mjs` | derives `CACHE` / `STT_CACHE` names from content/pin hashes |
| `src/sw.js` | service worker: SHELL precache + separate STT cache (web only) |
| `src/index.html` | the SPA shell; inline licence gate (`licenceGate()`), Whisper mic wiring (`whTap`, `sttCreateWhisperProvider`) |
| `src/lib/licence-pubkey.js` | `PUBLIC_KEY` baked into the gate (empty ⇒ gate disabled) |
| `src/stt-worker.src.js` | STT worker; imports `/app/vendor/stt/transformers.min.js`, `localModelPath = /app/models/` |
| `desktop/src-tauri/tauri.conf.json` | Tauri config: `frontendDist`, window `url`, CSP, `bundle.targets` |
| `desktop/src-tauri/capabilities/default.json` | narrowed core permissions (no custom IPC) |
| `desktop/fallback/index.html` | current `frontendDist` — offline placeholder only |
| `.github/workflows/desktop-release.yml` | CI: signed DMG + NSIS EXE on `desktop-v*` tags |
</content>
</invoke>
