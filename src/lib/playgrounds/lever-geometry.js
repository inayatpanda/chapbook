/* Family: lever geometry — an SVG with a pivot, an arm/lever at an adjustable angle,
   and a line-of-pull at an adjustable angle. Computes the perpendicular moment arm
   (the cross-product term, length·sin(pull−arm)) live and reads out the turning
   effect as a 0..100% of the maximum, plus a banded verdict. Models a spanner on a
   bolt: a pull along the shaft cannot turn it; a pull square to the spanner turns it
   cleanly. Two sliders (arm angle, pull angle); all angles in degrees in the UI. */
import { esc } from './index.js';

const rangeSchema = {
  type: 'array', title: 'Angle range [min, max] in degrees',
  minItems: 2, maxItems: 2, items: { type: 'number' },
};

const bandSchema = {
  type: 'object', additionalProperties: false,
  required: ['max', 'label'],
  properties: {
    max: { type: 'number', title: 'Turning effect % up to which this band applies' },
    label: { type: 'string', title: 'Verdict text' },
    colour: { type: 'string', title: 'Verdict colour (hex)' },
  },
};

export default {
  id: 'lever-geometry',
  name: 'Lever geometry',
  category: 'quantitative',
  description: 'A pivot, an arm, and a line-of-pull — drag two angles to feel the moment arm. Turning-effect % + a banded verdict.',
  paramsSchema: {
    type: 'object', additionalProperties: false,
    properties: {
      title: { type: 'string', title: 'Optional label above the diagram' },
      armLabel: { type: 'string', title: 'Arm slider label', default: 'Arm angle' },
      pullLabel: { type: 'string', title: 'Pull slider label', default: 'Pull angle' },
      armRange: rangeSchema,
      pullRange: rangeSchema,
      armValue: { type: 'number', title: 'Initial arm angle (deg)' },
      pullValue: { type: 'number', title: 'Initial pull angle (deg)' },
      pivot: {
        type: 'object', additionalProperties: false,
        properties: { x: { type: 'number' }, y: { type: 'number' } },
      },
      length: { type: 'number', title: 'Arm length (SVG units)', default: 120 },
      outLabel: { type: 'string', title: 'Readout label', default: 'turning effect' },
      bands: { type: 'array', items: bandSchema },
    },
  },
  presets: [
    {
      name: 'Spanner on a bolt',
      params: {
        title: 'Why a spanner turns a bolt — and the geometry that lets it',
        armLabel: 'Spanner angle', pullLabel: 'Line of pull',
        armRange: [0, 150], pullRange: [0, 180],
        armValue: 20, pullValue: 110,
        outLabel: 'turning effect',
        bands: [
          { max: 20, label: 'will not turn — the pull runs almost along the shaft, into the bolt', colour: '#f472b6' },
          { max: 60, label: 'some turn, but mostly straining the bolt sideways', colour: '#fbbf24' },
          { max: 85, label: 'good leverage — most of the pull turns the bolt', colour: '#22d3ee' },
          { max: 100, label: 'turns cleanly — the pull is square to the spanner', colour: '#2dd4bf' },
        ],
      },
    },
    {
      name: 'Door hinge',
      params: {
        title: 'Push near the hinge, or out at the handle?',
        armLabel: 'Door angle', pullLabel: 'Push direction',
        armRange: [0, 90], pullRange: [0, 180],
        armValue: 30, pullValue: 120,
        outLabel: 'opening effect',
        bands: [
          { max: 25, label: 'barely moves — you are pushing toward the hinge', colour: '#f472b6' },
          { max: 70, label: 'opening, but wasting effort sideways', colour: '#fbbf24' },
          { max: 100, label: 'swings open — push square to the door', colour: '#2dd4bf' },
        ],
      },
    },
  ],
  build(params, domId) {
    const title = params.title ? `<div class="pg-lv-title">${esc(params.title)}</div>` : '';
    const armLabel = params.armLabel || 'Arm angle';
    const pullLabel = params.pullLabel || 'Pull angle';
    const armRange = Array.isArray(params.armRange) ? params.armRange : [0, 180];
    const pullRange = Array.isArray(params.pullRange) ? params.pullRange : [0, 180];
    const armValue = params.armValue == null ? armRange[0] : params.armValue;
    const pullValue = params.pullValue == null ? Math.round((pullRange[0] + pullRange[1]) / 2) : params.pullValue;
    const outLabel = params.outLabel || 'turning effect';
    const diagram =
      `<svg viewBox="0 0 280 260" role="img" aria-label="A pivot with an arm and a line of pull; the perpendicular moment arm is shown" class="pg-lv-svg">` +
      `<line data-role="ground" x1="20" y1="220" x2="260" y2="220" stroke="#23304a" stroke-width="2"/>` +
      `<line data-role="moment" stroke="#818cf8" stroke-width="2" stroke-dasharray="4 4"/>` +
      `<line data-role="arm" stroke="#2dd4bf" stroke-width="6" stroke-linecap="round"/>` +
      `<line data-role="pull" stroke="#22d3ee" stroke-width="3" stroke-linecap="round" marker-end="url(#${domId}-arrow)"/>` +
      `<defs><marker id="${domId}-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">` +
      `<path d="M0,0 L6,3 L0,6 Z" fill="#22d3ee"/></marker></defs>` +
      `<circle data-role="pivot" r="6" fill="#fff" stroke="#04060c" stroke-width="2"/>` +
      `</svg>`;
    const html =
      `<div class="pg-stage">${title}` +
      `<div class="pg-lv-grid">${diagram}` +
      `<div class="pg-lv-side">` +
      `<div class="pg-readout">${esc(outLabel)} <b data-role="out">0%</b></div>` +
      `<div class="pg-lv-verdict" data-role="verdict" aria-live="polite"></div>` +
      `</div></div>` +
      `<div class="pg-controls pg-lv-controls">` +
      `<div class="pg-field"><label for="${domId}-arm">${esc(armLabel)} <b data-role="armval"></b></label>` +
      `<input id="${domId}-arm" data-role="arm-in" type="range" min="${armRange[0]}" max="${armRange[1]}" step="1" value="${armValue}"></div>` +
      `<div class="pg-field"><label for="${domId}-pull">${esc(pullLabel)} <b data-role="pullval"></b></label>` +
      `<input id="${domId}-pull" data-role="pull-in" type="range" min="${pullRange[0]}" max="${pullRange[1]}" step="1" value="${pullValue}"></div>` +
      `</div></div>`;
    const css = [
      `#${domId} .pg-lv-title{font-size:.9rem;color:var(--ink-dim,#9fb3c8);margin:0 0 .7rem}`,
      `#${domId} .pg-lv-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem;align-items:center}`,
      `#${domId} .pg-lv-svg{width:100%;height:auto;display:block}`,
      `#${domId} .pg-lv-side{min-width:0}`,
      `#${domId} .pg-lv-verdict{margin:.6rem 0 0;font-weight:600}`,
      `#${domId} .pg-lv-controls{display:grid;gap:.9rem;margin-top:1.1rem}`,
      `#${domId} label b{color:#fff}`,
      `@media(max-width:620px){#${domId} .pg-lv-grid{grid-template-columns:1fr}}`,
    ].join('\n');
    const jsBody = `
var armIn=$('[data-role=arm-in]'),pullIn=$('[data-role=pull-in]');
var armEl=$('[data-role=arm]'),pullEl=$('[data-role=pull]'),momentEl=$('[data-role=moment]'),pivotEl=$('[data-role=pivot]');
var out=$('[data-role=out]'),verdict=$('[data-role=verdict]'),armVal=$('[data-role=armval]'),pullVal=$('[data-role=pullval]');
if(!armIn||!pullIn)return;
var P={x:140,y:170};
if(CONFIG.pivot){if(typeof CONFIG.pivot.x==='number')P.x=CONFIG.pivot.x;if(typeof CONFIG.pivot.y==='number')P.y=CONFIG.pivot.y;}
var LEN=(typeof CONFIG.length==='number'&&CONFIG.length>0)?CONFIG.length:120;
var RAD=Math.PI/180;
if(pivotEl){pivotEl.setAttribute('cx',P.x);pivotEl.setAttribute('cy',P.y);}
function tip(deg,len){return{x:P.x+Math.cos(-deg*RAD)*len,y:P.y+Math.sin(-deg*RAD)*len};}
function bands(){return (CONFIG.bands&&CONFIG.bands.length)?CONFIG.bands:[{max:100,label:'',colour:'#22d3ee'}];}
function redraw(){
  var arm=parseFloat(armIn.value)||0,pull=parseFloat(pullIn.value)||0;
  if(armVal)armVal.textContent=Math.round(arm)+'\\u00B0';
  if(pullVal)pullVal.textContent=Math.round(pull)+'\\u00B0';
  var aTip=tip(arm,LEN);
  if(armEl){armEl.setAttribute('x1',P.x);armEl.setAttribute('y1',P.y);armEl.setAttribute('x2',aTip.x.toFixed(1));armEl.setAttribute('y2',aTip.y.toFixed(1));}
  // pull vector drawn from the arm tip in the pull direction
  var pLen=70,pTip={x:aTip.x+Math.cos(-pull*RAD)*pLen,y:aTip.y+Math.sin(-pull*RAD)*pLen};
  if(pullEl){pullEl.setAttribute('x1',aTip.x.toFixed(1));pullEl.setAttribute('y1',aTip.y.toFixed(1));pullEl.setAttribute('x2',pTip.x.toFixed(1));pullEl.setAttribute('y2',pTip.y.toFixed(1));}
  // perpendicular moment arm = |length * sin(pull - arm)|, normalised to 0..100%
  var moment=Math.abs(LEN*Math.sin((pull-arm)*RAD));
  var pct=Math.round(Math.max(0,Math.min(1,moment/LEN))*100);
  // dashed perpendicular from pivot to the line of pull (foot of perpendicular)
  if(momentEl){
    var d=(pull-arm)*RAD,perp=LEN*Math.sin(d);
    var fx=aTip.x+Math.cos(-pull*RAD)*(-LEN*Math.cos(d)),fy=aTip.y+Math.sin(-pull*RAD)*(-LEN*Math.cos(d));
    momentEl.setAttribute('x1',P.x);momentEl.setAttribute('y1',P.y);momentEl.setAttribute('x2',fx.toFixed(1));momentEl.setAttribute('y2',fy.toFixed(1));
    momentEl.style.opacity=(Math.abs(perp)<2?'0':'1');
  }
  if(out)out.textContent=pct+'%';
  var bs=bands(),chosen=bs[bs.length-1];
  for(var i=0;i<bs.length;i++){if(pct<=bs[i].max){chosen=bs[i];break;}}
  if(verdict){verdict.textContent=chosen.label||'';verdict.style.color=chosen.colour||'#22d3ee';}
}
armIn.addEventListener('input',redraw);
pullIn.addEventListener('input',redraw);
redraw();
`;
    return { html, css, jsBody };
  },
};
