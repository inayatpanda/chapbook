/* Family: gauge dial — a semicircular gauge with coloured zones and a needle,
   driven by a slider. For any single value read against a scale (a score, a
   pressure, a charge level, a temperature reading). */
import { esc } from './index.js';

export default {
  id: 'gauge-dial',
  name: 'Gauge dial',
  category: 'explorer',
  description: 'A semicircular gauge with coloured zones and a needle, moved by a slider. For a single value against a scale.',
  paramsSchema: {
    type: 'object', additionalProperties: false,
    required: ['min', 'max', 'value'],
    properties: {
      title: { type: 'string', title: 'Optional label above the gauge' },
      min: { type: 'number', title: 'Scale minimum', default: 0 },
      max: { type: 'number', title: 'Scale maximum', default: 100 },
      value: { type: 'number', title: 'Starting value', default: 50 },
      unit: { type: 'string', title: 'Unit suffix (e.g. %, mmHg)', default: '' },
      zones: {
        type: 'array', title: 'Coloured zones (low→high)', maxItems: 6,
        items: {
          type: 'object', additionalProperties: false, required: ['from', 'to', 'colour'],
          properties: { from: { type: 'number' }, to: { type: 'number' }, colour: { type: 'string' }, label: { type: 'string' } },
        },
      },
      caption: { type: 'string', title: 'One-line caption' },
    },
  },
  presets: [
    {
      name: 'Trail grade',
      params: { title: 'A walking-trail difficulty grade', min: 0, max: 10, value: 3, unit: '',
        zones: [{ from: 0, to: 3, colour: '#2dd4bf', label: 'easy' }, { from: 3, to: 7, colour: '#fbbf24', label: 'moderate' }, { from: 7, to: 10, colour: '#f472b6', label: 'tough' }],
        caption: 'Drag the needle — note how the same number lands in a different band.' },
    },
    {
      name: 'Battery charge',
      params: { title: 'Laptop battery charge', min: 80, max: 100, value: 97, unit: '%',
        zones: [{ from: 80, to: 92, colour: '#f472b6', label: 'topping up' }, { from: 92, to: 95, colour: '#fbbf24', label: 'nearly full' }, { from: 95, to: 100, colour: '#2dd4bf', label: 'full' }],
        caption: 'Illustrative zones, not a real reading.' },
    },
  ],
  build(params, domId) {
    const min = Number(params.min ?? 0), max = Number(params.max ?? 100);
    const value = Number(params.value ?? (min + max) / 2);
    const unit = esc(params.unit || '');
    const title = params.title ? `<div class="pg-gd-title">${esc(params.title)}</div>` : '';
    const caption = params.caption ? `<div class="pg-readout" data-role="cap">${esc(params.caption)}</div>` : '';
    // fixed semicircle track: centre (100,100), r 84 → P(180)=(16,100), P(0)=(184,100)
    const html =
      `<div class="pg-stage">${title}` +
      `<svg class="pg-gd-svg" viewBox="0 0 200 120" data-role="svg" role="img" aria-label="gauge">` +
      `<path d="M 16 100 A 84 84 0 0 1 184 100" fill="none" stroke="rgba(140,160,200,.18)" stroke-width="12" stroke-linecap="round"></path>` +
      `<g data-role="zones"></g>` +
      `<line data-role="needle" x1="100" y1="100" x2="100" y2="20" stroke="#e9eef8" stroke-width="3" stroke-linecap="round"></line>` +
      `<circle cx="100" cy="100" r="7" fill="#e9eef8"></circle>` +
      `</svg>` +
      `<div class="pg-gd-out pg-readout" data-role="out" aria-live="polite"></div>` +
      `<div class="pg-row"><label style="flex:1">Value
         <input type="range" data-role="slider" min="${min}" max="${max}" value="${value}" step="${(max - min) > 20 ? 1 : 'any'}" aria-label="Value"></label></div>` +
      caption + `</div>`;
    const css = [
      `#${domId} .pg-gd-title{font-size:.9rem;color:var(--ink-dim,#9fb3c8);margin:0 0 .5rem}`,
      `#${domId} .pg-gd-svg{display:block;width:100%;max-width:360px;margin-inline:auto}`,
      `#${domId} .pg-gd-out{text-align:center;font-size:1.3rem;font-weight:700;margin:.2rem 0 .6rem}`,
      `#${domId} [data-role=needle]{transition:transform .25s ease}`,
      `#${domId} .pg-gd-reduce [data-role=needle]{transition:none}`,
    ].join('\n');
    const jsBody = `
var svg=$('[data-role=svg]'),needle=$('[data-role=needle]'),out=$('[data-role=out]'),slider=$('[data-role=slider]'),zg=$('[data-role=zones]');
if(!svg||!needle||!out)return;
if(reduced)root.classList.add('pg-gd-reduce');
var min=${min},max=${max},unit=${JSON.stringify(unit)},span=(max-min)||1;
var cx=100,cy=100,R=84;
function ang(v){return 180-180*((v-min)/span);}           // degrees, 180=left … 0=right
function pt(a,r){var t=a*Math.PI/180;return [cx+r*Math.cos(t), cy-r*Math.sin(t)];}
function arc(a0,a1,r){var p0=pt(a0,r),p1=pt(a1,r),large=Math.abs(a0-a1)>180?1:0;return 'M '+p0[0].toFixed(2)+' '+p0[1].toFixed(2)+' A '+r+' '+r+' 0 '+large+' 1 '+p1[0].toFixed(2)+' '+p1[1].toFixed(2);}
(CONFIG.zones||[]).forEach(function(z){
  var a0=ang(Math.max(min,z.from)),a1=ang(Math.min(max,z.to));
  var p=document.createElementNS('http://www.w3.org/2000/svg','path');
  p.setAttribute('d',arc(a0,a1,R)); p.setAttribute('fill','none');
  p.setAttribute('stroke',z.colour||'#22d3ee'); p.setAttribute('stroke-width','12');
  zg.appendChild(p);
});
function zoneLabel(v){var hit=null;(CONFIG.zones||[]).forEach(function(z){if(v>=z.from&&v<=z.to)hit=z;});return hit&&hit.label?hit.label:'';}
function fmt(v){return (Math.round(v*10)/10).toString();}
function set(v){
  v=Math.max(min,Math.min(max,v));
  var a=ang(v),tip=pt(a,R-14);
  needle.setAttribute('x2',tip[0].toFixed(2)); needle.setAttribute('y2',tip[1].toFixed(2));
  var lbl=zoneLabel(v);
  out.textContent=fmt(v)+unit+(lbl?(' · '+lbl):'');
}
if(slider)slider.addEventListener('input',function(){set(parseFloat(slider.value));});
set(${value});
`;
    return { html, css, jsBody };
  },
};
