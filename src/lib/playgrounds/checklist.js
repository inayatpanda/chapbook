import { esc } from './index.js';

export default {
  id: 'checklist',
  name: 'Checklist',
  category: 'tool',
  description: 'A tappable checklist that tracks your progress as you tick things off.',
  paramsSchema: {
    type: 'object', additionalProperties: false, required: ['items'],
    properties: {
      title: { type: 'string' },
      items: { type: 'array', minItems: 2, maxItems: 16, items: { type: 'string' } },
      doneText: { type: 'string', default: 'All done. 🎉' },
      caption: { type: 'string' },
    },
  },
  presets: [
    { name: 'Morning routine', params: {
      title: 'Morning routine',
      items: ['Make the bed', 'Glass of water', '10 min stretch', 'No phone for the first hour', 'Plan the top 3 tasks'],
    } },
    { name: 'Weekend trip packing', params: {
      title: 'Weekend trip packing',
      items: ['Passport / ID', 'Charger', 'Toothbrush', 'Something warm', 'Book for the train', 'Snacks'],
      caption: 'Tick as you pack — nothing left behind.',
    } },
  ],
  build(params, domId) {
    const items = (Array.isArray(params.items) ? params.items : [])
      .filter((s) => typeof s === 'string')
      .slice(0, 16);
    const doneText = typeof params.doneText === 'string' && params.doneText.trim()
      ? params.doneText : 'All done. 🎉';
    const total = items.length;

    const title = params.title ? `<div class="pg-ck-title">${esc(params.title)}</div>` : '';
    const caption = params.caption ? `<div class="pg-ck-caption">${esc(params.caption)}</div>` : '';

    const rows = items.map((label, i) =>
      `<button type="button" class="pg-ck-row" data-role="row" role="checkbox" aria-checked="false" data-i="${i}">` +
        `<span class="pg-ck-box" aria-hidden="true"><svg viewBox="0 0 16 16" class="pg-ck-tick"><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>` +
        `<span class="pg-ck-label">${esc(label)}</span>` +
      `</button>`).join('');

    const html =
      `<div class="pg-stage">` +
        title +
        `<div class="pg-ck-list" data-role="list">${rows}</div>` +
        `<div class="pg-ck-bar"><span class="pg-ck-fill" data-role="fill"></span></div>` +
        `<div class="pg-ck-foot">` +
          `<span class="pg-readout" data-role="count">0 of ${total} done</span>` +
          `<button type="button" class="pg-ck-reset" data-role="reset">Reset</button>` +
        `</div>` +
        `<div class="pg-ck-done" data-role="done" hidden></div>` +
        caption +
      `</div>`;

    const css = [
      `#${domId} .pg-ck-title{font-weight:700;font-size:1.05rem;color:var(--ink,#e9eef8);margin-bottom:.7rem}`,
      `#${domId} .pg-ck-list{display:flex;flex-direction:column;gap:.45rem}`,
      `#${domId} .pg-ck-row{display:flex;align-items:center;gap:.7rem;width:100%;text-align:left;font:inherit;cursor:pointer;padding:.6rem .7rem;border-radius:10px;border:1px solid var(--line,#23304a);background:rgba(140,160,200,.05);color:var(--ink,#e9eef8)}`,
      `#${domId} .pg-ck-row:hover{border-color:#2dd4bf66}`,
      `#${domId} .pg-ck-row:focus-visible{outline:2px solid #22d3ee;outline-offset:2px}`,
      `#${domId} .pg-ck-box{flex:0 0 auto;display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:6px;border:1.5px solid #4a5a78;color:#04060c;background:transparent}`,
      `#${domId} .pg-ck-tick{width:15px;height:15px;opacity:0;transform:scale(.6);transition:opacity .15s,transform .15s}`,
      `#${domId} .pg-ck-label{transition:color .15s}`,
      `#${domId} .pg-ck-row.done .pg-ck-box{background:#2dd4bf;border-color:#2dd4bf}`,
      `#${domId} .pg-ck-row.done .pg-ck-tick{opacity:1;transform:scale(1)}`,
      `#${domId} .pg-ck-row.done .pg-ck-label{color:var(--ink-dim,#8b97ac);text-decoration:line-through}`,
      `#${domId} .pg-ck-bar{height:8px;border-radius:99px;background:rgba(140,160,200,.12);overflow:hidden;margin:.9rem 0 .6rem}`,
      `#${domId} .pg-ck-fill{display:block;height:100%;width:0%;border-radius:99px;background:linear-gradient(90deg,#2dd4bf,#22d3ee,#818cf8);transition:width .35s ease}`,
      `#${domId} .pg-ck-foot{display:flex;align-items:center;justify-content:space-between;gap:.7rem}`,
      `#${domId} .pg-ck-reset{font:inherit;font-size:.85rem;cursor:pointer;padding:.35rem .7rem;border-radius:8px;border:1px solid var(--line,#23304a);background:transparent;color:var(--ink-dim,#cdd6e6)}`,
      `#${domId} .pg-ck-reset:hover{border-color:#f472b666;color:var(--ink,#e9eef8)}`,
      `#${domId} .pg-ck-done{margin-top:.8rem;padding:.6rem .8rem;border-radius:10px;border:1px solid #2dd4bf55;background:rgba(45,212,191,.08);color:#2dd4bf;font-weight:600}`,
      `#${domId} .pg-ck-caption{margin-top:.7rem;font-size:.85rem;color:var(--ink-dim,#8b97ac)}`,
      `#${domId}.pg-ck-reduce .pg-ck-fill,#${domId}.pg-ck-reduce .pg-ck-tick{transition:none}`,
    ].join('\n');

    const jsBody = `
if(reduced)root.classList.add('pg-ck-reduce');
var rows=$$('[data-role=row]');
var total=rows.length;
if(!total)return;
var fill=$('[data-role=fill]');
var count=$('[data-role=count]');
var done=$('[data-role=done]');
var resetBtn=$('[data-role=reset]');
var doneText=${JSON.stringify(doneText)};
function refresh(){
  var n=0;
  rows.forEach(function(r){ if(r.classList.contains('done'))n++; });
  if(fill)fill.style.width=(total?Math.round(n/total*100):0)+'%';
  if(count)count.textContent=n+' of '+total+' done';
  if(done){
    if(n===total){ done.textContent=doneText; done.hidden=false; }
    else { done.hidden=true; }
  }
}
rows.forEach(function(r){
  r.addEventListener('click',function(){
    var on=r.classList.toggle('done');
    r.setAttribute('aria-checked',on?'true':'false');
    refresh();
  });
});
if(resetBtn)resetBtn.addEventListener('click',function(){
  rows.forEach(function(r){ r.classList.remove('done'); r.setAttribute('aria-checked','false'); });
  refresh();
});
refresh();
`;

    return { html, css, jsBody };
  },
};
