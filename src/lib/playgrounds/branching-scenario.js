/* Family: branching-scenario — a stateful narrative path. Each choice can add to
   a running score before moving to another node; outcome nodes close the scenario.
   It is deliberately self-contained and bounded (30 moves) so a malformed cycle
   cannot trap the reader. Back and restart make exploration reversible. */
import { esc } from './index.js';

export default {
  id: 'branching-scenario',
  name: 'Branching scenario',
  category: 'Narrative',
  description: 'A choose-your-path case study — decisions move through authored scenes, optionally changing a score before an outcome.',
  paramsSchema: {
    type: 'object', additionalProperties: false, required: ['start', 'nodes'],
    properties: {
      intro: { type: 'string', title: 'Opening context', 'x-control': 'textarea' },
      start: { type: 'string', title: 'Starting node id' },
      scoreLabel: { type: 'string', default: 'Score', title: 'Optional score label' },
      showScore: { type: 'boolean', default: true, title: 'Show score while playing' },
      nodes: {
        type: 'array', minItems: 2, maxItems: 30, title: 'Scenes and outcomes',
        items: {
          type: 'object', additionalProperties: false, required: ['id'],
          properties: {
            id: { type: 'string', title: 'Node id' },
            text: { type: 'string', title: 'Scene/question', 'x-control': 'textarea' },
            outcome: { type: 'string', title: 'Outcome text (leave blank for a question)', 'x-control': 'textarea' },
            options: {
              type: 'array', maxItems: 5, title: 'Choices',
              items: {
                type: 'object', additionalProperties: false, required: ['label', 'to'],
                properties: {
                  label: { type: 'string' },
                  to: { type: 'string', title: 'Destination node id' },
                  score: { type: 'number', default: 0, title: 'Score change' },
                  feedback: { type: 'string', title: 'Optional consequence shown in the trail' },
                },
              },
            },
          },
        },
      },
    },
  },
  presets: [
    {
      name: 'A difficult project conversation',
      params: {
        intro: 'A deadline is slipping and the client has noticed. Choose how you handle the conversation.',
        start: 'open',
        scoreLabel: 'Trust',
        showScore: true,
        nodes: [
          { id: 'open', text: 'How do you open the call?', options: [
            { label: 'Name the delay and take responsibility', to: 'plan', score: 2, feedback: 'You make the problem discussable.' },
            { label: 'Lead with everything the client changed', to: 'defend', score: -1, feedback: 'The call starts defensively.' },
            { label: 'Say the work is nearly done', to: 'surprise', score: -2, feedback: 'You buy time but create another risk.' },
          ] },
          { id: 'plan', text: 'The client asks what happens next.', options: [
            { label: 'Offer a smaller milestone tomorrow and a realistic final date', to: 'repair', score: 2 },
            { label: 'Promise the original date anyway', to: 'surprise', score: -2 },
          ] },
          { id: 'defend', text: 'The client starts listing earlier promises.', options: [
            { label: 'Pause, acknowledge the impact, and reset the conversation', to: 'plan', score: 1 },
            { label: 'Keep arguing the timeline', to: 'breakdown', score: -2 },
          ] },
          { id: 'repair', outcome: 'You leave with a credible plan and more trust than the delay deserved.' },
          { id: 'surprise', outcome: 'The rushed promise creates another surprise. The relationship now needs repair as well as delivery.' },
          { id: 'breakdown', outcome: 'The call ends without a shared plan. A follow-up conversation is now unavoidable.' },
        ],
      },
    },
  ],
  build(params, domId) {
    const nodes = (Array.isArray(params.nodes) ? params.nodes : []).slice(0, 30);
    const intro = params.intro ? `<div class="pg-bs-intro">${esc(params.intro)}</div>` : '';
    const html =
      `<div class="pg-stage">${intro}<div class="pg-bs-top">` +
      `<div class="pg-readout" data-role="progress"></div><div class="pg-bs-score" data-role="score"></div></div>` +
      `<div class="pg-bs-trail" data-role="trail" aria-label="Choices made"></div>` +
      `<div class="pg-bs-card" data-role="card" aria-live="polite"></div>` +
      `<div class="pg-bs-actions"><button type="button" data-role="back" hidden>‹ Back</button>` +
      `<button type="button" data-role="restart" hidden>Start over ↺</button></div></div>`;
    const css = [
      `#${domId} .pg-bs-intro{color:var(--ink-dim,#cdd6e6);line-height:1.55;margin-bottom:.8rem}`,
      `#${domId} .pg-bs-top{display:flex;justify-content:space-between;align-items:center;gap:.6rem;margin-bottom:.5rem}`,
      `#${domId} .pg-bs-score{font-size:.8rem;color:#22d3ee;font-weight:700}`,
      `#${domId} .pg-bs-trail{display:flex;flex-wrap:wrap;gap:.35rem;min-height:1.2rem;margin-bottom:.55rem}`,
      `#${domId} .pg-bs-chip{border-radius:999px;background:rgba(140,160,200,.08);color:var(--ink-faint,#717d99);font-size:.72rem;padding:.25rem .5rem}`,
      `#${domId} .pg-bs-card{border:1px solid var(--line,#23304a);border-radius:14px;background:rgba(140,160,200,.05);padding:1rem}`,
      `#${domId} .pg-bs-card h3{font-size:1.04rem;line-height:1.45;color:#fff;margin:0 0 .8rem}`,
      `#${domId} .pg-bs-options{display:grid;gap:.55rem}`,
      `#${domId} .pg-bs-options button{min-height:44px;text-align:left;border:1px solid #22d3ee55;border-radius:10px;background:rgba(34,211,238,.06);color:var(--ink-dim,#cdd6e6);font:inherit;padding:.65rem .8rem;cursor:pointer}`,
      `#${domId} .pg-bs-options button:hover{border-color:#22d3ee;color:#fff}`,
      `#${domId} .pg-bs-options button:focus-visible,#${domId} .pg-bs-actions button:focus-visible{outline:2px solid #22d3ee;outline-offset:2px}`,
      `#${domId} .pg-bs-outcome{color:var(--ink-dim,#cdd6e6);font-size:1rem;line-height:1.6}`,
      `#${domId} .pg-bs-actions{display:flex;justify-content:space-between;margin-top:.65rem}`,
      `#${domId} .pg-bs-actions button{min-height:42px;border:1px solid var(--line,#23304a);border-radius:9px;background:transparent;color:#22d3ee;font:600 .84rem system-ui;padding:.45rem .8rem;cursor:pointer}`,
    ].join('\n');
    const jsBody = `
var NODES={};(CONFIG.nodes||[]).slice(0,30).forEach(function(n){if(n&&n.id)NODES[String(n.id)]=n;});
var card=$('[data-role=card]'),trail=$('[data-role=trail]'),progress=$('[data-role=progress]'),scoreEl=$('[data-role=score]');
var back=$('[data-role=back]'),restart=$('[data-role=restart]');
if(!card)return;var current=String(CONFIG.start||''),score=0,history=[],moves=0;
function clean(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function paintTrail(){trail.innerHTML=history.map(function(h){return '<span class="pg-bs-chip">'+clean(h.label)+(h.feedback?' · '+clean(h.feedback):'')+'</span>';}).join('');}
function render(){
  var n=NODES[current];moves=history.length;progress.textContent='Decision '+(moves+1);
  scoreEl.textContent=CONFIG.showScore===false?'':String(CONFIG.scoreLabel||'Score')+': '+score;
  back.hidden=!history.length;restart.hidden=true;paintTrail();
  if(!n){card.innerHTML='<div class="pg-bs-outcome">This path is incomplete. The author needs to connect “'+clean(current)+'”.</div>';restart.hidden=false;return;}
  if(n.outcome){progress.textContent='Outcome';card.innerHTML='<div class="pg-bs-outcome">'+clean(n.outcome)+'</div>';restart.hidden=false;restart.focus();return;}
  if(moves>=30){card.innerHTML='<div class="pg-bs-outcome">This path has gone in a circle. Start again and choose another route.</div>';restart.hidden=false;return;}
  var opts=(n.options||[]).filter(function(o){return o&&o.label&&o.to;});
  card.innerHTML='<h3>'+clean(n.text||'Choose what happens next.')+'</h3><div class="pg-bs-options"></div>';
  var host=card.querySelector('.pg-bs-options');
  opts.forEach(function(o){var b=document.createElement('button');b.type='button';b.textContent=String(o.label);
    b.addEventListener('click',function(){history.push({id:current,label:String(o.label),feedback:String(o.feedback||''),score:score});score+=(+o.score)||0;current=String(o.to);render();});
    host.appendChild(b);});
  if(!opts.length){host.textContent='No choices are connected from this scene.';restart.hidden=false;}
}
back.addEventListener('click',function(){var h=history.pop();if(!h)return;current=h.id;score=h.score;render();});
restart.addEventListener('click',function(){current=String(CONFIG.start||'');score=0;history=[];render();});
render();
`;
    return { html, css, jsBody };
  },
};
