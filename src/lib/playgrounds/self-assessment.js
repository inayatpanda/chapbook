/* Family: self-assessment — a multi-question outcome quiz. Unlike scored-quiz,
   answers are not right/wrong: each contributes to an author-defined profile and
   the highest total becomes the reader's result. Buttons are keyboard/touch ready;
   no answers leave the page and a run resets without storage. */
import { esc } from './index.js';

export default {
  id: 'self-assessment',
  name: 'Self-assessment',
  category: 'Game',
  description: 'A profile or recommendation quiz — answers add to outcome bands, then the reader receives the closest result. For reflective and advisory posts.',
  paramsSchema: {
    type: 'object', additionalProperties: false,
    required: ['questions', 'outcomes'],
    properties: {
      intro: { type: 'string', title: 'Opening instruction' },
      questions: {
        type: 'array', minItems: 1, maxItems: 12, title: 'Questions',
        items: {
          type: 'object', additionalProperties: false, required: ['q', 'options'],
          properties: {
            q: { type: 'string', title: 'Question' },
            options: {
              type: 'array', minItems: 2, maxItems: 6, title: 'Answers',
              items: {
                type: 'object', additionalProperties: false, required: ['label', 'outcome'],
                properties: {
                  label: { type: 'string', title: 'Answer' },
                  outcome: { type: 'integer', minimum: 0, maximum: 5, default: 0, title: 'Outcome number (0-based)' },
                  weight: { type: 'number', minimum: 0, maximum: 10, default: 1, title: 'Weight' },
                },
              },
            },
          },
        },
      },
      outcomes: {
        type: 'array', minItems: 2, maxItems: 6, title: 'Outcome profiles',
        items: {
          type: 'object', additionalProperties: false, required: ['name', 'text'],
          properties: {
            name: { type: 'string', title: 'Result name' },
            text: { type: 'string', title: 'Result explanation', 'x-control': 'textarea' },
            next: { type: 'string', title: 'Optional next step' },
          },
        },
      },
    },
  },
  presets: [
    {
      name: 'Your working rhythm',
      params: {
        intro: 'Choose the answer that sounds most like you. There are no wrong answers.',
        questions: [
          { q: 'A clear morning appears in your calendar. What do you do first?', options: [
            { label: 'Start the hardest thing before messages arrive', outcome: 0, weight: 2 },
            { label: 'Make a short plan and clear the quick jobs', outcome: 1, weight: 2 },
            { label: 'Call someone and build momentum together', outcome: 2, weight: 2 },
          ] },
          { q: 'When an idea stalls, what usually helps?', options: [
            { label: 'Quiet and another uninterrupted hour', outcome: 0, weight: 2 },
            { label: 'Breaking it into a smaller next action', outcome: 1, weight: 2 },
            { label: 'Talking it through out loud', outcome: 2, weight: 2 },
          ] },
          { q: 'Which finish feels best?', options: [
            { label: 'One substantial piece of work completed', outcome: 0, weight: 1 },
            { label: 'Everything important moved forward', outcome: 1, weight: 1 },
            { label: 'The group is aligned and unblocked', outcome: 2, weight: 1 },
          ] },
        ],
        outcomes: [
          { name: 'Deep diver', text: 'You do your best work with protected time and one demanding focus.', next: 'Try reserving the first uninterrupted hour for the task that needs the most thought.' },
          { name: 'Steady orchestrator', text: 'You create momentum by making the work visible and moving several pieces deliberately.', next: 'Keep a short active list and decide the next action before you stop.' },
          { name: 'Collaborative spark', text: 'Conversation and shared energy sharpen your thinking.', next: 'Build in an early check-in instead of waiting until the work feels finished.' },
        ],
      },
    },
  ],
  build(params, domId) {
    const questions = (Array.isArray(params.questions) ? params.questions : []).slice(0, 12);
    const outcomes = (Array.isArray(params.outcomes) ? params.outcomes : []).slice(0, 6);
    const intro = params.intro ? `<div class="pg-sa-intro">${esc(params.intro)}</div>` : '';
    const html =
      `<div class="pg-stage">${intro}` +
      `<div class="pg-readout pg-sa-progress" data-role="progress"></div>` +
      `<div class="pg-sa-q" data-role="q"></div>` +
      `<div class="pg-sa-options" data-role="options"></div>` +
      `<div class="pg-sa-result" data-role="result" aria-live="polite" hidden></div>` +
      `<div class="pg-sa-actions"><button type="button" data-role="back" hidden>‹ Back</button>` +
      `<button type="button" data-role="restart" hidden>Try again ↺</button></div>` +
      `</div>`;
    const css = [
      `#${domId} .pg-sa-intro{color:var(--ink-dim,#9fb3c8);font-size:.9rem;line-height:1.5;margin-bottom:.8rem}`,
      `#${domId} .pg-sa-progress{font-size:.8rem;color:var(--ink-faint,#717d99);margin-bottom:.45rem}`,
      `#${domId} .pg-sa-q{font-size:1.04rem;font-weight:700;color:#fff;line-height:1.42;margin-bottom:.75rem}`,
      `#${domId} .pg-sa-options{display:grid;gap:.55rem}`,
      `#${domId} .pg-sa-options button{min-height:44px;text-align:left;border:1px solid var(--line,#23304a);border-radius:11px;` +
        `background:rgba(140,160,200,.05);color:var(--ink-dim,#cdd6e6);font:inherit;padding:.7rem .85rem;cursor:pointer}`,
      `#${domId} .pg-sa-options button:hover{border-color:#22d3ee;color:#fff}`,
      `#${domId} .pg-sa-options button:focus-visible,#${domId} .pg-sa-actions button:focus-visible{outline:2px solid #22d3ee;outline-offset:2px}`,
      `#${domId} .pg-sa-result{border:1px solid #22d3ee66;border-radius:13px;background:rgba(34,211,238,.07);padding:1rem}`,
      `#${domId} .pg-sa-result h3{margin:0 0 .35rem;color:#22d3ee;font-size:1.12rem}`,
      `#${domId} .pg-sa-result p{margin:.25rem 0;color:var(--ink-dim,#cdd6e6);line-height:1.55}`,
      `#${domId} .pg-sa-result .pg-sa-next{color:#fff;margin-top:.65rem}`,
      `#${domId} .pg-sa-actions{display:flex;justify-content:space-between;gap:.5rem;margin-top:.8rem}`,
      `#${domId} .pg-sa-actions button{min-height:42px;border:1px solid var(--line,#23304a);border-radius:9px;background:transparent;color:#22d3ee;font:600 .84rem system-ui;padding:.45rem .8rem;cursor:pointer}`,
    ].join('\n');
    const jsBody = `
var QS=(CONFIG.questions||[]).map(function(q){
  return {q:String((q&&q.q)||''),options:(q&&q.options||[]).map(function(o){
    return {label:String((o&&o.label)||''),outcome:Math.max(0,(+((o||{}).outcome))||0),weight:Math.max(0,(+((o||{}).weight))||1)};
  }).filter(function(o){return o.label;})};
}).filter(function(q){return q.q&&q.options.length>=2;});
var OUT=(CONFIG.outcomes||[]).map(function(o){return {name:String((o&&o.name)||''),text:String((o&&o.text)||''),next:String((o&&o.next)||'')};}).filter(function(o){return o.name;});
var progress=$('[data-role=progress]'),qEl=$('[data-role=q]'),opts=$('[data-role=options]');
var result=$('[data-role=result]'),back=$('[data-role=back]'),restart=$('[data-role=restart]');
if(!QS.length||OUT.length<2||!qEl||!opts)return;
var at=0,answers=[];
function clean(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function show(){
  result.hidden=true;restart.hidden=true;qEl.hidden=false;opts.hidden=false;
  var q=QS[at];progress.textContent='Question '+(at+1)+' of '+QS.length;qEl.textContent=q.q;opts.innerHTML='';
  q.options.forEach(function(o,i){var b=document.createElement('button');b.type='button';b.textContent=o.label;
    b.addEventListener('click',function(){answers[at]=i;if(at<QS.length-1){at++;show();}else finish();});opts.appendChild(b);});
  back.hidden=(at===0);back.disabled=(at===0);
}
function finish(){
  var scores=OUT.map(function(){return 0;});
  QS.forEach(function(q,i){var choice=q.options[answers[i]];if(choice&&scores[choice.outcome]!=null)scores[choice.outcome]+=choice.weight;});
  var best=0;scores.forEach(function(v,i){if(v>scores[best])best=i;});
  var o=OUT[best]||OUT[0];
  progress.textContent='Your result';qEl.hidden=true;opts.hidden=true;back.hidden=true;restart.hidden=false;
  result.hidden=false;result.innerHTML='<h3>'+clean(o.name)+'</h3><p>'+clean(o.text)+'</p>'+(o.next?'<p class="pg-sa-next"><b>Try this:</b> '+clean(o.next)+'</p>':'');
  restart.focus();
}
back.addEventListener('click',function(){if(at>0){at--;answers.length=at;show();}});
restart.addEventListener('click',function(){at=0;answers=[];show();});
show();
`;
    return { html, css, jsBody };
  },
};
