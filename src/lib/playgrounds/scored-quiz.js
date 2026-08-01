/* Family: scored-quiz — multiple questions answered one at a time; each answer is
   marked immediately (with an optional explanation), and the run ends on a score
   with an author-set verdict band. The multi-question big sibling of quiz-reveal.
   All controls are buttons (keyboard + touch); no storage, resets on "Try again". */
import { esc } from './index.js';

export default {
  id: 'scored-quiz',
  name: 'Scored quiz',
  category: 'game',
  description: 'A short multi-question quiz — answers are marked as you go, and the score lands on a verdict you write. For test-yourself posts.',
  paramsSchema: {
    type: 'object', additionalProperties: false,
    required: ['questions'],
    properties: {
      questions: {
        type: 'array', minItems: 1, maxItems: 12, title: 'The questions',
        items: {
          type: 'object', additionalProperties: false, required: ['q', 'options'],
          properties: {
            q: { type: 'string', title: 'The question' },
            options: { type: 'array', minItems: 2, maxItems: 5, title: 'Options', items: { type: 'string' } },
            answer: { type: 'integer', minimum: 0, maximum: 4, default: 0, title: 'Correct option (0-based)' },
            explain: { type: 'string', title: 'One-line explanation shown after answering', 'x-control': 'textarea' },
          },
        },
      },
      verdicts: {
        type: 'array', minItems: 1, maxItems: 5, title: 'Verdict bands (highest min that fits wins)',
        items: {
          type: 'object', additionalProperties: false, required: ['min', 'text'],
          properties: {
            min: { type: 'integer', minimum: 0, default: 0, title: 'Minimum correct answers' },
            text: { type: 'string', title: 'Verdict line' },
          },
        },
      },
    },
  },
  presets: [
    {
      name: 'Everyday science quiz',
      params: {
        questions: [
          { q: 'Which reaches you first in a storm?', options: ['The lightning', 'The thunder', 'They arrive together'], answer: 0, explain: 'Light travels far faster than sound, so you see the flash before you hear the thunder.' },
          { q: 'What makes bread dough rise?', options: ['Baking the flour', 'Yeast giving off gas', 'Adding cold water'], answer: 1, explain: 'Yeast ferments the sugars and releases carbon dioxide, which the gluten traps as bubbles.' },
          { q: 'Why does the sky look blue?', options: ['The sea reflects up', 'Air scatters blue light most', 'The sun is blue'], answer: 1, explain: 'Shorter blue wavelengths scatter more in the atmosphere than the longer red ones.' },
        ],
        verdicts: [
          { min: 0, text: 'Worth a re-read — the basics bite hardest.' },
          { min: 2, text: 'Solid — one slip.' },
          { min: 3, text: 'Full marks.' },
        ],
      },
    },
  ],
  build(params, domId) {
    const qs = (Array.isArray(params.questions) ? params.questions : []).slice(0, 12)
      .map((it) => ({
        q: String((it && it.q) || ''),
        options: (Array.isArray(it && it.options) ? it.options : []).slice(0, 5).map((o) => String(o == null ? '' : o)).filter((o) => o !== ''),
        answer: Math.max(0, Number(it && it.answer) || 0),
        explain: String((it && it.explain) || ''),
      }))
      .filter((it) => it.q !== '' && it.options.length >= 2);
    const html =
      `<div class="pg-stage">` +
      `<div class="pg-readout pg-sq-progress" data-role="progress"></div>` +
      `<div class="pg-sq-q" data-role="q"></div>` +
      `<div class="pg-sq-opts" data-role="opts"></div>` +
      `<div class="pg-sq-explain" data-role="explain" aria-live="polite"></div>` +
      `<div class="pg-row pg-sq-nav">` +
      `<button type="button" class="pg-sq-next" data-role="next" style="display:none">Next question ›</button>` +
      `</div>` +
      `</div>`;
    const css = [
      `#${domId} .pg-sq-progress{font-size:.82rem;color:var(--ink-faint,#717d99);margin:0 0 .55rem}`,
      `#${domId} .pg-sq-q{font-weight:650;color:#fff;font-size:1.02rem;margin:0 0 .8rem;line-height:1.4}`,
      `#${domId} .pg-sq-opts{display:flex;flex-direction:column;gap:.55rem}`,
      `#${domId} .pg-sq-opt{display:block;width:100%;text-align:left;min-height:44px;border:1px solid var(--line,#23304a);` +
        `border-radius:10px;padding:.7rem .9rem;background:rgba(140,160,200,.05);color:var(--ink-dim,#cdd6e6);` +
        `font:inherit;cursor:pointer;transition:border-color .15s,background .15s}`,
      `#${domId} .pg-sq-opt:hover:not(:disabled){border-color:#22d3ee;color:#fff}`,
      `#${domId} .pg-sq-opt:focus-visible{outline:2px solid #22d3ee;outline-offset:2px}`,
      `#${domId} .pg-sq-opt.is-right{border-color:#2dd4bf;background:rgba(45,212,191,.12);color:#fff}`,
      `#${domId} .pg-sq-opt.is-wrong{border-color:#fb7185;background:rgba(251,113,133,.1)}`,
      `#${domId} .pg-sq-opt:disabled{cursor:default}`,
      `#${domId} .pg-sq-explain{min-height:1.4em;margin-top:.7rem;color:var(--ink-dim,#9fb3c8);font-size:.88rem;line-height:1.5}`,
      `#${domId} .pg-sq-explain b{color:#fff}`,
      `#${domId} .pg-sq-nav{margin-top:.6rem;justify-content:flex-end}`,
      `#${domId} .pg-sq-next{min-height:44px;border:1px solid #22d3ee;border-radius:9px;background:rgba(34,211,238,.1);` +
        `color:#22d3ee;font:600 .85rem system-ui;padding:.5rem 1rem;cursor:pointer}`,
      `#${domId} .pg-sq-next:focus-visible{outline:2px solid #22d3ee;outline-offset:2px}`,
    ].join('\n');
    const jsBody = `
var QS=(CONFIG.questions||[]).map(function(it){
  var opts=(it&&it.options||[]).map(function(o){return String(o==null?'':o);}).filter(function(o){return o!=='';});
  return {q:String((it&&it.q)||''),options:opts,answer:Math.max(0,Math.min(opts.length-1,(+((it||{}).answer))||0)),explain:String((it&&it.explain)||'')};
}).filter(function(it){return it.q!==''&&it.options.length>=2;});
var VERDICTS=(CONFIG.verdicts||[]).map(function(v){return {min:Math.max(0,(+((v||{}).min))||0),text:String((v&&v.text)||'')};}).filter(function(v){return v.text!=='';});
var progress=$('[data-role=progress]'),qEl=$('[data-role=q]'),optsEl=$('[data-role=opts]');
var explain=$('[data-role=explain]'),next=$('[data-role=next]');
if(!qEl||!QS.length)return;
var esc=function(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');};
var at=0,score=0;
function showQ(){
  var it=QS[at];
  progress.textContent='Question '+(at+1)+' of '+QS.length+(at?(' · '+score+' right so far'):'');
  qEl.textContent=it.q;
  explain.textContent='';
  next.style.display='none';
  optsEl.innerHTML='';
  it.options.forEach(function(o,i){
    var btn=document.createElement('button');
    btn.type='button';btn.className='pg-sq-opt';btn.textContent=o;
    btn.addEventListener('click',function(){answer(i,btn);});
    optsEl.appendChild(btn);
  });
}
function answer(i,btn){
  var it=QS[at];
  var kids=Array.prototype.slice.call(optsEl.children);
  kids.forEach(function(k,j){k.disabled=true;if(j===it.answer)k.classList.add('is-right');});
  var right=(i===it.answer);
  if(right)score++;else btn.classList.add('is-wrong');
  explain.innerHTML=(right?'<b>Right.</b> ':'<b>Not quite.</b> ')+esc(it.explain||'');
  next.textContent=(at>=QS.length-1)?'See your score ›':'Next question ›';
  next.style.display='';
  next.focus();
}
function finish(){
  progress.textContent='Done';
  qEl.textContent='You scored '+score+' out of '+QS.length+'.';
  optsEl.innerHTML='';
  var verdict='';
  VERDICTS.forEach(function(v){if(score>=v.min)verdict=v.text;});
  explain.innerHTML=verdict?esc(verdict):'';
  next.textContent='Try again ↺';
  next.style.display='';
  next.onclick=function(){at=0;score=0;next.onclick=null;showQ();};
}
next.addEventListener('click',function(){
  if(next.onclick)return;
  if(at>=QS.length-1){finish();return;}
  at++;showQ();
});
showQ();
`;
    return { html, css, jsBody };
  },
};
