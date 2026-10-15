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
  return r.toLowerCase() === `${o}.github.io` ? `https://${o}.github.io/` : `https://${o}.github.io/${encodeURIComponent(r)}/`;
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

// Keep authentication, permission and service failures distinct in setup/recovery.
export function githubErrorMessage(err) {
  if (isDeadToken(err)) return 'GitHub sign-in has expired or was revoked. Sign in again, or replace the token under Advanced. Your saved work is still here.';
  if (isNetworkError(err) || err?.kind === 'network' || err?.name === 'TimeoutError') return 'Could not reach GitHub. Check your connection, then retry. Your current connection has not been changed.';
  if (/rate limit|secondary rate|abuse detection/i.test(err?.message || '') || err?.status === 429) return 'GitHub is temporarily limiting requests. Wait a few minutes, then retry. You do not need to sign in again.';
  if (err?.status === 403) return 'GitHub refused access. Check repository permissions and any organisation SSO approval. A manual token needs Contents: read and write for this repository.';
  if (err?.status === 404) return 'GitHub could not find this repository, or your token cannot access it. Check its owner and name, and include it in the token’s repository access.';
  if (err?.status >= 500) return 'GitHub is temporarily unavailable. Please retry in a moment; your current connection has not been changed.';
  return err?.message || 'Could not connect to GitHub. Please retry.';
}
