// Figure family: before-after (category 'Compare').
// N side-by-side labelled panels in a row; between consecutive panels a divider
// (a vertical line, or an arrow pointing right). Each panel shows a top label and
// an optional muted note inside.
// NYT line-art: minimal strokes, theme-var colours only, no hex.
// Stroked elements carry class="fig-stroke" so drawCss can animate them.

import {
  el, panel, line, arrow, label, svgWrap, viewBox, drawCss, sanitise,
} from './svg.js';

const PANEL_W = 150;
const PANEL_H = 120;
const DIVIDER = 56; // horizontal space reserved between panels for the divider
const PAD = 24; // viewBox padding around the row
const LABEL_H = 26; // room above each panel for its top label
const round = (n) => Math.round(n * 100) / 100;

export const meta = {
  id: 'before-after',
  name: 'Before / after',
  category: 'Compare',
  description: 'Side-by-side labelled panels in a row, separated by a divider line or a right-pointing arrow.',
  paramsSchema: {
    type: 'object',
    properties: {
      divider: { type: 'string', enum: ['line', 'arrow'], default: 'arrow' },
      panels: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            label: { type: 'string' },
            note: { type: 'string' },
          },
          required: ['label'],
        },
        default: [],
      },
    },
  },
  presets: [
    {
      name: 'Edit pass',
      params: {
        divider: 'arrow',
        panels: [
          { label: 'As shot', note: 'before' },
          { label: 'Edited', note: 'after' },
        ],
      },
    },
  ],
};

export function build(params = {}, opts = { animate: 'draw' }) {
  const { panels = [], divider = 'arrow' } = params || {};
  const animate = (opts && opts.animate) || 'draw';
  const list = Array.isArray(panels) ? panels.filter(Boolean) : [];
  const n = Math.max(list.length, 1);

  const top = PAD + LABEL_H;
  const parts = [];

  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    const x = PAD + i * (PANEL_W + DIVIDER);
    const y = top;

    // Bordered rounded region.
    parts.push(panel({ x, y, w: PANEL_W, h: PANEL_H }));
    // Top label (above the panel).
    parts.push(label(p.label ?? '', round(x + PANEL_W / 2), y - 8, { anchor: 'middle', size: 13 }));
    // Optional muted note inside the panel.
    if (p.note != null && p.note !== '') {
      parts.push(label(p.note, round(x + PANEL_W / 2), round(y + PANEL_H / 2 + 4), {
        anchor: 'middle', size: 12, fill: 'var(--ink-dim)',
      }));
    }

    // Divider between this panel and the next.
    if (i < list.length - 1) {
      const cy = y + PANEL_H / 2;
      const gx1 = x + PANEL_W;
      const gx2 = gx1 + DIVIDER;
      if (divider === 'line') {
        const mid = round((gx1 + gx2) / 2);
        parts.push(line({
          x1: mid, y1: y + 8, x2: mid, y2: y + PANEL_H - 8, class: 'fig-stroke', width: 2,
        }));
      } else {
        parts.push(arrow({
          x1: round(gx1 + 8), y1: cy, x2: round(gx2 - 8), y2: cy, width: 2, class: 'fig-stroke',
        }));
      }
    }
  }

  // ViewBox sized to the panel count.
  const W = PAD * 2 + n * PANEL_W + Math.max(0, n - 1) * DIVIDER;
  const H = PAD * 2 + LABEL_H + PANEL_H;

  const styleCss = animate === 'draw' ? drawCss('.fig-stroke') : '';
  // sanitise() canonicalises CSS formatting; running it here guarantees the
  // emitted svg is already in its sanitised form (sanitise(svg) === svg).
  const svg = sanitise(svgWrap(parts.join(''), viewBox(W, H), styleCss));
  return { svg, supportsDraw: true, motion: null };
}
