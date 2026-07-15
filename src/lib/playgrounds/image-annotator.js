/* Family: image-annotator — numbered pins over an author-supplied image; tapping
   a pin reveals its caption in a panel below, with an "explored k of n" tally.
   No image URL → a neutral placeholder stage so the layout still reads. Pins are
   real <button>s (keyboard + touch); reduced-motion drops the pulse animation. */
import { esc } from './index.js';

export default {
  id: 'image-annotator',
  name: 'Image annotator',
  category: 'Diagram',
  description: 'Numbered pins over an image — tap a pin to reveal its caption. For anatomy, kit photos, maps and annotated screenshots.',
  paramsSchema: {
    type: 'object', additionalProperties: false,
    required: ['pins'],
    properties: {
      image: { type: 'string', title: 'Image URL (e.g. /images/posts/<slug>/photo.jpg)' },
      alt: { type: 'string', title: 'Alt text for the image' },
      pins: {
        type: 'array', minItems: 1, maxItems: 12, title: 'The pins',
        items: {
          type: 'object', additionalProperties: false, required: ['label'],
          properties: {
            x: { type: 'number', minimum: 0, maximum: 100, default: 50, title: 'X position (% from left)' },
            y: { type: 'number', minimum: 0, maximum: 100, default: 50, title: 'Y position (% from top)' },
            label: { type: 'string', title: 'Name (shown bold in the panel)' },
            note: { type: 'string', title: 'One-line note revealed with it' },
          },
        },
      },
      prompt: { type: 'string', default: 'Tap a pin to explore.', title: 'Prompt shown before the first tap' },
    },
  },
  presets: [
    {
      name: 'Parts of a guitar',
      params: {
        alt: 'Diagram stage',
        pins: [
          { x: 30, y: 25, label: 'Headstock', note: 'Holds the tuning pegs that set the pitch of each string.' },
          { x: 55, y: 45, label: 'Soundhole', note: 'The opening that lets the body project the sound.' },
          { x: 70, y: 70, label: 'Bridge', note: 'Anchors the strings and passes their vibration into the top.' },
        ],
        prompt: 'Tap a pin to explore the parts.',
      },
    },
    {
      name: 'Annotated photo',
      params: {
        image: '/images/posts/my-post/photo.jpg',
        alt: 'A photo with points of interest',
        pins: [
          { x: 25, y: 30, label: 'First thing', note: 'What to notice here.' },
          { x: 65, y: 60, label: 'Second thing', note: 'And why this matters.' },
        ],
      },
    },
  ],
  build(params, domId) {
    const pins = (Array.isArray(params.pins) ? params.pins : []).slice(0, 12)
      .map((p) => ({
        x: Math.min(100, Math.max(0, Number(p && p.x) || 50)),
        y: Math.min(100, Math.max(0, Number(p && p.y) || 50)),
        label: String((p && p.label) || ''), note: String((p && p.note) || ''),
      }))
      .filter((p) => p.label !== '');
    const img = params.image
      ? `<img class="pg-anno-img" src="${esc(params.image)}" alt="${esc(params.alt || '')}" loading="lazy">`
      : '';
    let pinHtml = '';
    pins.forEach((p, i) => {
      pinHtml += `<button type="button" class="pg-anno-pin" data-role="pin" data-idx="${i}"` +
        ` style="left:${p.x}%;top:${p.y}%" aria-label="${esc(p.label)}">${i + 1}</button>`;
    });
    const html =
      `<div class="pg-stage">` +
      `<div class="pg-anno-stage${params.image ? '' : ' is-blank'}" data-role="stage">${img}${pinHtml}</div>` +
      `<div class="pg-anno-panel" data-role="panel" aria-live="polite">${esc(params.prompt || 'Tap a pin to explore.')}</div>` +
      `<div class="pg-readout pg-anno-tally" data-role="tally"></div>` +
      `</div>`;
    const css = [
      `#${domId} .pg-anno-stage{position:relative;border-radius:10px;overflow:hidden;border:1px solid var(--line,#23304a)}`,
      `#${domId} .pg-anno-stage.is-blank{min-height:220px;background:` +
        `linear-gradient(rgba(140,160,200,.06),rgba(140,160,200,.02)),` +
        `repeating-linear-gradient(0deg,transparent 0 23px,rgba(140,160,200,.08) 23px 24px),` +
        `repeating-linear-gradient(90deg,transparent 0 23px,rgba(140,160,200,.08) 23px 24px)}`,
      `#${domId} .pg-anno-img{display:block;width:100%;height:auto}`,
      `#${domId} .pg-anno-pin{position:absolute;transform:translate(-50%,-50%);width:30px;height:30px;border-radius:50%;` +
        `border:2px solid #22d3ee;background:rgba(4,6,12,.78);color:#22d3ee;font:700 .82rem system-ui;cursor:pointer;` +
        `display:flex;align-items:center;justify-content:center;transition:background .15s,color .15s}`,
      `#${domId} .pg-anno-pin:hover{background:rgba(34,211,238,.25);color:#fff}`,
      `#${domId} .pg-anno-pin:focus-visible{outline:2px solid #22d3ee;outline-offset:2px}`,
      `#${domId} .pg-anno-pin.is-on{background:#22d3ee;color:#04060c}`,
      `#${domId} .pg-anno-pin.is-seen:not(.is-on){border-color:#2dd4bf;color:#2dd4bf}`,
      `#${domId}:not(.pg-anno-reduce) .pg-anno-pin.is-on{animation:${domId}-pulse 1.6s ease-out 1}`,
      `@keyframes ${domId}-pulse{0%{box-shadow:0 0 0 0 rgba(34,211,238,.5)}100%{box-shadow:0 0 0 14px rgba(34,211,238,0)}}`,
      `#${domId} .pg-anno-panel{margin-top:.75rem;min-height:2.6em;padding:.7rem .85rem;border:1px solid var(--line,#23304a);` +
        `border-radius:10px;background:rgba(140,160,200,.05);color:var(--ink-dim,#cdd6e6);line-height:1.5}`,
      `#${domId} .pg-anno-panel b{color:#fff}`,
      `#${domId} .pg-anno-tally{margin-top:.5rem;font-size:.82rem;color:var(--ink-faint,#717d99)}`,
    ].join('\n');
    const jsBody = `
var PINS=(CONFIG.pins||[]).map(function(p){return {label:String((p&&p.label)||''),note:String((p&&p.note)||'')};}).filter(function(p){return p.label!=='';});
if(reduced)root.classList.add('pg-anno-reduce');
var pins=$$('[data-role=pin]');
var panel=$('[data-role=panel]');
var tally=$('[data-role=tally]');
if(!pins.length||!panel)return;
var seen={};
function tallyText(){
  var n=0;for(var k in seen)n++;
  if(tally)tally.textContent=n+' of '+PINS.length+' explored'+(n===PINS.length?' — all found.':'');
}
pins.forEach(function(btn){
  btn.addEventListener('click',function(){
    var i=parseInt(btn.getAttribute('data-idx'),10)||0;
    pins.forEach(function(x){x.classList.remove('is-on');});
    btn.classList.add('is-on');btn.classList.add('is-seen');
    seen[i]=1;
    var p=PINS[i]||{};
    panel.innerHTML='<b>'+p.label.replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</b>'+(p.note?' — '+p.note.replace(/&/g,'&amp;').replace(/</g,'&lt;'):'');
    tallyText();
  });
});
tallyText();
`;
    return { html, css, jsBody };
  },
};
