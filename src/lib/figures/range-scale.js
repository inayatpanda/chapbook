// Figure family: range-scale (category 'Quantity').
// A labelled horizontal scale from min->max with evenly spaced ticks, optional
// shaded bands (bracketed spans labelled along the axis) and optional markers
// (pointers placed at a value with a label, e.g. "this tyre").
// NYT line-art: minimal strokes, theme-var colours only, no hex.
// Stroked elements carry class="fig-stroke" so drawCss can animate them.

import {
  el, line, path, label, svgWrap, viewBox, drawCss, sanitise,
} from './svg.js';

const VB_W = 480;
const VB_H = 180;
const AX_X0 = 48; // axis left edge
const AX_X1 = 432; // axis right edge
const AX_Y = 110; // axis baseline y
const round = (n) => Math.round(n * 100) / 100;

export const meta = {
  id: 'range-scale',
  name: 'Range scale',
  category: 'Quantity',
  description: 'A labelled horizontal scale with ticks, shaded bands and value markers.',
  paramsSchema: {
    type: 'object',
    properties: {
      min: { type: 'number', default: 0 },
      max: { type: 'number', default: 100 },
      unit: { type: 'string' },
      markers: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            value: { type: 'number' },
            label: { type: 'string' },
          },
          required: ['value'],
        },
        default: [],
      },
      bands: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            from: { type: 'number' },
            to: { type: 'number' },
            label: { type: 'string' },
          },
          required: ['from', 'to'],
        },
        default: [],
      },
    },
  },
  presets: [
    {
      name: 'Tyre pressure',
      params: {
        min: 0,
        max: 120,
        unit: ' psi',
        bands: [{ from: 80, to: 100, label: 'road' }],
        markers: [{ value: 65, label: 'this tyre' }],
      },
    },
  ],
};

export function build(params = {}, opts = { animate: 'draw' }) {
  const {
    min = 0, max = 100, unit = '', markers = [], bands = [],
  } = params || {};
  const animate = (opts && opts.animate) || 'draw';
  const lo = Number(min) || 0;
  const hi = (Number(max) || 0) > lo ? Number(max) : lo + 1;
  const span = hi - lo;
  const u = unit == null ? '' : String(unit);

  // Map a domain value to an x pixel on the axis.
  const xOf = (v) => round(AX_X0 + ((Number(v) - lo) / span) * (AX_X1 - AX_X0));

  const parts = [];

  // Shaded bands (drawn first, behind the axis): a dim bracket spanning from->to,
  // labelled above the axis.
  const bandList = Array.isArray(bands) ? bands.filter(Boolean) : [];
  for (const b of bandList) {
    const bx1 = xOf(b.from);
    const bx2 = xOf(b.to);
    const by = AX_Y - 26;
    // Bracket: a span line with short down-ticks at each end.
    const d = `M ${bx1} ${round(by + 8)} L ${bx1} ${by} L ${bx2} ${by} L ${bx2} ${round(by + 8)}`;
    parts.push(path(d, { stroke: 'var(--ink-dim)', width: 1.5 }));
    if (b.label != null && b.label !== '') {
      parts.push(label(b.label, round((bx1 + bx2) / 2), round(by - 6), {
        anchor: 'middle', size: 11, fill: 'var(--ink-dim)',
      }));
    }
  }

  // The axis line.
  parts.push(line({
    x1: AX_X0, y1: AX_Y, x2: AX_X1, y2: AX_Y, class: 'fig-stroke', width: 2,
  }));

  // Evenly spaced ticks (min, max and intermediate steps) with value labels.
  const TICKS = 4; // -> 5 tick stops including both ends
  for (let i = 0; i <= TICKS; i++) {
    const v = lo + (span * i) / TICKS;
    const tx = xOf(v);
    parts.push(line({
      x1: tx, y1: AX_Y, x2: tx, y2: AX_Y + 8, stroke: 'var(--ink-dim)', width: 1,
    }));
    const txt = `${Math.round(v * 10) / 10}${u}`;
    parts.push(label(txt, tx, AX_Y + 24, { anchor: 'middle', size: 11, fill: 'var(--ink-dim)' }));
  }

  // Markers: a pointer (triangle) sitting on the axis with a label below.
  const markerList = Array.isArray(markers) ? markers.filter(Boolean) : [];
  for (const m of markerList) {
    const mx = xOf(m.value);
    const top = AX_Y - 14;
    // Downward pointer triangle resting on the axis.
    const d = `M ${round(mx - 6)} ${top} L ${round(mx + 6)} ${top} L ${mx} ${AX_Y} Z`;
    parts.push(path(d, { stroke: 'var(--teal)', width: 2, class: 'fig-stroke' }));
    if (m.label != null && m.label !== '') {
      parts.push(label(m.label, mx, round(top - 6), { anchor: 'middle', size: 12 }));
    }
  }

  const styleCss = animate === 'draw' ? drawCss('.fig-stroke') : '';
  // sanitise() canonicalises CSS formatting; running it here guarantees the
  // emitted svg is already in its sanitised form (sanitise(svg) === svg).
  const svg = sanitise(svgWrap(parts.join(''), viewBox(VB_W, VB_H), styleCss));
  return { svg, supportsDraw: true, motion: null };
}
