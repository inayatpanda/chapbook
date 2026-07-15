import { esc } from './index.js';

export default {
  id: 'chronology-game',
  name: 'Put it in order',
  category: 'history',
  description: 'Arrange a shuffled list of events into the right chronological order, then check your answer.',
  paramsSchema: {
    type: 'object', additionalProperties: false, required: ['events'],
    properties: {
      title: { type: 'string' },
      caption: { type: 'string' },
      events: {
        type: 'array', minItems: 3, maxItems: 8, items: {
          type: 'object', additionalProperties: false, required: ['label', 'year'],
          properties: { label: { type: 'string' }, year: { type: 'number' } },
        },
      },
    },
  },
  presets: [
    { name: 'Order these inventions', params: {
      title: 'Order these inventions',
      caption: 'Oldest at the top, newest at the bottom.',
      events: [
        { label: 'Printing press', year: 1440 },
        { label: 'Telephone', year: 1876 },
        { label: 'Television', year: 1927 },
        { label: 'World Wide Web', year: 1989 },
        { label: 'Smartphone', year: 2007 },
      ] } },
    { name: 'When did they happen?', params: {
      title: 'When did they happen?',
      caption: 'Put these moments in the order they occurred.',
      events: [
        { label: 'Moon landing', year: 1969 },
        { label: 'Fall of the Berlin Wall', year: 1989 },
        { label: 'First heart transplant', year: 1967 },
        { label: 'End of WWII', year: 1945 },
      ] } },
  ],
  build(params, domId) {
    const events = (Array.isArray(params.events) ? params.events : [])
      .filter((e) => e && typeof e.label === 'string' && e.label.trim() && Number.isFinite(Number(e.year)))
      .slice(0, 8)
      .map((e) => ({ label: String(e.label), year: Number(e.year) }));
    const title = params.title ? `<div class="pg-cg-title">${esc(params.title)}</div>` : '';
    const caption = params.caption ? `<div class="pg-cg-caption">${esc(params.caption)}</div>` : '';

    const html = `<div class="pg-stage">${title}${caption}` +
      `<ol class="pg-cg-list" data-role="list" aria-live="polite"></ol>` +
      `<div class="pg-row pg-cg-actions">` +
        `<button type="button" class="pg-cg-btn pg-cg-primary" data-role="check">Check</button>` +
        `<button type="button" class="pg-cg-btn" data-role="shuffle">Shuffle again</button>` +
        `<span class="pg-cg-feedback" data-role="feedback" aria-live="polite"></span>` +
      `</div>` +
      `</div>`;

    const css = [
      `#${domId} .pg-cg-title{font-weight:600;margin-bottom:.35rem}`,
      `#${domId} .pg-cg-caption{color:var(--ink-dim,#cdd6e6);font-size:.88rem;margin-bottom:.8rem}`,
      `#${domId} .pg-cg-list{list-style:none;margin:0 0 .85rem;padding:0;display:flex;flex-direction:column;gap:.45rem;counter-reset:cg}`,
      `#${domId} .pg-cg-item{display:flex;align-items:center;gap:.6rem;padding:.55rem .7rem;border:1px solid var(--line,#23304a);border-radius:10px;background:rgba(140,160,200,.06)}`,
      `#${domId} .pg-cg-rank{counter-increment:cg;min-width:1.4em;text-align:center;font-weight:700;color:#818cf8}`,
      `#${domId} .pg-cg-rank::before{content:counter(cg)}`,
      `#${domId} .pg-cg-label{flex:1 1 auto;min-width:0;color:var(--ink,#e9eef8);font-weight:600}`,
      `#${domId} .pg-cg-year{flex:0 0 auto;font-variant-numeric:tabular-nums;color:#fbbf24;font-weight:600;opacity:0;transition:opacity .25s}`,
      `#${domId} .pg-cg-item.revealed .pg-cg-year{opacity:1}`,
      `#${domId} .pg-cg-mark{flex:0 0 auto;width:1.3em;text-align:center;font-weight:700}`,
      `#${domId} .pg-cg-item.ok{border-color:#2dd4bf66}`,
      `#${domId} .pg-cg-item.ok .pg-cg-mark{color:#2dd4bf}`,
      `#${domId} .pg-cg-item.no{border-color:#f472b666}`,
      `#${domId} .pg-cg-item.no .pg-cg-mark{color:#f472b6}`,
      `#${domId} .pg-cg-moves{flex:0 0 auto;display:flex;flex-direction:column;gap:.2rem}`,
      `#${domId} .pg-cg-move{width:1.7em;height:1.3em;line-height:1;display:flex;align-items:center;justify-content:center;background:rgba(140,160,200,.08);border:1px solid var(--line,#23304a);border-radius:6px;color:var(--ink,#e9eef8);font:inherit;font-size:.8rem;cursor:pointer;padding:0}`,
      `#${domId} .pg-cg-move:hover:not(:disabled){border-color:#22d3ee}`,
      `#${domId} .pg-cg-move:disabled{opacity:.3;cursor:default}`,
      `#${domId} .pg-row{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem}`,
      `#${domId} .pg-cg-btn{background:rgba(140,160,200,.06);border:1px solid var(--line,#23304a);border-radius:9px;color:var(--ink,#e9eef8);font:inherit;font-weight:600;padding:.5rem .9rem;cursor:pointer}`,
      `#${domId} .pg-cg-btn:hover{border-color:#818cf8}`,
      `#${domId} .pg-cg-primary{background:#22d3ee1a;border-color:#22d3ee66;color:#22d3ee}`,
      `#${domId} .pg-cg-feedback{font-weight:600}`,
      `#${domId} .pg-cg-feedback.ok{color:#2dd4bf}`,
      `#${domId} .pg-cg-feedback.no{color:#f472b6}`,
    ].join('\n');

    const jsBody = `
var EVENTS = ${JSON.stringify(events)};
var listEl = $('[data-role=list]');
var checkBtn = $('[data-role=check]');
var shuffleBtn = $('[data-role=shuffle]');
var feedback = $('[data-role=feedback]');
if(!listEl||!checkBtn||!shuffleBtn||EVENTS.length<2)return;

// true chronological order = indices of EVENTS sorted by year (stable for ties)
var SORTED = EVENTS.map(function(e,i){return i;}).sort(function(a,b){
  return EVENTS[a].year - EVENTS[b].year || a - b;
});
var order = [];   // current arrangement: array of original indices
var checked = false;

function shuffle(){
  var a = EVENTS.map(function(e,i){return i;});
  for(var i=a.length-1;i>0;i--){
    var j=Math.floor(Math.random()*(i+1));
    var t=a[i];a[i]=a[j];a[j]=t;
  }
  var tries=0;
  while(a.length>1 && sameAsSorted(a) && tries<30){
    for(var k=a.length-1;k>0;k--){
      var m=Math.floor(Math.random()*(k+1));
      var s=a[k];a[k]=a[m];a[m]=s;
    }
    tries++;
  }
  return a;
}

function sameAsSorted(arr){
  for(var i=0;i<arr.length;i++){ if(arr[i]!==SORTED[i]) return false; }
  return true;
}

function setFeedback(msg, kind){
  feedback.textContent = msg || '';
  feedback.className = 'pg-cg-feedback' + (kind ? ' ' + kind : '');
}

function move(pos, dir){
  var to = pos + dir;
  if(to<0 || to>=order.length) return;
  var t = order[pos]; order[pos] = order[to]; order[to] = t;
  checked = false;
  setFeedback('');
  render();
}

function render(){
  listEl.textContent = '';
  order.forEach(function(origIdx, pos){
    var ev = EVENTS[origIdx];
    var li = document.createElement('li');
    li.className = 'pg-cg-item';

    var rank = document.createElement('span');
    rank.className = 'pg-cg-rank';
    li.appendChild(rank);

    var label = document.createElement('span');
    label.className = 'pg-cg-label';
    label.textContent = ev.label;
    li.appendChild(label);

    var year = document.createElement('span');
    year.className = 'pg-cg-year';
    year.textContent = String(ev.year);
    li.appendChild(year);

    if(checked){
      li.classList.add('revealed');
      var correct = (origIdx === SORTED[pos]);
      li.classList.add(correct ? 'ok' : 'no');
      var mark = document.createElement('span');
      mark.className = 'pg-cg-mark';
      mark.textContent = correct ? '\\u2713' : '\\u2717';
      li.appendChild(mark);
    } else {
      var moves = document.createElement('span');
      moves.className = 'pg-cg-moves';
      var up = document.createElement('button');
      up.type = 'button'; up.className = 'pg-cg-move'; up.textContent = '\\u25B2';
      up.setAttribute('aria-label', 'Move ' + ev.label + ' up');
      up.disabled = (pos === 0);
      up.addEventListener('click', function(){ move(pos, -1); });
      var down = document.createElement('button');
      down.type = 'button'; down.className = 'pg-cg-move'; down.textContent = '\\u25BC';
      down.setAttribute('aria-label', 'Move ' + ev.label + ' down');
      down.disabled = (pos === order.length - 1);
      down.addEventListener('click', function(){ move(pos, 1); });
      moves.appendChild(up); moves.appendChild(down);
      li.appendChild(moves);
    }

    listEl.appendChild(li);
  });
}

function check(){
  checked = true;
  var right = 0;
  for(var i=0;i<order.length;i++){ if(order[i]===SORTED[i]) right++; }
  render();
  if(right === order.length){
    setFeedback('\\u2713 spot on \\u2014 all in order', 'ok');
  } else {
    setFeedback(right + ' of ' + order.length + ' in the right place', 'no');
  }
}

function reset(){
  order = shuffle();
  checked = false;
  setFeedback('');
  render();
}

checkBtn.addEventListener('click', check);
shuffleBtn.addEventListener('click', reset);

reset();
`;

    return { html, css, jsBody };
  },
};
