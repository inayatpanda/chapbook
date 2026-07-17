# Chapbook marketing site + app move to /app — design spec

Date: 2026-07-17 · Owner-approved in session (architecture, page map, demos, CTA model all chosen explicitly).

## Goal

chapbook.rqai.co.uk stops greeting strangers with an activation gate. Root becomes a
multi-page marketing site; the Studio moves to `/app`; `/download` (already shipped)
joins the nav. Trial-first CTA. Every demo is real product, not mockups.

## Decisions (owner-selected)

1. **App at `/app`**, marketing at `/`. Boot-shim on `/`: licence in localStorage →
   `location.replace('/app')` before first paint. Desktop re-releases as 1.0.1 pointing
   at `/app`. PWA `start_url`+`scope` → `/app` (`id` unchanged).
2. **Multi-page**: `/`, `/features`, `/themes`, `/pricing`, `/download`, plus static
   `/privacy` `/terms` `/refunds` extracted from the app's legal modal copy (single
   source: extracted at build from index.html's legal blocks — copy must not fork).
3. **Demo layers (all four)**: trimmed tutorial video loops; live 20-theme switcher
   (real template CSS on a sample post, sandboxed iframe); one embedded reader
   interactive (neutral preset, rendered as published blogs render it); fresh app
   screenshots (headless, seeded licence).
4. **Hero on `/`**: hand-built CSS/JS animated scene (~12s loop): phone-frame chat
   message → becomes a post block → Publish ✓ → browser-frame blog renders it →
   theme flips doodle→neon→broadsheet. Reduced-motion = final composed frame.
5. **CTA model: trial-first.** Primary "Try Chapbook free" (7-day key; links to the
   `/app` activation gate's existing trial-request flow). Secondary "£49/yr" → live
   Stripe link (read the current one from the app source at build/implementation time;
   do not hardcode a stale link).

## Architecture

- **No new toolchain.** Hand-authored static HTML pages + one shared `marketing.css`
  + shared nav/footer partials injected by build.mjs (same pattern as download.html).
  Plain JS, inline or same-origin files, current CSP must hold (script-src 'self'
  'unsafe-inline'; no external hosts).
- **build.mjs** emits: marketing pages at dist root; the app at `dist/app/index.html`
  (app asset paths are root-relative — `/studio.js` etc. — so no app-code rewrites);
  vendored theme CSS under `/themes-css/`; marketing media under `/media/`.
- **sw.js**: SHELL `'/'`→`'/app'`; offline fallback must NOT serve the app shell for
  marketing URLs (scope fallback to requests under /app only); CACHE v5→v6.
- **manifest.json**: start_url `/app`, scope `/app`, id unchanged.
- **desktop/src-tauri/tauri.conf.json**: window url → https://chapbook.rqai.co.uk/app,
  version 1.0.1. Tag `desktop-v1.0.1` AFTER prod cutover (CI signs+notarizes; secrets
  armed 2026-07-17). `/download` auto-picks the newest desktop-v* release.
- **release-gate.mjs**: app checks (SW shell, activation, stripe link) retarget `/app`;
  add marketing checks: 200 + security headers on all 5 pages, no PII, trial CTA
  present, sitemap.xml valid.
- **_redirects**: keep canonical-host 301; no SPA catch-all. `/app` serves
  dist/app/index.html (Netlify pretty URLs handle /app → app/index.html; verify —
  else add explicit `/app /app/index.html 200`).
- **SEO**: per-page title/description/canonical/og; sitemap.xml; robots.txt;
  og-image (brand book on midnight, generated once).

## Pages (content contracts)

### `/` — convert
Nav · hero (headline + trial CTA + £49/yr secondary + animated scene) · 4 feature
teasers each linking into /features (chat composer · interactives+glyphs · themes ·
publish-to-your-own-repo) with loop/still each · theme-strip taste linking /themes ·
pricing teaser card · download strip (3 platforms, links /download) · footer.

### `/features` — convince
Sections, each = demo + feature-led copy: (1) chat composer (write-a-post loop);
(2) blocks & media: 12 block types, darkroom, R2 video (stills + flipbook loop);
(3) interactives: LIVE embedded neutral preset + glyph generator (5093 icons, 2D/3D);
(4) AI partner BYOK: Partner/Editor/Goblin/Social pack, keys stay in the browser,
model auto-heal (share-social loop covers social pack); (5) share & planner;
(6) publish = atomic commit to YOUR repo + GitHub Pages (animated diagram:
composer → commit → Action → live post); (7) phone story: PWA install, framed
mobile stills. Copy rules: feature-led, factual, no hype, no em-dashes in visible text.

### `/themes` — delight
Live switcher: sample post (neutral content, e.g. the sourdough/coffee corpus) in a
sandboxed same-origin iframe; 20 chips grouped by the 5 categories (Clean & Simple,
Editorial, Creative & Fun, Kids & First Blogs 10-15, Photo & Portfolio); clicking
swaps the REAL vendored theme CSS. Screenshot strip as fallback/preview. Kids row
notes the dyslexia-font toggle + publish celebration. Quality bar: this page sells
the flagship differentiator — owner gallery review before merge.

### `/pricing` — close
One card: £49/yr · all 20 themes + updates · every device with one key · BYOK AI
(your keys, your costs) · 14-day refunds. Primary [Start free trial] → /app gate
trial flow; secondary [Buy Chapbook] → live Stripe. FAQ: you own your content
(repo+R2 are yours, works if we vanish); what lapse means (app read-only? state
TRUTHFULLY from code — verify licence-expiry behaviour before writing this answer);
trial limits (7 days, one per person); AI costs; support/refunds contacts.

### `/download` — exists; gains shared nav; content unchanged.

## Demo asset pipeline

- Loops: ffmpeg (remotion's bundled binary; needs DYLD_LIBRARY_PATH=its dir) trims
  tutorial mp4s → 8-15s, 960px wide, muted webm(vp9)+mp4(h264) pairs ~1-2MB + poster
  jpg. Lazy-loaded, poster-first, reduced-motion → poster only. Source videos in
  ~/Projects/chapbook-tutorials/out/.
- Screenshots: headless Playwright against a local dist serve with seeded licence
  (harness pattern: scratchpad/mobile-qa/run.mjs from 2026-07-15 session; licence key
  `helm.studio.licence`, config `helm.studio.config.v1`). Desktop 1280 + iPhone-14
  390 phone frames. NO owner PII in any pixel (blog name placeholders only).
- Theme CSS vendored from ~/Projects/chapbook-template/src/styles/themes/*.css +
  fonts the themes need (subset already self-hosted; kids extras file included).
  Sample post markup mirrors the template's post page structure so theme selectors hit.

## Quality gates

616-test suite green; grep-gate clean over dist (no PII, no clinical terms — marketing
copy included); release-gate extended and green vs draft; Lighthouse on `/` ≥90 perf
(hero interactive <2s on 4G — scene is CSS/JS, no video in hero); screenshot QA of
every page at 1280/768/390 assembled into an owner-review gallery BEFORE prod.

## Rollout (single cutover)

Draft deploy → full verification (marketing pages + app at /app + activation + publish
smoke + PWA manifest/SW migration on a previously-installed profile) → owner gallery
review → prod promote → tag desktop-v1.0.1 → verify CI release lands + /download
serves 1.0.1 → update rqai.co.uk hub Chapbook link copy if needed (separate repo,
owner call).

## Risks / notes

- SW migration: previously-installed PWAs hold cache chapbook-v5 with '/' as shell;
  v6 activate() drops old caches; boot-shim covers the transition. Verify on a real
  installed profile before prod.
- The 19k-line src/index.html remains ONE-WRITER-AT-A-TIME across subagents.
- Metrics: metrics.mjs visit counting currently fires from the app; after the move,
  marketing '/' visits won't count as app visits (fine — note for Helm dashboards).
- Legal copy extraction must not drift: build extracts from index.html; if extraction
  is brittle, fall back to one shared source file included by both.
