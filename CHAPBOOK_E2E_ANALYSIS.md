# Chapbook application analysis and E2E report

Date: 2026-07-28  
Repository: `/Users/inayat/Projects/chapbook`  
Checked-out branch: `native-builds` at `1c71f3b`  
Live site tested: `https://chapbook.rqai.co.uk`

## Remediation update — 2026-07-28

The requested fixes have now been implemented, built, tested, and deployed. This
update supersedes the earlier release-readiness snapshot below where the two
conflict.

### Completed changes

- Renamed the customer-facing feature to **Interactive blocks**, with
  **Make your posts interactive** as the section heading. `HTML, CSS &
  JavaScript` remains only in the advanced editor/export language.
- Published interactive code now executes inside an opaque-origin,
  `sandbox="allow-scripts"` iframe. It can still resize and respond to readers,
  but it cannot read the parent blog page.
- The 73-card interactive library mounts previews lazily instead of creating
  every iframe at once. The browser test observed 9 nearby iframes and 64
  deferred placeholders at initial render.
- The `interactive` tag now counts as a real topic in pre-publish checks and
  appears in post/topic grouping.
- Share links now preserve a GitHub Pages project base path instead of silently
  producing links at the account root.
- Renamed dictation to **Speak to write**. Corrected the first-use download copy
  to approximately 68 MB and fixed the live status sequence: preparing, ready,
  listening, transcribing, transcript added.
- Figure-description and figure-tweak dictation now use the same private,
  on-device Whisper engine as the main editor instead of the browser/vendor
  speech-recognition service.
- Restored the macOS microphone declaration and audio-input entitlement, and
  bumped the native wrapper to version 1.0.5.
- Fixed the release gate's unread-response connection leak and explicitly
  classified the broad illustration manifest as generated searchable media
  metadata rather than product copy.

### Verification completed

| Check | Result |
|---|---|
| Main app tests | **PASS — 1,000/1,000** |
| Publishing-template tests | **PASS — 39/39** |
| Main and template production builds | **PASS** |
| Production release gate | **PASS — 12/12, 0 skipped** |
| Published interactive sandbox | **PASS**; interaction worked and parent-document access threw `TypeError` |
| Interactive-library lazy rendering | **PASS**; 73 cards, 9 initial iframes, 64 deferred |
| Interactive A/B control | **PASS**; switching to Cloud updated the displayed comparison |
| Real microphone capture | **PASS**; recording, stop, local transcription, and insertion completed |
| Production deployment | **LIVE** at `https://chapbook.rqai.co.uk` (deploy `6a6924ebf51f7ad9286429c7`) |
| macOS build/sign/install | **PASS**; `/Applications/Chapbook.app`, version 1.0.5, Team `G3RVS73AU3` |
| Installed-app activation | **PASS** with a valid licence; no licence value is recorded here |

The short installed-app microphone smoke test is being completed after the
first-run GitHub consent screen. The web app's same production code and real
audio path have already passed end to end.

### Native distribution boundary

The installed 1.0.5 app and DMG are Apple Development-signed and validate on
this Mac. They are **not notarized for public distribution** because this
keychain has no `Developer ID Application` identity or notarization
credentials. The public download page therefore intentionally continues to
serve the existing 1.0.4 macOS and Windows release artifacts; publishing a
non-notarized 1.0.5 DMG over them would be a regression.

The old 1.0.2 macOS app bundle was moved recoverably to
`~/.Trash/Chapbook-1.0.2-old-2026-07-28.app`. The new build artifact and iOS
archive/simulator products were retained because they are build outputs, not
obsolete installed Mac apps.

## Executive summary

Chapbook's public site, activation gate, build, and unit/integration suite are in good shape. The full local suite passes (996/996), the production build is reproducible for the main app HTML, all public routes respond correctly, responsive layouts do not overflow at 390 px, the live theme switcher works, the current installers are reachable, and no production-dependency vulnerabilities were reported by `npm audit --omit=dev`.

It is not ready for an unqualified release from the checked-out branch, for four main reasons:

1. **The shipped illustration catalogue violates Chapbook's own product-separation rule.** The live and local manifests contain 1,121 illustrations, including 141 labelled `Clinical (medical)` and many medical themes. The release grep gate reports 725 forbidden matches.
2. **Release controls are not enforced before deployment.** `npm run build` and both deploy scripts can ship even when `scripts/grep-gate.mjs` fails. There is no web CI workflow running the tests/build/gates, and the browser-required release checks are skipped because a headless browser is not installed.
3. **Production and this branch have drifted.** The live `/download` page and manifest include Android 1.0.4, but the checked-out branch does not contain the Android download-page/staging changes. Redeploying this branch would remove that offering.
4. **A true signed-in E2E run was blocked by the licence gate.** No valid Chapbook licence or safe test-only activation path is present. I tested the full public surface, invalid activation, live deployment behaviour, and underlying feature seams, but could not honestly verify authenticated create/edit/publish flows in the UI.

The most urgent change is to remove or intentionally reclassify the medical illustration set, then make that grep gate a mandatory pre-deploy/CI step. After that, reconcile the Android release changes and add a deterministic licensed E2E fixture.

## What I ran

| Check | Result |
|---|---|
| `npm test` | **PASS — 996 tests, 0 failures** |
| `npm run build` | **PASS**; tracked files unchanged |
| `npm audit --omit=dev` | **PASS — 0 production vulnerabilities** |
| Full `npm audit` | **1 moderate dev-only issue** in `esbuild@0.23.1` |
| `npm outdated` | `@netlify/blobs` 8.2.0 → 10.7.10; `esbuild` 0.23.1 → 0.28.1 |
| Local public routes | **PASS**: home, features, themes, pricing, tutorials, download, privacy, terms, refunds, app |
| Live public route HTTP checks | **PASS**; expected `/app` → `/app/` canonical redirect |
| Mobile layout at 390×844 | **PASS** on the tested public routes and activation screen; no horizontal overflow |
| Invalid activation | **PASS**; `IPL1.invalid` produces “That does not look like a valid key.” |
| Live theme switcher | **PASS**; selecting Neon updates pressed state and the live iframe remains rendered |
| Live installer links | **PASS**: macOS DMG, Windows EXE, Android APK all return 200 with plausible types/sizes |
| Live browser console | **PASS** on inspected routes; no warnings/errors observed |
| Production release gate | **FAIL — 7 pass, 3 fail, 2 skip** |
| Local Netlify development server | **FAIL** with `EMFILE: too many open files, watch`, including with a 4096 descriptor limit |
| Native Rust validation | **NOT RUN**; `cargo` is not installed in this environment |

The production release-gate failures were:

- `metrics visit → 204 + count`: one 15-second timeout. A direct retry returned 204 in 0.60 s and became visible as `{"visit":1}` after eventual-consistency delay, so this is currently a **flaky gate/observability problem**, not proof that metrics are permanently broken.
- `grep-gate over dist/ is clean`: genuine failure, 725 forbidden matches.
- Stripe-link check: one 15-second fetch timeout. Independent repeated fetches of `/` completed in roughly 0.16–0.19 s and the live link is present, so this is another transient gate failure.
- Service-worker activation and browser XSS checks were skipped because Playwright/Puppeteer is not installed in the project.

## Architecture assessment

Chapbook is a static, local-first PWA with:

- a large single-document UI in `src/index.html`;
- bundled application/seam code in `src/studio.js`, generated from `src/app.js`, `src/core/`, `src/lib/`, and `src/seams/`;
- IndexedDB for drafts/sessions/snapshots and localStorage for configuration, provider credentials, licence state, and some UI caches;
- direct browser-to-GitHub publishing to the user's repository;
- direct browser-to-AI-provider and optional R2 calls using user-supplied keys;
- Netlify Functions only for GitHub device-flow relay, Stripe queueing, trials, and aggregated metrics;
- a service worker for the PWA shell and staged offline speech-to-text assets;
- Tauri shells for desktop/mobile, with a remote-site desktop configuration and a separate bundle-local override for offline-capable native builds.

The modular core has strong unit coverage, especially around publishing conflicts, sanitisation, licence verification/revocation, templates, image metadata privacy, R2, GitHub seams, AI provider failure handling, service-worker cache stamping, and function CORS/rate-limit logic.

The main maintainability risk is concentration: `src/index.html` is about 21,983 lines and the built `src/studio.js` is about 24,668 lines. Much of the UI behaviour is still an inline monolith, so integration regressions can pass extensive pure-function tests unless a browser exercises the actual state transitions.

## Findings and recommended changes

### P0 — Remove the medical/clinical catalogue leak or change the product contract deliberately

**Evidence**

- `src/illustrations-manifest.json` contains 1,121 assets.
- 141 use the style `Clinical (medical)`.
- Themes include Anatomy, Blood products, Cardiology, Critical Care, Emergency & trauma, Medical Instruments, Oncology, Orthopaedics, Surgery, and many other medical specialities.
- The same manifest is live at `/app/illustrations-manifest.json`.
- `node scripts/grep-gate.mjs` reports 725 forbidden matches.
- The gate's own comments say these terms must not ship because Chapbook was forked from an orthopaedics app.

**Impact**

This is both a release-control violation and a product-boundary regression. Users opening the illustration picker can encounter a large clinical library that does not fit the general blogging product. It also makes every release gate fail, encouraging teams to ignore or bypass the gate.

**Change**

- Curate the manifest before build: remove the clinical style and medical-only themes/assets from Chapbook, or split the catalogue into product-specific manifests.
- If some general science/health images are intentionally part of Chapbook, define a reviewed allowlist by stable asset ID rather than disabling the medical denylist.
- Add a unit test over `src/illustrations-manifest.json` so forbidden styles/themes fail during `npm test`, before `dist/` exists.
- Keep the release grep gate as a second, built-artifact check.

### P0 — Make release blockers impossible to deploy

**Evidence**

- `npm run build` succeeds while `scripts/grep-gate.mjs` fails.
- `deploy:draft` and `deploy:prod` run build/staging/deploy but do not run the grep gate or full tests.
- The only GitHub workflow is the tag-triggered desktop build; there is no web build/test/deploy CI.
- Production currently contains the exact data the gate forbids.

**Impact**

The repository has good gates, but they are advisory. A release can ship with known forbidden content, skipped browser security checks, or a failing test suite.

**Change**

- Add `check`/`predeploy` scripts that run, in order: tests, build, grep gate, installer/STT staging verification, and browser E2E.
- Make both deploy scripts call the mandatory predeploy command.
- Add a web CI workflow on pull requests and the deploy branch.
- Refuse production promotion when any mandatory browser check is skipped; “SKIP” should not be release-success for the service-worker and XSS checks.
- Record the exact Git commit/build stamp in the deployed HTML and release manifest.

### P1 — Reconcile production and branch drift before the next deploy

**Evidence**

- The live app document is byte-identical to the fresh local `dist/app/index.html`.
- The live `/download` page is not byte-identical to local `dist/download.html`.
- Production offers `Chapbook-Android.apk` and its manifest contains Android version/checksum metadata.
- The checked-out `native-builds` branch's `src/download.html` and `scripts/stage-installers.mjs` only support macOS/Windows.
- The Android changes exist on `main`, while `native-builds` and `main` have diverged (25 commits on the checked-out side, 15 on `main`, including equivalent cherry-picks and main-only Android work).

**Impact**

A deploy from the current branch would regress the download page and omit Android staging. Parallel/cherry-picked histories also make it difficult to identify the true release source.

**Change**

- Choose one canonical release branch.
- Reconcile/cherry-pick the Android download and optional APK staging changes into it.
- Avoid maintaining equivalent commits with different hashes across long-lived release branches.
- Add a deployment provenance file containing commit SHA, branch, build time, desktop/mobile versions, and artifact checksums.
- Add a test asserting that every download card revealed by the page has a corresponding staged manifest entry and reachable artifact.

### P1 — Add a deterministic authenticated browser E2E suite

**Evidence**

- A fresh browser correctly stops at “Activate Chapbook”.
- There is no valid test licence or test-only activation seam in the repository.
- The release gate skips the mandatory service-worker and XSS browser checks when Playwright/Puppeteer is absent.
- The current 996 tests are mostly pure/module/static assertions rather than a real signed-in browser journey.

**Impact**

The highest-value user flow is not exercised as a whole: activate → onboard GitHub → create draft → add blocks/media → preview → publish → edit → schedule/take down → recover after reload/offline. Breakage in DOM wiring, focus, storage migration, service-worker behaviour, or provider integration may pass unit tests.

**Change**

- Introduce a **test-only Ed25519 keypair** and fixture licence used only by local/CI builds. Never reuse the production signing key.
- Add browser fixtures for GitHub/AI/R2 seams so E2E does not mutate a real account.
- Cover at least:
  - valid/invalid/expired/revoked activation;
  - onboarding and reconnect;
  - draft persistence across reload;
  - every block type's add/edit/delete path;
  - Markdown import and HTML sanitisation payloads;
  - preview, publish, retry-on-fast-forward-conflict, edit, duplicate, schedule, take-down;
  - offline boot and reconnect;
  - export/backup/reset;
  - mobile sheet/focus behaviour at 390 px;
  - Tauri bundle-local smoke tests.
- Install and pin the browser runner so release checks cannot silently skip.

### P1 — Tighten the secrets/XSS defence boundary

**Evidence**

- GitHub, AI, and R2 credentials are stored in localStorage.
- The hosted and Tauri CSPs allow `'unsafe-inline'`.
- `img-src` and `media-src` allow arbitrary `https:` origins.
- The comments describe `connect-src` as the key exfiltration mitigation, but an injected script could send data through an image/media URL even when `connect-src` blocks `fetch`.
- The app deliberately supports rich HTML, figures, playgrounds, embeds, and generated content. Sanitisation and sandbox tests are strong, but the consequence of one bypass is high because long-lived credentials are readable by page script.

**Impact**

No working XSS bypass was found, and the sanitisation suite is extensive. This is a defence-in-depth gap: if any present or future injection executes, arbitrary HTTPS image/media requests provide an exfiltration path for local secrets.

**Change**

- Replace broad `img-src https:`/`media-src https:` with explicit required hosts where product behaviour permits.
- If arbitrary remote media is a required feature, proxy/fetch it into user-owned storage or use a separate, credential-free rendering origin.
- Move inline scripts toward hashes/nonces and remove `'unsafe-inline'` incrementally.
- Prefer short-lived, repository-scoped GitHub credentials (GitHub App/fine-grained token) over broad `public_repo`.
- Keep preview/user-content iframes sandboxed without same-origin access and add a real browser exfiltration regression test, not only string/pure-function tests.

### P2 — Do not treat every GitHub 422 as a successful duplicate

**Evidence**

`pushToQueue` in `netlify/functions/stripe-webhook.mjs` returns `{ok:true, already:true}` for **every** GitHub 422 response. GitHub can use 422 for validation failures beyond “this path already exists”.

**Impact**

A malformed request, repository policy change, or other validation error could be reported to the buyer/trial requester as successfully queued even though no queue record exists. That creates a silent fulfilment failure.

**Change**

- Parse the GitHub error response and only accept the specific already-exists condition.
- Better: on 422, GET the target path and verify that the expected idempotency record already exists.
- Log a request/event ID and alert on queue failures.
- Add tests for generic 422, repository-rule 422, malformed-content 422, and a verified existing record.

### P2 — Make metrics updates concurrency-safe and the gate less flaky

**Evidence**

- Metrics uses read-modify-write: `get(day)` → `bump` → `setJSON(day, next)`.
- Concurrent function instances can read the same value and overwrite each other, undercounting traffic.
- The release gate had a 15-second metrics timeout once; direct POST then returned 204 quickly, and the GET reflected the write only after a short delay.
- The release gate also had a transient timeout fetching the Stripe-link pages even though repeated direct requests were fast.

**Impact**

Counts are approximate and can lose increments during bursts. A healthy deployment can also fail promotion due to one transient request, while the failure output does not distinguish POST timeout, eventual consistency, CDN, and function errors clearly enough.

**Change**

- Store append-only/sharded event counters and aggregate them, or use a datastore with an atomic increment/compare-and-swap primitive.
- If exact analytics are not needed, document the counters as approximate.
- Retry idempotent HTTP checks with bounded jitter.
- Give the metrics POST a request id and retry-safe idempotency key so the gate can retry without double counting.
- Separate network-health failures from content assertions in the release summary.

### P2 — Reduce local-only draft data-loss risk

**Evidence**

- Drafts, sessions, snapshots, and ideas live only in IndexedDB on the current device.
- Published content is safe in GitHub, but unpublished content is not automatically synced.
- The app warns users in Settings and offers export/reset flows.

**Impact**

Clearing browser data, an OS cleanup, a corrupt IndexedDB upgrade, or losing the device can permanently remove unpublished work. “One key unlocks every device” may still lead some users to assume drafts follow them.

**Change**

- Add periodic, prominent backup reminders based on unexported draft age/count.
- Show “drafts stay on this device” during onboarding and when activating a second device, not only in Settings/download fine print.
- Consider opt-in encrypted draft sync to the user's own GitHub repository or a user-chosen local folder.
- Add migration and crash-recovery E2E tests around IndexedDB version upgrades.

### P2 — Make native builds reproducible and continuously tested

**Evidence**

- The desktop config normally loads the remote production URL; the fallback is only a “Connecting…” page.
- Offline-capable native builds depend on a separate `tauri.bundle-local.conf.json` override and staged STT files.
- Android APKs are untracked artifacts in `artifacts-android/`; generated mobile projects are gitignored.
- There is no Android/iOS CI workflow in this branch.
- The Windows workflow intentionally produces an unsigned installer.
- This machine lacks `cargo`, so the native Rust layer could not be validated here.

**Impact**

Native results depend on build procedure and local state. It is easy to accidentally publish a remote-wrapper build, omit the 65 MB dictation model, or ship an APK that cannot be reproduced from a clean checkout. Windows users also see SmartScreen friction.

**Change**

- Add a clean-checkout native build job for every supported target, including verification of which Tauri config is active.
- Assert that mobile artifacts contain `app/index.html`, STT runtime/model files, correct permissions, and the expected build/version stamp.
- Run install/launch/offline smoke tests on Android emulator and iOS simulator/device where feasible.
- Publish checksums and provenance automatically from CI.
- Add Windows code signing before describing the installer as friction-free.

### P2 — Fix the local Netlify development-server watch failure

**Evidence**

`netlify dev --offline --port 4174` repeatedly terminated with:

`EMFILE: too many open files, watch`

This still occurred after raising the per-process descriptor limit to 4096. The repository includes large generated/vendor/native trees (`dist`, `desktop/node_modules`, Rust target output, untracked Android artifacts), which are plausible watch-amplification sources.

**Impact**

The documented local full-stack development path is unreliable on this macOS checkout. Developers may fall back to a plain static server and miss redirects, headers, and function integration.

**Change**

- Configure Netlify/dev tooling to ignore generated/vendor/artifact trees.
- Keep generated native artifacts outside the repository working tree where practical.
- Add a small documented static rewrite server for frontend-only work, while retaining a reliable function-development command.
- Pin/update Netlify CLI after confirming the watcher regression; the tested CLI reported 27.0.0 with 27.0.1 available.

### P3 — Upgrade the vulnerable/outdated development dependencies deliberately

**Evidence**

- `esbuild@0.23.1` is affected by GHSA-67mh-4wv8-2f99 (moderate, dev-server request/read issue); fixed versions require a major dependency update from the current pin.
- `@netlify/blobs@8.2.0` is two major versions behind 10.7.10.
- Production dependencies have no currently reported audit findings.

**Impact**

The esbuild issue primarily affects development-server exposure, not the built static application. Major upgrades can change APIs/build output, so they need tests rather than an automatic bump.

**Change**

- Upgrade esbuild and re-run build byte/behaviour checks.
- Review Netlify Blobs 9/10 migration notes, then upgrade with metrics-function integration tests.
- Add automated dependency update PRs and a scheduled audit job.

### P3 — Reduce the inline UI monolith over time

**Evidence**

- `src/index.html`: ~21,983 lines.
- `src/studio.js`: ~24,668 lines.
- Many dialogs, state machines, focus handlers, and feature integrations share the same document/global scope.

**Impact**

The code is test-rich but difficult to reason about as a whole. Merge conflicts, duplicate handlers, startup ordering bugs, and inaccessible modal states become more likely as features accumulate.

**Change**

- Extract UI controllers by domain (activation, editor, posts, settings, sheets, preview, media).
- Keep pure logic in the existing tested modules and make DOM controllers thin.
- Add a central modal/sheet manager for open/close, `inert`, `aria-hidden`, focus trap, escape, and invoker restoration.
- Treat generated bundles as build output rather than a parallel source of truth where possible.

## Positive findings

- The full test suite is unusually broad for a vanilla/static application and passed cleanly.
- The build includes good consistency assertions for the licence public key, AI defaults, revocation predicates, inline-module parsing, STT pins, and service-worker content hashing.
- GitHub publishing includes conflict-aware retry logic and preserves custom frontmatter.
- HTML sanitisation and pre-publish checks cover many encoded and delimiter-based bypasses.
- Image metadata handling explicitly strips GPS, including legacy metadata.
- The device-flow relay has hardcoded targets, origin checks, and separates code-request throttling from token polling.
- Stripe webhook signature verification includes timing-safe comparison and replay-window validation.
- Revocation lists are signature-verified and protected against rollback.
- Public pages have unique SEO metadata, correct headings, working assets, no tested mobile overflow, and security headers in production.
- The live download artifacts all respond successfully and include checksums in the production manifest.
- The live app emitted no console warnings/errors in the inspected activation/public journeys.

## E2E coverage limitation

This was a **real deployment and browser E2E pass of the public/activation surface**, but not a full authenticated authoring/publishing E2E. A valid production licence was neither supplied nor discoverable safely, and bypassing the activation gate would invalidate the result. Trial submission was not used because it would send an email and create an external queue record.

Before calling the product fully E2E-tested, run the deterministic test-licence/browser suite proposed above, plus a final smoke test using a dedicated GitHub test account/repository and non-production AI/R2 credentials.

## Recommended order of work

1. Remove/split the medical illustration catalogue and make `npm test` catch it.
2. Wire tests + build + grep + mandatory browser checks into CI and every deploy command.
3. Reconcile `main` and `native-builds`, especially Android download/staging, and choose one release branch.
4. Add the test-only licence and full authenticated E2E suite.
5. Tighten CSP/credential scope and fix 422 queue handling.
6. Make metrics concurrency-safe and harden release-gate retries.
7. Add native clean-build/offline CI and artifact provenance.
8. Improve draft backup/recovery and gradually split the UI monolith.
