// Figure family: labelled-diagram (category 'Structure').
// A base shape centred in the viewBox with leader-connected text labels.
// NYT line-art: minimal strokes, theme-var colours only, no hex.
// Stroked elements carry class="fig-stroke" so drawCss can animate them.

import {
  el, path, circle, rect, label, leader, svgWrap, viewBox, drawCss, sanitise,
} from './svg.js';

const VB_W = 400;
const VB_H = 300;
const CX = VB_W / 2;
const CY = VB_H / 2;

export const meta = {
  id: 'labelled-diagram',
  name: 'Labelled diagram',
  category: 'Structure',
  description: 'A central shape with leader-connected text labels pointing to anchor points.',
  paramsSchema: {
    type: 'object',
    properties: {
      shape: { type: 'string', enum: ['blob', 'rect', 'circle'], default: 'blob' },
      labels: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            text: { type: 'string' },
            anchor: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 },
          },
          required: ['text', 'anchor'],
        },
        default: [],
      },
    },
  },
  presets: [
    {
      name: 'Apex & base',
      params: {
        shape: 'blob',
        labels: [
          { text: 'apex', anchor: [200, 90] },
          { text: 'base', anchor: [200, 230] },
        ],
      },
    },
    {
      name: 'Quadrants',
      params: {
        shape: 'circle',
        labels: [
          { text: 'superior', anchor: [200, 95] },
          { text: 'inferior', anchor: [200, 205] },
          { text: 'medial', anchor: [130, 150] },
          { text: 'lateral', anchor: [270, 150] },
        ],
      },
    },
  ],
};

// The central shape, stroked with the default ink and tagged fig-stroke.
function baseShape(shape) {
  const stroke = { class: 'fig-stroke', width: 2 };
  if (shape === 'rect') {
    return rect({ x: CX - 90, y: CY - 60, w: 180, h: 120, rx: 10, ...stroke });
  }
  if (shape === 'circle') {
    return circle({ cx: CX, cy: CY, r: 75, ...stroke });
  }
  // 'blob' (default): a clean closed organic path centred on the viewBox.
  const d = [
    `M ${CX} ${CY - 78}`,
    `C ${CX + 70} ${CY - 78} ${CX + 96} ${CY - 24} ${CX + 78} ${CY + 18}`,
    `C ${CX + 60} ${CY + 60} ${CX + 24} ${CY + 80} ${CX - 18} ${CY + 74}`,
    `C ${CX - 72} ${CY + 66} ${CX - 96} ${CY + 18} ${CX - 84} ${CY - 24}`,
    `C ${CX - 74} ${CY - 60} ${CX - 40} ${CY - 78} ${CX} ${CY - 78}`,
    'Z',
  ].join(' ');
  return path(d, { class: 'fig-stroke', width: 2 });
}

// Place a label outside the shape near its anchor, plus a leader to the anchor.
// Labels left of centre anchor to the right (end), right of centre to the left (start).
function labelledAnchor(text, anchor) {
  const [ax, ay] = anchor;
  const onRight = ax >= CX;
  const lx = onRight ? Math.min(ax + 60, VB_W - 8) : Math.max(ax - 60, 8);
  const ly = ay;
  const txt = label(text, lx, ly + 4, {
    anchor: onRight ? 'start' : 'end',
    size: 13,
  });
  const lead = leader([lx + (onRight ? -6 : 6), ly], [ax, ay]);
  return el('g', {}, [lead, txt]);
}

export function build(params = {}, opts = { animate: 'draw' }) {
  const { shape = 'blob', labels = [] } = params || {};
  const animate = (opts && opts.animate) || 'draw';

  const parts = [baseShape(shape)];
  for (const l of labels) {
    if (!l) continue;
    const anchor = Array.isArray(l.anchor) ? l.anchor : [CX, CY];
    parts.push(labelledAnchor(l.text ?? '', anchor));
  }

  const styleCss = animate === 'draw' ? drawCss('.fig-stroke') : '';
  // sanitise() canonicalises CSS formatting; running it here guarantees the
  // emitted svg is already in its sanitised form (sanitise(svg) === svg).
  const svg = sanitise(svgWrap(parts.join(''), viewBox(VB_W, VB_H), styleCss));
  return { svg, supportsDraw: true, motion: null };
}
