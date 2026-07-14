// Figure family: oscillate (category 'Motion').
// A lever / limb swinging about a fixed pivot on a CSS animation loop.
// Theme-var colours only (no hex). Motion CSS inlined via svgWrap; the
// reduced-motion guard comes from motionCss. ViewBox 0 0 240 240.

import {
  el, circle, line, svgWrap, viewBox, motionCss, sanitise,
} from './svg.js';

// Default pivot = the lever's base (a low-centre anchor point).
const DEFAULT_PIVOT = [120, 190];
const ARM_LEN = 110;

export const meta = {
  id: 'oscillate',
  name: 'Oscillate',
  category: 'Motion',
  description: 'A lever or limb swinging back and forth about a fixed pivot.',
  paramsSchema: {
    type: 'object',
    properties: {
      arc: { type: 'number', default: 25, description: 'Half-swing in degrees.' },
      period: { type: 'number', default: 2, description: 'Seconds per full swing cycle.' },
      pivot: {
        type: 'array',
        items: { type: 'number' },
        default: DEFAULT_PIVOT,
        description: 'Pivot point [x, y] (defaults to the lever base).',
      },
    },
  },
  presets: [
    { name: 'Pendulum', params: { arc: 25, period: 2, pivot: [120, 190] } },
    { name: 'Wide swing', params: { arc: 40, period: 1.4, pivot: [120, 60] } },
  ],
};

export function build(params = {}, opts = { animate: 'motion' }) {
  const { arc = 25, period = 2 } = params || {};
  const pivot = Array.isArray(params && params.pivot) && params.pivot.length === 2
    ? params.pivot
    : DEFAULT_PIVOT;
  const [px, py] = pivot;
  const animate = (opts && opts.animate) || 'motion';

  // The arm hangs/extends from the pivot toward the centre of the canvas.
  // When the pivot is in the lower half, the arm points up; otherwise down.
  const dir = py > 120 ? -1 : 1;
  const tipX = px;
  const tipY = py + dir * ARM_LEN;

  const arm = line({ x1: px, y1: py, x2: tipX, y2: tipY, stroke: 'var(--cyan)', width: 4 });
  const bob = circle({ cx: tipX, cy: tipY, r: 12, stroke: 'var(--cyan)', width: 3, fill: 'none' });
  // The swinging group carries the fig-swing class.
  const swing = el('g', { class: 'fig-swing' }, [arm, bob].join(''));
  // A clear, fixed pivot dot sits outside the swinging group so it stays put.
  const pivotDot = circle({ cx: px, cy: py, r: 5, stroke: 'var(--teal)', width: 3, fill: 'none' });
  const inner = [swing, pivotDot].join('');

  let styleCss = '';
  if (animate !== 'none') {
    const frames = `0%,100%{transform:rotate(${-arc}deg)} `
      + `50%{transform:rotate(${arc}deg)}`;
    styleCss = `${motionCss('oscillate', frames)}\n`
      + '.fig-swing { transform-box: fill-box; '
      + `transform-origin: ${px}px ${py}px; `
      + `animation: oscillate ${period}s ease-in-out infinite; }`;
  }

  const svg = sanitise(svgWrap(inner, viewBox(240, 240), styleCss));
  return { svg, supportsDraw: false, motion: 'oscillate' };
}
