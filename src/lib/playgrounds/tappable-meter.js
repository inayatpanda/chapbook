/* Family: tappable meter — a set of tickable items drives an SVG gauge. As items
   are ticked, the meter responds (drains or fills) and the colour shifts through
   bands; a live readout shows the band label / verdict. "Run all", "Reset", and an
   optional "skip the important ones" button (leaves weighted items unticked so the
   meter stays high). Models the shipped surgical-checklist risk meter — ticking the
   social/team-briefing items is what actually moves the needle. */
import { esc } from './index.js';

const itemSchema = {
  type: 'object', additionalProperties: false,
  required: ['label', 'weight'],
  properties: {
    label: { type: 'string' },
    weight: { type: 'number', title: 'Contribution to the meter' },
  },
};

const bandSchema = {
  type: 'object', additionalProperties: false,
  required: ['max', 'label'],
  properties: {
    max: { type: 'number', title: 'Upper bound (meter value 0–100)' },
    label: { type: 'string' },
    colour: { type: 'string' },
  },
};

export default {
  id: 'tappable-meter',
  name: 'Tappable meter',
  category: 'interactive',
  description: 'Tick a set of weighted items; an SVG gauge fills or drains and shifts colour, with a live verdict. For checklists / readiness meters.',
  paramsSchema: {
    type: 'object', additionalProperties: false,
    required: ['items', 'bands'],
    properties: {
      title: { type: 'string', title: 'Optional label above the meter' },
      items: { type: 'array', minItems: 1, maxItems: 16, items: itemSchema },
      meterLabel: { type: 'string', title: 'Caption under the gauge', default: '' },
      direction: { type: 'string', enum: ['drain', 'fill'], default: 'fill',
        title: '"fill" = ticking raises the meter; "drain" = ticking lowers it' },
      runLabel: { type: 'string', default: 'Run all' },
      resetLabel: { type: 'string', default: 'Reset' },
      skipLabel: { type: 'string', title: 'Optional "skip the important ones" button' },
      skipKeeps: { type: 'array', title: 'Item indices that "skip" leaves unticked', items: { type: 'number' } },
      bands: { type: 'array', minItems: 1, items: bandSchema },
    },
  },
  presets: [
    {
      name: 'Surgical checklist',
      params: {
        title: 'Tick the checklist — watch the risk drain',
        direction: 'drain',
        meterLabel: 'residual avoidable risk',
        runLabel: 'Tick everything',
        resetLabel: 'Reset',
        skipLabel: 'Skip the "soft" ones',
        skipKeeps: [0, 1, 2],
        items: [
          { label: 'Whole team introduced themselves by name and role', weight: 4 },
          { label: 'Surgeon shared the critical/unexpected steps', weight: 4 },
          { label: 'Concerns invited from anyone in the room', weight: 3 },
          { label: 'Patient identity confirmed', weight: 1 },
          { label: 'Site marked and confirmed', weight: 1 },
          { label: 'Procedure and consent confirmed', weight: 1 },
          { label: 'Anaesthetic safety check complete', weight: 1 },
          { label: 'Antibiotic prophylaxis given on time', weight: 1 },
          { label: 'Imaging displayed and correct', weight: 1 },
        ],
        bands: [
          { max: 10, label: 'safe — the team is a team', colour: '#2dd4bf' },
          { max: 35, label: 'mostly covered', colour: '#22d3ee' },
          { max: 70, label: 'gaps remain', colour: '#fbbf24' },
          { max: 100, label: 'high avoidable risk', colour: '#f472b6' },
        ],
      },
    },
    {
      name: 'Pre-flight readiness',
      params: {
        title: 'Run the pre-flight checks',
        direction: 'fill',
        meterLabel: 'readiness to depart',
        runLabel: 'Run all checks',
        resetLabel: 'Reset',
        items: [
          { label: 'Flight plan filed and weather briefed', weight: 2 },
          { label: 'Fuel quantity and balance confirmed', weight: 2 },
          { label: 'Control surfaces free and correct', weight: 2 },
          { label: 'Instruments set and cross-checked', weight: 1 },
          { label: 'Flaps set for take-off', weight: 1 },
          { label: 'Trim set', weight: 1 },
          { label: 'Doors and harnesses secure', weight: 1 },
        ],
        bands: [
          { max: 25, label: 'not ready — stay on the ground', colour: '#f472b6' },
          { max: 60, label: 'incomplete', colour: '#fbbf24' },
          { max: 90, label: 'nearly there', colour: '#22d3ee' },
          { max: 100, label: 'cleared for take-off', colour: '#2dd4bf' },
        ],
      },
    },
  ],
  build(params, domId) {
    const items = (params.items || []).slice(0, 16);
    const title = params.title ? `<div class="pg-tm-title">${esc(params.title)}</div>` : '';
    const meterLabel = params.meterLabel || '';
    const runLabel = params.runLabel || 'Run all';
    const resetLabel = params.resetLabel || 'Reset';
    const hasSkip = !!params.skipLabel;
    const skipBtn = hasSkip
      ? `<button type="button" data-role="skip" class="pg-tm-btn">${esc(params.skipLabel)}</button>`
      : '';
    const rows = items.map((it, i) =>
      `<label class="pg-tm-item" for="${domId}-it${i}"><input id="${domId}-it${i}" data-role="item" data-idx="${i}" data-weight="${Number(it.weight) || 0}" type="checkbox"><span>${esc(it.label)}</span></label>`
    ).join('');
    const gauge =
      `<svg viewBox="0 0 220 130" role="img" aria-label="${esc(meterLabel || 'meter')}" class="pg-tm-gauge">` +
      `<path d="M20 120 A100 100 0 0 1 200 120" fill="none" stroke="#23304a" stroke-width="16" stroke-linecap="round"/>` +
      `<path data-role="arc" d="M20 120 A100 100 0 0 1 200 120" fill="none" stroke="#22d3ee" stroke-width="16" stroke-linecap="round" pathLength="100" stroke-dasharray="0 100"/>` +
      `<text data-role="pct" x="110" y="100" fill="#fff" font-size="34" font-weight="700" text-anchor="middle">0%</text>` +
      `</svg>`;
    const html =
      `<div class="pg-stage">${title}` +
      `<div class="pg-tm-grid">` +
      `<div class="pg-tm-meter">${gauge}` +
      `<div class="pg-readout" data-role="verdict" aria-live="polite"></div>` +
      (meterLabel ? `<div class="pg-tm-caption">${esc(meterLabel)}</div>` : '') +
      `</div>` +
      `<div class="pg-tm-list" role="group" aria-label="Checklist items">${rows}</div>` +
      `</div>` +
      `<div class="pg-controls pg-tm-controls">` +
      `<button type="button" data-role="run" class="pg-tm-btn">${esc(runLabel)}</button>` +
      `<button type="button" data-role="reset" class="pg-tm-btn">${esc(resetLabel)}</button>` +
      skipBtn +
      `</div></div>`;
    const css = [
      `#${domId} .pg-tm-title{font-size:.9rem;color:var(--ink-dim,#9fb3c8);margin:0 0 .7rem}`,
      `#${domId} .pg-tm-grid{display:grid;grid-template-columns:1fr 1.2fr;gap:1.2rem;align-items:center}`,
      `#${domId} .pg-tm-meter{text-align:center}`,
      `#${domId} .pg-tm-gauge{width:100%;max-width:260px;height:auto}`,
      `#${domId} [data-role=arc]{transition:stroke-dasharray .35s ease,stroke .35s ease}`,
      `#${domId} .pg-tm-meter .pg-readout{font-weight:600;margin-top:.3rem}`,
      `#${domId} .pg-tm-caption{color:var(--ink-faint,#717d99);font-size:.8rem;margin-top:.2rem}`,
      `#${domId} .pg-tm-list{display:grid;gap:.55rem}`,
      `#${domId} .pg-tm-item{display:flex;gap:.6rem;align-items:flex-start;color:var(--ink-dim,#9fb3c8);cursor:pointer;font-size:.92rem}`,
      `#${domId} .pg-tm-item input{margin-top:.2rem;accent-color:#22d3ee;flex:0 0 auto}`,
      `#${domId} .pg-tm-item.is-on{color:#fff}`,
      `#${domId} .pg-tm-controls{display:flex;flex-wrap:wrap;gap:.6rem;margin-top:1.1rem}`,
      `#${domId} .pg-tm-btn{appearance:none;background:rgba(140,160,200,.08);border:1px solid var(--line,#23304a);border-radius:99px;padding:.45rem 1.1rem;color:var(--ink-dim,#9fb3c8);font:inherit;cursor:pointer;transition:.2s}`,
      `#${domId} .pg-tm-btn:hover{border-color:#22d3ee;color:#22d3ee}`,
      `@media(max-width:620px){#${domId} .pg-tm-grid{grid-template-columns:1fr}}`,
    ].join('\n');
    const jsBody = `
var items=$$('[data-role=item]'),arc=$('[data-role=arc]'),pct=$('[data-role=pct]'),verdict=$('[data-role=verdict]');
if(!items.length||!arc)return;
var runBtn=$('[data-role=run]'),resetBtn=$('[data-role=reset]'),skipBtn=$('[data-role=skip]');
var dir=CONFIG.direction==='drain'?'drain':'fill';
var keeps={};(CONFIG.skipKeeps||[]).forEach(function(i){keeps[i]=true;});
var total=0;items.forEach(function(c){total+=(parseFloat(c.getAttribute('data-weight'))||0);});
if(total<=0)total=1;
function bandFor(v){var bs=CONFIG.bands||[];var ch=bs[bs.length-1]||{label:'',colour:'#22d3ee'};for(var i=0;i<bs.length;i++){if(v<=bs[i].max){ch=bs[i];break;}}return ch;}
function render(){
  var ticked=0;
  items.forEach(function(c){
    var on=c.checked;var lab=c.closest?c.closest('.pg-tm-item'):c.parentNode;
    if(lab&&lab.classList)lab.classList.toggle('is-on',on);
    if(on)ticked+=(parseFloat(c.getAttribute('data-weight'))||0);
  });
  var frac=ticked/total;
  var v=dir==='drain'?(1-frac):frac;
  var pctVal=Math.round(v*100);
  var ch=bandFor(pctVal);
  arc.setAttribute('stroke-dasharray',pctVal+' 100');
  arc.setAttribute('stroke',ch.colour||'#22d3ee');
  if(pct)pct.textContent=pctVal+'%';
  if(verdict){verdict.textContent=ch.label||'';verdict.style.color=ch.colour||'#22d3ee';}
}
function setAll(on){items.forEach(function(c){c.checked=on;});render();}
function skip(){items.forEach(function(c){var idx=parseInt(c.getAttribute('data-idx'),10);c.checked=!keeps[idx];});render();}
items.forEach(function(c){c.addEventListener('change',render);});
if(runBtn)runBtn.addEventListener('click',function(){setAll(true);});
if(resetBtn)resetBtn.addEventListener('click',function(){setAll(false);});
if(skipBtn)skipBtn.addEventListener('click',skip);
setAll(false);
`;
    return { html, css, jsBody };
  },
};
