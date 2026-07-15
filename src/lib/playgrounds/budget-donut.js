import { esc } from './index.js';

const PALETTE = ['#2dd4bf', '#22d3ee', '#818cf8', '#f472b6', '#fbbf24', '#34d399'];

export default {
  id: 'budget-donut',
  name: 'Budget split',
  category: 'tool',
  description: 'Split an income across categories with sliders and watch the donut and the cash amounts update live.',
  paramsSchema: {
    type: 'object', additionalProperties: false, required: ['categories'],
    properties: {
      title: { type: 'string' },
      income: { type: 'number', default: 2000, minimum: 0 },
      currency: { type: 'string', default: '£' },
      categories: { type: 'array', minItems: 2, maxItems: 6, items: {
        type: 'object', additionalProperties: false, required: ['name', 'pct'],
        properties: {
          name: { type: 'string' },
          pct: { type: 'number', minimum: 0, maximum: 100 },
          colour: { type: 'string' },
        } } },
      caption: { type: 'string' },
    },
  },
  presets: [
    { name: 'The 50/30/20 rule', params: {
      title: 'The 50/30/20 rule', income: 2000, currency: '£',
      categories: [
        { name: 'Needs', pct: 50 },
        { name: 'Wants', pct: 30 },
        { name: 'Savings', pct: 20 },
      ],
      caption: 'A rough rule of thumb: half on needs, a third on wants, the rest saved.' } },
    { name: 'Where the salary goes', params: {
      title: 'Where the salary goes', income: 2500, currency: '£',
      categories: [
        { name: 'Rent', pct: 35 },
        { name: 'Food', pct: 15 },
        { name: 'Transport', pct: 10 },
        { name: 'Fun', pct: 20 },
        { name: 'Savings', pct: 20 },
      ] } },
  ],
  build(params, domId) {
    const cats = (Array.isArray(params.categories) ? params.categories : []).slice(0, 6).map((c, i) => {
      const colour = /^#[0-9a-fA-F]{3,8}$/.test(c && c.colour || '') ? c.colour : PALETTE[i % PALETTE.length];
      const pct = Math.max(0, Math.min(100, Math.round(Number(c && c.pct) || 0)));
      return { name: String(c && c.name != null ? c.name : `Category ${i + 1}`), pct, colour };
    });
    const income = Math.max(0, Number(params.income) || 0);
    const currency = typeof params.currency === 'string' && params.currency ? params.currency : '£';
    const title = params.title ? `<div class="pg-bd-title">${esc(params.title)}</div>` : '';
    const caption = params.caption ? `<div class="pg-bd-cap">${esc(params.caption)}</div>` : '';

    const rows = cats.map((c, i) =>
      `<div class="pg-field pg-bd-row" data-role="row" data-i="${i}" data-colour="${esc(c.colour)}">` +
        `<label><b><span class="pg-bd-swatch" style="background:${esc(c.colour)}"></span>${esc(c.name)}</b>` +
          `<span class="pg-readout"><span data-role="pct">${c.pct}</span>% · ` +
          `<span data-role="cash">${currency}0</span></span>` +
        `</label>` +
        `<input type="range" min="0" max="100" step="1" value="${c.pct}" data-role="slider" ` +
          `aria-label="${esc(c.name)} percentage">` +
      `</div>`).join('');

    const svg =
      `<svg class="pg-bd-svg" viewBox="0 0 120 120" role="img" aria-label="Budget donut chart">` +
        `<circle cx="60" cy="60" r="42" class="pg-bd-track"></circle>` +
        `<g data-role="arcs" transform="rotate(-90 60 60)"></g>` +
        `<text x="60" y="56" text-anchor="middle" class="pg-bd-cx" data-role="centre-pct">100%</text>` +
        `<text x="60" y="72" text-anchor="middle" class="pg-bd-cs">allocated</text>` +
      `</svg>`;

    const html =
      `<div class="pg-stage">` +
        title +
        `<div class="pg-bd-wrap">` +
          `<div class="pg-bd-chart">${svg}</div>` +
          `<div class="pg-controls pg-bd-controls">${rows}</div>` +
        `</div>` +
        `<div class="pg-bd-foot">` +
          `<span class="pg-readout">Income <b data-role="income">${currency}0</b></span>` +
          `<span class="pg-bd-note" data-role="note"></span>` +
        `</div>` +
        caption +
      `</div>`;

    const css = [
      `#${domId} .pg-bd-title{font-weight:700;font-size:1.05rem;margin-bottom:.6rem}`,
      `#${domId} .pg-bd-wrap{display:flex;flex-direction:column;gap:1rem;align-items:center}`,
      `@media(min-width:560px){#${domId} .pg-bd-wrap{flex-direction:row;align-items:flex-start}}`,
      `#${domId} .pg-bd-chart{flex:0 0 auto}`,
      `#${domId} .pg-bd-svg{width:160px;height:160px;display:block}`,
      `#${domId} .pg-bd-track{fill:none;stroke:rgba(140,160,200,.12);stroke-width:14}`,
      `#${domId} .pg-bd-seg{fill:none;stroke-width:14;transition:stroke-dasharray .35s ease}`,
      `#${domId}.pg-bd-reduce .pg-bd-seg{transition:none}`,
      `#${domId} .pg-bd-cx{fill:#e9eef8;font-size:15px;font-weight:700}`,
      `#${domId} .pg-bd-cs{fill:#9fb0cc;font-size:7px;letter-spacing:.08em;text-transform:uppercase}`,
      `#${domId} .pg-bd-controls{flex:1 1 auto;display:flex;flex-direction:column;gap:.7rem;width:100%}`,
      `#${domId} .pg-bd-row label{display:flex;justify-content:space-between;align-items:center;gap:.6rem;font-size:.9rem;margin-bottom:.25rem}`,
      `#${domId} .pg-bd-row label b{display:flex;align-items:center;gap:.45rem;font-weight:600}`,
      `#${domId} .pg-bd-swatch{display:inline-block;width:11px;height:11px;border-radius:3px;flex:0 0 auto}`,
      `#${domId} .pg-bd-row .pg-readout{color:#cdd6e6;white-space:nowrap;font-variant-numeric:tabular-nums}`,
      `#${domId} .pg-bd-row input[type=range]{width:100%}`,
      `#${domId} .pg-bd-foot{display:flex;justify-content:space-between;align-items:baseline;gap:.8rem;flex-wrap:wrap;margin-top:1rem;font-size:.92rem}`,
      `#${domId} .pg-bd-foot .pg-readout b{color:#e9eef8}`,
      `#${domId} .pg-bd-note{color:#fbbf24;font-weight:600}`,
      `#${domId} .pg-bd-note.ok{color:#2dd4bf}`,
      `#${domId} .pg-bd-cap{margin-top:.7rem;color:#9fb0cc;font-size:.85rem}`,
    ].join('\n');

    const jsBody = `
if(reduced)root.classList.add('pg-bd-reduce');
var NS='http://www.w3.org/2000/svg';
var R=42, CIRC=2*Math.PI*R;
var income=Math.max(0, Number(CONFIG.income)||0);
var currency=(typeof CONFIG.currency==='string'&&CONFIG.currency)?CONFIG.currency:'£';
var arcs=$('[data-role=arcs]');
var rows=$$('[data-role=row]');
var centrePct=$('[data-role=centre-pct]');
var note=$('[data-role=note]');
var incomeEl=$('[data-role=income]');
if(!arcs||!rows.length)return;
function money(n){return currency+Math.round(n).toLocaleString('en-GB');}
var segs=rows.map(function(row){
  var c=row.getAttribute('data-colour')||'#22d3ee';
  var seg=document.createElementNS(NS,'circle');
  seg.setAttribute('class','pg-bd-seg');
  seg.setAttribute('cx','60');seg.setAttribute('cy','60');seg.setAttribute('r',String(R));
  seg.setAttribute('stroke',c);
  arcs.appendChild(seg);
  return seg;
});
if(incomeEl)incomeEl.textContent=money(income);
function render(){
  var total=0, offset=0;
  rows.forEach(function(row){ total+=Number(row.querySelector('[data-role=slider]').value)||0; });
  rows.forEach(function(row,i){
    var pct=Number(row.querySelector('[data-role=slider]').value)||0;
    row.querySelector('[data-role=pct]').textContent=pct;
    row.querySelector('[data-role=cash]').textContent=money(income*pct/100);
    var len=CIRC*pct/100;
    segs[i].setAttribute('stroke-dasharray',len+' '+(CIRC-len));
    segs[i].setAttribute('stroke-dashoffset',String(-offset));
    offset+=len;
  });
  if(centrePct)centrePct.textContent=total+'%';
  if(note){
    if(total<100){ note.textContent=(100-total)+'% unallocated'; note.classList.remove('ok'); }
    else if(total>100){ note.textContent='over by '+(total-100)+'%'; note.classList.remove('ok'); }
    else { note.textContent='fully allocated'; note.classList.add('ok'); }
  }
}
rows.forEach(function(row){
  row.querySelector('[data-role=slider]').addEventListener('input',render);
});
render();
`;
    return { html, css, jsBody };
  },
};
