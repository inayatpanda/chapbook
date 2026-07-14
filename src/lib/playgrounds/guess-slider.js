/* Family: guess slider — slide to guess a value, lock it in, then reveal the
   true answer with a verdict on how close you were. For any "how big / far /
   old / fast?" moment in a post where a guess beats being told. */
import { esc } from './index.js';

export default {
  id: 'guess-slider',
  name: 'Guess the number',
  category: 'game',
  description: 'Slide to guess a value, lock it in, then reveal the true answer and how close you were.',
  paramsSchema: {
    type: 'object', additionalProperties: false,
    required: ['question', 'answer', 'min', 'max'],
    properties: {
      title: { type: 'string', title: 'Optional title above the question' },
      question: { type: 'string', title: 'The question to guess' },
      answer: { type: 'number', title: 'The true answer' },
      min: { type: 'number', title: 'Slider minimum' },
      max: { type: 'number', title: 'Slider maximum' },
      unit: { type: 'string', title: 'Unit suffix (e.g. " km", "%")', default: '' },
      reveal: { type: 'string', title: 'Explanation shown after guessing' },
      caption: { type: 'string', title: 'Optional caption under the widget' },
    },
  },
  presets: [
    {
      name: 'When was the first public film screening?',
      params: {
        question: 'In what year did the Lumière brothers hold the first paid public film screening?',
        answer: 1895, min: 1860, max: 1940, unit: '',
        reveal: '28 December 1895, in a Paris café. People reportedly ducked at the oncoming train.',
      },
    },
    {
      name: 'How far is the Moon?',
      params: {
        question: 'Average distance from Earth to the Moon?',
        answer: 384400, min: 50000, max: 1000000, unit: ' km',
        reveal: 'About 384,400 km — close enough to feel near, far enough that light still takes 1.3 seconds.',
      },
    },
  ],
  build(params, domId) {
    const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
    let min = num(params.min, 0);
    let max = num(params.max, 100);
    if (max <= min) max = min + 1;                       // guard a usable range
    const answer = Math.max(min, Math.min(max, num(params.answer, (min + max) / 2)));
    const unit = String(params.unit == null ? '' : params.unit);
    const question = String(params.question || 'Take a guess.');
    const reveal = String(params.reveal || '');
    // a tidy step: aim for ~1000 increments across the range
    const span = max - min;
    let step = 1;
    if (span > 2000) step = Math.max(1, Math.round(span / 1000));
    else if (span <= 5) step = span / 1000 < 0.01 ? 0.01 : 0.1;
    const start = Math.round(((min + max) / 2) / step) * step;

    const title = params.title ? `<div class="pg-gs-title">${esc(params.title)}</div>` : '';
    const caption = params.caption ? `<div class="pg-gs-caption">${esc(params.caption)}</div>` : '';

    const html =
      `<div class="pg-stage">${title}` +
      `<div class="pg-gs-q">${esc(question)}</div>` +
      `<div class="pg-gs-readout" aria-live="polite">` +
      `<span class="pg-gs-guesslabel">Your guess</span>` +
      `<span class="pg-readout pg-gs-guess" data-role="guess"></span>` +
      `</div>` +
      `<div class="pg-row"><label style="flex:1">Slide to guess` +
      `<input type="range" data-role="slider" min="${min}" max="${max}" value="${start}" step="${step}" aria-label="Guess slider"></label></div>` +
      `<div class="pg-controls">` +
      `<button type="button" class="pg-gs-btn" data-role="lock">Lock in my guess</button>` +
      `<button type="button" class="pg-gs-btn pg-gs-again" data-role="again" hidden>Guess again</button>` +
      `</div>` +
      `<div class="pg-gs-result" data-role="result" hidden></div>` +
      `${caption}</div>`;

    const css = [
      `#${domId} .pg-gs-title{font-size:.9rem;color:var(--ink-dim,#9fb3c8);margin:0 0 .5rem}`,
      `#${domId} .pg-gs-q{font-size:1.05rem;font-weight:700;color:var(--ink,#e9eef8);margin:0 0 .9rem;line-height:1.35}`,
      `#${domId} .pg-gs-readout{text-align:center;margin:.2rem 0 .7rem;display:flex;flex-direction:column;gap:.15rem}`,
      `#${domId} .pg-gs-guesslabel{font-size:.78rem;letter-spacing:.04em;text-transform:uppercase;color:var(--ink-dim,#9fb3c8)}`,
      `#${domId} .pg-gs-guess{font-size:2rem;font-weight:800;color:#22d3ee;line-height:1.1}`,
      `#${domId} .pg-controls{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.3rem}`,
      `#${domId} .pg-gs-btn{font:inherit;font-weight:600;cursor:pointer;border-radius:10px;padding:.55rem 1rem;border:1px solid #2dd4bf66;background:rgba(45,212,191,.12);color:#2dd4bf;transition:background .15s,border-color .15s}`,
      `#${domId} .pg-gs-btn:hover{background:rgba(45,212,191,.2)}`,
      `#${domId} .pg-gs-again{border-color:#818cf866;background:rgba(129,140,248,.12);color:#818cf8}`,
      `#${domId} .pg-gs-again:hover{background:rgba(129,140,248,.2)}`,
      `#${domId} input[type=range]:disabled{opacity:.55;cursor:not-allowed}`,
      `#${domId} .pg-gs-result{margin-top:.9rem;padding:.85rem 1rem;border-radius:12px;border:1px solid var(--line,#23304a);background:rgba(140,160,200,.06);line-height:1.5}`,
      `#${domId} .pg-gs-verdict{font-size:1.15rem;font-weight:800;margin:0 0 .5rem}`,
      `#${domId} .pg-gs-verdict.is-spot{color:#2dd4bf}`,
      `#${domId} .pg-gs-verdict.is-close{color:#fbbf24}`,
      `#${domId} .pg-gs-verdict.is-far{color:#f472b6}`,
      `#${domId} .pg-gs-stats{display:flex;flex-wrap:wrap;gap:.4rem 1.2rem;font-size:.92rem;color:var(--ink-dim,#cdd6e6);margin:0 0 .5rem}`,
      `#${domId} .pg-gs-stats b{color:var(--ink,#e9eef8);font-weight:700}`,
      `#${domId} .pg-gs-reveal{font-size:.95rem;color:var(--ink-dim,#cdd6e6)}`,
      `#${domId} .pg-gs-caption{margin-top:.7rem;font-size:.82rem;color:var(--ink-dim,#9fb3c8)}`,
    ].join('\n');

    const jsBody = `
var slider=$('[data-role=slider]'),guess=$('[data-role=guess]');
var lockBtn=$('[data-role=lock]'),againBtn=$('[data-role=again]'),result=$('[data-role=result]');
if(!slider||!guess||!lockBtn||!againBtn||!result)return;
var ANSWER=${JSON.stringify(answer)},RANGE=${JSON.stringify(max - min)},UNIT=${JSON.stringify(unit)};
var STEP=${JSON.stringify(step)},REVEAL=${JSON.stringify(reveal)};
var DECIMALS=STEP<1?(String(STEP).split('.')[1]||'').length:0;
function fmt(v){
  var n=DECIMALS>0?Number(v).toFixed(DECIMALS):Math.round(Number(v));
  // thousands separators for the integer part
  var parts=String(n).split('.');
  parts[0]=parts[0].replace(/\\B(?=(\\d{3})+(?!\\d))/g,',');
  return parts.join('.');
}
function show(v){guess.textContent=fmt(v)+UNIT;}
slider.addEventListener('input',function(){show(parseFloat(slider.value));});
show(parseFloat(slider.value));
lockBtn.addEventListener('click',function(){
  var g=parseFloat(slider.value);
  var diff=Math.abs(g-ANSWER);
  var pct=RANGE>0?diff/RANGE:0;
  var verdict,cls;
  if(pct<=0.05){verdict='Spot on!';cls='is-spot';}
  else if(pct<=0.2){verdict='Close!';cls='is-close';}
  else{verdict='Way off';cls='is-far';}
  result.innerHTML='';
  var vEl=document.createElement('div');
  vEl.className='pg-gs-verdict '+cls;
  vEl.textContent=verdict;
  result.appendChild(vEl);
  var stats=document.createElement('div');
  stats.className='pg-gs-stats';
  stats.innerHTML='<span>Answer: <b>'+fmt(ANSWER)+UNIT+'</b></span>'+
    '<span>You guessed: <b>'+fmt(g)+UNIT+'</b></span>'+
    '<span>Off by: <b>'+fmt(diff)+UNIT+'</b></span>';
  result.appendChild(stats);
  if(REVEAL){
    var rev=document.createElement('div');
    rev.className='pg-gs-reveal';
    rev.textContent=REVEAL;
    result.appendChild(rev);
  }
  result.hidden=false;
  slider.disabled=true;
  lockBtn.hidden=true;
  againBtn.hidden=false;
});
againBtn.addEventListener('click',function(){
  slider.disabled=false;
  result.hidden=true;
  result.innerHTML='';
  againBtn.hidden=true;
  lockBtn.hidden=false;
  show(parseFloat(slider.value));
});
`;
    return { html, css, jsBody };
  },
};
