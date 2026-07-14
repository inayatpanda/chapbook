// Pure helpers for the Studio Share flow — kept DOM-free so they're unit-tested
// independently and mirrored inline in public/studio/index.html (which, in the
// local same-origin server build, loads no bundle, so it can't import this module).
// Keep the inline mirror in step with this source of truth.
//
// Three concerns:
//   1. buildIntent / shareIntents  — per-platform desktop web-composer URLs + the
//      REAL capability of each (does the intent pre-fill the lines, or must we copy
//      them to the clipboard for the user to paste?).
//   2. postLiveUrl                 — derive a published post's live link from its slug
//      + the configured site origin. The REAL path on the site is /blog/<slug>/.
//   3. postImageUrls               — pull a post's own images (cover + image / gallery
//      / figure blocks) out of its block doc + frontmatter, as absolute URLs, for the
//      tap-to-include image grid.

// No owner default: until the user sets their site URL, the origin is empty and
// sharing is disabled (the UI prompts them to set it in Settings).
const DEFAULT_ORIGIN = '';

// Normalise a site origin (from the user's configured site `url`) to a bare
// scheme+host with no trailing slash. Junk / empty → '' (sharing disabled).
export function normaliseOrigin(origin) {
  const raw = String(origin || '').trim();
  if (!raw) return DEFAULT_ORIGIN;
  let u;
  try { u = new URL(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw); }
  catch { return DEFAULT_ORIGIN; }
  return (u.origin && u.origin !== 'null') ? u.origin : DEFAULT_ORIGIN;
}

// ── Share-link display: show the URL WITHOUT its scheme in the "Link to the full
//    post" field (cleaner: "example.com/blog/…"), but ALWAYS share the real
//    https:// link. displayShareUrl strips a leading http(s):// for display;
//    shareableUrl re-adds https:// when a displayed value lacks a scheme, so the
//    posted/intent link is never schemeless. data: / mailto: etc. are left as-is.
export function displayShareUrl(url) {
  const s = String(url || '').trim();
  if (!s) return '';
  return s.replace(/^https?:\/\//i, '');
}
export function shareableUrl(url) {
  const s = String(url || '').trim();
  if (!s) return '';
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(s) || /^(mailto|tel):/i.test(s)) return s; // already has a scheme
  // A bare host/path (what the display field holds) → assume https.
  return 'https://' + s.replace(/^\/+/, '');
}

// A published post's live URL: <origin>/blog/<slug>/  (the site's real blog path).
// Returns '' for an empty slug, and null when no site origin is configured (sharing
// is disabled until the user sets their site URL in Settings).
export function postLiveUrl(slug, origin) {
  const s = String(slug || '').replace(/^\/+|\/+$/g, '');
  if (!s) return '';
  const o = normaliseOrigin(origin);
  if (!o) return null;
  return o + '/blog/' + s + '/';
}

// Absolutise an image reference against the site origin. data: URLs and full
// http(s) URLs are returned untouched (no origin needed); root-relative paths
// (/images/posts/…) are prefixed with the origin, or → null when no origin is
// configured (can't build an absolute URL); anything else → ''.
export function absoluteImageUrl(ref, origin) {
  const r = String(ref || '').trim();
  if (!r) return '';
  if (/^data:/i.test(r) || /^https?:\/\//i.test(r)) return r;
  if (r.startsWith('/')) {
    const o = normaliseOrigin(origin);
    return o ? o + r : null;
  }
  return '';
}

// Collect a post's own images for the share picker. `doc` is the block doc
// ({ blocks:[…] }); `data` is the frontmatter ({ image } = cover). Returns an
// ordered, de-duplicated list of { url, label } — cover first, then image /
// gallery / figure blocks in document order. `slug` lets us resolve a block's
// `file` to /images/posts/<slug>/<file> when no explicit src/url is present.
export function postImageUrls(doc, data, { slug = '', origin } = {}) {
  const out = [];
  const seen = new Set();
  const push = (ref, label) => {
    const url = absoluteImageUrl(ref, origin);
    if (!url || seen.has(url)) return;
    seen.add(url);
    out.push({ url, label });
  };
  const fileUrl = (file) => (slug && file ? '/images/posts/' + slug + '/' + file : '');

  // Cover (frontmatter image) leads.
  if (data && data.image) push(data.image, 'Cover');

  for (const b of (doc && Array.isArray(doc.blocks) ? doc.blocks : [])) {
    if (!b || typeof b !== 'object') continue;
    if (b.type === 'image') {
      push(b.src || b.url || fileUrl(b.file), 'Image');
    } else if (b.type === 'figure' && b.base) {
      push(b.base.src || b.base.url || fileUrl(b.base.file), 'Figure');
    } else if (b.type === 'gallery' && Array.isArray(b.images)) {
      for (const im of b.images) {
        if (!im) continue;
        push(im.src || im.url || fileUrl(im.file), 'Gallery');
      }
    }
  }
  return out;
}

// What each platform's web intent can actually do with our payload:
//   prefillsText  — the intent URL carries the lines, so the composer opens pre-filled.
//   prefillsUrl   — the intent carries the link.
//   copyLines     — the intent CANNOT carry text, so we copy the lines to the clipboard
//                   and tell the user to paste them in.
//   webIntent     — there is no web composer at all (Instagram) → copy + guidance only.
export const PLATFORM_CAP = {
  x:         { label: 'X',         prefillsText: true,  prefillsUrl: true,  copyLines: false, webIntent: true  },
  linkedin:  { label: 'LinkedIn',  prefillsText: false, prefillsUrl: true,  copyLines: true,  webIntent: true  },
  facebook:  { label: 'Facebook',  prefillsText: false, prefillsUrl: true,  copyLines: true,  webIntent: true  },
  instagram: { label: 'Instagram', prefillsText: false, prefillsUrl: false, copyLines: true,  webIntent: false },
};

export const SHARE_PLATFORMS = ['x', 'linkedin', 'facebook', 'instagram'];

// Build the desktop web-intent for one platform. Returns:
//   { platform, label, href, prefillsText, copyLines, note }
// `href` is null for platforms with no web composer (Instagram). Everything is
// URL-encoded. `lines` is the few-lines text; `url` is the post link.
export function buildIntent(platform, { lines = '', url = '' } = {}) {
  const key = String(platform || '').toLowerCase();
  const cap = PLATFORM_CAP[key];
  if (!cap) return null;
  const text = String(lines || '');
  const link = String(url || '');
  let href = null;
  if (key === 'x') {
    // X: pre-fills BOTH the text and the link.
    const qs = [];
    if (text) qs.push('text=' + encodeURIComponent(text));
    if (link) qs.push('url=' + encodeURIComponent(link));
    href = 'https://twitter.com/intent/tweet' + (qs.length ? '?' + qs.join('&') : '');
  } else if (key === 'linkedin') {
    // LinkedIn: URL-only share dialog (text must be pasted by the user).
    href = link
      ? 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(link)
      : 'https://www.linkedin.com/feed/?shareActive=true';
  } else if (key === 'facebook') {
    // Facebook: URL-only sharer (text must be pasted by the user).
    href = link
      ? 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(link)
      : 'https://www.facebook.com/';
  } else if (key === 'instagram') {
    href = null; // no web composer
  }
  const note = !cap.webIntent
    ? 'No web composer — your text is copied; paste it into Instagram.'
    : cap.copyLines
      ? 'Opens the share dialog with your link. Your text is copied — paste it in.'
      : 'Opens pre-filled with your text and link.';
  return { platform: key, label: cap.label, href, prefillsText: cap.prefillsText, copyLines: cap.copyLines, webIntent: cap.webIntent, note };
}

// All four desktop intents for the given payload, in display order.
export function shareIntents({ lines = '', url = '' } = {}) {
  return SHARE_PLATFORMS.map((p) => buildIntent(p, { lines, url })).filter(Boolean);
}

// The single text blob the native share sheet / clipboard gets: lines + link.
export function shareSheetText(lines, url) {
  const t = String(lines || '').trim();
  const u = String(url || '').trim();
  if (t && u) return t + '\n\n' + u;
  return t || u;
}
