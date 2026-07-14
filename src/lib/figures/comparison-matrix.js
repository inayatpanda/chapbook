// Figure family: comparison-matrix (category 'Compare').
// A designed comparison grid: a top header row of `cols`, a left column of row
// labels, and each cell rendered as a tick (yes), a cross (no), or centred text.
// Thin grid lines (var(--ink-dim)).
// NYT line-art: minimal strokes, theme-var colours only, no hex.
// Stroked elements carry class="fig-stroke" so drawCss can animate them.

import {
  el, line, path, label, svgWrap, viewBox, drawCss, sanitise,
} from './svg.js';

const CELL_W = 110; // width of a value column (and the header/label column)
const CELL_H = 48; // height of a row
const PAD = 24; // viewBox padding
const round = (n) => Math.round(n * 100) / 100;

export const meta = {
  id: 'comparison-matrix',
  name: 'Comparison matrix',
  category: 'Compare',
  description: 'A comparison grid: header columns, row labels, and cells rendered as ticks, crosses or text.',
  paramsSchema: {
    type: 'object',
    properties: {
      cols: {
        type: 'array',
        items: { type: 'string' },
        default: [],
      },
      rows: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            label: { type: 'string' },
            cells: { type: 'array', items: { type: 'string' } },
          },
          required: ['label'],
        },
        default: [],
      },
    },
  },
  presets: [
    {
      name: 'Plate vs cast',
      params: {
        cols: ['Strength', 'Speed', 'Cost'],
        rows: [
          { label: 'Plate', cells: ['yes', 'no', 'no'] },
          { label: 'Cast', cells: ['no', 'yes', 'yes'] },
        ],
      },
    },
  ],
};

// A tick mark (check path) centred in a cell, drawn in var(--teal).
function tick(cx, cy) {
  const d = `M ${round(cx - 8)} ${round(cy)} L ${round(cx - 2)} ${round(cy + 7)} L ${round(cx + 9)} ${round(cy - 8)}`;
  return path(d, { stroke: 'var(--teal)', width: 2, class: 'fig-stroke' });
}

// A cross (two strokes) centred in a cell, drawn in var(--ink-dim).
function cross(cx, cy) {
  const s = 7;
  return el('g', {}, [
    line({
      x1: round(cx - s), y1: round(cy - s), x2: round(cx + s), y2: round(cy + s),
      stroke: 'var(--ink-dim)', width: 2, class: 'fig-stroke',
    }),
    line({
      x1: round(cx - s), y1: round(cy + s), x2: round(cx + s), y2: round(cy - s),
      stroke: 'var(--ink-dim)', width: 2, class: 'fig-stroke',
    }),
  ]);
}

export function build(params = {}, opts = { animate: 'draw' }) {
  const { cols = [], rows = [] } = params || {};
  const animate = (opts && opts.animate) || 'draw';
  const colList = Array.isArray(cols) ? cols : [];
  const rowList = Array.isArray(rows) ? rows.filter(Boolean) : [];

  const nCols = colList.length + 1; // +1 for the left label column
  const nRows = rowList.length + 1; // +1 for the top header row
  const gridW = nCols * CELL_W;
  const gridH = nRows * CELL_H;
  const ox = PAD;
  const oy = PAD;

  const parts = [];

  // Thin grid lines (var(--ink-dim)).
  for (let r = 0; r <= nRows; r++) {
    const y = oy + r * CELL_H;
    parts.push(line({
      x1: ox, y1: y, x2: ox + gridW, y2: y, stroke: 'var(--ink-dim)', width: 1,
    }));
  }
  for (let c = 0; c <= nCols; c++) {
    const x = ox + c * CELL_W;
    parts.push(line({
      x1: x, y1: oy, x2: x, y2: oy + gridH, stroke: 'var(--ink-dim)', width: 1,
    }));
  }

  // Header row: column labels (skip the empty top-left corner cell).
  for (let c = 0; c < colList.length; c++) {
    const cx = ox + (c + 1) * CELL_W + CELL_W / 2;
    const cy = oy + CELL_H / 2 + 4;
    parts.push(label(colList[c] ?? '', round(cx), round(cy), { anchor: 'middle', size: 12 }));
  }

  // Body rows: left label + each cell.
  for (let r = 0; r < rowList.length; r++) {
    const row = rowList[r];
    const ry = oy + (r + 1) * CELL_H;
    // Row label in the left column.
    parts.push(label(row.label ?? '', round(ox + CELL_W / 2), round(ry + CELL_H / 2 + 4), {
      anchor: 'middle', size: 12,
    }));
    const cells = Array.isArray(row.cells) ? row.cells : [];
    for (let c = 0; c < colList.length; c++) {
      const cell = cells[c];
      const cx = ox + (c + 1) * CELL_W + CELL_W / 2;
      const cy = ry + CELL_H / 2;
      if (cell === 'yes') {
        parts.push(tick(cx, cy));
      } else if (cell === 'no') {
        parts.push(cross(cx, cy));
      } else if (cell != null && cell !== '') {
        parts.push(label(String(cell), round(cx), round(cy + 4), { anchor: 'middle', size: 12 }));
      }
    }
  }

  // ViewBox sized to (cols+1) x (rows+1).
  const W = PAD * 2 + gridW;
  const H = PAD * 2 + gridH;

  const styleCss = animate === 'draw' ? drawCss('.fig-stroke') : '';
  // sanitise() canonicalises CSS formatting; running it here guarantees the
  // emitted svg is already in its sanitised form (sanitise(svg) === svg).
  const svg = sanitise(svgWrap(parts.join(''), viewBox(W, H), styleCss));
  return { svg, supportsDraw: true, motion: null };
}
