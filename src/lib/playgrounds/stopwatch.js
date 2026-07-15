/* Family: stopwatch — a button runs an SVG stopwatch (sweeping hand + progress ring
   + numeric readout) that animates to a target time, emitting staged commentary as
   the modelled clock passes each milestone. A second button runs a contrasting
   target; reset clears. Models a "dinner, two ways" timer: the clock is animated
   over a short real interval (mapped from the target) but DISPLAYS the modelled
   time, so a 3-hour slow-cook run takes a few real seconds to play while reading
   out as 3:00:00. Honours reduced-motion (jumps to the final state and reveals all
   stages at once). */
import { esc } from './index.js';

const stageSchema = {
  type: 'object', additionalProperties: false,
  required: ['at', 'text'],
  properties: {
    at: { type: 'number', title: 'Modelled time (seconds) at which this line appears' },
    text: { type: 'string', title: 'Commentary revealed as the clock passes this mark' },
  },
};

const runSchema = {
  type: 'object', additionalProperties: false,
  required: ['label', 'seconds'],
  properties: {
    label: { type: 'string', title: 'Button label' },
    seconds: { type: 'number', title: 'Target modelled time (seconds)' },
    accent: { type: 'string', title: 'Accent colour (hex)', default: '#22d3ee' },
    stages: {
      type: 'array', title: 'Staged commentary', maxItems: 8, items: stageSchema,
    },
  },
};

export default {
  id: 'stopwatch',
  name: 'Stopwatch',
  category: 'narrative',
  description: 'A timed SVG stopwatch that animates to a target, emitting staged commentary at milestones. For "feel how fast/slow" pieces.',
  paramsSchema: {
    type: 'object', additionalProperties: false,
    required: ['runs'],
    properties: {
      title: { type: 'string', title: 'Optional label above the stopwatch' },
      runs: { type: 'array', minItems: 1, maxItems: 4, items: runSchema },
      resetLabel: { type: 'string', title: 'Reset button label', default: 'Reset' },
      compareLine: { type: 'string', title: 'Optional standing caption under the clock' },
    },
  },
  presets: [
    {
      name: 'Dinner, two ways',
      params: {
        title: 'How long does dinner take?',
        compareLine: 'Same craving; the clock tells two completely different stories.',
        runs: [
          {
            label: 'Instant noodles', seconds: 120, accent: '#f472b6',
            stages: [
              { at: 0, text: 'Kettle on, pot ready, packet torn open.' },
              { at: 30, text: 'Water boiling; the noodle block goes in.' },
              { at: 60, text: 'Stirring the block loose as it softens.' },
              { at: 90, text: 'Seasoning stirred through; a quick taste.' },
              { at: 120, text: 'Done. Two minutes, and dinner is served.' },
            ],
          },
          {
            label: 'A proper ragù', seconds: 5400, accent: '#2dd4bf',
            stages: [
              { at: 0, text: 'Soffritto down low; onion, carrot and celery softening.' },
              { at: 600, text: 'Mince browned in batches, not crowded, for colour.' },
              { at: 2400, text: 'Wine in, reduced right down before the tomatoes.' },
              { at: 4200, text: 'Barely a simmer now — a bubble every few seconds.' },
              { at: 5400, text: 'Ninety minutes in, and it finally tastes like Sunday.' },
            ],
          },
        ],
      },
    },
    {
      name: 'Sprint vs marathon pace',
      params: {
        title: 'A kilometre, two ways',
        compareLine: 'Same distance; the clock tells two completely different stories.',
        runs: [
          {
            label: 'Sprint pace', seconds: 150, accent: '#22d3ee',
            stages: [
              { at: 0, text: 'Off the line at near-maximal effort.' },
              { at: 60, text: 'Lactate climbing; this cannot last.' },
              { at: 150, text: 'A kilometre in 2:30. Unsustainable, and that is the point.' },
            ],
          },
          {
            label: 'Marathon pace', seconds: 270, accent: '#818cf8',
            stages: [
              { at: 0, text: 'Settle into a rhythm that could run for hours.' },
              { at: 135, text: 'Breathing easy, well inside the aerobic ceiling.' },
              { at: 270, text: 'A kilometre in 4:30 — repeatable forty-two times over.' },
            ],
          },
        ],
      },
    },
  ],
  build(params, domId) {
    const runs = (params.runs || []).slice(0, 4);
    const title = params.title ? `<div class="pg-sw-title">${esc(params.title)}</div>` : '';
    const compare = params.compareLine ? `<div class="pg-sw-compare">${esc(params.compareLine)}</div>` : '';
    const resetLabel = params.resetLabel || 'Reset';
    const buttons = runs.map((r, i) =>
      `<button type="button" data-role="run" data-idx="${i}" class="pg-sw-btn">${esc(r.label)}</button>`
    ).join('');
    // Ring circumference for r=70 ≈ 439.82; used for stroke-dasharray progress.
    const dial =
      `<svg viewBox="0 0 200 200" role="img" aria-label="Stopwatch dial with a sweeping hand and progress ring" class="pg-sw-dial">` +
      `<circle cx="100" cy="100" r="84" fill="none" stroke="#23304a" stroke-width="3"/>` +
      `<circle data-role="ring" cx="100" cy="100" r="70" fill="none" stroke="#22d3ee" stroke-width="6" stroke-linecap="round" ` +
      `transform="rotate(-90 100 100)" stroke-dasharray="439.82" stroke-dashoffset="439.82"/>` +
      `<g data-role="marks"></g>` +
      `<line data-role="hand" x1="100" y1="100" x2="100" y2="30" stroke="#fff" stroke-width="3" stroke-linecap="round"/>` +
      `<circle cx="100" cy="100" r="6" fill="#fff"/>` +
      `<text data-role="time" x="100" y="150" fill="#fff" font-size="22" font-family="monospace" text-anchor="middle">0:00</text>` +
      `</svg>`;
    const html =
      `<div class="pg-stage">${title}` +
      `<div class="pg-sw-grid">${dial}` +
      `<div class="pg-sw-side">` +
      `<div class="pg-readout"><b data-role="status">Ready</b></div>` +
      `<div class="pg-sw-log" data-role="log" aria-live="polite"></div>` +
      `</div></div>${compare}` +
      `<div class="pg-controls pg-sw-controls" role="group" aria-label="Run the stopwatch">` +
      buttons +
      `<button type="button" data-role="reset" class="pg-sw-btn pg-sw-reset">${esc(resetLabel)}</button>` +
      `</div></div>`;
    const css = [
      `#${domId} .pg-sw-title{font-size:.9rem;color:var(--ink-dim,#9fb3c8);margin:0 0 .7rem}`,
      `#${domId} .pg-sw-grid{display:grid;grid-template-columns:auto 1fr;gap:1.2rem;align-items:center}`,
      `#${domId} .pg-sw-dial{width:180px;max-width:40vw;height:auto;display:block}`,
      `#${domId} .pg-sw-ring,#${domId} [data-role=ring]{transition:stroke .2s}`,
      `#${domId} .pg-sw-side{min-width:0}`,
      `#${domId} [data-role=status]{color:#fff}`,
      `#${domId} .pg-sw-log{margin-top:.7rem;display:grid;gap:.45rem}`,
      `#${domId} .pg-sw-stage{color:var(--ink-dim,#9fb3c8);font-size:.92rem;border-left:2px solid var(--line,#23304a);padding-left:.7rem;opacity:0;transform:translateY(4px);transition:opacity .3s,transform .3s}`,
      `#${domId} .pg-sw-stage.is-shown{opacity:1;transform:none;border-left-color:var(--pg-sw-accent,#22d3ee)}`,
      `#${domId} .pg-sw-compare{color:var(--ink-faint,#717d99);font-size:.85rem;margin:.9rem 0 0;text-align:center}`,
      `#${domId} .pg-sw-controls{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:1.1rem}`,
      `#${domId} .pg-sw-btn{appearance:none;background:transparent;border:1px solid var(--line,#23304a);border-radius:8px;padding:.5rem 1rem;color:var(--ink-dim,#9fb3c8);font:inherit;cursor:pointer;transition:.2s}`,
      `#${domId} .pg-sw-btn:hover{border-color:#22d3ee;color:#22d3ee}`,
      `#${domId} .pg-sw-btn.is-active{border-color:var(--pg-sw-accent,#22d3ee);color:var(--pg-sw-accent,#22d3ee);background:rgba(140,160,200,.08)}`,
      `#${domId} .pg-sw-btn:disabled{opacity:.45;cursor:default}`,
      `#${domId} .pg-sw-reset{margin-left:auto}`,
      `@media(max-width:620px){#${domId} .pg-sw-grid{grid-template-columns:1fr;justify-items:center}#${domId} .pg-sw-side{width:100%}#${domId} .pg-sw-reset{margin-left:0}}`,
    ].join('\n');
    const jsBody = `
var E=function(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');};
var runs=(CONFIG.runs||[]).slice(0,4);
if(!runs.length)return;
var dial=$('[data-role=time]'),hand=$('[data-role=hand]'),ring=$('[data-role=ring]'),marks=$('[data-role=marks]');
var status=$('[data-role=status]'),log=$('[data-role=log]'),resetBtn=$('[data-role=reset]');
var runBtns=$$('[data-role=run]');
var CIRC=439.82;
function fmt(s){s=Math.max(0,Math.round(s));var h=Math.floor(s/3600),m=Math.floor((s%3600)/60),x=s%60;function p(n){return(n<10?'0':'')+n;}return h?(h+':'+p(m)+':'+p(x)):(m+':'+p(x));}
if(marks){var tk='';for(var k=0;k<12;k++){var a=k/12*Math.PI*2,c=Math.cos(a),sn=Math.sin(a);tk+='<line x1="'+(100+84*c).toFixed(1)+'" y1="'+(100+84*sn).toFixed(1)+'" x2="'+(100+76*c).toFixed(1)+'" y2="'+(100+76*sn).toFixed(1)+'" stroke="#3a4866" stroke-width="2"/>';}marks.innerHTML=tk;}
var raf=0,activeIdx=-1;
function cancel(){if(raf){(window.cancelAnimationFrame||function(){})(raf);raf=0;}}
function setAccent(c){root.style.setProperty('--pg-sw-accent',c||'#22d3ee');if(ring)ring.setAttribute('stroke',c||'#22d3ee');if(hand)hand.setAttribute('stroke',c||'#fff');}
function draw(frac,modelled){
  frac=frac<0?0:frac>1?1:frac;
  if(ring)ring.setAttribute('stroke-dashoffset',(CIRC*(1-frac)).toFixed(2));
  if(hand){var ang=frac*Math.PI*2,len=70,cx=100,cy=100;var ex=cx+len*Math.sin(ang),ey=cy-len*Math.cos(ang);hand.setAttribute('x2',ex.toFixed(1));hand.setAttribute('y2',ey.toFixed(1));}
  if(dial)dial.textContent=fmt(modelled);
}
function renderLog(run,shownTo){
  if(!log)return;
  var sts=(run.stages||[]);
  log.innerHTML=sts.map(function(s,i){return '<div class="pg-sw-stage'+(s.at<=shownTo?' is-shown':'')+'">'+E(s.text)+'</div>';}).join('');
}
function clearActive(){runBtns.forEach(function(b){b.classList.remove('is-active');b.disabled=false;});}
function reset(){
  cancel();activeIdx=-1;clearActive();
  setAccent('#22d3ee');draw(0,0);
  if(status)status.textContent='Ready';
  if(log)log.innerHTML='';
}
function start(idx){
  var run=runs[idx];if(!run)return;
  cancel();activeIdx=idx;
  clearActive();var btn=runBtns[idx];if(btn)btn.classList.add('is-active');
  setAccent(run.accent);
  var target=Math.max(0,Number(run.seconds)||0);
  // Map the modelled target to a short real animation: ~2s for tiny, ~5s for long.
  var realMs=Math.min(5000,Math.max(2000,Math.sqrt(target)*120));
  if(status)status.textContent='Running — '+(run.label||'');
  if(reduced){
    draw(1,target);renderLog(run,target);
    if(status)status.textContent='Done — '+fmt(target);
    return;
  }
  renderLog(run,-1);
  var t0=(window.performance&&performance.now)?performance.now():Date.now();
  function tick(now){
    var el=((window.performance&&performance.now)?now:Date.now())-t0;
    var frac=realMs?el/realMs:1;if(frac>1)frac=1;
    var modelled=frac*target;
    draw(frac,modelled);renderLog(run,modelled);
    if(frac<1){raf=(window.requestAnimationFrame||function(f){return setTimeout(function(){f(Date.now());},16);})(tick);}
    else{raf=0;if(status)status.textContent='Done — '+fmt(target);}
  }
  raf=(window.requestAnimationFrame||function(f){return setTimeout(function(){f(Date.now());},16);})(tick);
}
runBtns.forEach(function(b){b.addEventListener('click',function(){start(parseInt(b.getAttribute('data-idx'),10)||0);});});
if(resetBtn)resetBtn.addEventListener('click',reset);
reset();
`;
    return { html, css, jsBody };
  },
};
