/* Family: function explorer — 1–3 sliders drive a live curve + a headline readout +
   a colour-coded verdict. The workhorse: covers hollow-bone, glenoid version,
   hip survival, dose–response, clinic throughput, and similar. The curve/marker/
   output are small JS expressions (in slider keys `V.*` + `Math` + sweep `t`) that
   ship with each preset; a non-coder edits labels / ranges / verdict text only. */
import { esc } from './index.js';

const sliderSchema = {
  type: 'object', additionalProperties: false,
  required: ['key', 'label', 'min', 'max', 'value'],
  properties: {
    key: { type: 'string', title: 'Variable name (used in formulas as V.key)' },
    label: { type: 'string' }, min: { type: 'number' }, max: { type: 'number' },
    value: { type: 'number' }, step: { type: 'number', default: 1 }, unit: { type: 'string', default: '' },
  },
};

export default {
  id: 'function-explorer',
  name: 'Function explorer',
  category: 'quantitative',
  description: 'Sliders → a live plotted curve, a headline number, and a verdict. For "feel the relationship" explainers.',
  paramsSchema: {
    type: 'object', additionalProperties: false,
    required: ['sliders', 'output'],
    properties: {
      title: { type: 'string' },
      sliders: { type: 'array', minItems: 1, maxItems: 3, items: sliderSchema },
      curve: {
        type: 'object', additionalProperties: false,
        properties: {
          xLabel: { type: 'string' }, yLabel: { type: 'string' },
          yExpr: { type: 'string', title: 'y(t) in [0,1]; t sweeps 0→1; may use V.* + Math' },
          markerExpr: { type: 'string', title: 'marker t in [0,1]; in V.* + Math' },
        },
      },
      output: {
        type: 'object', additionalProperties: false, required: ['label', 'expr'],
        properties: { label: { type: 'string' }, expr: { type: 'string', title: 'headline value; V.* + Math' },
          unit: { type: 'string', default: '' }, decimals: { type: 'number', default: 1 } },
      },
      verdict: {
        type: 'object', additionalProperties: false,
        properties: { bands: { type: 'array', items: {
          type: 'object', additionalProperties: false, required: ['max', 'label'],
          properties: { max: { type: 'number' }, label: { type: 'string' }, colour: { type: 'string' } } } } },
      },
    },
  },
  presets: [
    {
      name: 'Power curve (hollow beam)',
      params: {
        sliders: [{ key: 'spread', label: 'Material pushed outward', min: 0, max: 100, value: 0, step: 1, unit: '%' }],
        curve: { xLabel: 'material at the edge →', yLabel: 'bending stiffness →', yExpr: 'Math.pow(t,2)', markerExpr: 'V.spread/100' },
        output: { label: 'relative bending stiffness', expr: '1 + 7.3*Math.pow(V.spread/100,2)', unit: '×', decimals: 1 },
        verdict: { bands: [{ max: 2, label: 'barely better than a solid rod', colour: '#fbbf24' }, { max: 5, label: 'noticeably stiffer', colour: '#22d3ee' }, { max: 999, label: 'far stiffer — same weight', colour: '#2dd4bf' }] },
      },
    },
    {
      name: 'Logistic (dose–response)',
      params: {
        sliders: [{ key: 'dose', label: 'Dose', min: 0, max: 100, value: 50, step: 1, unit: '' }],
        curve: { xLabel: 'dose →', yLabel: 'response →', yExpr: '1/(1+Math.exp(-(t-0.5)*10))', markerExpr: 'V.dose/100' },
        output: { label: 'response', expr: '100/(1+Math.exp(-((V.dose/100)-0.5)*10))', unit: '%', decimals: 0 },
        verdict: { bands: [{ max: 20, label: 'sub-threshold', colour: '#717d99' }, { max: 80, label: 'climbing fast', colour: '#22d3ee' }, { max: 100, label: 'plateau', colour: '#2dd4bf' }] },
      },
    },
  ],
  build(params, domId) {
    const sliders = (params.sliders || []).slice(0, 3);
    const title = params.title ? `<div class="pg-fx-title">${esc(params.title)}</div>` : '';
    const c = params.curve || {};
    const controls = sliders.map((s) =>
      `<div class="pg-field"><label for="${domId}-${esc(s.key)}">${esc(s.label)} <b data-val="${esc(s.key)}"></b></label>` +
      `<input id="${domId}-${esc(s.key)}" data-key="${esc(s.key)}" data-unit="${esc(s.unit || '')}" type="range" min="${s.min}" max="${s.max}" step="${s.step || 1}" value="${s.value}"></div>`
    ).join('');
    const plot =
      `<svg viewBox="0 0 360 220" role="img" aria-label="${esc((c.yLabel || 'value') + ' against ' + (c.xLabel || 'input'))}" class="pg-fx-plot">` +
      `<line x1="40" y1="190" x2="340" y2="190" stroke="#3a4866"/><line x1="40" y1="30" x2="40" y2="190" stroke="#3a4866"/>` +
      `<text x="340" y="208" fill="#717d99" font-size="10" text-anchor="end">${esc(c.xLabel || '')}</text>` +
      `<text x="14" y="30" fill="#717d99" font-size="10" transform="rotate(-90 14 30)" text-anchor="end">${esc(c.yLabel || '')}</text>` +
      `<path data-role="curve" fill="none" stroke="#22d3ee" stroke-width="2.5"/>` +
      `<circle data-role="dot" r="6" fill="#2dd4bf" cx="40" cy="190"/></svg>`;
    const html =
      `<div class="pg-stage">${title}<div class="pg-fx-grid">${plot}` +
      `<div class="pg-fx-side"><div class="pg-readout">${esc(params.output.label)} <b data-role="out"></b></div>` +
      `<div class="pg-fx-verdict" data-role="verdict" aria-live="polite"></div></div></div>` +
      `<div class="pg-controls">${controls}</div></div>`;
    const css = [
      `#${domId} .pg-fx-title{font-size:.9rem;color:var(--ink-dim,#9fb3c8);margin:0 0 .7rem}`,
      `#${domId} .pg-fx-grid{display:grid;grid-template-columns:1.4fr 1fr;gap:1rem;align-items:center}`,
      `#${domId} .pg-fx-plot{width:100%;height:auto}`,
      `#${domId} .pg-controls{display:grid;gap:.9rem;margin-top:1.1rem}`,
      `#${domId} .pg-fx-verdict{margin:.6rem 0 0;font-weight:600}`,
      `#${domId} label b{color:#fff}`,
      `@media(max-width:620px){#${domId} .pg-fx-grid{grid-template-columns:1fr}}`,
    ].join('\n');
    const jsBody = `
var inputs=$$('input[type=range]'),out=$('[data-role=out]'),verdict=$('[data-role=verdict]'),path=$('[data-role=curve]'),dot=$('[data-role=dot]');
if(!inputs.length)return;
var KEYS=(CONFIG.sliders||[]).map(function(s){return s.key;}).filter(function(k){return /^[A-Za-z_$][\\w$]*$/.test(k);});
function mk(expr,args){try{var pre=KEYS.map(function(k){return 'var '+k+'=V['+JSON.stringify(k)+'];';}).join('');return new Function(args.join(','),'Math',pre+'return ('+(expr||'0')+');');}catch(e){return function(){return 0;};}}
var fnY=mk((CONFIG.curve&&CONFIG.curve.yExpr)||'t',['V','t']);
var fnM=mk((CONFIG.curve&&CONFIG.curve.markerExpr)||'0',['V']);
var fnO=mk(CONFIG.output.expr,['V']);
function cl(x){return x<0?0:x>1?1:x;}
function px(t){return 40+cl(t)*300;}function py(y){return 190-cl(y)*160;}
function vars(){var V={};inputs.forEach(function(i){var k=i.getAttribute('data-key');V[k]=parseFloat(i.value);var b=$('[data-val="'+k+'"]');if(b)b.textContent=i.value+(i.getAttribute('data-unit')||'');});return V;}
function redraw(){
  var V=vars(),i;
  if(path){var d='';for(i=0;i<=60;i++){var t=i/60,y;try{y=fnY(V,t,Math);}catch(e){y=0;}d+=(i?' L':'M')+px(t).toFixed(1)+','+py(y).toFixed(1);}path.setAttribute('d',d);}
  if(dot){var mt=0;try{mt=cl(fnM(V,Math));}catch(e){}var my=0;try{my=fnY(V,mt,Math);}catch(e){}dot.setAttribute('cx',px(mt));dot.setAttribute('cy',py(my));}
  var val=0;try{val=fnO(V,Math);}catch(e){}
  if(out){var dec=CONFIG.output.decimals;dec=(dec==null?1:dec);out.textContent=(isFinite(val)?val.toFixed(dec):'–')+(CONFIG.output.unit||'');}
  if(verdict&&CONFIG.verdict&&CONFIG.verdict.bands){var bs=CONFIG.verdict.bands,ch=bs[bs.length-1];for(i=0;i<bs.length;i++){if(val<=bs[i].max){ch=bs[i];break;}}verdict.textContent=ch.label;verdict.style.color=ch.colour||'#22d3ee';}
}
inputs.forEach(function(i){i.addEventListener('input',redraw);});
redraw();
`;
    return { html, css, jsBody };
  },
};
