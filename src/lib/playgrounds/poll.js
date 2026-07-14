/* Family: poll — a question with tappable options. Tapping selects an option and
   marks it with a "You chose" state. There is NO backend and NO network/storage,
   so the family cannot tally live votes. Two self-contained behaviours are offered
   via showResults:
     - 'none' : tapping simply highlights the reader's pick (a clean opinion prompt).
     - 'bars' : each option may carry an author-supplied `weight` (a fixed,
                illustrative distribution the author authored — e.g. "what a survey
                found"). Tapping reveals the bars; the reader's own pick is always
                clearly marked. The weights are presentation only, never a live tally.
   Keyboard (radio semantics) + touch accessible. Reduced-motion = no bar animation. */
import { esc } from './index.js';

const optionSchema = {
  type: 'object', additionalProperties: false,
  required: ['label'],
  properties: {
    label: { type: 'string', title: 'Option text' },
    weight: { type: 'number', title: 'Illustrative share for the bars (0–100), author-set', minimum: 0, maximum: 100 },
  },
};

export default {
  id: 'poll',
  name: 'Poll',
  category: 'Interactive',
  description: 'A question with tappable options. Tapping marks the reader\'s pick; optionally reveals an author-supplied distribution as bars (no live voting — there is no backend).',
  paramsSchema: {
    type: 'object', additionalProperties: false,
    required: ['question', 'options'],
    properties: {
      question: { type: 'string', title: 'The question shown above the options' },
      // Items are {label, weight} objects (weight only matters for the bars mode);
      // build() still accepts plain strings for backward compatibility with old blocks.
      options: { type: 'array', minItems: 2, maxItems: 8, title: 'The options', items: optionSchema },
      showResults: { type: 'string', enum: ['bars', 'none'], default: 'none', title: 'After a tap: highlight the pick only (none) or also reveal author-set bars' },
      note: { type: 'string', title: 'Optional caption under the poll (e.g. where the figures came from)' },
    },
  },
  presets: [
    {
      name: 'Reader opinion (pick only)',
      params: {
        question: 'When a shoulder dislocates for the first time, what matters most?',
        options: ['Speed of relocation', 'Ruling out a fracture first', 'Pain relief', 'Getting an MRI'],
        showResults: 'none',
      },
    },
    {
      name: 'Survey result (bars)',
      params: {
        question: 'Which knee injury is the commonest in contact sport?',
        options: [
          { label: 'ACL tear', weight: 46 },
          { label: 'MCL sprain', weight: 31 },
          { label: 'Meniscal tear', weight: 18 },
          { label: 'PCL tear', weight: 5 },
        ],
        showResults: 'bars',
        note: 'Illustrative shares — an author-authored distribution, not a live tally.',
      },
    },
  ],
  build(params, domId) {
    // Normalise options to {label, weight}. Accept plain strings or objects.
    const raw = Array.isArray(params.options) ? params.options.slice(0, 8) : [];
    const opts = raw.map((o) => {
      if (o && typeof o === 'object') return { label: String(o.label || ''), weight: Number(o.weight) || 0 };
      return { label: String(o == null ? '' : o), weight: 0 };
    }).filter((o) => o.label !== '');
    const showBars = params.showResults === 'bars';
    const question = params.question ? `<div class="pg-poll-q" id="${domId}-q">${esc(params.question)}</div>` : '';
    const note = params.note ? `<div class="pg-poll-note">${esc(params.note)}</div>` : '';

    let rows = '';
    opts.forEach((o, i) => {
      rows +=
        `<button type="button" class="pg-poll-opt" role="radio" aria-checked="false" data-role="opt" data-idx="${i}">` +
        `<span class="pg-poll-bar" data-role="bar" aria-hidden="true"></span>` +
        `<span class="pg-poll-mark" aria-hidden="true"></span>` +
        `<span class="pg-poll-label">${esc(o.label)}</span>` +
        (showBars ? `<span class="pg-poll-pct" data-role="pct" aria-hidden="true"></span>` : '') +
        `</button>`;
    });

    const html =
      `<div class="pg-stage">${question}` +
      `<div class="pg-poll-list" role="radiogroup"${params.question ? ` aria-labelledby="${domId}-q"` : ' aria-label="Poll"'} data-role="list">${rows}</div>` +
      `<div class="pg-readout pg-poll-readout" data-role="readout" aria-live="polite">Tap an option to choose.</div>` +
      note +
      `</div>`;

    const css = [
      `#${domId} .pg-poll-q{font-weight:600;color:var(--ink,#e9eef8);font-size:1.05rem;margin:0 0 .9rem}`,
      `#${domId} .pg-poll-list{display:flex;flex-direction:column;gap:.6rem}`,
      `#${domId} .pg-poll-opt{position:relative;display:flex;align-items:center;gap:.7rem;width:100%;text-align:left;overflow:hidden;` +
        `border:1px solid var(--line,#23304a);border-radius:10px;padding:.75rem .9rem;min-height:48px;background:rgba(140,160,200,.05);` +
        `color:var(--ink-dim,#cdd6e6);font:inherit;cursor:pointer;transition:border-color .15s,color .15s,background .15s}`,
      `#${domId} .pg-poll-opt:hover{border-color:var(--cyan,#22d3ee);color:var(--ink,#e9eef8)}`,
      `#${domId} .pg-poll-opt:focus-visible{outline:2px solid #22d3ee;outline-offset:2px}`,
      `#${domId} .pg-poll-bar{position:absolute;inset:0 auto 0 0;width:0;background:linear-gradient(90deg,rgba(45,212,191,.22),rgba(129,140,248,.22));` +
        `border-right:2px solid var(--cyan,#22d3ee);transition:width .6s cubic-bezier(.2,.7,.2,1);pointer-events:none}`,
      `#${domId} .pg-poll-mark{position:relative;flex:0 0 auto;width:18px;height:18px;border-radius:50%;border:2px solid var(--line,#3a4660);transition:border-color .15s,background .15s}`,
      `#${domId} .pg-poll-label{position:relative;flex:1 1 auto;font-weight:500}`,
      `#${domId} .pg-poll-pct{position:relative;flex:0 0 auto;font-variant-numeric:tabular-nums;color:var(--cyan,#22d3ee);font-weight:600;opacity:0;transition:opacity .3s}`,
      `#${domId} .pg-poll-opt.is-picked{border-color:var(--cyan,#22d3ee);color:var(--ink,#fff);background:rgba(34,211,238,.08)}`,
      `#${domId} .pg-poll-opt.is-picked .pg-poll-mark{border-color:var(--cyan,#22d3ee);background:radial-gradient(circle at center,var(--cyan,#22d3ee) 0 40%,transparent 42%)}`,
      `#${domId} .pg-poll-opt.is-picked .pg-poll-label::after{content:" — you chose";color:var(--teal,#2dd4bf);font-weight:600;font-size:.85em}`,
      `#${domId} .pg-poll-list.show-pct .pg-poll-pct{opacity:1}`,
      `#${domId} .pg-poll-readout{margin-top:.9rem;color:var(--ink-dim,#9fb3c8)}`,
      `#${domId} .pg-poll-readout b{color:#fff}`,
      `#${domId} .pg-poll-note{margin-top:.5rem;font-size:.82rem;color:var(--ink-faint,#717d99)}`,
      `#${domId}.pg-poll-reduce .pg-poll-bar,#${domId}.pg-poll-reduce .pg-poll-pct{transition:none}`,
    ].join('\n');

    const jsBody = `
var raw=(CONFIG.options||[]).slice(0,8);
var OPTS=raw.map(function(o){
  if(o&&typeof o==='object')return {label:String(o.label||''),weight:(+o.weight)||0};
  return {label:String(o==null?'':o),weight:0};
}).filter(function(o){return o.label!=='';});
var SHOW_BARS=(CONFIG.showResults==='bars');
if(reduced)root.classList.add('pg-poll-reduce');
var list=$('[data-role=list]');
var opts=$$('[data-role=opt]');
var readout=$('[data-role=readout]');
if(!list||!opts.length)return;
// Normalise the author weights to percentages for the bars (so they need not sum to 100).
var total=0;OPTS.forEach(function(o){total+=Math.max(0,o.weight);});
function pctOf(i){if(!total)return 0;return Math.round((Math.max(0,(OPTS[i]||{}).weight)/total)*100);}
var picked=-1,revealed=false;
function paint(){
  opts.forEach(function(btn,i){
    var on=(i===picked);
    btn.classList.toggle('is-picked',on);
    btn.setAttribute('aria-checked',on?'true':'false');
    btn.tabIndex=(picked<0?(i===0?0:-1):(on?0:-1));
    if(SHOW_BARS){
      var bar=btn.querySelector('[data-role=bar]');
      var pct=btn.querySelector('[data-role=pct]');
      var p=pctOf(i);
      if(bar)bar.style.width=(revealed?p:0)+'%';
      if(pct)pct.textContent=p+'%';
    }
  });
  if(SHOW_BARS&&revealed)list.classList.add('show-pct');
}
function choose(i){
  if(i<0||i>=opts.length)return;
  picked=i;
  if(SHOW_BARS)revealed=true;
  paint();
  var lbl=(OPTS[i]||{}).label||'';
  if(SHOW_BARS){
    readout.innerHTML='You chose <b>'+lbl.replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</b> ('+pctOf(i)+'% of the illustrative split).';
  }else{
    readout.innerHTML='You chose <b>'+lbl.replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</b>.';
  }
}
opts.forEach(function(btn){
  var i=parseInt(btn.getAttribute('data-idx'),10)||0;
  btn.addEventListener('click',function(){choose(i);});
  btn.addEventListener('keydown',function(e){
    var k=e.key,n=opts.length,j=-1;
    if(k==='ArrowDown'||k==='ArrowRight')j=(i+1)%n;
    else if(k==='ArrowUp'||k==='ArrowLeft')j=(i-1+n)%n;
    else if(k===' '||k==='Enter'){e.preventDefault();choose(i);return;}
    if(j>=0){e.preventDefault();opts[j].focus();choose(j);}
  });
});
paint();
`;
    return { html, css, jsBody };
  },
};
