/* Family: drag-to-label — labels are placed onto numbered image targets, then
   checked. Drag-and-drop is optional: selecting a label and then a target is the
   complete touch/keyboard path. Targets are buttons, results are announced, and
   the image is accompanied by author-provided alt text. */
import { esc } from './index.js';

export default {
  id: 'drag-to-label',
  name: 'Drag to label',
  category: 'game',
  description: 'Place labels on an image or diagram, then check the answers. Works by drag, tap or keyboard.',
  paramsSchema: {
    type: 'object', additionalProperties: false, required: ['targets'],
    properties: {
      image: { type: 'string', title: 'Image URL (optional)' },
      alt: { type: 'string', title: 'Image alt text' },
      prompt: { type: 'string', default: 'Place each label on the matching target.' },
      targets: {
        type: 'array', minItems: 2, maxItems: 10, title: 'Targets and correct labels',
        items: {
          type: 'object', additionalProperties: false, required: ['label'],
          properties: {
            label: { type: 'string' },
            x: { type: 'number', minimum: 0, maximum: 100, default: 50, title: 'X position (%)' },
            y: { type: 'number', minimum: 0, maximum: 100, default: 50, title: 'Y position (%)' },
            hint: { type: 'string', title: 'Optional hint after an incorrect check' },
          },
        },
      },
    },
  },
  presets: [
    {
      name: 'Parts of a plant',
      params: {
        alt: 'A simple plant diagram with four numbered targets',
        prompt: 'Drag a label, or select it and then choose a numbered target.',
        targets: [
          { label: 'Flower', x: 50, y: 14, hint: 'Look at the top of the stem.' },
          { label: 'Leaf', x: 68, y: 40, hint: 'This part catches light.' },
          { label: 'Stem', x: 50, y: 58, hint: 'This supports the plant.' },
          { label: 'Roots', x: 50, y: 86, hint: 'This part sits below the soil.' },
        ],
      },
    },
  ],
  build(params, domId) {
    const targets = (Array.isArray(params.targets) ? params.targets : []).slice(0, 10)
      .map((t) => {
        const nx = Number(t && t.x), ny = Number(t && t.y);
        return {
          label: String((t && t.label) || ''),
          x: Number.isFinite(nx) ? Math.min(100, Math.max(0, nx)) : 50,
          y: Number.isFinite(ny) ? Math.min(100, Math.max(0, ny)) : 50,
          hint: String((t && t.hint) || ''),
        };
      }).filter((t) => t.label);
    const image = params.image ? `<img src="${esc(params.image)}" alt="${esc(params.alt || '')}" loading="lazy">` : '';
    const spots = targets.map((t, i) =>
      `<button type="button" class="pg-dl-target" data-role="target" data-answer="${i}" style="left:${t.x}%;top:${t.y}%" aria-label="Target ${i + 1}, empty"><span>${i + 1}</span><b data-role="placed"></b></button>`
    ).join('');
    // Reverse the palette for a deterministic challenge without random output bytes.
    const labels = targets.map((t, i) => ({ ...t, i })).reverse().map((t) =>
      `<button type="button" class="pg-dl-label" data-role="label" data-idx="${t.i}" draggable="true" aria-pressed="false">${esc(t.label)}</button>`
    ).join('');
    const html =
      `<div class="pg-stage"><div class="pg-dl-prompt">${esc(params.prompt || 'Place each label on its target.')}</div>` +
      `<div class="pg-dl-layout"><div class="pg-dl-palette" data-role="palette" aria-label="Labels">${labels}</div>` +
      `<div class="pg-dl-board${params.image ? '' : ' is-blank'}" data-role="board">${image}${spots}</div></div>` +
      `<div class="pg-dl-actions"><button type="button" data-role="check">Check labels</button><button type="button" data-role="hint">Show solution</button><button type="button" data-role="reset">Reset</button></div>` +
      `<div class="pg-readout pg-dl-status" data-role="status" aria-live="polite"></div></div>`;
    const css = [
      `#${domId} .pg-dl-prompt{color:var(--ink-dim,#9fb3c8);font-size:.9rem;margin-bottom:.7rem}`,
      `#${domId} .pg-dl-layout{display:grid;grid-template-columns:minmax(8rem,.65fr) minmax(15rem,1.6fr);gap:.75rem;align-items:start}`,
      `#${domId} .pg-dl-palette{display:grid;gap:.45rem}`,
      `#${domId} .pg-dl-label{min-height:42px;text-align:left;border:1px solid var(--line,#23304a);border-radius:9px;background:rgba(140,160,200,.06);color:var(--ink-dim,#cdd6e6);font:inherit;padding:.5rem .65rem;cursor:grab}`,
      `#${domId} .pg-dl-label[aria-pressed=true]{border-color:#22d3ee;background:rgba(34,211,238,.12);color:#fff}`,
      `#${domId} .pg-dl-label.is-placed{opacity:.42;text-decoration:line-through}`,
      `#${domId} .pg-dl-label:focus-visible,#${domId} .pg-dl-target:focus-visible,#${domId} .pg-dl-actions button:focus-visible{outline:2px solid #22d3ee;outline-offset:2px}`,
      `#${domId} .pg-dl-board{position:relative;min-height:300px;border:1px solid var(--line,#23304a);border-radius:12px;overflow:hidden;background:#0d1322}`,
      `#${domId} .pg-dl-board.is-blank{background:linear-gradient(180deg,rgba(34,211,238,.12) 0 68%,rgba(139,92,60,.28) 68%),repeating-linear-gradient(90deg,transparent 0 31px,rgba(255,255,255,.04) 31px 32px)}`,
      `#${domId} .pg-dl-board img{display:block;width:100%;height:auto;min-height:300px;object-fit:contain}`,
      `#${domId} .pg-dl-target{position:absolute;transform:translate(-50%,-50%);min-width:42px;min-height:42px;max-width:9rem;border:2px solid #22d3ee;border-radius:999px;background:rgba(4,6,12,.86);color:#fff;font:inherit;padding:.3rem .55rem;cursor:pointer;display:flex;align-items:center;gap:.35rem}`,
      `#${domId} .pg-dl-target>span{display:inline-flex;align-items:center;justify-content:center;min-width:1.35rem;height:1.35rem;border-radius:99px;background:#22d3ee;color:#04060c;font-weight:800;font-size:.72rem}`,
      `#${domId} .pg-dl-target b{font-size:.74rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}`,
      `#${domId} .pg-dl-target.is-right{border-color:#2dd4bf}#${domId} .pg-dl-target.is-wrong{border-color:#fb7185}`,
      `#${domId} .pg-dl-actions{display:flex;gap:.45rem;flex-wrap:wrap;margin-top:.7rem}`,
      `#${domId} .pg-dl-actions button{min-height:42px;border:1px solid var(--line,#23304a);border-radius:9px;background:transparent;color:#22d3ee;font:600 .82rem system-ui;padding:.45rem .75rem;cursor:pointer}`,
      `#${domId} .pg-dl-status{margin-top:.5rem;color:var(--ink-dim,#9fb3c8)}`,
      `@media(max-width:620px){#${domId} .pg-dl-layout{grid-template-columns:1fr}#${domId} .pg-dl-palette{grid-template-columns:repeat(2,minmax(0,1fr))}#${domId} .pg-dl-board{min-height:280px}}`,
    ].join('\n');
    const jsBody = `
var DATA=(CONFIG.targets||[]).slice(0,10).map(function(t){return {label:String((t&&t.label)||''),hint:String((t&&t.hint)||'')};}).filter(function(t){return t.label;});
var labels=$$('[data-role=label]'),targets=$$('[data-role=target]'),status=$('[data-role=status]');var selected=null,dragged=null;
function labelFor(i){return labels.filter(function(b){return (+b.getAttribute('data-idx'))===i;})[0];}
function select(i){selected=i;labels.forEach(function(b){b.setAttribute('aria-pressed',(+b.getAttribute('data-idx'))===i?'true':'false');});if(status)status.textContent='Selected '+(DATA[i]?DATA[i].label:'label')+'. Choose a target.';}
function refresh(){
  labels.forEach(function(b){var i=+b.getAttribute('data-idx'),used=targets.some(function(t){var raw=t.getAttribute('data-placed');return raw!==null&&(+raw)===i;});b.classList.toggle('is-placed',used);});
  targets.forEach(function(t,j){var raw=t.getAttribute('data-placed'),i=raw===null?-1:+raw,name=(i>=0&&DATA[i])?DATA[i].label:'';var out=t.querySelector('[data-role=placed]');out.textContent=name;t.setAttribute('aria-label','Target '+(j+1)+(name?', '+name:', empty'));});
}
function place(t,i){if(i==null||i<0||!DATA[i])return;targets.forEach(function(x){if((+x.getAttribute('data-placed'))===i)x.removeAttribute('data-placed');});t.setAttribute('data-placed',String(i));targets.forEach(function(x){x.classList.remove('is-right','is-wrong');});selected=null;labels.forEach(function(b){b.setAttribute('aria-pressed','false');});refresh();if(status)status.textContent=DATA[i].label+' placed. Choose another label.';}
labels.forEach(function(b){var i=+b.getAttribute('data-idx');b.addEventListener('click',function(){select(i);});b.addEventListener('dragstart',function(e){dragged=i;if(e.dataTransfer){e.dataTransfer.effectAllowed='move';try{e.dataTransfer.setData('text/plain',String(i));}catch(_){}}});});
targets.forEach(function(t){t.addEventListener('click',function(){if(selected!=null)place(t,selected);});t.addEventListener('dragover',function(e){e.preventDefault();});t.addEventListener('drop',function(e){e.preventDefault();place(t,dragged);dragged=null;});});
$('[data-role=check]').addEventListener('click',function(){var right=0,hints=[];targets.forEach(function(t,i){var ok=(+t.getAttribute('data-placed'))===i;t.classList.toggle('is-right',ok);t.classList.toggle('is-wrong',!ok);if(ok)right++;else if(DATA[i]&&DATA[i].hint)hints.push(DATA[i].hint);});status.textContent=right+' of '+DATA.length+' correct.'+(right===DATA.length?' All labels are in place.':hints.length?' Hint: '+hints[0]:'');});
$('[data-role=hint]').addEventListener('click',function(){targets.forEach(function(t,i){t.setAttribute('data-placed',String(i));t.classList.add('is-right');t.classList.remove('is-wrong');});refresh();status.textContent='Solution shown.';});
$('[data-role=reset]').addEventListener('click',function(){targets.forEach(function(t){t.removeAttribute('data-placed');t.classList.remove('is-right','is-wrong');});selected=null;labels.forEach(function(b){b.setAttribute('aria-pressed','false');});refresh();status.textContent='Labels reset.';});
refresh();
`;
    return { html, css, jsBody };
  },
};
