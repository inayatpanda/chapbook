import { esc } from './index.js';

export default {
  id: 'memory-match',
  name: 'Memory match',
  category: 'game',
  description: 'Flip the face-down cards two at a time to find the matching pairs in as few moves as you can.',
  paramsSchema: {
    type: 'object', additionalProperties: false, required: ['symbols'],
    properties: {
      title: { type: 'string' },
      symbols: { type: 'array', minItems: 3, maxItems: 8, items: { type: 'string' } },
    },
  },
  presets: [
    { name: 'Match the emoji', params: { title: 'Match the emoji', symbols: ['🚀', '🎸', '🍕', '⚓', '🎲', '🦊'] } },
    { name: 'Planets', params: { title: 'Planets', symbols: ['☿', '♀', '⊕', '♂', '♃', '♄'] } },
  ],
  build(params, domId) {
    const symbols = (Array.isArray(params.symbols) ? params.symbols : [])
      .map((s) => String(s == null ? '' : s).trim())
      .filter((s) => s.length > 0)
      .slice(0, 8);
    while (symbols.length < 3) symbols.push(String(symbols.length + 1));
    const title = params.title ? `<div class="pg-mm-title">${esc(params.title)}</div>` : '';
    const pairs = symbols.length;
    const cols = pairs <= 3 ? 3 : pairs <= 4 ? 4 : pairs <= 6 ? 4 : 4;

    const html = `<div class="pg-stage">${title}` +
      `<div class="pg-readout">Moves: <b data-role="moves">0</b><span class="pg-mm-win" data-role="win" hidden></span></div>` +
      `<div class="pg-mm-grid" data-role="grid" role="grid" aria-label="Memory cards"></div>` +
      `<div class="pg-controls"><div class="pg-row">` +
      `<button type="button" class="pg-mm-btn" data-role="restart">Restart</button>` +
      `</div></div>` +
      `</div>`;

    const css = [
      `#${domId} .pg-mm-title{font-weight:700;margin-bottom:.6rem;color:var(--ink,#e9eef8)}`,
      `#${domId} .pg-readout{margin:.2rem 0 .8rem;color:var(--ink-dim,#cdd6e6)}`,
      `#${domId} .pg-readout b{color:var(--ink,#e9eef8);font-variant-numeric:tabular-nums}`,
      `#${domId} .pg-mm-win{margin-left:.6rem;color:#2dd4bf;font-weight:600}`,
      `#${domId} .pg-mm-grid{display:grid;grid-template-columns:repeat(${cols},1fr);gap:.55rem;max-width:30rem}`,
      `#${domId} .pg-mm-card{position:relative;aspect-ratio:1/1;border:0;padding:0;background:transparent;cursor:pointer;font:inherit;perspective:800px}`,
      `#${domId} .pg-mm-card:disabled{cursor:default}`,
      `#${domId} .pg-mm-face{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;border-radius:11px;border:1px solid var(--line,#23304a);backface-visibility:hidden;-webkit-backface-visibility:hidden;transition:transform .35s ease;font-size:clamp(1.3rem,7vw,2rem);line-height:1}`,
      `#${domId} .pg-mm-back{background:rgba(140,160,200,.07);color:#818cf8;font-weight:700}`,
      `#${domId} .pg-mm-back::after{content:"?";opacity:.55}`,
      `#${domId} .pg-mm-front{background:rgba(34,211,238,.08);border-color:#22d3ee55;color:var(--ink,#e9eef8);transform:rotateY(180deg)}`,
      `#${domId} .pg-mm-card.up .pg-mm-back{transform:rotateY(180deg)}`,
      `#${domId} .pg-mm-card.up .pg-mm-front{transform:rotateY(360deg)}`,
      `#${domId} .pg-mm-card.matched .pg-mm-front{background:rgba(45,212,191,.14);border-color:#2dd4bf;color:#2dd4bf}`,
      `#${domId} .pg-mm-card.matched{cursor:default}`,
      `#${domId}.pg-mm-reduce .pg-mm-face{transition:none}`,
      `#${domId} .pg-mm-btn{font:inherit;font-weight:600;cursor:pointer;border:1px solid var(--line,#23304a);background:transparent;color:var(--ink-dim,#cdd6e6);padding:.45rem .8rem;border-radius:9px;transition:background .15s,border-color .15s}`,
      `#${domId} .pg-mm-btn:hover{background:rgba(140,160,200,.1);border-color:#818cf8}`,
    ].join('\n');

    const jsBody = `
var SYMBOLS=${JSON.stringify(symbols)};
if(reduced)root.classList.add('pg-mm-reduce');
var grid=$('[data-role=grid]'), movesEl=$('[data-role=moves]'), winEl=$('[data-role=win]'), restartBtn=$('[data-role=restart]');
if(!grid||!movesEl)return;

var FLIP_MS=reduced?260:700;
var first=null, second=null, locked=false, moves=0, matched=0, pairs=SYMBOLS.length;

function shuffle(arr){
  for(var i=arr.length-1;i>0;i--){
    var j=Math.floor(Math.random()*(i+1));
    var t=arr[i]; arr[i]=arr[j]; arr[j]=t;
  }
  return arr;
}

function makeDeck(){
  var deck=[];
  for(var i=0;i<pairs;i++){ deck.push(SYMBOLS[i]); deck.push(SYMBOLS[i]); }
  return shuffle(deck);
}

function setMoves(n){ moves=n; movesEl.textContent=String(moves); }

function deal(){
  first=null; second=null; locked=false; matched=0;
  setMoves(0);
  winEl.hidden=true; winEl.textContent='';
  grid.textContent='';
  var deck=makeDeck();
  deck.forEach(function(sym){
    var card=document.createElement('button');
    card.type='button';
    card.className='pg-mm-card';
    card.setAttribute('role','gridcell');
    card.setAttribute('aria-label','face-down card');
    card.dataset.sym=sym;

    var back=document.createElement('span');
    back.className='pg-mm-face pg-mm-back';
    back.setAttribute('aria-hidden','true');

    var front=document.createElement('span');
    front.className='pg-mm-face pg-mm-front';
    front.textContent=sym;

    card.appendChild(back);
    card.appendChild(front);
    card.addEventListener('click',function(){ onFlip(card); });
    grid.appendChild(card);
  });
}

function reveal(card){
  card.classList.add('up');
  card.setAttribute('aria-label',card.dataset.sym);
}

function onFlip(card){
  if(locked) return;
  if(card.classList.contains('matched')||card.classList.contains('up')) return;
  if(first&&second) return;

  reveal(card);

  if(!first){ first=card; return; }

  second=card;
  setMoves(moves+1);

  if(first.dataset.sym===second.dataset.sym){
    var a=first, b=second;
    a.classList.add('matched'); b.classList.add('matched');
    a.disabled=true; b.disabled=true;
    first=null; second=null;
    matched++;
    if(matched===pairs){
      winEl.textContent='You found them all in '+moves+' moves 🎉';
      winEl.hidden=false;
    }
    return;
  }

  locked=true;
  var c1=first, c2=second;
  first=null; second=null;
  setTimeout(function(){
    c1.classList.remove('up'); c2.classList.remove('up');
    c1.setAttribute('aria-label','face-down card');
    c2.setAttribute('aria-label','face-down card');
    locked=false;
  },FLIP_MS);
}

if(restartBtn)restartBtn.addEventListener('click',deal);
deal();
`;

    return { html, css, jsBody };
  },
};
