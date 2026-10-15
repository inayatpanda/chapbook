// Blog-theme registry reader — the list the site-settings theme picker renders.
//
// WHY THIS EXISTS: the picker used to be a HARDCODED <select> in index.html, and it had
// drifted badly from the site it writes to. Of the 15 ids it offered, 12 did not exist in
// inayatpanda-site (picking one wrote a bogus `defaultTheme` and Base.astro silently fell
// back to observatory — the theme just didn't change, with no error), while 17 of the site's
// 20 real themes were unreachable. Reading the registry from the site itself makes the picker
// correct by construction and picks up new themes with no composer change.
//
// SOURCE OF TRUTH: src/data/themes.json in the content repo — the same file Base.astro's
// theme system is built around. `id` matches the CSS file, the data-blog-theme value on
// <html>, and what gets written to site.json's defaultTheme.
const PATH = 'src/data/themes.json';

// Shape varies by generation: either a bare array, or { themes:[…], categories:[…] }.
// Normalise to { id, name, category } and drop anything without an id.
export function normaliseThemes(raw) {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : (Array.isArray(raw.themes) ? raw.themes : []);
  return list
    .map((t) => (typeof t === 'string' ? { id: t } : t))
    .filter((t) => t && typeof t.id === 'string' && t.id)
    .map((t) => ({
      id: t.id,
      name: t.name || t.id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      category: t.category || '',
    }));
}

// Category id → display name, when the registry ships a categories list.
export function categoryNames(raw) {
  const cats = raw && Array.isArray(raw.categories) ? raw.categories : [];
  const out = {};
  for (const c of cats) if (c && c.id) out[c.id] = c.name || c.id;
  return out;
}

// Returns { themes:[{id,name,category}], categories:{id:name} }. A missing/unparseable
// registry returns empty rather than throwing: the picker keeps whatever it already has
// (its baked options) instead of the whole settings page failing to load.
export async function getThemesConfig(gh) {
  let f = null;
  try { f = await gh.getFile(PATH); } catch { return { themes: [], categories: {} }; }
  if (!f) return { themes: [], categories: {} };
  let raw;
  try { raw = JSON.parse(f.content); } catch { return { themes: [], categories: {} }; }
  return { themes: normaliseThemes(raw), categories: categoryNames(raw) };
}
