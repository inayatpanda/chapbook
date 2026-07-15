// Figure family: morph (category 'Motion').
// A subject (e.g. a bone fragment / segment) transitioning between two poses —
// the "show the change" device (displaced <-> reduced). The subject's transform
// loops between the `from` pose and the `to` pose, holding briefly at each end.
// Both state labels (A near the from region, B near the to region) are shown.
// Theme-var colours only (no hex). Motion CSS inlined via svgWrap; the
// reduced-motion guard comes from motionCss. ViewBox 0 0 320 220.

import {
  el, rect, label, path, svgWrap, viewBox, motionCss, sanitise,
} from './svg.js';

const W = 320;
const H = 220;

// Default poses: A = displaced/rotated/offset, B = aligned (reduced).
const DEF_FROM = { dx: -36, dy: -28, rotate: -22 };
const DEF_TO = { dx: 0, dy: 0, rotate: 0 };

const num = (v, d) => (Number.isFinite(v) ? v : d);

function pose(p = {}, def) {
  return {
    dx: num(p && p.dx, def.dx),
    dy: num(p && p.dy, def.dy),
    rotate: num(p && p.rotate, def.rotate),
  };
}

export const meta = {
  id: 'morph',
  name: 'Morph',
  category: 'Motion',
  description: 'A subject transitioning between two states (displaced <-> reduced), looping.',
  paramsSchema: {
    type: 'object',
    properties: {
      labelA: { type: 'string', default: 'A', description: 'Label for the starting (from) state.' },
      labelB: { type: 'string', default: 'B', description: 'Label for the end (to) state.' },
      period: { type: 'number', default: 3, description: 'Seconds per full A<->B cycle.' },
      from: {
        type: 'object',
        description: 'Starting pose {dx,dy,rotate}.',
        properties: {
          dx: { type: 'number' }, dy: { type: 'number' }, rotate: { type: 'number' },
        },
      },
      to: {
        type: 'object',
        description: 'End pose {dx,dy,rotate}.',
        properties: {
          dx: { type: 'number' }, dy: { type: 'number' }, rotate: { type: 'number' },
        },
      },
    },
  },
  presets: [
    { name: 'Displaced to reduced', params: { labelA: 'Displaced', labelB: 'Reduced', period: 3 } },
  ],
};

// A reference (target) outline showing where the subject lands in pose B.
function reference() {
  const r = rect({
    x: 132, y: 92, w: 56, h: 36, rx: 4, stroke: 'var(--ink-dim)', width: 1.5, fill: 'none',
  });
  return el('g', {}, r);
}

// The moving subject: a small fragment/segment.
function subject() {
  const body = rect({
    x: 132, y: 92, w: 56, h: 36, rx: 4, stroke: 'var(--teal)', width: 3, fill: 'none',
  });
  const tick = path('M160 92 L160 128', { stroke: 'var(--cyan)', width: 2, fill: 'none' });
  return el('g', { class: 'fig-morph' }, [body, tick]);
}

export function build(params = {}, opts = { animate: 'motion' }) {
  const {
    labelA = 'A',
    labelB = 'B',
    period = 3,
  } = params || {};
  const from = pose(params && params.from, DEF_FROM);
  const to = pose(params && params.to, DEF_TO);
  const animate = (opts && opts.animate) || 'motion';

  // Label A sits near the from-pose region (offset by the from displacement);
  // label B sits near the to-pose / reference region.
  const labA = label(labelA, 160 + from.dx, 84 + from.dy, { anchor: 'middle', fill: 'var(--ink-dim)' });
  const labB = label(labelB, 160 + to.dx, 152 + to.dy, { anchor: 'middle', fill: 'var(--ink-dim)' });

  const inner = el('g', {}, [reference(), subject(), labA, labB]);

  let styleCss = '';
  if (animate !== 'none') {
    const fromT = `translate(${from.dx}px,${from.dy}px) rotate(${from.rotate}deg)`;
    const toT = `translate(${to.dx}px,${to.dy}px) rotate(${to.rotate}deg)`;
    const frames = `0%,40%{transform: ${fromT}} 60%,100%{transform: ${toT}}`;
    styleCss = `${motionCss('morph', frames)}\n`
      + '.fig-morph { transform-box: fill-box; transform-origin: center; '
      + `animation: morph ${period}s ease-in-out infinite; }`;
  } else {
    // Static representative frame: hold the subject in the from pose, no animation.
    styleCss = '.fig-morph { transform-box: fill-box; transform-origin: center; '
      + `transform: translate(${from.dx}px,${from.dy}px) rotate(${from.rotate}deg); }`;
  }

  const svg = sanitise(svgWrap(inner, viewBox(W, H), styleCss));
  return { svg, supportsDraw: false, motion: 'morph' };
}
