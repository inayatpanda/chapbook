// Build Chapbook — the deployable static site.
//  1. esbuild-bundle the engine → src/studio.js (browser ESM, no server).
//  2. emit dist/ — a root-relative static site. Source paths are already root-relative
//     ('/'), so the build only injects runtime config, bundles the engine, and copies
//     assets verbatim — it does NO path rewriting.
import { build } from 'esbuild';
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { AI_DEFAULT_MODELS } from './src/core/aiDefaults.js';
import { PUBLIC_KEY as LICENCE_PUBLIC_KEY } from './src/lib/licence-pubkey.js';
import { assertInlineModulesParse } from './checkInlineModule.mjs';

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
// Interim default points at the owner's personal repo inayatpanda/chapbook-template (which
// exists) pending an rqai-apps org; override at deploy time via env (CHAPBOOK_TEMPLATE_OWNER/REPO).
const TEMPLATE_OWNER = process.env.CHAPBOOK_TEMPLATE_OWNER || 'inayatpanda';
const TEMPLATE_REPO = process.env.CHAPBOOK_TEMPLATE_REPO || 'chapbook-template';
html = html.replace('</head>',
  `  <script>window.__STUDIO_GH_CLIENT_ID=${JSON.stringify(GH_CLIENT_ID)};window.__STUDIO_RELAY_BASE=${JSON.stringify(RELAY_BASE)};window.__STUDIO_BUILD=${JSON.stringify(BUILD_STAMP)};window.__CHAPBOOK_TEMPLATE=${JSON.stringify({ owner: TEMPLATE_OWNER, repo: TEMPLATE_REPO })};</script>\n</head>`);
console.log('device-flow client id:', GH_CLIENT_ID || '(none)');
console.log('build stamp:', BUILD_STAMP || '(none — local build)');
console.log('blog template:', `${TEMPLATE_OWNER}/${TEMPLATE_REPO}`);

// (a) load the engine bundle before the inline module
html = html.replace('</head>', '  <script type="module" src="./studio.js"></script>\n</head>');

// (b) api() delegates to the BYOK client router (window.__studioApi) in source, and
//     the boot gate (window.__studioConfig.isReady()) is baked into index.html too,
//     so no rewrite is needed here. Just sanity-check the client-router branch is present.
if (!html.includes('if(window.__studioApi){')) throw new Error('build: api() no longer delegates to window.__studioApi — index.html changed?');

// (c) assets are already root-relative in source — write index.html straight through.
writeFileSync(`${DIST}/index.html`, html);

// --- copy every other emitted file verbatim ---
// Source paths are already root-relative, so manifest.json + sw.js are plain copies
// (no more /studio/ → / rewriting). index.html is written above with config injected.
for (const f of ['manifest.json', 'sw.js', 'studio.js', 'darkroom-upload.js', 'preview.css', 'resize.js', 'icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'icons-manifest.json', 'icons-sprite.svg']) {
  copyFileSync(`${SRC}/${f}`, `${DIST}/${f}`);
}
// vendored libs (exifr browser build) live in a subdir — preserve the path so the Darkroom
// module's external `./vendor/exifr.esm.js` import resolves at the dist root too.
mkdirSync(`${DIST}/vendor`, { recursive: true });
copyFileSync(`${SRC}/vendor/exifr.esm.js`, `${DIST}/vendor/exifr.esm.js`);

// The product lives at chapbook.rqai.co.uk ONLY — Netlify serves the *.netlify.app name
// too but never redirects it by itself, so enforce the canonical host here. (Netlify
// _redirects host conditions: the 301! forces even though the file exists.)
writeFileSync(`${DIST}/_redirects`,
  'https://inayat-studio.netlify.app/* https://chapbook.rqai.co.uk/:splat 301!\n');
console.log('canonical-host redirect: inayat-studio.netlify.app → chapbook.rqai.co.uk');
console.log('emitted', DIST, '(deployable static site)');
