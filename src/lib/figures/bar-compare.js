// Figure family: bar-compare (category 'Quantity').
// An annotated line-art bar chart: outlined (stroke-only) bars scaled to a max,
// each labelled with its name and value, with an optional caption note.
// Horizontal (bars run left->right) or vertical (bars rise from a baseline).
// NYT line-art: minimal strokes, theme-var colours only, no hex.
// Stroked elements carry class="fig-stroke" so drawCss can animate them.

import {
  el, rect, line, label, svgWrap, viewBox, drawCss, sanitise,
} from './svg.js';

const PAD = 24; // viewBox padding
const round = (n) => Math.round(n * 100) / 100;

// Horizontal layout metrics.
const H_LABEL_W = 84; // left gutter for the bar name
const H_TRACK = 240; // pixels available for a full-length bar
const H_BAR_H = 26; // bar thickness
const H_GAP = 22; // vertical gap between bars
const H_VALUE_W = 44; // right gutter for the value text

// Vertical layout metrics.
const V_BAR_W = 56; // bar thickness
const V_GAP = 28; // horizontal gap between bars
const V_TRACK = 180; // pixels available for a full-height bar
const V_LABEL_H = 22; // room below for the bar name
const V_VALUE_H = 18; // room above for the value text

export const meta = {
  id: 'bar-compare',
  name: 'Bar compare',
  category: 'Quantity',
  description: 'An annotated line-art bar chart: outlined bars scaled to a max, each labelled with its name and value.',
  paramsSchema: {
    type: 'object',
    properties: {
      orientation: { type: 'string', enum: ['h', 'v'], default: 'h' },
      max: { type: 'number' },
      note: { type: 'string' },
      bars: {
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
      name: 'Rainy days',
      params: {
        bars: [
          { label: 'London', value: 95 },
          { label: 'Rome', value: 63 },
        ],
        note: 'rainy days per year',
      },
    },
    {
      name: 'Books by season',
      params: {
        orientation: 'v',
        bars: [
          { label: 'Spring', value: 5 },
          { label: 'Summer', value: 9 },
          { label: 'Autumn', value: 4 },
        ],
      },
    },
  ],
};

export function build(params = {}, opts = { animate: 'draw' }) {
  const {
    bars = [], orientation = 'h', note, max,
  } = params || {};
  const animate = (opts && opts.animate) || 'draw';
  const horizontal = orientation !== 'v';
  const list = Array.isArray(bars) ? bars.filter(Boolean) : [];
  const n = Math.max(list.length, 1);

  // Scale: the largest value (or override) maps to the full track length.
  const values = list.map((b) => Number(b.value) || 0);
  const scaleMax = (typeof max === 'number' && max > 0)
    ? max
    : Math.max(1, ...values);

  const parts = [];
  const hasNote = note != null && note !== '';

  if (horizontal) {
    const ox = PAD + H_LABEL_W;
    const oy = PAD;
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      const v = Number(b.value) || 0;
      const w = round(Math.max(0, (v / scaleMax) * H_TRACK));
      const y = oy + i * (H_BAR_H + H_GAP);
      const midY = round(y + H_BAR_H / 2 + 4);
      // Bar name in the left gutter.
      parts.push(label(b.label ?? '', PAD, midY, { size: 12, fill: 'var(--ink-dim)' }));
      // Outlined bar (stroke-only line-art).
      parts.push(rect({
        x: ox, y, w: Math.max(w, 1), h: H_BAR_H, rx: 3, class: 'fig-stroke', width: 2,
      }));
      // Value text to the right of the bar.
      parts.push(label(String(v), round(ox + w + 8), midY, { size: 12 }));
    }
    const W = PAD * 2 + H_LABEL_W + H_TRACK + H_VALUE_W;
    const H = PAD * 2 + n * H_BAR_H + (n - 1) * H_GAP + (hasNote ? 24 : 0);
    if (hasNote) {
      parts.push(label(note, PAD, round(H - PAD + 4), { size: 12, fill: 'var(--ink-dim)' }));
    }
    const styleCss = animate === 'draw' ? drawCss('.fig-stroke') : '';
    const svg = sanitise(svgWrap(parts.join(''), viewBox(W, H), styleCss));
    return { svg, supportsDraw: true, motion: null };
  }

  // Vertical: bars rise from a baseline.
  const ox = PAD;
  const baselineY = PAD + V_VALUE_H + V_TRACK;
  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    const v = Number(b.value) || 0;
    const h = round(Math.max(1, (v / scaleMax) * V_TRACK));
    const x = ox + i * (V_BAR_W + V_GAP);
    const y = round(baselineY - h);
    const cx = round(x + V_BAR_W / 2);
    // Value text above the bar.
    parts.push(label(String(v), cx, round(y - 6), { size: 12, anchor: 'middle' }));
    // Outlined bar.
    parts.push(rect({
      x, y, w: V_BAR_W, h, rx: 3, class: 'fig-stroke', width: 2,
    }));
    // Bar name below the baseline.
    parts.push(label(b.label ?? '', cx, round(baselineY + 16), {
      size: 12, anchor: 'middle', fill: 'var(--ink-dim)',
    }));
  }
  // Baseline axis.
  const axisW = n * V_BAR_W + (n - 1) * V_GAP;
  parts.push(line({
    x1: ox, y1: baselineY, x2: ox + axisW, y2: baselineY, stroke: 'var(--ink-dim)', width: 1,
  }));
  const W = PAD * 2 + axisW;
  const H = baselineY + V_LABEL_H + PAD + (hasNote ? 24 : 0);
  if (hasNote) {
    parts.push(label(note, PAD, round(H - PAD + 4), { size: 12, fill: 'var(--ink-dim)' }));
  }
  const styleCss = animate === 'draw' ? drawCss('.fig-stroke') : '';
  const svg = sanitise(svgWrap(parts.join(''), viewBox(W, H), styleCss));
  return { svg, supportsDraw: true, motion: null };
}
