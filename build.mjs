// Build Chapbook — the deployable static site.
//  1. esbuild-bundle the engine → src/studio.js (browser ESM, no server).
//  2. emit dist/ — a root-relative static site. Source paths are already root-relative
//     ('/'), so the build only injects runtime config, bundles the engine, and copies
//     assets verbatim — it does NO path rewriting.
import { build } from 'esbuild';
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { AI_DEFAULT_MODELS } from './src/core/aiDefaults.js';
import { PUBLIC_KEY as LICENCE_PUBLIC_KEY } from './src/lib/licence-pubkey.js';
import { assertInlineModulesParse } from './checkInlineModule.mjs';
import { extractStripeUrl, extractLegalBlock, LEGAL_TITLES, renderLegalPage, injectMarketing } from './src/marketing/build-marketing.mjs';
import { buildInstance } from './src/lib/playgrounds/index.js';
import { cacheNameFor, readShellPaths, shellDistFile, withCacheName, sttCacheNameFor, withSttCacheName } from './scripts/sw-cache-name.mjs';
import { STT_VENDOR_FILES, STT_MODELS } from './scripts/stt-files.mjs';

const SRC = 'src';
const DIST = 'dist';

// Drift guard: the Studio's inline licence-gate key (window.__LICENCE_PUBLIC_KEY)
// must match server/licence.js PUBLIC_KEY. `npm run licence:init` patches both;
// this catches a hand-edit that touched only one. (Empty on both = unlicensed
// build, which is fine.)
{
  const idx = readFileSync(`${SRC}/index.html`, 'utf8');
  const m = idx.match(/window\.__LICENCE_PUBLIC_KEY='([^']*)';/);
  if (!m) throw new Error('build: window.__LICENCE_PUBLIC_KEY not found in index.html');
  if (m[1] !== LICENCE_PUBLIC_KEY)
    throw new Error('build: Studio licence key drifted from server/licence.js — re-run `npm run licence:init` (or sync both).');
  console.log(`licence verify key: ${LICENCE_PUBLIC_KEY ? 'baked ✓' : '(none — unlicensed build)'}`);
}

// Sanity-check: the inline provider→default-model map in index.html must match the
// unit-tested source of truth (core/aiDefaults.js). They're mirrored, not imported
// (index.html's inline script isn't a module), so guard against silent drift.
{
  const idx = readFileSync(`${SRC}/index.html`, 'utf8');
  const m = idx.match(/const AI_DEFAULT_MODELS\s*=\s*\{([^}]*)\}/);
  if (!m) throw new Error('build: inline AI_DEFAULT_MODELS not found in index.html');
  for (const [id, model] of Object.entries(AI_DEFAULT_MODELS)) {
    if (!new RegExp(`${id}\\s*:\\s*['"]${model.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`).test(m[1]))
      throw new Error(`build: inline AI_DEFAULT_MODELS drifted from core/aiDefaults.js for "${id}" (expected "${model}")`);
  }
  console.log('AI_DEFAULT_MODELS: inline map matches core/aiDefaults.js ✓');
}

// Drift guard: the revocation predicates are mirrored, not imported — src/lib/revocation.js
// (isRevoked / shouldReplaceCache) is unit-tested, but index.html's inline gate can't import
// it (lib/ isn't shipped to dist), so it carries verbatim copies (_isRevoked /
// _shouldReplaceRevoked). This asserts the inline bodies still match the module ones.
// Method: extract each function's body (between its signature `{` and the closing `}` on its
// own line — these bodies have no nested braces), strip ALL whitespace, compare the results.
// This tolerates formatting differences (the module spaces operators, the inline copy doesn't)
// while catching any real logic drift. Re-sync the mirror if this throws.
{
  const bodyOf = (src, name) => {
    const m = src.match(new RegExp(`function\\s+${name}\\s*\\([^)]*\\)\\s*\\{([\\s\\S]*?)\\n\\}`));
    if (!m) throw new Error(`build: could not extract body of ${name}() for revocation drift guard`);
    return m[1].replace(/\s+/g, '');
  };
  const mod = readFileSync(`${SRC}/lib/revocation.js`, 'utf8');
  const idx = readFileSync(`${SRC}/index.html`, 'utf8');
  const pairs = [
    ['isRevoked', '_isRevoked'],
    ['shouldReplaceCache', '_shouldReplaceRevoked'],
  ];
  for (const [modName, inlineName] of pairs) {
    if (bodyOf(mod, modName) !== bodyOf(idx, inlineName))
      throw new Error(`build: inline ${inlineName} in index.html drifted from ${modName} in src/lib/revocation.js — re-sync the mirror.`);
  }
  console.log('revocation predicates: inline gate matches src/lib/revocation.js ✓');
}

// Parse-check the inline `<script type="module">` with Node's real ES-module parser.
// A SyntaxError here (e.g. a duplicate top-level declaration) fails to parse in the
// browser and blanks the whole app — but is invisible to esbuild (which only bundles
// app.js) and to string-based HTML transforms. This guard turns it into a build error.
{
  const idx = readFileSync(`${SRC}/index.html`, 'utf8');
  const n = assertInlineModulesParse(idx, 'public/studio/index.html');
  console.log(`inline module parse-check: ${n} module(s) OK ✓`);
}

await build({
  entryPoints: ['src/app.js'], bundle: true, format: 'esm',
  outfile: `${SRC}/studio.js`, platform: 'browser', target: 'es2022', legalComments: 'none',
});
console.log('bundled', `${SRC}/studio.js`);

// Darkroom uploader controller — its own browser-ESM bundle (loaded directly by index.html,
// not part of the engine bundle). The pure meta-builder (core/darkroomMeta.js) is bundled IN;
// resize.js + the vendored exifr stay EXTERNAL so they're shared, separate modules resolved by
// the browser relative to index.html at the dist root.
await build({
  entryPoints: ['src/darkroom-upload.src.js'], bundle: true, format: 'esm',
  outfile: `${SRC}/darkroom-upload.js`, platform: 'browser', target: 'es2022', legalComments: 'none',
  external: ['./resize.js', './vendor/exifr.esm.js'],
});
console.log('bundled', `${SRC}/darkroom-upload.js`);

// STT (dictation) engine + its worker — separate browser-ESM bundles, same pattern as
// darkroom-upload. The pure core (core/stt.js) is bundled IN; transformers.js + the ONNX
// WASM runtime + the whisper model are NOT bundled — scripts/stage-stt.mjs stages them
// same-origin into dist/app/vendor/stt/ + dist/app/models/ and the worker dynamically
// imports /app/vendor/stt/transformers.min.js at runtime (hence the external below).
await build({
  entryPoints: ['src/stt.src.js'], bundle: true, format: 'esm',
  outfile: `${SRC}/stt.js`, platform: 'browser', target: 'es2022', legalComments: 'none',
});
console.log('bundled', `${SRC}/stt.js`);
await build({
  entryPoints: ['src/stt-worker.src.js'], bundle: true, format: 'esm',
  outfile: `${SRC}/stt-worker.js`, platform: 'browser', target: 'es2022', legalComments: 'none',
  external: ['/app/vendor/stt/*'],
});
console.log('bundled', `${SRC}/stt-worker.js`);

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

// --- index.html → dist/index.html (inject runtime config only) ---
// The product is branded "Chapbook" and root-relative at source (index.html /
// manifest.json), so the build does no brand surgery and no path rewriting — it only
// injects the runtime config globals + the engine <script> tag before writing it out.
let html = readFileSync(`${SRC}/index.html`, 'utf8');

// (a0) inject the PUBLIC OAuth Client ID + relay base for Device-Flow sign-in.
//      The Client ID is public (safe to embed); env var overrides the embedded default.
//      Placed before the engine bundle so the globals exist when app.js runs.
const GH_CLIENT_ID = process.env.STUDIO_GH_CLIENT_ID || 'Ov23liB0NzXKQmhnlPng';
const RELAY_BASE = process.env.STUDIO_RELAY_BASE || '/.netlify/functions/gh-device';
// Visible build stamp (vYYYYMMDD-<gitshortsha>) — scripts/deploy-studio.sh sets
// STUDIO_BUILD_STAMP; surfaced in the Studio's Settings footer (#buildStamp).
// Empty when built manually without the deploy script → the footer reads "local build".
const BUILD_STAMP = process.env.STUDIO_BUILD_STAMP || '';
// Blog-template source every new user's blog is seeded from (app.js generateFromTemplate).
// Canonical default is the org template repo RQAI-projects/chapbook-template (public,
// is_template); override at deploy time via env (CHAPBOOK_TEMPLATE_OWNER/REPO).
const TEMPLATE_OWNER = process.env.CHAPBOOK_TEMPLATE_OWNER || 'RQAI-projects';
const TEMPLATE_REPO = process.env.CHAPBOOK_TEMPLATE_REPO || 'chapbook-template';
html = html.replace('</head>',
  `  <script>window.__STUDIO_GH_CLIENT_ID=${JSON.stringify(GH_CLIENT_ID)};window.__STUDIO_RELAY_BASE=${JSON.stringify(RELAY_BASE)};window.__STUDIO_BUILD=${JSON.stringify(BUILD_STAMP)};window.__CHAPBOOK_TEMPLATE=${JSON.stringify({ owner: TEMPLATE_OWNER, repo: TEMPLATE_REPO })};</script>\n</head>`);
console.log('device-flow client id:', GH_CLIENT_ID || '(none)');
console.log('build stamp:', BUILD_STAMP || '(none — local build)');
console.log('blog template:', `${TEMPLATE_OWNER}/${TEMPLATE_REPO}`);

// (a) load the engine bundle before the inline module. Root-relative (/studio.js) so it
//     resolves from the app doc's new home at /app/index.html (studio.js stays at dist root).
html = html.replace('</head>', '  <script type="module" src="/studio.js"></script>\n</head>');

// (b) api() delegates to the BYOK client router (window.__studioApi) in source, and
//     the boot gate (window.__studioConfig.isReady()) is baked into index.html too,
//     so no rewrite is needed here. Just sanity-check the client-router branch is present.
if (!html.includes('if(window.__studioApi){')) throw new Error('build: api() no longer delegates to window.__studioApi — index.html changed?');

// (c) The app now lives at /app. Assets stay root-relative at the dist root (studio.js,
//     manifest.json, icons, fonts) so the app doc at /app/index.html loads them from '/'.
mkdirSync(`${DIST}/app`, { recursive: true });
writeFileSync(`${DIST}/app/index.html`, html);

// (c1) Illustrations library manifest → dist/app/illustrations-manifest.json. The
//      Illustrations gallery picker fetches this once on open (same-origin, so CSP
//      connect-src 'self' allows it). ~1121 entries, so it ships as a standalone JSON
//      file (NOT inlined into index.html). Thumbnails/full images stay on R2 (img-src
//      https:); only this index travels with the app.
copyFileSync(`${SRC}/illustrations-manifest.json`, `${DIST}/app/illustrations-manifest.json`);
console.log('illustrations manifest → dist/app/illustrations-manifest.json');

// ---- marketing shell inputs ----
// Partials + tokens shared by every marketing page. _nav/_footer are stubs in Task 1
// (fleshed out in Task 2); _trial is empty-safe until Task 7. The legal wrapper and the
// live Stripe link + legal copy all come from single sources so nothing drifts.
const MKT = `${SRC}/marketing`;
const nav = readFileSync(`${MKT}/_nav.html`, 'utf8');
const footer = readFileSync(`${MKT}/_footer.html`, 'utf8');
const trial = readFileSync(`${MKT}/_trial.html`, 'utf8');
const legalTpl = readFileSync(`${MKT}/legal.template.html`, 'utf8');
const idxSrc = readFileSync(`${SRC}/index.html`, 'utf8');
const STRIPE = extractStripeUrl(idxSrc);
const PRICE = process.env.CHAPBOOK_PRICE || '£49';
const YEAR = new Date().getUTCFullYear();
const inject = (pageHtml) => injectMarketing(pageHtml, { nav, footer, trial, stripeUrl: STRIPE, price: PRICE, year: YEAR });

// ---- /features live interactive: bake the REAL playground engine at build time ----
// The neutral Aurora gradient preset is built through the same buildInstance() the Studio
// uses, then rendered the way published blogs render a playground block (outer .playground
// wrapper + scoped <style> + the family IIFE). That whole document becomes the srcdoc of a
// sandbox="allow-scripts" iframe on /features: an opaque-origin, fully isolated frame whose
// inline IIFE still runs (srcdoc inherits the page CSP's script-src 'unsafe-inline'; srcdoc
// has no HTTP response so X-Frame-Options never applies). Newlines are collapsed so the whole
// srcdoc lands on one attribute line; then it is HTML-attribute-escaped (& " < >) so the inner
// markup and </script> cannot break out of the double-quoted srcdoc attribute.
const pg = buildInstance('gradient-maker', { stops: ['#2dd4bf', '#22d3ee', '#818cf8'], angle: 100 }, 'pg-features');
const pgSrcdoc =
    '<!doctype html><html><head><meta charset="utf-8">'
  + '<style>:root{color-scheme:dark}'
  + 'body{margin:0;padding:16px;background:#0b1120;color:#e6edf7;'
  + "font:15px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif}"
  + pg.css + '</style></head><body>'
  + `<div class="playground"><div id="${pg.domId}">${pg.html}</div></div>`
  + `<script>${pg.js}</script></body></html>`;
const escAttr = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const pgSrcdocAttr = escAttr(pgSrcdoc.replace(/\n/g, ' '));
console.log('features: baked live interactive (gradient-maker/Aurora →', `${pgSrcdocAttr.length} chars srcdoc)`);

// ---- marketing pages (each authored in its own task; guard-emit those that exist yet) ----
for (const page of ['index.html', 'features.html', 'themes.html', 'pricing.html']) {
  const p = `${MKT}/${page}`;
  try {
    let raw = readFileSync(p, 'utf8');
    // /features carries a dedicated token for the baked interactive; fill it BEFORE the
    // generic inject() so the srcdoc lands intact and inject()'s %%-pass leaves it alone.
    // NB: a FUNCTION replacement, not a string — the baked JS contains `$$` (and could
    // contain `$&`), which String.replaceAll would otherwise interpret as replacement
    // patterns and mangle (turning `var $$=` into `var $=`, breaking the widget).
    if (page === 'features.html') raw = raw.replaceAll('%%LIVE_INTERACTIVE_SRCDOC%%', () => pgSrcdocAttr);
    writeFileSync(`${DIST}/${page}`, inject(raw));
  } catch (e) { if (page === 'index.html') throw e; /* others land in later tasks */ }
}

// ---- legal pages, single-sourced from index.html's legal modal (never re-typed) ----
for (const kind of ['privacy', 'terms', 'refunds']) {
  const inner = extractLegalBlock(idxSrc, kind);
  const page = renderLegalPage({ kind, title: LEGAL_TITLES[kind], inner, tpl: legalTpl, nav, footer, year: YEAR });
  writeFileSync(`${DIST}/${kind}.html`, page);
}
console.log('legal pages: privacy/terms/refunds extracted from index.html ✓');

// --- copy every other emitted file verbatim ---
// Source paths are already root-relative, so manifest.json is a plain copy
// (no more /studio/ → / rewriting). index.html is written above with config injected.
// sw.js is NOT copied here — it is stamped with a content-hashed CACHE name at the
// end of the build, once every SHELL asset (incl. fonts) exists in dist/.
for (const f of ['manifest.json', 'studio.js', 'darkroom-upload.js', 'stt.js', 'stt-worker.js', 'preview.css', 'resize.js', 'icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'icons-manifest.json', 'icons-sprite.svg']) {
  copyFileSync(`${SRC}/${f}`, `${DIST}/${f}`);
}

// download.html is a marketing surface: run it through inject() (not a verbatim copy) so it
// carries the SAME shared nav as every other page. It is self-styled, so it does NOT link
// marketing.css — only its <!-- MKT:NAV --> marker is filled (its own footer stays bespoke).
writeFileSync(`${DIST}/download.html`, inject(readFileSync(`${SRC}/download.html`, 'utf8')));

// tutorials.html is a public marketing surface too (ungated, self-styled like download.html):
// run it through inject() so it carries the SAME shared nav as every other page. Only its
// <!-- MKT:NAV --> marker is filled; its own footer stays bespoke. The tutorial videos it
// embeds are hosted on R2 (media-src https:), so nothing but this HTML ships with the build.
writeFileSync(`${DIST}/tutorials.html`, inject(readFileSync(`${SRC}/tutorials.html`, 'utf8')));

// Shared marketing shell assets → dist root. marketing.css is the one visual language every
// marketing page links; og-image.png is the committed Open Graph share card (1200x630).
copyFileSync(`${MKT}/marketing.css`, `${DIST}/marketing.css`);
copyFileSync(`${MKT}/og-image.png`, `${DIST}/og-image.png`);
console.log('marketing shell: marketing.css + og-image.png → dist root');

// SEO plumbing. The sitemap lists every crawlable marketing + legal route (not /app, a
// private tool with no SEO value). robots allows the crawl, keeps /app out of the index
// (advisory only — the app stays reachable), and points crawlers at the sitemap.
const SITE = 'https://chapbook.rqai.co.uk';
const pages = ['/', '/features', '/themes', '/pricing', '/tutorials', '/download', '/privacy', '/terms', '/refunds'];
const today = new Date().toISOString().slice(0, 10);
writeFileSync(`${DIST}/sitemap.xml`,
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  pages.map((p) => `  <url><loc>${SITE}${p}</loc><lastmod>${today}</lastmod></url>`).join('\n') +
  '\n</urlset>\n');
writeFileSync(`${DIST}/robots.txt`,
  `User-agent: *\nAllow: /\nDisallow: /app\nSitemap: ${SITE}/sitemap.xml\n`);
console.log('SEO: sitemap.xml + robots.txt emitted');
// vendored libs (exifr browser build) live in a subdir — preserve the path so the Darkroom
// module's external `./vendor/exifr.esm.js` import resolves at the dist root too.
mkdirSync(`${DIST}/vendor`, { recursive: true });
copyFileSync(`${SRC}/vendor/exifr.esm.js`, `${DIST}/vendor/exifr.esm.js`);
copyFileSync(`${SRC}/vendor/gifenc.esm.js`, `${DIST}/vendor/gifenc.esm.js`);

// Vendored blog-theme catalogue → dist/themes-css/ (Task 3). The exact CSS the published
// blogs use (global.css + themes.css + 20 theme files + kids extras + theme fonts) plus the
// themed sample post the /themes live switcher iframes. Copied as a tree so themes.css's
// relative `@import './themes/<id>.css'` and fonts.css's /themes-css/fonts/ urls resolve.
function copyTree(src, dst) {
  mkdirSync(dst, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const s = `${src}/${entry.name}`, d = `${dst}/${entry.name}`;
    if (entry.isDirectory()) copyTree(s, d); else copyFileSync(s, d);
  }
}
copyTree(`${MKT}/themes-css`, `${DIST}/themes-css`);
console.log('themes-css: vendored blog-theme catalogue copied to dist/themes-css/');

// Marketing media (Task 5) — the /features video loops + framed app screenshots. Copied as a
// tree so /media/loops/<name>.{webm,mp4,jpg} and /media/screens/*.png resolve root-relative.
// Guarded: a missing or partial media dir must never fail the build (the loop pipeline can
// fill it independently); pages reference the files lazily and degrade to their posters.
try { copyTree(`${MKT}/media`, `${DIST}/media`); console.log('media: marketing loops/screens copied to dist/media/'); }
catch (e) { console.log('media: none staged yet (parallel pipeline) — pages reference lazily'); }

// Self-hosted fonts → dist/fonts/ (referenced by /fonts/*.woff2 @font-face in index.html).
// Copy every .woff2; the OFL licence text files travel with them for attribution.
mkdirSync(`${DIST}/fonts`, { recursive: true });
for (const f of readdirSync(`${SRC}/fonts`)) copyFileSync(`${SRC}/fonts/${f}`, `${DIST}/fonts/${f}`);
console.log('fonts:', readdirSync(`${SRC}/fonts`).filter((f) => f.endsWith('.woff2')).length, 'woff2 self-hosted → dist/fonts/');

// --- sw.js: stamp a content-hashed CACHE name (chapbook-<8 hex>) ---
// The precache version used to be a hand-bumped literal; a forgotten bump meant an
// installed worker served the STALE shell on network failure. Instead, hash the
// emitted bytes of every SHELL asset (parsed from sw.js itself so the lists can
// never drift) and derive the cache name from them: any shell change → new name →
// old precaches dropped by the activate handler. Deterministic: identical builds
// produce identical names. A SHELL path missing from dist/ fails the build here —
// the same guarantee addAll's atomic install gives at runtime, but caught earlier.
{
  let swSrc = readFileSync(`${SRC}/sw.js`, 'utf8');
  // STT runtime cache: named from the PINNED sha-256 manifest (scripts/stt-files.mjs)
  // — vendor + BOTH model exports, so ANY pin bump renames the cache and the activate
  // sweep drops the stale model bytes. Stamped BEFORE the shell hash is computed:
  // sw.js is not itself a SHELL asset, but this keeps the emitted file single-pass.
  const sttShas = [
    ...STT_VENDOR_FILES.map((f) => f.sha256),
    ...Object.values(STT_MODELS).flatMap((m) => Object.values(m.files).map((f) => f.sha256)),
  ];
  const sttCacheName = sttCacheNameFor(sttShas);
  swSrc = withSttCacheName(swSrc, sttCacheName);
  console.log(`sw.js: STT_CACHE stamped '${sttCacheName}' (hash of ${sttShas.length} pinned shas)`);
  const shellEntries = readShellPaths(swSrc).map((p) => ({
    path: p,
    bytes: readFileSync(`${DIST}${shellDistFile(p)}`),
  }));
  const cacheName = cacheNameFor(shellEntries);
  writeFileSync(`${DIST}/sw.js`, withCacheName(swSrc, cacheName));
  console.log(`sw.js: CACHE stamped '${cacheName}' (content hash of ${shellEntries.length} shell assets)`);
}

// The public product lives at chapbook.rqai.co.uk — send the retired hostname there (the
// 301! forces the redirect even though the file exists). Deliberately NOT redirected:
// chapbook-publishing-studio.netlify.app, which native builds call as HOSTED_ORIGIN for the
// GitHub device-flow relay (src/app.js) — a 301 there would break native sign-in. It serves
// the same site, and SITE above makes its canonicals point back here, so it is not indexed
// as a duplicate. Plus an explicit /app rule so the app document is served without a
// trailing-slash bounce. No SPA catch-all: marketing/legal .html use Netlify pretty-URLs.
writeFileSync(`${DIST}/_redirects`,
  'https://inayat-studio.netlify.app/* https://chapbook.rqai.co.uk/:splat 301!\n' +
  '/app /app/index.html 200\n');
console.log('canonical-host redirect: inayat-studio.netlify.app → chapbook.rqai.co.uk');
console.log('emitted', DIST, '(deployable static site)');
