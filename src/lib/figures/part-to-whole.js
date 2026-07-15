// Figure family: part-to-whole (category 'Quantity').
// Proportions of a whole, in one of three styles:
//   donut   - a ring split into proportional stroked arcs + a percentage legend.
//   stacked - one horizontal bar split into proportional segments + legend.
//   waffle  - a 10x10 grid of unit cells, filled proportionally per segment + legend.
// Percentages are computed from the segment values.
// NYT line-art: minimal strokes, theme-var colours only, no hex.
// Stroked elements carry class="fig-stroke" so drawCss can animate them.

import {
  el, rect, line, path, circle, label, svgWrap, viewBox, drawCss, sanitise,
} from './svg.js';

const round = (n) => Math.round(n * 100) / 100;

// Per-segment colour cycle: teal -> cyan -> violet -> ink.
const COLOURS = ['var(--teal)', 'var(--cyan)', 'var(--violet)', 'var(--ink)'];
const colourAt = (i) => COLOURS[i % COLOURS.length];

const VB_W = 420;
const VB_H = 300;

export const meta = {
  id: 'part-to-whole',
  name: 'Part to whole',
  category: 'Quantity',
  description: 'Proportions of a whole as a donut, a stacked bar or a waffle grid, with a percentage legend.',
  paramsSchema: {
    type: 'object',
    properties: {
      style: { type: 'string', enum: ['donut', 'stacked', 'waffle'], default: 'donut' },
      segments: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            label: { type: 'string' },
            value: { type: 'number' },
          },
          required: ['label', 'value'],
        },
        default: [],
      },
    },
  },
  presets: [
    {
      name: 'Outcomes (waffle)',
      params: {
        segments: [
          { label: 'Union', value: 7 },
          { label: 'Delayed', value: 1 },
        ],
        style: 'waffle',
      },
    },
    {
      name: 'Outcomes (donut)',
      params: {
        segments: [
          { label: 'Union', value: 7 },
          { label: 'Delayed', value: 1 },
        ],
        style: 'donut',
      },
    },
  ],
};

// Normalise the segment list and attach fractions/percentages.
function normalise(segments) {
  const list = (Array.isArray(segments) ? segments : [])
    .filter(Boolean)
    .map((s) => ({ label: s.label ?? '', value: Math.max(0, Number(s.value) || 0) }));
  const total = list.reduce((acc, s) => acc + s.value, 0) || 1;
  return list.map((s, i) => ({
    ...s,
    frac: s.value / total,
    pct: Math.round((s.value / total) * 100),
    colour: colourAt(i),
  }));
}

// A polar->cartesian point on the donut ring.
function ringPoint(cx, cy, r, angle) {
  return [round(cx + r * Math.cos(angle)), round(cy + r * Math.sin(angle))];
}

// Legend: a coloured swatch line + "label N%" per segment, drawn from (x,y) down.
function legend(segs, x, y) {
  const out = [];
  const lineH = 22;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    const ly = y + i * lineH;
    out.push(line({
      x1: x, y1: ly, x2: x + 18, y2: ly, stroke: s.colour, width: 3, class: 'fig-stroke',
    }));
    out.push(label(`${s.label} ${s.pct}%`, x + 26, round(ly + 4), { size: 12 }));
  }
  return out;
}

function buildDonut(segs) {
  const cx = 150;
  const cy = VB_H / 2;
  const r = 78;
  const parts = [];
  // Faint full ring as the track.
  parts.push(circle({
    cx, cy, r, stroke: 'var(--ink-dim)', width: 12,
  }));
  // Proportional arcs, starting at 12 o'clock and going clockwise.
  let start = -Math.PI / 2;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    const sweep = s.frac * Math.PI * 2;
    const end = start + sweep;
    const [x1, y1] = ringPoint(cx, cy, r, start);
    const [x2, y2] = ringPoint(cx, cy, r, end);
    const largeArc = sweep > Math.PI ? 1 : 0;
    const d = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
    parts.push(path(d, {
      stroke: s.colour, width: 12, class: 'fig-stroke', 'stroke-linecap': 'butt',
    }));
    start = end;
  }
  parts.push(...legend(segs, 280, cy - segs.length * 11));
  return parts;
}

function buildStacked(segs) {
  const x0 = 40;
  const y0 = 70;
  const barW = 340;
  const barH = 44;
  const parts = [];
  // Outline of the whole bar.
  parts.push(rect({
    x: x0, y: y0, w: barW, h: barH, rx: 4, class: 'fig-stroke', width: 2,
  }));
  // Proportional internal segments (dividers as stroked lines).
  let cx = x0;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    const w = round(s.frac * barW);
    // Coloured top rule marks the segment span.
    parts.push(line({
      x1: round(cx), y1: y0 + 6, x2: round(cx + w), y2: y0 + 6,
      stroke: s.colour, width: 4, class: 'fig-stroke',
    }));
    // Divider at the segment end (skip the final edge).
    if (i < segs.length - 1) {
      parts.push(line({
        x1: round(cx + w), y1: y0, x2: round(cx + w), y2: y0 + barH,
        stroke: 'var(--ink-dim)', width: 1,
      }));
    }
    cx += w;
  }
  parts.push(...legend(segs, x0, y0 + barH + 36));
  return parts;
}

function buildWaffle(segs) {
  const cols = 10;
  const rows = 10;
  const total = cols * rows;
  const cell = 22;
  const x0 = 40;
  const y0 = 30;
  const parts = [];

  // Assign each of the 100 cells a colour by proportional, largest-remainder allotment.
  const counts = segs.map((s) => Math.floor(s.frac * total));
  let assigned = counts.reduce((a, b) => a + b, 0);
  // Distribute the remaining cells to the largest fractional remainders.
  const rema = segs
    .map((s, i) => ({ i, rem: s.frac * total - counts[i] }))
    .sort((a, b) => b.rem - a.rem);
  let k = 0;
  while (assigned < total && segs.length > 0) {
    counts[rema[k % rema.length].i] += 1;
    assigned += 1;
    k += 1;
  }
  // Flatten to a per-cell colour list.
  const cellColour = [];
  for (let i = 0; i < segs.length; i++) {
    for (let c = 0; c < counts[i]; c++) cellColour.push(segs[i].colour);
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const x = x0 + c * cell;
      const y = y0 + r * cell;
      const colour = cellColour[idx] || 'var(--ink-dim)';
      parts.push(rect({
        x, y, w: cell - 4, h: cell - 4, rx: 2,
        stroke: colour, width: 2, class: 'fig-stroke',
      }));
    }
  }
  parts.push(...legend(segs, x0 + cols * cell + 16, y0 + 8));
  return parts;
}

export function build(params = {}, opts = { animate: 'draw' }) {
  const { segments = [], style = 'donut' } = params || {};
  const animate = (opts && opts.animate) || 'draw';
  const segs = normalise(segments);

  let parts;
  if (style === 'stacked') parts = buildStacked(segs);
  else if (style === 'waffle') parts = buildWaffle(segs);
  else parts = buildDonut(segs);

  const styleCss = animate === 'draw' ? drawCss('.fig-stroke') : '';
  // sanitise() canonicalises CSS formatting; running it here guarantees the
  // emitted svg is already in its sanitised form (sanitise(svg) === svg).
  const svg = sanitise(svgWrap(parts.join(''), viewBox(VB_W, VB_H), styleCss));
  return { svg, supportsDraw: true, motion: null };
}
