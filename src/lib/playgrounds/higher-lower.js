import { esc } from './index.js';

export default {
  id: 'higher-lower',
  name: 'Higher or lower',
  category: 'game',
  description: 'Guess whether the next thing’s number is higher or lower than the one shown, and build up a streak.',
  paramsSchema: {
    type: 'object', additionalProperties: false, required: ['items'],
    properties: {
      title: { type: 'string' },
      unit: { type: 'string', default: '' },
      caption: { type: 'string' },
      items: {
        type: 'array', minItems: 4, maxItems: 24, items: {
          type: 'object', additionalProperties: false, required: ['label', 'value'],
          properties: { label: { type: 'string' }, value: { type: 'number' } },
        },
      },
    },
  },
  presets: [
    {
      name: 'Which country has more people?',
      params: {
        title: 'Which country has more people?', unit: ' m',
        caption: 'Population in millions. Tie counts as correct.',
        items: [
          { label: 'India', value: 1429 }, { label: 'China', value: 1426 },
          { label: 'United States', value: 340 }, { label: 'Indonesia', value: 278 },
          { label: 'Pakistan', value: 240 }, { label: 'Brazil', value: 216 },
          { label: 'Nigeria', value: 224 }, { label: 'Japan', value: 123 },
          { label: 'United Kingdom', value: 68 }, { label: 'Australia', value: 26 },
        ],
      },
    },
    {
      name: 'Higher box office? ($m)',
      params: {
        title: 'Which film made more at the box office?', unit: ' $m',
        caption: 'Worldwide gross, millions of US dollars.',
        items: [
          { label: 'Avatar', value: 2923 }, { label: 'Avengers: Endgame', value: 2799 },
          { label: 'Titanic', value: 2257 }, { label: 'Star Wars: TFA', value: 2071 },
          { label: 'Jurassic World', value: 1671 }, { label: 'The Lion King (2019)', value: 1657 },
          { label: 'Frozen II', value: 1453 },
        ],
      },
    },
  ],
  build(params, domId) {
    const items = (Array.isArray(params.items) ? params.items : [])
      .filter((it) => it && typeof it.label !== 'undefined' && typeof it.value === 'number' && isFinite(it.value))
      .slice(0, 24)
      .map((it) => ({ label: String(it.label), value: Number(it.value) }));
    const unit = typeof params.unit === 'string' ? params.unit : '';
    const title = params.title ? `<div class="pg-hl-title">${esc(params.title)}</div>` : '';
    const caption = params.caption ? `<div class="pg-hl-caption">${esc(params.caption)}</div>` : '';

    const html = `<div class="pg-stage">` +
      title +
      `<div class="pg-hl-scores">` +
        `<span class="pg-hl-score">Streak <b data-role="streak">0</b></span>` +
        `<span class="pg-hl-score">Best <b data-role="best">0</b></span>` +
      `</div>` +
      `<div class="pg-hl-board">` +
        `<div class="pg-hl-panel pg-hl-left">` +
          `<div class="pg-hl-label" data-role="left-label">—</div>` +
          `<div class="pg-hl-value" data-role="left-value">—</div>` +
        `</div>` +
        `<div class="pg-hl-vs">vs</div>` +
        `<div class="pg-hl-panel pg-hl-right">` +
          `<div class="pg-hl-label" data-role="right-label">—</div>` +
          `<div class="pg-hl-value pg-hl-hidden" data-role="right-value">?</div>` +
          `<div class="pg-hl-buttons" data-role="buttons">` +
            `<button type="button" class="pg-hl-btn" data-role="higher">↑ Higher</button>` +
            `<button type="button" class="pg-hl-btn" data-role="lower">↓ Lower</button>` +
          `</div>` +
        `</div>` +
      `</div>` +
      `<div class="pg-hl-msg" data-role="msg" aria-live="polite"></div>` +
      `<div class="pg-hl-over" data-role="over" hidden>` +
        `<button type="button" class="pg-hl-again" data-role="again">Play again</button>` +
      `</div>` +
      caption +
    `</div>`;

    const css = [
      `#${domId} .pg-hl-title{font-weight:700;font-size:1.05rem;margin-bottom:.5rem;color:var(--ink,#e9eef8)}`,
      `#${domId} .pg-hl-scores{display:flex;gap:1rem;justify-content:center;margin-bottom:.7rem;color:var(--ink-dim,#cdd6e6);font-size:.9rem}`,
      `#${domId} .pg-hl-score b{color:#22d3ee;font-variant-numeric:tabular-nums;margin-left:.2rem}`,
      `#${domId} .pg-hl-board{display:grid;grid-template-columns:1fr auto 1fr;align-items:stretch;gap:.6rem}`,
      `#${domId} .pg-hl-panel{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.6rem;min-height:150px;padding:1rem;border-radius:12px;border:1px solid var(--line,#23304a);background:rgba(140,160,200,.05);transition:transform .35s ease,opacity .35s ease,border-color .35s ease,background .35s ease}`,
      `#${domId} .pg-hl-left{border-color:#2dd4bf55;background:rgba(45,212,191,.06)}`,
      `#${domId} .pg-hl-label{font-weight:600;font-size:1.05rem;text-align:center;color:var(--ink,#e9eef8)}`,
      `#${domId} .pg-hl-value{font-weight:800;font-size:1.7rem;font-variant-numeric:tabular-nums;color:#fbbf24}`,
      `#${domId} .pg-hl-value.pg-hl-hidden{color:#818cf8}`,
      `#${domId} .pg-hl-vs{align-self:center;color:var(--ink-dim,#cdd6e6);font-size:.8rem;letter-spacing:.1em;text-transform:uppercase}`,
      `#${domId} .pg-hl-buttons{display:flex;flex-direction:column;gap:.4rem;width:100%;max-width:160px}`,
      `#${domId} .pg-hl-btn{font:inherit;font-weight:700;cursor:pointer;padding:.55rem .7rem;border-radius:10px;border:1px solid #818cf855;background:rgba(129,140,248,.1);color:var(--ink,#e9eef8);transition:background .2s,border-color .2s}`,
      `#${domId} .pg-hl-btn:hover{background:rgba(129,140,248,.22);border-color:#818cf8}`,
      `#${domId} .pg-hl-btn:disabled{opacity:.4;cursor:default}`,
      `#${domId} .pg-hl-msg{min-height:1.3rem;text-align:center;margin-top:.7rem;font-weight:600}`,
      `#${domId} .pg-hl-msg.ok{color:#2dd4bf}`,
      `#${domId} .pg-hl-msg.bad{color:#f472b6}`,
      `#${domId} .pg-hl-over{text-align:center;margin-top:.6rem}`,
      `#${domId} .pg-hl-over[hidden]{display:none}`,
      `#${domId} .pg-hl-again{font:inherit;font-weight:700;cursor:pointer;padding:.55rem 1.1rem;border-radius:10px;border:1px solid #22d3ee;background:rgba(34,211,238,.12);color:var(--ink,#e9eef8)}`,
      `#${domId} .pg-hl-again:hover{background:rgba(34,211,238,.24)}`,
      `#${domId} .pg-hl-caption{margin-top:.7rem;font-size:.8rem;color:var(--ink-dim,#cdd6e6);text-align:center;opacity:.8}`,
      `#${domId} .pg-hl-right.advance{transform:translateX(-12px);opacity:.6}`,
      `#${domId}.pg-hl-reduce .pg-hl-panel{transition:none}`,
      `@media(max-width:520px){#${domId} .pg-hl-board{grid-template-columns:1fr;gap:.5rem}#${domId} .pg-hl-vs{order:0}}`,
    ].join('\n');

    const jsBody = `
var ITEMS = (CONFIG.items || []).filter(function(it){ return it && typeof it.value === 'number' && isFinite(it.value); });
var UNIT = typeof CONFIG.unit === 'string' ? CONFIG.unit : '';
if (ITEMS.length < 2) return;
if (reduced) root.classList.add('pg-hl-reduce');

var elLeftLabel = $('[data-role=left-label]');
var elLeftValue = $('[data-role=left-value]');
var elRightLabel = $('[data-role=right-label]');
var elRightValue = $('[data-role=right-value]');
var elStreak = $('[data-role=streak]');
var elBest = $('[data-role=best]');
var elMsg = $('[data-role=msg]');
var elOver = $('[data-role=over]');
var elButtons = $('[data-role=buttons]');
var btnHigher = $('[data-role=higher]');
var btnLower = $('[data-role=lower]');
var btnAgain = $('[data-role=again]');
var elRightPanel = root.querySelector('.pg-hl-right');
if (!elLeftValue || !elRightValue || !btnHigher || !btnLower || !btnAgain) return;

var deck = [], pos = 0, left = null, right = null, streak = 0, best = 0, locked = false;

function fmt(v){
  var n = Math.round(v * 100) / 100;
  return String(n).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',') + UNIT;
}

function shuffle(){
  var a = ITEMS.slice();
  for (var i = a.length - 1; i > 0; i--){
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

function nextItem(){
  if (pos >= deck.length){
    // ran out — reshuffle, avoiding an immediate repeat of the current left item
    var fresh = shuffle();
    if (left && fresh.length > 1 && fresh[0].label === left.label && fresh[0].value === left.value){
      var t = fresh[0]; fresh[0] = fresh[1]; fresh[1] = t;
    }
    deck = fresh; pos = 0;
  }
  return deck[pos++];
}

function renderLeft(){
  elLeftLabel.textContent = left.label;
  elLeftValue.textContent = fmt(left.value);
}

function renderRight(){
  elRightLabel.textContent = right.label;
  elRightValue.textContent = '?';
  elRightValue.classList.add('pg-hl-hidden');
}

function setButtons(on){
  btnHigher.disabled = !on;
  btnLower.disabled = !on;
}

function start(){
  deck = shuffle(); pos = 0;
  left = nextItem();
  right = nextItem();
  streak = 0; locked = false;
  elStreak.textContent = '0';
  elMsg.textContent = '';
  elMsg.className = 'pg-hl-msg';
  elOver.hidden = true;
  elButtons.style.display = '';
  renderLeft();
  renderRight();
  setButtons(true);
}

function gameOver(){
  locked = true;
  setButtons(false);
  elMsg.textContent = 'Game over — streak: ' + streak;
  elMsg.className = 'pg-hl-msg bad';
  elButtons.style.display = 'none';
  elOver.hidden = false;
}

function advance(){
  left = right;
  right = nextItem();
  renderLeft();
  renderRight();
  setButtons(true);
  locked = false;
}

function guess(higher){
  if (locked) return;
  locked = true;
  setButtons(false);
  // reveal
  elRightValue.textContent = fmt(right.value);
  elRightValue.classList.remove('pg-hl-hidden');
  var correct = higher ? (right.value >= left.value) : (right.value <= left.value);
  if (correct){
    streak += 1;
    if (streak > best){ best = streak; elBest.textContent = String(best); }
    elStreak.textContent = String(streak);
    elMsg.textContent = 'Correct — keep going.';
    elMsg.className = 'pg-hl-msg ok';
    var delay = reduced ? 0 : 650;
    if (!reduced) elRightPanel.classList.add('advance');
    setTimeout(function(){
      if (elRightPanel) elRightPanel.classList.remove('advance');
      advance();
    }, delay);
  } else {
    gameOver();
  }
}

btnHigher.addEventListener('click', function(){ guess(true); });
btnLower.addEventListener('click', function(){ guess(false); });
btnAgain.addEventListener('click', start);

start();
`;

    return { html, css, jsBody };
  },
};
