// Figure family: flow (category 'Motion').
// Marching dashes / travelling motion along a path (stroke-dashoffset loop —
// no transform needed). Theme-var colours only (no hex). Motion CSS inlined
// via svgWrap; the reduced-motion guard comes from motionCss. ViewBox 0 0 360 180.

import {
  el, path, circle, svgWrap, viewBox, motionCss, sanitise,
} from './svg.js';

// A gentle horizontal curve across the canvas.
const DEFAULT_PATH = 'M20 90 C 110 30, 250 150, 340 90';

export const meta = {
  id: 'flow',
  name: 'Flow',
  category: 'Motion',
  description: 'Marching dashes travelling along a path to suggest directional flow.',
  paramsSchema: {
    type: 'object',
    properties: {
      speed: { type: 'number', default: 1.2, description: 'Seconds per dash march cycle.' },
      path: { type: 'string', default: DEFAULT_PATH, description: 'SVG path `d` to flow along.' },
    },
  },
  presets: [
    { name: 'Gentle current', params: { speed: 1.2, path: DEFAULT_PATH } },
    { name: 'Fast stream', params: { speed: 0.7, path: 'M20 90 L 340 90' } },
  ],
};

export function build(params = {}, opts = { animate: 'motion' }) {
  const { speed = 1.2 } = params || {};
  const d = (params && typeof params.path === 'string' && params.path.trim() !== '')
    ? params.path
    : DEFAULT_PATH;
  const animate = (opts && opts.animate) || 'motion';

  // A faint backing path so the route is visible at rest, plus the dashed
  // travelling stroke on top.
  const guide = path(d, { stroke: 'var(--ink-dim)', width: 1.5, fill: 'none' });
  const dashes = path(d, { stroke: 'var(--cyan)', width: 3, fill: 'none', class: 'fig-flow' });
  // A couple of small travelling dots riding the same dashed rhythm.
  const dotA = circle({ cx: 90, cy: 64, r: 4, stroke: 'var(--teal)', width: 2, fill: 'none' });
  const dotB = circle({ cx: 270, cy: 116, r: 4, stroke: 'var(--teal)', width: 2, fill: 'none' });
  const inner = [guide, dashes, dotA, dotB].join('');

  let styleCss = '';
  if (animate !== 'none') {
    const frames = 'to { stroke-dashoffset: -18 }';
    styleCss = `${motionCss('flow', frames)}\n`
      + '.fig-flow { stroke-dasharray: 10 8; '
      + `animation: flow ${speed}s linear infinite; }`;
  } else {
    // Static representative frame: keep the dashed look, but no animation.
    styleCss = '.fig-flow { stroke-dasharray: 10 8; }';
  }

  const svg = sanitise(svgWrap(inner, viewBox(360, 180), styleCss));
  return { svg, supportsDraw: false, motion: 'flow' };
}
