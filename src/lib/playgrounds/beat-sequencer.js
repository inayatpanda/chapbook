import { esc } from './index.js';

export default {
  id: 'beat-sequencer',
  name: 'Beat sequencer',
  category: 'music',
  description: 'Tap cells to build a rhythm and watch a playhead run it — purely visual, no sound.',
  paramsSchema: {
    type: 'object', additionalProperties: false, required: ['tracks'],
    properties: {
      title: { type: 'string' },
      tracks: { type: 'array', minItems: 2, maxItems: 5, items: { type: 'string' },
        default: ['Kick', 'Snare', 'Hi-hat'] },
      steps: { type: 'number', default: 16, minimum: 8, maximum: 16 },
      bpm: { type: 'number', default: 100, minimum: 30, maximum: 240 },
      caption: { type: 'string' },
    },
  },
  presets: [
    { name: 'Four on the floor', params: { title: 'Four on the floor', tracks: ['Kick', 'Snare', 'Hi-hat'], steps: 16, bpm: 120 } },
    { name: 'Basic backbeat', params: { title: 'Basic backbeat', tracks: ['Kick', 'Snare', 'Hi-hat'], steps: 16, bpm: 100 } },
  ],
  build(params, domId) {
    let tracks = Array.isArray(params.tracks) ? params.tracks.filter((t) => t != null).map((t) => String(t)) : [];
    if (tracks.length < 2) tracks = ['Kick', 'Snare', 'Hi-hat'];
    tracks = tracks.slice(0, 5);
    const steps = Math.max(8, Math.min(16, Math.round(params.steps || 16)));
    const bpm = Math.max(30, Math.min(240, Math.round(params.bpm || 100)));
    const title = params.title ? `<div class="pg-bs-title">${esc(params.title)}</div>` : '';
    const caption = params.caption ? `<div class="pg-bs-caption">${esc(params.caption)}</div>` : '';

    const rows = tracks.map((label) => {
      const cells = [];
      for (let s = 0; s < steps; s++) {
        cells.push(`<button type="button" class="pg-bs-cell" data-role="cell" data-step="${s}" aria-pressed="false"></button>`);
      }
      return `<div class="pg-bs-row"><span class="pg-bs-label">${esc(label)}</span>` +
        `<div class="pg-bs-cells">${cells.join('')}</div></div>`;
    }).join('');

    const html = `<div class="pg-stage">${title}` +
      `<div class="pg-bs-grid" data-role="grid" style="--steps:${steps}">${rows}</div>` +
      `<div class="pg-controls"><div class="pg-row">` +
      `<button type="button" class="pg-bs-btn" data-role="play">Play</button>` +
      `<span class="pg-readout pg-bs-bpm">${bpm} BPM</span>` +
      `</div></div>${caption}</div>`;

    const css = [
      `#${domId} .pg-bs-title{font-weight:700;font-size:1.05rem;margin-bottom:.6rem;color:#e9eef8}`,
      `#${domId} .pg-bs-grid{display:flex;flex-direction:column;gap:.4rem}`,
      `#${domId} .pg-bs-row{display:flex;align-items:center;gap:.6rem}`,
      `#${domId} .pg-bs-label{flex:0 0 4.5rem;font-size:.8rem;color:#cdd6e6;text-align:right;font-weight:600}`,
      `#${domId} .pg-bs-cells{flex:1;display:grid;grid-template-columns:repeat(var(--steps),1fr);gap:3px}`,
      `#${domId} .pg-bs-cell{aspect-ratio:1;min-width:0;border:1px solid #23304a;border-radius:5px;background:rgba(140,160,200,.06);cursor:pointer;padding:0;transition:background .15s,border-color .15s,transform .12s}`,
      `#${domId} .pg-bs-cell:hover{border-color:#2dd4bf66}`,
      `#${domId} .pg-bs-cell.on{background:#22d3ee;border-color:#22d3ee;box-shadow:0 0 8px #22d3ee55}`,
      `#${domId} .pg-bs-cell.cur{border-color:#fbbf24;background:rgba(251,191,36,.18)}`,
      `#${domId} .pg-bs-cell.on.cur{background:#fbbf24;border-color:#fbbf24;box-shadow:0 0 12px #fbbf24aa}`,
      `#${domId} .pg-bs-cell.on.cur{transform:scale(1.18)}`,
      `#${domId}.pg-bs-reduce .pg-bs-cell{transition:none}`,
      `#${domId} .pg-controls{margin-top:.8rem}`,
      `#${domId} .pg-row{display:flex;align-items:center;gap:.8rem}`,
      `#${domId} .pg-bs-btn{border:1px solid #2dd4bf;background:rgba(45,212,191,.12);color:#2dd4bf;font:inherit;font-weight:600;padding:.4rem 1.1rem;border-radius:8px;cursor:pointer}`,
      `#${domId} .pg-bs-btn:hover{background:rgba(45,212,191,.2)}`,
      `#${domId} .pg-bs-btn.playing{border-color:#f472b6;background:rgba(244,114,182,.14);color:#f472b6}`,
      `#${domId} .pg-readout{font-variant-numeric:tabular-nums;color:#94a3b8;font-size:.85rem}`,
      `#${domId} .pg-bs-caption{margin-top:.6rem;font-size:.8rem;color:#94a3b8}`,
    ].join('\n');

    const jsBody = `
var STEPS=${steps}, BPM=${bpm};
if(reduced)root.classList.add('pg-bs-reduce');
var grid=$('[data-role=grid]'), btn=$('[data-role=play]');
if(!grid||!btn)return;
var cells=$$('[data-role=cell]');
cells.forEach(function(c){
  c.addEventListener('click',function(){
    var on=c.classList.toggle('on');
    c.setAttribute('aria-pressed',on?'true':'false');
  });
});
function clearTimer(){ if(root._seqTimer){clearInterval(root._seqTimer);root._seqTimer=null;} }
function clearCur(){ cells.forEach(function(c){c.classList.remove('cur');}); }
function paint(col){
  clearCur();
  cells.forEach(function(c){
    if(parseInt(c.getAttribute('data-step'),10)===col)c.classList.add('cur');
  });
}
clearTimer();
function stop(){
  clearTimer();
  clearCur();
  btn.classList.remove('playing');
  btn.textContent='Play';
}
function start(){
  clearTimer();
  var col=0;
  btn.classList.add('playing');
  btn.textContent='Stop';
  paint(col);
  root._seqTimer=setInterval(function(){
    col=(col+1)%STEPS;
    paint(col);
  }, 60000/BPM/4);
}
btn.addEventListener('click',function(){
  if(root._seqTimer)stop(); else start();
});
`;

    return { html, css, jsBody };
  },
};
