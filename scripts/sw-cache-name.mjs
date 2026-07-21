// SW cache-version derivation — pure helpers build.mjs uses to stamp dist/sw.js.
//
// WHY: the CACHE name used to be a hand-bumped literal ('chapbook-v8'). If a shell
// asset (/studio.js, /app/index.html, …) changed without the manual bump, an already
// installed worker kept its OLD precache and served the stale shell on any network
// failure. Deriving the name from a content hash of the built shell assets makes
// every shell change auto-invalidate, while identical builds stay deterministic
// (same bytes in → same cache name out).
//
// src/sw.js keeps a readable placeholder ('chapbook-dev'); build.mjs computes
// chapbook-<8 hex> over the emitted dist shell files and stamps it into dist/sw.js.
import { createHash } from 'node:crypto';

// The shipped scheme: 'chapbook-' + first 8 hex chars of a sha256 over the shell.
export const SW_CACHE_RE = /^chapbook-[0-9a-f]{8}$/;

// entries: [{ path, bytes }] — one per SHELL asset, bytes as emitted into dist/.
// Sorted by path so the name is independent of enumeration order; path and bytes
// are both hashed (NUL-separated) so renames invalidate just like content edits.
export function cacheNameFor(entries) {
  const h = createHash('sha256');
  const sorted = [...entries].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  for (const { path, bytes } of sorted) {
    h.update(path); h.update(Buffer.from([0]));
    h.update(bytes); h.update(Buffer.from([0]));
  }
  return `chapbook-${h.digest('hex').slice(0, 8)}`;
}

// Parse the SHELL precache list out of sw.js text (same shape the release gate reads).
export function readShellPaths(swText) {
  const m = String(swText).match(/const\s+SHELL\s*=\s*\[([\s\S]*?)\]/);
  if (!m) throw new Error('SHELL array not found in sw.js');
  const paths = [...m[1].matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1]);
  if (!paths.length) throw new Error('SHELL array is empty in sw.js');
  return paths;
}

// Map a SHELL route to the dist file that serves it. Only '/app' is a route alias
// (Netlify serves /app via the _redirects rule → /app/index.html); every other
// entry is already a root-relative file path.
export function shellDistFile(path) {
  return path === '/app' ? '/app/index.html' : path;
}

// Stamp the derived cache name into sw.js text, replacing the placeholder literal.
export function withCacheName(swText, name) {
  const s = String(swText);
  if (!/const\s+CACHE\s*=\s*['"][^'"]+['"]/.test(s)) throw new Error('CACHE literal not found in sw.js');
  return s.replace(/const\s+CACHE\s*=\s*['"][^'"]+['"]/, `const CACHE = '${name}'`);
}
