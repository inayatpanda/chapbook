/* Family: algorithm-builder — readers arrange authored flowchart shapes into a
   valid linear algorithm. Connectors are automatic between adjacent nodes, keeping
   the first version robust on phones. Drag is enhanced by full up/down keyboard and
   button controls; Check, Hint and Show solution make it an instructional exercise. */
import { esc } from './index.js';

const SHAPES = ['start', 'process', 'decision', 'input', 'end'];

export default {
  id: 'algorithm-builder',
  name: 'Algorithm builder',
  category: 'diagram',
  description: 'Arrange flowchart shapes into a working algorithm, then check the flow. Drag, buttons and keyboard all work.',
  paramsSchema: {
    type: 'object', additionalProperties: false, required: ['steps', 'solution'],
    properties: {
      prompt: { type: 'string', title: 'Challenge prompt' },
      steps: {
        type: 'array', minItems: 3, maxItems: 12, title: 'Available flowchart nodes',
        items: {
          type: 'object', additionalProperties: false, required: ['id', 'label'],
          properties: {
            id: { type: 'string', title: 'Short unique id' },
            label: { type: 'string' },
            shape: { type: 'string', enum: SHAPES, default: 'process' },
            note: { type: 'string', title: 'Optional explanation revealed in the solution' },
          },
        },
      },
      solution: { type: 'array', minItems: 3, maxItems: 12, title: 'Correct order (node ids)', items: { type: 'string' } },
      hint: { type: 'string', title: 'Hint' },
    },
  },
  presets: [
    {
      name: 'Find the largest number',
      params: {
        prompt: 'Arrange the shapes into an algorithm that finds the largest number in a list.',
        steps: [
          { id: 'start', label: 'Start', shape: 'start' },
          { id: 'read', label: 'Read the list of numbers', shape: 'input' },
          { id: 'first', label: 'Set largest to the first number', shape: 'process' },
          { id: 'more', label: 'Are there more numbers?', shape: 'decision' },
          { id: 'compare', label: 'Compare the next number with largest', shape: 'process' },
          { id: 'update', label: 'Update largest when the new number is greater', shape: 'process' },
          { id: 'show', label: 'Output largest', shape: 'input' },
          { id: 'end', label: 'End', shape: 'end' },
        ],
        solution: ['start', 'read', 'first', 'more', 'compare', 'update', 'show', 'end'],
        hint: 'Initialise the running value before you begin comparing later numbers.',
      },
    },
  ],
  build(params, domId) {
    const steps = (Array.isArray(params.steps) ? params.steps : []).slice(0, 12)
      .map((s, i) => ({
        id: String((s && s.id) || `step-${i}`),
        label: String((s && s.label) || ''),
        shape: SHAPES.includes(String(s && s.shape)) ? String(s.shape) : 'process',
        note: String((s && s.note) || ''),
      })).filter((s) => s.label);
    // Rotate the authored order for a deterministic scrambled starting point.
    const shifted = steps.length > 2 ? steps.slice(2).concat(steps.slice(0, 2)) : steps;
    const rows = shifted.map((s, i) =>
      `<li class="pg-ab-node" data-role="node" data-id="${esc(s.id)}" draggable="true" tabindex="0" aria-label="${esc(s.label)}, position ${i + 1} of ${steps.length}. Use arrow keys to move.">` +
      `<span class="pg-ab-shape is-${s.shape}" aria-hidden="true"></span><span class="pg-ab-label">${esc(s.label)}</span>` +
      `<span class="pg-ab-moves"><button type="button" data-role="up" aria-label="Move ${esc(s.label)} up">▲</button><button type="button" data-role="down" aria-label="Move ${esc(s.label)} down">▼</button></span></li>`
    ).join('');
    const html =
      `<div class="pg-stage"><div class="pg-ab-prompt">${esc(params.prompt || 'Arrange the flowchart into the correct order.')}</div>` +
      `<ol class="pg-ab-flow" data-role="flow" aria-label="Flowchart workspace">${rows}</ol>` +
      `<div class="pg-ab-actions"><button type="button" data-role="check">Check flow</button><button type="button" data-role="hint">Hint</button><button type="button" data-role="solution">Show solution</button><button type="button" data-role="reset">Reset</button></div>` +
      `<div class="pg-readout pg-ab-status" data-role="status" aria-live="polite"></div></div>`;
    const css = [
      `#${domId} .pg-ab-prompt{color:var(--ink-dim,#9fb3c8);line-height:1.5;margin-bottom:.8rem}`,
      `#${domId} .pg-ab-flow{list-style:none;margin:0;padding:0;display:grid;gap:1rem;max-width:38rem}`,
      `#${domId} .pg-ab-node{position:relative;display:flex;align-items:center;gap:.75rem;min-height:58px;border:1px solid var(--line,#23304a);border-radius:12px;background:rgba(140,160,200,.05);padding:.55rem .65rem;cursor:grab}`,
      `#${domId} .pg-ab-node:not(:last-child)::after{content:"↓";position:absolute;left:1.18rem;bottom:-1.05rem;color:#22d3ee;font-weight:800}`,
      `#${domId} .pg-ab-node:focus{outline:2px solid #22d3ee;outline-offset:2px}`,
      `#${domId} .pg-ab-node.is-drag{opacity:.45}#${domId} .pg-ab-node.is-over{border-color:#22d3ee}`,
      `#${domId} .pg-ab-node.is-right{border-color:#2dd4bf;background:rgba(45,212,191,.08)}#${domId} .pg-ab-node.is-wrong{border-color:#fb7185}`,
      `#${domId} .pg-ab-shape{flex:0 0 2.1rem;width:2.1rem;height:2.1rem;border:2px solid #22d3ee;background:rgba(34,211,238,.08)}`,
      `#${domId} .pg-ab-shape.is-start,#${domId} .pg-ab-shape.is-end{border-radius:999px}`,
      `#${domId} .pg-ab-shape.is-decision{transform:rotate(45deg);width:1.75rem;height:1.75rem;margin:.2rem}`,
      `#${domId} .pg-ab-shape.is-input{clip-path:polygon(18% 0,100% 0,82% 100%,0 100%)}`,
      `#${domId} .pg-ab-label{flex:1;color:#fff;line-height:1.35}`,
      `#${domId} .pg-ab-moves{display:flex;gap:.25rem}`,
      `#${domId} .pg-ab-moves button{width:2rem;height:2rem;border:1px solid var(--line,#23304a);border-radius:7px;background:transparent;color:var(--ink-dim,#9fb3c8);cursor:pointer}`,
      `#${domId} .pg-ab-moves button:disabled{opacity:.28;cursor:default}`,
      `#${domId} .pg-ab-actions{display:flex;gap:.45rem;flex-wrap:wrap;margin-top:.85rem}`,
      `#${domId} .pg-ab-actions button{min-height:42px;border:1px solid var(--line,#23304a);border-radius:9px;background:transparent;color:#22d3ee;font:600 .82rem system-ui;padding:.45rem .75rem;cursor:pointer}`,
      `#${domId} .pg-ab-actions button:focus-visible{outline:2px solid #22d3ee;outline-offset:2px}`,
      `#${domId} .pg-ab-status{margin-top:.5rem;color:var(--ink-dim,#9fb3c8)}`,
      `@media(max-width:620px){#${domId} .pg-ab-node{align-items:flex-start}#${domId} .pg-ab-moves{flex-direction:column}#${domId} .pg-ab-node:not(:last-child)::after{left:1rem}}`,
    ].join('\n');
    const jsBody = `
var flow=$('[data-role=flow]'),status=$('[data-role=status]'),solution=(CONFIG.solution||[]).map(String);if(!flow)return;
var initial=Array.prototype.slice.call(flow.children).map(function(n){return n.getAttribute('data-id');});
function nodes(){return $$('[data-role=node]');}
function renumber(){var ns=nodes();ns.forEach(function(n,i){var up=n.querySelector('[data-role=up]'),down=n.querySelector('[data-role=down]');if(up)up.disabled=i===0;if(down)down.disabled=i===ns.length-1;var label=n.querySelector('.pg-ab-label');n.setAttribute('aria-label',(label?label.textContent:'Step')+', position '+(i+1)+' of '+ns.length+'. Use arrow keys to move.');});}
function move(n,dir){var other=dir<0?n.previousElementSibling:n.nextElementSibling;if(!other)return;if(dir<0)flow.insertBefore(n,other);else flow.insertBefore(other,n);nodes().forEach(function(x){x.classList.remove('is-right','is-wrong');});renumber();}
flow.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-role=up],[data-role=down]');if(!b)return;var n=b.closest('[data-role=node]');move(n,b.getAttribute('data-role')==='up'?-1:1);n.focus();});
flow.addEventListener('keydown',function(e){var n=e.target&&e.target.closest&&e.target.closest('[data-role=node]');if(!n||e.target!==n)return;if(e.key==='ArrowUp'){e.preventDefault();move(n,-1);n.focus();}else if(e.key==='ArrowDown'){e.preventDefault();move(n,1);n.focus();}});
var drag=null;flow.addEventListener('dragstart',function(e){drag=e.target.closest&&e.target.closest('[data-role=node]');if(!drag)return;drag.classList.add('is-drag');if(e.dataTransfer){e.dataTransfer.effectAllowed='move';try{e.dataTransfer.setData('text/plain','step');}catch(_){}}});
flow.addEventListener('dragover',function(e){if(!drag)return;e.preventDefault();var over=e.target.closest&&e.target.closest('[data-role=node]');if(!over||over===drag)return;nodes().forEach(function(n){n.classList.toggle('is-over',n===over);});var ns=nodes(),di=ns.indexOf(drag),oi=ns.indexOf(over);if(di<oi)flow.insertBefore(drag,over.nextElementSibling);else flow.insertBefore(drag,over);});
flow.addEventListener('dragend',function(){nodes().forEach(function(n){n.classList.remove('is-drag','is-over','is-right','is-wrong');});drag=null;renumber();});
function arrange(ids){ids.forEach(function(id){var n=nodes().filter(function(x){return x.getAttribute('data-id')===id;})[0];if(n)flow.appendChild(n);});renumber();}
$('[data-role=check]').addEventListener('click',function(){var right=0;nodes().forEach(function(n,i){var ok=n.getAttribute('data-id')===solution[i];n.classList.toggle('is-right',ok);n.classList.toggle('is-wrong',!ok);if(ok)right++;});status.textContent=right===solution.length?'Flow complete — every step is connected in the expected order.':right+' of '+solution.length+' steps are in the expected position.';});
$('[data-role=hint]').addEventListener('click',function(){status.textContent=String(CONFIG.hint||'Look for the start and end shapes, then place each decision after the information it needs.');});
$('[data-role=solution]').addEventListener('click',function(){arrange(solution);nodes().forEach(function(n){n.classList.add('is-right');n.classList.remove('is-wrong');});status.textContent='Solution shown.';});
$('[data-role=reset]').addEventListener('click',function(){arrange(initial);nodes().forEach(function(n){n.classList.remove('is-right','is-wrong');});status.textContent='Flow reset.';});
renumber();
`;
    return { html, css, jsBody };
  },
};
