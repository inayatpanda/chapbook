/* Family: step-explainer — a guided Prev/Next walkthrough of content cards with
   dots and a "step k of N" readout. The content-first cousin of stepper-timeline
   (no track/marker — the card IS the point). Keyboard: buttons + arrow keys on
   the dot row. Reduced motion = no card transition. */
import { esc } from './index.js';

export default {
  id: 'step-explainer',
  name: 'Step-through explainer',
  category: 'Narrative',
  description: 'A Prev/Next walkthrough of titled cards with dots and a step counter — for build-ups, procedures and arguments that land one step at a time.',
  paramsSchema: {
    type: 'object', additionalProperties: false,
    required: ['steps'],
    properties: {
      steps: {
        type: 'array', minItems: 2, maxItems: 12, title: 'The steps',
        items: {
          type: 'object', additionalProperties: false, required: ['heading'],
          properties: {
            heading: { type: 'string', title: 'Step heading' },
            body: { type: 'string', title: 'Step text', 'x-control': 'textarea' },
          },
        },
      },
      startLabel: { type: 'string', default: 'Start', title: 'Label on the first button' },
    },
  },
  presets: [
    {
      name: 'How a fracture heals',
      params: {
        steps: [
          { heading: 'Haematoma', body: 'Bleeding at the fracture forms a clot — the scaffold everything else builds on.' },
          { heading: 'Soft callus', body: 'Fibroblasts and chondroblasts bridge the gap with cartilage over 2–3 weeks.' },
          { heading: 'Hard callus', body: 'Osteoblasts mineralise the bridge into woven bone — visibly “healing” on an x-ray.' },
          { heading: 'Remodelling', body: 'Months to years: woven bone becomes lamellar bone along the lines of stress.' },
        ],
      },
    },
    {
      name: 'Make a case in four steps',
      params: {
        steps: [
          { heading: 'The claim', body: 'State the position plainly.' },
          { heading: 'The evidence', body: 'The two or three facts doing the real work.' },
          { heading: 'The catch', body: 'What the evidence cannot tell you.' },
          { heading: 'The verdict', body: 'Where that leaves us.' },
        ],
      },
    },
  ],
  build(params, domId) {
    const steps = (Array.isArray(params.steps) ? params.steps : []).slice(0, 12)
      .map((s) => ({ heading: String((s && s.heading) || ''), body: String((s && s.body) || '') }))
      .filter((s) => s.heading !== '');
    let dots = '';
    steps.forEach((s, i) => {
      dots += `<button type="button" class="pg-sx-dot" data-role="dot" data-idx="${i}" aria-label="Step ${i + 1}: ${esc(s.heading)}"></button>`;
    });
    const html =
      `<div class="pg-stage">` +
      `<div class="pg-sx-card" data-role="card" aria-live="polite">` +
      `<div class="pg-sx-h" data-role="h"></div><div class="pg-sx-b" data-role="b"></div>` +
      `</div>` +
      `<div class="pg-row pg-sx-nav">` +
      `<button type="button" class="pg-sx-btn" data-role="prev">‹ Back</button>` +
      `<div class="pg-sx-dots" data-role="dots">${dots}</div>` +
      `<button type="button" class="pg-sx-btn" data-role="next">${esc(params.startLabel || 'Start')}</button>` +
      `</div>` +
      `<div class="pg-readout pg-sx-count" data-role="count"></div>` +
      `</div>`;
    const css = [
      `#${domId} .pg-sx-card{border:1px solid var(--line,#23304a);border-radius:10px;padding:1rem 1.1rem;min-height:6em;` +
        `background:rgba(140,160,200,.05);transition:opacity .25s}`,
      `#${domId}.pg-sx-reduce .pg-sx-card{transition:none}`,
      `#${domId} .pg-sx-card.is-out{opacity:0}`,
      `#${domId} .pg-sx-h{font-weight:650;color:#fff;font-size:1.02rem}`,
      `#${domId} .pg-sx-b{margin-top:.4rem;color:var(--ink-dim,#cdd6e6);line-height:1.55}`,
      `#${domId} .pg-sx-nav{justify-content:space-between;margin-top:.8rem}`,
      `#${domId} .pg-sx-btn{min-height:44px;border:1px solid var(--line,#23304a);border-radius:9px;background:rgba(140,160,200,.05);` +
        `color:var(--ink,#e9eef8);font:600 .85rem system-ui;padding:.5rem 1rem;cursor:pointer}`,
      `#${domId} .pg-sx-btn:hover{border-color:#22d3ee}`,
      `#${domId} .pg-sx-btn:disabled{opacity:.4;cursor:default}`,
      `#${domId} .pg-sx-btn:focus-visible{outline:2px solid #22d3ee;outline-offset:2px}`,
      `#${domId} .pg-sx-dots{display:flex;gap:.45rem;align-items:center}`,
      `#${domId} .pg-sx-dot{width:12px;height:12px;border-radius:50%;border:2px solid var(--line,#3a4660);background:transparent;cursor:pointer;padding:0}`,
      `#${domId} .pg-sx-dot.is-on{border-color:#22d3ee;background:#22d3ee}`,
      `#${domId} .pg-sx-dot.is-done:not(.is-on){border-color:#2dd4bf}`,
      `#${domId} .pg-sx-dot:focus-visible{outline:2px solid #22d3ee;outline-offset:2px}`,
      `#${domId} .pg-sx-count{margin-top:.55rem;font-size:.82rem;color:var(--ink-faint,#717d99)}`,
    ].join('\n');
    const jsBody = `
var STEPS=(CONFIG.steps||[]).map(function(s){return {heading:String((s&&s.heading)||''),body:String((s&&s.body)||'')};}).filter(function(s){return s.heading!=='';});
if(reduced)root.classList.add('pg-sx-reduce');
var card=$('[data-role=card]'),h=$('[data-role=h]'),b=$('[data-role=b]');
var prev=$('[data-role=prev]'),next=$('[data-role=next]');
var dots=$$('[data-role=dot]'),count=$('[data-role=count]');
if(!card||!STEPS.length)return;
var at=-1;
function show(i,instant){
  at=Math.min(STEPS.length-1,Math.max(0,i));
  var paint=function(){
    h.textContent=STEPS[at].heading;
    b.textContent=STEPS[at].body;
    card.classList.remove('is-out');
  };
  if(instant||reduced){paint();}
  else{card.classList.add('is-out');setTimeout(paint,180);}
  dots.forEach(function(d,j){d.classList.toggle('is-on',j===at);d.classList.toggle('is-done',j<at);});
  prev.disabled=(at<=0);
  next.textContent=(at>=STEPS.length-1)?'Done ✓':'Next ›';
  next.disabled=(at>=STEPS.length-1);
  count.textContent='Step '+(at+1)+' of '+STEPS.length;
}
prev.addEventListener('click',function(){show(at-1);});
next.addEventListener('click',function(){if(at<0)show(0);else show(at+1);});
dots.forEach(function(d){
  d.addEventListener('click',function(){show(parseInt(d.getAttribute('data-idx'),10)||0);});
  d.addEventListener('keydown',function(e){
    if(e.key==='ArrowRight'){e.preventDefault();show(at+1);var n=dots[Math.min(dots.length-1,at)];if(n)n.focus();}
    else if(e.key==='ArrowLeft'){e.preventDefault();show(at-1);var p=dots[Math.max(0,at)];if(p)p.focus();}
  });
});
show(0,true);
`;
    return { html, css, jsBody };
  },
};
