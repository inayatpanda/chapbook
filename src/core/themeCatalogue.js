// Blog-theme catalogue — the registry the composer's theme picker reads.
//
// BAKED_CATALOGUE is a verbatim mirror of the blog template's src/data/themes.json
// (RQAI-projects/chapbook-template). It ships with the composer so the picker always
// has a full list to render offline / on first paint. fetchLiveCatalogue() upgrades it
// at runtime from the template repo's default branch, so new themes appear the moment
// the template ships them — with NO composer redeploy. Until that themes.json lands on
// the default branch the live fetch 404s (it currently only exists on an unmerged
// branch), which is a normal, expected miss: the baked list is returned unchanged.
//
// Shape (per theme): { id, name, category, description, preview:{ bg, ink, accent } }.
// `id` matches the blog's data-blog-theme value and is written into site.json's
// defaultTheme. `preview.*` are swatch colours only.

// --- BAKED registry — copied verbatim from chapbook-template src/data/themes.json ---
export const BAKED_CATALOGUE = {
  categories: [
    { id: 'clean', name: 'Clean & Simple' },
    { id: 'editorial', name: 'Editorial' },
    { id: 'creative', name: 'Creative & Fun' },
    { id: 'kids', name: 'Kids & First Blogs' },
    { id: 'photo', name: 'Photo & Portfolio' },
  ],
  themes: [
    {
      id: 'observatory',
      name: 'Observatory',
      category: 'clean',
      description: 'The house style: near-black canvas, teal-to-violet accents and a fine grotesque. Calm, technical, and the default.',
      preview: { bg: '#04060c', ink: '#f4f7fd', accent: '#22d3ee' },
    },
    {
      id: 'ledger',
      name: 'Ledger',
      category: 'clean',
      description: 'Ruled off-white paper with a disciplined grotesque and hairline rules. Reads like a well-kept notebook.',
      preview: { bg: '#f6f5f0', ink: '#1a1b1d', accent: '#0f766e' },
    },
    {
      id: 'air',
      name: 'Air',
      category: 'clean',
      description: "Maximum whitespace, a single soft-blue accent and quiet type. Nothing on the page you didn't ask for.",
      preview: { bg: '#fbfbfd', ink: '#1a1c22', accent: '#2f6bff' },
    },
    {
      id: 'graphite',
      name: 'Graphite',
      category: 'clean',
      description: 'A monochrome slate room — cool greys, steel highlights, no colour to distract from the writing.',
      preview: { bg: '#17191d', ink: '#e9ebef', accent: '#aeb7c2' },
    },
    {
      id: 'broadsheet',
      name: 'Broadsheet',
      category: 'editorial',
      description: 'A proper newspaper: a towering serif masthead, multi-column index with column rules and a drop-cap lede.',
      preview: { bg: '#f5f2ea', ink: '#1a1714', accent: '#8a1f14' },
    },
    {
      id: 'journal',
      name: 'Journal',
      category: 'editorial',
      description: 'Warm cream stock, elegant book serif and italic datelines. An unhurried literary quarterly.',
      preview: { bg: '#f6efe1', ink: '#2a2118', accent: '#7c4a1e' },
    },
    {
      id: 'kiosk',
      name: 'Kiosk',
      category: 'editorial',
      description: 'Newsstand energy: heavy black Fraunces, a hot tabloid red and headlines that shout across the page.',
      preview: { bg: '#faf7f0', ink: '#111111', accent: '#e11d2a' },
    },
    {
      id: 'gazette',
      name: 'Gazette',
      category: 'editorial',
      description: 'A boxed masthead, navy double-rules and a formal dateline. Old-world civic newsletter, buttoned up.',
      preview: { bg: '#f3f0e8', ink: '#191817', accent: '#1f3a5f' },
    },
    {
      id: 'neon',
      name: 'Neon',
      category: 'creative',
      description: 'After-dark and electric — inky violet-black, glowing cyan and magenta, and type that hums.',
      preview: { bg: '#0a0812', ink: '#f3ecff', accent: '#22f5ff' },
    },
    {
      id: 'zine',
      name: 'Zine',
      category: 'creative',
      description: 'Photocopied punk: high-contrast paper, one screaming spot colour, cut-and-paste rules and heavy caps.',
      preview: { bg: '#ece9e2', ink: '#0d0d0d', accent: '#ff2d55' },
    },
    {
      id: 'scrapbook',
      name: 'Scrapbook',
      category: 'creative',
      description: 'Warm craft paper, taped-down cards and a friendly rounded hand. Everything looks lovingly stuck in.',
      preview: { bg: '#f3ead8', ink: '#3a2f26', accent: '#d1495b' },
    },
    {
      id: 'arcade',
      name: 'Arcade',
      category: 'creative',
      description: 'Insert coin: midnight-blue cabinet, chunky pixel-era type and hot arcade yellow and pink.',
      preview: { bg: '#0b0f2a', ink: '#eafff5', accent: '#ffcf33' },
    },
    {
      id: 'crayon',
      name: 'Crayon',
      category: 'kids',
      description: 'Bright primary colours, big rounded type and sticker-style accents on clean white. Made to feel like fun.',
      preview: { bg: '#fffef7', ink: '#23262b', accent: '#ff5a5f' },
    },
    {
      id: 'rocket',
      name: 'Rocket',
      category: 'kids',
      description: 'Blast off into a friendly navy sky with star-yellow and sky-blue. Playful, bold and a little bit space.',
      preview: { bg: '#0e1330', ink: '#eef3ff', accent: '#4dd6ff' },
    },
    {
      id: 'storybook',
      name: 'Storybook',
      category: 'kids',
      description: 'Soft pastel cream, gentle coral and sage, and rounded storytime type. Cosy as a bedtime read.',
      preview: { bg: '#fbf3e7', ink: '#3b2f2a', accent: '#d9805f' },
    },
    {
      id: 'comic',
      name: 'Comic',
      category: 'kids',
      description: 'Comic-book POW: halftone cream, bold ink outlines and red-and-blue panels. Every post a splash page.',
      preview: { bg: '#fff8e6', ink: '#14110c', accent: '#ff3b3b' },
    },
    {
      id: 'gallery',
      name: 'Gallery',
      category: 'photo',
      description: 'A white-cube gallery: pure white walls, near-black labels and an image-led grid. The work leads.',
      preview: { bg: '#ffffff', ink: '#14151a', accent: '#2b2b2b' },
    },
    {
      id: 'darkroom',
      name: 'Darkroom',
      category: 'photo',
      description: 'Near-black walls and silver labels so photographs glow. Minimal chrome, maximum image.',
      preview: { bg: '#0b0b0d', ink: '#ededf0', accent: '#d4d4d8' },
    },
    {
      id: 'contact-sheet',
      name: 'Contact Sheet',
      category: 'photo',
      description: 'A film contact sheet: charcoal base, framed thumbnails with numbered edges and monospace grease-pencil labels.',
      preview: { bg: '#161514', ink: '#eae8e3', accent: '#f4a11f' },
    },
    {
      id: 'polaroid',
      name: 'Polaroid',
      category: 'photo',
      description: 'Instant-photo charm: soft grey desk, white photo frames with a caption lip and a casual retro-blue accent.',
      preview: { bg: '#e9e6df', ink: '#26241f', accent: '#3a7ca5' },
    },
  ],
};

// The default theme every new blog starts on (matches the template's base look).
export const DEFAULT_THEME = 'observatory';

// GitHub contents API for the template's themes.json on its DEFAULT branch. api.github.com
// is already allowlisted in the composer CSP. A 404 here today is EXPECTED (the file only
// exists on an unmerged branch) → fetchLiveCatalogue falls back to BAKED_CATALOGUE.
export const CATALOGUE_URL =
  'https://api.github.com/repos/RQAI-projects/chapbook-template/contents/src/data/themes.json';

// --- pure helpers -----------------------------------------------------------

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Only accept plain hex colours for the swatch style attribute. Preview colours can come
// from the LIVE (remote) catalogue, so anything that isn't a bare hex is dropped to
// 'transparent' rather than being written into a `style="…"` sink verbatim.
export function safeColor(v) {
  return (typeof v === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(v.trim())) ? v.trim() : 'transparent';
}

// Decode a base64 payload (GitHub returns it newline-wrapped) as UTF-8 so multibyte
// glyphs in descriptions (em dashes, curly quotes) survive the round-trip.
function decodeBase64Utf8(b64) {
  const clean = String(b64).replace(/\s+/g, '');
  const bin = atob(clean);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function isValidTheme(t) {
  return !!t && typeof t.id === 'string' && t.id
    && typeof t.name === 'string' && t.name
    && t.preview && typeof t.preview === 'object';
}

function normaliseCatalogue(obj) {
  if (!obj || typeof obj !== 'object') throw new Error('themeCatalogue: payload is not an object');
  const themes = Array.isArray(obj.themes) ? obj.themes.filter(isValidTheme) : [];
  if (!themes.length) throw new Error('themeCatalogue: no valid themes in payload');
  const categories = Array.isArray(obj.categories)
    ? obj.categories.filter((c) => c && typeof c.id === 'string' && c.id && typeof c.name === 'string' && c.name)
    : [];
  return { categories, themes };
}

// Parse a catalogue from: a GitHub contents API object ({ content, encoding:'base64' }),
// a raw JSON string, or an already-parsed object. Throws on malformed / empty input so
// callers (fetchLiveCatalogue) can fall back to the baked list.
export function parseCatalogue(payload) {
  let obj = payload;
  if (payload && typeof payload === 'object' && typeof payload.content === 'string' && !Array.isArray(payload.themes)) {
    const text = (payload.encoding === 'base64' || payload.encoding == null)
      ? decodeBase64Utf8(payload.content)
      : payload.content;
    obj = JSON.parse(text);
  } else if (typeof payload === 'string') {
    obj = JSON.parse(payload);
  }
  return normaliseCatalogue(obj);
}

// GET the live themes.json from the template repo and parse it. Falls back to
// BAKED_CATALOGUE on ANY failure — missing fetch, network error, non-2xx (incl. the
// expected 404 today), a bad body, or an unparseable / empty catalogue.
export async function fetchLiveCatalogue(fetchImpl) {
  const f = fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
  if (typeof f !== 'function') return BAKED_CATALOGUE;
  try {
    const res = await f(CATALOGUE_URL, { headers: { Accept: 'application/vnd.github+json' } });
    if (!res || !res.ok) return BAKED_CATALOGUE;
    const body = await res.json();
    return parseCatalogue(body);
  } catch {
    return BAKED_CATALOGUE;
  }
}

// Group a catalogue's themes by category, in the catalogue's category order. Themes whose
// category is unknown (or absent) are collected under a trailing "More" group so nothing
// silently disappears when the live list adds a category the baked one hasn't got.
export function groupByCategory(catalogue) {
  const cat = catalogue && Array.isArray(catalogue.themes) ? catalogue : BAKED_CATALOGUE;
  const order = Array.isArray(cat.categories) ? cat.categories : [];
  const byId = new Map(order.map((c) => [c.id, { id: c.id, name: c.name, themes: [] }]));
  const extra = { id: '_more', name: 'More', themes: [] };
  for (const t of cat.themes) {
    const g = byId.get(t.category) || extra;
    g.themes.push(t);
  }
  const groups = order.map((c) => byId.get(c.id)).filter((g) => g && g.themes.length);
  if (extra.themes.length) groups.push(extra);
  return groups;
}

// --- picker rendering (shared by the onboarding overlay + Settings → Site) ---

// One <style> block, injected once. Cards read their colours from --cbtp-* custom
// properties with dark fallbacks (so the onboarding overlay — which never remaps them —
// stays dark regardless of the app theme); Settings → Site remaps them to the app's
// --surface/--line/--acc/… so the picker follows light & dark there.
export const PICKER_STYLE_ID = 'cbtp-style';
export const PICKER_CSS = `
.cbtp{display:flex;flex-direction:column;gap:.85rem}
.cbtp-cat-h{margin:0 0 .45rem;font:600 .66rem var(--cbtp-font,'Space Grotesk',system-ui,sans-serif);
  letter-spacing:.1em;text-transform:uppercase;color:var(--cbtp-faint,#6f7e98)}
.cbtp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:.5rem}
.cbtp-card{display:flex;align-items:flex-start;gap:.6rem;width:100%;text-align:left;margin:0;
  border:1px solid var(--cbtp-line,rgba(140,160,200,.16));border-radius:12px;padding:.55rem .6rem;
  background:var(--cbtp-surface,#0b1120);color:var(--cbtp-ink,#f4f7fd);cursor:pointer;font:inherit;
  transition:border-color .12s,box-shadow .12s,background .12s}
.cbtp-card:hover{border-color:var(--cbtp-acc,#22d3ee)}
.cbtp-card:focus-visible{outline:none;border-color:var(--cbtp-acc,#22d3ee);
  box-shadow:0 0 0 3px rgba(34,211,238,.28)}
.cbtp-card.sel{border-color:var(--cbtp-acc,#22d3ee);
  box-shadow:0 0 0 1px var(--cbtp-acc,#22d3ee),0 8px 24px -14px var(--cbtp-acc,#22d3ee)}
.cbtp-sw{position:relative;flex:0 0 auto;width:44px;height:36px;border-radius:8px;overflow:hidden;
  border:1px solid rgba(140,160,200,.22)}
.cbtp-sw .cbtp-bar{position:absolute;left:7px;right:7px;bottom:8px;height:4px;border-radius:2px;opacity:.92}
.cbtp-sw .cbtp-dot{position:absolute;top:7px;left:7px;width:12px;height:12px;border-radius:50%}
.cbtp-tx{min-width:0}
.cbtp-nm{display:block;margin-bottom:.12em;font:650 .84rem var(--cbtp-font,'Space Grotesk',system-ui,sans-serif)}
.cbtp-card.sel .cbtp-nm{color:var(--cbtp-acc,#22d3ee)}
.cbtp-ds{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;
  font-size:.73rem;line-height:1.35;color:var(--cbtp-mut,#aebbd2)}`;

// Pure HTML for one theme card (no DOM). Colours are validated (safeColor) before they
// reach the style attribute; all text is HTML-escaped.
export function themeCardHTML(theme, checked) {
  const p = theme.preview || {};
  const on = !!checked;
  return `<button type="button" class="cbtp-card${on ? ' sel' : ''}" role="radio"`
    + ` aria-checked="${on ? 'true' : 'false'}" tabindex="${on ? '0' : '-1'}"`
    + ` data-theme="${esc(theme.id)}">`
    + `<span class="cbtp-sw" aria-hidden="true" style="background:${safeColor(p.bg)}">`
    + `<span class="cbtp-dot" style="background:${safeColor(p.accent)}"></span>`
    + `<span class="cbtp-bar" style="background:${safeColor(p.ink)}"></span>`
    + `</span>`
    + `<span class="cbtp-tx">`
    + `<span class="cbtp-nm">${esc(theme.name)}</span>`
    + `<span class="cbtp-ds">${esc(theme.description)}</span>`
    + `</span></button>`;
}

// Pure HTML for the whole radiogroup body (category headers + card grids).
export function pickerBodyHTML(catalogue, selectedId) {
  const groups = groupByCategory(catalogue);
  const themes = (catalogue && catalogue.themes) || BAKED_CATALOGUE.themes;
  const sel = themes.some((t) => t.id === selectedId) ? selectedId : (themes[0] && themes[0].id);
  return groups.map((g) => (
    `<div class="cbtp-cat">`
    + `<div class="cbtp-cat-h">${esc(g.name)}</div>`
    + `<div class="cbtp-grid">${g.themes.map((t) => themeCardHTML(t, t.id === sel)).join('')}</div>`
    + `</div>`
  )).join('');
}

function ensurePickerStyles(doc) {
  if (!doc || doc.getElementById(PICKER_STYLE_ID)) return;
  const st = doc.createElement('style');
  st.id = PICKER_STYLE_ID;
  st.textContent = PICKER_CSS;
  (doc.head || doc.documentElement).appendChild(st);
}

// Mount an accessible theme picker into `container`. Renders category headers + cards,
// wires click + roving-tabindex keyboard nav (arrows/Home/End/Enter/Space), and calls
// onSelect(id) on every change. Returns { value, set(id) } so callers can read the
// current pick or pre-select programmatically. DOM-guarded (no-op without a document).
export function mountThemePicker(container, opts = {}) {
  if (!container || typeof document === 'undefined') return null;
  const catalogue = (opts.catalogue && Array.isArray(opts.catalogue.themes) && opts.catalogue.themes.length)
    ? opts.catalogue : BAKED_CATALOGUE;
  const onSelect = typeof opts.onSelect === 'function' ? opts.onSelect : null;
  const ids = catalogue.themes.map((t) => t.id);
  let current = ids.includes(opts.selected) ? opts.selected
    : (ids.includes(DEFAULT_THEME) ? DEFAULT_THEME : ids[0]);

  ensurePickerStyles(container.ownerDocument || document);
  container.classList.add('cbtp');
  container.setAttribute('role', 'radiogroup');
  if (!container.getAttribute('aria-label')) container.setAttribute('aria-label', 'Blog theme');
  container.innerHTML = pickerBodyHTML(catalogue, current);

  const cards = () => Array.from(container.querySelectorAll('.cbtp-card'));
  const select = (id, focus) => {
    if (!ids.includes(id)) return;
    current = id;
    for (const el of cards()) {
      const isOn = el.dataset.theme === id;
      el.classList.toggle('sel', isOn);
      el.setAttribute('aria-checked', isOn ? 'true' : 'false');
      el.tabIndex = isOn ? 0 : -1;
      if (isOn) {
        el.querySelector('.cbtp-nm')?.setAttribute('data-sel', '1');
        if (focus) el.focus();
      }
    }
    if (onSelect) onSelect(id);
  };

  container.addEventListener('click', (e) => {
    const card = e.target.closest('.cbtp-card[data-theme]');
    if (card && container.contains(card)) select(card.dataset.theme, false);
  });
  container.addEventListener('keydown', (e) => {
    const card = e.target.closest && e.target.closest('.cbtp-card[data-theme]');
    if (!card) return;
    const list = cards();
    const i = list.indexOf(card);
    if (i < 0) return;
    let next = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % list.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + list.length) % list.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = list.length - 1;
    else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); select(card.dataset.theme, false); return; }
    else return;
    e.preventDefault();
    select(list[next].dataset.theme, true);
  });

  if (onSelect) onSelect(current);
  return { get value() { return current; }, set: (id) => select(id, false) };
}
