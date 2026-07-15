// Pure connection helpers — GitHub Pages URL building + token/error classification.
// No DOM and no network: imported by app.js (bundled into studio.js) and re-exposed on
// window.__studioConnection so index.html's inline boot gate can reuse the SAME logic.
// Unit-tested in connection.test.mjs.

// The public GitHub Pages address for a PROJECT site: https://<owner>.github.io/<repo>/
// (trailing slash — Pages serves a project repo at a sub-path, not the domain root). The
// owner is lowercased because github.io hostnames are case-insensitive and served in
// lowercase; the repo becomes a single encoded path segment. Returns '' when either part
// is missing so callers can guard before showing a link.
export function blogUrl({ owner, repo } = {}) {
  const o = String(owner || '').trim().toLowerCase();
  const r = String(repo || '').trim();
  if (!o || !r) return '';
  return `https://${o}.github.io/${encodeURIComponent(r)}/`;
}

// True iff a failure looks like a NETWORK problem (offline, DNS, CORS, blocked) rather than
// an HTTP response from GitHub. A truthy .status means the request reached GitHub, so it is
// NOT a network error. Used to phrase "couldn't reach GitHub" vs "your token is wrong", and
// (in the boot check) to avoid punishing an offline-but-valid session.
export function isNetworkError(err) {
  if (!err) return false;
  if (Number(err.status)) return false; // an HTTP status ⇒ we reached GitHub
  const name = String(err.name || '');
  const msg = String(err.message || '').toLowerCase();
  return name === 'TypeError' || /failed to fetch|networkerror|load failed|network request failed/.test(msg);
}

// True iff a failed GitHub /user (whoami) call means the token is DEAD — expired, revoked,
// or bad credentials — the ONLY case that should force a reconnect. A 403 rate-limit, a
// network blip, or a 5xx are transient and return false, so a valid session is never
// interrupted at boot. err: { status?, message? } | Error.
export function isDeadToken(err) {
  if (!err) return false;
  if (isNetworkError(err)) return false;
  const status = Number(err.status) || 0;
  const msg = String(err.message || '').toLowerCase();
  if (/rate limit|abuse detection|secondary rate/.test(msg)) return false; // transient
  if (status === 401) return true; // Bad credentials — always dead
  if (/bad credentials|requires authentication|token expired|token has expired|token.*revoked/.test(msg)) return true;
  return false;
}
