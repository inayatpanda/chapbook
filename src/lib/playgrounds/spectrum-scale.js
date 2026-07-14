import { esc } from './index.js';

export default {
  id: 'spectrum-scale',
  name: 'Spectrum scale',
  category: 'explorer',
  description: 'Drag a value along a horizontal colour-banded scale (the linear cousin of a gauge) — pH, spiciness, temperature, magnitude and the like.',
  paramsSchema: {
    type: 'object', additionalProperties: false, required: ['min', 'max', 'value', 'bands'],
    properties: {
      title: { type: 'string' },
      min: { type: 'number', default: 0 },
      max: { type: 'number', default: 14 },
      value: { type: 'number', default: 7 },
      unit: { type: 'string', default: '' },
      bands: {
        type: 'array', minItems: 2, maxItems: 7, items: {
          type: 'object', additionalProperties: false, required: ['from', 'to', 'colour', 'label'],
          properties: {
            from: { type: 'number' },
            to: { type: 'number' },
            colour: { type: 'string' },
            label: { type: 'string' },
          },
        },
      },
      caption: { type: 'string' },
    },
  },
  presets: [
    { name: 'The pH scale', params: {
      title: 'The pH scale', min: 0, max: 14, value: 7, unit: '',
      bands: [
        { from: 0, to: 6, colour: '#f472b6', label: 'acidic' },
        { from: 6, to: 8, colour: '#34d399', label: 'neutral' },
        { from: 8, to: 14, colour: '#818cf8', label: 'alkaline' },
      ],
      caption: '7 is neutral; lower is more acidic, higher more alkaline.' } },
    { name: 'How spicy? (Scoville, roughly)', params: {
      title: 'How spicy? (Scoville, roughly)', min: 0, max: 100, value: 30, unit: 'k SHU',
      bands: [
        { from: 0, to: 10, colour: '#2dd4bf', label: 'mild' },
        { from: 10, to: 40, colour: '#fbbf24', label: 'warm' },
        { from: 40, to: 70, colour: '#fb7185', label: 'hot' },
        { from: 70, to: 100, colour: '#f472b6', label: 'ouch' },
      ],
      caption: 'Thousands of Scoville heat units — drag to taste.' } },
  ],
  build(params, domId) {
    const min = Number.isFinite(params.min) ? params.min : 0;
    let max = Number.isFinite(params.max) ? params.max : 14;
    if (max <= min) max = min + 1;
    const span = max - min;
    const colourOk = (c) => /^#[0-9a-fA-F]{3,8}$/.test(String(c || ''));
    let bands = Array.isArray(params.bands) ? params.bands.slice(0, 7) : [];
    bands = bands
      .filter((b) => b && Number.isFinite(b.from) && Number.isFinite(b.to))
      .map((b) => ({
        from: Math.max(min, Math.min(max, Math.min(b.from, b.to))),
        to: Math.max(min, Math.min(max, Math.max(b.from, b.to))),
        colour: colourOk(b.colour) ? b.colour : '#2dd4bf',
        label: String(b.label == null ? '' : b.label),
      }));
    if (bands.length < 2) {
      bands = [
        { from: min, to: min + span / 2, colour: '#2dd4bf', label: 'low' },
        { from: min + span / 2, to: max, colour: '#818cf8', label: 'high' },
      ];
    }
    let value = Number.isFinite(params.value) ? params.value : min + span / 2;
    value = Math.max(min, Math.min(max, value));
    const unit = String(params.unit == null ? '' : params.unit);
    const title = params.title ? `<div class="pg-ss-title">${esc(params.title)}</div>` : '';
    const caption = params.caption ? `<div class="pg-ss-caption">${esc(params.caption)}</div>` : '';

    // A sensible slider step: ~200 steps across the range, snapped to a tidy size.
    let step = span / 200;
    const mag = Math.pow(10, Math.floor(Math.log10(step)));
    step = mag; // round down to the magnitude for clean values

    const segHtml = bands.map((b) => {
      const share = Math.max(0, (b.to - b.from) / span) * 100;
      return `<span class="pg-ss-seg" data-role="seg" style="flex:0 0 ${share}%;background:${b.colour}">` +
        `<span class="pg-ss-seglabel">${esc(b.label)}</span></span>`;
    }).join('');

    const html =
      `<div class="pg-stage">` +
        title +
        `<div class="pg-ss-wrap">` +
          `<div class="pg-ss-marker" data-role="marker"><span class="pg-ss-tri"></span></div>` +
          `<div class="pg-ss-bar" data-role="bar">${segHtml}</div>` +
        `</div>` +
        `<div class="pg-ss-controls pg-controls">` +
          `<div class="pg-row pg-ss-scaleends"><span data-role="endmin"></span><span data-role="endmax"></span></div>` +
          `<input type="range" data-role="slider" aria-label="value">` +
        `</div>` +
        `<div class="pg-readout pg-ss-readout">` +
          `<span class="pg-ss-num" data-role="readval"></span>` +
          `<span class="pg-ss-band" data-role="readband"></span>` +
        `</div>` +
        caption +
      `</div>`;

    const css = [
      `#${domId} .pg-ss-title{font-weight:700;margin-bottom:.6rem;color:var(--ink,#e9eef8)}`,
      `#${domId} .pg-ss-wrap{position:relative;padding-top:18px}`,
      `#${domId} .pg-ss-bar{display:flex;width:100%;height:26px;border-radius:8px;overflow:hidden;border:1px solid var(--line,#23304a)}`,
      `#${domId} .pg-ss-seg{position:relative;display:flex;align-items:center;justify-content:center;min-width:0}`,
      `#${domId} .pg-ss-seglabel{font-size:.62rem;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:rgba(4,6,12,.78);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 .2rem}`,
      `#${domId} .pg-ss-marker{position:absolute;top:0;left:0;transform:translateX(-50%);transition:left .18s ease;will-change:left}`,
      `#${domId} .pg-ss-tri{display:block;width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:9px solid var(--ink,#e9eef8);filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))}`,
      `#${domId} .pg-ss-controls{margin-top:.7rem}`,
      `#${domId} .pg-ss-scaleends{display:flex;justify-content:space-between;font-size:.72rem;color:var(--ink-dim,#9fb0c8);margin-bottom:.2rem}`,
      `#${domId} input[type=range][data-role=slider]{width:100%;accent-color:#22d3ee}`,
      `#${domId} .pg-ss-readout{margin-top:.7rem;display:flex;align-items:baseline;gap:.6rem;flex-wrap:wrap}`,
      `#${domId} .pg-ss-num{font-size:1.4rem;font-weight:800;color:var(--ink,#e9eef8);font-variant-numeric:tabular-nums}`,
      `#${domId} .pg-ss-band{font-size:.85rem;font-weight:700;padding:.15rem .55rem;border-radius:999px;border:1px solid currentColor}`,
      `#${domId} .pg-ss-caption{margin:.6rem 0 0;font-size:.82rem;color:var(--ink-dim,#9fb0c8)}`,
      `#${domId}.pg-ss-reduce .pg-ss-marker{transition:none}`,
    ].join('\n');

    const jsBody = `
var MIN=${min}, MAX=${max}, SPAN=${span};
var UNIT=${JSON.stringify(unit)};
var BANDS=${JSON.stringify(bands)};
if(reduced)root.classList.add('pg-ss-reduce');
var slider=$('[data-role=slider]'); if(!slider)return;
var marker=$('[data-role=marker]');
var readVal=$('[data-role=readval]');
var readBand=$('[data-role=readband]');
var endMin=$('[data-role=endmin]'), endMax=$('[data-role=endmax]');
var STEP=${step};
slider.min=String(MIN); slider.max=String(MAX); slider.step=String(STEP); slider.value=String(${value});
// Decimal places to show, derived from the step size.
var DP=Math.max(0, -Math.floor(Math.log10(STEP)));
function fmt(n){ var r=Math.round(n*Math.pow(10,DP))/Math.pow(10,DP); return r.toFixed(DP); }
if(endMin)endMin.textContent=fmt(MIN)+(UNIT?(' '+UNIT):'');
if(endMax)endMax.textContent=fmt(MAX)+(UNIT?(' '+UNIT):'');
function activeBand(v){
  for(var i=0;i<BANDS.length;i++){ if(v>=BANDS[i].from && v<=BANDS[i].to) return BANDS[i]; }
  return BANDS[BANDS.length-1];
}
function update(){
  var v=parseFloat(slider.value); if(!isFinite(v))v=MIN;
  var pct=SPAN>0?((v-MIN)/SPAN)*100:0;
  pct=Math.max(0,Math.min(100,pct));
  if(marker)marker.style.left=pct+'%';
  var b=activeBand(v);
  if(readVal)readVal.textContent=fmt(v)+(UNIT?(' '+UNIT):'');
  if(readBand){ readBand.textContent=b.label; readBand.style.color=b.colour; }
}
slider.addEventListener('input',update);
update();
`;

    return { html, css, jsBody };
  },
};
