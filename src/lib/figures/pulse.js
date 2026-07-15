// Figure family: pulse (category 'Motion').
// A subject that rhythmically expands and contracts on a CSS animation loop.
// Theme-var colours only (no hex). Motion CSS is inlined via svgWrap; the
// reduced-motion guard comes from motionCss. ViewBox 0 0 240 240.

import {
  el, circle, path, svgWrap, viewBox, motionCss, sanitise,
} from './svg.js';

export const meta = {
  id: 'pulse',
  name: 'Pulse',
  category: 'Motion',
  description: 'A subject that rhythmically expands and contracts (heartbeat-style loop).',
  paramsSchema: {
    type: 'object',
    properties: {
      shape: { type: 'string', enum: ['circle', 'heart'], default: 'circle' },
      rate: { type: 'number', default: 1.2, description: 'Seconds per pulse cycle.' },
      amplitude: { type: 'number', default: 1.15, description: 'Peak scale factor.' },
    },
  },
  presets: [
    { name: 'Steady pulse', params: { shape: 'circle', rate: 1.2, amplitude: 1.15 } },
    { name: 'Heartbeat', params: { shape: 'heart', rate: 1, amplitude: 1.2 } },
  ],
};

// A simple heart path centred near (120,120).
function heart() {
  const d = 'M120 156 '
    + 'C 92 132 72 116 72 96 '
    + 'C 72 80 84 70 98 70 '
    + 'C 109 70 116 77 120 84 '
    + 'C 124 77 131 70 142 70 '
    + 'C 156 70 168 80 168 96 '
    + 'C 168 116 148 132 120 156 Z';
  return path(d, { stroke: 'var(--teal)', width: 3, fill: 'none' });
}

export function build(params = {}, opts = { animate: 'motion' }) {
  const { shape = 'circle', rate = 1.2, amplitude = 1.15 } = params || {};
  const animate = (opts && opts.animate) || 'motion';

  const subject = shape === 'heart'
    ? heart()
    : circle({ cx: 120, cy: 120, r: 46, stroke: 'var(--cyan)', width: 3, fill: 'none' });

  // The animated element carries the fig-pulse class.
  const subjectEl = el('g', { class: 'fig-pulse' }, subject);
  const inner = subjectEl;

  let styleCss = '';
  if (animate !== 'none') {
    const frames = '0%,100%{transform:scale(1)} '
      + `50%{transform:scale(${amplitude})}`;
    styleCss = `${motionCss('pulse', frames)}\n`
      + '.fig-pulse { transform-origin: center; transform-box: fill-box; '
      + `animation: pulse ${rate}s ease-in-out infinite; }`;
  }

  const svg = sanitise(svgWrap(inner, viewBox(240, 240), styleCss));
  return { svg, supportsDraw: false, motion: 'pulse' };
}
