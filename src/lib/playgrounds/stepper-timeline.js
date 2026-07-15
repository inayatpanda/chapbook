/* Family: stepper timeline — step / scrub through N stages. Each stage updates a
   caption + a moving marker on an SVG track + a "stage k of N" readout + optional
   detail line. The narrative workhorse: models a history-through-the-ages timeline
   and a step-by-step troubleshooting walkthrough. A range slider is primary; prev/next
   buttons mirror it. Each stage may carry a value (0..1) that positions the marker
   along the track (e.g. an era / a probability / a position); when absent the marker
   falls back to even spacing across the stages. */
import { esc } from './index.js';

const stageSchema = {
  type: 'object', additionalProperties: false,
  required: ['label', 'caption'],
  properties: {
    label: { type: 'string', title: 'Short stage label (shown on the marker + readout)' },
    caption: { type: 'string', title: 'One- or two-line caption for this stage' },
    value: { type: 'number', title: 'Marker position 0..1 (optional; else even spacing)' },
    detail: { type: 'string', title: 'Optional detail / verdict line' },
  },
};

export default {
  id: 'stepper-timeline',
  name: 'Stepper timeline',
  category: 'narrative',
  description: 'Step or scrub through N stages — a moving marker, a caption, and a "stage k of N" readout. For walkthroughs and timelines.',
  paramsSchema: {
    type: 'object', additionalProperties: false,
    required: ['stages'],
    properties: {
      title: { type: 'string', title: 'Optional label above the timeline' },
      xLabel: { type: 'string', title: 'Optional label under the track' },
      stages: { type: 'array', minItems: 2, maxItems: 12, items: stageSchema },
    },
  },
  presets: [
    {
      name: 'Eras of an idea',
      params: {
        title: 'Mapping the night sky, through the ages',
        xLabel: 'earlier ←  time  → later',
        stages: [
          { label: 'Neolithic', value: 0, caption: 'Stone circles line up with the solstice sunrise — sky-keeping built to last.', detail: 'Careful sky-watching predates writing; calendar and ritual both proposed.' },
          { label: 'Antiquity', value: 0.34, caption: 'Greek astronomers name the constellations and write the first star catalogues.', detail: 'The first attempt at order rather than folklore.' },
          { label: 'Renaissance', value: 0.67, caption: 'The telescope arrives; charts are drawn from patient, repeated observation.', detail: 'Tooling improves faster than the theory behind it.' },
          { label: 'Modern', value: 1, caption: 'Digital surveys map billions of stars, each measured and catalogued.', detail: 'Same sky, finally in fine detail.' },
        ],
      },
    },
    {
      name: 'Case walkthrough',
      params: {
        title: 'A sour espresso, from taste to fix',
        xLabel: 'symptom  →  decision',
        stages: [
          { label: 'Symptom', value: 0, caption: 'The shot tastes sharp and sour, and it ran through the basket fast.', detail: 'Taste points before the scales confirm.' },
          { label: 'Check', value: 0.4, caption: 'Weigh the cup: far more liquid out than the recipe asks for.', detail: 'The flow rate drives the next fork.' },
          { label: 'Options', value: 0.7, caption: 'Weigh a finer grind against a bigger dose against living with it.', detail: 'Bean age, grinder, and taste all pull differently.' },
          { label: 'Fix', value: 1, caption: 'Grind finer: slow the flow, pull less liquid, then taste again.', detail: 'Chosen for fresh beans and a shot that simply ran too quickly.' },
        ],
      },
    },
  ],
  build(params, domId) {
    const stages = (params.stages || []).slice(0, 12);
    const title = params.title ? `<div class="pg-st-title">${esc(params.title)}</div>` : '';
    const xLabel = params.xLabel ? `<div class="pg-st-xlabel">${esc(params.xLabel)}</div>` : '';
    const n = stages.length;
    const maxIdx = Math.max(0, n - 1);
    const track =
      `<svg viewBox="0 0 360 90" role="img" aria-label="Timeline track with a marker showing the current stage" class="pg-st-track">` +
      `<line x1="30" y1="58" x2="330" y2="58" stroke="#3a4866" stroke-width="2"/>` +
      `<g data-role="ticks"></g>` +
      `<line data-role="cursor" x1="30" y1="40" x2="30" y2="76" stroke="#22d3ee" stroke-width="2.5"/>` +
      `<circle data-role="marker" cx="30" cy="58" r="7" fill="#2dd4bf" stroke="#04060c" stroke-width="2"/>` +
      `<text data-role="markerlabel" x="30" y="30" fill="#fff" font-size="12" text-anchor="middle"></text>` +
      `</svg>`;
    const html =
      `<div class="pg-stage">${title}` +
      `<div class="pg-readout">stage <b data-role="idx">1</b> of <b data-role="count">${n}</b></div>` +
      track + xLabel +
      `<div class="pg-st-caption" data-role="caption" aria-live="polite"></div>` +
      `<div class="pg-st-detail" data-role="detail"></div>` +
      `<div class="pg-controls pg-st-controls">` +
      `<div class="pg-st-buttons" role="group" aria-label="Step through stages">` +
      `<button type="button" data-role="prev" class="pg-st-btn">‹ Prev</button>` +
      `<button type="button" data-role="next" class="pg-st-btn">Next ›</button>` +
      `</div>` +
      `<div class="pg-field"><label for="${domId}-scrub">Scrub stages</label>` +
      `<input id="${domId}-scrub" data-role="scrub" type="range" min="0" max="${maxIdx}" step="1" value="0"></div>` +
      `</div></div>`;
    const css = [
      `#${domId} .pg-st-title{font-size:.9rem;color:var(--ink-dim,#9fb3c8);margin:0 0 .7rem}`,
      `#${domId} .pg-st-track{width:100%;height:auto;display:block;margin:.4rem 0 .2rem}`,
      `#${domId} .pg-st-xlabel{font-size:.78rem;color:var(--ink-faint,#717d99);text-align:center;margin:.1rem 0 .6rem}`,
      `#${domId} .pg-st-caption{color:#fff;font-weight:600;margin:.4rem 0 .3rem;min-height:1.3em}`,
      `#${domId} .pg-st-detail{color:var(--ink-dim,#9fb3c8);font-size:.9rem;min-height:1.2em}`,
      `#${domId} .pg-st-controls{display:grid;grid-template-columns:auto 1fr;gap:1rem;align-items:end}`,
      `#${domId} .pg-st-buttons{display:inline-flex;gap:.4rem}`,
      `#${domId} .pg-st-btn{appearance:none;background:transparent;border:1px solid var(--line,#23304a);border-radius:8px;padding:.45rem .9rem;color:var(--ink-dim,#9fb3c8);font:inherit;cursor:pointer;transition:.2s}`,
      `#${domId} .pg-st-btn:hover{border-color:#22d3ee;color:#22d3ee}`,
      `#${domId} .pg-st-btn:disabled{opacity:.4;cursor:default}`,
      `#${domId} label b{color:#fff}`,
      `@media(max-width:620px){#${domId} .pg-st-controls{grid-template-columns:1fr}}`,
    ].join('\n');
    const jsBody = `
var E=function(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');};
var stages=(CONFIG.stages||[]).slice(0,12);
var n=stages.length;
if(!n)return;
var maxIdx=n-1;
var scrub=$('[data-role=scrub]'),prev=$('[data-role=prev]'),next=$('[data-role=next]');
var idxOut=$('[data-role=idx]'),cap=$('[data-role=caption]'),detail=$('[data-role=detail]');
var marker=$('[data-role=marker]'),cursor=$('[data-role=cursor]'),mlabel=$('[data-role=markerlabel]'),ticks=$('[data-role=ticks]');
function cl(x){return x<0?0:x>1?1:x;}
function posOf(i){var st=stages[i]||{};var v=(typeof st.value==='number')?st.value:(maxIdx?i/maxIdx:0);return cl(v);}
function px(t){return 30+cl(t)*300;}
if(ticks){var tk='';for(var j=0;j<n;j++){var x=px(posOf(j));tk+='<circle cx="'+x.toFixed(1)+'" cy="58" r="3" fill="#3a4866"/>';}ticks.innerHTML=tk;}
var cur=0;
function render(){
  cur=Math.max(0,Math.min(maxIdx,cur|0));
  var st=stages[cur]||{};
  var x=px(posOf(cur));
  if(marker)marker.setAttribute('cx',x.toFixed(1));
  if(cursor){cursor.setAttribute('x1',x.toFixed(1));cursor.setAttribute('x2',x.toFixed(1));}
  if(mlabel){mlabel.setAttribute('x',x.toFixed(1));mlabel.textContent=st.label||'';}
  if(idxOut)idxOut.textContent=String(cur+1);
  if(cap)cap.textContent=st.caption||'';
  if(detail)detail.textContent=st.detail||'';
  if(scrub&&parseInt(scrub.value,10)!==cur)scrub.value=String(cur);
  if(prev)prev.disabled=(cur<=0);
  if(next)next.disabled=(cur>=maxIdx);
}
function go(i){cur=i;render();}
if(scrub)scrub.addEventListener('input',function(){go(parseInt(scrub.value,10)||0);});
if(prev)prev.addEventListener('click',function(){go(cur-1);});
if(next)next.addEventListener('click',function(){go(cur+1);});
go(0);
`;
    return { html, css, jsBody };
  },
};
