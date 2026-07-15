// Stencil catalogue — clean pre-made line-art shapes for the Draw (sketch) canvas.
//
// A stencil is purely DATA: one or more POLYLINES (arrays of [x, y] points) in the
// stencil's own coordinate box (`viewBox: [w, h]`). The Studio Draw canvas drops a
// stencil by scaling + translating those polylines into canvas coords and pushing
// them as ordinary strokes ({ width, points: [{ x, y, pressure }] }) onto the
// current frame — so render/export/undo/mirror all work with NO new data model.
//
// Design: schematic, minimal — a handful of polylines each, not anatomically exact.
// Two categories: 'Generic' (arrows / braces / primitives) and 'Clinical'
// (long bone / joint / vertebra / screw / plate).

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

// ── Clinical stencils (schematic, simple) ───────────────────────────────────
function clinicalStencils() {
  return [
    {
      // Long bone: two parallel shafts joined by rounded ends (top + bottom).
      id: 'long-bone',
      name: 'Long bone',
      category: 'Clinical',
      viewBox: [80, 200],
      strokes: [
        // left shaft + rounded top end curving across to the right shaft
        [
          [26, 28], [26, 172],
          ...arc(40, 176, 14, 16, Math.PI, TAU, 10).slice(1), // bottom rounded end (left→right)
          [54, 28],
          ...arc(40, 24, 14, 16, 0, -Math.PI, 10).slice(1),   // top rounded end (right→left)
        ],
      ],
    },
    {
      // Joint: two opposing condyle curves facing each other across a gap.
      id: 'joint',
      name: 'Joint',
      category: 'Clinical',
      viewBox: [120, 120],
      strokes: [
        // upper bone end: shaft sides + a convex (downward) condyle
        [[40, 8], [40, 40], ...arc(60, 40, 30, 18, Math.PI, TAU, 14).slice(1), [80, 8]],
        // lower bone end: shaft sides + a concave (upward) socket
        [[40, 112], [40, 78], ...arc(60, 78, 30, 16, Math.PI, 0, 14).slice(1), [80, 112]],
      ],
    },
    {
      // Vertebra: rounded body + a posterior arch with spinous + transverse spikes.
      id: 'vertebra',
      name: 'Vertebra',
      category: 'Clinical',
      viewBox: [120, 100],
      strokes: [
        ring([[24, 18], [96, 18], [100, 50], [96, 70], [24, 70], [20, 50]]), // body (rounded box)
        arc(60, 78, 26, 16, Math.PI, TAU, 16),                               // posterior arch (down)
        [[60, 90], [60, 96]],                                                // spinous process
        [[34, 78], [16, 84]],                                                // left transverse
        [[86, 78], [104, 84]],                                               // right transverse
      ],
    },
    {
      // Screw: round head, straight shaft, a few angled thread ticks.
      id: 'screw',
      name: 'Screw',
      category: 'Clinical',
      viewBox: [60, 160],
      strokes: [
        ring([[14, 8], [46, 8], [40, 24], [20, 24]]),  // head (trapezoid)
        [[26, 24], [26, 132], [30, 144], [34, 132], [34, 24]], // shaft → pointed tip
        [[26, 44], [34, 38]],    // thread ticks
        [[26, 62], [34, 56]],
        [[26, 80], [34, 74]],
        [[26, 98], [34, 92]],
        [[26, 116], [34, 110]],
      ],
    },
    {
      // Plate: rounded bar with 4 screw holes (small rings) along it.
      id: 'plate',
      name: 'Plate',
      category: 'Clinical',
      viewBox: [200, 50],
      strokes: [
        ring([
          ...arc(20, 25, 16, 18, Math.PI / 2, (3 * Math.PI) / 2, 8), // rounded left end
          [180, 7],
          ...arc(180, 25, 16, 18, -Math.PI / 2, Math.PI / 2, 8),     // rounded right end
          [20, 43],
        ]),
        arc(40, 25, 7, 7, 0, TAU, 12),   // hole 1
        arc(80, 25, 7, 7, 0, TAU, 12),   // hole 2
        arc(120, 25, 7, 7, 0, TAU, 12),  // hole 3
        arc(160, 25, 7, 7, 0, TAU, 12),  // hole 4
      ],
    },
  ];
}

// The full ordered catalogue (Generic first, then Clinical).
export function listStencils() {
  return [...genericStencils(), ...clinicalStencils()];
}
