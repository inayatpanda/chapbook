import { esc } from './index.js';

export default {
  id: 'compound-growth',
  name: 'Compound growth',
  category: 'explorer',
  description: 'See how small regular savings compound over time — drag the sliders to watch the pot grow.',
  paramsSchema: {
    type: 'object', additionalProperties: false, required: [],
    properties: {
      title: { type: 'string' },
      monthly: { type: 'number', default: 20, minimum: 0, maximum: 500 },
      ratePct: { type: 'number', default: 5, minimum: 0, maximum: 12 },
      years: { type: 'number', default: 30, minimum: 1, maximum: 40 },
      currency: { type: 'string', default: '£' },
    },
  },
  presets: [
    { name: 'A coffee a week, invested', params: { title: 'A coffee a week, invested', monthly: 12, ratePct: 6, years: 30, currency: '£' } },
    { name: 'Tenner a month from age 20', params: { title: 'Tenner a month from age 20', monthly: 10, ratePct: 5, years: 40, currency: '£' } },
  ],
  build(params, domId) {
    const clamp = (v, lo, hi, d) => {
      const n = Number(v);
      return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
    };
    const monthly = clamp(params.monthly, 0, 500, 20);
    const ratePct = clamp(params.ratePct, 0, 12, 5);
    const years = Math.round(clamp(params.years, 1, 40, 30));
    const currency = (typeof params.currency === 'string' && params.currency.trim()) ? params.currency.trim().slice(0, 3) : '£';
    const title = params.title ? `<div class="pg-cg-title">${esc(params.title)}</div>` : '';

    const html = `<div class="pg-stage">${title}
<div class="pg-controls">
  <div class="pg-row pg-field"><label><b>Monthly saving</b> <span class="pg-readout" data-role="out-monthly"></span></label>
    <input type="range" data-role="monthly" min="0" max="500" step="5" value="${monthly}"></div>
  <div class="pg-row pg-field"><label><b>Annual return</b> <span class="pg-readout" data-role="out-rate"></span></label>
    <input type="range" data-role="rate" min="0" max="12" step="0.5" value="${ratePct}"></div>
  <div class="pg-row pg-field"><label><b>Years</b> <span class="pg-readout" data-role="out-years"></span></label>
    <input type="range" data-role="years" min="1" max="40" step="1" value="${years}"></div>
</div>
<div class="pg-cg-stats">
  <div class="pg-cg-stat pg-cg-final"><span class="pg-cg-k">Final pot</span><span class="pg-readout pg-cg-v" data-role="out-final"></span></div>
  <div class="pg-cg-stat"><span class="pg-cg-k">Total paid in</span><span class="pg-readout pg-cg-v" data-role="out-paid"></span></div>
  <div class="pg-cg-stat"><span class="pg-cg-k">Interest earned</span><span class="pg-readout pg-cg-v" data-role="out-interest"></span></div>
</div>
<svg class="pg-cg-chart" data-role="chart" viewBox="0 0 300 80" preserveAspectRatio="none" role="img" aria-label="Balance growing year by year">
  <polyline data-role="line" fill="none" stroke="#22d3ee" stroke-width="1.5" points=""></polyline>
</svg>
</div>`;

    const css = [
      `#${domId} .pg-cg-title{font-weight:600;margin-bottom:.6rem;color:var(--ink,#e9eef8)}`,
      `#${domId} .pg-controls{display:flex;flex-direction:column;gap:.7rem}`,
      `#${domId} .pg-field label{display:flex;justify-content:space-between;align-items:baseline;gap:.6rem;font-size:.9rem;color:var(--ink-dim,#cdd6e6)}`,
      `#${domId} .pg-readout{color:#2dd4bf;font-variant-numeric:tabular-nums}`,
      `#${domId} input[type=range]{width:100%;margin:.35rem 0 0;accent-color:#22d3ee}`,
      `#${domId} .pg-cg-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:.6rem;margin:1rem 0 .8rem}`,
      `#${domId} .pg-cg-stat{display:flex;flex-direction:column;gap:.2rem;padding:.6rem .7rem;border-radius:10px;border:1px solid var(--line,#23304a);background:rgba(140,160,200,.05)}`,
      `#${domId} .pg-cg-k{font-size:.72rem;letter-spacing:.02em;text-transform:uppercase;color:var(--ink-dim,#9fb0c8)}`,
      `#${domId} .pg-cg-v{font-size:1rem;font-weight:600}`,
      `#${domId} .pg-cg-final .pg-cg-v{font-size:1.3rem;font-weight:700;color:#22d3ee}`,
      `#${domId} .pg-cg-final{border-color:#22d3ee55;background:rgba(34,211,238,.07)}`,
      `#${domId} .pg-cg-chart{display:block;width:100%;height:80px;border-radius:10px;border:1px solid var(--line,#23304a);background:rgba(140,160,200,.04)}`,
      `@media(max-width:460px){#${domId} .pg-cg-stats{grid-template-columns:1fr}}`,
    ].join('\n');

    const jsBody = `
var mEl=$('[data-role=monthly]'), rEl=$('[data-role=rate]'), yEl=$('[data-role=years]');
if(!mEl||!rEl||!yEl)return;
var line=$('[data-role=line]');
var ccy=${JSON.stringify(currency)};
function money(n){
  var r=Math.round(n);
  return ccy+r.toLocaleString('en-GB');
}
function recompute(){
  var monthly=parseFloat(mEl.value)||0;
  var rate=parseFloat(rEl.value)||0;
  var years=Math.max(1,Math.round(parseFloat(yEl.value)||1));
  var mr=rate/100/12;
  var bal=0;
  var months=years*12;
  var pts=[], yearly=[];
  for(var i=1;i<=months;i++){
    bal=(bal+monthly)*(1+mr);
    if(i%12===0)yearly.push(bal);
  }
  var paid=monthly*months;
  var interest=bal-paid;
  $('[data-role=out-monthly]').textContent=money(monthly);
  $('[data-role=out-rate]').textContent=rate.toFixed(1)+'%';
  $('[data-role=out-years]').textContent=years+(years===1?' yr':' yrs');
  $('[data-role=out-final]').textContent=money(bal);
  $('[data-role=out-paid]').textContent=money(paid);
  $('[data-role=out-interest]').textContent=money(interest);
  if(line){
    var peak=yearly.length?yearly[yearly.length-1]:0;
    var W=300, H=80, pad=2;
    for(var j=0;j<yearly.length;j++){
      var x=yearly.length===1?W:pad+(W-2*pad)*(j/(yearly.length-1));
      var y=H-pad-(H-2*pad)*(peak>0?(yearly[j]/peak):0);
      pts.push(x.toFixed(1)+','+y.toFixed(1));
    }
    line.setAttribute('points', pts.join(' '));
  }
}
[mEl,rEl,yEl].forEach(function(el){ el.addEventListener('input', recompute); });
recompute();
`;

    return { html, css, jsBody };
  },
};
