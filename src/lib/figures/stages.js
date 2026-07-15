// Figure family: stages (category 'Motion').
// Advance through N stages over time. Stages are laid out left -> right; each
// stage panel + marker reveals in turn via opacity with a staggered
// animation-delay (stage i delay = i*period), so they light up in sequence then
// the cycle repeats. Total cycle = stages.length * period. Theme-var colours
// only (no hex). Motion CSS inlined via svgWrap; the reduced-motion guard comes
// from motionCss. ViewBox is sized to the stage count.

import {
  el, rect, circle, label, line, svgWrap, viewBox, motionCss, sanitise,
} from './svg.js';

const CELL = 150; // horizontal pitch per stage
const PAD = 20; // left/right padding
const H = 150;
const PANEL_W = 120;
const PANEL_H = 70;
const PANEL_Y = 40;

export const meta = {
  id: 'stages',
  name: 'Stages',
  category: 'Motion',
  description: 'Advance through N stages over time — a staggered, looping reveal.',
  paramsSchema: {
    type: 'object',
    properties: {
      stages: {
        type: 'array',
        description: 'Ordered stages, each { label }.',
        items: {
          type: 'object',
          properties: { label: { type: 'string' } },
        },
      },
      period: { type: 'number', default: 1, description: 'Seconds each stage holds before the next lights up.' },
      loop: { type: 'boolean', default: true, description: 'Whether the sequence repeats.' },
    },
  },
  presets: [
    {
      name: 'Sourdough starter',
      params: {
        stages: [
          { label: 'Fed' },
          { label: 'Bubbling' },
          { label: 'Risen' },
          { label: 'Ripe' },
        ],
      },
    },
  ],
};

export function build(params = {}, opts = { animate: 'motion' }) {
  const stages = Array.isArray(params && params.stages) && params.stages.length
    ? params.stages
    : meta.presets[0].params.stages;
  const period = Number.isFinite(params && params.period) ? params.period : 1;
  const loop = params && params.loop === false ? false : true;
  const animate = (opts && opts.animate) || 'motion';

  const n = stages.length;
  const W = PAD * 2 + n * CELL;
  const total = n * period; // full cycle length
  const iter = loop ? 'infinite' : '1';

  const els = [];
  stages.forEach((stage, i) => {
    const cx = PAD + i * CELL + CELL / 2;
    const px = cx - PANEL_W / 2;
    const panel = rect({
      x: px, y: PANEL_Y, w: PANEL_W, h: PANEL_H, rx: 8,
      stroke: 'var(--teal)', width: 2, fill: 'none',
    });
    const marker = circle({
      cx, cy: PANEL_Y + PANEL_H / 2 - 6, r: 8, stroke: 'var(--cyan)', width: 2, fill: 'none',
    });
    const text = label(stage.label, cx, PANEL_Y + PANEL_H + 22, {
      anchor: 'middle', size: 13, fill: 'var(--ink)',
    });
    // Connector to the next stage.
    const connectors = [];
    if (i < n - 1) {
      const nx = PAD + (i + 1) * CELL + CELL / 2;
      connectors.push(line({
        x1: px + PANEL_W, y1: PANEL_Y + PANEL_H / 2, x2: nx - PANEL_W / 2, y2: PANEL_Y + PANEL_H / 2,
        stroke: 'var(--ink-dim)', width: 1.5,
      }));
    }
    const cls = animate !== 'none' ? `fig-stage fig-stage-${i}` : 'fig-stage';
    els.push(el('g', { class: cls }, [panel, marker, text, ...connectors]));
  });

  const inner = els.join('');

  let styleCss = '';
  if (animate !== 'none') {
    // Each stage holds dim, lights up for its slot, then dims again at the next
    // stage's onset. Across the cycle they light in sequence and repeat.
    const slot = (100 / n).toFixed(4);
    const on = (slot * 0.9).toFixed(4);
    const frames = `0%{opacity:0.18} ${on}%,${slot}%{opacity:1} ${(Number(slot) + 0.001).toFixed(4)}%,100%{opacity:0.18}`;
    const rules = ['.fig-stage { opacity: 0.18; }'];
    rules.push(`.fig-stage { animation: stages-in ${total}s steps(1,end) ${iter}; }`);
    stages.forEach((_, i) => {
      const delay = (i * period).toFixed(4);
      rules.push(`.fig-stage-${i} { animation-delay: ${delay}s; }`);
    });
    styleCss = `${motionCss('stages-in', frames)}\n${rules.join('\n')}`;
  }

  const svg = sanitise(svgWrap(inner, viewBox(W, H), styleCss));
  return { svg, supportsDraw: false, motion: 'stages' };
}
