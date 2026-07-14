import { esc } from './index.js';

export default {
  id: 'gradient-maker',
  name: 'Gradient maker',
  category: 'art',
  description: 'Build a CSS linear-gradient, tweak the angle live, and copy the code.',
  paramsSchema: {
    type: 'object', additionalProperties: false, required: ['stops'],
    properties: {
      title: { type: 'string' },
      stops: { type: 'array', minItems: 2, maxItems: 5,
        items: { type: 'string', pattern: '^#[0-9a-fA-F]{3,8}$' } },
      angle: { type: 'number', default: 120, minimum: 0, maximum: 360 },
      caption: { type: 'string' },
    },
  },
  presets: [
    { name: 'Sunset', params: { title: 'Sunset', stops: ['#f9a26c', '#f76b8a', '#5b3758'], angle: 120 } },
    { name: 'Aurora', params: { title: 'Aurora', stops: ['#2dd4bf', '#22d3ee', '#818cf8'], angle: 100 } },
  ],
  build(params, domId) {
    const hex = /^#[0-9a-fA-F]{3,8}$/;
    let stops = Array.isArray(params.stops) ? params.stops.filter((s) => hex.test(String(s))) : [];
    stops = stops.slice(0, 5);
    if (stops.length < 2) stops = ['#2dd4bf', '#818cf8'];
    let angle = Math.round(Number(params.angle));
    if (!Number.isFinite(angle)) angle = 120;
    angle = Math.max(0, Math.min(360, angle));

    const title = params.title ? `<div class="pg-gm-title">${esc(params.title)}</div>` : '';
    const caption = params.caption ? `<div class="pg-gm-caption">${esc(params.caption)}</div>` : '';
    const swatches = stops.map((s) =>
      `<span class="pg-gm-swatch" style="background:${esc(s)}" title="${esc(s)}"></span>`).join('');

    const html = `<div class="pg-stage">${title}` +
      `<div class="pg-gm-preview" data-role="preview"></div>` +
      `<div class="pg-gm-swatches">${swatches}</div>` +
      `<div class="pg-controls">` +
        `<div class="pg-row"><label><b>Angle</b> <span class="pg-readout" data-role="angle-out">${angle}°</span></label>` +
        `<input type="range" data-role="angle" min="0" max="360" step="1" value="${angle}"></div>` +
      `</div>` +
      `<div class="pg-gm-code"><code data-role="code"></code>` +
        `<button type="button" class="pg-gm-copy" data-role="copy">Copy</button></div>` +
      `${caption}</div>`;

    const css = [
      `#${domId} .pg-gm-title{font-weight:700;font-size:1.05rem;margin-bottom:.6rem;color:var(--ink,#e9eef8)}`,
      `#${domId} .pg-gm-preview{height:170px;border-radius:14px;border:1px solid var(--line,#23304a)}`,
      `#${domId} .pg-gm-swatches{display:flex;gap:.4rem;margin:.6rem 0 .2rem}`,
      `#${domId} .pg-gm-swatch{width:26px;height:26px;border-radius:7px;border:1px solid rgba(255,255,255,.15)}`,
      `#${domId} .pg-controls{margin:.7rem 0 .6rem}`,
      `#${domId} .pg-row label{display:flex;align-items:center;gap:.5rem;color:var(--ink-dim,#cdd6e6);font-size:.9rem}`,
      `#${domId} .pg-readout{color:#22d3ee;font-variant-numeric:tabular-nums;font-weight:600}`,
      `#${domId} input[type=range]{width:100%;accent-color:#22d3ee;margin-top:.35rem}`,
      `#${domId} .pg-gm-code{display:flex;align-items:center;gap:.6rem;background:rgba(140,160,200,.06);border:1px solid var(--line,#23304a);border-radius:10px;padding:.55rem .7rem}`,
      `#${domId} .pg-gm-code code{flex:1;min-width:0;overflow-x:auto;white-space:nowrap;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.82rem;color:var(--ink,#e9eef8)}`,
      `#${domId} .pg-gm-copy{flex:none;border:1px solid #2dd4bf66;background:rgba(45,212,191,.12);color:#2dd4bf;border-radius:8px;padding:.4rem .8rem;cursor:pointer;font:inherit;font-weight:600}`,
      `#${domId} .pg-gm-copy:hover{background:rgba(45,212,191,.2)}`,
      `#${domId} .pg-gm-copy.copied{color:#fbbf24;border-color:#fbbf2466;background:rgba(251,191,36,.12)}`,
      `#${domId} .pg-gm-caption{margin-top:.6rem;color:var(--ink-dim,#cdd6e6);font-size:.85rem}`,
    ].join('\n');

    const jsBody = `
var stops=${JSON.stringify(stops)};
var preview=$('[data-role=preview]'), code=$('[data-role=code]');
var slider=$('[data-role=angle]'), out=$('[data-role=angle-out]'), copy=$('[data-role=copy]');
if(!preview||!code||!slider)return;
function gradient(deg){return 'linear-gradient('+deg+'deg, '+stops.join(', ')+')';}
function render(){
  var deg=parseInt(slider.value,10)||0;
  var g=gradient(deg);
  preview.style.background=g;
  code.textContent='background: '+g+';';
  if(out)out.textContent=deg+'\\u00B0';
}
slider.addEventListener('input',render);
if(copy){
  copy.addEventListener('click',function(){
    var text=code.textContent;
    function done(){copy.classList.add('copied');copy.textContent='Copied';setTimeout(function(){copy.classList.remove('copied');copy.textContent='Copy';},1400);}
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(done,done);}
    else{done();}
  });
}
render();
`;

    return { html, css, jsBody };
  },
};
