/* Family: A / B toggle — switch between two states with readouts + caption.
   Reusable for any "this vs that" comparison (cloud vs local, before vs after,
   open vs closed, conservative vs operative…). Derived from the shipped
   "cloud is someone else's computer" playground. */
import { esc } from './index.js';

const stateSchema = {
  type: 'object', additionalProperties: false,
  required: ['label', 'readouts', 'caption'],
  properties: {
    label: { type: 'string', title: 'Button label' },
    accent: { type: 'string', title: 'Accent colour (hex)', default: '#22d3ee' },
    readouts: {
      type: 'array', title: 'Readout rows', maxItems: 6,
      items: {
        type: 'object', additionalProperties: false, required: ['label', 'value'],
        properties: { label: { type: 'string' }, value: { type: 'string' } },
      },
    },
    caption: { type: 'string', title: 'One-line caption' },
  },
};

export default {
  id: 'toggle-ab',
  name: 'A / B toggle',
  category: 'comparison',
  description: 'Two-state switch with readouts and a caption. For "this vs that" comparisons.',
  paramsSchema: {
    type: 'object', additionalProperties: false,
    required: ['stateA', 'stateB'],
    properties: {
      title: { type: 'string', title: 'Optional label above the toggle' },
      stateA: stateSchema,
      stateB: stateSchema,
    },
  },
  presets: [
    {
      name: 'Cloud vs on-device',
      params: {
        title: 'Where does the data live?',
        stateA: { label: 'On-device', accent: '#2dd4bf', caption: 'The record never leaves the laptop. No round trip, nothing to intercept.',
          readouts: [{ label: 'Latency', value: 'instant' }, { label: 'Who can read it', value: 'only you' }, { label: 'Offline', value: 'still works' }] },
        stateB: { label: 'Cloud', accent: '#f472b6', caption: 'Every save is a return flight to a building you will never see.',
          readouts: [{ label: 'Latency', value: 'round trip' }, { label: 'Who can read it', value: 'you + the vendor' }, { label: 'Offline', value: 'broken' }] },
      },
    },
    {
      name: 'Conservative vs operative',
      params: {
        stateA: { label: 'Conservative', accent: '#2dd4bf', caption: 'Time and physiotherapy; the body does the repair.',
          readouts: [{ label: 'Risk', value: 'low, but slow' }, { label: 'Recovery', value: 'weeks–months' }, { label: 'Reversible', value: 'yes' }] },
        stateB: { label: 'Operative', accent: '#818cf8', caption: 'Faster structural fix, at the cost of an operation.',
          readouts: [{ label: 'Risk', value: 'surgical' }, { label: 'Recovery', value: 'rehab protocol' }, { label: 'Reversible', value: 'no' }] },
      },
    },
  ],
  build(params, domId) {
    const A = params.stateA || {}, B = params.stateB || {};
    const title = params.title ? `<div class="pg-ab-title">${esc(params.title)}</div>` : '';
    const html =
      `<div class="pg-stage">${title}` +
      `<div class="pg-ab-toggle" role="group" aria-label="Choose a state">` +
      `<button type="button" data-role="a" class="pg-ab-btn is-active" aria-pressed="true">${esc(A.label)}</button>` +
      `<button type="button" data-role="b" class="pg-ab-btn" aria-pressed="false">${esc(B.label)}</button>` +
      `</div>` +
      `<div class="pg-ab-panel" data-role="panel" aria-live="polite">` +
      `<dl class="pg-ab-readouts" data-role="readouts"></dl>` +
      `<div class="pg-readout" data-role="caption"></div>` +
      `</div></div>`;
    const css = [
      `#${domId} .pg-ab-title{font-size:.9rem;color:var(--ink-dim,#9fb3c8);margin:0 0 .7rem}`,
      `#${domId} .pg-ab-toggle{display:inline-flex;gap:.4rem;border:1px solid var(--line,#23304a);border-radius:99px;padding:.25rem}`,
      `#${domId} .pg-ab-btn{appearance:none;background:transparent;border:1px solid transparent;border-radius:99px;padding:.45rem 1.1rem;color:var(--ink-dim,#9fb3c8);font:inherit;cursor:pointer;transition:.2s}`,
      `#${domId} .pg-ab-btn.is-active{border-color:var(--pg-ab-accent,#22d3ee);color:var(--pg-ab-accent,#22d3ee);background:rgba(140,160,200,.08)}`,
      `#${domId} .pg-ab-panel{margin-top:1.1rem}`,
      `#${domId} .pg-ab-readouts{margin:0;display:grid;gap:.5rem}`,
      `#${domId} .pg-ab-row{display:flex;justify-content:space-between;gap:1rem;border-bottom:1px dashed var(--line,#23304a);padding-bottom:.4rem}`,
      `#${domId} .pg-ab-row dt{color:var(--ink-faint,#717d99)}`,
      `#${domId} .pg-ab-row dd{margin:0;color:var(--pg-ab-accent,#22d3ee);font-weight:600;text-align:right}`,
      `#${domId} [data-role=caption]{margin-top:.9rem;color:var(--ink-dim,#9fb3c8)}`,
    ].join('\n');
    const jsBody = `
var E=function(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');};
var btnA=$('[data-role=a]'),btnB=$('[data-role=b]'),ro=$('[data-role=readouts]'),cap=$('[data-role=caption]');
if(!btnA||!btnB||!ro||!cap)return;
function render(st){
  root.style.setProperty('--pg-ab-accent', st.accent||'#22d3ee');
  ro.innerHTML=(st.readouts||[]).map(function(r){return '<div class="pg-ab-row"><dt>'+E(r.label)+'</dt><dd>'+E(r.value)+'</dd></div>';}).join('');
  cap.textContent=st.caption||'';
}
function pick(isA){
  btnA.classList.toggle('is-active',isA); btnB.classList.toggle('is-active',!isA);
  btnA.setAttribute('aria-pressed',isA?'true':'false'); btnB.setAttribute('aria-pressed',!isA?'true':'false');
  render(isA?CONFIG.stateA:CONFIG.stateB);
}
btnA.addEventListener('click',function(){pick(true);});
btnB.addEventListener('click',function(){pick(false);});
pick(true);
`;
    return { html, css, jsBody };
  },
};
