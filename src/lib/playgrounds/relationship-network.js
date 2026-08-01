/* Family: relationship-network — a compact node/edge explorer. Buttons are placed
   around a deterministic circle while an SVG draws labelled relationships below
   them. Selecting a node highlights its direct connections and updates a textual
   relationship list, so the information remains available without interpreting
   the visual layout. */
import { esc } from './index.js';

export default {
  id: 'relationship-network',
  name: 'Relationship network',
  category: 'diagram',
  description: 'Explore connections between people, ideas, events or organisations through a selectable network and textual relationship list.',
  paramsSchema: {
    type: 'object', additionalProperties: false, required: ['nodes', 'links'],
    properties: {
      prompt: { type: 'string', title: 'Instruction line' },
      nodes: {
        type: 'array', minItems: 2, maxItems: 12,
        items: {
          type: 'object', additionalProperties: false, required: ['id', 'label'],
          properties: {
            id: { type: 'string' }, label: { type: 'string' },
            group: { type: 'string', title: 'Optional group' },
            note: { type: 'string', title: 'Description shown when selected' },
          },
        },
      },
      links: {
        type: 'array', minItems: 1, maxItems: 30,
        items: {
          type: 'object', additionalProperties: false, required: ['from', 'to'],
          properties: {
            from: { type: 'string', title: 'From node id' },
            to: { type: 'string', title: 'To node id' },
            label: { type: 'string', title: 'Relationship' },
          },
        },
      },
    },
  },
  presets: [
    {
      name: 'A small creative project',
      params: {
        prompt: 'Select a person to see their direct working relationships.',
        nodes: [
          { id: 'writer', label: 'Writer', group: 'Editorial', note: 'Shapes the argument and first draft.' },
          { id: 'editor', label: 'Editor', group: 'Editorial', note: 'Tests the structure and sharpens the language.' },
          { id: 'designer', label: 'Designer', group: 'Production', note: 'Turns the story into a visual system.' },
          { id: 'researcher', label: 'Researcher', group: 'Editorial', note: 'Finds evidence and verifies the details.' },
          { id: 'developer', label: 'Developer', group: 'Production', note: 'Builds and tests the interactive presentation.' },
        ],
        links: [
          { from: 'writer', to: 'editor', label: 'draft and revision' },
          { from: 'writer', to: 'researcher', label: 'questions and evidence' },
          { from: 'editor', to: 'designer', label: 'structure and emphasis' },
          { from: 'designer', to: 'developer', label: 'visual specification' },
          { from: 'developer', to: 'writer', label: 'interactive constraints' },
        ],
      },
    },
  ],
  build(params, domId) {
    const nodes = (Array.isArray(params.nodes) ? params.nodes : []).slice(0, 12)
      .map((n) => ({ id: String((n && n.id) || ''), label: String((n && n.label) || ''), group: String((n && n.group) || ''), note: String((n && n.note) || '') }))
      .filter((n) => n.id && n.label);
    const links = (Array.isArray(params.links) ? params.links : []).slice(0, 30)
      .map((l) => ({ from: String((l && l.from) || ''), to: String((l && l.to) || ''), label: String((l && l.label) || '') }))
      .filter((l) => l.from && l.to);
    const positions = {};
    nodes.forEach((n, i) => {
      const a = (-Math.PI / 2) + (Math.PI * 2 * i / nodes.length);
      positions[n.id] = { x: 50 + Math.cos(a) * 34, y: 50 + Math.sin(a) * 34 };
    });
    const lines = links.map((l, i) => {
      const a = positions[l.from], b = positions[l.to];
      if (!a || !b) return '';
      return `<line data-role="link" data-idx="${i}" data-from="${esc(l.from)}" data-to="${esc(l.to)}" x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}"/>`;
    }).join('');
    const buttons = nodes.map((n) => {
      const p = positions[n.id];
      const count = links.filter((l) => l.from === n.id || l.to === n.id).length;
      return `<button type="button" class="pg-rn-node" data-role="node" data-id="${esc(n.id)}" style="left:${p.x.toFixed(1)}%;top:${p.y.toFixed(1)}%" aria-label="${esc(n.label)}, ${count} connection${count === 1 ? '' : 's'}"><b>${esc(n.label)}</b>${n.group ? `<span>${esc(n.group)}</span>` : ''}</button>`;
    }).join('');
    const textList = links.map((l) => {
      const a = nodes.find((n) => n.id === l.from), b = nodes.find((n) => n.id === l.to);
      return `<li><b>${esc(a ? a.label : l.from)}</b> → <b>${esc(b ? b.label : l.to)}</b>${l.label ? `: ${esc(l.label)}` : ''}</li>`;
    }).join('');
    const html =
      `<div class="pg-stage"><div class="pg-rn-prompt">${esc(params.prompt || 'Select a node to explore its relationships.')}</div>` +
      `<div class="pg-rn-stage"><svg viewBox="0 0 100 100" aria-hidden="true">${lines}</svg>${buttons}</div>` +
      `<div class="pg-rn-panel" data-role="panel" aria-live="polite">Select a node to highlight its direct connections.</div>` +
      `<details class="pg-rn-details"><summary>All relationships</summary><ul>${textList}</ul></details></div>`;
    const css = [
      `#${domId} .pg-rn-prompt{color:var(--ink-dim,#9fb3c8);margin-bottom:.65rem}`,
      `#${domId} .pg-rn-stage{position:relative;min-height:360px;border:1px solid var(--line,#23304a);border-radius:13px;background:radial-gradient(circle at center,rgba(34,211,238,.08),rgba(4,6,12,.08) 60%)}`,
      `#${domId} .pg-rn-stage svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}`,
      `#${domId} .pg-rn-stage line{stroke:#52617c;stroke-width:.8;vector-effect:non-scaling-stroke;transition:stroke .15s,stroke-width .15s}`,
      `#${domId} .pg-rn-stage line.is-on{stroke:#22d3ee;stroke-width:2}`,
      `#${domId} .pg-rn-node{position:absolute;transform:translate(-50%,-50%);min-width:7rem;max-width:9.5rem;min-height:48px;border:1px solid #52617c;border-radius:999px;background:rgba(8,13,24,.94);color:#fff;font:inherit;padding:.42rem .65rem;cursor:pointer;z-index:1}`,
      `#${domId} .pg-rn-node b{display:block;font-size:.82rem}#${domId} .pg-rn-node span{display:block;font-size:.65rem;color:var(--ink-faint,#717d99);margin-top:.08rem}`,
      `#${domId} .pg-rn-node.is-near{border-color:#2dd4bf}#${domId} .pg-rn-node.is-on{border-color:#22d3ee;background:rgba(34,211,238,.16)}`,
      `#${domId} .pg-rn-node:focus-visible{outline:2px solid #22d3ee;outline-offset:2px}`,
      `#${domId} .pg-rn-panel{margin-top:.65rem;border:1px solid var(--line,#23304a);border-radius:10px;padding:.7rem .8rem;color:var(--ink-dim,#cdd6e6);line-height:1.5}`,
      `#${domId} .pg-rn-panel b{color:#fff}#${domId} .pg-rn-panel ul{margin:.4rem 0 0;padding-left:1.2rem}`,
      `#${domId} .pg-rn-details{margin-top:.6rem;color:var(--ink-dim,#9fb3c8);font-size:.82rem}#${domId} .pg-rn-details summary{cursor:pointer;color:#22d3ee}#${domId} .pg-rn-details li{margin:.25rem 0}`,
      `@media(max-width:620px){#${domId} .pg-rn-stage{min-height:420px}#${domId} .pg-rn-node{min-width:5.5rem;max-width:7rem;padding:.35rem .45rem}#${domId} .pg-rn-node b{font-size:.72rem}}`,
    ].join('\n');
    const jsBody = `
var NODES=(CONFIG.nodes||[]).slice(0,12),LINKS=(CONFIG.links||[]).slice(0,30),buttons=$$('[data-role=node]'),lines=$$('[data-role=link]'),panel=$('[data-role=panel]');
function clean(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function node(id){return NODES.filter(function(n){return n&&String(n.id)===id;})[0]||{};}
buttons.forEach(function(btn){btn.addEventListener('click',function(){var id=btn.getAttribute('data-id'),n=node(id),near={};var related=[];
  LINKS.forEach(function(l){if(!l)return;var from=String(l.from||''),to=String(l.to||'');if(from===id||to===id){var other=from===id?to:from;near[other]=1;related.push({other:node(other),label:String(l.label||'')});}});
  buttons.forEach(function(b){var bid=b.getAttribute('data-id');b.classList.toggle('is-on',bid===id);b.classList.toggle('is-near',!!near[bid]);});
  lines.forEach(function(l){l.classList.toggle('is-on',l.getAttribute('data-from')===id||l.getAttribute('data-to')===id);});
  panel.innerHTML='<b>'+clean(n.label||id)+'</b>'+(n.note?' — '+clean(n.note):'')+(related.length?'<ul>'+related.map(function(r){return '<li><b>'+clean(r.other.label||'Unknown')+'</b>'+(r.label?' · '+clean(r.label):'')+'</li>';}).join('')+'</ul>':'<div>No direct relationships are configured.</div>');
});});
`;
    return { html, css, jsBody };
  },
};
