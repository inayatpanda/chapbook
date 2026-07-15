/* Family: quiz-reveal — step through N cards. Each card shows a prompt; a "Reveal"
   button uncovers the answer + an optional detail line; Prev/Next move between cards.
   A "seen k of N" readout tracks progress; an optional self-scored "I got it" tally
   lets the reader keep their own honest count (no marking, no storage). Models the
   shipped "spot the error" myth/reality cards and the case-flipper Q&A. No animation
   needed beyond the reveal toggle; reduced-motion needs nothing special. */
import { esc } from './index.js';

const cardSchema = {
  type: 'object', additionalProperties: false,
  required: ['prompt', 'answer'],
  properties: {
    prompt: { type: 'string', title: 'The question / claim shown first' },
    answer: { type: 'string', title: 'The answer revealed on click' },
    detail: { type: 'string', title: 'Optional extra detail under the answer' },
  },
};

export default {
  id: 'quiz-reveal',
  name: 'Quiz reveal',
  category: 'narrative',
  description: 'Step through cards — each hides an answer behind a Reveal button, with Prev/Next and a "seen k of N" tally. For spot-the-error and test-yourself sets.',
  paramsSchema: {
    type: 'object', additionalProperties: false,
    required: ['cards'],
    properties: {
      title: { type: 'string', title: 'Optional label above the cards' },
      cards: { type: 'array', minItems: 1, maxItems: 20, items: cardSchema },
      revealLabel: { type: 'string', title: 'Reveal-button label', default: 'Reveal' },
      scoreLabel: { type: 'string', title: 'If set, shows a self-scored "I got it" button with this label' },
    },
  },
  presets: [
    {
      name: 'Spot the error',
      params: {
        title: 'Spot the error — myth or reality?',
        revealLabel: 'Reveal the reality',
        cards: [
          { prompt: 'A dislocated shoulder should be relocated as fast as possible, by anyone to hand.', answer: 'Reality: relocate promptly, but only after assessing for fracture and neurovascular injury.', detail: 'Yanking a fracture-dislocation can turn a reducible joint into a surgical one.' },
          { prompt: 'A normal X-ray rules out a scaphoid fracture.', answer: 'Reality: early scaphoid fractures are often invisible on day-one films.', detail: 'Treat the clinical suspicion; re-image or use MRI if tenderness persists.' },
          { prompt: 'RICE — rest, ice, compression, elevation — is the gold standard for every soft-tissue injury.', answer: 'Reality: prolonged rest and icing are now questioned; early controlled loading aids recovery.', detail: 'The acronym outlived much of its evidence.' },
        ],
      },
    },
    {
      name: 'Test yourself',
      params: {
        title: 'Test yourself',
        revealLabel: 'Show answer',
        scoreLabel: 'I got it',
        cards: [
          { prompt: 'Which nerve is most at risk in a surgical neck fracture of the humerus?', answer: 'The axillary nerve.', detail: 'Test the regimental badge area for sensation and deltoid for power.' },
          { prompt: 'What is the unhappy triad of the knee?', answer: 'ACL, MCL, and medial meniscus injury.', detail: 'Classically from a lateral blow to a planted, flexed knee.' },
          { prompt: 'Name the three-column concept used to assess thoracolumbar spine stability.', answer: 'The Denis three-column model: anterior, middle, and posterior columns.', detail: 'Two or more disrupted columns suggests instability.' },
        ],
      },
    },
  ],
  build(params, domId) {
    const cards = (params.cards || []).slice(0, 20);
    const n = cards.length;
    const title = params.title ? `<div class="pg-qz-title">${esc(params.title)}</div>` : '';
    const revealLabel = esc(params.revealLabel || 'Reveal');
    const hasScore = !!params.scoreLabel;
    const scoreLabel = esc(params.scoreLabel || '');
    const scoreBtn = hasScore
      ? `<button type="button" data-role="score" class="pg-qz-btn pg-qz-score">${scoreLabel}</button>`
      : '';
    const scoreOut = hasScore
      ? `<span class="pg-qz-tally">got <b data-role="gotcount">0</b>/<b data-role="seencount">0</b></span>`
      : `<span class="pg-qz-tally">seen <b data-role="seencount">0</b> of <b data-role="total">${n}</b></span>`;
    const html =
      `<div class="pg-stage">${title}` +
      `<div class="pg-readout pg-qz-status"><span>card <b data-role="idx">1</b> of <b data-role="count">${n}</b></span>${scoreOut}</div>` +
      `<div class="pg-qz-card" data-role="card" aria-live="polite">` +
      `<div class="pg-qz-prompt" data-role="prompt"></div>` +
      `<button type="button" data-role="reveal" class="pg-qz-btn pg-qz-reveal">${revealLabel}</button>` +
      `<div class="pg-qz-answer" data-role="answer" hidden>` +
      `<div class="pg-qz-ans-text" data-role="anstext"></div>` +
      `<div class="pg-qz-detail" data-role="detail"></div>` +
      `</div></div>` +
      `<div class="pg-controls pg-qz-controls">` +
      `<div class="pg-qz-nav" role="group" aria-label="Step through cards">` +
      `<button type="button" data-role="prev" class="pg-qz-btn">‹ Prev</button>` +
      `<button type="button" data-role="next" class="pg-qz-btn">Next ›</button>` +
      `</div>${scoreBtn}</div></div>`;
    const css = [
      `#${domId} .pg-qz-title{font-size:.9rem;color:var(--ink-dim,#9fb3c8);margin:0 0 .7rem}`,
      `#${domId} .pg-qz-status{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-bottom:.8rem}`,
      `#${domId} .pg-qz-status b{color:#fff}`,
      `#${domId} .pg-qz-tally{color:var(--ink-faint,#717d99)}`,
      `#${domId} .pg-qz-card{border:1px solid var(--line,#23304a);border-radius:12px;padding:1.1rem;background:rgba(140,160,200,.05)}`,
      `#${domId} .pg-qz-prompt{color:#fff;font-weight:600;font-size:1.05rem;margin-bottom:.9rem}`,
      `#${domId} .pg-qz-answer{margin-top:.9rem;border-top:1px dashed var(--line,#23304a);padding-top:.9rem}`,
      `#${domId} .pg-qz-ans-text{color:var(--cyan,#22d3ee);font-weight:600}`,
      `#${domId} .pg-qz-detail{color:var(--ink-dim,#9fb3c8);font-size:.9rem;margin-top:.4rem}`,
      `#${domId} .pg-qz-btn{appearance:none;background:transparent;border:1px solid var(--line,#23304a);border-radius:8px;padding:.5rem 1.1rem;color:var(--ink-dim,#9fb3c8);font:inherit;cursor:pointer;transition:.2s}`,
      `#${domId} .pg-qz-btn:hover{border-color:var(--cyan,#22d3ee);color:var(--cyan,#22d3ee)}`,
      `#${domId} .pg-qz-btn:disabled{opacity:.4;cursor:default}`,
      `#${domId} .pg-qz-reveal{border-color:var(--cyan,#22d3ee);color:var(--cyan,#22d3ee)}`,
      `#${domId} .pg-qz-score.is-got{border-color:#2dd4bf;color:#2dd4bf}`,
      `#${domId} .pg-qz-controls{display:flex;justify-content:space-between;gap:.6rem;flex-wrap:wrap;margin-top:1rem}`,
      `#${domId} .pg-qz-nav{display:inline-flex;gap:.5rem}`,
      `@media(max-width:620px){#${domId} .pg-qz-controls{flex-direction:column}#${domId} .pg-qz-nav{justify-content:space-between}}`,
    ].join('\n');
    const jsBody = `
var E=function(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');};
var cards=(CONFIG.cards||[]).slice(0,20);
var n=cards.length;
if(!n)return;
var maxIdx=n-1;
var hasScore=!!CONFIG.scoreLabel;
var promptEl=$('[data-role=prompt]'),reveal=$('[data-role=reveal]'),answer=$('[data-role=answer]');
var ansText=$('[data-role=anstext]'),detail=$('[data-role=detail]');
var prev=$('[data-role=prev]'),next=$('[data-role=next]');
var idxOut=$('[data-role=idx]'),seenOut=$('[data-role=seencount]'),gotOut=$('[data-role=gotcount]');
var scoreBtn=$('[data-role=score]');
var cur=0;
var seen={},got={};
function showAnswer(yes){
  if(answer)answer.hidden=!yes;
  if(reveal)reveal.disabled=yes;
  if(yes){seen[cur]=true;}
  if(scoreBtn){scoreBtn.disabled=!yes;scoreBtn.classList.toggle('is-got',!!got[cur]);}
  updateTally();
}
function countOf(o){var c=0;for(var k in o)if(o[k])c++;return c;}
function updateTally(){
  if(seenOut)seenOut.textContent=String(countOf(seen));
  if(hasScore&&gotOut)gotOut.textContent=String(countOf(got));
}
function render(){
  cur=Math.max(0,Math.min(maxIdx,cur|0));
  var c=cards[cur]||{};
  if(promptEl)promptEl.textContent=c.prompt||'';
  if(ansText)ansText.textContent=c.answer||'';
  if(detail)detail.textContent=c.detail||'';
  if(idxOut)idxOut.textContent=String(cur+1);
  showAnswer(false);
  if(prev)prev.disabled=(cur<=0);
  if(next)next.disabled=(cur>=maxIdx);
}
function go(i){cur=i;render();}
if(reveal)reveal.addEventListener('click',function(){showAnswer(true);});
if(prev)prev.addEventListener('click',function(){go(cur-1);});
if(next)next.addEventListener('click',function(){go(cur+1);});
if(scoreBtn)scoreBtn.addEventListener('click',function(){
  if(!seen[cur])return;
  got[cur]=!got[cur];
  scoreBtn.classList.toggle('is-got',!!got[cur]);
  updateTally();
});
go(0);
`;
    return { html, css, jsBody };
  },
};
