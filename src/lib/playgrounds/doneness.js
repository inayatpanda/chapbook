import { esc } from './index.js';

/**
 * Temperature / threshold explainer. A slider runs across a range; coloured zones
 * (each {from,label,colour,note}) show what happens where. The reading names the
 * current zone and explains it. Reusable for cooking (Maillard, doneness) or any
 * banded scale. No animation.
 */
export default {
  id: 'doneness',
  name: 'Temperature zones',
  category: 'food',
  description: 'A slider across a temperature range with coloured zones; the reading names the band and explains what happens there.',
  paramsSchema: {
    type: 'object', additionalProperties: false, required: ['zones'],
    properties: {
      title: { type: 'string' },
      unit: { type: 'string' },
      min: { type: 'number' },
      max: { type: 'number' },
      start: { type: 'number' },
      caption: { type: 'string' },
      zones: {
        type: 'array', maxItems: 8,
        items: {
          type: 'object', additionalProperties: false, required: ['from', 'label'],
          properties: {
            from: { type: 'number' },
            label: { type: 'string' },
            colour: { type: 'string' },
            note: { type: 'string' },
          },
        },
      },
    },
  },
  presets: [
    {
      name: 'Maillard at the pan',
      params: {
        title: 'How hot is the pan?', unit: '°C', min: 20, max: 240, start: 150,
        caption: 'Drag the temperature. Browning — and therefore flavour — only really starts around 140°C.',
        zones: [
          { from: 20, label: 'Just warm', colour: '#3a4a6e', note: 'Nothing much happens. Food added now will sweat and steam rather than colour.' },
          { from: 100, label: 'Boiling off water', colour: '#22d3ee', note: 'Surface moisture escapes. Until it has gone, the surface cannot get hotter than ~100°C, so it stays pale.' },
          { from: 140, label: 'Maillard browning', colour: '#fbbf24', note: 'The Maillard reaction kicks in: amino acids and sugars build hundreds of new flavour and aroma compounds. This is the brown crust you actually want.' },
          { from: 180, label: 'Caramelising', colour: '#f97316', note: 'Sugars themselves break down and caramelise — deeper, sweeter, faintly bitter notes.' },
          { from: 210, label: 'Burning', colour: '#ef4444', note: 'Past the useful range. Acrid, bitter compounds now dominate. Lower the heat.' },
        ],
      },
    },
    {
      name: 'Steak, by internal temperature',
      params: {
        title: 'Steak doneness', unit: '°C', min: 45, max: 80, start: 54,
        caption: 'Internal temperature, not time, is what actually decides doneness.',
        zones: [
          { from: 45, label: 'Rare', colour: '#ef4444', note: 'Cool red centre, very soft.' },
          { from: 52, label: 'Medium rare', colour: '#f97316', note: 'Warm red centre — where most cooks aim.' },
          { from: 57, label: 'Medium', colour: '#fbbf24', note: 'Pink throughout, firmer.' },
          { from: 63, label: 'Medium well', colour: '#a3b18a', note: 'Faint pink, noticeably drier.' },
          { from: 71, label: 'Well done', colour: '#9fb0c8', note: 'No pink, firm — and forgiving of cheaper cuts.' },
        ],
      },
    },
  ],
  build(params, domId) {
    const unit = typeof params.unit === 'string' ? params.unit : '';
    const min = Number.isFinite(params.min) ? params.min : 0;
    const max = Number.isFinite(params.max) ? params.max : 100;
    const start = Number.isFinite(params.start) ? params.start : Math.round((min + max) / 2);
    const title = params.title ? `<div class="dn-title">${esc(params.title)}</div>` : '';
    const capText = params.caption ? esc(params.caption) : '';

    const html =
      `<div class="pg-stage">` + title +
      `<div class="dn-readout"><b data-role="val">${esc(String(start) + unit)}</b><span class="dn-zone" data-role="zone">—</span></div>` +
      `<div class="dn-track" data-role="track"></div>` +
      `<input class="dn-slider" type="range" data-role="slider" min="${esc(String(min))}" max="${esc(String(max))}" value="${esc(String(start))}" step="1" aria-label="Temperature in ${esc(unit || 'degrees')}"/>` +
      `<div class="dn-note" data-role="note" aria-live="polite"></div>` +
      (capText ? `<div class="dn-cap">${capText}</div>` : '') +
      `</div>`;

    const css = [
      `#${domId} .pg-stage{display:grid;gap:.7rem}`,
      `#${domId} .dn-title{font-weight:600;color:var(--ink,#e9eef8)}`,
      `#${domId} .dn-readout{display:flex;flex-wrap:wrap;align-items:baseline;gap:.6rem}`,
      `#${domId} .dn-readout b{font-size:1.5rem;color:var(--ink,#fff);font-variant-numeric:tabular-nums}`,
      `#${domId} .dn-zone{font-weight:600}`,
      `#${domId} .dn-track{position:relative;height:16px;border-radius:8px;overflow:hidden;background:#0c1424;border:1px solid #2a3a5e}`,
      `#${domId} .dn-seg{position:absolute;top:0;bottom:0;opacity:.85}`,
      `#${domId} .dn-marker{position:absolute;top:-4px;width:3px;height:24px;background:#fff;border-radius:2px;box-shadow:0 0 6px rgba(255,255,255,.6);transform:translateX(-1.5px)}`,
      `#${domId} .dn-slider{width:100%;margin:0;accent-color:#2dd4bf}`,
      `#${domId} .dn-note{min-height:3.2em;color:var(--ink-dim,#cdd6ea);font-size:.95rem;line-height:1.5;border-left:2px solid #fbbf24;padding-left:.8rem}`,
      `#${domId} .dn-cap{color:var(--ink-dim,#9fb0c8);font-size:.85rem}`,
    ].join('\n');

    const jsBody = `
var zones=(CONFIG.zones||[]).slice().sort(function(a,b){return a.from-b.from;});
var unit=CONFIG.unit||'';
var min=(typeof CONFIG.min==='number')?CONFIG.min:0;
var max=(typeof CONFIG.max==='number')?CONFIG.max:100;
var slider=$('[data-role=slider]'),valEl=$('[data-role=val]'),zoneEl=$('[data-role=zone]'),noteEl=$('[data-role=note]'),track=$('[data-role=track]');
var marker=null;
function pct(v){if(max===min)return 0;return Math.max(0,Math.min(100,(v-min)/(max-min)*100));}
function zoneAt(v){var z=zones.length?zones[0]:null;for(var i=0;i<zones.length;i++){if(v>=zones[i].from)z=zones[i];}return z;}
function renderSegs(){if(!track)return;var h='';for(var i=0;i<zones.length;i++){var from=zones[i].from,to=(i+1<zones.length)?zones[i+1].from:max;var l=pct(from),w=pct(to)-pct(from);h+='<div class="dn-seg" style="left:'+l.toFixed(2)+'%;width:'+w.toFixed(2)+'%;background:'+(zones[i].colour||'#39496e')+'"></div>';}h+='<div class="dn-marker" data-role="marker"></div>';track.innerHTML=h;marker=$('[data-role=marker]');}
function upd(){if(!slider)return;var v=+slider.value;if(valEl)valEl.textContent=v+unit;var z=zoneAt(v);if(zoneEl){zoneEl.textContent=z?z.label:'';zoneEl.style.color=(z&&z.colour)?z.colour:'inherit';}if(noteEl)noteEl.textContent=(z&&z.note)?z.note:'';if(marker)marker.style.left=pct(v)+'%';}
renderSegs();
if(slider)slider.addEventListener('input',upd);
upd();
`;

    return { html, css, jsBody };
  },
};
