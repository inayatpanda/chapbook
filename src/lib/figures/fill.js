// Figure family: fill (category 'Motion').
// A level rising and falling inside a container. The fill region is scaled on
// the Y axis from `from` -> `to` and back on a loop, anchored at its bottom
// edge (transform-origin: bottom; transform-box: fill-box). Theme-var colours
// only (no hex). Motion CSS inlined via svgWrap; the reduced-motion guard comes
// from motionCss. ViewBox 0 0 200 260.

import {
  el, rect, path, svgWrap, viewBox, motionCss, sanitise,
} from './svg.js';

const W = 200;
const H = 260;

// Geometry of the fillable interior, shared by both container styles.
const INNER = {
  x: 56, y: 40, w: 88, h: 180,
};

const clamp01 = (n) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));

export const meta = {
  id: 'fill',
  name: 'Fill',
  category: 'Motion',
  description: 'A level rising and falling inside a container on a loop.',
  paramsSchema: {
    type: 'object',
    properties: {
      from: { type: 'number', default: 0, description: 'Starting fill level, 0..1.' },
      to: { type: 'number', default: 0.8, description: 'Peak fill level, 0..1.' },
      period: { type: 'number', default: 2.4, description: 'Seconds per full fill cycle.' },
      container: {
        type: 'string', enum: ['beaker', 'bar'], default: 'beaker', description: 'Container style.',
      },
    },
  },
  presets: [
    { name: 'Filling beaker', params: { from: 0, to: 0.8, period: 2.4, container: 'beaker' } },
    { name: 'Rising bar', params: { from: 0.1, to: 0.9, period: 2, container: 'bar' } },
  ],
};

// A beaker outline: angled walls narrowing to a base, with a pour lip.
function beaker() {
  const d = 'M64 36 L52 224 '
    + 'Q52 236 64 236 L136 236 Q148 236 148 224 L136 36';
  const body = path(d, { stroke: 'var(--ink)', width: 3, fill: 'none' });
  const lip = path('M58 36 L142 36', { stroke: 'var(--ink-dim)', width: 2, fill: 'none' });
  return el('g', {}, [lip, body]);
}

// A simple bar/cylinder container: a rounded vertical tube.
function bar() {
  return rect({
    x: 60, y: 32, w: 80, h: 196, rx: 10, stroke: 'var(--ink)', width: 3, fill: 'none',
  });
}

export function build(params = {}, opts = { animate: 'motion' }) {
  const {
    from = 0,
    to = 0.8,
    period = 2.4,
    container = 'beaker',
  } = params || {};
  const animate = (opts && opts.animate) || 'motion';

  const f = clamp01(from);
  const t = clamp01(to);
  const outline = container === 'bar' ? bar() : beaker();

  // The fill region spans the full interior height; scaleY shrinks it from the
  // bottom. At rest (static) it sits at the `to` level so the figure reads.
  const region = rect({
    x: INNER.x, y: INNER.y, w: INNER.w, h: INNER.h,
    stroke: 'var(--teal)', width: 0, fill: 'var(--cyan)', class: 'fig-fill',
  });
  const inner = el('g', {}, [outline, region]);

  let styleCss = '';
  if (animate !== 'none') {
    const frames = `0%,100%{transform:scaleY(${f})} 50%{transform:scaleY(${t})}`;
    styleCss = `${motionCss('fill', frames)}\n`
      + '.fig-fill { transform-origin: bottom; transform-box: fill-box; opacity: 0.5; '
      + `animation: fill ${period}s ease-in-out infinite; }`;
  } else {
    // Static representative frame: hold the fill at the `to` level, no animation.
    styleCss = '.fig-fill { transform-origin: bottom; transform-box: fill-box; opacity: 0.5; '
      + `transform: scaleY(${t}); }`;
  }

  const svg = sanitise(svgWrap(inner, viewBox(W, H), styleCss));
  return { svg, supportsDraw: false, motion: 'fill' };
}
