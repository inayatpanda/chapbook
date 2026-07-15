// Pure helpers for the Posts list UI (optimistic delete). No DOM, no network — so
// the index.html inline script can drive an instant, unambiguous delete while the
// GitHub commit is still in flight, and node --test can verify the logic.
// Exposed to the inline UI as window.__studioPostList (see app.js), mirroring the
// pattern used by window.__studioCalendar / window.__studioShare.

// Remove a post from the in-memory list by slug, returning a NEW array (no mutation).
// Used for optimistic removal: drop the row the instant the DELETE succeeds (or a 404
// tells us it was already gone) instead of waiting for a re-fetch.
export function removeBySlug(posts, slug) {
  if (!Array.isArray(posts)) return [];
  return posts.filter((p) => p && p.slug !== slug);
}

// True when a delete failure actually means "already deleted on the server" — i.e. the
// file/post is gone, so the row should simply be removed rather than surfaced as an error.
// This is exactly the double-tap 404 the deleting-state guards against, but we still want
// the FIRST tap's request to resolve gracefully if the post vanished by some other route.
// Matches the classified 404 (err.status) and, belt-and-braces, a "not found" message.
export function isAlreadyDeleted(err) {
  if (!err) return false;
  if (Number(err.status) === 404) return true;
  const text = String(err.message || err.detail || '').toLowerCase();
  return /\bnot found\b|already (?:deleted|gone)/.test(text);
}
