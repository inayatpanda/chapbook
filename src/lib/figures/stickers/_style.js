// Shared retro die-cut STICKER style toolkit — the single source of cohesion for
// the ~200-sticker library. Every per-genre module (./<genre>.js) should author
// its stickers with these helpers so the whole set stays visually consistent AND
// guaranteed sanitise-clean.
//
// THE RULE (read before authoring):
//   A sticker is a decorative inline <svg>. Colour is ENCOURAGED (unlike the
//   theme-var figure families). BUT it MUST be fully self-contained and pass
//   server/figures/svg.js `sanitise()` UNCHANGED:
//     - NO <script>, NO on* handlers, NO <foreignObject>, NO SMIL (<animate> …)
//     - NO href / xlink:href, NO url(…), NO external/remote refs of any kind
//     - viewBox only, NO pixel width/height on the root <svg>, role="img"
//   The mkSticker() convenience runs a dev-time assert that the output is
//   sanitise-clean, so if you build with these helpers you cannot ship an unsafe
//   sticker by accident.
//
// Pure data + string builders. ESM, browser-safe (this file is esbuild-bundled
// into the Studio): NO node built-ins, NO I/O.
//
// AUTHORING EXAMPLE (in e.g. ./food-drink.js):
//   import { mkSticker, RETRO, frame, path, circle } from './_style.js';
//   export default {
//     genre: 'food-drink', label: 'Food & drink',
//     stickers: [
//       mkSticker('coffee-cup', 'Coffee cup', [
//         path('M28 40 H86 V70 a18 18 0 0 1 -18 18 H46 a18 18 0 0 1 -18 -18 Z',
//              { fill: RETRO.cream }),
//         circle({ cx: 57, cy: 30, r: 6, fill: RETRO.red }),
//       ].join(''), { viewBox: [120, 120] }),
//     ],
//   };
//
// `mkSticker(...)` returns `{ id, name, svg }`. The aggregator (../stickers.js)
// flattens every module's `stickers` into the public `{ id, name, genre, viewBox,
// svg }` shape that `listStickers()` exposes.

import { sanitise } from '../svg.js';

// ── retro palette (plain hex — stickers are decorative, this is intentional) ──
// These are the EXACT tokens the original 24 stickers used; keep using them so
// the new 200 land in the same warm vintage family. Add nothing fancier.
export const RETRO = {
  ink: '#1c1a17',      // near-black outline / linework
  paper: '#fbf3e0',    // warm off-white (sticker border + paper)
  cream: '#f5e8cf',
  red: '#e4572e',      // tomato red
  orange: '#f08a24',
  gold: '#f4c145',
  teal: '#2dab9a',
  blue: '#3d7ea6',
  navy: '#2b4257',
  pink: '#e98ab0',
  green: '#5a9e57',
  brown: '#9a6b3f',
  plum: '#7a5ea6',
};

// Stroke-width tokens for the bold die-cut look. Use these, not raw numbers.
export const OUT = 5;   // main outline (the bold ink edge)
export const LINE = 3;  // inner detail line

// ── escaping (defensive; matches svg.js) ─────────────────────────────────────
function escText(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escAttr(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── root wrapper ─────────────────────────────────────────────────────────────
// svg([w,h] | "0 0 w h", inner) → a complete self-contained <svg> string:
//   viewBox only (NO pixel width/height so it scales to its container), role="img".
// Accepts a [w,h] tuple or a raw viewBox string.
export function svg(viewBox, inner) {
  const vb = Array.isArray(viewBox) ? `0 0 ${viewBox[0]} ${viewBox[1]}` : String(viewBox);
  const kids = Array.isArray(inner) ? inner.join('') : (inner ?? '');
  return `<svg viewBox="${escAttr(vb)}" xmlns="http://www.w3.org/2000/svg" role="img">${kids}</svg>`;
}

// ── primitive helpers (the retro look: bold ink stroke by default) ───────────
// All accept a plain opts object. Defaults give the die-cut ink outline; pass
// `fill`, `stroke`, `width` to override. Unknown keys pass through as attrs
// (e.g. transform, stroke-linejoin) — values are attribute-escaped.
function attrs(map) {
  const parts = [];
  for (const [k, v] of Object.entries(map)) {
    if (v === null || v === undefined) continue;
    parts.push(`${k}="${escAttr(v)}"`);
  }
  return parts.join(' ');
}

// path(d, opts) — opts: { fill='none', stroke=ink, width=LINE, ...rest }
export function path(d, { fill = 'none', stroke = RETRO.ink, width = LINE, ...rest } = {}) {
  return `<path ${attrs({ d, fill, stroke, 'stroke-width': width, ...rest })}/>`;
}

// circle({cx,cy,r,fill,stroke,width,...})
export function circle({ cx, cy, r, fill = 'none', stroke = RETRO.ink, width = LINE, ...rest } = {}) {
  return `<circle ${attrs({ cx, cy, r, fill, stroke, 'stroke-width': width, ...rest })}/>`;
}

// ellipse({cx,cy,rx,ry,fill,stroke,width,...})
export function ellipse({ cx, cy, rx, ry, fill = 'none', stroke = RETRO.ink, width = LINE, ...rest } = {}) {
  return `<ellipse ${attrs({ cx, cy, rx, ry, fill, stroke, 'stroke-width': width, ...rest })}/>`;
}

// rect({x,y,w,h,rx,fill,stroke,width,...})
export function rect({ x, y, w, h, rx, fill = 'none', stroke = RETRO.ink, width = LINE, ...rest } = {}) {
  return `<rect ${attrs({ x, y, width: w, height: h, rx, fill, stroke, 'stroke-width': width, ...rest })}/>`;
}

// line({x1,y1,x2,y2,stroke,width,...})
export function line({ x1, y1, x2, y2, stroke = RETRO.ink, width = LINE, ...rest } = {}) {
  return `<line ${attrs({ x1, y1, x2, y2, stroke, 'stroke-width': width, ...rest })}/>`;
}

// text(str, x, y, opts) — chunky retro serif by default. opts:
//   { size=13, anchor='middle', fill=ink, weight=700, font='Georgia, serif', ...rest }
export function text(str, x, y, { size = 13, anchor = 'middle', fill = RETRO.ink, weight = 700, font = 'Georgia, serif', ...rest } = {}) {
  return `<text ${attrs({ x, y, 'text-anchor': anchor, 'font-family': font, 'font-weight': weight, 'font-size': size, fill, ...rest })}>${escText(str)}</text>`;
}

// ── the die-cut treatment ────────────────────────────────────────────────────
// disc(cx, cy, r, fill) — a die-cut "badge" plate: a paper ring (bold ink edge)
// with the coloured artwork disc sitting just inside it. The classic seal look.
export function disc(cx, cy, r, fill) {
  return circle({ cx, cy, r: r + 6, fill: RETRO.paper, stroke: RETRO.ink, width: OUT })
    + circle({ cx, cy, r, fill, stroke: RETRO.ink, width: LINE });
}

// scallop(cx, cy, r, n) — a scalloped-seal path (n bumps), e.g. a "NEW!" badge.
// Returns the `d` string; pass it to path().
export function scallop(cx, cy, r, n) {
  const pts = [];
  const steps = n * 2;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2 - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r - 9;
    pts.push([cx + rad * Math.cos(a), cy + rad * Math.sin(a)]);
  }
  const round = (n2) => Math.round(n2 * 10) / 10;
  return 'M' + pts.map(([x, y]) => `${round(x)} ${round(y)}`).join(' L') + ' Z';
}

// frame(inner, opts) — wrap a motif in the die-cut sticker treatment and return a
// complete <svg>. This is what gives 200 disparate motifs the same offset
// paper-border ring + bold ink edge so the set reads as one cohesive pack.
//   opts:
//     viewBox : [w,h] | "0 0 w h"  (default [120,120])
//     badge   : true → draw a disc(cx,cy,r) plate BEHIND the motif (a round seal).
//               When badge is on, cx/cy/r/fill describe that plate.
//     cx,cy,r : badge plate centre + radius   (default centred, r = min(w,h)/2 - 8)
//     fill    : badge plate fill               (default RETRO.teal)
//     ring    : when NOT a badge, draw a rounded paper backplate behind the motif
//               (default false — most motifs carry their own outline already).
//     rx      : corner radius for the ring backplate (default 14)
//     pad     : ring backplate inset from the viewBox edge (default 6)
export function frame(inner, opts = {}) {
  const {
    viewBox: vb = [120, 120],
    badge = false,
    ring = false,
    rx = 14,
    pad = 6,
  } = opts;
  const [w, h] = Array.isArray(vb) ? vb : (() => { const p = String(vb).trim().split(/\s+/); return [Number(p[2]), Number(p[3])]; })();
  const kids = Array.isArray(inner) ? inner.join('') : (inner ?? '');

  let back = '';
  if (badge) {
    const cx = opts.cx ?? w / 2;
    const cy = opts.cy ?? h / 2;
    const r = opts.r ?? (Math.min(w, h) / 2 - 8);
    const fill = opts.fill ?? RETRO.teal;
    back = disc(cx, cy, r, fill);
  } else if (ring) {
    back = rect({ x: pad, y: pad, w: w - pad * 2, h: h - pad * 2, rx, fill: RETRO.paper, stroke: RETRO.ink, width: OUT });
  }
  return svg(vb, back + kids);
}

// ── the convenience: build + verify a sticker ────────────────────────────────
// mkSticker(id, name, inner, opts) → { id, name, svg }
//   inner : the motif markup (string or string[]) — usually built from the
//           primitives above.
//   opts  : { viewBox=[120,120], frame=false, ...frameOpts }
//           - frame:false (default) → wrap `inner` with svg(viewBox, inner)
//             (use when your motif already carries its own die-cut outline, like
//             most of the original 24).
//           - frame:true (or pass badge/ring) → run it through frame() to add the
//             shared die-cut plate/ring. Extra keys (badge, ring, cx, cy, r,
//             fill, rx, pad) forward to frame().
// A dev-time assert guarantees the result is sanitise-clean (throws if not), so a
// filler agent literally cannot append an unsafe sticker.
export function mkSticker(id, name, inner, opts = {}) {
  const { viewBox = [120, 120], frame: useFrame = false, ...frameOpts } = opts;
  const wantFrame = useFrame || frameOpts.badge || frameOpts.ring;
  const out = wantFrame
    ? frame(inner, { viewBox, ...frameOpts })
    : svg(viewBox, inner);
  assertClean(id, out);
  return { id, name, svg: out };
}

// Dev assert: the svg must survive sanitise() byte-for-byte (i.e. it contains no
// constructs sanitise() would strip) AND must declare no pixel width/height. We
// throw eagerly so a bad sticker is caught at module-load / build time, never at
// runtime in a reader's browser.
export function assertClean(id, out) {
  const head = out.slice(0, out.indexOf('>') + 1);
  if (/\swidth=|\sheight=/.test(head)) {
    throw new Error(`sticker "${id}": root <svg> must not set pixel width/height`);
  }
  if (/<script|<foreignObject|[\s/"'`]on\w+\s*=|href|[\s/"'`]src\s*=|url\s*\(|xlink|<animate|<set\b/i.test(out)) {
    throw new Error(`sticker "${id}": svg contains an unsafe construct (script/href/src/url/xlink/SMIL/on*)`);
  }
  if (sanitise(out) !== out) {
    throw new Error(`sticker "${id}": svg is altered by sanitise() — it is not self-contained/clean`);
  }
}
