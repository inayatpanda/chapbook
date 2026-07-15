// Figure family: annotation-arrows (category 'Direction').
// Arrows / vectors drawn over a base region — works standalone AND as an
// overlay on a base image of the same aspect (route 2). The svg sizes to the
// given viewBox so it composites cleanly over an image.
// kinds: 'force' (bold solid), 'motion' (curved dashed), 'highlight' (thin + dot).
// NYT line-art: minimal strokes, theme-var colours only, no hex.
// Stroked elements carry class="fig-stroke" so drawCss can animate them.

import {
  el, line, poly, path, circle, label, panel, svgWrap, viewBox, drawCss, sanitise,
} from './svg.js';

const round = (n) => Math.round(n * 100) / 100;

export const meta = {
  id: 'annotation-arrows',
  name: 'Annotation arrows',
  category: 'Direction',
  description: 'Force / motion / highlight arrows over a base region; sizes to a viewBox so it can overlay an image.',
  paramsSchema: {
    type: 'object',
    properties: {
      viewBox: {
        type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2, default: [400, 300],
      },
      frame: { type: 'boolean', default: false },
      arrows: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            from: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 },
            to: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 },
            label: { type: 'string' },
            kind: { type: 'string', enum: ['force', 'motion', 'highlight'], default: 'force' },
          },
          required: ['from', 'to'],
        },
        default: [],
      },
    },
  },
  presets: [
    {
      name: 'Pull & rotate',
      params: {
        viewBox: [400, 300],
        arrows: [
          { from: [60, 250], to: [200, 120], label: 'pull', kind: 'force' },
          { from: [340, 250], to: [210, 140], kind: 'motion', label: 'rotate' },
        ],
      },
    },
  ],
};

// An arrowhead (<polyline>) at the (x2,y2) end of a shaft aimed from (x1,y1).
// Mirrors the geometry of svg.js arrow() so 'motion'/'highlight' read as arrows.
function arrowhead(x1, y1, x2, y2, { stroke = 'var(--ink)', width, size = 8 } = {}) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const spread = 0.5;
  const ax = x2 - size * Math.cos(ang - spread);
  const ay = y2 - size * Math.sin(ang - spread);
  const bx = x2 - size * Math.cos(ang + spread);
  const by = y2 - size * Math.sin(ang + spread);
  return poly([[round(ax), round(ay)], [round(x2), round(y2)], [round(bx), round(by)]], { stroke, width });
}

// One annotated arrow, styled by kind.
function annotated(a) {
  const [x1, y1] = Array.isArray(a.from) ? a.from : [0, 0];
  const [x2, y2] = Array.isArray(a.to) ? a.to : [0, 0];
  const kind = a.kind || 'force';
  const parts = [];

  if (kind === 'motion') {
    // Curved dashed arrow: a quadratic arc bowed perpendicular to the chord,
    // plus a manual arrowhead tangent to the curve at the end.
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const bow = Math.min(len * 0.3, 60);
    const cx = mx - (dy / len) * bow;
    const cy = my + (dx / len) * bow;
    const d = `M ${round(x1)} ${round(y1)} Q ${round(cx)} ${round(cy)} ${round(x2)} ${round(y2)}`;
    parts.push(path(d, { class: 'fig-stroke', width: 2, 'stroke-dasharray': '6 5' }));
    // Tangent at end of a quadratic Bézier points along (P2 - control).
    parts.push(arrowhead(cx, cy, x2, y2, { width: 2 }));
  } else if (kind === 'highlight') {
    // Thin pointer ending in a small ring marker at the target.
    parts.push(line({
      x1: round(x1), y1: round(y1), x2: round(x2), y2: round(y2), class: 'fig-stroke', width: 1,
    }));
    parts.push(circle({
      cx: round(x2), cy: round(y2), r: 5, stroke: 'var(--cyan)', width: 2, class: 'fig-stroke',
    }));
  } else {
    // 'force': bold solid arrow with an arrowhead.
    parts.push(line({
      x1: round(x1), y1: round(y1), x2: round(x2), y2: round(y2), class: 'fig-stroke', width: 3,
    }));
    parts.push(arrowhead(x1, y1, x2, y2, { width: 3 }));
  }

  // Optional label near the arrow head.
  if (a.label != null && a.label !== '') {
    const onLeft = x2 < x1;
    parts.push(label(a.label, round(x2 + (onLeft ? -8 : 8)), round(y2 - 8), {
      anchor: onLeft ? 'end' : 'start',
      size: 12,
    }));
  }
  return el('g', {}, parts);
}

export function build(params = {}, opts = { animate: 'draw' }) {
  const { viewBox: vb, frame = false, arrows = [] } = params || {};
  const animate = (opts && opts.animate) || 'draw';
  const [W, H] = Array.isArray(vb) && vb.length === 2 ? vb : [400, 300];
  const list = Array.isArray(arrows) ? arrows.filter(Boolean) : [];

  const parts = [];
  if (frame) parts.push(panel({ x: 1, y: 1, w: W - 2, h: H - 2, rx: 4 }));
  for (const a of list) parts.push(annotated(a));

  const styleCss = animate === 'draw' ? drawCss('.fig-stroke') : '';
  // sanitise() canonicalises CSS formatting; running it here guarantees the
  // emitted svg is already in its sanitised form (sanitise(svg) === svg).
  const svg = sanitise(svgWrap(parts.join(''), viewBox(W, H), styleCss));
  return { svg, supportsDraw: true, motion: null };
}
