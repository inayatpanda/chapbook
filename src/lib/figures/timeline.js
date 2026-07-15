// Figure family: timeline (category 'Process').
// A horizontal time axis with tick marks; events are plotted as markers on the
// axis with labels alternating above/below to avoid overlap. `at` is an optional
// 0..1 position; omitted events are distributed evenly.
// NYT line-art: minimal strokes, theme-var colours only, no hex.
// Stroked elements carry class="fig-stroke" so drawCss can animate them.

import {
  el, line, circle, label, svgWrap, viewBox, drawCss, sanitise,
} from './svg.js';

const VB_W = 480;
const VB_H = 220;
const PAD = 40; // horizontal padding from viewBox edge to axis ends
const AXIS_Y = VB_H / 2; // axis sits on the vertical centre line
const TICK = 6; // half-length of a tick mark
const round = (n) => Math.round(n * 100) / 100;

export const meta = {
  id: 'timeline',
  name: 'Timeline',
  category: 'Process',
  description: 'A horizontal time axis with tick marks; events plotted as markers with labels alternating above and below.',
  paramsSchema: {
    type: 'object',
    properties: {
      showAxis: { type: 'boolean', default: true },
      events: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            at: { type: 'number', minimum: 0, maximum: 1 },
            label: { type: 'string' },
          },
          required: ['label'],
        },
        default: [],
      },
    },
  },
  presets: [
    {
      name: 'From bean to cup',
      params: {
        events: [
          { label: 'Harvest' },
          { label: 'Roast' },
          { label: 'Grind' },
          { label: 'Brew' },
        ],
      },
    },
  ],
};

export function build(params = {}, opts = { animate: 'draw' }) {
  const { events = [], showAxis = true } = params || {};
  const animate = (opts && opts.animate) || 'draw';
  const list = Array.isArray(events) ? events.filter(Boolean) : [];
  const n = list.length;

  const axisX1 = PAD;
  const axisX2 = VB_W - PAD;
  const span = axisX2 - axisX1;

  const parts = [];

  // The axis line itself.
  if (showAxis) {
    parts.push(line({
      x1: axisX1, y1: AXIS_Y, x2: axisX2, y2: AXIS_Y, class: 'fig-stroke', width: 2,
    }));
  }

  for (let i = 0; i < n; i++) {
    const ev = list[i];
    // Position: use `at` (0..1) if a valid number, else distribute evenly.
    const frac = (typeof ev.at === 'number' && ev.at >= 0 && ev.at <= 1)
      ? ev.at
      : (n === 1 ? 0.5 : i / (n - 1));
    const x = round(axisX1 + frac * span);

    // Tick mark across the axis.
    parts.push(line({
      x1: x, y1: AXIS_Y - TICK, x2: x, y2: AXIS_Y + TICK, class: 'fig-stroke', width: 2,
    }));
    // Event marker on the axis.
    parts.push(circle({
      cx: x, cy: AXIS_Y, r: 4, stroke: 'var(--cyan)', width: 2, fill: 'none', class: 'fig-stroke',
    }));

    // Label alternates above (even index) / below (odd index) to avoid overlap.
    const above = i % 2 === 0;
    const leaderY = above ? AXIS_Y - 22 : AXIS_Y + 22;
    parts.push(line({
      x1: x, y1: above ? AXIS_Y - TICK : AXIS_Y + TICK, x2: x, y2: leaderY,
      stroke: 'var(--ink-dim)', width: 1,
    }));
    const textY = above ? leaderY - 6 : leaderY + 14;
    parts.push(label(ev.label ?? '', x, textY, { anchor: 'middle', size: 12 }));
  }

  const styleCss = animate === 'draw' ? drawCss('.fig-stroke') : '';
  // sanitise() canonicalises CSS formatting; running it here guarantees the
  // emitted svg is already in its sanitised form (sanitise(svg) === svg).
  const svg = sanitise(svgWrap(parts.join(''), viewBox(VB_W, VB_H), styleCss));
  return { svg, supportsDraw: true, motion: null };
}
