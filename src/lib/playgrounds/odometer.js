import { esc } from './index.js';

export default {
  id: 'odometer',
  name: 'Counter reveal',
  category: 'data',
  description: 'A big number that animates up to its value — a striking way to land a single stat.',
  paramsSchema: {
    type: 'object', additionalProperties: false, required: ['target'],
    properties: {
      title: { type: 'string' },
      target: { type: 'number' },
      prefix: { type: 'string', default: '' },
      suffix: { type: 'string', default: '' },
      duration: { type: 'number', default: 1500, minimum: 200, maximum: 10000 },
      caption: { type: 'string' },
    },
  },
  presets: [
    { name: 'Seconds in a day', params: { title: 'Seconds in a day', target: 86400, suffix: ' s', caption: 'And we waste most of them.' } },
    { name: 'Heartbeats in a year', params: { title: 'Heartbeats in a year', target: 36792000, caption: 'Roughly. Give or take a coffee.' } },
  ],
  build(params, domId) {
    const target = Number.isFinite(params.target) ? params.target : 0;
    const prefix = typeof params.prefix === 'string' ? params.prefix : '';
    const suffix = typeof params.suffix === 'string' ? params.suffix : '';
    const duration = Math.max(200, Math.min(10000, Math.round(params.duration || 1500)));
    const title = params.title ? `<div class="pg-od-title">${esc(params.title)}</div>` : '';
    const caption = params.caption ? `<div class="pg-od-caption">${esc(params.caption)}</div>` : '';
    const html =
      `<div class="pg-stage">${title}` +
      `<div class="pg-od-num" data-role="num" aria-live="polite">` +
      `<span class="pg-od-fix">${esc(prefix)}</span>` +
      `<span class="pg-od-val">0</span>` +
      `<span class="pg-od-fix">${esc(suffix)}</span>` +
      `</div>${caption}` +
      `<div class="pg-controls"><button type="button" class="pg-od-go" data-role="go">Reveal again</button></div>` +
      `</div>`;
    const css = [
      `#${domId} .pg-od-title{font-size:.95rem;color:var(--ink-dim,#cdd6e6);margin-bottom:.4rem}`,
      `#${domId} .pg-od-num{display:flex;align-items:baseline;justify-content:center;gap:.05em;font-weight:800;line-height:1;letter-spacing:-.02em;font-size:clamp(2.6rem,11vw,4.6rem);font-variant-numeric:tabular-nums;background:linear-gradient(90deg,#2dd4bf,#22d3ee,#818cf8);-webkit-background-clip:text;background-clip:text;color:transparent}`,
      `#${domId} .pg-od-fix{font-size:.5em;font-weight:700;opacity:.85}`,
      `#${domId} .pg-od-caption{text-align:center;color:var(--ink-dim,#cdd6e6);margin-top:.5rem;font-size:.95rem}`,
      `#${domId} .pg-controls{display:flex;justify-content:center;margin-top:1rem}`,
      `#${domId} .pg-od-go{font:inherit;cursor:pointer;color:var(--ink,#e9eef8);background:rgba(34,211,238,.08);border:1px solid #22d3ee55;border-radius:10px;padding:.5rem .9rem;transition:background .2s,border-color .2s}`,
      `#${domId} .pg-od-go:hover{background:rgba(34,211,238,.16);border-color:#22d3ee}`,
    ].join('\n');
    const jsBody = `
var TARGET=${JSON.stringify(target)};
var DURATION=${JSON.stringify(duration)};
var val=$('.pg-od-val'); if(!val)return;
var go=$('[data-role=go]');
var fmt=function(n){return Math.round(n).toLocaleString('en-GB');};
var raf=null;
function run(){
  if(raf)cancelAnimationFrame(raf);
  if(reduced){val.textContent=fmt(TARGET);return;}
  var start=null;
  function step(ts){
    if(start===null)start=ts;
    var t=Math.min(1,(ts-start)/DURATION);
    var e=1-Math.pow(1-t,3);
    val.textContent=fmt(TARGET*e);
    if(t<1){raf=requestAnimationFrame(step);}else{val.textContent=fmt(TARGET);raf=null;}
  }
  raf=requestAnimationFrame(step);
}
if(go)go.addEventListener('click',run);
run();
`;
    return { html, css, jsBody };
  },
};
