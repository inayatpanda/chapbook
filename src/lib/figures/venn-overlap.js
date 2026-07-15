// Figure family: venn-overlap (category 'Relate').
// 2 or 3 overlapping circles (stroke only, line-art, no opaque fills); each circle
// in a different accent (teal/cyan/violet). Set labels sit outside each circle;
// optional overlap labels are placed in the intersection regions.
// NYT line-art: minimal strokes, theme-var colours only, no hex.
// Stroked elements carry class="fig-stroke" so drawCss can animate them.

import {
  circle, label, svgWrap, viewBox, drawCss, sanitise,
} from './svg.js';

const VB_W = 420;
const VB_H = 340;
const R = 95; // circle radius
const round = (n) => Math.round(n * 100) / 100;

const ACCENTS = ['var(--teal)', 'var(--cyan)', 'var(--violet)'];

export const meta = {
  id: 'venn-overlap',
  name: 'Venn overlap',
  category: 'Relate',
  description: 'Two or three overlapping circles (line-art) with set labels outside and optional labels in the overlap regions.',
  paramsSchema: {
    type: 'object',
    properties: {
      sets: {
        type: 'array',
        items: {
          type: 'object',
          properties: { label: { type: 'string' } },
          required: ['label'],
        },
        default: [],
      },
      overlaps: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            between: { type: 'array', items: { type: 'number' } },
            label: { type: 'string' },
          },
          required: ['between', 'label'],
        },
        default: [],
      },
    },
  },
  presets: [
    {
      name: 'A day at the beach',
      params: {
        sets: [{ label: 'Sun' }, { label: 'Sea' }, { label: 'Sand' }],
        overlaps: [
          { between: [0, 1], label: 'a swim' },
          { between: [0, 1, 2], label: 'the beach' },
        ],
      },
    },
  ],
};

// Circle centres for a 2- or 3-set venn within the viewBox.
function centres(n) {
  const cx = VB_W / 2;
  if (n <= 2) {
    const cy = VB_H / 2;
    const dx = R * 0.62; // overlap horizontally
    return [[cx - dx, cy], [cx + dx, cy]];
  }
  // 3 sets: two on top, one below, in a triangle.
  const topY = VB_H / 2 - R * 0.42;
  const botY = VB_H / 2 + R * 0.72;
  const dx = R * 0.62;
  return [[cx - dx, topY], [cx + dx, topY], [cx, botY]];
}

// Outward label position for a circle, pushed away from the venn centre.
function outwardLabel(c, vennCx, vennCy) {
  const [x, y] = c;
  const vx = x - vennCx;
  const vy = y - vennCy;
  const len = Math.hypot(vx, vy) || 1;
  const off = R + 22;
  return [round(x + (vx / len) * off), round(y + (vy / len) * off)];
}

export function build(params = {}, opts = { animate: 'draw' }) {
  const { sets = [], overlaps = [] } = params || {};
  const animate = (opts && opts.animate) || 'draw';
  let setList = Array.isArray(sets) ? sets.filter(Boolean) : [];
  // Clamp to a supported 2- or 3-set venn.
  if (setList.length < 2) setList = setList.concat(Array(2 - setList.length).fill({ label: '' }));
  if (setList.length > 3) setList = setList.slice(0, 3);
  const n = setList.length;
  const ov = Array.isArray(overlaps) ? overlaps.filter(Boolean) : [];

  const cs = centres(n);
  const vennCx = cs.reduce((a, c) => a + c[0], 0) / n;
  const vennCy = cs.reduce((a, c) => a + c[1], 0) / n;

  const parts = [];

  // Circles (stroke only, distinct accents).
  for (let i = 0; i < n; i++) {
    parts.push(circle({
      cx: round(cs[i][0]), cy: round(cs[i][1]), r: R,
      stroke: ACCENTS[i % ACCENTS.length], width: 2, fill: 'none', class: 'fig-stroke',
    }));
  }

  // Set labels outside each circle.
  for (let i = 0; i < n; i++) {
    const [lx, ly] = outwardLabel(cs[i], vennCx, vennCy);
    parts.push(label(setList[i].label ?? '', lx, round(ly + 4), { anchor: 'middle', size: 13 }));
  }

  // Overlap labels: only render those we can position sensibly.
  // Pairwise -> midpoint of the two circle centres. All-three -> the venn centre.
  for (const o of ov) {
    const between = Array.isArray(o.between) ? o.between.filter((k) => k >= 0 && k < n) : [];
    if (o.label == null || o.label === '') continue;
    if (between.length === 2) {
      const [a, b] = between;
      const mx = round((cs[a][0] + cs[b][0]) / 2);
      const my = round((cs[a][1] + cs[b][1]) / 2);
      parts.push(label(o.label, mx, my + 4, { anchor: 'middle', size: 12, fill: 'var(--ink-dim)' }));
    } else if (between.length === 3 && n === 3) {
      parts.push(label(o.label, round(vennCx), round(vennCy + 4), {
        anchor: 'middle', size: 12, fill: 'var(--ink-dim)',
      }));
    }
    // Other arities (e.g. a single index, or all-three on a 2-set venn) are skipped.
  }

  const styleCss = animate === 'draw' ? drawCss('.fig-stroke') : '';
  // sanitise() canonicalises CSS formatting; running it here guarantees the
  // emitted svg is already in its sanitised form (sanitise(svg) === svg).
  const svg = sanitise(svgWrap(parts.join(''), viewBox(VB_W, VB_H), styleCss));
  return { svg, supportsDraw: true, motion: null };
}
