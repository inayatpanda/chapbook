/* Family: scratch-to-reveal — a <canvas> cover painted over hidden content. The
   reader drags a finger / pointer across it to scratch the cover away and reveal
   the text (or a small HTML snippet) beneath. A "Reveal all" button clears the
   whole cover; once enough is scratched the cover auto-clears. Pointer Events with
   touch-action:none on the scratch surface so a drag scratches rather than scrolls.
   Reduced-motion / no-canvas → the content is shown revealed from the start.
   Self-contained: vanilla JS, no network / storage. */
import { esc } from './index.js';

// revealHtml is author-supplied raw HTML (formatting is the point), but it must
// not carry executable content to the live blog. Strip scripts / event handlers /
// frames / dangerous-scheme links while keeping safe formatting (strong, em, a, …).
function stripUnsafe(html) {
  return String(html)
    .replace(/<\s*script[\s\S]*?<\s*\/\s*script\s*>/gi, '')
    .replace(/<\s*script\b[^>]*\/?\s*>/gi, '')
    .replace(/<\s*(iframe|object|embed|foreignObject)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(iframe|object|embed)\b[^>]*\/?\s*>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*("\s*(?:javascript|data|vbscript):[^"]*"|'\s*(?:javascript|data|vbscript):[^']*'|\s*(?:javascript|data|vbscript):[^\s>]*)/gi, '');
}

export default {
  id: 'scratch-reveal',
  name: 'Scratch to reveal',
  category: 'Interactive',
  description: 'A scratch-off cover over hidden content — drag a finger to scratch it away and reveal the answer, with a "Reveal all" button and a reduced-motion fallback.',
  paramsSchema: {
    type: 'object', additionalProperties: false,
    properties: {
      title: { type: 'string', title: 'Optional label above the scratch panel' },
      coverLabel: { type: 'string', title: 'Text shown on the cover', default: 'Scratch here' },
      revealText: { type: 'string', title: 'The plain text revealed underneath' },
      revealHtml: { type: 'string', title: 'A small HTML snippet revealed underneath (overrides revealText)' },
      color: { type: 'string', title: 'Cover colour (hex)', default: '#2dd4bf' },
    },
  },
  presets: [
    {
      name: 'Reveal the answer',
      params: {
        title: 'What is the tallest mountain on Earth, base to summit?',
        coverLabel: 'Scratch to reveal',
        revealText: 'Mauna Kea — measured from the seabed it beats Everest, which wins only above sea level.',
        color: '#2dd4bf',
      },
    },
    {
      name: 'Spoiler',
      params: {
        coverLabel: 'Spoiler — scratch if you dare',
        revealHtml: 'It was <strong>Colonel Mustard</strong>, in the library, all along.',
        color: '#818cf8',
      },
    },
  ],
  build(params, domId) {
    const title = params.title ? `<div class="pg-scr-title">${esc(params.title)}</div>` : '';
    const coverLabel = esc(params.coverLabel || 'Scratch here');
    // The revealed content: HTML snippet wins over plain text; both are author-supplied.
    const revealInner = params.revealHtml != null && String(params.revealHtml).trim() !== ''
      ? stripUnsafe(params.revealHtml)
      : esc(params.revealText || '');
    const color = /^#[0-9a-fA-F]{3,8}$/.test(String(params.color || '')) ? params.color : '#2dd4bf';

    const html =
      `<div class="pg-stage">${title}` +
      `<div class="pg-scr-frame" data-role="frame">` +
      `<div class="pg-scr-content" data-role="content">${revealInner}</div>` +
      `<canvas class="pg-scr-canvas" data-role="canvas" aria-hidden="true"></canvas>` +
      `<div class="pg-scr-hint" data-role="hint" aria-hidden="true">${coverLabel}</div>` +
      `</div>` +
      `<div class="pg-controls pg-scr-controls">` +
      `<button type="button" class="pg-scr-btn" data-role="revealall">Reveal all</button>` +
      `<span class="pg-readout pg-scr-readout" data-role="readout" aria-live="polite">Drag to scratch.</span>` +
      `</div></div>`;

    const css = [
      `#${domId} .pg-scr-title{font-weight:600;color:var(--ink,#e9eef8);margin:0 0 .8rem}`,
      `#${domId} .pg-scr-frame{position:relative;width:100%;min-height:120px;border:1px solid var(--line,#23304a);border-radius:12px;overflow:hidden;background:#04060c}`,
      `#${domId} .pg-scr-content{position:relative;z-index:1;display:flex;align-items:center;justify-content:center;text-align:center;` +
        `min-height:120px;padding:1.4rem 1.2rem;color:var(--cyan,#22d3ee);font-size:1.1rem;font-weight:600;line-height:1.5}`,
      `#${domId} .pg-scr-content strong{color:#fff}`,
      `#${domId} .pg-scr-canvas{position:absolute;inset:0;z-index:2;width:100%;height:100%;display:block;touch-action:none;cursor:crosshair}`,
      `#${domId} .pg-scr-hint{position:absolute;inset:0;z-index:3;display:flex;align-items:center;justify-content:center;text-align:center;` +
        `padding:1rem;color:#04060c;font-weight:700;letter-spacing:.03em;text-transform:uppercase;font-size:.95rem;pointer-events:none}`,
      `#${domId} .pg-scr-frame.is-clear .pg-scr-canvas,#${domId} .pg-scr-frame.is-clear .pg-scr-hint{display:none}`,
      `#${domId} .pg-scr-controls{display:flex;align-items:center;gap:.9rem;flex-wrap:wrap;margin-top:1rem}`,
      `#${domId} .pg-scr-btn{appearance:none;background:transparent;border:1px solid var(--line,#23304a);border-radius:8px;` +
        `padding:.5rem 1.1rem;min-height:44px;color:var(--ink-dim,#9fb3c8);font:inherit;cursor:pointer;transition:.2s}`,
      `#${domId} .pg-scr-btn:hover{border-color:var(--cyan,#22d3ee);color:var(--cyan,#22d3ee)}`,
      `#${domId} .pg-scr-btn:focus-visible{outline:2px solid #22d3ee;outline-offset:2px}`,
      `#${domId} .pg-scr-btn:disabled{opacity:.4;cursor:default}`,
      `#${domId} .pg-scr-readout{color:var(--ink-faint,#717d99)}`,
      // Reduced-motion / fallback: hide the cover entirely, show the content.
      `#${domId}.pg-scr-reveal .pg-scr-canvas,#${domId}.pg-scr-reveal .pg-scr-hint{display:none}`,
    ].join('\n');

    const jsBody = `
var COLOR=${JSON.stringify(color)};
var frame=$('[data-role=frame]'),content=$('[data-role=content]'),canvas=$('[data-role=canvas]'),hint=$('[data-role=hint]'),btn=$('[data-role=revealall]'),readout=$('[data-role=readout]');
if(!frame||!content||!canvas)return;
var ctx=canvas.getContext&&canvas.getContext('2d');
function done(msg){
  frame.classList.add('is-clear');
  if(btn)btn.disabled=true;
  if(readout)readout.textContent=msg||'Revealed.';
}
// Reduced-motion or no 2d context → just show the content revealed.
if(reduced||!ctx){root.classList.add('pg-scr-reveal');if(btn)btn.disabled=true;if(readout)readout.textContent='Revealed.';return;}
var dpr=Math.max(1,Math.min(3,window.devicePixelRatio||1));
var W=0,H=0,radius=22;
function paintCover(){
  var r=frame.getBoundingClientRect();
  W=Math.max(1,Math.round(r.width));H=Math.max(1,Math.round(r.height));
  canvas.width=W*dpr;canvas.height=H*dpr;
  canvas.style.width=W+'px';canvas.style.height=H+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.globalCompositeOperation='source-over';
  ctx.fillStyle=COLOR;ctx.fillRect(0,0,W,H);
  // faint diagonal sheen so it reads as a foil cover
  ctx.globalAlpha=0.12;ctx.fillStyle='#ffffff';
  for(var x=-H;x<W;x+=14){ctx.fillRect(x,0,5,H);}
  ctx.globalAlpha=1;
  radius=Math.max(16,Math.round(Math.min(W,H)*0.10));
}
paintCover();
var scratching=false,last=null,cleared=false;
function pos(e){var r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};}
function scratch(p){
  ctx.globalCompositeOperation='destination-out';
  ctx.lineWidth=radius*2;ctx.lineCap='round';ctx.lineJoin='round';
  if(last){ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);ctx.stroke();}
  ctx.beginPath();ctx.arc(p.x,p.y,radius,0,Math.PI*2);ctx.fill();
  last=p;
}
function pctCleared(){
  // sample on a coarse grid for cheapness; count fully-transparent pixels
  try{
    var step=Math.max(6,Math.round(Math.min(W,H)/24));
    var img=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    var cw=canvas.width,clear=0,tot=0;
    for(var y=0;y<canvas.height;y+=step){for(var x=0;x<cw;x+=step){tot++;if(img[(y*cw+x)*4+3]===0)clear++;}}
    return tot?clear/tot:0;
  }catch(err){return 0;}
}
function maybeAutoClear(){
  if(cleared)return;
  if(pctCleared()>0.6){cleared=true;done('Revealed.');}
}
function onDown(e){if(cleared)return;scratching=true;last=null;var p=pos(e);scratch(p);if(hint)hint.style.opacity='0';if(e.cancelable)e.preventDefault();if(canvas.setPointerCapture&&e.pointerId!=null){try{canvas.setPointerCapture(e.pointerId);}catch(_){}}}
function onMove(e){if(!scratching||cleared)return;scratch(pos(e));if(e.cancelable)e.preventDefault();}
function onUp(){if(!scratching)return;scratching=false;last=null;maybeAutoClear();}
canvas.addEventListener('pointerdown',onDown);
canvas.addEventListener('pointermove',onMove);
canvas.addEventListener('pointerup',onUp);
canvas.addEventListener('pointercancel',onUp);
canvas.addEventListener('pointerleave',onUp);
if(btn)btn.addEventListener('click',function(){cleared=true;done('Revealed.');});
var rt;
window.addEventListener('resize',function(){if(cleared)return;clearTimeout(rt);rt=setTimeout(paintCover,150);});
`;
    return { html, css, jsBody };
  },
};
