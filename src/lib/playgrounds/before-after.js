/* Family: before / after wipe — a draggable centre handle wipes between a "before"
   state on the left and an "after" state on the right. Each side renders an
   author-supplied inline SVG/HTML snippet (or an image URL via beforeImg/afterImg);
   since the library ships no photos, the default presets draw simple labelled SVG
   scenes. Pointer drag moves the wipe; a range input gives keyboard/touch a
   fallback. Two corner labels name the two states. Handle clamps 0–100%. */
import { esc } from './index.js';

export default {
  id: 'before-after',
  name: 'Before / after wipe',
  category: 'comparison',
  description: 'A draggable wipe slider revealing a "before" state on one side and an "after" on the other. SVG/HTML snippets per side, or image URLs.',
  paramsSchema: {
    type: 'object', additionalProperties: false,
    properties: {
      title: { type: 'string', title: 'Optional label above the slider' },
      beforeLabel: { type: 'string', title: 'Corner label for the before side', default: 'Before' },
      afterLabel: { type: 'string', title: 'Corner label for the after side', default: 'After' },
      beforeHtml: { type: 'string', title: 'Inline SVG/HTML for the before side' },
      afterHtml: { type: 'string', title: 'Inline SVG/HTML for the after side' },
      beforeImg: { type: 'string', title: 'Image URL for the before side (overrides beforeHtml)' },
      afterImg: { type: 'string', title: 'Image URL for the after side (overrides afterHtml)' },
    },
  },
  presets: [
    {
      name: 'Solid vs hollow',
      params: {
        title: 'Solid bar versus a hollow tube of the same outer size',
        beforeLabel: 'Solid', afterLabel: 'Hollow',
        beforeHtml: '<svg viewBox="0 0 200 200" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="A solid circular cross-section"><circle cx="100" cy="100" r="70" fill="#2dd4bf" stroke="#0c4a45" stroke-width="3"/></svg>',
        afterHtml: '<svg viewBox="0 0 200 200" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="A hollow circular cross-section"><circle cx="100" cy="100" r="70" fill="#22d3ee" stroke="#0c4a45" stroke-width="3"/><circle cx="100" cy="100" r="42" fill="#04060c"/></svg>',
      },
    },
    {
      name: 'Before / after',
      params: {
        title: 'Drag the handle to compare the two states',
        beforeLabel: 'Before', afterLabel: 'After',
        beforeHtml: '<svg viewBox="0 0 200 200" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Before panel"><rect width="200" height="200" fill="#1e293b"/><rect x="30" y="120" width="140" height="14" rx="7" fill="#475569"/><rect x="30" y="150" width="90" height="14" rx="7" fill="#475569"/></svg>',
        afterHtml: '<svg viewBox="0 0 200 200" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="After panel"><rect width="200" height="200" fill="#0f2d2a"/><rect x="30" y="120" width="140" height="14" rx="7" fill="#2dd4bf"/><rect x="30" y="150" width="90" height="14" rx="7" fill="#22d3ee"/></svg>',
      },
    },
  ],
  build(params, domId) {
    const title = params.title ? `<div class="pg-bw-title">${esc(params.title)}</div>` : '';
    const beforeLabel = params.beforeLabel || 'Before';
    const afterLabel = params.afterLabel || 'After';
    const beforeInner = params.beforeImg
      ? `<img src="${esc(params.beforeImg)}" alt="${esc(beforeLabel)}" class="pg-bw-img">`
      : (params.beforeHtml || '<svg viewBox="0 0 200 200" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Before"><rect width="200" height="200" fill="#1e293b"/></svg>');
    const afterInner = params.afterImg
      ? `<img src="${esc(params.afterImg)}" alt="${esc(afterLabel)}" class="pg-bw-img">`
      : (params.afterHtml || '<svg viewBox="0 0 200 200" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="After"><rect width="200" height="200" fill="#0f2d2a"/></svg>');
    const html =
      `<div class="pg-stage">${title}` +
      `<div class="pg-bw-frame" data-role="frame">` +
      `<div class="pg-bw-after">${afterInner}<span class="pg-bw-tag pg-bw-tag-r">${esc(afterLabel)}</span></div>` +
      `<div class="pg-bw-before" data-role="before"><div class="pg-bw-beforeinner" data-role="beforeinner">${beforeInner}<span class="pg-bw-tag pg-bw-tag-l">${esc(beforeLabel)}</span></div></div>` +
      `<div class="pg-bw-handle" data-role="handle" aria-hidden="true"><span class="pg-bw-grip"></span></div>` +
      `</div>` +
      `<div class="pg-controls pg-bw-controls">` +
      `<div class="pg-field"><label for="${domId}-wipe">Wipe position <b data-role="pctval">50%</b></label>` +
      `<input id="${domId}-wipe" data-role="wipe" type="range" min="0" max="100" step="1" value="50" aria-label="Wipe position"></div>` +
      `</div></div>`;
    const css = [
      `#${domId} .pg-bw-title{font-size:.9rem;color:var(--ink-dim,#9fb3c8);margin:0 0 .7rem}`,
      `#${domId} .pg-bw-frame{position:relative;width:100%;aspect-ratio:16/10;border:1px solid var(--line,#23304a);border-radius:12px;overflow:hidden;background:#04060c;touch-action:none;user-select:none;cursor:ew-resize}`,
      `#${domId} .pg-bw-after,#${domId} .pg-bw-before{position:absolute;inset:0}`,
      `#${domId} .pg-bw-before{width:50%;overflow:hidden;border-right:2px solid var(--cyan,#22d3ee)}`,
      `#${domId} .pg-bw-beforeinner{position:absolute;inset:0;width:var(--pg-bw-w,100%);height:100%}`,
      `#${domId} .pg-bw-after>svg,#${domId} .pg-bw-beforeinner>svg{position:absolute;inset:0;width:100%;height:100%;display:block}`,
      `#${domId} .pg-bw-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}`,
      `#${domId} .pg-bw-tag{position:absolute;bottom:.6rem;font-size:.75rem;letter-spacing:.04em;text-transform:uppercase;color:#fff;background:rgba(4,6,12,.7);border:1px solid var(--line,#23304a);border-radius:99px;padding:.2rem .7rem}`,
      `#${domId} .pg-bw-tag-l{left:.6rem}`,
      `#${domId} .pg-bw-tag-r{right:.6rem}`,
      `#${domId} .pg-bw-handle{position:absolute;top:0;bottom:0;left:50%;width:40px;margin-left:-20px;display:flex;align-items:center;justify-content:center;cursor:ew-resize}`,
      `#${domId} .pg-bw-handle::before{content:"";position:absolute;top:0;bottom:0;left:50%;width:2px;margin-left:-1px;background:var(--cyan,#22d3ee)}`,
      `#${domId} .pg-bw-grip{position:relative;width:34px;height:34px;border-radius:50%;background:#04060c;border:2px solid var(--cyan,#22d3ee);box-shadow:0 0 12px rgba(34,211,238,.5)}`,
      `#${domId} .pg-bw-grip::before{content:"";position:absolute;top:50%;left:50%;width:14px;height:9px;margin:-4.5px 0 0 -7px;background:linear-gradient(90deg,var(--cyan,#22d3ee) 0 35%,transparent 35% 65%,var(--cyan,#22d3ee) 65% 100%)}`,
      `#${domId} .pg-bw-controls{margin-top:1.1rem}`,
      `#${domId} label b{color:#fff}`,
      `@media(max-width:620px){#${domId} .pg-bw-frame{aspect-ratio:4/3}}`,
    ].join('\n');
    const jsBody = `
var frame=$('[data-role=frame]'),before=$('[data-role=before]'),inner=$('[data-role=beforeinner]'),handle=$('[data-role=handle]'),wipe=$('[data-role=wipe]'),pctVal=$('[data-role=pctval]');
if(!frame||!before||!handle||!wipe)return;
function clamp(v){return v<0?0:(v>100?100:v);}
function set(pct){
  pct=clamp(pct);
  before.style.width=pct+'%';
  if(inner)inner.style.setProperty('--pg-bw-w', frame.clientWidth+'px');
  handle.style.left=pct+'%';
  if(pctVal)pctVal.textContent=Math.round(pct)+'%';
  if(parseFloat(wipe.value)!==pct)wipe.value=pct;
}
function fromEvent(e){
  var r=frame.getBoundingClientRect();
  var x=(e.touches&&e.touches[0]?e.touches[0].clientX:e.clientX)-r.left;
  return clamp(r.width>0?(x/r.width)*100:50);
}
var dragging=false;
function down(e){dragging=true;set(fromEvent(e));if(e.cancelable)e.preventDefault();}
function move(e){if(dragging)set(fromEvent(e));}
function up(){dragging=false;}
frame.addEventListener('pointerdown',down);
window.addEventListener('pointermove',move);
window.addEventListener('pointerup',up);
frame.addEventListener('touchstart',down,{passive:false});
window.addEventListener('touchmove',move,{passive:false});
window.addEventListener('touchend',up);
wipe.addEventListener('input',function(){set(parseFloat(wipe.value)||0);});
window.addEventListener('resize',function(){set(parseFloat(wipe.value)||50);});
set(50);
`;
    return { html, css, jsBody };
  },
};
