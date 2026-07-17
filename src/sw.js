// Minimal service worker — enables "Add to Home Screen" / installable PWA.
// Network-first; we never want stale drafts, so we don't aggressively cache.
// Bump CACHE whenever SHELL changes so clients re-precache (the activate handler drops
// every non-matching cache name). SHELL must precache the WHOLE app bundle — not just the
// HTML/icons — or an offline reload boots a blank shell with no engine (breaks local-first).
// studio.js (engine), darkroom-upload.js + its external deps (resize.js, vendor/exifr.esm.js),
// preview.css and the icon sprite are all root-relative files emitted into dist/ by build.mjs.
// Every path here MUST exist in dist/ (addAll is atomic — one 404 aborts the whole install).
// SHELL also precaches the 7 self-hosted /fonts/*.woff2 (see index.html @font-face) so an
// offline reload renders the app's own type rather than a system fallback.
const CACHE = 'chapbook-v6'; // v6: app moved to /app; marketing at root (drop '/' + '/index.html' from the shell)
const SHELL = ['/app', '/app/index.html', '/manifest.json', '/icon.svg', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/studio.js', '/darkroom-upload.js', '/resize.js', '/vendor/exifr.esm.js', '/preview.css', '/icons-sprite.svg',
  '/fonts/inter-400.woff2', '/fonts/inter-500.woff2', '/fonts/inter-600.woff2', '/fonts/inter-700.woff2', '/fonts/space-grotesk-500.woff2', '/fonts/space-grotesk-600.woff2', '/fonts/space-grotesk-700.woff2'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // never cache API calls
  if (url.pathname.includes('/api/')) return;
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
