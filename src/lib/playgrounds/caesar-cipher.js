import { esc } from './index.js';

export default {
  id: 'caesar-cipher',
  name: 'Caesar cipher',
  category: 'language',
  description: 'Shift the alphabet to encode or decode a message — slide the dial and watch the text change.',
  paramsSchema: {
    type: 'object', additionalProperties: false, required: [],
    properties: {
      title: { type: 'string' },
      text: { type: 'string', default: '' },
      shift: { type: 'number', default: 3, minimum: 0, maximum: 25 },
      caption: { type: 'string' },
    },
  },
  presets: [
    { name: "Shift by three (Caesar's own)", params: { text: 'Veni vidi vici', shift: 3 } },
    { name: 'Crack the code', params: { text: 'Khoor zruog', shift: 3, caption: 'Slide the shift until it reads straight.' } },
  ],
  build(params, domId) {
    const text = typeof params.text === 'string' ? params.text : '';
    const shift = Math.max(0, Math.min(25, Math.round(Number(params.shift) || 0)));
    const title = params.title ? `<div class="pg-cc-title">${esc(params.title)}</div>` : '';
    const caption = params.caption ? `<div class="pg-cc-caption">${esc(params.caption)}</div>` : '';

    const html = `<div class="pg-stage">${title}` +
      `<div class="pg-controls">` +
      `<div class="pg-field pg-cc-textfield"><label><b>Message</b></label>` +
      `<input type="text" data-role="text" value="${esc(text)}" placeholder="Type a message…" autocomplete="off" spellcheck="false"></div>` +
      `<div class="pg-row pg-cc-shiftrow"><label><b>Shift</b></label>` +
      `<input type="range" data-role="shift" min="0" max="25" step="1" value="${shift}">` +
      `<span class="pg-readout" data-role="shiftval">${shift}</span></div>` +
      `</div>` +
      `<div class="pg-cc-out"><label><b>Output</b></label>` +
      `<output class="pg-readout pg-cc-result" data-role="out" aria-live="polite"></output></div>` +
      `<div class="pg-cc-hint">Decode by shifting <span data-role="dec">${(26 - shift) % 26}</span> the other way.</div>` +
      caption +
      `</div>`;

    const css = [
      `#${domId} .pg-cc-title{font-weight:700;margin-bottom:.6rem;color:#e9eef8}`,
      `#${domId} .pg-controls{display:flex;flex-direction:column;gap:.7rem}`,
      `#${domId} .pg-cc-textfield label,#${domId} .pg-cc-shiftrow label,#${domId} .pg-cc-out label{display:block;margin-bottom:.3rem;color:#cdd6e6;font-size:.9rem}`,
      `#${domId} input[type=text]{width:100%;box-sizing:border-box;padding:.55rem .7rem;border-radius:10px;border:1px solid #23304a;background:rgba(140,160,200,.06);color:#e9eef8;font:inherit}`,
      `#${domId} input[type=text]:focus{outline:none;border-color:#22d3ee}`,
      `#${domId} .pg-cc-shiftrow{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap}`,
      `#${domId} .pg-cc-shiftrow label{margin:0;flex:0 0 auto}`,
      `#${domId} input[type=range]{flex:1 1 140px;accent-color:#2dd4bf;min-width:120px}`,
      `#${domId} .pg-readout{font-variant-numeric:tabular-nums;color:#2dd4bf;font-weight:700}`,
      `#${domId} .pg-cc-shiftrow .pg-readout{min-width:2ch;text-align:right}`,
      `#${domId} .pg-cc-out{margin-top:.8rem}`,
      `#${domId} .pg-cc-result{display:block;width:100%;box-sizing:border-box;padding:.6rem .7rem;border-radius:10px;border:1px solid #23304a;background:rgba(34,211,238,.06);color:#22d3ee;font-family:ui-monospace,Menlo,Consolas,monospace;font-weight:600;min-height:1.4em;white-space:pre-wrap;word-break:break-word}`,
      `#${domId} .pg-cc-hint{margin-top:.6rem;font-size:.85rem;color:#9fb0c8}`,
      `#${domId} .pg-cc-hint span{color:#fbbf24;font-weight:700}`,
      `#${domId} .pg-cc-caption{margin-top:.5rem;font-size:.85rem;color:#cdd6e6;font-style:italic}`,
    ].join('\n');

    const jsBody = `
var input=$('[data-role=text]');
var slider=$('[data-role=shift]');
var shiftVal=$('[data-role=shiftval]');
var out=$('[data-role=out]');
var dec=$('[data-role=dec]');
if(!input||!slider||!out)return;
function shiftChar(ch,n){
  var c=ch.charCodeAt(0);
  if(c>=65&&c<=90)return String.fromCharCode((c-65+n)%26+65);
  if(c>=97&&c<=122)return String.fromCharCode((c-97+n)%26+97);
  return ch;
}
function render(){
  var n=((parseInt(slider.value,10)||0)%26+26)%26;
  if(shiftVal)shiftVal.textContent=n;
  if(dec)dec.textContent=(26-n)%26;
  var src=input.value;
  var res='';
  for(var i=0;i<src.length;i++)res+=shiftChar(src.charAt(i),n);
  out.textContent=res;
}
input.addEventListener('input',render);
slider.addEventListener('input',render);
render();
`;

    return { html, css, jsBody };
  },
};
