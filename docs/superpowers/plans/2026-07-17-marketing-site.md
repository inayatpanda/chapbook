# Chapbook marketing site + /app move — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** chapbook.rqai.co.uk stops greeting strangers with the activation gate. Root (`/`) becomes a multi-page marketing site (`/`, `/features`, `/themes`, `/pricing`, `/download`, plus static `/privacy` `/terms` `/refunds`); the Studio moves to `/app`; a boot-shim on `/` sends licensed users straight to `/app`. CTA model is trial-first.

**Architecture:** No new toolchain. Hand-authored static HTML pages + one shared `marketing.css` + shared nav/footer partials injected by `build.mjs` at build time (same pattern as `download.html`). `build.mjs` emits marketing pages at the dist root, the app at `dist/app/index.html` (app asset paths are root-relative, so no app-code rewriting), vendored blog-theme CSS under `/themes-css/`, and marketing media under `/media/`. Legal pages are extracted at build from `src/index.html`'s legal modal blocks (single source, no copy fork). Demos are real product: trimmed tutorial video loops, a live 20-theme switcher on real vendored theme CSS, one live embedded reader interactive baked from the app's own playground engine, and headless app screenshots.

**Tech Stack:** Static HTML + CSS + vanilla JS. Node 22 build (`build.mjs`, esbuild already a devDependency). `node --test` for the test suite. Netlify hosting (`netlify.toml` CSP + headers, `_redirects`, `netlify/functions/`). Tauri desktop shell. Playwright (dev-only, resolved from `node_modules` when present) for headless screenshots + the release-gate browser checks.

---

## Global Constraints (copy these verbatim into every task's working context)

- **No new toolchain.** No bundler, framework, or npm dependency beyond what `package.json` already declares (`@netlify/blobs`, `aws4fetch`, `dompurify`; devDep `esbuild`). Pages are hand-authored static HTML.
- **CSP must hold (netlify.toml).** Current policy: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; media-src 'self' blob: https:; connect-src 'self' https://api.anthropic.com https://api.openai.com https://generativelanguage.googleapis.com https://api.groq.com https://api.crossref.org https://github.com https://api.github.com https://*.workers.dev https://*.r2.dev https://inayatpanda.com; font-src 'self'; frame-src 'self' https://www.youtube-nocookie.com https://player.vimeo.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`. No external hosts. All CSS/JS/fonts/media are same-origin (`'self'`), inline (`'unsafe-inline'`), or `data:`/`blob:`. **Do not add external CDN/font/script hosts.** The ONLY sanctioned netlify.toml change in this plan is a scoped per-path header override that relaxes framing for the themes-preview document (Task 6) — the global policy is otherwise untouched.
- **Copy rules:** feature-led, factual, no hype. **NO em-dashes (U+2014 `—`) in any visible shipped text.** Use commas, periods, or parentheses. En-dashes and hyphens in data (e.g. theme metadata) are tolerated but authored marketing copy spells ranges out ("ages 10 to 15"). Task 9 lints dist for U+2014 in marketing HTML.
- **No clinical/PII terms (grep-gate).** `scripts/grep-gate.mjs` runs over all of `dist/` and fails on: `inayatpanda` (except the allowlisted `https://inayatpanda.com/licences/revoked.json`), `studio@`, `admin token`, `X-Admin-Token`, `npm run tunnel`, `Connect to my Helm`, `Set up your Studio`, `hosted Studio`, `/admin/api/login`, `buy.stripe.com/test_`, `videoHelmReachable`, and the clinical denylist `/fracture/i /periosteum/i /callus/i /orthop/i /osteo/i /\bclinical\b/i` + `knife to skin. the patient`. Marketing copy must contain none of these. In particular do NOT write "hosted Studio" or "Set up your Studio"; use "the app" / "Chapbook". Use `support@rqai.co.uk` for all contact (never `studio@`).
- **One-writer-at-a-time on shared files.** `src/index.html`, `build.mjs`, `src/sw.js`, and `scripts/release-gate.mjs` must never be edited by two workers concurrently. `src/index.html` is 19k lines and is **not modified by any task in this plan** (the legal blocks are READ at build; the boot-shim lives in the new marketing home). `build.mjs` is edited by Tasks 1-5 and MUST be done sequentially by a single owner in task order. `src/sw.js` is edited only by Task 1. `scripts/release-gate.mjs` is edited only by Task 9.
- **£49/yr price is single-sourced, not scattered.** There is NO price literal in the app source (verified: no `£49` anywhere in `src/`). Define the price ONCE as a build constant `PRICE` in `build.mjs` (env override `CHAPBOOK_PRICE`, default `£49`) and inject it into every marketing page via the `%%PRICE%%` token. The live Stripe checkout is the ultimate source of truth for what is actually charged; Task 7 includes an owner verification step that £49/yr matches the live Stripe amount before prod.
- **Live Stripe link is read from app source at build.** Do not hardcode a stale link in pages. `build.mjs` extracts the buy URL from `src/index.html` (currently `https://buy.stripe.com/5kQeVd0C06t7aSLf3IgUM05?client_reference_id=studio`, line 2753) and injects it via the `%%STRIPE_BUY_URL%%` token. `scripts/release-gate.mjs` already asserts `buy.stripe.com/5kQeVd0C06t7aSLf3IgUM05` is present in `/` HTML and `buy.stripe.com/test_` is absent.
- **Licence localStorage key is `helm.studio.licence`** (verified `src/index.html:19020`, `const LIC_STORE='helm.studio.licence'`). Config key is `helm.studio.config.v1` (`src/index.html:4622`). The boot-shim and the screenshot harness both use these exact strings.

### Key source anchors (verified)

| Thing | Location |
|---|---|
| Licence store key `helm.studio.licence` | `src/index.html:19020` |
| Config key `helm.studio.config.v1` | `src/index.html:4622` |
| Live Stripe buy URL | `src/index.html:2753` |
| Licence public key (Ed25519 hex) | `src/index.html:2742` |
| Legal blocks `#legal-privacy` / `#legal-terms` / `#legal-refunds` (each `<div id="legal-<kind>" hidden>…</div>`) | `src/index.html:4617-4649` / `4651-4689` / `4691-4710` |
| Legal modal titles map `{privacy:'Privacy',terms:'Terms of use',refunds:'Refund policy'}` | `src/index.html:5949` |
| Licence expiry → `reason:'expired'` | `src/index.html:19124-19128` |
| Licence gate: lapse → remove key + show activation (`$('licence').style.display='block'`) | `src/index.html:19168-19193` |
| Engine `<script>` injection (currently `./studio.js`, RELATIVE — must become `/studio.js`) | `build.mjs:126` |
| Verbatim copy-list | `build.mjs:139` |
| `_redirects` written (canonical-host 301 only) | `build.mjs:156-157` |
| SW `CACHE='chapbook-v5'` + `SHELL` array | `src/sw.js:11-13` |
| SW fetch fallback `caches.match('/')` | `src/sw.js:26` |
| SW registration `/sw.js` (scope '/') | `src/index.html:18875` |
| manifest `id`/`start_url`/`scope` all `/` | `src/manifest.json:5-7` |
| Trial backend (no client UI exists) `POST {email,product?}` | `netlify/functions/trial-request.mjs` |
| release-gate check8 hardcodes stale `chapbook-v1` | `scripts/release-gate.mjs:337,341-342` |
| Themes registry (20 themes, 5 categories) | `~/Projects/chapbook-template/src/data/themes.json` |
| Theme CSS + `_kids-extras.css` | `~/Projects/chapbook-template/src/styles/themes/*.css` |
| Base + aggregator + fonts CSS | `~/Projects/chapbook-template/src/styles/{global.css,themes.css,fonts.css}` |
| Template post DOM | `~/Projects/chapbook-template/src/pages/blog/[slug].astro` |
| Playground build contract `buildInstance(familyId, params, domId) → {html,css,js}` | `src/lib/playgrounds/index.js` |

### Spec ambiguities resolved (baked into the tasks below)

1. **"Existing trial-request flow" has no UI.** Only the backend `netlify/functions/trial-request.mjs` exists; the `/app` gate has a licence input + "Buy a key" link, no trial capture. **Resolution:** the marketing site builds its own trial email-capture (inline form + inline JS) that POSTs `{email, product:'studio'}` to `/.netlify/functions/trial-request` (same-origin; `chapbook.rqai.co.uk` is already an allowed origin; `'studio'` is the only allowed product and an omitted product is also accepted). This IS the genuine trial backend. Shared partial `src/marketing/_trial.html`.
2. **X-Frame-Options DENY + frame-ancestors 'none' block same-origin framing** of the themes sample-post document. **Resolution (Task 6):** add a scoped `[[headers]]` override in `netlify.toml` for `/themes-css/sample-post.html` setting `X-Frame-Options = "SAMEORIGIN"` and a CSP with `frame-ancestors 'self'`; switch themes via `postMessage` from the `/themes` page to the framed doc.
3. **`build.mjs` injects `./studio.js` (relative).** At `/app/index.html` that resolves to `/app/studio.js` (404). **Resolution (Task 1):** change the injection to `/studio.js` (root-relative). All other app asset refs in `src/index.html` are already root-relative (verified: `/manifest.json`, `/icons-sprite.svg`, `/preview.css`, `/resize.js`, `/darkroom-upload.js`, `/apple-touch-icon.png`, `/fonts/*`).
4. **release-gate check8 hardcodes `chapbook-v1`** while the live cache is `chapbook-v5` (soon `v6`). **Resolution (Task 9):** make check8 read the `CACHE` name from `dist/sw.js` dynamically.
5. **£49 price literal absent from source.** See Global Constraints — single-sourced as build constant + owner verification.
6. **Legal single-source extraction brittleness.** **Resolution (Task 1):** extract by matching `<div id="legal-<kind>" hidden>` … up to its closing `</div>` at column 0 of the next sibling; tests assert extraction is byte-identical to the source inner HTML. If a block id is missing, the build throws. Fallback (spec-sanctioned) if extraction proves brittle: a single shared source file included by both, but attempt build-time extraction first.

---

## Marketing source layout (created by this plan)

```
src/marketing/
  marketing.css          # shared tokens (lifted from download.html) + components
  _nav.html              # nav partial (marker-injected)
  _footer.html           # footer partial (marker-injected)
  _trial.html            # trial email-capture partial + inline JS (marker-injected)
  index.html             # home  → dist/index.html          (Task 4)
  features.html          # /features → dist/features.html    (Task 5)
  themes.html            # /themes → dist/themes.html        (Task 6)
  pricing.html           # /pricing → dist/pricing.html      (Task 7)
  og-image.png           # 1200x630 share card (generated once, committed)
  legal.template.html    # wrapper the extracted legal copy is poured into (Task 1)
  themes-css/            # vendored blog-theme assets           (Task 3)
    global.css themes.css fonts.css _kids-extras.css sample-post.html
    themes/<20 ids>.css
    fonts/<Fraunces|Newsreader|Fredoka|Atkinson woff2 + OFL>
  media/                 # loops + screens (mostly from parallel pipeline)
    loops/<name>.{webm,mp4,jpg}   screens/*.png   (Tasks 5,6,9)
```

`build.mjs` marker/token contract (used by all injected pages, defined in Task 1's `build-marketing.mjs`):

| Marker / token | Replaced with |
|---|---|
| `<!-- MKT:NAV -->` | contents of `src/marketing/_nav.html` |
| `<!-- MKT:FOOTER -->` | contents of `src/marketing/_footer.html` |
| `<!-- MKT:TRIAL -->` | contents of `src/marketing/_trial.html` |
| `%%STRIPE_BUY_URL%%` | live Stripe URL extracted from `src/index.html` |
| `%%PRICE%%` | `PRICE` constant (`£49`, env `CHAPBOOK_PRICE`) |
| `%%YEAR%%` | current UTC year (footer copyright) |

CSS class contract (all pages share `marketing.css`): `.mkt-nav`, `.mkt-nav a`, `.mkt-nav .cta`, `.mkt-foot`, `.mkt-wrap` (`width:min(1080px,100% - 2*clamp(18px,5vw,48px));margin-inline:auto`), `.btn-primary` (filled teal→cyan), `.btn-ghost` (teal outline), `.eyebrow`, `.section`, `.card`, `.trial-form`, `.trial-msg`. These names are stable across every task; do not rename.

---

## Task 1 — App moves to `/app` + boot-shim + build plumbing + legal extraction

**Files:**
- Create `src/marketing/build-marketing.mjs` (pure, importable helpers).
- Create `src/marketing/legal.template.html` (legal page wrapper).
- Create `build-marketing.test.mjs` (repo root, `node --test`).
- Modify `build.mjs` (app → `dist/app/index.html`; placeholder root index; theme/media copy hooks come in Tasks 2-5; legal extraction; `./studio.js`→`/studio.js`; `_redirects` `/app` rule).
- Modify `src/sw.js` (SHELL `/`→`/app`; scoped offline fallback; `CACHE` v5→v6).
- Modify `src/manifest.json` (`start_url`+`scope`→`/app`; `id` unchanged).
- Create `src/marketing/index.html` PLACEHOLDER (real home is Task 4) — a minimal valid HTML doc carrying ONLY the boot-shim + a "Chapbook" line, so the site builds and boots before Task 4 lands.

**Interfaces:**
- Consumes: `src/index.html` (read-only: legal blocks by id, live Stripe URL, engine bundle name).
- Produces: `dist/app/index.html` (the app), `dist/index.html` (marketing home placeholder → real in Task 4), `dist/privacy.html` `dist/terms.html` `dist/refunds.html`, updated `dist/sw.js`, updated `dist/manifest.json`, updated `dist/_redirects`.
- `build-marketing.mjs` exports (pure functions, no fs side-effects):
  - `extractStripeUrl(indexHtml) → string` — regex `/https:\/\/buy\.stripe\.com\/[A-Za-z0-9_]+\?client_reference_id=studio/`; throws if absent.
  - `extractLegalBlock(indexHtml, kind) → string` — inner HTML of `<div id="legal-<kind>" hidden> … </div>`; throws if the block is missing.
  - `LEGAL_TITLES = { privacy:'Privacy', terms:'Terms of use', refunds:'Refund policy' }` (mirrors `src/index.html:5949`).
  - `renderLegalPage({kind, title, inner, nav, footer, year}) → string` — pours `inner` into `legal.template.html`.
  - `injectMarketing(pageHtml, {nav, footer, trial, stripeUrl, price, year}) → string` — replaces every marker/token above.
- Boot-shim contract (goes in `src/marketing/index.html`, and later stays in Task 4's real home, as the FIRST element in `<head>`, before any paint):
  ```html
  <script>
  /* Boot-shim: a licensed visitor never sees marketing. Runs before first paint.
     localStorage is origin-scoped, so '/' can read the key the app wrote at '/app'. */
  try { if (localStorage.getItem('helm.studio.licence')) location.replace('/app'); } catch (e) {}
  </script>
  ```

**Steps:**

- [ ] Write the failing test first. Create `build-marketing.test.mjs`:
  ```js
  import { test } from 'node:test';
  import assert from 'node:assert/strict';
  import { readFileSync } from 'node:fs';
  import { extractStripeUrl, extractLegalBlock, LEGAL_TITLES, renderLegalPage, injectMarketing } from './src/marketing/build-marketing.mjs';

  const idx = readFileSync('src/index.html', 'utf8');

  test('extractStripeUrl finds the live client_reference_id=studio link', () => {
    const u = extractStripeUrl(idx);
    assert.match(u, /^https:\/\/buy\.stripe\.com\/[A-Za-z0-9_]+\?client_reference_id=studio$/);
    assert.ok(!u.includes('test_'));
  });

  test('extractLegalBlock returns non-empty inner HTML for all three kinds', () => {
    for (const kind of ['privacy', 'terms', 'refunds']) {
      const inner = extractLegalBlock(idx, kind);
      assert.ok(inner.length > 200, `${kind} block too short`);
      assert.ok(!inner.includes('id="legal-'), 'must be INNER html only');
    }
    // spot-check anchors that must survive extraction verbatim
    assert.match(extractLegalBlock(idx, 'privacy'), /local-first/);
    assert.match(extractLegalBlock(idx, 'terms'), /RQAI Ltd/);
    assert.match(extractLegalBlock(idx, 'refunds'), /14 days/);
  });

  test('extractLegalBlock throws on a missing block', () => {
    assert.throws(() => extractLegalBlock('<p>no legal here</p>', 'privacy'));
  });

  test('injectMarketing replaces every marker and token', () => {
    const out = injectMarketing(
      '<!-- MKT:NAV -->\n%%PRICE%% at %%STRIPE_BUY_URL%% (c) %%YEAR%%\n<!-- MKT:FOOTER -->\n<!-- MKT:TRIAL -->',
      { nav: 'NAVBAR', footer: 'FOOT', trial: 'TRIALFORM', stripeUrl: 'https://buy.stripe.com/X?client_reference_id=studio', price: '£49', year: '2026' });
    assert.ok(out.includes('NAVBAR') && out.includes('FOOT') && out.includes('TRIALFORM'));
    assert.ok(out.includes('£49') && out.includes('2026') && out.includes('buy.stripe.com/X'));
    assert.ok(!out.includes('%%') && !out.includes('MKT:'), 'no markers/tokens left');
  });

  test('renderLegalPage produces a full standalone document', () => {
    const html = renderLegalPage({ kind: 'privacy', title: LEGAL_TITLES.privacy, inner: '<p>hi</p>', nav: 'N', footer: 'F', year: '2026' });
    assert.match(html, /<!doctype html>/i);
    assert.match(html, /<title>Privacy/);
    assert.match(html, /<link rel="canonical" href="https:\/\/chapbook\.rqai\.co\.uk\/privacy">/);
    assert.ok(html.includes('<p>hi</p>'));
  });
  ```
- [ ] Run it and watch it fail (module not found):
  ```
  node --test build-marketing.test.mjs
  ```
  Expected: fails — `Cannot find module './src/marketing/build-marketing.mjs'`.
- [ ] Create `src/marketing/build-marketing.mjs` implementing the five exports. Extraction skeleton (no nested `<div>` inside the legal blocks — verified — so a non-greedy match to the closing `</div>\n` at column 0 is safe):
  ```js
  export const LEGAL_TITLES = { privacy: 'Privacy', terms: 'Terms of use', refunds: 'Refund policy' };

  export function extractStripeUrl(indexHtml) {
    const m = indexHtml.match(/https:\/\/buy\.stripe\.com\/[A-Za-z0-9_]+\?client_reference_id=studio/);
    if (!m) throw new Error('build-marketing: live Stripe buy URL not found in index.html');
    return m[0];
  }

  export function extractLegalBlock(indexHtml, kind) {
    // Match `<div id="legal-<kind>" hidden> … </div>` then take the INNER html.
    const re = new RegExp(`<div id="legal-${kind}" hidden>([\\s\\S]*?)\\n</div>`);
    const m = indexHtml.match(re);
    if (!m) throw new Error(`build-marketing: legal block #legal-${kind} not found in index.html`);
    return m[1].trim();
  }

  export function injectMarketing(pageHtml, { nav, footer, trial, stripeUrl, price, year }) {
    return pageHtml
      .replaceAll('<!-- MKT:NAV -->', nav)
      .replaceAll('<!-- MKT:FOOTER -->', footer)
      .replaceAll('<!-- MKT:TRIAL -->', trial ?? '')
      .replaceAll('%%STRIPE_BUY_URL%%', stripeUrl)
      .replaceAll('%%PRICE%%', price)
      .replaceAll('%%YEAR%%', String(year));
  }

  export function renderLegalPage({ kind, title, inner, nav, footer, year }) {
    const tpl = /* read legal.template.html at build via caller, or inline here */ TEMPLATE;
    return injectMarketing(
      tpl.replaceAll('%%LEGAL_TITLE%%', title).replaceAll('%%LEGAL_KIND%%', kind).replaceAll('<!-- MKT:LEGAL_BODY -->', inner),
      { nav, footer, trial: '', stripeUrl: '', price: '', year });
  }
  ```
  (Load `legal.template.html` from disk in `build.mjs` and pass it in, OR read it inside `renderLegalPage`; keep the function pure by passing the template string in — adjust the test to pass `tpl` if you prefer. Either way the test must pass.)
- [ ] Create `src/marketing/legal.template.html` — a standalone doc reusing `marketing.css` (created in Task 2; until then link it, it 404s harmlessly in unit tests which never fetch). Skeleton:
  ```html
  <!doctype html>
  <html lang="en"><head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>%%LEGAL_TITLE%% · Chapbook</title>
  <meta name="description" content="%%LEGAL_TITLE%% for Chapbook, the local-first blog writing app from RQAI Ltd.">
  <link rel="canonical" href="https://chapbook.rqai.co.uk/%%LEGAL_KIND%%">
  <link rel="icon" href="/icon.svg" type="image/svg+xml">
  <meta name="theme-color" content="#0b1120">
  <meta name="robots" content="index,follow">
  <link rel="stylesheet" href="/marketing.css">
  </head><body class="mkt legal-page">
  <!-- MKT:NAV -->
  <main class="mkt-wrap legal-body">
    <h1>%%LEGAL_TITLE%%</h1>
    <!-- MKT:LEGAL_BODY -->
  </main>
  <!-- MKT:FOOTER -->
  </body></html>
  ```
- [ ] Run the test until green:
  ```
  node --test build-marketing.test.mjs
  ```
  Expected: `# pass 5  # fail 0`.
- [ ] Modify `build.mjs`. Fix the engine injection at line 126 from relative to root-relative:
  ```js
  // (a) load the engine bundle before the inline module (root-relative so it resolves at /app/index.html)
  html = html.replace('</head>', '  <script type="module" src="/studio.js"></script>\n</head>');
  ```
- [ ] In `build.mjs`, after computing the app `html`, write it to `dist/app/index.html` instead of `dist/index.html`, and add the marketing + legal emission. Import the helpers and `readFileSync` the partials/template. Replace the current `writeFileSync(`${DIST}/index.html`, html)` (line 134) region with:
  ```js
  import { extractStripeUrl, extractLegalBlock, LEGAL_TITLES, renderLegalPage, injectMarketing } from './src/marketing/build-marketing.mjs';
  // … after `html` is fully prepared …
  mkdirSync(`${DIST}/app`, { recursive: true });
  writeFileSync(`${DIST}/app/index.html`, html);

  // ---- marketing shell inputs ----
  const MKT = 'src/marketing';
  const nav = readFileSync(`${MKT}/_nav.html`, 'utf8');       // created in Task 2
  const footer = readFileSync(`${MKT}/_footer.html`, 'utf8'); // created in Task 2
  const trial = readFileSync(`${MKT}/_trial.html`, 'utf8');   // created in Task 7 (empty-safe until then)
  const legalTpl = readFileSync(`${MKT}/legal.template.html`, 'utf8');
  const idxSrc = readFileSync(`${SRC}/index.html`, 'utf8');
  const STRIPE = extractStripeUrl(idxSrc);
  const PRICE = process.env.CHAPBOOK_PRICE || '£49';
  const YEAR = new Date().getUTCFullYear();
  const inject = (pageHtml) => injectMarketing(pageHtml, { nav, footer, trial, stripeUrl: STRIPE, price: PRICE, year: YEAR });

  // ---- marketing pages (each created in its own task; guard-emit those that exist) ----
  for (const page of ['index.html', 'features.html', 'themes.html', 'pricing.html']) {
    const p = `${MKT}/${page}`;
    try { writeFileSync(`${DIST}/${page}`, inject(readFileSync(p, 'utf8'))); }
    catch (e) { if (page === 'index.html') throw e; /* others land in later tasks */ }
  }

  // ---- legal pages, single-sourced from index.html's legal modal ----
  for (const kind of ['privacy', 'terms', 'refunds']) {
    const inner = extractLegalBlock(idxSrc, kind);
    const page = renderLegalPage({ kind, title: LEGAL_TITLES[kind], inner,
      tpl: legalTpl, nav, footer, year: YEAR });
    writeFileSync(`${DIST}/${kind}.html`, page);
  }
  console.log('legal pages: privacy/terms/refunds extracted from index.html ✓');
  ```
  (Adjust `renderLegalPage` signature to accept `tpl`. Keep `download.html` in the existing verbatim copy-list — Task 2 re-injects its nav.)
- [ ] In `build.mjs`, append the `/app` explicit rule to `_redirects` (so `/app` serves the app doc directly without a trailing-slash bounce). Replace the current single-line `_redirects` write with:
  ```js
  writeFileSync(`${DIST}/_redirects`,
    'https://inayat-studio.netlify.app/* https://chapbook.rqai.co.uk/:splat 301!\n' +
    '/app /app/index.html 200\n');
  ```
  (No SPA catch-all. Marketing `.html` pages and legal pages are served by Netlify pretty-URLs — `/privacy` → `/privacy.html` — no rule needed. Verify `/app` behaviour in Task 9's draft check; if Netlify already serves `/app` cleanly the rule is a harmless no-op.)
- [ ] Add the SHELL/CACHE test for the SW to `build-marketing.test.mjs` (asserts the artifact after build):
  ```js
  test('built sw.js targets /app shell and CACHE v6', () => {
    const sw = readFileSync('dist/sw.js', 'utf8');
    assert.match(sw, /const CACHE\s*=\s*'chapbook-v6'/);
    const shell = sw.match(/const SHELL\s*=\s*\[([\s\S]*?)\]/)[1];
    assert.ok(shell.includes("'/app'") && shell.includes("'/app/index.html'"));
    assert.ok(!/['"]\/index\.html['"]/.test(shell), "must not precache the marketing '/index.html' as app shell");
  });
  test('manifest scoped to /app, id unchanged', () => {
    const m = JSON.parse(readFileSync('dist/manifest.json', 'utf8'));
    assert.equal(m.start_url, '/app'); assert.equal(m.scope, '/app'); assert.equal(m.id, '/');
  });
  ```
  (These read `dist/`, so they run after `npm run build`. Mark them to skip gracefully if `dist/` is absent, or run them only in the integration step below.)
- [ ] Modify `src/sw.js`. Bump cache and retarget the shell (drop `/` and `/index.html`; add `/app` and `/app/index.html`):
  ```js
  const CACHE = 'chapbook-v6'; // v6: app moved to /app; marketing at root
  const SHELL = ['/app', '/app/index.html', '/manifest.json', '/icon.svg', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/studio.js', '/darkroom-upload.js', '/resize.js', '/vendor/exifr.esm.js', '/preview.css', '/icons-sprite.svg',
    '/fonts/inter-400.woff2', '/fonts/inter-500.woff2', '/fonts/inter-600.woff2', '/fonts/inter-700.woff2', '/fonts/space-grotesk-500.woff2', '/fonts/space-grotesk-600.woff2', '/fonts/space-grotesk-700.woff2'];
  ```
- [ ] Modify `src/sw.js` fetch handler so the offline app-shell fallback is scoped to `/app` only (marketing URLs never fall back to the app shell):
  ```js
  self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);
    if (url.pathname.includes('/api/')) return; // never cache API calls
    e.respondWith(
      fetch(e.request).catch(() =>
        caches.match(e.request).then((r) => {
          if (r) return r;
          // App navigations only: fall back to the cached app shell. Marketing
          // navigations get the plain cache miss (no app shell served at '/').
          if (e.request.mode === 'navigate' && url.pathname.startsWith('/app')) return caches.match('/app/index.html');
          return undefined;
        })
      )
    );
  });
  ```
- [ ] Modify `src/manifest.json`: set `"start_url": "/app"` and `"scope": "/app"`; leave `"id": "/"` unchanged.
- [ ] Create the placeholder `src/marketing/index.html` (real home in Task 4) with the boot-shim FIRST in `<head>`, plus `<!-- MKT:NAV -->` / `<!-- MKT:FOOTER -->` so the build succeeds:
  ```html
  <!doctype html>
  <html lang="en"><head>
  <script>try { if (localStorage.getItem('helm.studio.licence')) location.replace('/app'); } catch (e) {}</script>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Chapbook</title>
  <meta name="description" content="A local-first blog writing app. Your posts publish to a blog you own.">
  <link rel="canonical" href="https://chapbook.rqai.co.uk/">
  <link rel="icon" href="/icon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/marketing.css">
  </head><body class="mkt">
  <!-- MKT:NAV -->
  <main class="mkt-wrap"><h1>Chapbook</h1><p>Marketing home placeholder — replaced in Task 4.</p></main>
  <!-- MKT:FOOTER -->
  </body></html>
  ```
- [ ] Create minimal `_nav.html`/`_footer.html`/`_trial.html` stubs so Task 1 builds standalone (Task 2/7 flesh them out). `_trial.html` may be empty. `_nav.html` minimal: `<nav class="mkt-nav"><a href="/">Chapbook</a></nav>`. `_footer.html` minimal: `<footer class="mkt-foot">© %%YEAR%% RQAI Ltd</footer>`.
- [ ] Build and run the integration assertions:
  ```
  node build.mjs
  ```
  Expected new console lines include `legal pages: privacy/terms/refunds extracted from index.html ✓` and the existing licence/AI/revocation guards still print `✓`. Then:
  ```
  node --test build-marketing.test.mjs && ls dist/app/index.html dist/privacy.html dist/terms.html dist/refunds.html
  ```
  Expected: all tests pass; all four files listed.
- [ ] Verify the app doc loads its engine from root and the boot-shim is present:
  ```
  grep -c 'src="/studio.js"' dist/app/index.html; grep -c "helm.studio.licence" dist/index.html
  ```
  Expected: `1` and `1`.
- [ ] Run the full suite to confirm nothing regressed:
  ```
  node --test
  ```
  Expected: all pass (existing 616-test baseline + the new marketing tests).

---

## Task 2 — Marketing shell (marketing.css, nav/footer partials, SEO scaffolding, og-image)

**Files:**
- Create `src/marketing/marketing.css` (tokens lifted from `download.html` + shared components).
- Flesh out `src/marketing/_nav.html`, `src/marketing/_footer.html`.
- Create `src/marketing/og-image.png` via a one-time generator `scripts/make-og.mjs` (committed output).
- Modify `build.mjs` (copy `marketing.css` + `og-image.png` into dist; emit `sitemap.xml` + `robots.txt`; inject nav into `download.html`).
- Modify `src/download.html` (add `<!-- MKT:NAV -->` marker; keep everything else).

**Interfaces:**
- Consumes: `download.html` design tokens (palette/fonts) — `marketing.css` re-declares the same `:root` custom properties so every page shares one visual language.
- Produces: `dist/marketing.css`, `dist/og-image.png`, `dist/sitemap.xml`, `dist/robots.txt`; `download.html` with the shared nav.
- CSS token contract (copied EXACTLY from `download.html:23-34`): `--well:#05070e; --midnight:#0b1120; --paper:#e6edf7; --mist:rgba(230,237,247,.62); --faint:rgba(230,237,247,.38); --hairline:rgba(230,237,247,.09); --teal:#2dd4bf; --cyan:#22d0ee; --violet:#8b5cf6; --ink:#06121a;`. Fonts: self-hosted `Inter` (400/500/600) + `Space Grotesk` (600/700) via `/fonts/*.woff2` `@font-face` (same as `download.html:17-21`).
- Nav link contract: `/`, `/features`, `/themes`, `/pricing`, `/download`, plus the primary CTA `Try Chapbook free` (anchors the trial capture, `href="#trial"`) — every marketing page carries the identical nav.

**Steps:**

- [ ] Create `src/marketing/marketing.css`. Open by re-declaring the `download.html` `@font-face` block and `:root` tokens verbatim (so the palette cannot drift), then add shared components:
  ```css
  @font-face{font-family:'Inter';font-weight:400;font-style:normal;font-display:swap;src:url('/fonts/inter-400.woff2') format('woff2')}
  @font-face{font-family:'Inter';font-weight:500;font-style:normal;font-display:swap;src:url('/fonts/inter-500.woff2') format('woff2')}
  @font-face{font-family:'Inter';font-weight:600;font-style:normal;font-display:swap;src:url('/fonts/inter-600.woff2') format('woff2')}
  @font-face{font-family:'Space Grotesk';font-weight:600;font-style:normal;font-display:swap;src:url('/fonts/space-grotesk-600.woff2') format('woff2')}
  @font-face{font-family:'Space Grotesk';font-weight:700;font-style:normal;font-display:swap;src:url('/fonts/space-grotesk-700.woff2') format('woff2')}
  :root{--well:#05070e;--midnight:#0b1120;--paper:#e6edf7;--mist:rgba(230,237,247,.62);--faint:rgba(230,237,247,.38);--hairline:rgba(230,237,247,.09);--teal:#2dd4bf;--cyan:#22d0ee;--violet:#8b5cf6;--ink:#06121a}
  *{box-sizing:border-box;margin:0;padding:0}
  html{color-scheme:dark}
  body.mkt{font:400 16px/1.6 'Inter',system-ui,sans-serif;color:var(--paper);background:linear-gradient(180deg,var(--midnight) 0%,var(--well) 100%) fixed;min-height:100dvh;-webkit-font-smoothing:antialiased}
  .mkt a{color:var(--teal)}
  .mkt :focus-visible{outline:2px solid var(--teal);outline-offset:3px;border-radius:4px}
  .mkt-wrap{width:min(1080px,100% - 2*clamp(18px,5vw,48px));margin-inline:auto}
  /* nav */
  .mkt-nav{position:sticky;top:0;z-index:20;backdrop-filter:blur(8px);background:rgba(11,17,32,.72);border-bottom:1px solid var(--hairline)}
  .mkt-nav .mkt-wrap{display:flex;align-items:center;gap:16px;padding-block:14px}
  .mkt-nav .lockup{display:flex;align-items:center;gap:9px;text-decoration:none;color:var(--paper);margin-right:auto}
  .mkt-nav .lockup img{width:26px;height:26px}
  .mkt-nav .lockup b{font:700 17px 'Space Grotesk',sans-serif;letter-spacing:-.01em}
  .mkt-nav a.lnk{font-size:14px;font-weight:500;color:var(--mist);text-decoration:none}
  .mkt-nav a.lnk[aria-current="page"],.mkt-nav a.lnk:hover{color:var(--teal)}
  .mkt-nav .cta{font:600 13.5px 'Inter',sans-serif;color:var(--ink);background:linear-gradient(90deg,var(--teal),var(--cyan));padding:8px 13px;border-radius:8px;text-decoration:none}
  /* headings, buttons, cards, sections, eyebrow */
  .mkt h1{font:700 clamp(2.3rem,6vw,3.6rem)/1.06 'Space Grotesk',sans-serif;letter-spacing:-.025em}
  .mkt h2{font:700 clamp(1.5rem,3.4vw,2.2rem)/1.15 'Space Grotesk',sans-serif;letter-spacing:-.02em}
  .mkt .brand{background:linear-gradient(100deg,var(--teal),var(--cyan) 60%,var(--violet) 130%);-webkit-background-clip:text;background-clip:text;color:transparent}
  .btn-primary{display:inline-block;text-decoration:none;font:600 15px 'Inter',sans-serif;padding:12px 20px;border-radius:10px;color:var(--ink);background:linear-gradient(90deg,var(--teal),var(--cyan))}
  .btn-primary:hover{filter:brightness(1.06)}
  .btn-ghost{display:inline-block;text-decoration:none;font:600 15px 'Inter',sans-serif;padding:12px 20px;border-radius:10px;color:var(--teal);border:1px solid rgba(45,212,191,.45)}
  .btn-ghost:hover{background:rgba(45,212,191,.1)}
  .eyebrow{font:600 12px 'Inter',sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--cyan)}
  .section{padding-block:clamp(48px,8vh,96px)}
  .card{border:1px solid var(--hairline);border-radius:14px;background:linear-gradient(180deg,rgba(230,237,247,.035),rgba(230,237,247,.012));padding:22px}
  /* footer */
  .mkt-foot{border-top:1px solid var(--hairline);margin-top:clamp(40px,8vh,80px)}
  .mkt-foot .mkt-wrap{display:flex;flex-wrap:wrap;gap:8px 22px;align-items:center;padding-block:24px;font-size:13px;color:var(--faint)}
  .mkt-foot a{color:var(--mist);text-decoration:none}
  .mkt-foot a:hover{color:var(--teal)}
  @media (prefers-reduced-motion:no-preference){/* entrance animations opt-in per page */}
  ```
- [ ] Flesh out `src/marketing/_nav.html`:
  ```html
  <nav class="mkt-nav" aria-label="Primary">
    <div class="mkt-wrap">
      <a class="lockup" href="/"><img src="/icon.svg" alt="" width="26" height="26"><b>Chapbook</b></a>
      <a class="lnk" href="/features">Features</a>
      <a class="lnk" href="/themes">Themes</a>
      <a class="lnk" href="/pricing">Pricing</a>
      <a class="lnk" href="/download">Download</a>
      <a class="cta" href="/pricing#trial">Try Chapbook free</a>
    </div>
  </nav>
  ```
  (Each page marks its own tab with `aria-current="page"` by post-processing in `build.mjs` — see next step — OR the nav ships without it and pages add it via a tiny inline script keyed off `location.pathname`. Choose the inline-script approach to keep the partial a single source: add to `marketing.css` nothing; add a 4-line inline script in `_nav.html` that sets `aria-current` on the matching link.)
  Append inside `_nav.html`:
  ```html
  <script>(function(){var p=location.pathname.replace(/\/$/,'')||'/';document.querySelectorAll('.mkt-nav a.lnk').forEach(function(a){if(a.getAttribute('href')===p)a.setAttribute('aria-current','page')})})();</script>
  ```
- [ ] Flesh out `src/marketing/_footer.html`:
  ```html
  <footer class="mkt-foot">
    <div class="mkt-wrap">
      <span>© %%YEAR%% RQAI Ltd</span>
      <a href="/features">Features</a>
      <a href="/themes">Themes</a>
      <a href="/pricing">Pricing</a>
      <a href="/download">Download</a>
      <a href="/privacy">Privacy</a>
      <a href="/terms">Terms</a>
      <a href="/refunds">Refunds</a>
      <a href="mailto:support@rqai.co.uk">Support</a>
    </div>
  </footer>
  ```
- [ ] In `build.mjs`, add `marketing.css` and `og-image.png` to the verbatim copy step. Extend the `for (const f of [...])` copy-list (line 139) to include `'download.html'` (already there) and add a separate copy for the marketing assets:
  ```js
  copyFileSync(`${MKT}/marketing.css`, `${DIST}/marketing.css`);
  copyFileSync(`${MKT}/og-image.png`, `${DIST}/og-image.png`);
  ```
- [ ] In `build.mjs`, run `download.html` through `inject()` instead of copying it verbatim, so it gains the shared nav. Remove `'download.html'` from the verbatim copy-list and add:
  ```js
  writeFileSync(`${DIST}/download.html`, inject(readFileSync(`${SRC}/download.html`, 'utf8')));
  ```
- [ ] Modify `src/download.html`: insert `<!-- MKT:NAV -->` immediately after `<body>` (replacing or preceding its bespoke `<header>`), and add `<link rel="stylesheet" href="/marketing.css">` is NOT needed (download.html is self-styled) — instead only inject the nav so it matches. Keep download.html's own `<header>` OR swap it for the shared nav; prefer swapping the `<header>…</header>` block (lines 164-169) for `<!-- MKT:NAV -->` so the nav is identical site-wide. Verify download.html still validates after the swap.
- [ ] In `build.mjs`, emit `sitemap.xml` and `robots.txt`:
  ```js
  const SITE = 'https://chapbook.rqai.co.uk';
  const pages = ['/', '/features', '/themes', '/pricing', '/download', '/privacy', '/terms', '/refunds'];
  const today = new Date().toISOString().slice(0, 10);
  writeFileSync(`${DIST}/sitemap.xml`,
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    pages.map((p) => `  <url><loc>${SITE}${p}</loc><lastmod>${today}</lastmod></url>`).join('\n') +
    '\n</urlset>\n');
  writeFileSync(`${DIST}/robots.txt`,
    `User-agent: *\nAllow: /\nDisallow: /app\nSitemap: ${SITE}/sitemap.xml\n`);
  console.log('SEO: sitemap.xml + robots.txt emitted');
  ```
  (`/app` is a private tool with no SEO value; `Disallow: /app` keeps it out of the index. The app is still reachable — Disallow is advisory only.)
- [ ] Create `scripts/make-og.mjs` — a one-time generator that renders a 1200x630 HTML card (brand wordmark + tagline on the `--midnight`→`--well` gradient, teal→cyan→violet accent, `Space Grotesk`) via Playwright and writes `src/marketing/og-image.png`. Guard it so it SKIPs cleanly if Playwright is absent (dev-only). It is NOT wired into the build; run it once and commit the PNG. Command to run once:
  ```
  node scripts/make-og.mjs
  ```
  Expected: `wrote src/marketing/og-image.png (1200x630)`. (If Playwright is not installed, hand-author the card once via any tool and drop the PNG at `src/marketing/og-image.png`; it must be self-contained, no external text/logos, no owner PII, no clinical terms.)
- [ ] Build and verify shell assets emit and download keeps its nav:
  ```
  node build.mjs && ls dist/marketing.css dist/og-image.png dist/sitemap.xml dist/robots.txt && grep -c 'mkt-nav' dist/download.html
  ```
  Expected: all four files listed; `grep` returns `1`.
- [ ] Verify sitemap validity + robots:
  ```
  node -e "const x=require('fs').readFileSync('dist/sitemap.xml','utf8'); if(!x.includes('<loc>https://chapbook.rqai.co.uk/pricing</loc>')||!x.startsWith('<?xml')) throw 'bad sitemap'; console.log('sitemap ok')"
  ```
  Expected: `sitemap ok`.

---

## Task 3 — Theme assets vendoring (20 theme CSS + kids extras + base + fonts + sample post)

**Files:**
- Create `src/marketing/themes-css/` and copy from `~/Projects/chapbook-template`:
  - `src/styles/global.css` → `themes-css/global.css`
  - `src/styles/themes.css` → `themes-css/themes.css` (aggregator; `@import './themes/<id>.css'`)
  - `src/styles/themes/*.css` (20 files) + `_kids-extras.css` → `themes-css/themes/`
  - theme fonts from `public/fonts/` (Fraunces, Newsreader, Fredoka, Atkinson-Hyperlegible woff2 + their OFL txt) → `themes-css/fonts/`
- Create `src/marketing/themes-css/fonts.css` — vendored `@font-face` for the four theme families (url `/themes-css/fonts/…`) PLUS aliases mapping `'Inter Variable'` and `'Space Grotesk Variable'` to Chapbook's existing `/fonts/inter-*.woff2` and `/fonts/space-grotesk-*.woff2` (so `global.css`'s `--font-body`/`--font-display` resolve fully self-hosted; CSP `font-src 'self'`).
- Create `src/marketing/themes-css/sample-post.html` — a standalone post document mirroring the template's post DOM.
- Modify `build.mjs` (copy the whole `themes-css/` tree into `dist/themes-css/`).
- Create `themes-css.test.mjs` (assert vendored set is complete + no `url()` escapes to an external host).

**Interfaces:**
- Consumes: template `global.css` + `themes.css` + 20 theme CSS + `_kids-extras.css` + theme fonts + `themes.json` registry.
- Produces: `dist/themes-css/**` — the exact CSS the published blogs use, so a theme is applied by setting `data-blog-theme="<id>"` on the sample post's `<html>`. The `/themes` page (Task 6) and any theme-strip preview (Task 4) consume `sample-post.html` + these stylesheets.
- 20 theme ids (from `themes.json`): clean = `observatory, ledger, air, graphite`; editorial = `broadsheet, journal, kiosk, gazette`; creative = `neon, zine, scrapbook, arcade`; kids = `doodle, rocket, pixel, comic`; photo = `gallery, darkroom, contact-sheet, polaroid`. Kids themes = `doodle, rocket, pixel, comic` (get `_kids-extras.css` behaviours).
- Sample-post DOM contract (mirrors `~/Projects/chapbook-template/src/pages/blog/[slug].astro`): `<html data-blog-theme="observatory">` → `<body>` → `.container.article-grid` → `.article-col` → `header.post-hero > .post-hero-inner` (`.back-link`, `.post-title-row > h1.display.scrim-text`, `.post-hero-meta` with `<time>`, `min read`, `.tag-chip`) → `.article-body` (prose: `h2`, `h3`, `p`, `blockquote`, `ul>li`, `strong`, `em`, `code`, `figure>img+figcaption`). These are the exact selectors the 20 themes override (verified against `broadsheet.css`: it targets `.post-hero`, `.post-title-row h1`, `.back-link`, `.article-body`, `.article-body h2`, `.tag-chip`, `.badge-interactive`).

**Steps:**

- [ ] Copy the vendored CSS tree (preserve the `themes/` subdir so `themes.css`'s relative `@import './themes/<id>.css'` resolves):
  ```
  mkdir -p src/marketing/themes-css/themes src/marketing/themes-css/fonts
  cp ~/Projects/chapbook-template/src/styles/global.css src/marketing/themes-css/global.css
  cp ~/Projects/chapbook-template/src/styles/themes.css src/marketing/themes-css/themes.css
  cp ~/Projects/chapbook-template/src/styles/themes/*.css src/marketing/themes-css/themes/
  cp ~/Projects/chapbook-template/public/fonts/{fraunces,newsreader,fredoka,atkinson-hyperlegible}-*.woff2 src/marketing/themes-css/fonts/
  cp ~/Projects/chapbook-template/public/fonts/{Fraunces,Newsreader,Fredoka,AtkinsonHyperlegible}-OFL.txt src/marketing/themes-css/fonts/
  ```
  Expected: 20 `.css` in `themes/` plus `_kids-extras.css` (21 files); ~14 woff2 in `fonts/`.
- [ ] Confirm the vendored theme set is exactly the 20 registry ids + kids extras:
  ```
  ls src/marketing/themes-css/themes/ | sort
  ```
  Expected: `_kids-extras.css` + the 20 ids listed in the Interfaces above.
- [ ] Create `src/marketing/themes-css/fonts.css`. Reproduce the template's `fonts.css` `@font-face` for Fraunces/Newsreader/Fredoka/Atkinson but with `url('/themes-css/fonts/<file>')`, then alias the two variable families to Chapbook's self-hosted faces so `global.css` renders without `@fontsource`:
  ```css
  /* Theme display/body serifs + kids body (vendored from chapbook-template). */
  @font-face{font-family:'Fraunces';font-weight:400;font-display:swap;src:url('/themes-css/fonts/fraunces-latin-400-normal.woff2') format('woff2')}
  @font-face{font-family:'Fraunces';font-weight:600;font-display:swap;src:url('/themes-css/fonts/fraunces-latin-600-normal.woff2') format('woff2')}
  @font-face{font-family:'Fraunces';font-weight:700;font-display:swap;src:url('/themes-css/fonts/fraunces-latin-700-normal.woff2') format('woff2')}
  @font-face{font-family:'Fraunces';font-weight:900;font-display:swap;src:url('/themes-css/fonts/fraunces-latin-900-normal.woff2') format('woff2')}
  @font-face{font-family:'Fraunces';font-weight:400;font-style:italic;font-display:swap;src:url('/themes-css/fonts/fraunces-latin-400-italic.woff2') format('woff2')}
  @font-face{font-family:'Fraunces';font-weight:900;font-style:italic;font-display:swap;src:url('/themes-css/fonts/fraunces-latin-900-italic.woff2') format('woff2')}
  @font-face{font-family:'Newsreader';font-weight:400;font-display:swap;src:url('/themes-css/fonts/newsreader-latin-400-normal.woff2') format('woff2')}
  @font-face{font-family:'Newsreader';font-weight:600;font-display:swap;src:url('/themes-css/fonts/newsreader-latin-600-normal.woff2') format('woff2')}
  @font-face{font-family:'Newsreader';font-weight:400;font-style:italic;font-display:swap;src:url('/themes-css/fonts/newsreader-latin-400-italic.woff2') format('woff2')}
  @font-face{font-family:'Newsreader';font-weight:600;font-style:italic;font-display:swap;src:url('/themes-css/fonts/newsreader-latin-600-italic.woff2') format('woff2')}
  @font-face{font-family:'Fredoka';font-weight:400;font-display:swap;src:url('/themes-css/fonts/fredoka-latin-400-normal.woff2') format('woff2')}
  @font-face{font-family:'Fredoka';font-weight:500;font-display:swap;src:url('/themes-css/fonts/fredoka-latin-500-normal.woff2') format('woff2')}
  @font-face{font-family:'Fredoka';font-weight:600;font-display:swap;src:url('/themes-css/fonts/fredoka-latin-600-normal.woff2') format('woff2')}
  @font-face{font-family:'Fredoka';font-weight:700;font-display:swap;src:url('/themes-css/fonts/fredoka-latin-700-normal.woff2') format('woff2')}
  @font-face{font-family:'Atkinson Hyperlegible';font-weight:400;font-display:swap;src:url('/themes-css/fonts/atkinson-hyperlegible-latin-400-normal.woff2') format('woff2')}
  @font-face{font-family:'Atkinson Hyperlegible';font-weight:700;font-display:swap;src:url('/themes-css/fonts/atkinson-hyperlegible-latin-700-normal.woff2') format('woff2')}
  @font-face{font-family:'Atkinson Hyperlegible';font-weight:400;font-style:italic;font-display:swap;src:url('/themes-css/fonts/atkinson-hyperlegible-latin-400-italic.woff2') format('woff2')}
  /* Alias the variable families global.css names to Chapbook's self-hosted weights. */
  @font-face{font-family:'Space Grotesk Variable';font-weight:500 700;font-display:swap;src:url('/fonts/space-grotesk-600.woff2') format('woff2')}
  @font-face{font-family:'Inter Variable';font-weight:400 600;font-display:swap;src:url('/fonts/inter-500.woff2') format('woff2')}
  ```
  (Confirm the exact template `fonts.css` face list and filenames before finalising — copy weights/styles it actually declares; the above matches the `public/fonts` listing.)
- [ ] Guard against a `url()` that would reach an external host or a path that will not exist in dist. Grep the vendored CSS:
  ```
  grep -rhoE "url\(([^)]*)\)" src/marketing/themes-css/*.css src/marketing/themes-css/themes/*.css | grep -vE "url\(['\"]?(/themes-css/fonts/|/fonts/|data:|#)" | sort -u
  ```
  Expected: only `url()` values that are `data:` inline SVGs or root-relative `/fonts` / `/themes-css/fonts` paths. Any `http(s)://` or bare-relative path here is a CSP/broken-asset risk — fix by rewriting to a vendored `/themes-css/fonts/…` path or removing the rule.
- [ ] Create `src/marketing/themes-css/sample-post.html`. Neutral content (a coffee/sourdough corpus — no owner PII, no clinical terms). Link the three vendored stylesheets in the load order the template uses (`fonts.css` → `global.css` → `themes.css`), start on `observatory`, and add a `postMessage` listener so the `/themes` page can switch `data-blog-theme` (used by Task 6). Skeleton:
  ```html
  <!doctype html>
  <html lang="en" data-blog-theme="observatory"><head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sample post</title>
  <meta name="robots" content="noindex">
  <link rel="stylesheet" href="/themes-css/fonts.css">
  <link rel="stylesheet" href="/themes-css/global.css">
  <link rel="stylesheet" href="/themes-css/themes.css">
  <style>body{margin:0}</style>
  </head><body>
    <div class="container article-grid">
      <div class="article-col">
        <header class="post-hero"><div class="post-hero-inner">
          <a class="back-link" href="#">All Posts</a>
          <div class="post-title-row"><h1 class="display scrim-text">The loaf that finally worked</h1></div>
          <div class="post-hero-meta">
            <time datetime="2026-05-04">4 May 2026</time><span aria-hidden="true">·</span>
            <span>4 min read</span><a class="tag-chip" href="#">baking</a>
          </div>
        </div></header>
        <div class="article-body">
          <p>Third time is the charm. The crumb finally opened up, and the crust cracked the way it is supposed to.</p>
          <h2>What changed</h2>
          <p>Two things: a longer cold proof, and a much wetter dough than felt sensible.</p>
          <blockquote>Trust the dough, not the clock.</blockquote>
          <h3>The method</h3>
          <ul><li>Autolyse for one hour.</li><li>Fold every thirty minutes, four times.</li><li>Cold proof overnight.</li></ul>
          <p>Next loaf I want to push the hydration a little <strong>further</strong> and see where it <em>breaks</em>.</p>
          <figure><img src="/themes-css/sample.jpg" alt="A cross-section of a sourdough loaf" width="800" height="500"><figcaption>Open crumb, at last.</figcaption></figure>
        </div>
      </div>
    </div>
    <script>
      addEventListener('message', function (e) {
        var t = e && e.data && e.data.blogTheme;
        if (typeof t === 'string' && /^[a-z-]+$/.test(t)) document.documentElement.setAttribute('data-blog-theme', t);
      });
    </script>
  </body></html>
  ```
  (Provide `src/marketing/themes-css/sample.jpg` — a neutral placeholder image, no PII. If a real crumb photo is not available, use a solid-colour or CSS-gradient placeholder image committed to the repo.)
- [ ] In `build.mjs`, copy the whole `themes-css/` tree into dist. Add a small recursive copy helper (or reuse a `readdirSync` walk like the fonts loop):
  ```js
  function copyTree(src, dst) {
    mkdirSync(dst, { recursive: true });
    for (const name of readdirSync(src, { withFileTypes: true })) {
      const s = `${src}/${name.name}`, d = `${dst}/${name.name}`;
      if (name.isDirectory()) copyTree(s, d); else copyFileSync(s, d);
    }
  }
  copyTree(`${MKT}/themes-css`, `${DIST}/themes-css`);
  console.log('themes-css: vendored blog-theme catalogue copied to dist/themes-css/');
  ```
- [ ] Write `themes-css.test.mjs` (assert completeness against the registry + no external `url()`):
  ```js
  import { test } from 'node:test';
  import assert from 'node:assert/strict';
  import { readFileSync, readdirSync } from 'node:fs';
  const IDS = ['observatory','ledger','air','graphite','broadsheet','journal','kiosk','gazette','neon','zine','scrapbook','arcade','doodle','rocket','pixel','comic','gallery','darkroom','contact-sheet','polaroid'];
  test('all 20 theme CSS + kids extras vendored', () => {
    const files = new Set(readdirSync('src/marketing/themes-css/themes'));
    for (const id of IDS) assert.ok(files.has(`${id}.css`), `missing ${id}.css`);
    assert.ok(files.has('_kids-extras.css'));
    assert.equal(files.size, 21);
  });
  test('no theme CSS url() reaches an external host', () => {
    for (const f of ['global.css','themes.css', ...IDS.map((i)=>`themes/${i}.css`),'themes/_kids-extras.css','fonts.css']) {
      const css = readFileSync(`src/marketing/themes-css/${f}`, 'utf8');
      for (const m of css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
        const u = m[1].trim();
        assert.ok(!/^https?:/i.test(u), `external url in ${f}: ${u}`);
      }
    }
  });
  ```
- [ ] Build + test:
  ```
  node build.mjs && node --test themes-css.test.mjs && ls dist/themes-css/themes/ | wc -l
  ```
  Expected: tests pass; `21`.
- [ ] Smoke-check the sample post renders themed (serve dist, open the sample doc, flip a theme):
  ```
  npx --yes serve dist -l 5055 &  # or: python3 -m http.server 5055 -d dist
  ```
  Then in a browser open `http://localhost:5055/themes-css/sample-post.html`, run in the console `document.documentElement.dataset.blogTheme='broadsheet'` and confirm the masthead serif + column treatment appears; repeat for `neon`, `doodle`. Kill the server after. (This is a manual visual gate; Task 6 automates the switcher and Task 9 screenshots it.)

---

## Task 4 — Home page `/` (hero animated scene + teasers + theme strip + pricing teaser + download strip)

**Files:**
- Rewrite `src/marketing/index.html` (replace the Task 1 placeholder; keep the boot-shim FIRST).
- No `build.mjs` change (Task 1 already injects `index.html`), unless the hero references a media still — then ensure `media/` copy exists (Task 5 adds it; the hero is pure CSS/JS so no media needed).

**Interfaces:**
- Consumes: `marketing.css`, `_nav.html`, `_footer.html`, `%%STRIPE_BUY_URL%%`, `%%PRICE%%`. Trial CTA anchors to `/pricing#trial` (the trial form lives on `/pricing`, Task 7) — OR includes the `<!-- MKT:TRIAL -->` partial inline under the hero (decide: to make the hero's primary CTA convert without a page hop, include `<!-- MKT:TRIAL -->` inline and point the nav CTA at `#trial`). Use the inline-trial approach on the home page too.
- Produces: `dist/index.html`. Boot-shim MUST remain the first `<head>` element.
- Hero DOM contract (class names the keyframes target): `.hero-scene`, `.hs-phone`, `.hs-bubble`, `.hs-block`, `.hs-publish`, `.hs-check`, `.hs-browser`, `.hs-browser-bar`, `.hs-blog`, `.hs-themechip`. The scene is self-contained CSS + a tiny JS pause-on-hidden; NO video, NO external asset (Lighthouse budget: hero interactive < 2s on 4G).

**Hero scene beats (~12s loop, reduced-motion = final composed frame):**

| t (s) | Beat |
|---|---|
| 0.0–2.5 | Phone frame (`.hs-phone`); a chat bubble (`.hs-bubble`) types a message via a stepped width/clip reveal: "Made sourdough today. The crumb finally opened up." |
| 2.5–4.0 | The bubble lifts and morphs into a composer "post block" card (`.hs-block`, title + body) that slides into a column. |
| 4.0–5.5 | A Publish button (`.hs-publish`) highlights; a cursor moves onto it; press state; a green check (`.hs-check`) + "Published" label fade in. |
| 5.5–8.0 | A browser frame (`.hs-browser`) slides in with an address bar (`.hs-browser-bar`, "yourname.blog") and renders the post (`.hs-blog`, masthead + article) in the default observatory look. |
| 8.0–12.0 | Theme flip: `.hs-blog` restyles through three looks, ~1.3s each, with a label chip (`.hs-themechip`): doodle → neon → broadsheet. At 12.0 the loop restarts. |

Reduced-motion: `@media (prefers-reduced-motion: reduce)` freezes the scene on the FINAL composed frame — phone with the check beside the browser-frame blog in the broadsheet look — no animation, no JS timeline.

**Steps:**

- [ ] Author the hero markup inside `src/marketing/index.html` (after `<!-- MKT:NAV -->`), boot-shim still first in `<head>`. DOM skeleton:
  ```html
  <section class="hero section">
    <div class="mkt-wrap hero-grid">
      <div class="hero-copy">
        <p class="eyebrow">Local-first blogging</p>
        <h1>Write it once. <span class="brand">Publish it everywhere you own.</span></h1>
        <p class="hero-sub">Chapbook turns a quick note into a real post on a blog that is yours: your words, your repo, your rules. No lock-in, no middle server.</p>
        <div class="hero-cta">
          <a class="btn-primary" href="#trial">Try Chapbook free</a>
          <a class="btn-ghost" href="%%STRIPE_BUY_URL%%">%%PRICE%%/yr</a>
        </div>
        <p class="hero-fine">7-day trial, no card. One key unlocks every device.</p>
      </div>
      <div class="hero-scene" aria-hidden="true">
        <div class="hs-phone"><div class="hs-bubble">Made sourdough today. The crumb finally opened up.</div></div>
        <div class="hs-block"><b>The loaf that finally worked</b><span>Third time is the charm…</span>
          <button class="hs-publish">Publish <i class="hs-check">✓</i></button></div>
        <div class="hs-browser"><div class="hs-browser-bar">yourname.blog</div>
          <div class="hs-blog"><h4>The loaf that finally worked</h4><p>Third time is the charm…</p></div>
          <span class="hs-themechip">observatory</span></div>
      </div>
    </div>
  </section>
  ```
- [ ] Add the hero keyframes to an inline `<style>` in `index.html` (page-specific; not in shared `marketing.css`). Keyframe skeleton (one master 12s timeline per element; `steps()` for the typewriter; a single JS var pauses the animation on `visibilitychange`):
  ```css
  .hero-grid{display:grid;grid-template-columns:1.05fr 1fr;gap:clamp(24px,4vw,56px);align-items:center}
  @media (max-width:820px){.hero-grid{grid-template-columns:1fr}.hero-scene{order:-1}}
  .hero-scene{position:relative;aspect-ratio:4/3;min-height:320px}
  .hs-phone,.hs-block,.hs-browser{position:absolute;border:1px solid var(--hairline);border-radius:14px;background:rgba(230,237,247,.04)}
  .hs-themechip{position:absolute;bottom:10px;right:12px;font:600 11px 'Inter';letter-spacing:.08em;color:var(--cyan)}
  @media (prefers-reduced-motion:no-preference){
    .hs-phone{animation:hsPhone 12s ease-in-out infinite}
    .hs-bubble{overflow:hidden;white-space:nowrap;animation:hsType 2.4s steps(38) 1 both, hsPhone 12s ease-in-out infinite}
    .hs-block{opacity:0;animation:hsBlock 12s ease-in-out infinite}
    .hs-check{opacity:0;animation:hsCheck 12s ease-in-out infinite}
    .hs-browser{opacity:0;animation:hsBrowser 12s ease-in-out infinite}
    .hs-blog{animation:hsTheme 12s linear infinite}
    .hs-themechip{animation:hsChip 12s step-end infinite}
    @keyframes hsType{from{width:0}to{width:100%}}
    /* Each element's keyframe uses the same 12s timeline; percentages map to the beat table:
       ~21%=2.5s, ~33%=4s, ~46%=5.5s, ~67%=8s, 100%=12s. */
    @keyframes hsPhone{0%,20%{opacity:1;transform:none}33%{transform:translateY(-8px) scale(.98)}46%,100%{opacity:.35;transform:translateY(0) scale(.94)}}
    @keyframes hsBlock{0%,20%{opacity:0}33%{opacity:1;transform:translateY(0)}62%{opacity:1}70%,100%{opacity:.4}}
    @keyframes hsCheck{0%,44%{opacity:0}48%{opacity:1;transform:scale(1.2)}55%,100%{opacity:1;transform:scale(1)}}
    @keyframes hsBrowser{0%,44%{opacity:0;transform:translateX(24px)}55%,100%{opacity:1;transform:none}}
    /* hsTheme cross-fades the .hs-blog look via CSS custom props swapped at 67/78/89% */
    @keyframes hsTheme{0%,66%{--look:observatory}67%,77%{--look:doodle}78%,88%{--look:neon}89%,100%{--look:broadsheet}}
    @keyframes hsChip{0%{}67%{content:'doodle'}78%{content:'neon'}89%{content:'broadsheet'}}
  }
  @media (prefers-reduced-motion:reduce){
    .hs-phone,.hs-block,.hs-browser,.hs-check{opacity:1;animation:none;transform:none}
    .hs-bubble{width:100%;animation:none}
    .hs-blog{/* final broadsheet-flavoured look, static */}
    .hs-themechip::after{content:'broadsheet'}
  }
  ```
  (The theme-flip on `.hs-blog` is a hand-built impression of the three looks using a few swapped CSS variables/classes — it does NOT load the vendored theme CSS in the hero, to keep the hero < 2s and dependency-free. The REAL theme CSS lives on `/themes`. Drive the chip label and blog look with a small JS timeline if the CSS `content` keyframe approach proves finicky; keep it CSS-first.)
- [ ] Add the four feature teasers (each links into `/features`), the theme strip (links `/themes`), the pricing teaser card, and the download strip. Skeleton:
  ```html
  <section class="section teasers"><div class="mkt-wrap">
    <p class="eyebrow">What you get</p>
    <div class="teaser-grid">
      <a class="card teaser" href="/features#composer"><h3>A composer that feels like chat</h3><p>Type a thought, shape it into a post. Twelve block types, drafts that stay on your device.</p></a>
      <a class="card teaser" href="/features#interactives"><h3>Interactives and glyphs</h3><p>Drop in a live widget or one of 5093 icons. No code, rendered exactly as readers will see it.</p></a>
      <a class="card teaser" href="/features#themes"><h3>Twenty real themes</h3><p>From clean and editorial to kids and photo. Switch the whole look in one click.</p></a>
      <a class="card teaser" href="/features#publish"><h3>Publish to a repo you own</h3><p>Every post is an atomic commit to your GitHub, live on your own Pages site.</p></a>
    </div>
  </div></section>
  <section class="section theme-strip"><div class="mkt-wrap">
    <p class="eyebrow">Twenty themes, one click</p>
    <h2>Pick a look that is unmistakably yours</h2>
    <!-- a row of theme swatch chips built from themes.json preview colours; links /themes -->
    <a class="btn-ghost" href="/themes">See every theme</a>
  </div></section>
  <section class="section pricing-teaser"><div class="mkt-wrap"><div class="card price-card">
    <h2>%%PRICE%% a year</h2>
    <p>All twenty themes and updates. Every device with one key. Bring your own AI keys. 14-day refunds.</p>
    <div class="hero-cta"><a class="btn-primary" href="#trial">Start free trial</a><a class="btn-ghost" href="/pricing">See pricing</a></div>
  </div></div></section>
  <section class="section download-strip"><div class="mkt-wrap">
    <p class="eyebrow">Write anywhere</p>
    <h2>macOS, Windows, or straight in the browser</h2>
    <a class="btn-ghost" href="/download">Get Chapbook</a>
  </div></section>
  <!-- MKT:TRIAL -->
  ```
- [ ] Add head SEO for `/`: `<title>Chapbook — write a post, publish to a blog you own</title>` (title MAY use a hyphen, not an em-dash), unique `<meta name="description">`, `<link rel="canonical" href="https://chapbook.rqai.co.uk/">`, and og tags pointing at `/og-image.png`. Keep the boot-shim as the FIRST head element (before any of these).
- [ ] Build + verify the home page renders and the boot-shim/CTA/price are present:
  ```
  node build.mjs && grep -c "helm.studio.licence" dist/index.html && grep -c "buy.stripe.com/5kQeVd0C" dist/index.html && grep -c "hero-scene" dist/index.html
  ```
  Expected: `1`, `1`, `1`.
- [ ] Confirm no em-dash slipped into the home copy:
  ```
  grep -c $'—' dist/index.html || echo "no em-dash"
  ```
  Expected: `no em-dash` (grep returns nothing → the `|| echo` fires).
- [ ] Serve dist and eyeball the hero at desktop + 390px: the scene loops ~12s, reduced-motion (emulate in devtools) shows the final composed frame, and the page has no horizontal scroll at 390px. (Automated screenshots come in Task 9.)

---

## Task 5 — `/features` (7 sections, live embedded interactive, video-loop slots)

**Files:**
- Create `src/marketing/features.html` (injected by Task 1's build loop).
- Modify `build.mjs` (bake the live interactive fragment from the app's playground engine; copy `media/`).
- Create `src/marketing/media/loops/.gitkeep` + committed placeholder posters so the page renders before the parallel pipeline delivers real loops.

**Interfaces:**
- Consumes: `marketing.css`, nav/footer/trial partials; the playground engine `src/lib/playgrounds/index.js` `buildInstance(familyId, params, domId)`; media loops from the parallel pipeline at `/media/loops/<name>.{webm,mp4,jpg}` with EXACT names: `write-a-post`, `interactives`, `themes`, `share-social`, `flipbook`.
- Produces: `dist/features.html`, `dist/media/loops/**` (copied through), and one baked interactive fragment embedded in `features.html`.
- Live-interactive contract: at build, `build.mjs` calls `buildInstance('gradient-maker', <Aurora preset params>, 'pg-features')` → `{html, css, js}`, and renders it the way published blogs do (outer `.playground` wrapper + `<style>${css}</style>` + `<script>${js}</script>`) into a SANDBOXED, SAME-ORIGIN iframe via `srcdoc` (srcdoc inherits the page CSP `script-src 'self' 'unsafe-inline'`, so the baked IIFE runs; srcdoc has no HTTP headers so X-Frame-Options does not block it). Neutral preset: `gradient-maker` / `Aurora` (`stops:['#2dd4bf','#22d3ee','#818cf8'], angle:100` — on-brand, no topic words, no clinical terms). A second animated option is `easing-curves` / `Four easings` if a motion demo is preferred.
- Video-loop slot contract: `<video muted loop playsinline preload="none" poster="/media/loops/<name>.jpg"><source src="/media/loops/<name>.webm" type="video/webm"><source src="/media/loops/<name>.mp4" type="video/mp4"></video>` wrapped in a lazy-init (IntersectionObserver plays on view; reduced-motion → poster only, never autoplay).

**Seven sections (per spec, feature-led, no hype, no em-dashes):**
1. Chat composer — `write-a-post` loop + copy.
2. Blocks & media — 12 block types, darkroom, R2 video; stills + `flipbook` loop.
3. Interactives — LIVE embedded `gradient-maker`/Aurora fragment (srcdoc iframe) + glyph generator note (5093 icons, 2D/3D).
4. AI partner (BYOK) — Partner/Editor/Goblin/Social pack; keys stay in the browser; model auto-heal; `share-social` loop.
5. Share & planner.
6. Publish — atomic commit to YOUR repo + GitHub Pages, animated CSS diagram (composer → commit → Action → live post).
7. Phone story — PWA install, framed mobile stills.

**Steps:**

- [ ] In `build.mjs`, import the playground builder and bake the interactive fragment BEFORE the marketing-page loop:
  ```js
  import { buildInstance } from './src/lib/playgrounds/index.js';
  const pg = buildInstance('gradient-maker', { title: 'Aurora', stops: ['#2dd4bf', '#22d3ee', '#818cf8'], angle: 100 }, 'pg-features');
  // Render as published blogs do: outer .playground wrapper + scoped style + IIFE.
  const pgSrcdoc = `<!doctype html><html><head><meta charset="utf-8">`
    + `<style>:root{color-scheme:dark}body{margin:0;background:#0b1120;color:#e6edf7;font:15px/1.5 system-ui}${pg.css}</style>`
    + `</head><body><div class="playground"><div id="${pg.domId}">${pg.html}</div></div>`
    + `<script>${pg.js}</script></body></html>`;
  // Inject into features.html via a dedicated token before the generic inject().
  ```
  Then, when emitting `features.html`, replace a `%%LIVE_INTERACTIVE_SRCDOC%%` token with the HTML-attribute-escaped `pgSrcdoc` and set it as the iframe `srcdoc`. Add a helper to escape `"`/`&`/`<` for the attribute.
- [ ] Author `src/marketing/features.html`. Head: unique title/description/canonical (`/features`)/og. Body: nav, then 7 `<section class="section" id="...">` blocks with the ids `composer`, `blocks`, `interactives`, `ai`, `share`, `publish`, `phone` (the home teasers deep-link to `#composer/#interactives/#themes/#publish` — align ids; use `#interactives` and `#publish`; the home "themes" teaser links to `/themes` not this page). Interactive section skeleton:
  ```html
  <section class="section" id="interactives"><div class="mkt-wrap">
    <p class="eyebrow">Interactives</p>
    <h2>Drop in something readers can actually play with</h2>
    <p>Chapbook ships live widgets you configure with a form, no code. Here is one running exactly as it would on your published post.</p>
    <iframe class="live-pg" title="Live interactive demo" loading="lazy" sandbox="allow-scripts"
      srcdoc="%%LIVE_INTERACTIVE_SRCDOC%%" style="width:100%;height:340px;border:1px solid var(--hairline);border-radius:12px"></iframe>
    <p>Plus a glyph generator with 5093 icons, in flat 2D or extruded 3D.</p>
  </div></section>
  ```
  (`sandbox="allow-scripts"` without `allow-same-origin` gives an opaque origin — the baked IIFE still runs and is fully isolated. Because it is `srcdoc`, X-Frame-Options does not apply. This is the "sandboxed same-origin iframe, rendered as published blogs render it" the spec asks for, hardened to a null origin.)
- [ ] Author the video-loop slots for sections `composer` (`write-a-post`), `blocks` (`flipbook`), `themes`→lives on home/themes not here, `ai` (`share-social`). Add the lazy-play inline script once:
  ```html
  <script>
  (function(){
    var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var io = new IntersectionObserver(function(es){es.forEach(function(en){
      var v = en.target; if(en.isIntersecting && !reduce){ v.play().catch(function(){}); } else { v.pause(); }
    })}, {threshold:.25});
    document.querySelectorAll('video.loop').forEach(function(v){ io.observe(v); });
  })();
  </script>
  ```
  Each loop: `<video class="loop" muted loop playsinline preload="none" poster="/media/loops/write-a-post.jpg"><source src="/media/loops/write-a-post.webm" type="video/webm"><source src="/media/loops/write-a-post.mp4" type="video/mp4"></video>`.
- [ ] Author the publish diagram (section `publish`) as a pure-CSS animated 4-step flow (composer → commit → Action → live post) using boxes + an animated connecting line; reduced-motion shows the static diagram. No external asset.
- [ ] In `build.mjs`, copy `src/marketing/media/` into `dist/media/` if present (guard so a missing/partial media dir never fails the build — the parallel pipeline fills it):
  ```js
  try { copyTree(`${MKT}/media`, `${DIST}/media`); console.log('media: marketing loops/screens copied'); }
  catch (e) { console.log('media: none staged yet (parallel pipeline) — pages reference lazily'); }
  ```
- [ ] Commit placeholder posters at `src/marketing/media/loops/{write-a-post,interactives,themes,share-social,flipbook}.jpg` (neutral solid/gradient stills, no PII) so posters resolve before real loops arrive. Leave `.webm`/`.mp4` to the parallel pipeline; `preload="none"` + missing sources degrade to the poster.
- [ ] Build + verify the baked interactive and loop references:
  ```
  node build.mjs && grep -c "pg-features" dist/features.html && grep -c "/media/loops/write-a-post" dist/features.html && node --test build-marketing.test.mjs
  ```
  Expected: `1`, `1` (or more), tests pass.
- [ ] Verify the live interactive actually runs: serve dist, open `/features`, scroll to `#interactives`, confirm the gradient widget renders and responds (drag/among its controls). Confirm reduced-motion mode leaves videos on their poster.
- [ ] Grep-gate the new copy locally:
  ```
  node scripts/grep-gate.mjs
  ```
  Expected: `grep-gate: clean ✓`.

---

## Task 6 — `/themes` (live switcher + 5 category rows + 20 chips + screenshot strip)

**Files:**
- Create `src/marketing/themes.html` (injected by Task 1's build loop).
- Modify `netlify.toml` (scoped header override so `/themes-css/sample-post.html` can be framed same-origin).
- Modify `build.mjs` (emit a small `themes-data.js` from `themes.json`, OR inline the chip data into `themes.html` at build — prefer inlining the 20 chips at authoring time, sourced from `themes.json`).
- Uses `dist/themes-css/**` from Task 3 and `/media/screens/*` from the parallel pipeline.

**Interfaces:**
- Consumes: `themes.json` (ids, names, categories, preview swatches), Task 3's `sample-post.html` + vendored CSS.
- Produces: `dist/themes.html`; one `netlify.toml` header override.
- Switcher contract: a same-origin `<iframe id="theme-frame" src="/themes-css/sample-post.html">`; clicking a chip calls `themeFrame.contentWindow.postMessage({ blogTheme: id }, location.origin)`; the sample doc's listener (Task 3) sets `data-blog-theme`. postMessage (not direct `contentDocument` writes) so it works regardless of load timing and keeps the sample doc self-driving.
- Framing header override (netlify.toml) — the ONLY sanctioned deviation from the global CSP:
  ```toml
  [[headers]]
    for = "/themes-css/sample-post.html"
    [headers.values]
      X-Frame-Options = "SAMEORIGIN"
      Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self'; frame-ancestors 'self'; object-src 'none'; base-uri 'self'"
  ```
  (Netlify applies the MORE specific path rule; this doc is framed only by same-origin `/themes`. Everything else keeps `X-Frame-Options: DENY` + `frame-ancestors 'none'`.)

**Steps:**

- [ ] Add the scoped `[[headers]]` override to `netlify.toml` (append after the global `/*` block). Keep the global block unchanged.
- [ ] Author `src/marketing/themes.html`. Head: title/description/canonical (`/themes`)/og. Body: nav, intro, the live switcher, 5 category rows of chips, screenshot strip, kids note. Switcher skeleton:
  ```html
  <section class="section"><div class="mkt-wrap">
    <p class="eyebrow">Twenty themes, live</p>
    <h2>Try any look on a real post</h2>
    <div class="switcher">
      <iframe id="theme-frame" title="Live theme preview" src="/themes-css/sample-post.html"
        style="width:100%;height:520px;border:1px solid var(--hairline);border-radius:14px;background:#04060c"></iframe>
    </div>
    <div class="theme-cats">
      <!-- one .cat block per category; chips built from themes.json -->
      <div class="cat"><h3>Clean &amp; Simple</h3><div class="chips">
        <button class="chip" data-theme="observatory" style="--sw:#22d3ee">Observatory</button>
        <button class="chip" data-theme="ledger" style="--sw:#0f766e">Ledger</button>
        <button class="chip" data-theme="air" style="--sw:#2f6bff">Air</button>
        <button class="chip" data-theme="graphite" style="--sw:#aeb7c2">Graphite</button>
      </div></div>
      <!-- Editorial: broadsheet, journal, kiosk, gazette -->
      <!-- Creative & Fun: neon, zine, scrapbook, arcade -->
      <!-- First Blogs (ages 10 to 15): doodle, rocket, pixel, comic -->
      <!-- Photo & Portfolio: gallery, darkroom, contact-sheet, polaroid -->
    </div>
  </div></section>
  <script>
  (function(){
    var frame = document.getElementById('theme-frame');
    function pick(id){
      frame.contentWindow.postMessage({ blogTheme: id }, location.origin);
      document.querySelectorAll('.chip').forEach(function(c){ c.setAttribute('aria-pressed', c.dataset.theme===id ? 'true':'false'); });
    }
    document.querySelectorAll('.chip').forEach(function(c){ c.addEventListener('click', function(){ pick(c.dataset.theme); }); });
  })();
  </script>
  ```
  Populate all 20 chips exactly from `themes.json` (id → data-theme, name → label, `preview.accent` → `--sw` swatch). Category labels: "Clean & Simple", "Editorial", "Creative & Fun", "First Blogs (ages 10 to 15)" (spell the range out, no en/em-dash), "Photo & Portfolio".
- [ ] Add the screenshot strip (fallback/preview while the iframe loads and for social share) referencing `/media/screens/<id>.png` per theme, lazy-loaded. The parallel pipeline provides these; commit neutral placeholders or omit `<img>` gracefully (use `loading="lazy"` + width/height to avoid layout shift).
- [ ] Add the kids-row note: the kids themes (`doodle, rocket, pixel, comic`) ship a floating dyslexia-friendly reading toggle and a one-time publish celebration (from `_kids-extras.css`). State it factually, no hype.
- [ ] Build + verify the switcher wiring and all 20 chips exist:
  ```
  node build.mjs && grep -o 'data-theme="[a-z-]*"' dist/themes.html | sort -u | wc -l && grep -c "theme-frame" dist/themes.html
  ```
  Expected: `20`, `1`.
- [ ] Live-verify the switcher: serve dist, open `/themes`, click through several chips across all five categories, confirm the framed post restyles each time (broadsheet masthead, neon glow, doodle notebook, gallery white-cube). Confirm the framing header lets the iframe load (no `X-Frame-Options` refusal in console).
- [ ] Owner gallery review gate (per memory "Chapbook theme quality bar" + spec): this page sells the flagship differentiator — do NOT merge to prod without the owner reviewing the switcher across all 20 themes (Task 9 assembles the screenshot gallery that feeds this review).

---

## Task 7 — `/pricing` (card + trial-first CTAs + FAQ)

**Files:**
- Create `src/marketing/pricing.html` (injected by Task 1's build loop).
- Flesh out `src/marketing/_trial.html` (the shared trial email-capture partial + inline JS).

**Interfaces:**
- Consumes: `marketing.css`, nav/footer; `%%STRIPE_BUY_URL%%`, `%%PRICE%%`; the trial partial `<!-- MKT:TRIAL -->`.
- Produces: `dist/pricing.html`; `_trial.html` used here AND inlined on the home page (Task 4).
- Trial-capture contract (`_trial.html`): a form with `id="trial"` (so `#trial` anchors resolve), an email input, a submit button, and a `.trial-msg` status region. Inline JS POSTs `{ email, product: 'studio' }` to `/.netlify/functions/trial-request` (same-origin) and shows the returned `message` ("Check your email for your 7-day key.") on success, a friendly error otherwise. No external calls, no libraries.

**Steps:**

- [ ] Author `src/marketing/_trial.html`:
  ```html
  <section class="section trial" id="trial"><div class="mkt-wrap"><div class="card trial-card">
    <p class="eyebrow">Free for 7 days</p>
    <h2>Start your trial</h2>
    <p>Enter your email and we will send a 7-day key. No card, one trial per person.</p>
    <form class="trial-form" novalidate>
      <input type="email" name="email" required autocomplete="email" placeholder="you@example.com" aria-label="Your email">
      <button class="btn-primary" type="submit">Send my key</button>
    </form>
    <p class="trial-msg" role="status" aria-live="polite"></p>
  </div></div></section>
  <script>
  (function(){
    var form = document.querySelector('.trial-form'); if(!form) return;
    var msg = document.querySelector('.trial-msg');
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var email = form.email.value.trim();
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ msg.textContent = 'Please enter a valid email address.'; return; }
      msg.textContent = 'Sending…';
      fetch('/.netlify/functions/trial-request', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email, product: 'studio' })
      }).then(function(r){ return r.json().catch(function(){ return {}; }).then(function(b){ return { ok:r.ok, b:b }; }); })
        .then(function(res){ msg.textContent = res.ok && res.b.message ? res.b.message : (res.b.message || 'Something went wrong. Email support@rqai.co.uk and we will sort it.'); })
        .catch(function(){ msg.textContent = 'Network error. Please try again, or email support@rqai.co.uk.'; });
    });
  })();
  </script>
  ```
  (Product `'studio'` is the only value `trial-request.mjs` accepts besides null; the backend mints a `product:'trial'` 7-day key. `chapbook.rqai.co.uk` is already an allowed origin, and same-origin needs no CORS anyway.)
- [ ] Author `src/marketing/pricing.html`. One card, trial-first CTAs, FAQ. Skeleton:
  ```html
  <section class="section"><div class="mkt-wrap"><div class="card price-card">
    <p class="eyebrow">One plan</p>
    <h1>%%PRICE%% a year</h1>
    <ul class="price-list">
      <li>All twenty themes and every update</li>
      <li>Every device with one key</li>
      <li>Bring your own AI keys (your keys, your costs)</li>
      <li>14-day refunds</li>
    </ul>
    <div class="hero-cta">
      <a class="btn-primary" href="#trial">Start free trial</a>
      <a class="btn-ghost" href="%%STRIPE_BUY_URL%%">Buy Chapbook</a>
    </div>
  </div></div></section>
  <!-- MKT:TRIAL -->
  <section class="section faq"><div class="mkt-wrap">
    <h2>Questions</h2>
    <!-- FAQ items below -->
  </div></section>
  ```
- [ ] Write the FAQ. Required items (per spec): you own your content; what a lapse means; trial limits; AI costs; support/refunds. Draft answers factually:
  - **You own your content** — "Your posts live in your own GitHub repository and your media in your own R2 bucket. If Chapbook disappeared tomorrow, your blog would keep working: it is a static site you host."
  - **Trial limits** — "The trial runs for 7 days, free, with no card. One trial per person."
  - **AI costs** — "AI features use your own provider keys (Anthropic, OpenAI, or Google). Requests go straight from your browser to that provider; you pay them directly, and we never see your key."
  - **Support and refunds** — "Email support@rqai.co.uk. Full refund within 14 days of purchase or a renewal charge."
- [ ] Write the **lapse** FAQ answer from the ACTUAL code, not assumption. Verify first, then write. Verification:
  - Read `src/index.html:19124-19132` (`verifyLicence`: an expired key returns `{valid:false, payload, reason:'expired'}`).
  - Read `src/index.html:19168-19193` (`licenceGate`: the non-valid branch runs `localStorage.removeItem(LIC_STORE)` then `$('licence').style.display='block'` — i.e. the app shows the ACTIVATION screen; it does NOT run read-only).
  - Confirm empirically: serve dist, in the app at `/app` run `localStorage.setItem('helm.studio.licence','IPL1.'+btoa('{"name":"x","product":"studio","expires":"2000-01-01"}')+'.x')` then reload — the activation gate should appear. (Any malformed/expired key triggers the same gate.)
  - Truthful answer to write: "If your licence lapses, Chapbook shows the activation screen the next time it opens. It does not keep running in a read-only mode. Nothing you have made is lost: your drafts stay in this browser and your published posts stay in your GitHub repo and R2 bucket. Enter a renewed key and you are exactly where you left off." (No em-dashes.)
- [ ] Add head SEO for `/pricing` (title/description/canonical/og). Build + verify CTAs + trial endpoint wiring:
  ```
  node build.mjs && grep -c "buy.stripe.com/5kQeVd0C" dist/pricing.html && grep -c "functions/trial-request" dist/pricing.html && grep -c 'id="trial"' dist/pricing.html
  ```
  Expected: `1`, `1`, `1`.
- [ ] Owner price check (spec + Global Constraints): confirm `%%PRICE%%` (`£49`) matches the amount the live Stripe checkout actually charges BEFORE prod. If the live price differs, set `CHAPBOOK_PRICE` at build. Do not guess.
- [ ] No-em-dash + grep-gate check:
  ```
  grep -c $'—' dist/pricing.html || echo "no em-dash"; node scripts/grep-gate.mjs
  ```
  Expected: `no em-dash`; `grep-gate: clean ✓`.

---

## Task 8 — Desktop 1.0.1 (tauri url → /app + version bump)

**Files:**
- Modify `desktop/src-tauri/tauri.conf.json` (window `url` → `/app`; `version` → `1.0.1`; `devUrl` optional).

**Interfaces:**
- Consumes: nothing at build. Produces: an updated Tauri config. The tag `desktop-v1.0.1` is pushed ONLY AFTER prod cutover (CI signs + notarizes; `scripts/stage-installers.mjs` then serves it on `/download`).

**Steps:**

- [ ] Edit `desktop/src-tauri/tauri.conf.json`:
  - `"version": "1.0.1"` (was `1.0.0`).
  - `app.windows[0].url`: `"https://chapbook.rqai.co.uk/app"` (was `…co.uk`).
  - Optionally `build.devUrl`: `"https://chapbook.rqai.co.uk/app"` for parity.
- [ ] Verify JSON validity:
  ```
  node -e "const c=require('./desktop/src-tauri/tauri.conf.json'); if(c.version!=='1.0.1'||!c.app.windows[0].url.endsWith('/app')) throw 'bad'; console.log('tauri conf ok:', c.version, c.app.windows[0].url)"
  ```
  Expected: `tauri conf ok: 1.0.1 https://chapbook.rqai.co.uk/app`.
- [ ] DO NOT push the `desktop-v1.0.1` tag now. Note in the rollout checklist (Task 9) that the tag is pushed only after prod is promoted, then CI builds/signs and `/download` auto-picks it via `stage-installers.mjs`.

---

## Task 9 — Gates + QA (release-gate marketing checks, grep-gate, Lighthouse, screenshot gallery, draft-deploy checklist)

**Files:**
- Modify `scripts/release-gate.mjs` (retarget app checks to `/app`; add marketing checks; fix check8 to read `CACHE` dynamically).
- Create `scripts/qa-gallery.mjs` (headless screenshots of every page × 1280/768/390 → an owner-review gallery).
- Create `release-gate.test.mjs` (unit-test the new pure check helpers where practical).
- No page changes here; this task verifies the whole site.

**Interfaces:**
- Consumes: a deployed draft URL; `dist/` artifacts; `helm.studio.licence` + `helm.studio.config.v1` (seeded for screenshots).
- Produces: extended release-gate; a QA gallery HTML in the scratchpad for owner review.

**Steps:**

- [ ] Fix release-gate check8 to read the cache name from `dist/sw.js` instead of the hardcoded `chapbook-v1`. Add a reader mirroring `readShell()`:
  ```js
  function readCacheName() {
    const sw = readFileSync(join(REPO_ROOT, 'dist', 'sw.js'), 'utf8');
    const m = sw.match(/const\s+CACHE\s*=\s*['"]([^'"]+)['"]/);
    if (!m) throw new Error('CACHE name not found in dist/sw.js');
    return m[1];
  }
  ```
  In `check8_swActivation`, replace both `'chapbook-v1'` occurrences with the value from `readCacheName()` (the loop condition and the FAIL detail). This makes the check track v6 and every future bump automatically.
- [ ] Retarget the app-shell logic and add marketing checks. The SHELL now contains `/app` + `/app/index.html`, so check1 already asserts they return 200 (it reads `dist/sw.js`). Add a new check for the marketing pages returning 200 with security headers, no PII, the trial CTA present, and a valid sitemap. Add `check10_marketing(origin)`:
  ```js
  async function check10_marketing(origin) {
    const pages = ['/', '/features', '/themes', '/pricing', '/download', '/privacy', '/terms', '/refunds'];
    const bad = [];
    for (const p of pages) {
      try {
        const res = await fetchT(new URL(p, origin).href);
        if (res.status !== 200) { bad.push(`${p} → ${res.status}`); continue; }
        const missing = REQUIRED_HEADERS.filter((h) => !res.headers.get(h));
        if (missing.length) bad.push(`${p} missing ${missing.join(',')}`);
      } catch (e) { bad.push(`${p} → ${errStr(e)}`); }
    }
    // sitemap valid + trial CTA present on pricing + home
    try {
      const sm = await fetchT(new URL('/sitemap.xml', origin).href);
      const smx = await sm.text();
      if (!smx.startsWith('<?xml') || !smx.includes('<loc>')) bad.push('sitemap.xml invalid');
      for (const p of ['/', '/pricing']) {
        const h = await (await fetchT(new URL(p, origin).href)).text();
        if (!h.includes('functions/trial-request') && !h.includes('href="#trial"') && !h.includes('/pricing#trial')) bad.push(`${p} has no trial CTA`);
      }
    } catch (e) { bad.push(`sitemap/CTA: ${errStr(e)}`); }
    if (bad.length) return fail(10, 'Marketing pages: 200 + headers + sitemap + trial CTA', bad.join(' | '));
    return pass(10, 'Marketing pages: 200 + headers + sitemap + trial CTA', `${pages.length} pages OK`);
  }
  ```
  Call it from `main()` after `check7_templates()`. Check5 (grep-gate over dist) and check6 (live Stripe link on `/`, no test link) already cover PII + Stripe for the whole site.
- [ ] Add a marketing copy lint to the gate (or to grep-gate): fail if any dist marketing HTML contains U+2014 (em-dash) in visible text. Simplest as a new gate check reading local dist:
  ```js
  async function check11_noEmDash() {
    const files = ['index.html','features.html','themes.html','pricing.html','download.html','privacy.html','terms.html','refunds.html'];
    const bad = [];
    for (const f of files) {
      try { if (readFileSync(join(REPO_ROOT,'dist',f),'utf8').includes('—')) bad.push(f); } catch {}
    }
    if (bad.length) return fail(11, 'No em-dash in visible marketing copy', `found in ${bad.join(', ')}`);
    return pass(11, 'No em-dash in visible marketing copy', `${files.length} pages clean`);
  }
  ```
  (Note: legal pages are extracted from `index.html`, whose copy DOES use em-dashes in the app modal. Decide policy: EITHER exclude the three legal pages from this check, OR strip/replace em-dashes during legal extraction in `build-marketing.mjs`. Recommended: exclude legal pages from check11 — they are legal prose extracted verbatim from a single source and the "no em-dash" rule targets authored marketing copy. Remove `privacy/terms/refunds` from the `files` list above.)
- [ ] Create `release-gate.test.mjs` unit-testing the pure readers (`readShell`, `readCacheName`) against a temp `dist/sw.js` fixture, so the gate's parsing cannot silently rot. Run:
  ```
  node --test release-gate.test.mjs
  ```
  Expected: pass.
- [ ] Create `scripts/qa-gallery.mjs` — headless Playwright (resolve from node_modules; SKIP cleanly if absent, like release-gate does). It: serves `dist/` locally (or takes a base URL), seeds `localStorage['helm.studio.licence']` + `['helm.studio.config.v1']` before loading `/app` (so app screenshots are past the gate, per the 2026-07-15 mobile-qa harness pattern), shoots every page `['/', '/features', '/themes', '/pricing', '/download', '/privacy', '/terms', '/refunds', '/app']` at widths `[1280, 768, 390]` (iPhone-14 device for 390), writes PNGs to the scratchpad, and assembles a single `gallery.html` (grid of all shots, labelled) for owner review. NO owner PII in any pixel (blog-name placeholders only). Command:
  ```
  node scripts/qa-gallery.mjs http://localhost:5055
  ```
  Expected: `wrote <scratchpad>/qa/gallery.html (27 shots)` (9 pages × 3 widths).
- [ ] Lighthouse budget check on `/` (perf ≥ 90; hero interactive < 2s on 4G — the hero is CSS/JS, no video). Method: use the chrome-devtools MCP `lighthouse_audit` (or `npx lighthouse http://localhost:5055/ --only-categories=performance --form-factor=mobile --throttling-method=simulate`) against the served dist. Record the performance score and LCP. Expected: performance ≥ 90; if below, the usual levers are the hero (already asset-free) and font `font-display: swap` (already set) — investigate render-blocking CSS.
- [ ] Full local gate dry-run before any deploy:
  ```
  npm run build && node scripts/grep-gate.mjs && node --test
  ```
  Expected: build clean; `grep-gate: clean ✓`; full suite green (baseline 616 + new marketing/themes/release-gate tests).
- [ ] Draft deploy + release-gate against the draft (per package.json `deploy:draft`):
  ```
  npm run deploy:draft
  node scripts/release-gate.mjs https://<draft-id>--inayat-studio.netlify.app
  ```
  Expected: `GATE: PASS (all runnable checks green)` for the HTTP checks; browser checks (8/9) run if Playwright is present, else SKIP with the loud reminder (run them headless before cutover).
- [ ] **Installed-PWA SW v5→v6 migration test** (the highest-risk item — a previously-installed profile holds `chapbook-v5` with `/` as the app shell). On a profile that already installed the OLD PWA (or simulate: load the current prod once to install v5, then point the browser at the draft):
  1. Load the draft `/app` in the installed profile; confirm the SW updates and `caches.keys()` shows ONLY `chapbook-v6` (the `activate` handler drops `chapbook-v5`).
  2. Confirm a request to `/` now serves the MARKETING home (not the app) — the offline fallback no longer serves the app shell for `/`.
  3. Confirm a licensed profile hitting `/` boot-shims to `/app` (localStorage key present).
  4. Go offline, reload `/app`; confirm it still boots from cache (shell precached at `/app/index.html`).
  5. Confirm the manifest now reports `scope`/`start_url` = `/app` (DevTools → Application → Manifest).
- [ ] Draft verification checklist (all must pass before prod promote):
  - [ ] Marketing pages `/ /features /themes /pricing /download` and legal `/privacy /terms /refunds` all 200 with security headers.
  - [ ] `/app` serves the app; activation gate works; a valid key boots; publish smoke test commits to a test repo.
  - [ ] Boot-shim: unlicensed `/` shows marketing; licensed `/` replaces to `/app`.
  - [ ] Live theme switcher restyles the framed sample post across all 20 themes (no X-Frame-Options refusal).
  - [ ] Live embedded interactive runs on `/features`.
  - [ ] Trial form POSTs to `/.netlify/functions/trial-request` and shows "Check your email for your 7-day key." (backend may be INERT/500 if `GITHUB_QUEUE_TOKEN` is unset on the draft — confirm the request is well-formed regardless).
  - [ ] Stripe secondary CTA opens the LIVE checkout (`buy.stripe.com/5kQeVd0C…`), price matches `%%PRICE%%`.
  - [ ] PWA SW v5→v6 migration steps above all pass.
  - [ ] Lighthouse `/` perf ≥ 90.
  - [ ] QA gallery assembled and reviewed by the owner (theme page especially — flagship differentiator).
- [ ] Rollout (single cutover, per spec) once the owner approves the gallery:
  ```
  npm run deploy:prod
  node scripts/release-gate.mjs https://chapbook.rqai.co.uk
  ```
  Then push the desktop tag so CI builds 1.0.1 and `/download` picks it up:
  ```
  git tag desktop-v1.0.1 && git push origin desktop-v1.0.1
  ```
  Then verify `/download` serves 1.0.1 (its `data-mf="version"` fine print reads from `downloads/manifest.json`), and update the rqai.co.uk hub Chapbook link copy if needed (separate repo, owner call).

---

## Self-review notes (author)

- **Spec coverage** — every spec section maps to a task: app move + boot-shim + manifest + SW + legal extraction + `_redirects` → Task 1; marketing shell + partials + SEO + og-image → Task 2; theme vendoring + sample post → Task 3; home + hero scene → Task 4; `/features` 7 sections + live interactive + loops → Task 5; `/themes` switcher + categories + chips + screenshots → Task 6; `/pricing` card + trial-first CTAs + FAQ (incl. code-derived lapse answer) → Task 7; desktop 1.0.1 → Task 8; gates + grep + Lighthouse + screenshot gallery + SW-migration + rollout → Task 9.
- **Interface consistency** — marker tokens (`<!-- MKT:NAV/FOOTER/TRIAL -->`, `%%STRIPE_BUY_URL%%`, `%%PRICE%%`, `%%YEAR%%`) are defined once (Task 1/2) and reused verbatim. CSS class contract (`.mkt-nav .btn-primary .btn-ghost .card .section .eyebrow .trial-form .trial-msg`) is shared. `/media/loops/<name>` names (`write-a-post interactives themes share-social flipbook`) and `/media/screens/<id>.png` are consistent across Tasks 5/6/9. The 20 theme ids are identical in Tasks 3/6 and match `themes.json`. `helm.studio.licence` + `helm.studio.config.v1` are used identically in the boot-shim (Task 1) and the QA harness (Task 9).
- **No placeholders/TBD** — every code step shows real code; every command step shows the command + expected output. The two genuinely-external inputs (video loops, per-theme screenshots) are explicitly owned by a parallel pipeline with exact filenames and graceful build handling + committed placeholder posters, so pages build and QA runs before they land.
- **TDD applied where the spec requires** — build.mjs helpers + legal extraction (`build-marketing.test.mjs`, test-first), SW SHELL/CACHE + manifest scope (asserted post-build), theme vendoring completeness + no-external-url (`themes-css.test.mjs`), release-gate parsers (`release-gate.test.mjs`). Pure-page HTML/CSS tasks (4/5/6/7) use build + serve + grep/visual verification instead.
