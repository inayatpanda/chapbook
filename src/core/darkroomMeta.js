// Darkroom meta-entry builder — PURE functions, no DOM, no network, no Node deps.
//
// Turns (EXIF read from the ORIGINAL photo) + (the user's caption/tags/album) into a
// `meta.json` sidecar entry, and merges a batch of new entries onto whatever the post's
// existing meta.json already holds — WITHOUT clobbering other photos' entries.
//
// Why this exists: `public/studio/resize.js` re-encodes through a canvas, which STRIPS
// EXIF. So the committed (resized) image has no EXIF for the blog's build-time reader to
// find. The uploader therefore reads EXIF from the ORIGINAL file (before resize) and we
// persist date/camera/gps into the sidecar here. The blog's darkroom assembler then prefers
// the sidecar (see inayatpanda-site/src/lib/darkroom.mjs → cameraFor/pickDate).
//
// The produced entry shape MUST match the blog-side `SidecarEntry` typedef exactly:
//   { caption?:string, tags?:string[], album?:string, date?:string(ISO), camera?:string, gps?:[lat,lng] }
// Empty/blank fields are OMITTED so a Phase-1 meta.json (caption/tags/album only) stays
// byte-compatible and additive.
//
// This module is browser-and-Node importable (plain ESM, no imports) so the repo's
// `node --test` runner can unit-test it directly.

/** Title-case a single make token: "FUJIFILM" → "Fujifilm", "nikon" → "Nikon". */
function titleCase(s) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/**
 * Tidy an EXIF camera make + model into one display string. Mirrors the blog-side
 * `tidyCamera` (inayatpanda-site/src/lib/darkroom.mjs) so the sidecar value the uploader
 * writes is exactly what the blog would have derived — the blog's `cameraFor` then prefers
 * this sidecar string verbatim.
 *  - Title-cases the make ("FUJIFILM" → "Fujifilm").
 *  - If the model already leads with the make, keeps the model's tail (no duplication).
 *  - Returns the lone non-empty side when only one is present; null when both are empty.
 * @param {string|null|undefined} make
 * @param {string|null|undefined} model
 * @returns {string|null}
 */
export function tidyCamera(make, model) {
  const m = (make == null ? '' : String(make)).trim();
  const mod = (model == null ? '' : String(model)).trim();
  if (!m && !mod) return null;
  if (!mod) return titleCase(m);
  if (!m) return mod;
  const lowerMake = m.toLowerCase();
  const lowerModel = mod.toLowerCase();
  if (lowerModel.startsWith(lowerMake)) {
    const rest = mod.slice(m.length).trimStart();
    return rest ? `${titleCase(m)} ${rest}` : titleCase(m);
  }
  if (lowerModel.includes(lowerMake)) return mod;
  return `${titleCase(m)} ${mod}`;
}

// Valid image extensions for a committed Darkroom photo. The resizer re-encodes to JPEG,
// so in practice the stem gets a `.jpg`, but we accept the common web image extensions so
// a pre-named file (or a future non-resized path) still passes the safety check.
const IMG_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'];
const IMG_EXT_RE = new RegExp(`\\.(${IMG_EXT.join('|')})$`, 'i');

/**
 * Make a single uploaded filename SAFE to use as a repo path segment, with NO path-traversal
 * or odd characters surviving. PURE: a string in → a safe `stem.ext` out (basename only).
 *
 * `commitMany` pushes the raw path into the git tree, so the sanitised name IS the guard
 * against writing outside `_images/<slug>/` (e.g. `../secret.jpg`) or smuggling control chars.
 *
 * Guarantees about the result:
 *  - basename only — every `/` or `\` path segment is dropped (last non-empty segment wins);
 *  - the character set is `[A-Za-z0-9._-]` only (everything else collapses to `-`);
 *  - no leading dot or dash, and no `..` can survive (dots are not allowed to lead the stem);
 *  - a non-empty stem (falls back to `fallbackStem`, default `photo`);
 *  - exactly one trailing valid image extension (`fallbackExt`, default `jpg`, if none/odd).
 *
 * @param {string|null|undefined} name        the original `file.name` (may contain a path)
 * @param {object}  [opts]
 * @param {string}  [opts.fallbackStem='photo'] stem to use when the name has no usable stem
 * @param {string}  [opts.fallbackExt='jpg']    extension to use when none/an odd one is present
 * @returns {string} a safe `stem.ext`
 */
export function safeImageName(name, { fallbackStem = 'photo', fallbackExt = 'jpg' } = {}) {
  // 1) Basename only: split on BOTH slash kinds, keep the last non-empty segment.
  const segments = String(name == null ? '' : name).split(/[\\/]+/).filter(Boolean);
  let base = segments.length ? segments[segments.length - 1] : '';

  // 2) Whitelist: collapse anything outside [A-Za-z0-9._-] to a single '-'.
  base = base.replace(/[^A-Za-z0-9._-]+/g, '-');

  // 3) Split into stem + extension. Take the extension only if it's a known image type;
  //    otherwise treat the whole thing as the stem and append the fallback extension later.
  let stem = base;
  let ext = '';
  const m = IMG_EXT_RE.exec(base);
  if (m) {
    ext = m[1].toLowerCase();
    if (ext === 'jpeg') ext = 'jpg'; // normalise like resize.js does
    stem = base.slice(0, base.length - m[0].length);
  }

  // 4) Sanitise the stem: strip ALL leading dots/dashes (kills `..`, `.`, leading `-`),
  //    and trim trailing dots/dashes/whitespace. Collapse runs of dots so no `..` remains.
  stem = stem.replace(/\.{2,}/g, '.').replace(/^[.\-\s]+/, '').replace(/[.\-\s]+$/, '');
  if (!stem) stem = String(fallbackStem || 'photo');

  // 5) Final extension guard.
  if (!IMG_EXT.includes(ext)) {
    ext = String(fallbackExt || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    if (ext === 'jpeg') ext = 'jpg';
  }
  return `${stem}.${ext}`;
}

/**
 * Make EVERY name in a batch unique, AND unique against a set of names that already exist in
 * the post's `_images/<slug>/` folder, so an upload NEVER overwrites an existing photo or
 * clobbers its meta.json entry. PURE: returns a NEW array of safe, collision-free names in
 * the same order as `names` (input not mutated). Colliding names get `-2`, `-3`, … appended
 * to the stem (before the extension). Comparison is case-insensitive (GitHub paths are too).
 *
 * @param {string[]} names                    already-safe candidate filenames (see safeImageName)
 * @param {Iterable<string>} [existingNames]  filenames already committed under the folder
 * @returns {string[]} the de-duplicated names, 1:1 with `names`
 */
export function dedupeAgainst(names, existingNames = []) {
  const taken = new Set();
  for (const e of existingNames || []) {
    const s = String(e == null ? '' : e).trim();
    if (s) taken.add(s.toLowerCase());
  }
  const out = [];
  for (const raw of names || []) {
    const name = String(raw == null ? '' : raw);
    let candidate = name;
    if (taken.has(candidate.toLowerCase())) {
      const m = /^(.*?)(\.[^.]+)$/.exec(name) || [null, name, ''];
      const stem = m[1];
      const ext = m[2] || '';
      let n = 2;
      do { candidate = `${stem}-${n}${ext}`; n++; } while (taken.has(candidate.toLowerCase()));
    }
    taken.add(candidate.toLowerCase());
    out.push(candidate);
  }
  return out;
}

/**
 * Normalise the raw EXIF object exifr returns (DateTimeOriginal/Make/Model/GPSLatitude/
 * GPSLongitude) into the tidy `{ date, camera, gps }` the review UI shows and we persist.
 * Tolerant of missing/partial EXIF (returns nulls). PURE: a Date in → an ISO string out.
 * @param {object|null|undefined} raw  the object from exifr.parse(file, {pick:[…]})
 * @returns {{ date: string|null, camera: string|null, gps: [number, number]|null }}
 */
export function normaliseExif(raw) {
  const e = raw || {};
  // exifr returns DateTimeOriginal as a Date; accept a Date, a number (epoch), or a string.
  let date = null;
  const d = e.DateTimeOriginal;
  if (d instanceof Date && !Number.isNaN(d.getTime())) date = d.toISOString();
  else if (typeof d === 'number' && Number.isFinite(d)) { const dd = new Date(d); if (!Number.isNaN(dd.getTime())) date = dd.toISOString(); }
  else if (typeof d === 'string' && d.trim()) { const dd = new Date(d.trim()); if (!Number.isNaN(dd.getTime())) date = dd.toISOString(); }

  const camera = tidyCamera(e.Make, e.Model);

  let gps = null;
  const lat = e.GPSLatitude, lng = e.GPSLongitude;
  if (typeof lat === 'number' && Number.isFinite(lat) && typeof lng === 'number' && Number.isFinite(lng)) {
    gps = [lat, lng];
  }
  return { date, camera, gps };
}

const cleanStr = (s) => (s == null ? '' : String(s)).trim();
const cleanTags = (tags) =>
  (Array.isArray(tags) ? tags : [])
    .map((t) => cleanStr(t))
    .filter(Boolean)
    .filter((t, i, a) => a.indexOf(t) === i); // de-dupe, keep first-seen order

/**
 * Build one sidecar entry from the read EXIF + the user's input. Omits every empty field
 * so the entry is minimal and Phase-1-compatible. Returns `{}` when nothing is set
 * (e.g. a photo with no EXIF and no caption/tags/album yet) — callers may still keep it,
 * which is harmless (the assembler defaults missing fields).
 *
 * @param {Object}   input
 * @param {{date?:string|null, camera?:string|null, gps?:[number,number]|null}} [input.exif]
 *        already-normalised EXIF (see normaliseExif). Pass the RAW exifr object via
 *        normaliseExif() first, or a pre-normalised {date,camera,gps}.
 * @param {string}   [input.caption]
 * @param {string[]} [input.tags]
 * @param {string}   [input.album]
 * @returns {{caption?:string, tags?:string[], album?:string, date?:string, camera?:string, gps?:[number,number]}}
 */
export function buildEntry({ exif = {}, caption = '', tags = [], album = '' } = {}) {
  const entry = {};
  const cap = cleanStr(caption);
  if (cap) entry.caption = cap;
  const tg = cleanTags(tags);
  if (tg.length) entry.tags = tg;
  const alb = cleanStr(album);
  if (alb) entry.album = alb;

  const date = cleanStr(exif.date);
  if (date) entry.date = date;
  const camera = cleanStr(exif.camera);
  if (camera) entry.camera = camera;
  if (Array.isArray(exif.gps) && exif.gps.length === 2 &&
      typeof exif.gps[0] === 'number' && Number.isFinite(exif.gps[0]) &&
      typeof exif.gps[1] === 'number' && Number.isFinite(exif.gps[1])) {
    entry.gps = [exif.gps[0], exif.gps[1]];
  }
  return entry;
}

/**
 * Parse whatever the existing meta.json file holds into an object map. Tolerant of a null
 * file (post has no meta.json yet), an empty string, or malformed JSON (→ {} so a corrupt
 * sidecar never aborts an upload; the merge then re-writes a clean file).
 * @param {string|null|undefined} content  raw file text from gh.getFile(...).content
 * @returns {Record<string, object>}
 */
export function parseExistingMeta(content) {
  if (content == null) return {};
  const s = String(content).trim();
  if (!s) return {};
  try {
    const obj = JSON.parse(s);
    return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {};
  } catch {
    return {};
  }
}

/**
 * Merge a batch of new per-filename entries onto the existing meta map, returning a NEW
 * object (inputs are not mutated). A new entry for a filename REPLACES that filename's old
 * entry (re-upload overwrites); every OTHER filename's entry is preserved untouched. Empty
 * `{}` additions are skipped so we never write a bare empty object over a real one.
 *
 * @param {Record<string, object>} existing  parsed existing meta (see parseExistingMeta)
 * @param {Record<string, object>} additions { "<filename>": entry } for the new batch
 * @returns {Record<string, object>}  the merged map, ready for JSON.stringify(_, null, 2)
 */
export function mergeMeta(existing, additions) {
  const out = { ...(existing && typeof existing === 'object' ? existing : {}) };
  for (const [name, entry] of Object.entries(additions || {})) {
    if (!name) continue;
    if (entry && typeof entry === 'object' && Object.keys(entry).length) out[name] = entry;
    else if (!(name in out)) out[name] = {}; // keep a placeholder only if nothing was there
  }
  return out;
}

/**
 * One-shot convenience: take the existing file content + a list of prepared photos
 * ({ filename, exif, caption, tags, album }) and return the merged meta object to commit.
 * Pure glue over parseExistingMeta + buildEntry + mergeMeta — handy for the UI and the test.
 * @param {string|null|undefined} existingContent
 * @param {Array<{filename:string, exif?:object, caption?:string, tags?:string[], album?:string}>} photos
 * @returns {Record<string, object>}
 */
export function buildMergedMeta(existingContent, photos) {
  const existing = parseExistingMeta(existingContent);
  const additions = {};
  for (const p of photos || []) {
    if (!p || !p.filename) continue;
    additions[p.filename] = buildEntry({ exif: p.exif || {}, caption: p.caption, tags: p.tags, album: p.album });
  }
  return mergeMeta(existing, additions);
}
