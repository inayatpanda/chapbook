import { esc } from './index.js';

export default {
  id: 'recipe-scaler',
  name: 'Recipe scaler',
  category: 'tool',
  description: 'Scale a recipe’s ingredients up or down by dragging the servings slider.',
  paramsSchema: {
    type: 'object', additionalProperties: false, required: ['ingredients'],
    properties: {
      title: { type: 'string' },
      baseServings: { type: 'number', default: 4, minimum: 1 },
      caption: { type: 'string' },
      ingredients: { type: 'array', minItems: 1, maxItems: 14, items: {
        type: 'object', additionalProperties: false, required: ['name', 'qty', 'unit'],
        properties: {
          name: { type: 'string' },
          qty: { type: 'number' },
          unit: { type: 'string' },
        } } },
    },
  },
  presets: [
    { name: 'American pancakes', params: {
      title: 'American pancakes', baseServings: 4,
      ingredients: [
        { name: 'Plain flour', qty: 200, unit: 'g' },
        { name: 'Milk', qty: 300, unit: 'ml' },
        { name: 'Eggs', qty: 2, unit: '' },
        { name: 'Baking powder', qty: 2, unit: 'tsp' },
        { name: 'Butter', qty: 30, unit: 'g' },
      ] } },
    { name: 'Negroni', params: {
      title: 'Negroni', baseServings: 1,
      ingredients: [
        { name: 'Gin', qty: 30, unit: 'ml' },
        { name: 'Campari', qty: 30, unit: 'ml' },
        { name: 'Sweet vermouth', qty: 30, unit: 'ml' },
        { name: 'Orange', qty: 1, unit: 'slice' },
      ] } },
  ],
  build(params, domId) {
    const baseServings = Math.max(1, Math.round(Number(params.baseServings) || 4));
    const ingredients = (Array.isArray(params.ingredients) ? params.ingredients.slice(0, 14) : [])
      .map((g) => ({ name: String(g && g.name != null ? g.name : ''), qty: Number(g && g.qty), unit: String(g && g.unit != null ? g.unit : '') }))
      .filter((g) => isFinite(g.qty));
    const title = params.title ? `<div class="pg-rs-title">${esc(params.title)}</div>` : '';
    const caption = params.caption ? `<div class="pg-rs-caption">${esc(params.caption)}</div>` : '';
    const maxServings = 24;
    const start = Math.min(maxServings, Math.max(1, baseServings));

    const rows = ingredients.map((g) =>
      `<li class="pg-rs-row" data-role="ingredient" data-qty="${g.qty}" data-unit="${esc(g.unit)}">` +
      `<span class="pg-rs-name">${esc(g.name)}</span>` +
      `<span class="pg-rs-amt"><b class="pg-rs-num" data-role="num">${g.qty}</b>` +
      (g.unit ? `<span class="pg-rs-unit">${esc(g.unit)}</span>` : '') + `</span>` +
      `</li>`).join('');

    const html =
      `<div class="pg-stage">` +
        title +
        `<div class="pg-controls">` +
          `<label class="pg-field"><b>Servings</b>` +
            `<input type="range" data-role="servings" min="1" max="${maxServings}" step="1" value="${start}">` +
          `</label>` +
          `<div class="pg-readout">for <b data-role="count">${start}</b> serving<span data-role="plural">${start === 1 ? '' : 's'}</span></div>` +
        `</div>` +
        `<ul class="pg-rs-list" data-base="${baseServings}">${rows}</ul>` +
        caption +
      `</div>`;

    const css = [
      `#${domId} .pg-rs-title{font-weight:700;font-size:1.05rem;margin:0 0 .6rem;color:var(--ink,#e9eef8)}`,
      `#${domId} .pg-controls{display:flex;flex-direction:column;gap:.5rem;margin-bottom:.9rem}`,
      `#${domId} .pg-field{display:flex;flex-direction:column;gap:.35rem;font-size:.85rem;color:var(--ink-dim,#cdd6e6)}`,
      `#${domId} .pg-field b{font-weight:600;letter-spacing:.02em}`,
      `#${domId} input[type=range]{width:100%;accent-color:#2dd4bf;cursor:pointer}`,
      `#${domId} .pg-readout{font-size:.95rem;color:var(--ink-dim,#cdd6e6)}`,
      `#${domId} .pg-readout b{color:#22d3ee;font-size:1.15rem}`,
      `#${domId} .pg-rs-list{list-style:none;margin:0;padding:0;border-top:1px solid var(--line,#23304a)}`,
      `#${domId} .pg-rs-row{display:flex;align-items:baseline;justify-content:space-between;gap:1rem;padding:.5rem .1rem;border-bottom:1px solid var(--line,#23304a)}`,
      `#${domId} .pg-rs-name{color:var(--ink,#e9eef8)}`,
      `#${domId} .pg-rs-amt{display:flex;align-items:baseline;gap:.3rem;white-space:nowrap;font-variant-numeric:tabular-nums}`,
      `#${domId} .pg-rs-num{color:#fbbf24;font-weight:700}`,
      `#${domId} .pg-rs-unit{color:var(--ink-dim,#cdd6e6);font-size:.85rem}`,
      `#${domId} .pg-rs-caption{margin-top:.7rem;font-size:.8rem;color:var(--ink-dim,#9fb0c8)}`,
    ].join('\n');

    const jsBody = `
var slider=$('[data-role=servings]');
var list=$('.pg-rs-list');
if(!slider||!list)return;
var base=parseFloat(list.getAttribute('data-base'))||1;
var countEl=$('[data-role=count]'), pluralEl=$('[data-role=plural]');
var rows=$$('[data-role=ingredient]');
function fmt(n){
  if(!isFinite(n))return '0';
  var r=Math.round(n*10)/10;
  if(Math.abs(r-Math.round(r))<1e-9)return String(Math.round(r));
  return r.toFixed(1);
}
function recompute(){
  var servings=parseInt(slider.value,10)||1;
  if(countEl)countEl.textContent=String(servings);
  if(pluralEl)pluralEl.textContent=servings===1?'':'s';
  rows.forEach(function(row){
    var qty=parseFloat(row.getAttribute('data-qty'))||0;
    var num=row.querySelector('[data-role=num]');
    if(num)num.textContent=fmt(qty*servings/base);
  });
}
slider.addEventListener('input',recompute);
recompute();
`;

    return { html, css, jsBody };
  },
};
