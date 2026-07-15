// Pure slug helpers — extracted so the composer's title→slug reservation is unit-tested.
//
// The RELEASE-BLOCKER these guard: GET /slug returns a BARE slug STRING
// (posts.suggestSlug → uniqueSlug → a string). The composer read `r.slug` off that
// bare string, which is `undefined`, so `currentSlug` never got set. Consequences:
//   • the title never reserved a slug → the header stuck on "Unsaved title · draft kept";
//   • publish early-returned on the missing slug and silently no-opped (no commit, no error).
// `parseSlugResponse` is the tolerant reader that fixes it. The inline composer
// (src/index.html) mirrors this logic because it can't import core/ at runtime (core is
// bundled into studio.js, not shipped standalone) — keep the two in sync.

// Turn a title into a URL slug. Shared by core/posts.js (suggestSlug); the inline
// composer's `slugifyTitle` mirrors it. Returns '' for an all-symbol/empty title —
// callers that need a non-empty slug apply their own fallback (e.g. `|| 'post'`).
export function slugify(title) {
  return String(title || '').toLowerCase().trim()
    .replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    .slice(0, 60);
}

// Read a slug out of whatever GET /slug returned. The route returns a BARE string; a
// `{ slug }` envelope is tolerated too so a future server shape can't silently break
// reservation. Any other shape (null / number / object-without-slug / whitespace-only)
// yields null — the caller MUST then surface a clear reason and never publish with no slug.
export function parseSlugResponse(r) {
  if (typeof r === 'string') return r.trim() || null;
  if (r && typeof r.slug === 'string') return r.slug.trim() || null;
  return null;
}
