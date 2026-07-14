// Quote Library — PURE helpers for the Studio's "Browse library" panel.
//
// The dataset (studio-app/data/quotes.json) is static-imported here so esbuild bundles it
// into the client (no node:fs in the browser), mirroring core/templates.js. Everything below
// is a pure function of its inputs (no DOM, no globals) so it can be unit-tested with
// `node --test` and reused by the inline UI via window.__studioQuotes.
import data from '../data/quotes.json' with { type: 'json' };

// Normalised, frozen list. Defensive: coerce shapes so a malformed row can never crash a facet.
export const QUOTES = Object.freeze(
  (Array.isArray(data?.quotes) ? data.quotes : []).map((q, i) => Object.freeze({
    id: 'q' + i,
    text: String(q.text || '').trim(),
    author: String(q.author || 'Unknown').trim() || 'Unknown',
    themes: Array.isArray(q.themes) ? q.themes.map(String) : [],
    tone: String(q.tone || '').trim(),
    source: q.source ? String(q.source).trim() : '',
  })).filter(q => q.text)
);

export const TONES = ['inspiring', 'wry', 'reflective', 'defiant', 'tender'];

// Distinct facet values, each with a count, sorted for a stable chip order.
// Themes/tones: most-common first then alphabetical. Authors: alphabetical (there are many).
function tally(pairs) {
  const m = new Map();
  for (const k of pairs) m.set(k, (m.get(k) || 0) + 1);
  return m;
}
function byCountThenName(a, b) { return b.count - a.count || a.value.localeCompare(b.value); }

export function themeFacets(list = QUOTES) {
  const m = tally(list.flatMap(q => q.themes));
  return [...m].map(([value, count]) => ({ value, count })).sort(byCountThenName);
}
export function toneFacets(list = QUOTES) {
  const m = tally(list.map(q => q.tone).filter(Boolean));
  // Keep the documented tone order, drop any that aren't present.
  return TONES.filter(t => m.has(t)).map(t => ({ value: t, count: m.get(t) }));
}
export function authorFacets(list = QUOTES) {
  const m = tally(list.map(q => q.author));
  return [...m].map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value.localeCompare(b.value));
}

// Tokenised, accent/punctuation-insensitive search over text + author + source.
function norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip diacritics (é → e)
    .replace(/[‘’“”]/g, "'")        // smart quotes → '
    .trim();
}
function matchesQuery(q, terms) {
  if (!terms.length) return true;
  const hay = norm(q.text + ' ' + q.author + ' ' + q.source);
  return terms.every(t => hay.includes(t));
}

// PURE faceted filter. facets = { themes:[...], authors:[...], tones:[...], query:'' }.
// Multiple values WITHIN a facet are OR'd; ACROSS facets they're AND'd. Missing/empty → no constraint.
export function filterQuotes(facets = {}, list = QUOTES) {
  const themes = (facets.themes || []).filter(Boolean);
  const authors = (facets.authors || []).filter(Boolean);
  const tones = (facets.tones || []).filter(Boolean);
  const terms = norm(facets.query).split(/\s+/).filter(Boolean);
  return list.filter(q =>
    (!themes.length || q.themes.some(t => themes.includes(t))) &&
    (!authors.length || authors.includes(q.author)) &&
    (!tones.length || tones.includes(q.tone)) &&
    matchesQuery(q, terms)
  );
}

// Attribution string for the Quote block's cite field. The site renders quote blocks with the
// cite shown after an em-dash already, so we return just "Author" or "Author, Source" (no dash).
export function formatAttribution(q) {
  if (!q) return '';
  const author = (q.author || '').trim();
  const source = (q.source || '').trim();
  if (!author && !source) return '';
  if (source && author) return author + ', ' + source;
  return author || source;
}

// What the Quote block needs to insert a library pick: plain text (the block's contenteditable
// stores html, and these are plain sentences, so text == html-safe text) + the cite string.
// Caller is responsible for HTML-escaping `text` before assigning to innerHTML.
export function quoteForInsert(q) {
  return { text: (q?.text || '').trim(), cite: formatAttribution(q) };
}
