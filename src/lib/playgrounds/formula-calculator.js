/* Family: formula-calculator — author-defined numeric inputs drive one or more
   outputs. Expressions use the same deliberately sandboxed new Function pattern
   as function-explorer: the interactive frame has an opaque origin and no network
   or storage. Range + number controls stay synchronised for touch and precision. */
import { esc } from './index.js';

const inputSchema = {
  type: 'object', additionalProperties: false, required: ['key', 'label', 'min', 'max', 'value'],
  properties: {
    key: { type: 'string', title: 'Variable name (letters/numbers/underscore)' },
    label: { type: 'string' },
    min: { type: 'number' }, max: { type: 'number' }, value: { type: 'number' },
    step: { type: 'number', default: 1 }, unit: { type: 'string', default: '' },
  },
};

export default {
  id: 'formula-calculator',
  name: 'Formula calculator',
  category: 'tool',
  description: 'Configurable inputs and calculated outputs — turn a post into an estimator, planner or comparison tool.',
  paramsSchema: {
    type: 'object', additionalProperties: false, required: ['inputs', 'outputs'],
    properties: {
      prompt: { type: 'string', title: 'Instruction line' },
      inputs: { type: 'array', minItems: 1, maxItems: 5, title: 'Inputs', items: inputSchema },
      outputs: {
        type: 'array', minItems: 1, maxItems: 4, title: 'Calculated outputs',
        items: {
          type: 'object', additionalProperties: false, required: ['label', 'expr'],
          properties: {
            label: { type: 'string' },
            expr: { type: 'string', title: 'Formula using the variable names and Math.*' },
            prefix: { type: 'string', default: '' },
            unit: { type: 'string', default: '' },
            decimals: { type: 'integer', minimum: 0, maximum: 6, default: 2 },
          },
        },
      },
      note: { type: 'string', title: 'Optional explanation or caveat' },
    },
  },
  presets: [
    {
      name: 'Freelance project estimate',
      params: {
        prompt: 'Adjust the assumptions to estimate the project.',
        inputs: [
          { key: 'days', label: 'Working days', min: 1, max: 60, value: 12, step: 1, unit: ' days' },
          { key: 'rate', label: 'Day rate', min: 100, max: 1500, value: 450, step: 25, unit: '' },
          { key: 'buffer', label: 'Contingency', min: 0, max: 40, value: 15, step: 1, unit: '%' },
        ],
        outputs: [
          { label: 'Base estimate', expr: 'days * rate', prefix: '£', unit: '', decimals: 0 },
          { label: 'With contingency', expr: 'days * rate * (1 + buffer/100)', prefix: '£', unit: '', decimals: 0 },
        ],
        note: 'This is a planning estimate, not a quote. Add taxes and pass-through costs separately.',
      },
    },
  ],
  build(params, domId) {
    const inputs = (Array.isArray(params.inputs) ? params.inputs : []).slice(0, 5);
    const outputs = (Array.isArray(params.outputs) ? params.outputs : []).slice(0, 4);
    const prompt = params.prompt ? `<div class="pg-fc-prompt">${esc(params.prompt)}</div>` : '';
    const controls = inputs.map((it, i) => {
      const key = String(it.key || `v${i}`).replace(/[^\w$]/g, '_');
      return `<div class="pg-fc-field"><label for="${domId}-${key}-num">${esc(it.label || key)}</label>` +
        `<div class="pg-fc-inputs"><input type="range" data-role="range" data-key="${esc(key)}" min="${Number(it.min) || 0}" max="${Number(it.max) || 100}" step="${Number(it.step) || 1}" value="${Number(it.value) || 0}">` +
        `<span class="pg-fc-numwrap"><input id="${domId}-${key}-num" type="number" data-role="number" data-key="${esc(key)}" min="${Number(it.min) || 0}" max="${Number(it.max) || 100}" step="${Number(it.step) || 1}" value="${Number(it.value) || 0}" inputmode="decimal"><span>${esc(it.unit || '')}</span></span></div></div>`;
    }).join('');
    const cards = outputs.map((o, i) =>
      `<div class="pg-fc-out"><span>${esc(o.label || `Output ${i + 1}`)}</span><strong data-role="out" data-idx="${i}">–</strong></div>`
    ).join('');
    const note = params.note ? `<div class="pg-fc-note">${esc(params.note)}</div>` : '';
    const html = `<div class="pg-stage">${prompt}<div class="pg-fc-grid"><div class="pg-fc-controls">${controls}</div><div class="pg-fc-results">${cards}</div></div>${note}<div class="pg-fc-status" data-role="status" aria-live="polite"></div></div>`;
    const css = [
      `#${domId} .pg-fc-prompt{color:var(--ink-dim,#9fb3c8);margin-bottom:.85rem}`,
      `#${domId} .pg-fc-grid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(12rem,.8fr);gap:1rem}`,
      `#${domId} .pg-fc-controls,#${domId} .pg-fc-results{display:grid;gap:.7rem}`,
      `#${domId} .pg-fc-field{border:1px solid var(--line,#23304a);border-radius:10px;padding:.65rem .75rem;background:rgba(140,160,200,.04)}`,
      `#${domId} .pg-fc-field>label{display:block;font-weight:650;color:#fff;margin-bottom:.45rem}`,
      `#${domId} .pg-fc-inputs{display:flex;align-items:center;gap:.65rem}`,
      `#${domId} .pg-fc-inputs input[type=range]{flex:1;accent-color:#22d3ee;min-width:5rem}`,
      `#${domId} .pg-fc-numwrap{display:flex;align-items:center;gap:.25rem;color:var(--ink-dim,#9fb3c8);white-space:nowrap}`,
      `#${domId} .pg-fc-numwrap input{width:6rem;min-height:40px;border:1px solid var(--line,#23304a);border-radius:8px;background:rgba(4,6,12,.3);color:#fff;font:inherit;padding:.35rem .45rem}`,
      `#${domId} .pg-fc-numwrap input:focus{outline:2px solid #22d3ee;outline-offset:1px}`,
      `#${domId} .pg-fc-out{border:1px solid #22d3ee55;border-radius:11px;background:rgba(34,211,238,.07);padding:.75rem}`,
      `#${domId} .pg-fc-out span{display:block;color:var(--ink-faint,#717d99);font-size:.78rem;margin-bottom:.2rem}`,
      `#${domId} .pg-fc-out strong{font-size:1.35rem;color:#22d3ee;font-variant-numeric:tabular-nums}`,
      `#${domId} .pg-fc-note{font-size:.8rem;color:var(--ink-faint,#717d99);line-height:1.5;margin-top:.75rem}`,
      `#${domId} .pg-fc-status{min-height:1.2em;color:#fb7185;font-size:.8rem;margin-top:.35rem}`,
      `@media(max-width:620px){#${domId} .pg-fc-grid{grid-template-columns:1fr}#${domId} .pg-fc-inputs{align-items:flex-start;flex-direction:column}#${domId} .pg-fc-numwrap input{width:7rem}}`,
    ].join('\n');
    const jsBody = `
var INS=(CONFIG.inputs||[]).slice(0,5),OUTS=(CONFIG.outputs||[]).slice(0,4);
var ranges=$$('[data-role=range]'),nums=$$('[data-role=number]'),cards=$$('[data-role=out]'),status=$('[data-role=status]');
var KEYS=INS.map(function(it,i){return String((it&&it.key)||('v'+i)).replace(/[^\\w$]/g,'_');}).filter(function(k){return /^[A-Za-z_$][\\w$]*$/.test(k);});
function compile(expr){try{var pre=KEYS.map(function(k){return 'var '+k+'=V['+JSON.stringify(k)+'];';}).join('');return new Function('V','Math',pre+'return ('+(expr||'0')+');');}catch(e){return null;}}
var fns=OUTS.map(function(o){return compile(o&&o.expr);});
function clamp(v,el){var lo=parseFloat(el.min),hi=parseFloat(el.max);if(isNaN(v))v=lo||0;return Math.max(lo,Math.min(hi,v));}
function values(){var V={};nums.forEach(function(n){V[n.getAttribute('data-key')]=parseFloat(n.value)||0;});return V;}
function draw(){
  var V=values(),bad=false;
  cards.forEach(function(card,i){var o=OUTS[i]||{},v=NaN;try{if(fns[i])v=fns[i](V,Math);}catch(e){}
    if(!isFinite(v)){card.textContent='–';bad=true;return;}var d=Math.max(0,Math.min(6,(+o.decimals)||0));
    card.textContent=String(o.prefix||'')+v.toFixed(d)+String(o.unit||'');
  });
  if(status)status.textContent=bad?'One formula could not be calculated with these values.':'';
}
function sync(from,to){var key=from.getAttribute('data-key'),peer=to.filter(function(x){return x.getAttribute('data-key')===key;})[0];if(!peer)return;var v=clamp(parseFloat(from.value),from);from.value=String(v);peer.value=String(v);draw();}
ranges.forEach(function(r){r.addEventListener('input',function(){sync(r,nums);});});
nums.forEach(function(n){n.addEventListener('input',function(){sync(n,ranges);});});
draw();
`;
    return { html, css, jsBody };
  },
};
