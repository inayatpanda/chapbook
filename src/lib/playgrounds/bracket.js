import { esc } from './index.js';

export default {
  id: 'bracket',
  name: 'Knockout bracket',
  category: 'game',
  description: 'A single-elimination bracket you click through, picking a winner in each matchup until one is crowned champion.',
  paramsSchema: {
    type: 'object', additionalProperties: false, required: ['competitors'],
    properties: {
      title: { type: 'string' },
      competitors: { type: 'array', minItems: 2, maxItems: 8, items: { type: 'string' } },
      caption: { type: 'string' },
    },
  },
  presets: [
    { name: 'Best pizza topping', params: {
      title: 'Best pizza topping',
      competitors: ['Margherita', 'Pepperoni', 'Mushroom', 'Ham & pineapple', 'Four cheese', 'Spicy nduja', 'Veggie', 'Anchovy'],
      caption: 'Pick a winner in each matchup. No wrong answers — except one.' } },
    { name: 'Greatest sci-fi film', params: {
      title: 'Greatest sci-fi film',
      competitors: ['Blade Runner', '2001', 'Alien', 'The Matrix', 'Arrival', 'Star Wars', 'Interstellar', 'Dune'],
      caption: 'Eight contenders, one champion. Choose your favourites through to the final.' } },
  ],
  build(params, domId) {
    // Normalise competitors to exactly 4 or 8.
    let names = Array.isArray(params.competitors) ? params.competitors.map((s) => String(s == null ? '' : s)) : [];
    const target = names.length <= 6 ? 4 : 8; // nearest of 4 or 8
    if (names.length > target) names = names.slice(0, target);
    while (names.length < target) names.push('TBD ' + (names.length + 1));

    const title = params.title ? `<div class="pg-bk-title">${esc(params.title)}</div>` : '';
    const caption = params.caption ? `<div class="pg-bk-caption">${esc(params.caption)}</div>` : '';
    const data = JSON.stringify(names);

    const html =
      `<div class="pg-stage">${title}` +
      `<div class="pg-bk-board" data-role="board" data-names='${esc(data)}'></div>` +
      `<div class="pg-bk-champ" data-role="champ" hidden></div>` +
      `<div class="pg-controls"><button type="button" class="pg-bk-reset" data-role="reset">Reset</button></div>` +
      `${caption}</div>`;

    const css = [
      `#${domId} .pg-bk-title{font-weight:700;font-size:1.1rem;margin-bottom:.3rem;color:#e9eef8}`,
      `#${domId} .pg-bk-caption{margin-top:.7rem;font-size:.85rem;color:#9fb0c8}`,
      `#${domId} .pg-bk-board{display:flex;gap:1.1rem;align-items:stretch;overflow-x:auto;padding:.3rem .1rem .6rem}`,
      `#${domId} .pg-bk-col{display:flex;flex-direction:column;justify-content:space-around;gap:.5rem;min-width:128px;flex:0 0 auto}`,
      `#${domId} .pg-bk-colhead{font-size:.7rem;letter-spacing:.06em;text-transform:uppercase;color:#7c8aa3;margin-bottom:.1rem;text-align:center}`,
      `#${domId} .pg-bk-match{display:flex;flex-direction:column;gap:.3rem;padding:.3rem;border-radius:10px;background:rgba(140,160,200,.05);border:1px solid #23304a}`,
      `#${domId} .pg-bk-slot{display:block;width:100%;text-align:left;font:inherit;cursor:pointer;border:1px solid #2b3a57;background:rgba(140,160,200,.04);color:#cdd6e6;border-radius:8px;padding:.4rem .55rem;font-size:.85rem;line-height:1.2;transition:background .15s,border-color .15s,color .15s}`,
      `#${domId} .pg-bk-slot:hover:not(:disabled){border-color:#22d3ee;color:#e9eef8}`,
      `#${domId} .pg-bk-slot:disabled{cursor:default}`,
      `#${domId} .pg-bk-slot.empty{color:#5a6783;font-style:italic;cursor:default}`,
      `#${domId} .pg-bk-slot.won{background:rgba(45,212,191,.14);border-color:#2dd4bf;color:#eafff9;font-weight:600}`,
      `#${domId} .pg-bk-slot.lost{opacity:.4;text-decoration:line-through}`,
      `#${domId} .pg-bk-champ{margin-top:.8rem;padding:.7rem 1rem;border-radius:12px;text-align:center;font-size:1.2rem;font-weight:700;color:#04060c;background:linear-gradient(90deg,#2dd4bf,#22d3ee,#818cf8)}`,
      `#${domId} .pg-bk-reset{font:inherit;cursor:pointer;border:1px solid #2b3a57;background:rgba(140,160,200,.06);color:#cdd6e6;border-radius:8px;padding:.4rem .8rem;font-size:.85rem}`,
      `#${domId} .pg-bk-reset:hover{border-color:#818cf8;color:#e9eef8}`,
      `#${domId} .pg-controls{margin-top:.6rem}`,
    ].join('\n');

    const jsBody = `
var board=$('[data-role=board]');
var champEl=$('[data-role=champ]');
var resetBtn=$('[data-role=reset]');
if(!board||!champEl||!resetBtn)return;
var names;
try{names=JSON.parse(board.getAttribute('data-names'))||[];}catch(e){names=[];}
var n=names.length;
if(n!==4&&n!==8)return;
var roundCount=Math.log2(n)+1; // round 0 = competitors

// rounds[r] is an array of slots; rounds[0]=names, deeper rounds half the length, null=unfilled.
var rounds;
function fresh(){
  rounds=[names.slice()];
  var size=n;
  while(size>1){
    size=size/2;
    var arr=[];
    for(var i=0;i<size;i++)arr.push(null);
    rounds.push(arr);
  }
}

var ROUND_NAMES={2:'Final',4:'Semis',8:'Quarters',16:'Round 1'};

function pick(r,slotIndex){
  var winner=rounds[r][slotIndex];
  if(winner==null)return;
  var nextSlot=Math.floor(slotIndex/2);
  if(rounds[r+1][nextSlot]===winner)return; // no change
  rounds[r+1][nextSlot]=winner;
  // clear any downstream picks that descended from this slot.
  var idx=nextSlot;
  for(var rr=r+1;rr<rounds.length-1;rr++){
    var nx=Math.floor(idx/2);
    rounds[rr+1][nx]=null;
    idx=nx;
  }
  render();
}

function render(){
  board.textContent='';
  for(var r=0;r<rounds.length;r++){
    var col=document.createElement('div');
    col.className='pg-bk-col';
    var slotsInRound=rounds[r].length;
    var head=document.createElement('div');
    head.className='pg-bk-colhead';
    head.textContent=r===rounds.length-1?'Champion':(ROUND_NAMES[slotsInRound]||('Round '+(r+1)));
    col.appendChild(head);
    if(r===rounds.length-1){
      // champion column: single slot, display only.
      var champWrap=document.createElement('div');
      champWrap.className='pg-bk-match';
      var cb=makeSlot(r,0,rounds[r][0]);
      champWrap.appendChild(cb);
      col.appendChild(champWrap);
      board.appendChild(col);
      continue;
    }
    for(var m=0;m<slotsInRound/2;m++){
      var match=document.createElement('div');
      match.className='pg-bk-match';
      var aI=m*2,bI=m*2+1;
      match.appendChild(makeSlot(r,aI,rounds[r][aI]));
      match.appendChild(makeSlot(r,bI,rounds[r][bI]));
      col.appendChild(match);
    }
    board.appendChild(col);
  }
  // champion banner: last round's single slot filled.
  var champ=rounds[rounds.length-1][0];
  if(champ!=null){
    champEl.textContent='🏆 '+champ;
    champEl.hidden=false;
  }else{
    champEl.hidden=true;
    champEl.textContent='';
  }
}

function makeSlot(r,slotIndex,value){
  var btn=document.createElement('button');
  btn.type='button';
  btn.className='pg-bk-slot';
  var isChampCol=(r===rounds.length-1);
  if(value==null){
    btn.classList.add('empty');
    btn.textContent='—';
    btn.disabled=true;
    return btn;
  }
  btn.textContent=value;
  // a slot is "won" if it advanced into the next round.
  if(!isChampCol){
    var nextSlot=Math.floor(slotIndex/2);
    if(rounds[r+1][nextSlot]===value){
      btn.classList.add('won');
    }else{
      // a sibling already advanced -> this one lost.
      var sibling=slotIndex%2===0?slotIndex+1:slotIndex-1;
      if(rounds[r+1][nextSlot]!=null&&rounds[r+1][nextSlot]===rounds[r][sibling]){
        btn.classList.add('lost');
      }
    }
    btn.addEventListener('click',function(){pick(r,slotIndex);});
  }else{
    btn.classList.add('won');
    btn.disabled=true;
  }
  return btn;
}

resetBtn.addEventListener('click',function(){fresh();render();});

fresh();
render();
`;

    return { html, css, jsBody };
  },
};
