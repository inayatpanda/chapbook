// Figure family: flow-decision (category 'Process').
// A static algorithm / flowchart: action boxes (rounded rects), decision diamonds,
// start/end pills, connected by labelled arrows. Auto-layout top->down: each node's
// row is its BFS distance from the start node; same-row nodes spread across columns.
// NYT line-art: minimal strokes, theme-var colours only, no hex.
// Stroked elements carry class="fig-stroke" so drawCss can animate them.

import {
  el, rect, path, poly, arrow, label, svgWrap, viewBox, drawCss, sanitise,
} from './svg.js';

const NODE_W = 120;
const NODE_H = 50;
const COL_GAP = 40; // horizontal gap between columns
const ROW_GAP = 60; // vertical gap between rows
const PAD = 24; // viewBox padding
const round = (n) => Math.round(n * 100) / 100;

export const meta = {
  id: 'flow-decision',
  name: 'Flow / decision',
  category: 'Process',
  description: 'A static algorithm flowchart: action boxes, decision diamonds and start/end pills, auto-laid out top to bottom with labelled branches.',
  paramsSchema: {
    type: 'object',
    properties: {
      nodes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            text: { type: 'string' },
            kind: { type: 'string', enum: ['start', 'action', 'decision', 'end'], default: 'action' },
          },
          required: ['id', 'text'],
        },
        default: [],
      },
      edges: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            from: { type: 'string' },
            to: { type: 'string' },
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
      name: 'Fracture algorithm',
      params: {
        nodes: [
          { id: 'a', text: 'Fracture', kind: 'start' },
          { id: 'b', text: 'Displaced?', kind: 'decision' },
          { id: 'c', text: 'Reduce', kind: 'action' },
          { id: 'd', text: 'Immobilise', kind: 'action' },
          { id: 'e', text: 'Review', kind: 'end' },
        ],
        edges: [
          { from: 'a', to: 'b' },
          { from: 'b', to: 'c', label: 'yes' },
          { from: 'b', to: 'd', label: 'no' },
          { from: 'c', to: 'e' },
          { from: 'd', to: 'e' },
        ],
      },
    },
  ],
};

// Assign each node a row = BFS distance from the start node (or first node).
function assignRows(nodes, edges) {
  const byId = new Map(nodes.map((nd) => [nd.id, nd]));
  const adj = new Map(nodes.map((nd) => [nd.id, []]));
  for (const e of edges) {
    if (adj.has(e.from)) adj.get(e.from).push(e.to);
  }
  const start = nodes.find((nd) => nd.kind === 'start') || nodes[0];
  const row = new Map();
  if (start) {
    const queue = [[start.id, 0]];
    row.set(start.id, 0);
    while (queue.length) {
      const [id, d] = queue.shift();
      for (const to of (adj.get(id) || [])) {
        if (!byId.has(to)) continue;
        if (!row.has(to)) { row.set(to, d + 1); queue.push([to, d + 1]); }
      }
    }
  }
  // Any node unreachable from start: append to the row after the deepest.
  let maxRow = 0;
  for (const r of row.values()) maxRow = Math.max(maxRow, r);
  for (const nd of nodes) {
    if (!row.has(nd.id)) { maxRow += 1; row.set(nd.id, maxRow); }
  }
  return row;
}

// Centre (cx,cy) of a node given its row and its index within that row.
function nodeCentre(rowIdx, colIdx, colCount) {
  const totalW = colCount * NODE_W + (colCount - 1) * COL_GAP;
  const x0 = PAD + (totalW > 0 ? 0 : 0);
  const cx = x0 + colIdx * (NODE_W + COL_GAP) + NODE_W / 2;
  const cy = PAD + rowIdx * (NODE_H + ROW_GAP) + NODE_H / 2;
  return [cx, cy];
}

// Draw a node shape by kind, centred at (cx,cy). Returns the markup.
function nodeShape(node, cx, cy) {
  const x = cx - NODE_W / 2;
  const y = cy - NODE_H / 2;
  const kind = node.kind || 'action';
  const parts = [];
  if (kind === 'decision') {
    // Diamond: four points around the centre.
    const pts = [
      [round(cx), round(y)],
      [round(x + NODE_W), round(cy)],
      [round(cx), round(y + NODE_H)],
      [round(x), round(cy)],
      [round(cx), round(y)],
    ];
    parts.push(poly(pts, { class: 'fig-stroke', width: 2 }));
  } else if (kind === 'start' || kind === 'end') {
    // Pill: fully rounded rectangle.
    parts.push(rect({
      x: round(x), y: round(y), w: NODE_W, h: NODE_H, rx: NODE_H / 2, class: 'fig-stroke', width: 2,
    }));
  } else {
    // Action: rounded rectangle.
    parts.push(rect({
      x: round(x), y: round(y), w: NODE_W, h: NODE_H, rx: 8, class: 'fig-stroke', width: 2,
    }));
  }
  parts.push(label(node.text ?? '', round(cx), round(cy + 4), { anchor: 'middle', size: 12 }));
  return el('g', {}, parts);
}

// Edge endpoint on the boundary of a node, picking the side that faces `dir`.
// dir is 'down' (exit/enter vertically) which suits a top->down layout.
function exitPoint(cx, cy) { return [cx, cy + NODE_H / 2]; }
function entryPoint(cx, cy) { return [cx, cy - NODE_H / 2]; }

export function build(params = {}, opts = { animate: 'draw' }) {
  const { nodes = [], edges = [] } = params || {};
  const animate = (opts && opts.animate) || 'draw';
  const nodeList = Array.isArray(nodes) ? nodes.filter((n) => n && n.id != null) : [];
  const edgeList = Array.isArray(edges) ? edges.filter(Boolean) : [];

  const rowOf = assignRows(nodeList, edgeList);

  // Group nodes by row, preserving declaration order within a row.
  const rows = new Map();
  for (const nd of nodeList) {
    const r = rowOf.get(nd.id);
    if (!rows.has(r)) rows.set(r, []);
    rows.get(r).push(nd);
  }
  const rowKeys = [...rows.keys()].sort((a, b) => a - b);
  const maxCols = Math.max(1, ...rowKeys.map((r) => rows.get(r).length));

  // Compute centres. Centre each row's columns within the widest row.
  const centre = new Map(); // id -> [cx, cy]
  rowKeys.forEach((r, rowIdx) => {
    const group = rows.get(r);
    const colCount = group.length;
    // Offset so a short row is centred relative to the widest row.
    const rowW = colCount * NODE_W + (colCount - 1) * COL_GAP;
    const fullW = maxCols * NODE_W + (maxCols - 1) * COL_GAP;
    const offset = (fullW - rowW) / 2;
    group.forEach((nd, colIdx) => {
      const [cx0, cy] = nodeCentre(rowIdx, colIdx, colCount);
      centre.set(nd.id, [round(cx0 + offset), round(cy)]);
    });
  });

  const parts = [];

  // Edges first (so node shapes sit on top of arrow shafts).
  for (const e of edgeList) {
    const a = centre.get(e.from);
    const b = centre.get(e.to);
    if (!a || !b) continue;
    const [, ay] = a;
    const [, by] = b;
    // If target is below, exit bottom -> enter top; otherwise connect centres
    // vertically with a small offset so same/upward edges still render.
    let p1; let p2;
    if (by >= ay) {
      p1 = exitPoint(a[0], a[1]);
      p2 = entryPoint(b[0], b[1]);
    } else {
      p1 = entryPoint(a[0], a[1]);
      p2 = exitPoint(b[0], b[1]);
    }
    parts.push(arrow({
      x1: round(p1[0]), y1: round(p1[1]), x2: round(p2[0]), y2: round(p2[1]),
      label: e.label, width: 2, class: 'fig-stroke',
    }));
  }

  // Node shapes + text.
  for (const nd of nodeList) {
    const c = centre.get(nd.id);
    if (!c) continue;
    parts.push(nodeShape(nd, c[0], c[1]));
  }

  // ViewBox sized to rows x cols.
  const fullW = maxCols * NODE_W + (maxCols - 1) * COL_GAP;
  const W = PAD * 2 + fullW;
  const H = PAD * 2 + rowKeys.length * NODE_H + Math.max(0, rowKeys.length - 1) * ROW_GAP;

  const styleCss = animate === 'draw' ? drawCss('.fig-stroke') : '';
  // sanitise() canonicalises CSS formatting; running it here guarantees the
  // emitted svg is already in its sanitised form (sanitise(svg) === svg).
  const svg = sanitise(svgWrap(parts.join(''), viewBox(round(W), round(H)), styleCss));
  return { svg, supportsDraw: true, motion: null };
}
