import { esc } from './index.js';

/**
 * Easing-curve / progress-bar demo. Pick one of four easings and run it: a dot
 * races a perfectly even (linear) clock along time, while a progress bar shows the
 * EASED value of that same clock. The dot's horizontal position is linear; the bar
 * is not — so the gap between "time elapsed" and "progress shown" is visible.
 * Pure motion demo — rAF-driven, reduced-motion safe.
 */
export default {
  id: 'easing-curves',
  name: 'Easing curves',
  category: 'ui',
  description: 'Pick an easing and run it; a dot tracks an even clock while the bar shows what the easing does to that same time.',
  paramsSchema: {
    type: 'object', additionalProperties: false,
    properties: {
      title: { type: 'string' },
      caption: { type: 'string' },
      durationMs: { type: 'number' },
    },
  },
  presets: [
    { name: 'Four easings', params: { title: 'Watch the bar, not the percentage', caption: 'Pick an easing and run it. The dot races a perfectly even clock; the bar shows what the easing does to it.', durationMs: 1900 } },
  ],
  build(params, domId) {
    const title = params.title ? `<div class="ec-title">${esc(params.title)}</div>` : '';
    const capText = params.caption ? esc(params.caption) : '';

    const html =
      `<div class="pg-stage">` + title +
      `<div class="ec-row" role="group" aria-label="Easing">` +
      `<button type="button" class="ec-ease" data-role="ease" data-ease="linear" aria-pressed="false">Linear</button>` +
      `<button type="button" class="ec-ease" data-role="ease" data-ease="in" aria-pressed="false">Ease-in</button>` +
      `<button type="button" class="ec-ease on" data-role="ease" data-ease="out" aria-pressed="true">Ease-out</button>` +
      `<button type="button" class="ec-ease" data-role="ease" data-ease="inout" aria-pressed="false">Ease-in-out</button>` +
      `<button type="button" class="ec-run" data-role="run">Run</button>` +
      `</div>` +
      `<svg class="ec-svg" viewBox="0 0 320 200" role="img" aria-label="The chosen easing curve, with a dot tracking the current position"><g data-role="curve"></g></svg>` +
      `<div class="ec-track" data-role="track"><div class="ec-fill" data-role="fill"></div></div>` +
      `<div class="ec-readout">progress <b data-role="pct" aria-live="polite">0%</b></div>` +
      (capText ? `<div class="ec-cap">${capText}</div>` : '') +
      `</div>`;

    const css = [
      `#${domId} .pg-stage{display:grid;gap:.8rem}`,
      `#${domId} .ec-title{font-weight:600;color:var(--ink,#e9eef8)}`,
      `#${domId} .ec-row{display:flex;flex-wrap:wrap;gap:.5rem}`,
      `#${domId} .ec-ease,#${domId} .ec-run{background:#12203b;color:#cdd6ea;border:1px solid #2a3a5e;border-radius:999px;padding:.4rem 1rem;font:inherit;cursor:pointer;transition:border-color .12s,color .12s,background .12s}`,
      `#${domId} .ec-ease:hover,#${domId} .ec-run:hover{border-color:#22d3ee}`,
      `#${domId} .ec-ease.on{background:#163a36;border-color:#2dd4bf;color:#fff}`,
      `#${domId} .ec-run{margin-left:auto;background:rgba(34,211,238,.14);border-color:#22d3ee;color:#22d3ee;font-weight:600}`,
      `#${domId} .ec-run:hover{background:rgba(34,211,238,.22)}`,
      `#${domId} .ec-svg{width:100%;height:auto;display:block;max-width:420px;background:#0c1424;border:1px solid #2a3a5e;border-radius:10px}`,
      `#${domId} .ec-track{position:relative;width:100%;height:18px;background:#0c1424;border:1px solid #2a3a5e;border-radius:999px;overflow:hidden}`,
      `#${domId} .ec-fill{position:absolute;left:0;top:0;bottom:0;width:0;background:linear-gradient(90deg,#2dd4bf,#22d3ee);border-radius:999px}`,
      `#${domId} .ec-readout{color:var(--ink-dim,#cdd6ea);font-variant-numeric:tabular-nums}`,
      `#${domId} .ec-readout b{color:var(--ink,#fff)}`,
      `#${domId} .ec-cap{color:var(--ink-dim,#cdd6ea);font-size:.98rem;line-height:1.45;border-left:2px solid #22d3ee;padding-left:.8rem}`,
    ].join('\n');

    const jsBody = `
var DUR=(CONFIG&&typeof CONFIG.durationMs==='number'&&CONFIG.durationMs>0)?CONFIG.durationMs:1900;
var PAD=24,X0=PAD,X1=320-PAD,Y0=200-PAD,Y1=PAD,W=X1-X0,H=Y0-Y1;
var EASES={linear:function(t){return t;},in:function(t){return t*t*t;},out:function(t){return 1-Math.pow(1-t,3);},inout:function(t){return t<0.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;}};
var cur='out';
function ease(t){return (EASES[cur]||EASES.out)(t);}
function clamp(v,lo,hi){return v<lo?lo:(v>hi?hi:v);}
function px(t){return X0+t*W;}
function py(v){return Y0-v*H;}
var curveG=$('[data-role=curve]'),fill=$('[data-role=fill]'),pct=$('[data-role=pct]'),track=$('[data-role=track]');
function drawCurve(rawT,easedV){
  if(!curveG)return;
  var axis='#2a3a5e';
  var h='';
  h+='<line x1="'+X0+'" y1="'+Y1+'" x2="'+X0+'" y2="'+Y0+'" stroke="'+axis+'" stroke-width="1"/>';
  h+='<line x1="'+X0+'" y1="'+Y0+'" x2="'+X1+'" y2="'+Y0+'" stroke="'+axis+'" stroke-width="1"/>';
  h+='<line x1="'+X0+'" y1="'+Y1+'" x2="'+X1+'" y2="'+Y1+'" stroke="'+axis+'" stroke-width="1" stroke-dasharray="3 4" opacity="0.5"/>';
  var d='',N=48;
  for(var i=0;i<=N;i++){var t=i/N;var x=px(t).toFixed(1),y=py(ease(t)).toFixed(1);d+=(i===0?'M':'L')+x+' '+y;}
  h+='<path d="'+d+'" fill="none" stroke="#22d3ee" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>';
  if(typeof rawT==='number'){
    var dx=px(clamp(rawT,0,1)),dy=py(clamp(easedV,0,1));
    h+='<line x1="'+dx.toFixed(1)+'" y1="'+Y0+'" x2="'+dx.toFixed(1)+'" y2="'+dy.toFixed(1)+'" stroke="#2dd4bf" stroke-width="1" stroke-dasharray="2 3" opacity="0.6"/>';
    h+='<circle data-role="dot" cx="'+dx.toFixed(1)+'" cy="'+dy.toFixed(1)+'" r="5" fill="#2dd4bf" stroke="#04060c" stroke-width="1.5"/>';
  }
  curveG.innerHTML=h;
}
var rafId=null;
function stop(){if(rafId!==null){if(window.cancelAnimationFrame)window.cancelAnimationFrame(rafId);rafId=null;}}
function run(){
  stop();
  if(reduced){
    if(fill)fill.style.width='100%';
    if(pct)pct.textContent='100%';
    drawCurve(1,1);
    return;
  }
  var start=null;
  function frame(ts){
    if(start===null)start=ts;
    var raw=clamp((ts-start)/DUR,0,1);
    var eased=ease(raw);
    if(fill)fill.style.width=(eased*100)+'%';
    if(pct)pct.textContent=Math.round(eased*100)+'%';
    drawCurve(raw,eased);
    if(raw>=1){stop();return;}
    rafId=window.requestAnimationFrame(frame);
  }
  rafId=window.requestAnimationFrame(frame);
}
function setEase(key,buttons,el){
  cur=key;
  buttons.forEach(function(x){var on=x===el;x.classList.toggle('on',on);x.setAttribute('aria-pressed',on?'true':'false');});
  drawCurve();
  run();
}
var easeBtns=$$('[data-role=ease]');
easeBtns.forEach(function(b){b.addEventListener('click',function(){setEase(b.getAttribute('data-ease'),easeBtns,b);});});
var runBtn=$('[data-role=run]');
if(runBtn)runBtn.addEventListener('click',run);
drawCurve();
`;

    return { html, css, jsBody };
  },
};
