// Figure family: rotate (category 'Motion').
// An object rotating continuously about the centre on a CSS animation loop.
// Theme-var colours only (no hex). Motion CSS inlined via svgWrap; the
// reduced-motion guard comes from motionCss. ViewBox 0 0 240 240.

import {
  el, circle, line, poly, svgWrap, viewBox, motionCss, sanitise,
} from './svg.js';

const CX = 120;
const CY = 120;

export const meta = {
  id: 'rotate',
  name: 'Rotate',
  category: 'Motion',
  description: 'An object (gear, ring or arrow) rotating continuously about its centre.',
  paramsSchema: {
    type: 'object',
    properties: {
      object: { type: 'string', enum: ['gear', 'ring', 'arrow'], default: 'gear' },
      speed: { type: 'number', default: 4, description: 'Seconds per full revolution.' },
      dir: { type: 'string', enum: ['cw', 'ccw'], default: 'cw' },
    },
  },
  presets: [
    { name: 'Turning gear', params: { object: 'gear', speed: 4, dir: 'cw' } },
    { name: 'Ticked ring', params: { object: 'ring', speed: 6, dir: 'ccw' } },
    { name: 'Sweep arrow', params: { object: 'arrow', speed: 3, dir: 'cw' } },
  ],
};

// A gear: a ring with radial teeth + a hub.
function gear() {
  const parts = [];
  const rOuter = 52;
  const rInner = 36;
  const teeth = 12;
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    const x1 = CX + rInner * Math.cos(a);
    const y1 = CY + rInner * Math.sin(a);
    const x2 = CX + rOuter * Math.cos(a);
    const y2 = CY + rOuter * Math.sin(a);
    parts.push(line({ x1, y1, x2, y2, stroke: 'var(--cyan)', width: 3 }));
  }
  parts.push(circle({ cx: CX, cy: CY, r: rInner, stroke: 'var(--cyan)', width: 3, fill: 'none' }));
  parts.push(circle({ cx: CX, cy: CY, r: 12, stroke: 'var(--teal)', width: 3, fill: 'none' }));
  return parts;
}

// A ring with evenly spaced tick marks.
function ring() {
  const parts = [];
  const r = 52;
  parts.push(circle({ cx: CX, cy: CY, r, stroke: 'var(--cyan)', width: 3, fill: 'none' }));
  const ticks = 8;
  for (let i = 0; i < ticks; i++) {
    const a = (i / ticks) * Math.PI * 2;
    const x1 = CX + (r - 10) * Math.cos(a);
    const y1 = CY + (r - 10) * Math.sin(a);
    const x2 = CX + r * Math.cos(a);
    const y2 = CY + r * Math.sin(a);
    parts.push(line({ x1, y1, x2, y2, stroke: 'var(--teal)', width: 3 }));
  }
  return parts;
}

// A labelled arrow sweeping from the centre.
function arrowObj() {
  const parts = [];
  parts.push(circle({ cx: CX, cy: CY, r: 8, stroke: 'var(--teal)', width: 3, fill: 'none' }));
  parts.push(line({ x1: CX, y1: CY, x2: CX + 54, y2: CY, stroke: 'var(--cyan)', width: 3 }));
  parts.push(poly([[CX + 44, CY - 8], [CX + 54, CY], [CX + 44, CY + 8]], {
    stroke: 'var(--cyan)', width: 3,
  }));
  return parts;
}

export function build(params = {}, opts = { animate: 'motion' }) {
  const { object = 'gear', speed = 4, dir = 'cw' } = params || {};
  const animate = (opts && opts.animate) || 'motion';

  let shape;
  if (object === 'ring') shape = ring();
  else if (object === 'arrow') shape = arrowObj();
  else shape = gear();

  // The animated element carries the fig-spin class.
  const inner = el('g', { class: 'fig-spin' }, shape.join(''));

  let styleCss = '';
  if (animate !== 'none') {
    const deg = dir === 'ccw' ? '-360deg' : '360deg';
    const frames = `to { transform: rotate(${deg}) }`;
    styleCss = `${motionCss('rotate', frames)}\n`
      + '.fig-spin { transform-origin: center; transform-box: fill-box; '
      + `animation: rotate ${speed}s linear infinite; }`;
  }

  const svg = sanitise(svgWrap(inner, viewBox(240, 240), styleCss));
  return { svg, supportsDraw: false, motion: 'rotate' };
}
