// Dependency-free frontmatter for the known blog fields + a managed gallery block.
const GALLERY_START = '<!-- gallery:start -->';
const GALLERY_END = '<!-- gallery:end -->';

export function parse(md) {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(md);
  if (!m) return { data: {}, body: md };
  const data = {};
  for (const line of m[1].split('\n')) {
    // Top-level scalar keys only: a word-char start then word chars/hyphens, so both
    // `customField` and `og-image` parse. Indented (nested) lines never match the ^
    // anchor and `- item` list lines can't start a key — see the serialise() note on
    // the line-based format's known limitation for complex YAML.
    const mm = /^(\w[\w-]*):\s*(.*)$/.exec(line);
    if (!mm) continue;
    const key = mm[1];
    const val = mm[2].trim();
    if (key === 'tags') {
      const inner = val.replace(/^\[/, '').replace(/\]$/, '');
      data.tags = inner.trim()
        ? inner.split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean)
        : [];
    } else if (key === 'citations') {
      // Structured references stored as a single-line JSON array: [{id,text},…].
      try { const arr = JSON.parse(val); data.citations = Array.isArray(arr) ? arr : []; }
      catch { data.citations = []; }
    } else if (key === 'seriesPart') {
      // Explicit part number for ordering within a series. Coerce to a number;
      // ignore a non-numeric value (date falls back to it).
      const n = Number(val);
      if (Number.isFinite(n)) data.seriesPart = n;
    } else if (val === 'true' || val === 'false') {
      data[key] = val === 'true';
    } else {
      // Un-escape the double-quoted subset q() emits: strip the surrounding quotes, then
      // reverse `\\`→`\` and `\"`→`"` in ONE left-to-right pass (a naive two-step replace
      // would mangle a value like `a\\b\"c`). Legacy values with an unescaped `\` are left
      // untouched (a `\` not followed by `\`/`"` doesn't match), so this is back-compatible.
      data[key] = val.replace(/^["']|["']$/g, '').replace(/\\([\\"])/g, '$1');
    }
  }
  return { data, body: m[2] };
}

// Neutralise line breaks in a scalar BEFORE it is written: a raw \n inside a value would
// end its frontmatter line early and let the remainder parse as a SECOND key — arbitrary
// frontmatter injection from any user-controlled scalar (e.g. a title of
// 'Normal title\npublishAt: 2099-…' scheduling the post). Newlines are never meaningful
// in these one-line fields, so collapse any \r\n / \n / \r run to a single space; parse()
// then reads back exactly one intended value. Applied to EVERY scalar the serialiser
// emits: q()-quoted values, and the raw (unquoted) date/publishAt lines.
const oneLine = (s) => String(s).replace(/[\r\n]+/g, ' ');

// Quote a value as a YAML double-quoted scalar. Escape the backslash FIRST (it is YAML's
// escape char), THEN the double-quote — order matters, else the `\` we add for `"` would be
// doubled. Without the backslash escape, a value like `C:\Users` or a regex emits invalid
// YAML and fails the buyer's whole Astro build. parse() reverses both escapes.
const q = (s) => '"' + oneLine(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';

// Every frontmatter key serialise() writes explicitly below. Anything ELSE present in
// `data` is an unknown/custom field (e.g. hand-added in the repo) that must survive the
// studio's read-modify-write cycles — updatePost/setDraft spread the parsed data, and
// dropping the unknowns here silently deleted them from the post on every republish.
const KNOWN_KEYS = new Set([
  'title', 'description', 'image', 'date', 'tags', 'citations', 'series', 'seriesPart',
  'accent', 'glyph', 'template', 'theme', 'draft', 'publishAt',
]);

export function serialise({ data, body }) {
  const lines = [];
  if (data.title != null) lines.push(`title: ${q(data.title)}`);
  if (data.description != null) lines.push(`description: ${q(data.description)}`);
  // Optional featured / OG share image (root-relative or absolute URL). Only
  // written when set — absent means the build's generated /og/<slug>.png is used.
  if (data.image) lines.push(`image: ${q(data.image)}`);
  if (data.date != null) lines.push(`date: ${oneLine(data.date)}`);
  if (data.tags != null) lines.push(`tags: [${data.tags.map(q).join(', ')}]`);
  // Structured references (manual citations). Single-line JSON so the line-based
  // parser round-trips it losslessly; only the {id,text} shape is kept.
  if (Array.isArray(data.citations) && data.citations.length) {
    const clean = data.citations
      .filter((c) => c && c.id)
      .map((c) => ({ id: String(c.id), text: String(c.text == null ? '' : c.text) }));
    if (clean.length) lines.push(`citations: ${JSON.stringify(clean)}`);
  }
  // Series grouping: an optional series name + optional explicit part number.
  // The name is the source of truth for membership; the number only orders within
  // the series (else order falls back to date). Only written when set.
  if (data.series != null && String(data.series).trim()) lines.push(`series: ${q(String(data.series).trim())}`);
  if (data.seriesPart != null && Number.isFinite(Number(data.seriesPart))) lines.push(`seriesPart: ${Number(data.seriesPart)}`);
  if (data.accent != null) lines.push(`accent: ${q(data.accent)}`);
  if (data.glyph != null) lines.push(`glyph: ${q(data.glyph)}`);
  // Reading TEMPLATE (the post page's reading surface). One of the six keys
  // observatory·parchment·manuscript·newsprint·slate·focus. 'observatory' is the
  // dark house default, so omit it (absent → reader's global pref applies).
  if (data.template != null && data.template !== 'observatory') lines.push(`template: ${q(data.template)}`);
  // Legacy reading THEME — kept as a quiet fallback for older posts that never set
  // a template. Only written when explicitly non-dark.
  if (data.theme != null && data.theme !== 'dark') lines.push(`theme: ${q(data.theme)}`);
  // Unknown/custom fields: written back verbatim so a round-trip (parse → edit known
  // fields → serialise) is loss-less. parse() only yields top-level scalar keys (word
  // chars/hyphens, so `og-image` survives alongside `customField`) with string/boolean
  // values — the shapes we can emit on one valid line. Known fields stay normalised by
  // the explicit lines above. Emitted before draft/publishAt so the scheduling pair
  // keeps its place at the end of the block.
  //
  // KNOWN LIMITATION (accepted, out of scope here): this line-based format preserves
  // ONLY single-line scalar unknowns. Complex/nested/multiline unknown YAML (indented
  // maps, block lists, folded scalars) is NOT modelled and does not survive the
  // read-modify-write cycle. Separately, a FULL editor re-publish (publishBlocks)
  // rebuilds the frontmatter from the editor's own meta, so fields the editor doesn't
  // model don't survive that path either — only the setDraft/updatePost round-trip
  // carries unknowns forward.
  for (const [k, v] of Object.entries(data)) {
    if (KNOWN_KEYS.has(k) || v == null || !/^\w[\w-]*$/.test(k)) continue;
    if (typeof v === 'boolean' || typeof v === 'number') lines.push(`${k}: ${v}`);
    else if (typeof v === 'string') lines.push(`${k}: ${q(v)}`);
  }
  if (data.draft === true) lines.push('draft: true');
  // Scheduled publishing: an ISO date/time at which the GitHub Action flips draft→false.
  // Always paired with draft:true so the post stays hidden until the Action runs.
  if (data.publishAt) lines.push(`publishAt: ${oneLine(data.publishAt)}`);
  return `---\n${lines.join('\n')}\n---\n\n${String(body).replace(/^\n+/, '')}`;
}

export function readGallery(body) {
  const s = body.indexOf(GALLERY_START);
  const e = body.indexOf(GALLERY_END);
  if (s === -1 || e === -1 || e < s) return [];
  const block = body.slice(s + GALLERY_START.length, e);
  return [...block.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map((m) => m[1]);
}

export function writeGallery(body, imagePaths) {
  const s = body.indexOf(GALLERY_START);
  const e = body.indexOf(GALLERY_END);
  const hasBlock = s !== -1 && e !== -1 && e >= s;
  if (imagePaths.length === 0) {
    if (!hasBlock) return body;
    return (body.slice(0, s) + body.slice(e + GALLERY_END.length)).replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
  }
  const block = `${GALLERY_START}\n${imagePaths.map((p) => `![](${p})`).join('\n')}\n${GALLERY_END}`;
  if (hasBlock) return body.slice(0, s) + block + body.slice(e + GALLERY_END.length);
  return body.replace(/\s*$/, '') + '\n\n' + block + '\n';
}
