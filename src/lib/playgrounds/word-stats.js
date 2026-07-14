import { esc } from './index.js';

export default {
  id: 'word-stats',
  name: 'Word counter',
  category: 'tool',
  description: 'Type or paste text to get live word, character and sentence counts plus a reading and speaking time.',
  paramsSchema: {
    type: 'object', additionalProperties: false, required: [],
    properties: {
      title: { type: 'string' },
      placeholder: { type: 'string', default: 'Type or paste anything…' },
      wpm: { type: 'number', default: 200, minimum: 50, maximum: 1000 },
    },
  },
  presets: [
    { name: 'How long is your speech?', params: { title: 'How long is your speech?', placeholder: 'Paste your speech here…', wpm: 130 } },
    { name: 'Tweet length check', params: { title: 'Tweet length check', placeholder: 'Draft your post here…', wpm: 200 } },
  ],
  build(params, domId) {
    const clamp = (v, lo, hi, d) => {
      const n = Number(v);
      return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
    };
    const wpm = Math.round(clamp(params.wpm, 50, 1000, 200));
    const placeholder = typeof params.placeholder === 'string' && params.placeholder
      ? params.placeholder.slice(0, 120) : 'Type or paste anything…';
    const title = params.title ? `<div class="pg-ws-title">${esc(params.title)}</div>` : '';

    const html =
      `<div class="pg-stage">${title}` +
      `<textarea class="pg-ws-input" data-role="in" rows="5" placeholder="${esc(placeholder)}"></textarea>` +
      `<div class="pg-readout pg-ws-cells">` +
        `<div class="pg-ws-cell"><b data-role="words">0</b><span>Words</span></div>` +
        `<div class="pg-ws-cell"><b data-role="chars">0</b><span>Characters</span></div>` +
        `<div class="pg-ws-cell"><b data-role="sentences">0</b><span>Sentences</span></div>` +
        `<div class="pg-ws-cell"><b data-role="reading">&lt;1 min</b><span>Reading time</span></div>` +
        `<div class="pg-ws-cell"><b data-role="speaking">&lt;1 min</b><span>Speaking time</span></div>` +
      `</div>` +
      `</div>`;

    const css = [
      `#${domId} .pg-ws-title{font-weight:600;color:#e9eef8;margin-bottom:.8rem}`,
      `#${domId} .pg-ws-input{display:block;width:100%;box-sizing:border-box;min-height:6.5rem;resize:vertical;padding:.7rem .8rem;margin-bottom:1rem;border-radius:12px;border:1px solid #23304a;background:rgba(140,160,200,.06);color:#e9eef8;font:inherit;line-height:1.5}`,
      `#${domId} .pg-ws-input::placeholder{color:#7e8aa3}`,
      `#${domId} .pg-ws-input:focus{outline:none;border-color:#22d3ee;box-shadow:0 0 0 3px rgba(34,211,238,.18)}`,
      `#${domId} .pg-ws-cells{display:grid;grid-template-columns:repeat(2,1fr);gap:.6rem;padding:.9rem 1rem;border-radius:12px;border:1px solid #23304a;background:rgba(140,160,200,.06)}`,
      `@media(min-width:560px){#${domId} .pg-ws-cells{grid-template-columns:repeat(5,1fr)}}`,
      `#${domId} .pg-ws-cell{display:flex;flex-direction:column;gap:.15rem;text-align:center}`,
      `#${domId} .pg-ws-cell b{color:#22d3ee;font-size:1.3rem;font-weight:700;font-variant-numeric:tabular-nums;line-height:1.1}`,
      `#${domId} .pg-ws-cell:nth-child(4) b{color:#2dd4bf}`,
      `#${domId} .pg-ws-cell:nth-child(5) b{color:#818cf8}`,
      `#${domId} .pg-ws-cell span{color:#cdd6e6;font-size:.78rem}`,
    ].join('\n');

    const jsBody = `
var inEl = $('[data-role=in]');
if(!inEl) return;
var wpm = Number(CONFIG.wpm);
if(!isFinite(wpm) || wpm <= 0) wpm = 200;
var wordsEl = $('[data-role=words]'), charsEl = $('[data-role=chars]'), sentencesEl = $('[data-role=sentences]');
var readingEl = $('[data-role=reading]'), speakingEl = $('[data-role=speaking]');
function fmtMin(words, rate){
  if(rate <= 0 || words <= 0) return '<1 min';
  var m = Math.ceil(words / rate);
  if(m <= 0) return '<1 min';
  return m + ' min';
}
function recompute(){
  var text = inEl.value || '';
  var trimmed = text.trim();
  var words = trimmed ? trimmed.split(/\\s+/).filter(function(w){ return w.length > 0; }).length : 0;
  var chars = text.length;
  var sentenceMatches = text.match(/[.!?]+/g);
  var sentences = sentenceMatches ? sentenceMatches.length : 0;
  if(wordsEl) wordsEl.textContent = String(words);
  if(charsEl) charsEl.textContent = String(chars);
  if(sentencesEl) sentencesEl.textContent = String(sentences);
  if(readingEl) readingEl.textContent = fmtMin(words, wpm);
  if(speakingEl) speakingEl.textContent = fmtMin(words, 130);
}
inEl.addEventListener('input', recompute);
recompute();
`;

    return { html, css, jsBody };
  },
};
