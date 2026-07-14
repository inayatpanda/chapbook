/* Family: risk grid (icon array / pictograph) — show "X in N" as a grid of dots
   with a slider to explore the rate. Built for clinical risk communication
   (complication rates, informed consent) but works for any proportion. */
import { esc } from './index.js';

export default {
  id: 'risk-grid',
  name: 'Risk grid',
  category: 'data',
  description: 'An icon-array pictograph — “X in N” shown as a grid of dots, with a slider to explore the rate. For risk and proportion.',
  paramsSchema: {
    type: 'object', additionalProperties: false,
    required: ['total', 'affected'],
    properties: {
      title: { type: 'string', title: 'Optional label above the grid' },
      total: { type: 'number', title: 'Total dots', default: 100, minimum: 10, maximum: 400 },
      affected: { type: 'number', title: 'Starting affected count', default: 5, minimum: 0 },
      columns: { type: 'number', title: 'Columns', default: 10, minimum: 4, maximum: 25 },
      unit: { type: 'string', title: 'Unit (e.g. people, patients)', default: 'people' },
      affectedColour: { type: 'string', title: 'Affected colour (hex)', default: '#f472b6' },
      interactive: { type: 'boolean', title: 'Show the slider', default: true },
      caption: { type: 'string', title: 'One-line caption' },
    },
  },
  presets: [
    {
      name: 'Surgical-site infection',
      params: { title: 'Surgical-site infection after a clean elective case', total: 100, affected: 2, columns: 10,
        unit: 'operations', affectedColour: '#f472b6', interactive: true,
        caption: 'Illustrative — drag to see how the picture changes with the rate.' },
    },
    {
      name: '1 in 1000',
      params: { title: 'A 1-in-1000 risk, drawn out', total: 100, affected: 1, columns: 10, unit: 'people',
        affectedColour: '#fbbf24', interactive: false, caption: 'Even small risks look different when you can see them.' },
    },
  ],
  build(params, domId) {
    const total = Math.max(10, Math.min(400, Math.round(params.total || 100)));
    const affected = Math.max(0, Math.min(total, Math.round(params.affected ?? 5)));
    const columns = Math.max(4, Math.min(25, Math.round(params.columns || 10)));
    const unit = esc(params.unit || 'people');
    const colour = /^#[0-9a-fA-F]{3,8}$/.test(params.affectedColour || '') ? params.affectedColour : '#f472b6';
    const interactive = params.interactive !== false;
    const title = params.title ? `<div class="pg-rg-title">${esc(params.title)}</div>` : '';
    const caption = params.caption ? `<div class="pg-readout" data-role="cap">${esc(params.caption)}</div>` : '';
    const slider = interactive
      ? `<div class="pg-row"><label style="flex:1">Affected
           <input type="range" data-role="slider" min="0" max="${total}" value="${affected}" step="1" aria-label="Affected count"></label></div>`
      : '';
    const html =
      `<div class="pg-stage">${title}` +
      `<div class="pg-rg-out pg-readout" data-role="out" aria-live="polite"></div>` +
      `<div class="pg-rg-grid" data-role="grid" role="img"></div>` +
      slider + caption + `</div>`;
    const css = [
      `#${domId} .pg-rg-title{font-size:.9rem;color:var(--ink-dim,#9fb3c8);margin:0 0 .7rem}`,
      `#${domId} .pg-rg-out{margin-bottom:.8rem;font-size:1rem}`,
      `#${domId} .pg-rg-out b{color:${colour};font-weight:700}`,
      `#${domId} .pg-rg-grid{display:grid;grid-template-columns:repeat(${columns},1fr);gap:4px;max-width:min(100%,${columns * 26}px)}`,
      `#${domId} .pg-rg-cell{aspect-ratio:1;border-radius:50%;background:rgba(140,160,200,.16);transition:background .18s,transform .18s}`,
      `#${domId} .pg-rg-cell.on{background:${colour};box-shadow:0 0 8px ${colour}66}`,
      `#${domId} .pg-rg-reduce .pg-rg-cell{transition:none}`,
      `#${domId} input[type=range]{accent-color:${colour}}`,
    ].join('\n');
    const jsBody = `
var grid=$('[data-role=grid]'),out=$('[data-role=out]'),slider=$('[data-role=slider]');
if(!grid||!out)return;
var total=${total},unit=${JSON.stringify(unit)};
if(reduced)root.classList.add('pg-rg-reduce');
var cells=[];
for(var i=0;i<total;i++){var c=document.createElement('span');c.className='pg-rg-cell';grid.appendChild(c);cells.push(c);}
function pct(n){var p=total?(n/total*100):0;return (p<1&&p>0?p.toFixed(1):Math.round(p));}
function paint(n){
  n=Math.max(0,Math.min(total,n));
  for(var i=0;i<total;i++)cells[i].classList.toggle('on',i<n);
  out.innerHTML='<b>'+n+'</b> in '+total+' '+unit+' · <b>'+pct(n)+'%</b>';
}
if(slider)slider.addEventListener('input',function(){paint(parseInt(slider.value,10)||0);});
paint(${affected});
`;
    return { html, css, jsBody };
  },
};
