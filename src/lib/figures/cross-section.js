// Figure family: cross-section (category 'Structure').
// A layered cutaway / strata diagram: stacked bands sized by thickness, each
// with a leader-connected label; optional diagonal hatch fill per band.
// NYT line-art: minimal strokes, theme-var colours only, no hex.
// Stroked elements carry class="fig-stroke" so drawCss can animate them.

import {
  el, rect, line, label, leader, svgWrap, viewBox, drawCss, sanitise,
} from './svg.js';

const VB_W = 420;
const VB_H = 300;
const PAD = 24; // viewBox padding around the stack
const LABEL_GAP = 16; // leader length from band edge to the label

export const meta = {
  id: 'cross-section',
  name: 'Cross-section',
  category: 'Structure',
  description: 'A layered cutaway: stacked bands sized by thickness, each labelled, with optional hatch fill.',
  paramsSchema: {
    type: 'object',
    properties: {
      orientation: { type: 'string', enum: ['v', 'h'], default: 'v' },
      layers: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            label: { type: 'string' },
            thickness: { type: 'number' },
            hatch: { type: 'boolean' },
          },
          required: ['label'],
        },
        default: [],
      },
    },
  },
  presets: [
    {
      name: 'Earth’s layers',
      params: {
        orientation: 'v',
        layers: [
          { label: 'crust' },
          { label: 'upper mantle', hatch: true },
          { label: 'lower mantle' },
          { label: 'outer core' },
          { label: 'inner core' },
        ],
      },
    },
  ],
};

// Diagonal hatch lines clipped to a band's rectangle (thin, dim ink).
// Drawn at ~45deg, spaced evenly; only the segment inside the band is kept.
function hatchBand(x, y, w, h) {
  const lines = [];
  const step = 12;
  // Sweep a family of 45deg lines (slope +1) across the band; clip each to [x,x+w]x[y,y+h].
  // Parametrise by the line's x-intercept at the band's top edge.
  const x0Start = x - h; // earliest line that can clip the band
  const x0End = x + w;
  for (let x0 = x0Start; x0 <= x0End; x0 += step) {
    // Line: points (px, y) where px = x0 + (py - y) for py in [y, y+h] (slope +1, going down-right).
    // Clip to the band's x-range.
    let p1x = x0;
    let p1y = y;
    let p2x = x0 + h;
    let p2y = y + h;
    // Clip left edge (x = x): py = y + (x - x0)
    if (p1x < x) { p1x = x; p1y = y + (x - x0); }
    // Clip right edge (x = x + w): py = y + (x + w - x0)
    if (p2x > x + w) { p2x = x + w; p2y = y + (x + w - x0); }
    if (p1y > y + h || p2y < y || p1x > p2x) continue;
    const round = (n) => Math.round(n * 100) / 100;
    lines.push(line({
      x1: round(p1x), y1: round(p1y), x2: round(p2x), y2: round(p2y),
      stroke: 'var(--ink-dim)', width: 1,
    }));
  }
  return el('g', {}, lines);
}

export function build(params = {}, opts = { animate: 'draw' }) {
  const { orientation = 'v', layers = [] } = params || {};
  const animate = (opts && opts.animate) || 'draw';
  const vertical = orientation !== 'h';
  const list = Array.isArray(layers) ? layers.filter(Boolean) : [];

  // Resolve thickness weights (default equal).
  const weights = list.map((l) => (typeof l.thickness === 'number' && l.thickness > 0 ? l.thickness : 1));
  const total = weights.reduce((a, b) => a + b, 0) || 1;

  // The stack occupies the inner box; labels sit to the right (v) / below (h).
  // Reserve room on the labelling side for the leader + text.
  const stackX = PAD;
  const stackY = PAD;
  const stackW = vertical ? VB_W - PAD * 2 - 110 : VB_W - PAD * 2;
  const stackH = vertical ? VB_H - PAD * 2 : VB_H - PAD * 2 - 60;

  const parts = [];
  let cursor = 0; // running position along the stacking axis (px)
  for (let i = 0; i < list.length; i++) {
    const layer = list[i];
    const frac = weights[i] / total;
    let x; let y; let w; let h;
    if (vertical) {
      const band = frac * stackH;
      x = stackX; y = stackY + cursor; w = stackW; h = band;
      cursor += band;
    } else {
      const band = frac * stackW;
      x = stackX + cursor; y = stackY; w = band; h = stackH;
      cursor += band;
    }
    const round = (n) => Math.round(n * 100) / 100;
    parts.push(rect({
      x: round(x), y: round(y), w: round(w), h: round(h), class: 'fig-stroke', width: 2,
    }));
    if (layer.hatch) parts.push(hatchBand(x, y, w, h));

    // Label + short leader from the band to the text.
    if (vertical) {
      const my = y + h / 2;
      const lx = stackX + stackW + LABEL_GAP;
      parts.push(leader([stackX + stackW, my], [lx, my]));
      parts.push(label(layer.label ?? '', lx + 4, round(my) + 4, { size: 13 }));
    } else {
      const mx = x + w / 2;
      const ly = stackY + stackH + LABEL_GAP;
      parts.push(leader([mx, stackY + stackH], [mx, ly]));
      parts.push(label(layer.label ?? '', round(mx), round(ly) + 14, { anchor: 'middle', size: 12 }));
    }
  }

  const styleCss = animate === 'draw' ? drawCss('.fig-stroke') : '';
  // sanitise() canonicalises CSS formatting; running it here guarantees the
  // emitted svg is already in its sanitised form (sanitise(svg) === svg).
  const svg = sanitise(svgWrap(parts.join(''), viewBox(VB_W, VB_H), styleCss));
  return { svg, supportsDraw: true, motion: null };
}
