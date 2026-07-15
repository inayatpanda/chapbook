import { esc } from './index.js';

export default {
  id: 'quadrant-plot',
  name: 'Quadrant',
  category: 'tool',
  description: 'Drag a marker around a 2×2 matrix to see which of the four quadrants something falls into.',
  paramsSchema: {
    type: 'object', additionalProperties: false,
    required: ['xLeft', 'xRight', 'yTop', 'yBottom', 'quadrants'],
    properties: {
      title: { type: 'string' },
      xLeft: { type: 'string' },
      xRight: { type: 'string' },
      yTop: { type: 'string' },
      yBottom: { type: 'string' },
      quadrants: {
        type: 'object', additionalProperties: false,
        required: ['tl', 'tr', 'bl', 'br'],
        properties: {
          tl: { type: 'string' },
          tr: { type: 'string' },
          bl: { type: 'string' },
          br: { type: 'string' },
        },
      },
      markerLabel: { type: 'string', default: 'You' },
      caption: { type: 'string' },
    },
  },
  presets: [
    { name: 'The Eisenhower matrix', params: {
      title: 'The Eisenhower matrix',
      xLeft: 'Not urgent', xRight: 'Urgent',
      yTop: 'Important', yBottom: 'Not important',
      quadrants: { tl: 'Schedule it', tr: 'Do it now', bl: 'Drop it', br: 'Delegate it' },
      markerLabel: 'This task',
      caption: 'Drag your task. Where it lands is what to do with it.',
    } },
    { name: 'Effort vs reward', params: {
      xLeft: 'Low effort', xRight: 'High effort',
      yTop: 'High reward', yBottom: 'Low reward',
      quadrants: { tl: 'Quick win', tr: 'Big project', bl: 'Maybe later', br: 'Don’t bother' },
      markerLabel: 'The idea',
    } },
  ],
  build(params, domId) {
    const q = params.quadrants || {};
    const tl = esc(q.tl || ''), tr = esc(q.tr || ''), bl = esc(q.bl || ''), br = esc(q.br || '');
    const xLeft = esc(params.xLeft || ''), xRight = esc(params.xRight || '');
    const yTop = esc(params.yTop || ''), yBottom = esc(params.yBottom || '');
    const markerLabel = esc(params.markerLabel || 'You');
    const title = params.title ? `<div class="pg-qp-title">${esc(params.title)}</div>` : '';
    const caption = params.caption ? `<div class="pg-qp-caption">${esc(params.caption)}</div>` : '';

    const html = `<div class="pg-stage">${title}
  <div class="pg-qp-frame">
    <div class="pg-qp-axlabel pg-qp-top">${yTop}</div>
    <div class="pg-qp-mid">
      <div class="pg-qp-axlabel pg-qp-left">${xLeft}</div>
      <div class="pg-qp-plot" data-role="plot">
        <div class="pg-qp-cell pg-qp-tl"><span>${tl}</span></div>
        <div class="pg-qp-cell pg-qp-tr"><span>${tr}</span></div>
        <div class="pg-qp-cell pg-qp-bl"><span>${bl}</span></div>
        <div class="pg-qp-cell pg-qp-br"><span>${br}</span></div>
        <div class="pg-qp-axis pg-qp-vx"></div>
        <div class="pg-qp-axis pg-qp-hz"></div>
        <div class="pg-qp-marker" data-role="marker" tabindex="0"><span>${markerLabel}</span></div>
      </div>
      <div class="pg-qp-axlabel pg-qp-right">${xRight}</div>
    </div>
    <div class="pg-qp-axlabel pg-qp-bottom">${yBottom}</div>
  </div>
  <div class="pg-readout pg-qp-readout">In: <b data-role="readout">—</b></div>
  ${caption}</div>`;

    const css = [
      `#${domId} .pg-qp-title{font-weight:600;margin-bottom:.6rem;color:var(--ink,#e9eef8)}`,
      `#${domId} .pg-qp-frame{max-width:420px;margin:0 auto}`,
      `#${domId} .pg-qp-mid{display:flex;align-items:stretch;gap:.5rem}`,
      `#${domId} .pg-qp-axlabel{color:var(--ink-dim,#cdd6e6);font-size:.82rem;text-align:center}`,
      `#${domId} .pg-qp-top{margin-bottom:.4rem}`,
      `#${domId} .pg-qp-bottom{margin-top:.4rem}`,
      `#${domId} .pg-qp-left,#${domId} .pg-qp-right{display:flex;align-items:center;writing-mode:vertical-rl;max-width:1.4rem}`,
      `#${domId} .pg-qp-left{transform:rotate(180deg)}`,
      `#${domId} .pg-qp-plot{position:relative;flex:1;aspect-ratio:1/1;border:1px solid var(--line,#23304a);border-radius:12px;overflow:hidden;touch-action:none;cursor:crosshair}`,
      `#${domId} .pg-qp-cell{position:absolute;width:50%;height:50%;display:flex;align-items:center;justify-content:center;padding:.4rem;box-sizing:border-box;text-align:center;font-size:.78rem;font-weight:600;color:var(--ink,#e9eef8)}`,
      `#${domId} .pg-qp-cell span{opacity:.85;pointer-events:none}`,
      `#${domId} .pg-qp-tl{top:0;left:0;background:rgba(45,212,191,.07)}`,
      `#${domId} .pg-qp-tr{top:0;right:0;background:rgba(34,211,238,.07)}`,
      `#${domId} .pg-qp-bl{bottom:0;left:0;background:rgba(129,140,248,.07)}`,
      `#${domId} .pg-qp-br{bottom:0;right:0;background:rgba(244,114,182,.07)}`,
      `#${domId} .pg-qp-axis{position:absolute;background:var(--line,#3a4a68)}`,
      `#${domId} .pg-qp-vx{left:50%;top:0;bottom:0;width:1px;transform:translateX(-.5px)}`,
      `#${domId} .pg-qp-hz{top:50%;left:0;right:0;height:1px;transform:translateY(-.5px)}`,
      `#${domId} .pg-qp-marker{position:absolute;left:50%;top:50%;width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50%;background:#fbbf24;border:2px solid #04060c;box-shadow:0 0 12px rgba(251,191,36,.6);cursor:grab;touch-action:none;z-index:2}`,
      `#${domId} .pg-qp-marker:active{cursor:grabbing}`,
      `#${domId} .pg-qp-marker:focus-visible{outline:2px solid #22d3ee;outline-offset:2px}`,
      `#${domId} .pg-qp-marker span{position:absolute;left:50%;top:calc(100% + 4px);transform:translateX(-50%);white-space:nowrap;font-size:.72rem;font-weight:600;color:var(--ink,#e9eef8);text-shadow:0 1px 3px #04060c;pointer-events:none}`,
      `#${domId} .pg-qp-readout{margin-top:.7rem;text-align:center}`,
      `#${domId} .pg-qp-readout b{color:#fbbf24}`,
      `#${domId} .pg-qp-caption{margin-top:.4rem;font-size:.82rem;color:var(--ink-dim,#cdd6e6);text-align:center}`,
    ].join('\n');

    const jsBody = `
var plot=$('[data-role=plot]'), marker=$('[data-role=marker]'), out=$('[data-role=readout]');
if(!plot||!marker||!out)return;
var Q=(CONFIG.quadrants||{});
var labels={tl:Q.tl||'',tr:Q.tr||'',bl:Q.bl||'',br:Q.br||''};
function clamp(v,lo,hi){return v<lo?lo:(v>hi?hi:v);}
function place(px,py){
  var r=plot.getBoundingClientRect();
  if(!r.width||!r.height)return;
  var xPct=clamp((px-r.left)/r.width*100,0,100);
  var yPct=clamp((py-r.top)/r.height*100,0,100);
  marker.style.left=xPct+'%';
  marker.style.top=yPct+'%';
  var key=(yPct<50?(xPct<50?'tl':'tr'):(xPct<50?'bl':'br'));
  out.textContent=labels[key]||'—';
}
var moving=false;
function onMove(e){ if(!moving)return; e.preventDefault(); place(e.clientX,e.clientY); }
function onUp(){ moving=false; window.removeEventListener('pointermove',onMove); window.removeEventListener('pointerup',onUp); }
marker.addEventListener('pointerdown',function(e){
  e.preventDefault();
  moving=true;
  window.addEventListener('pointermove',onMove);
  window.addEventListener('pointerup',onUp);
});
plot.addEventListener('pointerdown',function(e){
  if(e.target===marker||marker.contains(e.target))return;
  place(e.clientX,e.clientY);
});
// Start centred. Exactly 50/50 fails the (<50) test on both axes -> br quadrant.
marker.style.left='50%';
marker.style.top='50%';
out.textContent=labels.br||'—';
`;
    return { html, css, jsBody };
  },
};
