// Figure family: hierarchy (category 'Relate').
// A top-down tree / taxonomy. Auto-layout: depth -> y row; leaves spread evenly
// across x; each parent centred over its children. Nodes are small rounded rects
// with the label; parent->child connected by thin lines.
// NYT line-art: minimal strokes, theme-var colours only, no hex.
// Stroked elements carry class="fig-stroke" so drawCss can animate them.

import {
  el, rect, line, label, svgWrap, viewBox, drawCss, sanitise,
} from './svg.js';

const NODE_W = 110;
const NODE_H = 40;
const COL_GAP = 28; // horizontal gap between adjacent leaf slots
const ROW_GAP = 56; // vertical gap between depth rows
const PAD = 24; // viewBox padding
const SLOT = NODE_W + COL_GAP; // horizontal pitch of one leaf slot
const round = (n) => Math.round(n * 100) / 100;

export const meta = {
  id: 'hierarchy',
  name: 'Hierarchy',
  category: 'Relate',
  description: 'A top-down tree / taxonomy: nodes auto-laid out by depth, parents centred over their children.',
  paramsSchema: {
    type: 'object',
    properties: {
      root: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          children: { type: 'array' }, // recursive: each item is the same node shape
        },
        required: ['label'],
      },
    },
  },
  presets: [
    {
      name: 'Instrument families',
      params: {
        root: {
          label: 'Instruments',
          children: [
            { label: 'Percussion' },
            {
              label: 'Strings',
              children: [
                { label: 'Plucked' },
                { label: 'Bowed' },
              ],
            },
          ],
        },
      },
    },
  ],
};

// First pass: assign each node an x (in leaf-slot units) and a depth.
// Leaves take the next slot; parents are centred over their children.
function layout(node, depth, state) {
  if (!node || typeof node !== 'object') return null;
  const kids = Array.isArray(node.children) ? node.children.filter(Boolean) : [];
  const placed = { label: node.label ?? '', depth, children: [] };
  if (kids.length === 0) {
    placed.slot = state.next;
    state.next += 1;
  } else {
    for (const k of kids) {
      const child = layout(k, depth + 1, state);
      if (child) placed.children.push(child);
    }
    if (placed.children.length === 0) {
      placed.slot = state.next;
      state.next += 1;
    } else {
      const first = placed.children[0].slot;
      const last = placed.children[placed.children.length - 1].slot;
      placed.slot = (first + last) / 2;
    }
  }
  state.maxDepth = Math.max(state.maxDepth, depth);
  return placed;
}

// Pixel centre of a placed node.
function centre(node) {
  const cx = PAD + node.slot * SLOT + NODE_W / 2;
  const cy = PAD + node.depth * (NODE_H + ROW_GAP) + NODE_H / 2;
  return [cx, cy];
}

// Emit connectors (parent->child) and node boxes, depth-first.
function emit(node, parts) {
  const [cx, cy] = centre(node);
  // Connectors to children (drawn first so boxes sit on top).
  for (const child of node.children) {
    const [kx, ky] = centre(child);
    parts.push(line({
      x1: round(cx), y1: round(cy + NODE_H / 2), x2: round(kx), y2: round(ky - NODE_H / 2),
      stroke: 'var(--ink-dim)', width: 1,
    }));
  }
  for (const child of node.children) emit(child, parts);
}

// Emit node boxes after connectors so they are not crossed by lines.
function emitNodes(node, parts) {
  const [cx, cy] = centre(node);
  const x = cx - NODE_W / 2;
  const y = cy - NODE_H / 2;
  parts.push(el('g', {}, [
    rect({ x: round(x), y: round(y), w: NODE_W, h: NODE_H, rx: 8, class: 'fig-stroke', width: 2 }),
    label(node.label ?? '', round(cx), round(cy + 4), { anchor: 'middle', size: 12 }),
  ]));
  for (const child of node.children) emitNodes(child, parts);
}

export function build(params = {}, opts = { animate: 'draw' }) {
  const { root } = params || {};
  const animate = (opts && opts.animate) || 'draw';

  const state = { next: 0, maxDepth: 0 };
  const tree = layout(root || { label: '' }, 0, state);
  const leafCount = Math.max(state.next, 1);

  const parts = [];
  if (tree) {
    emit(tree, parts); // connectors
    emitNodes(tree, parts); // boxes on top
  }

  // ViewBox sized to tree width x depth.
  const W = PAD * 2 + leafCount * SLOT - COL_GAP;
  const H = PAD * 2 + (state.maxDepth + 1) * NODE_H + state.maxDepth * ROW_GAP;

  const styleCss = animate === 'draw' ? drawCss('.fig-stroke') : '';
  // sanitise() canonicalises CSS formatting; running it here guarantees the
  // emitted svg is already in its sanitised form (sanitise(svg) === svg).
  const svg = sanitise(svgWrap(parts.join(''), viewBox(round(W), round(H)), styleCss));
  return { svg, supportsDraw: true, motion: null };
}
