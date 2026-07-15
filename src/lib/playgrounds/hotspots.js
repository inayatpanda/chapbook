/* Family: hotspots — a diagram (author SVG backdrop, or a default neutral shape)
   with tappable circular markers placed in viewBox coordinates. Tapping a marker
   highlights it and shows its {label, note} in a readout panel; an "x of n explored"
   tally tracks how many distinct spots have been opened. Markers pulse (unless
   reduced-motion). Replace the backdrop with any inline SVG via the `svg` param. */
import { esc } from './index.js';

const spotSchema = {
  type: 'object', additionalProperties: false,
  required: ['x', 'y', 'label'],
  properties: {
    x: { type: 'number', title: 'X in viewBox coordinates' },
    y: { type: 'number', title: 'Y in viewBox coordinates' },
    label: { type: 'string', title: 'Marker label' },
    note: { type: 'string', title: 'Note shown when tapped' },
  },
};

export default {
  id: 'hotspots',
  name: 'Hotspots',
  category: 'interactive',
  description: 'A diagram with tappable markers; tap to highlight and reveal a label + note, with an "x of n explored" tally. Default backdrop replaceable.',
  paramsSchema: {
    type: 'object', additionalProperties: false,
    required: ['spots'],
    properties: {
      title: { type: 'string', title: 'Optional label above the diagram' },
      svg: { type: 'string', title: 'Inline SVG markup for the backdrop (optional)' },
      viewBox: { type: 'string', title: 'SVG viewBox', default: '0 0 400 300' },
      spots: { type: 'array', minItems: 1, maxItems: 12, items: spotSchema },
    },
  },
  presets: [
    {
      name: 'Labelled diagram',
      params: {
        title: 'Tap each point to explore the diagram',
        viewBox: '0 0 400 300',
        spots: [
          { x: 200, y: 70, label: 'Top', note: 'The upper region of the shape — where load first arrives.' },
          { x: 320, y: 150, label: 'Right edge', note: 'The right flank carries the outward thrust.' },
          { x: 200, y: 230, label: 'Base', note: 'The base spreads the load into the foundation.' },
          { x: 80, y: 150, label: 'Left edge', note: 'The left flank mirrors the right under symmetric load.' },
        ],
      },
    },
    {
      name: 'Parts of a flower',
      params: {
        title: 'A flower — tap the labelled parts',
        viewBox: '0 0 400 300',
        spots: [
          { x: 150, y: 90, label: 'Petal', note: 'The showy petals whose colour and scent draw pollinators in.' },
          { x: 250, y: 120, label: 'Stamen', note: 'The stamen holds the pollen at the tip of a slender filament.' },
          { x: 130, y: 200, label: 'Stem', note: 'The stem carries water up from the roots and holds the bloom aloft.' },
          { x: 280, y: 210, label: 'Leaf', note: 'The leaf turns sunlight, water and air into sugar for the plant.' },
        ],
      },
    },
  ],
  build(params, domId) {
    const title = params.title ? `<div class="pg-hs-title">${esc(params.title)}</div>` : '';
    const viewBox = params.viewBox || '0 0 400 300';
    const defaultSvg =
      `<rect x="40" y="40" width="320" height="220" rx="24" fill="#0d1626" stroke="#23304a" stroke-width="2"/>` +
      `<circle cx="200" cy="150" r="70" fill="none" stroke="#1c4f4a" stroke-width="2" stroke-dasharray="5 6"/>` +
      `<line x1="40" y1="150" x2="360" y2="150" stroke="#23304a" stroke-width="1"/>` +
      `<line x1="200" y1="40" x2="200" y2="260" stroke="#23304a" stroke-width="1"/>`;
    const backdrop = params.svg != null ? String(params.svg) : defaultSvg;
    const diagram =
      `<svg viewBox="${esc(viewBox)}" role="img" aria-label="A diagram with tappable hotspots" class="pg-hs-svg" data-role="svg">` +
      `<g data-role="backdrop">${backdrop}</g>` +
      `<g data-role="markers"></g>` +
      `</svg>`;
    const html =
      `<div class="pg-stage">${title}` +
      `<div class="pg-hs-grid">${diagram}` +
      `<div class="pg-hs-side">` +
      `<div class="pg-hs-tally"><b data-role="explored">0</b> of <b data-role="total">0</b> explored</div>` +
      `<div class="pg-hs-readout" data-role="readout" aria-live="polite">` +
      `<div class="pg-hs-label" data-role="label">Tap a marker</div>` +
      `<div class="pg-hs-note" data-role="note">Each point reveals a short note here.</div>` +
      `</div></div></div></div>`;
    const css = [
      `#${domId} .pg-hs-title{font-size:.9rem;color:var(--ink-dim,#9fb3c8);margin:0 0 .7rem}`,
      `#${domId} .pg-hs-grid{display:grid;grid-template-columns:1.4fr 1fr;gap:1.2rem;align-items:center}`,
      `#${domId} .pg-hs-svg{width:100%;height:auto;display:block;background:#04060c;border:1px solid var(--line,#23304a);border-radius:12px}`,
      `#${domId} .pg-hs-side{min-width:0}`,
      `#${domId} .pg-hs-tally{color:var(--ink-faint,#717d99);font-size:.85rem;margin-bottom:.7rem}`,
      `#${domId} .pg-hs-tally b{color:var(--cyan,#22d3ee)}`,
      `#${domId} .pg-hs-readout{border-left:2px solid var(--line,#23304a);padding-left:.9rem}`,
      `#${domId} .pg-hs-label{color:#fff;font-weight:600;margin-bottom:.35rem}`,
      `#${domId} .pg-hs-note{color:var(--ink-dim,#9fb3c8);font-size:.92rem;line-height:1.45}`,
      `#${domId} .pg-hs-spot{cursor:pointer}`,
      `#${domId} .pg-hs-dot{fill:#04060c;stroke:var(--cyan,#22d3ee);stroke-width:2.5;transition:fill .2s,stroke .2s}`,
      `#${domId} .pg-hs-pulse{fill:var(--cyan,#22d3ee);opacity:.35;transform-origin:center;transform-box:fill-box}`,
      `#${domId} .pg-hs-spot:not(.is-seen) .pg-hs-pulse{animation:pg-hs-pulse-${domId} 2s ease-out infinite}`,
      `#${domId} .pg-hs-spot.is-active .pg-hs-dot{fill:var(--cyan,#22d3ee);stroke:#fff}`,
      `#${domId} .pg-hs-spot.is-seen .pg-hs-dot{stroke:#2dd4bf}`,
      `@keyframes pg-hs-pulse-${domId}{0%{transform:scale(1);opacity:.45}70%{transform:scale(2.6);opacity:0}100%{opacity:0}}`,
      `@media(prefers-reduced-motion:reduce){#${domId} .pg-hs-pulse{animation:none!important}}`,
      `@media(max-width:620px){#${domId} .pg-hs-grid{grid-template-columns:1fr}}`,
    ].join('\n');
    const jsBody = `
var E=function(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');};
var markers=$('[data-role=markers]'),labelEl=$('[data-role=label]'),noteEl=$('[data-role=note]'),exploredEl=$('[data-role=explored]'),totalEl=$('[data-role=total]');
if(!markers)return;
var spots=Array.isArray(CONFIG.spots)?CONFIG.spots:[];
var seen={};
var NS='http://www.w3.org/2000/svg';
function mk(tag,attrs){var el=document.createElementNS(NS,tag);for(var k in attrs)el.setAttribute(k,attrs[k]);return el;}
while(markers.firstChild)markers.removeChild(markers.firstChild);
if(totalEl)totalEl.textContent=spots.length;
function tally(){if(exploredEl)exploredEl.textContent=Object.keys(seen).length;}
function activate(i,g){
  $$('.pg-hs-spot').forEach(function(s){s.classList.remove('is-active');});
  g.classList.add('is-active');g.classList.add('is-seen');
  seen[i]=true;tally();
  var sp=spots[i]||{};
  if(labelEl)labelEl.textContent=sp.label||'';
  if(noteEl)noteEl.textContent=sp.note||'';
}
spots.forEach(function(sp,i){
  var x=Number(sp.x)||0,y=Number(sp.y)||0;
  var g=mk('g',{'class':'pg-hs-spot',tabindex:'0',role:'button','aria-label':(sp.label||('Point '+(i+1)))});
  g.appendChild(mk('circle',{'class':'pg-hs-pulse',cx:x,cy:y,r:10}));
  g.appendChild(mk('circle',{'class':'pg-hs-dot',cx:x,cy:y,r:9}));
  g.addEventListener('click',function(){activate(i,g);});
  g.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();activate(i,g);}});
  markers.appendChild(g);
});
tally();
`;
    return { html, css, jsBody };
  },
};
