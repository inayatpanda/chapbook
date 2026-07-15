/* Family: mixer — N slider inputs combine via one formula into a single output:
   a number (with optional verdict band) and/or a colour swatch + hex. Models the
   shipped RGB additive mixer (three channels → a live colour) and the Drake-equation
   calculator (seven factors → the product, banded from "likely alone" to "crowded").
   The formula(s) are small JS expressions in the slider keys (V.*) + Math, supplied
   per preset; a non-coder edits labels / ranges / captions only. */
import { esc } from './index.js';

const inputSchema = {
  type: 'object', additionalProperties: false,
  required: ['key', 'label', 'min', 'max', 'value'],
  properties: {
    key: { type: 'string', title: 'Variable name (used in formulas as V.key)' },
    label: { type: 'string' }, min: { type: 'number' }, max: { type: 'number' },
    value: { type: 'number' }, step: { type: 'number', default: 1 }, unit: { type: 'string', default: '' },
  },
};

const bandSchema = {
  type: 'object', additionalProperties: false,
  required: ['max', 'label'],
  properties: { max: { type: 'number' }, label: { type: 'string' }, colour: { type: 'string' } },
};

export default {
  id: 'mixer',
  name: 'Mixer',
  category: 'quantitative',
  description: 'Several sliders combine via a formula into one output — a number with a verdict, or a colour swatch + hex. For additive/compounding explainers.',
  paramsSchema: {
    type: 'object', additionalProperties: false,
    required: ['inputs'],
    properties: {
      title: { type: 'string' },
      inputs: { type: 'array', minItems: 1, maxItems: 8, items: inputSchema },
      mode: { type: 'string', enum: ['number', 'colour'], default: 'number' },
      expr: { type: 'string', title: 'number mode: output value in V.* + Math (e.g. the product)' },
      unit: { type: 'string', default: '' },
      decimals: { type: 'number', default: 0 },
      swatchExpr: { type: 'string', title: 'colour mode: returns a CSS colour string from V.*' },
      caption: { type: 'string', title: 'One-line caption under the output' },
      bands: { type: 'array', title: 'number mode: verdict bands', items: bandSchema },
    },
  },
  presets: [
    {
      name: 'RGB additive mixer',
      params: {
        title: 'Add red, green and blue light',
        mode: 'colour',
        swatchExpr: "'rgb('+Math.round(V.r)+','+Math.round(V.g)+','+Math.round(V.b)+')'",
        caption: 'Light adds. Push all three up and you reach white — not a muddier colour.',
        inputs: [
          { key: 'r', label: 'Red', min: 0, max: 255, value: 0, step: 1, unit: '' },
          { key: 'g', label: 'Green', min: 0, max: 255, value: 0, step: 1, unit: '' },
          { key: 'b', label: 'Blue', min: 0, max: 255, value: 0, step: 1, unit: '' },
        ],
      },
    },
    {
      name: 'Drake equation',
      params: {
        title: 'How many civilisations might we hear from?',
        mode: 'number',
        expr: 'V.R * V.fp * V.ne * V.fl * V.fi * V.fc * V.L',
        unit: ' civilisations',
        decimals: 1,
        caption: 'Each factor multiplies the last — small changes swing the answer by orders of magnitude.',
        inputs: [
          { key: 'R', label: 'Star formation rate (per year)', min: 0.1, max: 5, value: 1.5, step: 0.1, unit: '' },
          { key: 'fp', label: 'Fraction of stars with planets', min: 0, max: 1, value: 0.9, step: 0.01, unit: '' },
          { key: 'ne', label: 'Habitable planets per such star', min: 0, max: 5, value: 0.4, step: 0.1, unit: '' },
          { key: 'fl', label: 'Fraction that develop life', min: 0, max: 1, value: 0.3, step: 0.01, unit: '' },
          { key: 'fi', label: 'Fraction that become intelligent', min: 0, max: 1, value: 0.1, step: 0.01, unit: '' },
          { key: 'fc', label: 'Fraction that signal', min: 0, max: 1, value: 0.2, step: 0.01, unit: '' },
          { key: 'L', label: 'Signalling lifetime (thousand yrs)', min: 0.1, max: 1000, value: 10, step: 0.1, unit: '' },
        ],
        bands: [
          { max: 1, label: 'likely alone', colour: '#717d99' },
          { max: 10, label: 'a handful of neighbours', colour: '#22d3ee' },
          { max: 1000, label: 'a busy galaxy', colour: '#2dd4bf' },
          { max: 1e12, label: 'a crowded galaxy', colour: '#818cf8' },
        ],
      },
    },
  ],
  build(params, domId) {
    const inputs = (params.inputs || []).slice(0, 8);
    const mode = params.mode === 'colour' ? 'colour' : 'number';
    const title = params.title ? `<div class="pg-mx-title">${esc(params.title)}</div>` : '';
    const caption = params.caption ? `<div class="pg-mx-caption">${esc(params.caption)}</div>` : '';
    const controls = inputs.map((s) =>
      `<div class="pg-field"><label for="${domId}-${esc(s.key)}">${esc(s.label)} <b data-val="${esc(s.key)}"></b></label>` +
      `<input id="${domId}-${esc(s.key)}" data-key="${esc(s.key)}" data-unit="${esc(s.unit || '')}" type="range" min="${s.min}" max="${s.max}" step="${s.step || 1}" value="${s.value}"></div>`
    ).join('');
    const outputPanel = mode === 'colour'
      ? `<div class="pg-mx-swatch" data-role="swatch" role="img" aria-label="Mixed colour"></div>` +
        `<div class="pg-readout">hex <b data-role="out"></b></div>`
      : `<div class="pg-readout pg-mx-number"><b data-role="out"></b></div>` +
        `<div class="pg-mx-verdict" data-role="verdict" aria-live="polite"></div>`;
    const html =
      `<div class="pg-stage">${title}` +
      `<div class="pg-mx-grid"><div class="pg-mx-out">${outputPanel}${caption}</div>` +
      `<div class="pg-controls">${controls}</div></div></div>`;
    const css = [
      `#${domId} .pg-mx-title{font-size:.9rem;color:var(--ink-dim,#9fb3c8);margin:0 0 .7rem}`,
      `#${domId} .pg-mx-grid{display:grid;grid-template-columns:1fr 1.3fr;gap:1.2rem;align-items:center}`,
      `#${domId} .pg-mx-out{text-align:center}`,
      `#${domId} .pg-mx-swatch{width:100%;min-height:120px;border-radius:12px;border:1px solid var(--line,#23304a);background:#000;transition:background .25s ease}`,
      `#${domId} .pg-mx-out .pg-readout{margin-top:.6rem}`,
      `#${domId} .pg-mx-number{font-size:1.4rem}`,
      `#${domId} .pg-mx-verdict{margin:.4rem 0 0;font-weight:600}`,
      `#${domId} .pg-mx-caption{color:var(--ink-faint,#717d99);font-size:.8rem;margin-top:.5rem}`,
      `#${domId} .pg-controls{display:grid;gap:.9rem}`,
      `#${domId} label b{color:#fff}`,
      `@media(max-width:620px){#${domId} .pg-mx-grid{grid-template-columns:1fr}}`,
    ].join('\n');
    const jsBody = `
var inputs=$$('input[type=range]'),out=$('[data-role=out]'),swatch=$('[data-role=swatch]'),verdict=$('[data-role=verdict]');
if(!inputs.length)return;
var mode=CONFIG.mode==='colour'?'colour':'number';
var MKEYS=(CONFIG.inputs||[]).map(function(s){return s.key;}).filter(function(k){return /^[A-Za-z_$][\\w$]*$/.test(k);});
function mk(expr){try{var pre=MKEYS.map(function(k){return 'var '+k+'=V['+JSON.stringify(k)+'];';}).join('');return new Function('V','Math',pre+'return ('+(expr||'0')+');');}catch(e){return function(){return 0;};}}
var fnN=mk(CONFIG.expr||'0');
var fnC=mk(CONFIG.swatchExpr?('('+CONFIG.swatchExpr+')'):"'#000'");
function vars(){var V={};inputs.forEach(function(i){var k=i.getAttribute('data-key');V[k]=parseFloat(i.value);var b=$('[data-val="'+k+'"]');if(b)b.textContent=i.value+(i.getAttribute('data-unit')||'');});return V;}
function toHex(css){
  try{var d=document.createElement('span');d.style.color='';d.style.color=css;document.body.appendChild(d);
    var c=getComputedStyle(d).color;document.body.removeChild(d);
    var m=c.match(/rgba?\\(([^)]+)\\)/);if(!m)return css;
    var p=m[1].split(',');function h(n){n=Math.max(0,Math.min(255,Math.round(parseFloat(n))));var s=n.toString(16);return s.length<2?'0'+s:s;}
    return '#'+h(p[0])+h(p[1])+h(p[2]);
  }catch(e){return css;}
}
function bandFor(v){var bs=CONFIG.bands||[];if(!bs.length)return null;var ch=bs[bs.length-1];for(var i=0;i<bs.length;i++){if(v<=bs[i].max){ch=bs[i];break;}}return ch;}
function render(){
  var V=vars();
  if(mode==='colour'){
    var col='#000';try{col=fnC(V,Math);}catch(e){}
    if(swatch)swatch.style.background=col;
    if(out)out.textContent=toHex(col);
  }else{
    var val=0;try{val=fnN(V,Math);}catch(e){}
    var dec=CONFIG.decimals;dec=(dec==null?0:dec);
    if(out)out.textContent=(isFinite(val)?val.toFixed(dec):'–')+(CONFIG.unit||'');
    if(verdict){var ch=bandFor(val);if(ch){verdict.textContent=ch.label||'';verdict.style.color=ch.colour||'#22d3ee';}else{verdict.textContent='';}}
  }
}
inputs.forEach(function(i){i.addEventListener('input',render);});
render();
`;
    return { html, css, jsBody };
  },
};
