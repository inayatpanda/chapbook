import { esc } from './index.js';

export default {
  id: 'star-rating',
  name: 'Star rating',
  category: 'ui',
  description: 'Tap to give a star rating, with a plain-English label for each level.',
  paramsSchema: {
    type: 'object', additionalProperties: false, required: ['max'],
    properties: {
      title: { type: 'string' },
      max: { type: 'number', default: 5, minimum: 3, maximum: 10 },
      labels: { type: 'array', items: { type: 'string' } },
    },
  },
  presets: [
    { name: 'Rate this film', params: { title: 'Rate this film', max: 5, labels: ['Awful', 'Meh', 'Fine', 'Great', 'Brilliant'] } },
    { name: 'How was the coffee?', params: { title: 'How was the coffee?', max: 5, labels: ['Undrinkable', 'Weak', 'OK', 'Good', 'Perfect'] } },
  ],
  build(params, domId) {
    const max = Math.max(3, Math.min(10, Math.round(params.max || 5)));
    const labels = Array.isArray(params.labels) ? params.labels.slice(0, max).map((l) => esc(l)) : [];
    const title = params.title ? `<div class="pg-sr-title">${esc(params.title)}</div>` : '';
    let stars = '';
    for (let i = 1; i <= max; i++) {
      stars += `<button type="button" class="pg-sr-star" data-role="star" data-value="${i}" aria-label="Rate ${i} of ${max}" aria-pressed="false">★</button>`;
    }
    const html = `<div class="pg-stage">${title}` +
      `<div class="pg-sr-row" data-role="stars" role="radiogroup" aria-label="Star rating">${stars}</div>` +
      `<div class="pg-readout pg-sr-readout" data-role="readout" aria-live="polite">Tap to rate</div>` +
      `</div>`;
    const css = [
      `#${domId} .pg-sr-title{font-weight:600;color:var(--ink,#e9eef8);margin-bottom:.6rem}`,
      `#${domId} .pg-sr-row{display:flex;gap:.25rem;flex-wrap:wrap}`,
      `#${domId} .pg-sr-star{border:0;background:transparent;padding:.1rem .15rem;cursor:pointer;font-size:2rem;line-height:1;color:#3a4660;transition:color .12s,transform .12s}`,
      `#${domId} .pg-sr-star:hover,#${domId} .pg-sr-star:focus-visible{transform:scale(1.12)}`,
      `#${domId} .pg-sr-star:focus-visible{outline:2px solid #22d3ee;outline-offset:2px;border-radius:4px}`,
      `#${domId} .pg-sr-star.on{color:#fbbf24}`,
      `#${domId} .pg-sr-readout{margin-top:.7rem;font-variant-numeric:tabular-nums;color:var(--ink-dim,#cdd6e6)}`,
      `#${domId} .pg-sr-readout b{color:#fbbf24}`,
      `#${domId}.pg-sr-reduce .pg-sr-star{transition:none}`,
    ].join('\n');
    const jsBody = `
if(reduced)root.classList.add('pg-sr-reduce');
var MAX=${max};
var LABELS=${JSON.stringify(labels)};
var stars=$$('[data-role=star]');
var readout=$('[data-role=readout]');
if(!stars.length||!readout)return;
var chosen=0;
function paint(n){
  stars.forEach(function(s,i){
    var on=(i+1)<=n;
    s.classList.toggle('on',on);
    s.setAttribute('aria-pressed',(i+1)<=chosen?'true':'false');
  });
}
function label(n){return (LABELS[n-1]!=null&&LABELS[n-1]!=='')?LABELS[n-1]:'';}
function show(n){
  if(n<=0){readout.textContent='Tap to rate';return;}
  var l=label(n);
  readout.innerHTML='<b>'+n+'</b> / '+MAX+(l?' \\u2014 '+l:'');
}
stars.forEach(function(s){
  var v=parseInt(s.getAttribute('data-value'),10)||0;
  function preview(){paint(v);show(v);}
  function revert(){paint(chosen);show(chosen);}
  s.addEventListener('pointerover',preview);
  s.addEventListener('focus',preview);
  s.addEventListener('mouseleave',revert);
  s.addEventListener('blur',revert);
  s.addEventListener('click',function(){chosen=v;paint(chosen);show(chosen);});
});
paint(0);show(0);
`;
    return { html, css, jsBody };
  },
};
