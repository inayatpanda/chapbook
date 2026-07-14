import { esc } from './index.js';
export default {
  id: 'bpm-tap',
  name: 'Tap tempo',
  category: 'tool',
  description: 'Tap in time with a beat to estimate its tempo in beats per minute (BPM).',
  paramsSchema: {
    type: 'object', additionalProperties: false, required: [],
    properties: {
      title: { type: 'string' },
    },
  },
  presets: [
    { name: 'Find the tempo', params: { title: 'Find the tempo' } },
    { name: 'Is it really 120 BPM?', params: { title: 'Is it really 120 BPM?' } },
  ],
  build(params, domId) {
    const title = params.title ? `<div class="pg-bt-title">${esc(params.title)}</div>` : '';
    const html = `<div class="pg-stage">${title}` +
      `<div class="pg-bt-wrap">` +
        `<button type="button" class="pg-bt-tap" data-role="tap">` +
          `<span class="pg-bt-dot" data-role="dot"></span>` +
          `<span class="pg-bt-label">Tap</span>` +
        `</button>` +
        `<div class="pg-readout pg-bt-readout">` +
          `<div class="pg-bt-bpm"><b data-role="bpm">—</b> <span class="pg-bt-unit">BPM</span></div>` +
          `<div class="pg-bt-meta" data-role="meta">Keep tapping…</div>` +
        `</div>` +
      `</div>` +
      `<div class="pg-controls"><button type="button" class="pg-bt-reset" data-role="reset">Reset</button></div>` +
    `</div>`;
    const css = [
      `#${domId} .pg-bt-title{font-weight:600;margin-bottom:.7rem;color:var(--ink,#e9eef8)}`,
      `#${domId} .pg-bt-wrap{display:flex;align-items:center;gap:1.2rem;flex-wrap:wrap}`,
      `#${domId} .pg-bt-tap{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.5rem;width:150px;height:150px;border-radius:50%;border:1px solid #2dd4bf55;background:rgba(45,212,191,.06);color:var(--ink,#e9eef8);font:inherit;font-weight:600;cursor:pointer;-webkit-user-select:none;user-select:none;touch-action:manipulation}`,
      `#${domId} .pg-bt-tap:active{background:rgba(45,212,191,.12)}`,
      `#${domId} .pg-bt-tap:focus-visible{outline:2px solid #22d3ee;outline-offset:3px}`,
      `#${domId} .pg-bt-dot{width:46px;height:46px;border-radius:50%;background:#2dd4bf;box-shadow:0 0 0 0 #2dd4bf66;transition:transform .12s ease,box-shadow .35s ease}`,
      `#${domId} .pg-bt-dot.pulse{transform:scale(1.28);box-shadow:0 0 0 12px #2dd4bf00}`,
      `#${domId}.pg-bt-reduce .pg-bt-dot{transition:none}`,
      `#${domId}.pg-bt-reduce .pg-bt-dot.pulse{transform:none}`,
      `#${domId} .pg-bt-label{font-size:.95rem;letter-spacing:.04em}`,
      `#${domId} .pg-bt-readout{min-width:140px}`,
      `#${domId} .pg-bt-bpm{font-size:1.1rem;color:var(--ink-dim,#cdd6e6)}`,
      `#${domId} .pg-bt-bpm b{font-size:2.4rem;font-weight:800;color:#22d3ee;font-variant-numeric:tabular-nums}`,
      `#${domId} .pg-bt-unit{font-size:1rem;color:var(--ink-dim,#cdd6e6)}`,
      `#${domId} .pg-bt-meta{margin-top:.35rem;font-size:.85rem;color:var(--ink-dim,#9fb0c8)}`,
      `#${domId} .pg-controls{margin-top:1rem}`,
      `#${domId} .pg-bt-reset{border:1px solid #23304a;background:rgba(140,160,200,.06);color:var(--ink,#e9eef8);font:inherit;padding:.5rem .9rem;border-radius:9px;cursor:pointer}`,
      `#${domId} .pg-bt-reset:hover{border-color:#818cf8}`,
    ].join('\n');
    const jsBody = `
var tap=$('[data-role=tap]'); if(!tap)return;
var dot=$('[data-role=dot]'), bpmEl=$('[data-role=bpm]'), meta=$('[data-role=meta]'), reset=$('[data-role=reset]');
if(reduced)root.classList.add('pg-bt-reduce');
var GAP=2000, MAX=8, last=0, gaps=[], pulseTimer=null;
function clear(){last=0;gaps=[];if(bpmEl)bpmEl.textContent='—';if(meta)meta.textContent='Keep tapping…';}
function pulse(){
  if(reduced||!dot)return;
  dot.classList.remove('pulse');
  void dot.offsetWidth;
  dot.classList.add('pulse');
  if(pulseTimer)clearTimeout(pulseTimer);
  pulseTimer=setTimeout(function(){dot.classList.remove('pulse');},360);
}
function onTap(){
  var now=Date.now();
  pulse();
  if(last&&(now-last)<=GAP){
    gaps.push(now-last);
    if(gaps.length>MAX)gaps.shift();
  }else{
    gaps=[];
  }
  last=now;
  if(gaps.length<1){
    if(bpmEl)bpmEl.textContent='—';
    if(meta)meta.textContent='Keep tapping…';
  }else{
    var sum=0;for(var i=0;i<gaps.length;i++)sum+=gaps[i];
    var avg=sum/gaps.length;
    var bpm=Math.round(60000/avg);
    if(bpmEl)bpmEl.textContent=String(bpm);
    var n=gaps.length+1;
    if(meta)meta.textContent='Averaging '+n+' tap'+(n===1?'':'s');
  }
}
tap.addEventListener('click',onTap);
if(reset)reset.addEventListener('click',clear);
clear();
`;
    return { html, css, jsBody };
  },
};
