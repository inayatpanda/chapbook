import { esc } from './index.js';

export default {
  id: 'tip-split',
  name: 'Tip & split',
  category: 'tool',
  description: 'Split a bill with a tip across a group and see the cost per person live.',
  paramsSchema: {
    type: 'object', additionalProperties: false, required: [],
    properties: {
      title: { type: 'string' },
      bill: { type: 'number', default: 60, minimum: 0, maximum: 300 },
      tipPct: { type: 'number', default: 12.5, minimum: 0, maximum: 30 },
      people: { type: 'number', default: 2, minimum: 1, maximum: 12 },
      currency: { type: 'string', default: '£' },
    },
  },
  presets: [
    { name: 'Splitting dinner', params: { title: 'Splitting dinner', bill: 84, tipPct: 12.5, people: 4, currency: '£' } },
    { name: 'Coffee round', params: { title: 'Coffee round', bill: 18.5, tipPct: 0, people: 5, currency: '£' } },
  ],
  build(params, domId) {
    const clamp = (v, lo, hi, d) => {
      const n = Number(v);
      return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
    };
    const bill = clamp(params.bill, 0, 300, 60);
    const tipPct = clamp(params.tipPct, 0, 30, 12.5);
    const people = Math.round(clamp(params.people, 1, 12, 2));
    const currency = typeof params.currency === 'string' && params.currency ? params.currency.slice(0, 3) : '£';
    const title = params.title ? `<div class="pg-ts-title">${esc(params.title)}</div>` : '';

    const html =
      `<div class="pg-stage">${title}` +
      `<div class="pg-controls">` +
        `<div class="pg-field">` +
          `<label>Bill <b data-role="bill-val">${esc(currency)}${bill.toFixed(2)}</b></label>` +
          `<input type="range" data-role="bill" min="0" max="300" step="1" value="${bill}">` +
        `</div>` +
        `<div class="pg-field">` +
          `<label>Tip <b data-role="tip-val">${tipPct}%</b></label>` +
          `<input type="range" data-role="tip" min="0" max="30" step="0.5" value="${tipPct}">` +
        `</div>` +
        `<div class="pg-field">` +
          `<label>People <b data-role="people-val">${people}</b></label>` +
          `<input type="range" data-role="people" min="1" max="12" step="1" value="${people}">` +
        `</div>` +
      `</div>` +
      `<div class="pg-readout">` +
        `<div class="pg-ts-line"><span>Tip amount</span><b data-role="tip-amt">—</b></div>` +
        `<div class="pg-ts-line"><span>Total</span><b data-role="total">—</b></div>` +
        `<div class="pg-ts-line pg-ts-per"><span>Per person</span><b data-role="per">—</b></div>` +
      `</div>` +
      `</div>`;

    const css = [
      `#${domId} .pg-ts-title{font-weight:600;color:#e9eef8;margin-bottom:.8rem}`,
      `#${domId} .pg-controls{display:grid;gap:.9rem;margin-bottom:1rem}`,
      `#${domId} .pg-field label{display:flex;justify-content:space-between;align-items:baseline;gap:1rem;font-size:.9rem;color:#cdd6e6;margin-bottom:.35rem}`,
      `#${domId} .pg-field label b{color:#22d3ee;font-variant-numeric:tabular-nums}`,
      `#${domId} .pg-field input[type=range]{width:100%;accent-color:#2dd4bf;cursor:pointer}`,
      `#${domId} .pg-readout{display:grid;gap:.5rem;padding:.9rem 1rem;border-radius:12px;border:1px solid #23304a;background:rgba(140,160,200,.06)}`,
      `#${domId} .pg-ts-line{display:flex;justify-content:space-between;align-items:baseline;gap:1rem}`,
      `#${domId} .pg-ts-line span{color:#cdd6e6;font-size:.9rem}`,
      `#${domId} .pg-ts-line b{color:#e9eef8;font-variant-numeric:tabular-nums}`,
      `#${domId} .pg-ts-per{padding-top:.5rem;border-top:1px solid #23304a}`,
      `#${domId} .pg-ts-per span{color:#e9eef8;font-weight:600}`,
      `#${domId} .pg-ts-per b{color:#818cf8;font-size:1.25rem;font-weight:700}`,
    ].join('\n');

    const jsBody = `
var cur = CONFIG.currency && typeof CONFIG.currency === 'string' ? CONFIG.currency.slice(0,3) : '£';
var billEl = $('[data-role=bill]'), tipEl = $('[data-role=tip]'), peopleEl = $('[data-role=people]');
if(!billEl || !tipEl || !peopleEl) return;
var billVal = $('[data-role=bill-val]'), tipValEl = $('[data-role=tip-val]'), peopleValEl = $('[data-role=people-val]');
var tipAmtEl = $('[data-role=tip-amt]'), totalEl = $('[data-role=total]'), perEl = $('[data-role=per]');
function money(n){ return cur + (Math.round(n*100)/100).toFixed(2); }
function recompute(){
  var bill = parseFloat(billEl.value) || 0;
  var tipPct = parseFloat(tipEl.value) || 0;
  var people = Math.max(1, Math.round(parseFloat(peopleEl.value) || 1));
  var tipAmt = bill * tipPct / 100;
  var total = bill + tipAmt;
  var per = total / people;
  if(billVal) billVal.textContent = money(bill);
  if(tipValEl) tipValEl.textContent = (Math.round(tipPct*10)/10) + '%';
  if(peopleValEl) peopleValEl.textContent = String(people);
  if(tipAmtEl) tipAmtEl.textContent = money(tipAmt);
  if(totalEl) totalEl.textContent = money(total);
  if(perEl) perEl.textContent = money(per);
}
[billEl, tipEl, peopleEl].forEach(function(el){ el.addEventListener('input', recompute); });
recompute();
`;

    return { html, css, jsBody };
  },
};
