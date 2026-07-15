/* Family: sortable-priority — the reader ranks a small set of items into an order
   that matters to them. Drag-and-drop is primary; up/down buttons and keyboard
   (arrow keys on a focused row) are full fallbacks for touch/AT/no-pointer. A
   reflective readout names the current #1 pick (and lists the full order). Models
   the shipped "Being Mortal — what matters on a hard day" prioritiser: there is no
   "right" answer; the act of ordering is the point. No animation needed; reordering
   is instantaneous and honours reduced-motion by not transitioning. */
import { esc } from './index.js';

const itemSchema = {
  type: 'object', additionalProperties: false,
  required: ['label'],
  properties: {
    label: { type: 'string', title: 'Item label' },
    note: { type: 'string', title: 'Optional one-line note' },
  },
};

export default {
  id: 'sortable-priority',
  name: 'Sortable priority',
  category: 'interactive',
  description: 'A reorderable list — the reader ranks a few items (drag, buttons, or keyboard) and a readout names their top pick. For reflective "what matters most" exercises.',
  paramsSchema: {
    type: 'object', additionalProperties: false,
    required: ['items'],
    properties: {
      title: { type: 'string', title: 'Optional label above the list' },
      prompt: { type: 'string', title: 'Optional instruction line' },
      items: { type: 'array', minItems: 2, maxItems: 8, items: itemSchema },
      readoutTemplate: { type: 'string', title: 'Readout text; {top} is replaced by the #1 item label' },
    },
  },
  presets: [
    {
      name: 'What matters on a hard day',
      params: {
        title: 'On a hard day, what matters most?',
        prompt: 'Drag, or use the arrows, to put these in your order. There is no right answer.',
        readoutTemplate: 'When it comes down to it, you put “{top}” first.',
        items: [
          { label: 'Staying independent', note: 'Doing things for yourself, in your own home.' },
          { label: 'Time with family', note: 'The people who turn up, not the procedures.' },
          { label: 'Freedom from pain', note: 'Comfort weighed against alertness.' },
          { label: 'Staying lucid', note: 'Knowing where you are and who you are with.' },
        ],
      },
    },
    {
      name: 'Rank the priorities',
      params: {
        title: 'Rank these priorities',
        prompt: 'Reorder the list — top is most important.',
        readoutTemplate: 'Your top priority right now: {top}.',
        items: [
          { label: 'Speed' },
          { label: 'Cost' },
          { label: 'Quality' },
          { label: 'Safety' },
        ],
      },
    },
  ],
  build(params, domId) {
    const items = (params.items || []).slice(0, 8);
    const title = params.title ? `<div class="pg-sp-title">${esc(params.title)}</div>` : '';
    const prompt = params.prompt ? `<div class="pg-sp-prompt">${esc(params.prompt)}</div>` : '';
    const rows = items.map((it, i) =>
      `<li class="pg-sp-row" draggable="true" tabindex="0" data-role="row" data-idx="${i}" aria-label="${esc(it.label)}, position ${i + 1} of ${items.length}. Use arrow keys to move.">` +
      `<span class="pg-sp-rank" data-role="rank">${i + 1}</span>` +
      `<span class="pg-sp-body"><span class="pg-sp-label">${esc(it.label)}</span>` +
      (it.note ? `<span class="pg-sp-note">${esc(it.note)}</span>` : '') +
      `</span>` +
      `<span class="pg-sp-moves">` +
      `<button type="button" class="pg-sp-mv" data-role="up" aria-label="Move ${esc(it.label)} up">▲</button>` +
      `<button type="button" class="pg-sp-mv" data-role="down" aria-label="Move ${esc(it.label)} down">▼</button>` +
      `</span></li>`
    ).join('');
    const html =
      `<div class="pg-stage">${title}${prompt}` +
      `<ol class="pg-sp-list" data-role="list" aria-label="Reorderable priority list">${rows}</ol>` +
      `<div class="pg-readout pg-sp-readout" data-role="readout" aria-live="polite"></div>` +
      `</div>`;
    const css = [
      `#${domId} .pg-sp-title{font-size:.9rem;color:var(--ink-dim,#9fb3c8);margin:0 0 .5rem}`,
      `#${domId} .pg-sp-prompt{color:var(--ink-faint,#717d99);font-size:.85rem;margin:0 0 .9rem}`,
      `#${domId} .pg-sp-list{list-style:none;margin:0;padding:0;display:grid;gap:.5rem}`,
      `#${domId} .pg-sp-row{display:flex;align-items:center;gap:.7rem;border:1px solid var(--line,#23304a);border-radius:10px;padding:.6rem .7rem;background:rgba(140,160,200,.05);cursor:grab}`,
      `#${domId} .pg-sp-row:focus{outline:2px solid var(--cyan,#22d3ee);outline-offset:2px}`,
      `#${domId} .pg-sp-row.is-drag{opacity:.45;cursor:grabbing}`,
      `#${domId} .pg-sp-row.is-over{border-color:var(--cyan,#22d3ee)}`,
      `#${domId} .pg-sp-rank{flex:0 0 auto;width:1.7rem;height:1.7rem;border-radius:99px;display:inline-flex;align-items:center;justify-content:center;font-weight:700;color:#04060c;background:var(--cyan,#22d3ee)}`,
      `#${domId} .pg-sp-body{flex:1 1 auto;display:flex;flex-direction:column;gap:.1rem;min-width:0}`,
      `#${domId} .pg-sp-label{color:#fff;font-weight:600}`,
      `#${domId} .pg-sp-note{color:var(--ink-faint,#717d99);font-size:.8rem}`,
      `#${domId} .pg-sp-moves{flex:0 0 auto;display:inline-flex;flex-direction:column;gap:.2rem}`,
      `#${domId} .pg-sp-mv{appearance:none;background:transparent;border:1px solid var(--line,#23304a);border-radius:6px;width:1.8rem;height:1.2rem;color:var(--ink-dim,#9fb3c8);font-size:.7rem;line-height:1;cursor:pointer;transition:.15s}`,
      `#${domId} .pg-sp-mv:hover{border-color:var(--cyan,#22d3ee);color:var(--cyan,#22d3ee)}`,
      `#${domId} .pg-sp-mv:disabled{opacity:.3;cursor:default}`,
      `#${domId} .pg-sp-readout{margin-top:1rem;color:var(--ink-dim,#9fb3c8)}`,
      `@media(max-width:620px){#${domId} .pg-sp-row{flex-wrap:wrap}#${domId} .pg-sp-moves{flex-direction:row}}`,
    ].join('\n');
    const jsBody = `
var E=function(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');};
var list=$('[data-role=list]'),readout=$('[data-role=readout]');
if(!list)return;
var tpl=CONFIG.readoutTemplate||'Your top pick: {top}.';
function rows(){return $$('[data-role=row]');}
function renumber(){
  var rs=rows();
  rs.forEach(function(r,i){
    var rk=r.querySelector('[data-role=rank]');if(rk)rk.textContent=String(i+1);
    var up=r.querySelector('[data-role=up]'),dn=r.querySelector('[data-role=down]');
    if(up)up.disabled=(i===0);
    if(dn)dn.disabled=(i===rs.length-1);
    var lbl=r.querySelector('.pg-sp-label');var name=lbl?lbl.textContent:'';
    r.setAttribute('aria-label',name+', position '+(i+1)+' of '+rs.length+'. Use arrow keys to move.');
  });
  if(readout){
    var first=rs[0],lbl=first&&first.querySelector('.pg-sp-label');
    var top=lbl?lbl.textContent:'';
    readout.textContent=tpl.replace('{top}',top);
  }
}
function moveUp(r){var p=r.previousElementSibling;if(p)list.insertBefore(r,p);renumber();}
function moveDown(r){var nx=r.nextElementSibling;if(nx)list.insertBefore(nx,r);renumber();}
list.addEventListener('click',function(e){
  var btn=e.target.closest&&e.target.closest('[data-role=up],[data-role=down]');
  if(!btn)return;
  var r=btn.closest('[data-role=row]');if(!r)return;
  if(btn.getAttribute('data-role')==='up')moveUp(r);else moveDown(r);
  r.focus();
});
list.addEventListener('keydown',function(e){
  var r=e.target&&e.target.closest&&e.target.closest('[data-role=row]');
  if(!r||e.target!==r)return;
  if(e.key==='ArrowUp'){e.preventDefault();moveUp(r);r.focus();}
  else if(e.key==='ArrowDown'){e.preventDefault();moveDown(r);r.focus();}
});
var dragRow=null;
list.addEventListener('dragstart',function(e){
  var r=e.target&&e.target.closest&&e.target.closest('[data-role=row]');
  if(!r)return;dragRow=r;r.classList.add('is-drag');
  if(e.dataTransfer){e.dataTransfer.effectAllowed='move';try{e.dataTransfer.setData('text/plain','x');}catch(_){}}
});
list.addEventListener('dragend',function(){
  if(dragRow)dragRow.classList.remove('is-drag');
  rows().forEach(function(r){r.classList.remove('is-over');});
  dragRow=null;renumber();
});
list.addEventListener('dragover',function(e){
  if(!dragRow)return;e.preventDefault();
  var over=e.target&&e.target.closest&&e.target.closest('[data-role=row]');
  rows().forEach(function(r){r.classList.toggle('is-over',r===over&&r!==dragRow);});
  if(!over||over===dragRow)return;
  var rs=rows();var di=rs.indexOf(dragRow),oi=rs.indexOf(over);
  if(di<oi)list.insertBefore(dragRow,over.nextElementSibling);else list.insertBefore(dragRow,over);
});
renumber();
`;
    return { html, css, jsBody };
  },
};
