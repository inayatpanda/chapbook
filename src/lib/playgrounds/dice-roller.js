import { esc } from './index.js';

export default {
  id: 'dice-roller',
  name: 'Dice roller',
  category: 'game',
  description: 'Rolls dice thousands of times and draws the distribution of totals, so the probabilities become something you can see.',
  paramsSchema: {
    type: 'object', additionalProperties: false, required: ['dice', 'sides'],
    properties: {
      title: { type: 'string' },
      dice: { type: 'number', default: 2, minimum: 1, maximum: 4 },
      sides: { type: 'number', default: 6, minimum: 2, maximum: 20 },
      colour: { type: 'string', default: '#22d3ee' },
    },
  },
  presets: [
    { name: 'Two dice — why 7 wins', params: { title: 'Two dice — why 7 wins', dice: 2, sides: 6, colour: '#22d3ee' } },
    { name: 'One d20', params: { title: 'One d20 — flat odds', dice: 1, sides: 20, colour: '#818cf8' } },
  ],
  build(params, domId) {
    const dice = Math.max(1, Math.min(4, Math.round(params.dice || 2)));
    const sides = Math.max(2, Math.min(20, Math.round(params.sides || 6)));
    const colour = /^#[0-9a-fA-F]{3,8}$/.test(params.colour || '') ? params.colour : '#22d3ee';
    const title = params.title ? `<div class="pg-dr-title">${esc(params.title)}</div>` : '';

    const html = `<div class="pg-stage">${title}` +
      `<div class="pg-controls"><div class="pg-row">` +
      `<button type="button" class="pg-dr-btn" data-role="once">Roll once</button>` +
      `<button type="button" class="pg-dr-btn pg-dr-batch" data-role="batch">Roll ×1000</button>` +
      `<button type="button" class="pg-dr-btn pg-dr-reset" data-role="reset">Reset</button>` +
      `</div></div>` +
      `<div class="pg-readout">Last roll: <b data-role="last">—</b> · Rolls so far: <b data-role="total">0</b></div>` +
      `<div class="pg-dr-chart" data-role="chart"></div>` +
      `</div>`;

    const css = [
      `#${domId} .pg-dr-title{font-weight:700;margin-bottom:.6rem;color:var(--ink,#e9eef8)}`,
      `#${domId} .pg-dr-btn{font:inherit;font-weight:600;cursor:pointer;border:1px solid ${colour}66;background:rgba(34,211,238,.08);color:var(--ink,#e9eef8);padding:.45rem .8rem;border-radius:9px;transition:background .15s,border-color .15s}`,
      `#${domId} .pg-dr-btn:hover{background:rgba(34,211,238,.16);border-color:${colour}}`,
      `#${domId} .pg-dr-batch{background:${colour}22;border-color:${colour}}`,
      `#${domId} .pg-dr-reset{background:transparent;border-color:var(--line,#23304a);color:var(--ink-dim,#cdd6e6)}`,
      `#${domId} .pg-readout{margin:.7rem 0;color:var(--ink-dim,#cdd6e6)}`,
      `#${domId} .pg-readout b{color:var(--ink,#e9eef8)}`,
      `#${domId} .pg-dr-chart{display:flex;flex-direction:column;gap:3px}`,
      `#${domId} .pg-dr-bar{display:grid;grid-template-columns:2.6rem 1fr auto;align-items:center;gap:.5rem;font-variant-numeric:tabular-nums}`,
      `#${domId} .pg-dr-sum{color:var(--ink-dim,#cdd6e6);text-align:right;font-size:.85rem}`,
      `#${domId} .pg-dr-track{position:relative;height:16px;border-radius:5px;background:rgba(140,160,200,.07);overflow:hidden}`,
      `#${domId} .pg-dr-fill{position:absolute;inset:0 auto 0 0;width:0;border-radius:5px;background:linear-gradient(90deg,${colour}88,${colour});transition:width .3s ease}`,
      `#${domId} .pg-dr-count{color:var(--ink-dim,#cdd6e6);font-size:.8rem;min-width:3.5rem;text-align:right}`,
      `#${domId}.pg-dr-reduce .pg-dr-fill{transition:none}`,
    ].join('\n');

    const jsBody = `
var DICE=${dice}, SIDES=${sides};
if(reduced)root.classList.add('pg-dr-reduce');
var chart=$('[data-role=chart]'), lastEl=$('[data-role=last]'), totalEl=$('[data-role=total]');
if(!chart||!lastEl||!totalEl)return;
var onceBtn=$('[data-role=once]'), batchBtn=$('[data-role=batch]'), resetBtn=$('[data-role=reset]');
var MIN=DICE, MAX=DICE*SIDES;
var counts={}, total=0, fills={}, countEls={};
for(var s=MIN;s<=MAX;s++)counts[s]=0;

// build the bars once
for(var sum=MIN;sum<=MAX;sum++){
  var bar=document.createElement('div'); bar.className='pg-dr-bar';
  var lbl=document.createElement('div'); lbl.className='pg-dr-sum'; lbl.textContent=String(sum); bar.appendChild(lbl);
  var track=document.createElement('div'); track.className='pg-dr-track';
  var fill=document.createElement('div'); fill.className='pg-dr-fill'; track.appendChild(fill); bar.appendChild(track);
  var cnt=document.createElement('div'); cnt.className='pg-dr-count'; cnt.textContent='0'; bar.appendChild(cnt);
  chart.appendChild(bar);
  fills[sum]=fill; countEls[sum]=cnt;
}

function rollOnce(){
  var sum=0;
  for(var d=0;d<DICE;d++)sum+=Math.floor(Math.random()*SIDES)+1;
  counts[sum]++; total++;
  return sum;
}

function render(){
  var max=0;
  for(var s=MIN;s<=MAX;s++)if(counts[s]>max)max=counts[s];
  for(var s2=MIN;s2<=MAX;s2++){
    var pct=max>0?(counts[s2]/max*100):0;
    fills[s2].style.width=pct.toFixed(2)+'%';
    var c=counts[s2];
    countEls[s2].textContent=total>0?(c+' ('+(c/total*100).toFixed(1)+'%)'):'0';
  }
  totalEl.textContent=String(total);
}

if(onceBtn)onceBtn.addEventListener('click',function(){ var s=rollOnce(); lastEl.textContent=String(s); render(); });
if(batchBtn)batchBtn.addEventListener('click',function(){ var s; for(var i=0;i<1000;i++)s=rollOnce(); lastEl.textContent=String(s); render(); });
if(resetBtn)resetBtn.addEventListener('click',function(){
  for(var s=MIN;s<=MAX;s++)counts[s]=0;
  total=0; lastEl.textContent='—'; render();
});

render();
`;

    return { html, css, jsBody };
  },
};
