/* Family: swipeable carousel — a horizontal track of cards. Swipe (pointer / touch
   drag), tap prev/next, tap a dot, or use the arrow keys to move between slides.
   Optional loop wraps past the ends. Each slide is {title?, text?, emoji?}, all
   author-supplied. Touch-first: the track has touch-action:pan-y so a horizontal
   drag swipes while a vertical drag still scrolls the page. Reduced-motion = the
   track jumps instantly (no slide transition). Self-contained: vanilla JS, no
   network / storage. */
import { esc } from './index.js';

const slideSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    title: { type: 'string', title: 'Slide heading' },
    text: { type: 'string', title: 'Slide body text' },
    emoji: { type: 'string', title: 'Optional emoji / single glyph shown large' },
  },
};

export default {
  id: 'swipe-carousel',
  name: 'Swipeable carousel',
  category: 'interactive',
  description: 'A swipeable carousel of cards with dots and prev/next — touch-swipe, tap, or arrow keys. For step-throughs, tips, and before/after-of-the-week sets.',
  paramsSchema: {
    type: 'object', additionalProperties: false,
    required: ['slides'],
    properties: {
      title: { type: 'string', title: 'Optional label above the carousel' },
      slides: { type: 'array', minItems: 1, maxItems: 12, title: 'The cards', items: slideSchema },
      loop: { type: 'boolean', default: false, title: 'Wrap past the first / last slide' },
    },
  },
  presets: [
    {
      name: 'Three quick tips',
      params: {
        title: 'Swipe through the three checks',
        loop: false,
        slides: [
          { emoji: '🤚', title: 'Look', text: 'Inspect for deformity, swelling and the position the limb is held in before you touch it.' },
          { emoji: '👆', title: 'Feel', text: 'Palpate bony landmarks and the joint line; note the point of maximal tenderness.' },
          { emoji: '🔄', title: 'Move', text: 'Active first, then passive — and always check the joint above and below.' },
        ],
      },
    },
    {
      name: 'Card set (looping)',
      params: {
        title: 'A small looping set',
        loop: true,
        slides: [
          { title: 'One', text: 'The first card. Swipe left to continue.' },
          { title: 'Two', text: 'The middle card.' },
          { title: 'Three', text: 'The last card — loops back to the first.' },
        ],
      },
    },
  ],
  build(params, domId) {
    const slides = (Array.isArray(params.slides) ? params.slides : []).slice(0, 12);
    const n = slides.length;
    const loop = !!params.loop;
    const title = params.title ? `<div class="pg-car-title">${esc(params.title)}</div>` : '';

    let cards = '';
    slides.forEach((s, i) => {
      const emoji = s && s.emoji ? `<div class="pg-car-emoji" aria-hidden="true">${esc(s.emoji)}</div>` : '';
      const head = s && s.title ? `<div class="pg-car-h">${esc(s.title)}</div>` : '';
      const body = s && s.text ? `<div class="pg-car-t">${esc(s.text)}</div>` : '';
      cards +=
        `<div class="pg-car-card" data-role="card" role="group" aria-roledescription="slide" aria-label="Slide ${i + 1} of ${n}">` +
        `${emoji}${head}${body}</div>`;
    });

    let dots = '';
    for (let i = 0; i < n; i++) {
      dots += `<button type="button" class="pg-car-dot" data-role="dot" data-idx="${i}" aria-label="Go to slide ${i + 1}"></button>`;
    }

    const html =
      `<div class="pg-stage">${title}` +
      `<div class="pg-car-viewport" data-role="viewport" aria-roledescription="carousel" tabindex="0" aria-label="Swipeable carousel; use the arrow keys">` +
      `<div class="pg-car-track" data-role="track">${cards}</div>` +
      `</div>` +
      `<div class="pg-controls pg-car-controls">` +
      `<button type="button" class="pg-car-nav" data-role="prev" aria-label="Previous slide">‹</button>` +
      `<div class="pg-car-dots" data-role="dots" role="tablist" aria-label="Slides">${dots}</div>` +
      `<button type="button" class="pg-car-nav" data-role="next" aria-label="Next slide">›</button>` +
      `</div>` +
      `<div class="pg-readout pg-car-readout" data-role="readout" aria-live="polite">Slide <b data-role="idx">1</b> of <b>${n}</b></div>` +
      `</div>`;

    const css = [
      `#${domId} .pg-car-title{font-weight:600;color:var(--ink,#e9eef8);margin:0 0 .8rem}`,
      `#${domId} .pg-car-viewport{position:relative;overflow:hidden;border:1px solid var(--line,#23304a);border-radius:12px;` +
        `background:#04060c;touch-action:pan-y;cursor:grab;user-select:none}`,
      `#${domId} .pg-car-viewport:focus-visible{outline:2px solid #22d3ee;outline-offset:2px}`,
      `#${domId} .pg-car-viewport.is-grabbing{cursor:grabbing}`,
      `#${domId} .pg-car-track{display:flex;will-change:transform;transition:transform .35s cubic-bezier(.2,.7,.2,1)}`,
      `#${domId} .pg-car-card{flex:0 0 100%;box-sizing:border-box;min-width:100%;padding:1.6rem 1.4rem;text-align:center;min-height:140px;` +
        `display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.55rem}`,
      `#${domId} .pg-car-emoji{font-size:2.4rem;line-height:1}`,
      `#${domId} .pg-car-h{color:#fff;font-weight:700;font-size:1.15rem}`,
      `#${domId} .pg-car-t{color:var(--ink-dim,#cdd6e6);line-height:1.55;max-width:46ch}`,
      `#${domId} .pg-car-controls{display:flex;align-items:center;justify-content:center;gap:1rem;margin-top:1rem}`,
      `#${domId} .pg-car-nav{appearance:none;flex:0 0 auto;width:44px;height:44px;border-radius:50%;border:1px solid var(--line,#23304a);` +
        `background:transparent;color:var(--ink-dim,#9fb3c8);font-size:1.4rem;line-height:1;cursor:pointer;transition:.2s}`,
      `#${domId} .pg-car-nav:hover{border-color:var(--cyan,#22d3ee);color:var(--cyan,#22d3ee)}`,
      `#${domId} .pg-car-nav:focus-visible{outline:2px solid #22d3ee;outline-offset:2px}`,
      `#${domId} .pg-car-nav:disabled{opacity:.3;cursor:default}`,
      `#${domId} .pg-car-dots{display:flex;align-items:center;gap:.5rem}`,
      `#${domId} .pg-car-dot{appearance:none;width:10px;height:10px;padding:0;border-radius:50%;border:0;background:#3a4660;cursor:pointer;transition:.2s}`,
      `#${domId} .pg-car-dot:hover{background:#5a6a88}`,
      `#${domId} .pg-car-dot:focus-visible{outline:2px solid #22d3ee;outline-offset:2px}`,
      `#${domId} .pg-car-dot.is-active{background:var(--cyan,#22d3ee);transform:scale(1.25)}`,
      `#${domId} .pg-car-readout{text-align:center;margin-top:.7rem;color:var(--ink-faint,#717d99)}`,
      `#${domId} .pg-car-readout b{color:#fff}`,
      `#${domId}.pg-car-reduce .pg-car-track{transition:none}`,
    ].join('\n');

    const jsBody = `
var N=${n},LOOP=${loop ? 'true' : 'false'};
if(N<=0)return;
if(reduced)root.classList.add('pg-car-reduce');
var viewport=$('[data-role=viewport]'),track=$('[data-role=track]');
var prev=$('[data-role=prev]'),next=$('[data-role=next]'),dots=$$('[data-role=dot]');
var idxOut=$('[data-role=idx]');
if(!viewport||!track)return;
var cur=0;
function clampIdx(i){
  if(LOOP)return (i%N+N)%N;
  return i<0?0:(i>N-1?N-1:i);
}
function render(animate){
  if(animate===false){var t=track.style.transition;track.style.transition='none';}
  track.style.transform='translateX('+(-cur*100)+'%)';
  if(animate===false){void track.offsetWidth;track.style.transition=t||'';}
  dots.forEach(function(d,i){d.classList.toggle('is-active',i===cur);d.setAttribute('aria-selected',i===cur?'true':'false');});
  if(idxOut)idxOut.textContent=String(cur+1);
  if(prev)prev.disabled=(!LOOP&&cur<=0);
  if(next)next.disabled=(!LOOP&&cur>=N-1);
}
function go(i,animate){cur=clampIdx(i);render(animate);}
if(prev)prev.addEventListener('click',function(){go(cur-1);});
if(next)next.addEventListener('click',function(){go(cur+1);});
dots.forEach(function(d){d.addEventListener('click',function(){go(parseInt(d.getAttribute('data-idx'),10)||0);});});
viewport.addEventListener('keydown',function(e){
  if(e.key==='ArrowRight'){e.preventDefault();go(cur+1);}
  else if(e.key==='ArrowLeft'){e.preventDefault();go(cur-1);}
  else if(e.key==='Home'){e.preventDefault();go(0);}
  else if(e.key==='End'){e.preventDefault();go(N-1);}
});
// Pointer-drag swipe. Horizontal drag swipes; we follow the finger then snap.
var dragging=false,startX=0,startY=0,dx=0,width=1,decided=false,horiz=false;
function onDown(e){
  dragging=true;decided=false;horiz=false;dx=0;
  startX=e.clientX;startY=e.clientY;
  width=viewport.getBoundingClientRect().width||1;
  viewport.classList.add('is-grabbing');
  if(viewport.setPointerCapture&&e.pointerId!=null){try{viewport.setPointerCapture(e.pointerId);}catch(_){}}
}
function onMove(e){
  if(!dragging)return;
  var mx=e.clientX-startX,my=e.clientY-startY;
  if(!decided){
    if(Math.abs(mx)<6&&Math.abs(my)<6)return;
    decided=true;horiz=Math.abs(mx)>Math.abs(my);
  }
  if(!horiz)return; // a vertical gesture → let the page scroll
  if(e.cancelable)e.preventDefault();
  dx=mx;
  var pct=(dx/width)*100;
  // resist dragging past the ends when not looping
  if(!LOOP&&((cur===0&&dx>0)||(cur===N-1&&dx<0)))pct*=0.35;
  var t=track.style.transition;track.style.transition='none';
  track.style.transform='translateX('+(-cur*100+pct)+'%)';
  track.style.transition=t||'';
}
function onUp(){
  if(!dragging)return;
  dragging=false;viewport.classList.remove('is-grabbing');
  if(horiz&&Math.abs(dx)>width*0.18){go(dx<0?cur+1:cur-1);}
  else{render();}
  dx=0;
}
viewport.addEventListener('pointerdown',onDown);
viewport.addEventListener('pointermove',onMove);
viewport.addEventListener('pointerup',onUp);
viewport.addEventListener('pointercancel',onUp);
window.addEventListener('resize',function(){render(false);});
render(false);
`;
    return { html, css, jsBody };
  },
};
