// Minimal service worker — enables "Add to Home Screen" / installable PWA.
// Network-first; we never want stale drafts, so we don't aggressively cache.
// CACHE below is a readable dev placeholder: build.mjs stamps dist/sw.js with a
// content-hashed name (chapbook-<8 hex>, see scripts/sw-cache-name.mjs) derived from
// the built SHELL assets, so ANY shell change auto-invalidates old precaches (the
// activate handler drops every non-matching cache name) — no manual bump to forget.
// SHELL must precache the WHOLE app bundle — not just the
// HTML/icons — or an offline reload boots a blank shell with no engine (breaks local-first).
// studio.js (engine), darkroom-upload.js + its external deps (resize.js, vendor/exifr.esm.js),
// preview.css and the icon sprite are all root-relative files emitted into dist/ by build.mjs.
// Every path here MUST exist in dist/ (addAll is atomic — one 404 aborts the whole install).
// SHELL also precaches the 7 self-hosted /fonts/*.woff2 (see index.html @font-face) so an
// offline reload renders the app's own type rather than a system fallback.
const CACHE = 'chapbook-dev'; // build.mjs derives this from a content hash of the SHELL assets ('chapbook-dev' only outside a build)
// On-device dictation (Whisper STT) assets — ~65 MB of model + WASM runtime — are
// deliberately NOT in SHELL (precaching them would balloon every install). They are
// fetched on first dictation use and then served cache-first from this SEPARATE,
// stable cache: it survives shell updates (the activate handler keeps it), so the
// one-time model download is never re-paid for an app update. The staged files are
// version-pinned by scripts/stage-stt.mjs (per-file sha-256), so cached bytes can
// only ever go stale if those pins are BUMPED — any future model/runtime pin bump
// MUST bump this cache name too (v1 → v2) so cache-first refetches the new set.
const STT_CACHE = 'chapbook-stt-v1';
const STT_PREFIXES = ['/app/vendor/stt/', '/app/models/'];
const SHELL = ['/app', '/app/index.html', '/manifest.json', '/icon.svg', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/studio.js', '/darkroom-upload.js', '/resize.js', '/vendor/exifr.esm.js', '/preview.css', '/icons-sprite.svg',
  '/fonts/inter-400.woff2', '/fonts/inter-500.woff2', '/fonts/inter-600.woff2', '/fonts/inter-700.woff2', '/fonts/space-grotesk-500.woff2', '/fonts/space-grotesk-600.woff2', '/fonts/space-grotesk-700.woff2'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE && k !== STT_CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // never cache API calls
  if (url.pathname.includes('/api/')) return;
  // STT runtime + model: cache-first (immutable pinned bytes; see STT_CACHE above).
  if (url.origin === location.origin && STT_PREFIXES.some((p) => url.pathname.startsWith(p))) {
    e.respondWith(
      caches.open(STT_CACHE).then((c) =>
        c.match(e.request).then((r) => r || fetch(e.request).then((resp) => {
          if (resp.ok) c.put(e.request, resp.clone());
          return resp;
        }))
      )
    );
    return;
  }
  e.respondWith(
    fetch(e.request).catch(() =>
      caches.match(e.request).then((r) => {
        if (r) return r;
        // App navigations only: fall back to the cached app shell. Marketing navigations
        // get the plain cache miss (no app shell served at '/').
        if (e.request.mode === 'navigate' && url.pathname.startsWith('/app')) return caches.match('/app/index.html');
        return undefined;
      })
    )
  );
});
