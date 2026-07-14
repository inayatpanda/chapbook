/* Family: layer peel — concentric layers you toggle on/off to "peel" down to the
   core (tissue planes skin→fat→muscle→bone, what a scan layers up, abstractions in
   a stack). Click a layer in the legend to hide it and reveal what's beneath. */
import { esc } from './index.js';

export default {
  id: 'layer-peel',
  name: 'Layer peel',
  category: 'diagram',
  description: 'Concentric layers you toggle to peel down to the core (tissue planes, scan layers, a stack of abstractions).',
  paramsSchema: {
    type: 'object', additionalProperties: false,
    required: ['layers'],
    properties: {
      title: { type: 'string', title: 'Optional label above the figure' },
      layers: {
        type: 'array', title: 'Layers (outer → inner)', minItems: 2, maxItems: 6,
        items: {
          type: 'object', additionalProperties: false, required: ['name', 'colour'],
          properties: { name: { type: 'string' }, colour: { type: 'string' }, note: { type: 'string', title: 'Shown when this is the deepest visible layer' } },
        },
      },
      caption: { type: 'string', title: 'One-line caption' },
    },
  },
  presets: [
    {
      name: 'Tissue planes',
      params: {
        title: 'What the scalpel goes through', caption: 'Peel a layer off to see what is underneath.',
        layers: [
          { name: 'Skin', colour: '#f472b6', note: 'Skin — the bit everyone sees, and the bit that scars.' },
          { name: 'Fat', colour: '#fbbf24', note: 'Subcutaneous fat — variable, and it bleeds.' },
          { name: 'Muscle', colour: '#fb7185', note: 'Muscle — split along its fibres where you can.' },
          { name: 'Bone', colour: '#e9eef8', note: 'Bone — the thing we actually came for.' },
        ],
      },
    },
    {
      name: 'Software stack',
      params: {
        title: 'The cloud is just someone else’s layers', caption: 'Each layer hides the one below — until it breaks.',
        layers: [
          { name: 'Your app', colour: '#2dd4bf', note: 'Your app — the only layer you actually wrote.' },
          { name: 'Framework', colour: '#22d3ee', note: 'A framework you trusted to be boring.' },
          { name: 'OS', colour: '#818cf8', note: 'An operating system you never think about.' },
          { name: 'Someone’s server', colour: '#f472b6', note: 'A computer in a building you will never see.' },
        ],
      },
    },
  ],
  build(params, domId) {
    const layers = (Array.isArray(params.layers) ? params.layers : []).slice(0, 6);
    const title = params.title ? `<div class="pg-lp-title">${esc(params.title)}</div>` : '';
    const caption = params.caption ? `<div class="pg-lp-cap-static pg-readout">${esc(params.caption)}</div>` : '';
    const html =
      `<div class="pg-stage">${title}` +
      `<svg class="pg-lp-svg" viewBox="0 0 260 170" data-role="svg" role="img" aria-label="layered figure"></svg>` +
      `<div class="pg-lp-out pg-readout" data-role="out" aria-live="polite"></div>` +
      `<div class="pg-lp-legend" data-role="legend" role="group" aria-label="Toggle layers"></div>` +
      caption + `</div>`;
    const css = [
      `#${domId} .pg-lp-title{font-size:.9rem;color:var(--ink-dim,#9fb3c8);margin:0 0 .6rem}`,
      `#${domId} .pg-lp-svg{display:block;width:100%;max-width:380px;margin-inline:auto}`,
      `#${domId} .pg-lp-rect{transition:opacity .25s}`,
      `#${domId}.pg-lp-reduce .pg-lp-rect{transition:none}`,
      `#${domId} .pg-lp-rect.off{opacity:0}`,
      `#${domId} .pg-lp-out{text-align:center;margin:.7rem 0 .2rem;min-height:1.3em}`,
      `#${domId} .pg-lp-legend{display:flex;flex-wrap:wrap;gap:.5rem;justify-content:center;margin-top:.7rem}`,
      `#${domId} .pg-lp-chip{display:inline-flex;align-items:center;gap:.4rem;border:1px solid var(--line,#23304a);background:rgba(140,160,200,.05);color:var(--ink-dim,#9fb3c8);border-radius:99px;padding:.32em .8em;font:inherit;font-size:.82rem;cursor:pointer}`,
      `#${domId} .pg-lp-chip[aria-pressed=false]{opacity:.45;text-decoration:line-through}`,
      `#${domId} .pg-lp-sw{width:12px;height:12px;border-radius:3px;flex:0 0 auto}`,
      `#${domId} .pg-lp-cap-static{text-align:center;color:var(--ink-faint,#8aa0b8);margin-top:.6rem;font-size:.85rem}`,
    ].join('\n');
    const jsBody = `
var svg=$('[data-role=svg]'),legend=$('[data-role=legend]'),out=$('[data-role=out]');
if(!svg||!legend)return;
if(reduced)root.classList.add('pg-lp-reduce');
var SVGNS='http://www.w3.org/2000/svg';
var L=CONFIG.layers||[],N=L.length;
var padX=110/N,padY=66/N;
var shown=L.map(function(){return true;});
var rects=[];
L.forEach(function(layer,i){
  var x=15+i*padX,y=15+i*padY,w=230-2*i*padX,h=140-2*i*padY;
  var r=document.createElementNS(SVGNS,'rect');
  r.setAttribute('x',x.toFixed(1));r.setAttribute('y',y.toFixed(1));
  r.setAttribute('width',w.toFixed(1));r.setAttribute('height',h.toFixed(1));
  r.setAttribute('rx','14');r.setAttribute('fill',layer.colour||'#22d3ee');
  r.setAttribute('fill-opacity', i===N-1?'0.92':'0.8');
  r.setAttribute('class','pg-lp-rect');
  svg.appendChild(r);rects.push(r);
  // label near the top edge of each band
  var t=document.createElementNS(SVGNS,'text');
  t.setAttribute('x',(x+10).toFixed(1));t.setAttribute('y',(y+15).toFixed(1));
  t.setAttribute('class','pg-lp-rect');t.setAttribute('fill','#04060c');
  t.setAttribute('font-size','9');t.setAttribute('font-weight','700');
  t.textContent=layer.name||('Layer '+(i+1));
  svg.appendChild(t);rects.push(t);
});
function deepest(){var d=-1;for(var i=0;i<N;i++)if(shown[i])d=i;return d;}
function refresh(){
  for(var i=0;i<N;i++){
    rects[i*2].classList.toggle('off',!shown[i]);
    rects[i*2+1].classList.toggle('off',!shown[i]);
  }
  var d=deepest();
  out.textContent = d>=0 ? (L[d].note||('Down to: '+(L[d].name||''))) : 'All layers peeled away.';
}
L.forEach(function(layer,i){
  var b=document.createElement('button');
  b.type='button';b.className='pg-lp-chip';b.setAttribute('aria-pressed','true');
  b.innerHTML='<span class="pg-lp-sw" style="background:'+(layer.colour||'#22d3ee')+'"></span>'+
    String(layer.name||'Layer '+(i+1)).replace(/&/g,'&amp;').replace(/</g,'&lt;');
  b.addEventListener('click',function(){shown[i]=!shown[i];b.setAttribute('aria-pressed',shown[i]?'true':'false');refresh();});
  legend.appendChild(b);
});
refresh();
`;
    return { html, css, jsBody };
  },
};
