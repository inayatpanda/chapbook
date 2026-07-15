// Figure family: cycle (category 'Process').
// A circular/looping process: step nodes arranged evenly around a ring centred
// in the viewBox, each a small disc with its title outside the ring; consecutive
// steps are joined by curved clockwise arrows, the last closing back to the first.
// NYT line-art: minimal strokes, theme-var colours only, no hex.
// Stroked elements carry class="fig-stroke" so drawCss can animate them.

import {
  el, circle, path, arrow, label, svgWrap, viewBox, drawCss, sanitise,
} from './svg.js';

const VB = 360; // square viewBox
const CX = VB / 2;
const CY = VB / 2;
const RING = 110; // radius of the ring the nodes sit on
const NODE_R = 18; // node disc radius
const LABEL_R = RING + NODE_R + 18; // radius at which titles are placed
const round = (n) => Math.round(n * 100) / 100;

export const meta = {
  id: 'cycle',
  name: 'Cycle',
  category: 'Process',
  description: 'A looping process: step nodes evenly around a ring, joined by curved clockwise arrows that close the loop.',
  paramsSchema: {
    type: 'object',
    properties: {
      steps: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
          },
          required: ['title'],
        },
        default: [],
      },
    },
  },
  presets: [
    {
      name: 'Bone remodelling',
      params: {
        steps: [
          { title: 'Resorption' },
          { title: 'Reversal' },
          { title: 'Formation' },
          { title: 'Mineralisation' },
        ],
      },
    },
  ],
};

// Angle (radians) for node i: start at the top (-90deg) and go clockwise.
function angleAt(i, n) {
  return -Math.PI / 2 + (i / n) * Math.PI * 2;
}

export function build(params = {}, opts = { animate: 'draw' }) {
  const { steps = [] } = params || {};
  const animate = (opts && opts.animate) || 'draw';
  const list = Array.isArray(steps) ? steps.filter(Boolean) : [];
  const n = list.length;

  const parts = [];
  const pos = []; // node centres on the ring

  for (let i = 0; i < n; i++) {
    const a = angleAt(i, n);
    const cx = round(CX + RING * Math.cos(a));
    const cy = round(CY + RING * Math.sin(a));
    pos.push([cx, cy, a]);
  }

  // Curved clockwise connectors between consecutive nodes (i -> i+1, last -> 0).
  // Arc just outside the ring; use a curved path for the shaft and an arrow()
  // for the final short segment so it carries a proper arrowhead.
  if (n >= 2) {
    for (let i = 0; i < n; i++) {
      const a0 = angleAt(i, n);
      const a1 = angleAt(i + 1, n);
      // Start/end points on the ring offset by the node radius along the arc.
      const gap = (NODE_R + 6) / RING; // angular gap so connectors clear the discs
      const s = a0 + gap;
      const e = a1 - gap;
      const sx = round(CX + RING * Math.cos(s));
      const sy = round(CY + RING * Math.sin(s));
      // End the curve just short of the node so arrow() draws the tip into it.
      const ePre = e - 0.04;
      const epx = round(CX + RING * Math.cos(ePre));
      const epy = round(CY + RING * Math.sin(ePre));
      const ex = round(CX + RING * Math.cos(e));
      const ey = round(CY + RING * Math.sin(e));
      // Control point on a slightly larger radius at the mid angle bows the
      // connector outward, giving a clean clockwise arc.
      const am = (s + e) / 2;
      const ctrlR = RING + 26;
      const cpx = round(CX + ctrlR * Math.cos(am));
      const cpy = round(CY + ctrlR * Math.sin(am));
      parts.push(path(`M ${sx} ${sy} Q ${cpx} ${cpy} ${epx} ${epy}`, {
        class: 'fig-stroke', width: 2,
      }));
      // Short arrow() from the curve's end into the node to render the head.
      parts.push(arrow({
        x1: epx, y1: epy, x2: ex, y2: ey, width: 2, size: 9, class: 'fig-stroke',
      }));
    }
  }

  // Nodes + titles on top of the connectors.
  for (let i = 0; i < n; i++) {
    const [cx, cy, a] = pos[i];
    parts.push(circle({
      cx, cy, r: NODE_R, stroke: 'var(--cyan)', width: 2, fill: 'none', class: 'fig-stroke',
    }));
    parts.push(label(String(i + 1), cx, cy + 4, {
      anchor: 'middle', size: 12, fill: 'var(--ink-dim)',
    }));

    // Title placed radially outside the ring; anchor by which side it falls on.
    const lx = round(CX + LABEL_R * Math.cos(a));
    const ly = round(CY + LABEL_R * Math.sin(a));
    const cos = Math.cos(a);
    const anchor = cos > 0.2 ? 'start' : (cos < -0.2 ? 'end' : 'middle');
    parts.push(label(list[i].title ?? '', lx, ly + 4, { anchor, size: 13 }));
  }

  const styleCss = animate === 'draw' ? drawCss('.fig-stroke') : '';
  // sanitise() canonicalises CSS formatting; running it here guarantees the
  // emitted svg is already in its sanitised form (sanitise(svg) === svg).
  const svg = sanitise(svgWrap(parts.join(''), viewBox(VB, VB), styleCss));
  return { svg, supportsDraw: true, motion: null };
}
