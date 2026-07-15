import { esc } from './index.js';
export default {
  id: 'reaction-timer',
  name: 'Reaction timer',
  category: 'game',
  description: 'Measures your reaction time: wait for green, then tap as fast as you can.',
  paramsSchema: {
    type: 'object', additionalProperties: false, required: [],
    properties: {
      title: { type: 'string' },
    },
  },
  presets: [
    { name: 'Test your reflexes', params: { title: 'Test your reflexes' } },
    { name: 'Faster than average?', params: { title: 'Are you faster than average? (~270 ms)' } },
  ],
  build(params, domId) {
    const title = params.title ? `<div class="pg-rt-title">${esc(params.title)}</div>` : '';
    const html = `<div class="pg-stage">${title}` +
      `<div class="pg-rt-pad" data-role="pad" role="button" tabindex="0" aria-live="polite">Tap to start</div>` +
      `<div class="pg-readout pg-rt-out" data-role="out">Tap the pad and wait for green.</div>` +
      `</div>`;
    const css = [
      `#${domId} .pg-rt-title{font-weight:600;margin-bottom:.6rem;color:var(--ink,#e9eef8)}`,
      `#${domId} .pg-rt-pad{display:flex;align-items:center;justify-content:center;text-align:center;min-height:200px;padding:1.2rem;border-radius:14px;border:1px solid var(--line,#23304a);background:rgba(140,160,200,.08);color:var(--ink,#e9eef8);font-size:1.4rem;font-weight:700;cursor:pointer;user-select:none;transition:background .15s,border-color .15s,color .15s}`,
      `#${domId} .pg-rt-pad:focus-visible{outline:2px solid #22d3ee;outline-offset:2px}`,
      `#${domId} .pg-rt-pad.is-wait{background:rgba(251,191,36,.16);border-color:#fbbf2488;color:#fbbf24}`,
      `#${domId} .pg-rt-pad.is-go{background:rgba(45,212,191,.22);border-color:#2dd4bf;color:#2dd4bf}`,
      `#${domId} .pg-rt-pad.is-early{background:rgba(244,114,182,.16);border-color:#f472b688;color:#f472b6}`,
      `#${domId} .pg-rt-out{margin-top:.7rem;color:var(--ink-dim,#cdd6e6)}`,
      `#${domId} .pg-rt-out b{color:#22d3ee}`,
      `#${domId}.pg-rt-reduce .pg-rt-pad{transition:none}`,
    ].join('\n');
    const jsBody = `
var pad=$('[data-role=pad]'); if(!pad)return;
var out=$('[data-role=out]'); if(!out)return;
if(reduced)root.classList.add('pg-rt-reduce');
var state='idle';      // 'idle' | 'waiting' | 'go'
var timer=null;        // pending green delay
var goAt=0;            // Date.now() when it turned green
var best=null;         // lowest time so far (closure var)
function clearTimer(){ if(timer){clearTimeout(timer);timer=null;} }
function setPad(cls,txt){
  pad.classList.remove('is-wait','is-go','is-early');
  if(cls)pad.classList.add(cls);
  pad.textContent=txt;
}
function bestLine(){ return best==null?'':' Best: <b>'+best+' ms</b>.'; }
function startRound(){
  clearTimer();
  state='waiting';
  setPad('is-wait','Wait for green\\u2026');
  out.innerHTML='Hold on\\u2026 don\\u2019t jump the gun.'+bestLine();
  var delay=1000+Math.floor(Math.random()*2000); // 1000\\u20133000ms
  timer=setTimeout(function(){
    timer=null;
    state='go';
    goAt=Date.now();
    setPad('is-go','TAP!');
  },delay);
}
function handle(){
  if(state==='idle'){
    startRound();
  } else if(state==='waiting'){
    // tapped during amber \\u2014 too early
    clearTimer();
    state='idle';
    setPad('is-early','Too soon \\u2014 tap to retry');
    out.innerHTML='You tapped before green.'+bestLine();
  } else if(state==='go'){
    var ms=Date.now()-goAt;
    state='idle';
    if(best==null||ms<best)best=ms;
    setPad('','Tap to go again');
    out.innerHTML='Reaction: <b>'+ms+' ms</b>.'+bestLine();
  }
}
pad.addEventListener('click',handle);
pad.addEventListener('keydown',function(e){
  if(e.key===' '||e.key==='Enter'){ e.preventDefault(); handle(); }
});
`;
    return { html, css, jsBody };
  },
};
