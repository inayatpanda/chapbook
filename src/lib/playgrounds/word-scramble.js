import { esc } from './index.js';

export default {
  id: 'word-scramble',
  name: 'Word scramble',
  category: 'game',
  description: 'Unscramble the shuffled word from its hint — guess, reveal, or skip to the next one.',
  paramsSchema: {
    type: 'object', additionalProperties: false, required: ['words'],
    properties: {
      title: { type: 'string' },
      words: {
        type: 'array', minItems: 1, maxItems: 12, items: {
          type: 'object', additionalProperties: false, required: ['word', 'hint'],
          properties: { word: { type: 'string' }, hint: { type: 'string' } },
        },
      },
    },
  },
  presets: [
    { name: 'Unscramble the capitals', params: {
      title: 'Unscramble the capitals',
      words: [
        { word: 'PARIS', hint: 'France' },
        { word: 'TOKYO', hint: 'Japan' },
        { word: 'CAIRO', hint: 'Egypt' },
        { word: 'OSLO', hint: 'Norway' },
      ] } },
    { name: 'Fruit bowl', params: {
      title: 'Fruit bowl',
      words: [
        { word: 'BANANA', hint: 'Goes brown fast' },
        { word: 'CHERRY', hint: 'Comes in pairs' },
        { word: 'MANGO', hint: 'Stone in the middle' },
      ] } },
  ],
  build(params, domId) {
    const words = (Array.isArray(params.words) ? params.words : [])
      .filter((w) => w && typeof w.word === 'string' && w.word.trim())
      .slice(0, 12)
      .map((w) => ({ word: String(w.word), hint: String(w.hint == null ? '' : w.hint) }));
    const title = params.title ? `<div class="pg-ws-title">${esc(params.title)}</div>` : '';

    const html = `<div class="pg-stage">${title}` +
      `<div class="pg-ws-scramble" data-role="scramble" aria-live="polite"></div>` +
      `<div class="pg-ws-hint"><span class="pg-ws-hint-label">Hint</span> <span data-role="hint"></span></div>` +
      `<div class="pg-row pg-ws-entry">` +
        `<input type="text" class="pg-ws-input" data-role="input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Your answer">` +
        `<button type="button" class="pg-ws-btn pg-ws-primary" data-role="check">Check</button>` +
      `</div>` +
      `<div class="pg-row pg-ws-actions">` +
        `<button type="button" class="pg-ws-btn" data-role="reveal">Reveal</button>` +
        `<button type="button" class="pg-ws-btn" data-role="next">Next</button>` +
        `<span class="pg-ws-feedback" data-role="feedback" aria-live="polite"></span>` +
      `</div>` +
      `<div class="pg-readout pg-ws-readout">` +
        `<span data-role="progress"></span> · Score <b data-role="score">0</b>` +
      `</div>` +
      `</div>`;

    const css = [
      `#${domId} .pg-ws-title{font-weight:600;margin-bottom:.6rem}`,
      `#${domId} .pg-ws-scramble{font-size:1.8rem;font-weight:700;letter-spacing:.35em;text-transform:uppercase;color:#22d3ee;margin:.2rem 0 .6rem;min-height:1.6em}`,
      `#${domId} .pg-ws-hint{color:var(--ink-dim,#cdd6e6);margin-bottom:.8rem}`,
      `#${domId} .pg-ws-hint-label{display:inline-block;font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;color:#fbbf24;border:1px solid #fbbf2455;border-radius:6px;padding:.05rem .4rem;margin-right:.4rem}`,
      `#${domId} .pg-row{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem}`,
      `#${domId} .pg-ws-entry{margin-bottom:.55rem}`,
      `#${domId} .pg-ws-input{flex:1 1 12rem;min-width:0;background:rgba(140,160,200,.06);border:1px solid var(--line,#23304a);border-radius:9px;color:var(--ink,#e9eef8);font:inherit;padding:.5rem .7rem}`,
      `#${domId} .pg-ws-input:focus{outline:none;border-color:#22d3ee;box-shadow:0 0 0 2px #22d3ee33}`,
      `#${domId} .pg-ws-btn{background:rgba(140,160,200,.06);border:1px solid var(--line,#23304a);border-radius:9px;color:var(--ink,#e9eef8);font:inherit;font-weight:600;padding:.5rem .9rem;cursor:pointer}`,
      `#${domId} .pg-ws-btn:hover{border-color:#818cf8}`,
      `#${domId} .pg-ws-primary{background:#22d3ee1a;border-color:#22d3ee66;color:#22d3ee}`,
      `#${domId} .pg-ws-actions{margin-bottom:.7rem}`,
      `#${domId} .pg-ws-feedback{font-weight:600}`,
      `#${domId} .pg-ws-feedback.ok{color:#2dd4bf}`,
      `#${domId} .pg-ws-feedback.no{color:#f472b6}`,
      `#${domId} .pg-ws-readout{color:var(--ink-dim,#cdd6e6);font-size:.85rem}`,
      `#${domId} .pg-ws-readout b{color:#fbbf24}`,
    ].join('\n');

    const jsBody = `
var WORDS = ${JSON.stringify(words)};
var scrambleEl = $('[data-role=scramble]');
var hintEl = $('[data-role=hint]');
var input = $('[data-role=input]');
var checkBtn = $('[data-role=check]');
var revealBtn = $('[data-role=reveal]');
var nextBtn = $('[data-role=next]');
var feedback = $('[data-role=feedback]');
var scoreEl = $('[data-role=score]');
var progressEl = $('[data-role=progress]');
if(!scrambleEl||!input||!checkBtn||!revealBtn||!nextBtn||!WORDS.length)return;

var idx = 0;
var score = 0;
var solved = {};

function shuffle(letters){
  var a = letters.slice();
  for(var i=a.length-1;i>0;i--){
    var j=Math.floor(Math.random()*(i+1));
    var t=a[i];a[i]=a[j];a[j]=t;
  }
  return a;
}

function scramble(word){
  var letters = word.split('');
  if(letters.length<=1)return letters.join('');
  var out = shuffle(letters);
  var tries = 0;
  while(letters.length>3 && out.join('')===letters.join('') && tries<20){
    out = shuffle(letters);
    tries++;
  }
  return out.join('');
}

function setFeedback(msg, kind){
  feedback.textContent = msg || '';
  feedback.className = 'pg-ws-feedback' + (kind ? ' ' + kind : '');
}

function render(){
  var item = WORDS[idx];
  scrambleEl.textContent = scramble(item.word.toUpperCase()).split('').join(' ');
  hintEl.textContent = item.hint;
  input.value = '';
  setFeedback('');
  progressEl.textContent = 'Word ' + (idx+1) + ' of ' + WORDS.length;
}

function check(){
  var item = WORDS[idx];
  var guess = input.value.trim().toLowerCase();
  if(!guess){ setFeedback('Type a guess first.', null); return; }
  if(guess === item.word.toLowerCase()){
    if(!solved[idx]){ solved[idx]=true; score++; scoreEl.textContent=String(score); }
    setFeedback('\\u2713 correct', 'ok');
  } else {
    setFeedback('\\u2717 try again', 'no');
  }
}

function reveal(){
  setFeedback('\\u2192 ' + WORDS[idx].word.toUpperCase(), null);
}

function next(){
  idx = (idx + 1) % WORDS.length;
  render();
  input.focus();
}

checkBtn.addEventListener('click', check);
revealBtn.addEventListener('click', reveal);
nextBtn.addEventListener('click', next);
input.addEventListener('keydown', function(e){
  if(e.key === 'Enter'){ e.preventDefault(); check(); }
});

render();
`;

    return { html, css, jsBody };
  },
};
