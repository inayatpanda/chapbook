// Figure family: wave (category 'Motion').
// A sine-like wave/trace sweeping across the canvas. The wave path is built
// wider than the viewBox and translated left by exactly one wavelength on a
// linear loop, so it appears to travel; the viewBox clips the overflow.
// Theme-var colours only (no hex). Motion CSS inlined via svgWrap; the
// reduced-motion guard comes from motionCss. ViewBox 0 0 360 180.

import {
  el, path, svgWrap, viewBox, motionCss, sanitise,
} from './svg.js';

const W = 360;
const H = 180;
const MID = H / 2;

export const meta = {
  id: 'wave',
  name: 'Wave',
  category: 'Motion',
  description: 'A sine-like wave/trace sweeping across the canvas on a travelling loop.',
  paramsSchema: {
    type: 'object',
    properties: {
      amplitude: { type: 'number', default: 30, description: 'Peak height of the wave (px).' },
      wavelength: { type: 'number', default: 90, description: 'Horizontal length of one wave cycle (px).' },
      speed: { type: 'number', default: 2, description: 'Seconds per travelled wavelength.' },
    },
  },
  presets: [
    { name: 'Rolling wave', params: { amplitude: 30, wavelength: 90, speed: 2 } },
    { name: 'Quick ripple', params: { amplitude: 18, wavelength: 60, speed: 1.1 } },
  ],
};

// Build a smooth sine-like path from cubic segments. It starts one wavelength
// to the LEFT of the viewBox and extends one wavelength PAST the right edge, so
// after translating left by exactly one wavelength the curve still fills the
// frame seamlessly. Each cycle is two cubics (up-hump then down-hump).
function wavePath(amplitude, wavelength) {
  const startX = -wavelength;
  const endX = W + wavelength;
  const half = wavelength / 2;
  const k = half * 0.55; // control-point offset for a clean sinusoid
  let d = `M${startX} ${MID}`;
  let x = startX;
  let up = true;
  while (x < endX) {
    const nx = x + half;
    const peakY = up ? MID - amplitude : MID + amplitude;
    // Cubic from (x,MID) to (nx,MID) bowing to peakY in the middle.
    d += ` C ${x + k} ${peakY}, ${nx - k} ${peakY}, ${nx} ${MID}`;
    x = nx;
    up = !up;
  }
  return d;
}

export function build(params = {}, opts = { animate: 'motion' }) {
  const {
    amplitude = 30,
    wavelength = 90,
    speed = 2,
  } = params || {};
  const animate = (opts && opts.animate) || 'motion';

  const d = wavePath(amplitude, wavelength);
  const wave = path(d, { stroke: 'var(--cyan)', width: 3, fill: 'none', class: 'fig-wave' });
  const inner = el('g', { class: 'fig-wave-wrap' }, wave);

  let styleCss = '';
  if (animate !== 'none') {
    const frames = `to { transform: translateX(-${wavelength}px) }`;
    styleCss = `${motionCss('wave', frames)}\n`
      + `.fig-wave { animation: wave ${speed}s linear infinite; }`;
  }

  const svg = sanitise(svgWrap(inner, viewBox(W, H), styleCss));
  return { svg, supportsDraw: false, motion: 'wave' };
}
