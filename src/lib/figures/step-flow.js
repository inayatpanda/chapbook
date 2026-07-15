// Figure family: step-flow (category 'Process').
// Numbered step nodes connected by arrows, horizontal or vertical.
// NYT line-art: minimal strokes, theme-var colours only, no hex.
// Stroked elements carry class="fig-stroke" so drawCss can animate them.

import {
  el, rect, label, arrow, svgWrap, viewBox, drawCss, sanitise,
} from './svg.js';

const NODE_W = 96;
const NODE_H = 56;
const GAP = 48; // space between adjacent nodes (for the connector)
const PAD = 24; // viewBox padding around the layout

export const meta = {
  id: 'step-flow',
  name: 'Step flow',
  category: 'Process',
  description: 'Numbered step nodes connected by arrows, laid out horizontally or vertically.',
  paramsSchema: {
    type: 'object',
    properties: {
      orientation: { type: 'string', enum: ['h', 'v'], default: 'h' },
      steps: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            note: { type: 'string' },
          },
          required: ['title'],
        },
        default: [],
      },
    },
  },
  presets: [
    {
      name: 'A proper cuppa',
      params: {
        orientation: 'h',
        steps: [
          { title: 'Boil' },
          { title: 'Steep' },
          { title: 'Pour' },
          { title: 'Sip' },
        ],
      },
    },
    {
      name: 'Plan a trip',
      params: {
        orientation: 'v',
        steps: [
          { title: 'Research', note: 'dates + budget' },
          { title: 'Book', note: 'travel, rooms' },
          { title: 'Pack' },
        ],
      },
    },
  ],
};

// One step node: a numbered rounded rect + title + optional note label.
function stepNode(index, step, x, y) {
  const box = rect({ x, y, w: NODE_W, h: NODE_H, rx: 8, class: 'fig-stroke', width: 2 });
  const num = label(String(index + 1), x + 12, y + 20, { size: 12, fill: 'var(--ink-dim)' });
  const title = label(step.title ?? '', x + NODE_W / 2, y + NODE_H / 2 + 5, {
    anchor: 'middle',
    size: 13,
  });
  const parts = [box, num, title];
  if (step.note != null && step.note !== '') {
    parts.push(label(step.note, x + NODE_W / 2, y + NODE_H + 16, {
      anchor: 'middle',
      size: 11,
      fill: 'var(--ink-dim)',
    }));
  }
  return el('g', {}, parts);
}

export function build(params = {}, opts = { animate: 'draw' }) {
  const { orientation = 'h', steps = [] } = params || {};
  const animate = (opts && opts.animate) || 'draw';
  const horizontal = orientation !== 'v';
  const list = Array.isArray(steps) ? steps : [];
  const n = Math.max(list.length, 1);

  const parts = [];
  // Node positions.
  const pos = [];
  for (let i = 0; i < list.length; i++) {
    const x = horizontal ? PAD + i * (NODE_W + GAP) : PAD;
    const y = horizontal ? PAD : PAD + i * (NODE_H + GAP);
    pos.push([x, y]);
    parts.push(stepNode(i, list[i], x, y));
  }

  // Connectors between consecutive nodes.
  for (let i = 0; i < pos.length - 1; i++) {
    const [x, y] = pos[i];
    if (horizontal) {
      const y1 = y + NODE_H / 2;
      parts.push(arrow({ x1: x + NODE_W, y1, x2: x + NODE_W + GAP, y2: y1, width: 2, class: 'fig-stroke' }));
    } else {
      const x1 = x + NODE_W / 2;
      parts.push(arrow({ x1, y1: y + NODE_H, x2: x1, y2: y + NODE_H + GAP, width: 2, class: 'fig-stroke' }));
    }
  }

  // ViewBox sized to the layout (allow room for vertical notes).
  const noteRoom = list.some((s) => s && s.note) ? 20 : 0;
  const W = horizontal
    ? PAD * 2 + n * NODE_W + (n - 1) * GAP
    : PAD * 2 + NODE_W + 70; // room for the note text to the right side / below
  const H = horizontal
    ? PAD * 2 + NODE_H + noteRoom + 8
    : PAD * 2 + n * NODE_H + (n - 1) * GAP + noteRoom;

  const styleCss = animate === 'draw' ? drawCss('.fig-stroke') : '';
  // sanitise() canonicalises CSS formatting; running it here guarantees the
  // emitted svg is already in its sanitised form (sanitise(svg) === svg).
  const svg = sanitise(svgWrap(parts.join(''), viewBox(W, H), styleCss));
  return { svg, supportsDraw: true, motion: null };
}
