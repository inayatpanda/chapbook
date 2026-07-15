// Stencil catalogue — clean pre-made line-art shapes for the Draw (sketch) canvas.
//
// A stencil is purely DATA: one or more POLYLINES (arrays of [x, y] points) in the
// stencil's own coordinate box (`viewBox: [w, h]`). The Studio Draw canvas drops a
// stencil by scaling + translating those polylines into canvas coords and pushing
// them as ordinary strokes ({ width, points: [{ x, y, pressure }] }) onto the
// current frame — so render/export/undo/mirror all work with NO new data model.
//
// Design: schematic, minimal — a handful of polylines each, not fussy.
// Two categories: 'Generic' (arrows / braces / primitives) and 'Symbols'
// (star / heart / sun / speech bubble / lightning bolt).

const round = (n) => Math.round(n * 100) / 100;

// Build a closed polygon ring (first point repeated at the end) so it draws as one stroke.
function ring(points) {
  const pts = points.map(([x, y]) => [round(x), round(y)]);
  if (pts.length) pts.push([pts[0][0], pts[0][1]]);
  return pts;
}

// Sample an ellipse arc (a..b radians) into a polyline of `n` segments, centred (cx,cy).
function arc(cx, cy, rx, ry, a0, a1, n = 18) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = a0 + ((a1 - a0) * i) / n;
    out.push([round(cx + rx * Math.cos(t)), round(cy + ry * Math.sin(t))]);
  }
  return out;
}

const TAU = Math.PI * 2;

// Sample an N-point star into a closed polyline: outer/inner radii alternate around
// the centre, starting at the top (-90deg).
function star(cx, cy, rOuter, rInner, points = 5, rot = -Math.PI / 2) {
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = rot + (i * Math.PI) / points;
    pts.push([round(cx + r * Math.cos(a)), round(cy + r * Math.sin(a))]);
  }
  if (pts.length) pts.push([pts[0][0], pts[0][1]]);
  return pts;
}

// ── Generic stencils ───────────────────────────────────────────────────────
function genericStencils() {
  return [
    {
      id: 'arrow',
      name: 'Arrow',
      category: 'Generic',
      viewBox: [120, 60],
      strokes: [
        [[6, 30], [114, 30]],            // shaft
        [[92, 12], [114, 30], [92, 48]], // head
      ],
    },
    {
      id: 'double-arrow',
      name: 'Double arrow',
      category: 'Generic',
      viewBox: [120, 60],
      strokes: [
        [[6, 30], [114, 30]],            // shaft
        [[28, 12], [6, 30], [28, 48]],   // left head
        [[92, 12], [114, 30], [92, 48]], // right head
      ],
    },
    {
      id: 'line',
      name: 'Line',
      category: 'Generic',
      viewBox: [120, 20],
      strokes: [
        [[6, 10], [114, 10]],
      ],
    },
    {
      id: 'circle',
      name: 'Circle',
      category: 'Generic',
      viewBox: [100, 100],
      strokes: [
        arc(50, 50, 44, 44, 0, TAU, 36),
      ],
    },
    {
      id: 'square',
      name: 'Square',
      category: 'Generic',
      viewBox: [100, 100],
      strokes: [
        ring([[8, 8], [92, 8], [92, 92], [8, 92]]),
      ],
    },
    {
      id: 'brace',
      name: 'Curly brace',
      category: 'Generic',
      viewBox: [40, 120],
      strokes: [
        // a single { polyline: top curl → mid pinch → bottom curl
        [[32, 6], [18, 12], [18, 52], [6, 60], [18, 68], [18, 108], [32, 114]],
      ],
    },
    {
      id: 'bracket',
      name: 'Bracket',
      category: 'Generic',
      viewBox: [40, 120],
      strokes: [
        [[30, 6], [10, 6], [10, 114], [30, 114]],
      ],
    },
    {
      id: 'plus-cross',
      name: 'Plus / cross',
      category: 'Generic',
      viewBox: [80, 80],
      strokes: [
        [[40, 8], [40, 72]],  // vertical
        [[8, 40], [72, 40]],  // horizontal
      ],
    },
  ];
}

// ── Symbol stencils (schematic, simple) ─────────────────────────────────────
function symbolStencils() {
  // Sun rays: eight short spokes around the disc.
  const rays = [];
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    rays.push([
      [round(50 + 28 * Math.cos(a)), round(50 + 28 * Math.sin(a))],
      [round(50 + 44 * Math.cos(a)), round(50 + 44 * Math.sin(a))],
    ]);
  }
  return [
    {
      // Star: a classic 5-point star drawn as one closed polyline.
      id: 'star',
      name: 'Star',
      category: 'Symbols',
      viewBox: [100, 100],
      strokes: [
        star(50, 50, 46, 18, 5),
      ],
    },
    {
      // Heart: bottom point, up the sides, two bumps over the top.
      id: 'heart',
      name: 'Heart',
      category: 'Symbols',
      viewBox: [100, 92],
      strokes: [
        [
          [50, 84], [12, 44],
          ...arc(31, 44, 19, 19, Math.PI, TAU, 12).slice(1), // left bump (up and over)
          ...arc(69, 44, 19, 19, Math.PI, TAU, 12).slice(1), // right bump (up and over)
          [50, 84],
        ],
      ],
    },
    {
      // Sun: a small disc with eight radiating spokes.
      id: 'sun',
      name: 'Sun',
      category: 'Symbols',
      viewBox: [100, 100],
      strokes: [
        arc(50, 50, 20, 20, 0, TAU, 24), // disc
        ...rays,
      ],
    },
    {
      // Speech bubble: a rounded rectangle with a small tail off the bottom-left.
      id: 'speech-bubble',
      name: 'Speech bubble',
      category: 'Symbols',
      viewBox: [120, 90],
      strokes: [
        ring([[10, 8], [110, 8], [110, 58], [46, 58], [30, 80], [38, 58], [10, 58]]),
      ],
    },
    {
      // Lightning bolt: a single jagged closed zig-zag.
      id: 'bolt',
      name: 'Lightning bolt',
      category: 'Symbols',
      viewBox: [60, 120],
      strokes: [
        ring([[34, 6], [12, 64], [28, 64], [20, 114], [50, 50], [34, 50]]),
      ],
    },
  ];
}

// The full ordered catalogue (Generic first, then Symbols).
export function listStencils() {
  return [...genericStencils(), ...symbolStencils()];
}
