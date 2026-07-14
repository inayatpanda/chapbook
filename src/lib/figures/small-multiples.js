// Figure family: small-multiples (category 'Variation').
// A grid of mini-figures: each item is a small bordered panel showing the item
// label and a simple distinguishing mini-glyph driven by `variant` (a number ->
// that many dots, capped, so successive variants read as a clear progression).
// NYT line-art: minimal strokes, theme-var colours only, no hex.
// Stroked elements carry class="fig-stroke" so drawCss can animate them.

import {
  el, panel, circle, label, svgWrap, viewBox, drawCss, sanitise,
} from './svg.js';

const PAD = 24; // viewBox padding
const CELL_W = 130;
const CELL_H = 100;
const GAP = 18; // gap between cells
const round = (n) => Math.round(n * 100) / 100;

export const meta = {
  id: 'small-multiples',
  name: 'Small multiples',
  category: 'Variation',
  description: 'A grid of mini-figures: small bordered panels each with a label and a variant-driven mini-glyph.',
  paramsSchema: {
    type: 'object',
    properties: {
      cols: { type: 'number', default: 3 },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            label: { type: 'string' },
            variant: { type: 'number' },
          },
          required: ['label'],
        },
        default: [],
      },
    },
  },
  presets: [
    {
      name: 'Stages',
      params: {
        cols: 3,
        items: [
          { label: 'Stage 1', variant: 1 },
          { label: 'Stage 2', variant: 2 },
          { label: 'Stage 3', variant: 3 },
        ],
      },
    },
  ],
};

// Mini-glyph: up to `variant` dots in a row, centred in the cell's upper area.
function glyph(variant, cx, cy) {
  const v = Math.max(1, Math.min(5, Math.round(Number(variant) || 1)));
  const out = [];
  const r = 5;
  const step = 16;
  const startX = cx - ((v - 1) * step) / 2;
  for (let i = 0; i < v; i++) {
    out.push(circle({
      cx: round(startX + i * step), cy, r, stroke: 'var(--teal)', width: 2, class: 'fig-stroke',
    }));
  }
  return out;
}

export function build(params = {}, opts = { animate: 'draw' }) {
  const { cols = 3, items = [] } = params || {};
  const animate = (opts && opts.animate) || 'draw';
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  const nCols = Math.max(1, Math.round(Number(cols) || 3));
  const n = Math.max(list.length, 1);
  const nRows = Math.max(1, Math.ceil(list.length / nCols) || 1);

  const parts = [];
  for (let i = 0; i < list.length; i++) {
    const it = list[i];
    const col = i % nCols;
    const row = Math.floor(i / nCols);
    const x = PAD + col * (CELL_W + GAP);
    const y = PAD + row * (CELL_H + GAP);
    const cx = round(x + CELL_W / 2);
    // Bordered panel.
    parts.push(panel({ x, y, w: CELL_W, h: CELL_H }));
    // Variant-driven mini-glyph (upper area).
    parts.push(...glyph(it.variant, cx, round(y + CELL_H * 0.42)));
    // Item label (lower area).
    parts.push(label(it.label ?? '', cx, round(y + CELL_H - 18), { anchor: 'middle', size: 12 }));
  }

  // ViewBox sized to the grid.
  const usedCols = Math.min(nCols, n);
  const W = PAD * 2 + usedCols * CELL_W + (usedCols - 1) * GAP;
  const H = PAD * 2 + nRows * CELL_H + (nRows - 1) * GAP;

  const styleCss = animate === 'draw' ? drawCss('.fig-stroke') : '';
  // sanitise() canonicalises CSS formatting; running it here guarantees the
  // emitted svg is already in its sanitised form (sanitise(svg) === svg).
  const svg = sanitise(svgWrap(parts.join(''), viewBox(W, H), styleCss));
  return { svg, supportsDraw: true, motion: null };
}
