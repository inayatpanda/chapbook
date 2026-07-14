// Shared SVG helper library for the Figures engine (parametric SVG line-art).
// Pure functions, no I/O, no deps. Colours are CSS custom properties (never hex)
// so figures inherit the site theme. ESM, Node built-ins only.

// Colour tokens -> CSS custom properties. Default stroke = var(--ink).
export const PALETTE = {
  ink: 'var(--ink)',
  inkDim: 'var(--ink-dim)',
  teal: 'var(--teal)',
  cyan: 'var(--cyan)',
  violet: 'var(--violet)',
};

const INK = PALETTE.ink;
const INK_DIM = PALETTE.inkDim;
const FONT = 'var(--font-display), system-ui, sans-serif';

// HTML/XML-escape text content (used inside <text>).
function escText(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Escape an attribute value (double-quoted).
function escAttr(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Serialise an SVG element to a string.
// attrs -> key="value" (skip null/undefined). children: string | string[].
// Self-close when there are no children.
export function el(tag, attrs = {}, children = []) {
  const parts = [];
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined) continue;
    parts.push(`${k}="${escAttr(v)}"`);
  }
  const head = parts.length ? `<${tag} ${parts.join(' ')}` : `<${tag}`;
  const kids = Array.isArray(children) ? children.join('') : (children ?? '');
  if (kids === '' || kids == null) return `${head}/>`;
  return `${head}>${kids}</${tag}>`;
}

// Common stroke attributes, with overridable stroke colour, width and fill.
function strokeAttrs(opts = {}) {
  const { stroke = INK, width, fill = 'none', ...rest } = opts;
  return {
    fill,
    stroke,
    'stroke-width': width === undefined ? undefined : width,
    ...rest,
  };
}

// --- stroked primitives ---------------------------------------------------

export function line({ x1, y1, x2, y2, stroke, width, ...rest } = {}) {
  const { fill, ...sa } = strokeAttrs({ stroke, width, ...rest });
  return el('line', { x1, y1, x2, y2, ...sa });
}

export function poly(points = [], opts = {}) {
  const pts = points.map(([x, y]) => `${x},${y}`).join(' ');
  return el('polyline', { points: pts, ...strokeAttrs(opts) });
}

export function path(d, opts = {}) {
  return el('path', { d, ...strokeAttrs(opts) });
}

export function circle({ cx, cy, r, stroke, width, fill, ...rest } = {}) {
  return el('circle', { cx, cy, r, ...strokeAttrs({ stroke, width, fill, ...rest }) });
}

export function rect({ x, y, w, h, rx, stroke, width, fill, ...rest } = {}) {
  return el('rect', {
    x, y, width: w, height: h, rx,
    ...strokeAttrs({ stroke, width, fill, ...rest }),
  });
}

// Arrow: a line plus a small arrowhead polyline at the (x2,y2) end.
// Optional label is drawn (escaped) near the head.
export function arrow({ x1, y1, x2, y2, label: lbl, stroke = INK, width, size = 8, ...rest } = {}) {
  const shaft = line({ x1, y1, x2, y2, stroke, width, ...rest });
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const spread = 0.5; // ~28deg half-angle
  const ax = x2 - size * Math.cos(ang - spread);
  const ay = y2 - size * Math.sin(ang - spread);
  const bx = x2 - size * Math.cos(ang + spread);
  const by = y2 - size * Math.sin(ang + spread);
  const round = (n) => Math.round(n * 100) / 100;
  const head = poly([[round(ax), round(ay)], [x2, y2], [round(bx), round(by)]], { stroke, width });
  const parts = [shaft, head];
  if (lbl != null && lbl !== '') {
    parts.push(label(lbl, round((x1 + x2) / 2), round((y1 + y2) / 2) - 6, { anchor: 'middle' }));
  }
  return el('g', {}, parts);
}

// --- text, connectors, regions --------------------------------------------

// Text label. Escapes content. Defaults: display font (+ fallback), var(--ink) fill,
// readable size, start anchor. Override via opts {size, anchor, fill, font}.
export function label(text, x, y, opts = {}) {
  const { size = 13, anchor = 'start', fill = INK, font = FONT, ...rest } = opts;
  return el('text', {
    x, y,
    'font-family': font,
    'font-size': size,
    'text-anchor': anchor,
    fill,
    ...rest,
  }, escText(text));
}

// Thin dim connector between two [x,y] points.
export function leader(from = [0, 0], to = [0, 0]) {
  const [x1, y1] = from;
  const [x2, y2] = to;
  return line({ x1, y1, x2, y2, stroke: INK_DIM, width: 1 });
}

// Rounded bordered region (dim stroke, no fill). Optional label drawn at top-left.
export function panel({ x = 0, y = 0, w = 0, h = 0, rx = 8, label: lbl } = {}) {
  const box = rect({ x, y, w, h, rx, stroke: INK_DIM, fill: 'none' });
  if (lbl == null || lbl === '') return box;
  const tag = label(lbl, x + 8, y + 18, { fill: INK_DIM, size: 12 });
  return el('g', {}, [box, tag]);
}

// Layout grid: array of {col,row,x,y}; x=col*cell, y=row*cell.
export function grid(cols, rows, cell) {
  const out = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      out.push({ col, row, x: col * cell, y: row * cell });
    }
  }
  return out;
}

// --- animation CSS --------------------------------------------------------

// Line-draw animation: dasharray/offset + fig-draw keyframes on `selector`,
// with a reduced-motion guard that snaps to the final drawn state.
export function drawCss(selector) {
  return [
    '@keyframes fig-draw { to { stroke-dashoffset: 0; } }',
    `${selector} {`,
    '  stroke-dasharray: 1000;',
    '  stroke-dashoffset: 1000;',
    '  animation: fig-draw 1.6s ease forwards;',
    '}',
    '@media (prefers-reduced-motion: reduce) {',
    `  ${selector} { animation: none; stroke-dashoffset: 0; }`,
    '}',
  ].join('\n');
}

// Generic named keyframes plus a reduced-motion guard that disables animation.
export function motionCss(id, framesCss) {
  return [
    `@keyframes ${id} { ${framesCss} }`,
    '@media (prefers-reduced-motion: reduce) {',
    '  * { animation: none !important; animation-play-state: paused !important; }',
    '}',
  ].join('\n');
}

// --- assembly -------------------------------------------------------------

export function viewBox(w, h) {
  return `0 0 ${w} ${h}`;
}

// Wrap inner markup in an <svg> with viewBox (no width/height px), xmlns, role.
// styleCss, when non-empty, is inlined in a <style> element.
export function svgWrap(inner, vb, styleCss = '') {
  const openTag = '<svg viewBox="' + escAttr(vb) + '" '
    + 'xmlns="http://www.w3.org/2000/svg" '
    + 'xmlns:xlink="http://www.w3.org/1999/xlink" '
    + 'role="img" fill="none">';
  const style = styleCss && String(styleCss).trim() !== '' ? `<style>${styleCss}</style>` : '';
  return `${openTag}${style}${inner}</svg>`;
}

// --- sanitiser (security critical) ----------------------------------------
// String/regex passes only — no DOM/parser. Prefer over-stripping.

// The ONE allow-listed safe-image data-URL shape, reused by sanitise() (svg.js),
// figureSvgRisk() (prepublish.js) and figureInner() (blocks.js). Raster formats
// only — NEVER data:image/svg+xml (SVG-in-<use> XSS) or data:text/html.
export const SAFE_IMAGE_DATA_URL = /^data:image\/(?:png|jpe?g|gif|webp|avif);base64,/i;

const STYLE_ALLOWED_PROPS = [
  'animation', 'animation-name', 'animation-duration', 'animation-timing-function',
  'animation-delay', 'animation-iteration-count', 'animation-direction',
  'animation-fill-mode', 'animation-play-state',
  'transform', 'transform-origin', 'transform-box',
  'opacity',
  'stroke-width', 'stroke-dasharray', 'stroke-dashoffset',
];

// Clean a CSS rule body: keep only allow-listed declarations.
function cleanDeclarations(body) {
  const decls = body.split(';');
  const kept = [];
  for (const raw of decls) {
    const decl = raw.trim();
    if (decl === '') continue;
    const colon = decl.indexOf(':');
    if (colon === -1) continue;
    const prop = decl.slice(0, colon).trim().toLowerCase();
    const value = decl.slice(colon + 1);
    // Drop anything not allow-listed, or any value smuggling a url()/external ref.
    if (!STYLE_ALLOWED_PROPS.includes(prop)) continue;
    if (/url\s*\(/i.test(value) || /https?:|\/\//i.test(value) || /expression\s*\(/i.test(value)) continue;
    kept.push(`${prop}:${value.trim()}`);
  }
  return kept.join('; ');
}

// Clean the contents of a <style> element: keep @keyframes / @media blocks
// (recursively cleaning their rule bodies) and allow-listed declarations of
// plain selector rules. Drop everything else.
function cleanStyle(css) {
  let out = '';
  let i = 0;
  const n = css.length;
  while (i < n) {
    // skip leading whitespace
    while (i < n && /\s/.test(css[i])) i++;
    if (i >= n) break;

    // At-rule block: @keyframes / @media (and any nested { ... }).
    if (css[i] === '@') {
      const braceStart = css.indexOf('{', i);
      if (braceStart === -1) { i = n; break; }
      const prelude = css.slice(i, braceStart).trim();
      const keyword = (prelude.match(/^@([a-z-]+)/i) || [, ''])[1].toLowerCase();
      // find matching close brace (balanced)
      let depth = 0, j = braceStart;
      for (; j < n; j++) {
        if (css[j] === '{') depth++;
        else if (css[j] === '}') { depth--; if (depth === 0) { j++; break; } }
      }
      const inner = css.slice(braceStart + 1, j - 1);
      if (keyword === 'keyframes' || keyword === 'media') {
        out += `${prelude} { ${cleanStyle(inner)} }\n`;
      }
      // else: drop the whole at-rule
      i = j;
      continue;
    }

    // Plain rule: selector { decls } OR a keyframe stop "0% { decls }".
    const braceStart = css.indexOf('{', i);
    if (braceStart === -1) { i = n; break; }
    const selector = css.slice(i, braceStart).trim();
    let depth = 0, j = braceStart;
    for (; j < n; j++) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}') { depth--; if (depth === 0) { j++; break; } }
    }
    const body = css.slice(braceStart + 1, j - 1);
    const cleaned = cleanDeclarations(body);
    if (selector !== '' && cleaned !== '') {
      out += `${selector} { ${cleaned} }\n`;
    }
    i = j;
  }
  return out.trim();
}

export function sanitise(svg) {
  let s = String(svg ?? '');

  // 1) Remove <script>…</script> (any case, any attrs) and self-closing <script .../>.
  s = s.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '');
  s = s.replace(/<script\b[^>]*\/\s*>/gi, '');
  // Defensive: any stray opening/closing script tags left behind.
  s = s.replace(/<\/?script\b[^>]*>/gi, '');

  // 2) Remove <foreignObject>…</foreignObject> (and self-closing).
  s = s.replace(/<foreignObject\b[^>]*>[\s\S]*?<\/foreignObject\s*>/gi, '');
  s = s.replace(/<foreignObject\b[^>]*\/\s*>/gi, '');
  s = s.replace(/<\/?foreignObject\b[^>]*>/gi, '');

  // 2b) Remove SMIL animation elements: <animate>/<set>/<animateTransform>/
  //     <animateMotion>. These can rewrite an ancestor's href to javascript: at
  //     runtime (e.g. <set attributeName="href" to="javascript:…">). No figure
  //     family emits SMIL (all motion is CSS), so strip them entirely — open/close,
  //     self-closing and any stray tags, any case/whitespace.
  const SMIL = '(?:animate|set|animateTransform|animateMotion)';
  s = s.replace(new RegExp(`<(${SMIL})\\b[^>]*>[\\s\\S]*?<\\/\\1\\s*>`, 'gi'), '');
  s = s.replace(new RegExp(`<${SMIL}\\b[^>]*\\/\\s*>`, 'gi'), '');
  s = s.replace(new RegExp(`<\\/?${SMIL}\\b[^>]*>`, 'gi'), '');

  // 3) Remove on* event-handler attributes (double, single, or unquoted),
  //    tolerating whitespace around '='. Run repeatedly until stable.
  const onAttr = /\son[a-z-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
  let prev;
  do { prev = s; s = s.replace(onAttr, ''); } while (s !== prev);

  // 4) Sanitise href / xlink:href: drop attribute entirely unless value is a
  //    '#'-anchor OR a SAFE raster data URL (png/jpeg/gif/webp/avif). A bare
  //    'data:' is NO LONGER enough — data:image/svg+xml (SVG-in-<use> XSS) and
  //    data:text/html are stripped like any external ref. Handles xlink: prefix,
  //    both quote styles, and whitespace around '='.
  const keepHref = (v) => v.startsWith('#') || SAFE_IMAGE_DATA_URL.test(v);
  const hrefAttr = /\s(?:xlink:)?href\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  s = s.replace(hrefAttr, (m, dq, sq) => {
    const v = ((dq !== undefined ? dq : sq) || '').trim();
    return keepHref(v) ? m : '';
  });
  // Unquoted href values: keep only #… or a safe raster data: URL, else strip.
  const hrefUnquoted = /\s(?:xlink:)?href\s*=\s*([^\s">]+)/gi;
  s = s.replace(hrefUnquoted, (m, val) => {
    const v = (val || '').trim();
    return keepHref(v) ? m : '';
  });

  // 5) Sanitise <style> contents to the allow-list.
  s = s.replace(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi, (_, css) => {
    const cleaned = cleanStyle(css);
    return `<style>${cleaned}</style>`;
  });

  return s;
}
