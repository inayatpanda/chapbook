import { esc } from './index.js';

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export default {
  id: 'colour-palette',
  name: 'Colour palette',
  category: 'art',
  description: 'A row of colour swatches pulled from a painting; tap one to see its name and hex.',
  paramsSchema: {
    type: 'object', additionalProperties: false, required: ['swatches'],
    properties: {
      title: { type: 'string' },
      caption: { type: 'string' },
      swatches: { type: 'array', minItems: 3, maxItems: 8, items: {
        type: 'object', additionalProperties: false, required: ['hex', 'name'],
        properties: { hex: { type: 'string' }, name: { type: 'string' } } } },
    },
  },
  presets: [
    { name: 'A Starry Night, in five colours', params: {
      title: 'A Starry Night, in five colours',
      swatches: [
        { hex: '#0b1d51', name: 'Night sky' },
        { hex: '#1b3b6f', name: 'Deep blue' },
        { hex: '#f2c14e', name: 'Star gold' },
        { hex: '#3a7ca5', name: 'Cypress teal' },
        { hex: '#0a0f1c', name: 'Village dark' },
      ],
      caption: 'Roughly — eyeballed, not spectrometer-accurate.',
    } },
    { name: 'Sunset over the sea', params: {
      title: 'Sunset over the sea',
      swatches: [
        { hex: '#f9a26c', name: 'Glow' },
        { hex: '#f76b8a', name: 'Coral' },
        { hex: '#5b3758', name: 'Dusk' },
        { hex: '#1b2a4a', name: 'Sea' },
      ],
    } },
  ],
  build(params, domId) {
    const swatches = (Array.isArray(params.swatches) ? params.swatches : [])
      .filter((s) => s && HEX.test(s.hex || ''))
      .slice(0, 8);
    const title = params.title ? `<div class="pg-cp-title">${esc(params.title)}</div>` : '';
    const caption = params.caption ? `<div class="pg-cp-caption">${esc(params.caption)}</div>` : '';
    const swatchesHtml = swatches.map((s, i) =>
      `<button type="button" class="pg-cp-swatch" data-role="swatch"` +
      ` data-hex="${esc(s.hex)}" data-name="${esc(s.name)}"` +
      ` style="background:${esc(s.hex)}" aria-pressed="${i === 0 ? 'true' : 'false'}">` +
      `<span class="pg-cp-sr">${esc(s.name)}</span></button>`).join('');
    const html =
      `<div class="pg-stage">${title}` +
      `<div class="pg-cp-row" role="group">${swatchesHtml}</div>` +
      `<div class="pg-readout pg-cp-readout" data-role="readout" aria-live="polite"></div>` +
      `${caption}</div>`;
    const css = [
      `#${domId} .pg-cp-title{font-weight:600;color:var(--ink,#e9eef8);margin-bottom:.7rem}`,
      `#${domId} .pg-cp-row{display:flex;flex-wrap:wrap;gap:.6rem}`,
      `#${domId} .pg-cp-swatch{flex:1 1 64px;min-width:56px;height:72px;border-radius:14px;border:1px solid rgba(255,255,255,.12);cursor:pointer;padding:0;outline:none;box-shadow:none;transition:outline-color .15s,box-shadow .15s,transform .15s}`,
      `#${domId} .pg-cp-swatch:hover{transform:translateY(-2px)}`,
      `#${domId} .pg-cp-swatch[aria-pressed=true]{outline:3px solid #22d3ee;outline-offset:3px;box-shadow:0 0 0 1px rgba(34,211,238,.35)}`,
      `#${domId} .pg-cp-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}`,
      `#${domId} .pg-cp-readout{margin-top:.9rem;font-weight:600;color:var(--ink,#e9eef8);min-height:1.4em}`,
      `#${domId} .pg-cp-readout .pg-cp-hex{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#22d3ee}`,
      `#${domId} .pg-cp-caption{margin-top:.6rem;font-size:.85rem;color:var(--ink-dim,#9aa6bd)}`,
    ].join('\n');
    const jsBody = `
var HEX=/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
var readout=$('[data-role=readout]');
var swatches=$$('[data-role=swatch]');
if(!readout||!swatches.length)return;
function select(btn){
  var hex=btn.getAttribute('data-hex')||'';
  if(!HEX.test(hex))return;
  swatches.forEach(function(s){s.setAttribute('aria-pressed',s===btn?'true':'false');});
  var name=btn.getAttribute('data-name')||'';
  readout.innerHTML=name.replace(/[&<>]/g,function(c){return c==='&'?'&amp;':c==='<'?'&lt;':'&gt;';})+
    ' — <span class="pg-cp-hex">'+hex.toUpperCase()+'</span>';
}
swatches.forEach(function(btn){
  btn.addEventListener('click',function(){select(btn);});
});
var first=swatches.find(function(s){return s.getAttribute('aria-pressed')==='true';})||swatches[0];
select(first);
`;
    return { html, css, jsBody };
  },
};
