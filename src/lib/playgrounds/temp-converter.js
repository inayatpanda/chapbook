import { esc } from './index.js';

export default {
  id: 'temp-converter',
  name: 'Temperature converter',
  category: 'weather',
  description: 'Slide a temperature and see Celsius, Fahrenheit and Kelvin at once.',
  paramsSchema: {
    type: 'object', additionalProperties: false, required: [],
    properties: {
      title: { type: 'string' },
      start: { type: 'number', default: 20, minimum: -273.15, maximum: 1000 },
      min: { type: 'number', default: -40, minimum: -273.15, maximum: 999 },
      max: { type: 'number', default: 50, minimum: -272, maximum: 1000 },
      caption: { type: 'string' },
    },
  },
  presets: [
    { name: 'How hot is that?', params: { title: 'How hot is that?', start: 20, min: -40, max: 50, caption: 'Drag to feel the difference between °C, °F and Kelvin.' } },
    { name: 'Around freezing', params: { title: 'Around freezing', start: 0, min: -20, max: 20, caption: 'Water freezes at 0 °C — 32 °F, 273.15 K.' } },
  ],
  build(params, domId) {
    const num = (v, d) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : d;
    };
    let min = num(params.min, -40);
    let max = num(params.max, 50);
    if (max <= min) max = min + 1;
    // Kelvin floor: absolute zero.
    if (min < -273.15) min = -273.15;
    if (max < -273.15) max = -273.15;
    if (max <= min) max = min + 1;
    let start = num(params.start, 20);
    if (start < min) start = min;
    if (start > max) start = max;

    const title = params.title ? `<div class="pg-tc-title">${esc(params.title)}</div>` : '';
    const caption = params.caption ? `<div class="pg-tc-caption">${esc(params.caption)}</div>` : '';

    const html = `<div class="pg-stage">${title}
<div class="pg-tc-readouts">
  <div class="pg-tc-cell pg-tc-c"><span class="pg-readout pg-tc-v" data-role="out-c">–</span><span class="pg-tc-u">°C</span></div>
  <div class="pg-tc-cell pg-tc-f"><span class="pg-readout pg-tc-v" data-role="out-f">–</span><span class="pg-tc-u">°F</span></div>
  <div class="pg-tc-cell pg-tc-k"><span class="pg-readout pg-tc-v" data-role="out-k">–</span><span class="pg-tc-u">K</span></div>
</div>
<div class="pg-tc-desc" data-role="out-desc"></div>
<div class="pg-controls">
  <div class="pg-row pg-field"><label><b>Temperature</b> <span class="pg-readout" data-role="out-slider"></span></label>
    <input type="range" data-role="temp" min="${min}" max="${max}" step="0.5" value="${start}" aria-label="Temperature in degrees Celsius"></div>
</div>${caption}
</div>`;

    const css = [
      `#${domId} .pg-tc-title{font-weight:600;margin-bottom:.6rem;color:var(--ink,#e9eef8)}`,
      `#${domId} .pg-tc-readouts{display:grid;grid-template-columns:repeat(3,1fr);gap:.6rem;margin-bottom:.8rem}`,
      `#${domId} .pg-tc-cell{display:flex;flex-direction:column;align-items:center;gap:.15rem;padding:.8rem .5rem;border-radius:12px;border:1px solid var(--line,#23304a);background:rgba(140,160,200,.05)}`,
      `#${domId} .pg-tc-v{font-size:1.7rem;font-weight:700;line-height:1;font-variant-numeric:tabular-nums}`,
      `#${domId} .pg-tc-u{font-size:.78rem;letter-spacing:.03em;text-transform:uppercase;color:var(--ink-dim,#9fb0c8)}`,
      `#${domId} .pg-tc-c{border-color:#2dd4bf55;background:rgba(45,212,191,.07)}`,
      `#${domId} .pg-tc-c .pg-tc-v{color:#2dd4bf}`,
      `#${domId} .pg-tc-f{border-color:#fbbf2455;background:rgba(251,191,36,.07)}`,
      `#${domId} .pg-tc-f .pg-tc-v{color:#fbbf24}`,
      `#${domId} .pg-tc-k{border-color:#818cf855;background:rgba(129,140,248,.07)}`,
      `#${domId} .pg-tc-k .pg-tc-v{color:#818cf8}`,
      `#${domId} .pg-tc-desc{text-align:center;font-size:1rem;font-weight:600;margin-bottom:.9rem;min-height:1.3em;color:var(--ink,#e9eef8)}`,
      `#${domId} .pg-controls{display:flex;flex-direction:column;gap:.7rem}`,
      `#${domId} .pg-field label{display:flex;justify-content:space-between;align-items:baseline;gap:.6rem;font-size:.9rem;color:var(--ink-dim,#cdd6e6)}`,
      `#${domId} .pg-readout{color:#22d3ee;font-variant-numeric:tabular-nums}`,
      `#${domId} input[type=range]{width:100%;margin:.35rem 0 0;accent-color:#22d3ee}`,
      `#${domId} .pg-tc-caption{margin-top:.8rem;font-size:.85rem;color:var(--ink-dim,#9fb0c8)}`,
      `@media(max-width:420px){#${domId} .pg-tc-v{font-size:1.4rem}}`,
    ].join('\n');

    const jsBody = `
var tEl=$('[data-role=temp]');
if(!tEl)return;
var outC=$('[data-role=out-c]'), outF=$('[data-role=out-f]'), outK=$('[data-role=out-k]');
var outSlider=$('[data-role=out-slider]'), outDesc=$('[data-role=out-desc]');
function fmt(n){
  var r=Math.round(n*10)/10;
  if(Object.is(r,-0))r=0;
  return (r.toFixed(1)).replace(/\\.0$/,'');
}
function descriptor(c){
  if(c<0)return 'Freezing';
  if(c<10)return 'Cold';
  if(c<20)return 'Mild';
  if(c<30)return 'Warm';
  return 'Hot';
}
function recompute(){
  var c=parseFloat(tEl.value);
  if(!isFinite(c))c=0;
  var f=c*9/5+32;
  var k=c+273.15;
  if(outC)outC.textContent=fmt(c);
  if(outF)outF.textContent=fmt(f);
  if(outK)outK.textContent=fmt(k);
  if(outSlider)outSlider.textContent=fmt(c)+' °C';
  if(outDesc)outDesc.textContent=descriptor(c);
}
tEl.addEventListener('input', recompute);
recompute();
`;

    return { html, css, jsBody };
  },
};
