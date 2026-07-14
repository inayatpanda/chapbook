import { esc } from './index.js';

export default {
  id: 'keyboard-notes',
  name: 'Piano keys',
  category: 'music',
  description: 'A one-octave keyboard that highlights a chord or scale; tap keys to explore (no sound).',
  paramsSchema: {
    type: 'object', additionalProperties: false, required: ['highlight'],
    properties: {
      title: { type: 'string' },
      highlight: { type: 'array', maxItems: 12, items: { type: 'string' } },
      label: { type: 'string' },
      caption: { type: 'string' },
    },
  },
  presets: [
    { name: 'A C major chord', params: { title: 'A C major chord', highlight: ['C', 'E', 'G'], label: 'C major', caption: 'Three notes, one happy chord. Tap any key to add your own.' } },
    { name: 'The C major scale', params: { title: 'The C major scale', highlight: ['C', 'D', 'E', 'F', 'G', 'A', 'B'], label: 'C major scale', caption: 'All the white keys, no sharps or flats — the friendly scale.' } },
  ],
  build(params, domId) {
    // The seven white keys, left to right.
    const WHITES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    // Black keys sit after these white-key indices (0=C, 1=D, 3=F, 4=G, 5=A).
    const BLACKS = [
      { note: 'C#', after: 0 },
      { note: 'D#', after: 1 },
      { note: 'F#', after: 3 },
      { note: 'G#', after: 4 },
      { note: 'A#', after: 5 },
    ];

    // Normalise param highlight list into a clean set of note names we know about.
    const known = new Set([...WHITES, ...BLACKS.map((b) => b.note)]);
    const norm = (s) => String(s == null ? '' : s).trim().toUpperCase().replace('♯', '#');
    const highlight = (Array.isArray(params.highlight) ? params.highlight : [])
      .map(norm).filter((n) => known.has(n));
    const hiSet = new Set(highlight);

    const title = params.title ? `<div class="pg-kb-title">${esc(params.title)}</div>` : '';
    const label = params.label
      ? `<span class="pg-kb-label" data-role="label">${esc(params.label)}</span>` : '';
    const caption = params.caption ? `<div class="pg-kb-caption">${esc(params.caption)}</div>` : '';

    // White keys: equal-width flex children. Black keys: absolutely positioned overlays.
    const whiteHtml = WHITES.map((n) =>
      `<button type="button" class="pg-kb-key pg-kb-white${hiSet.has(n) ? ' on' : ''}" ` +
      `data-role="key" data-note="${esc(n)}" aria-pressed="${hiSet.has(n) ? 'true' : 'false'}">` +
      `<span class="pg-kb-name">${esc(n)}</span></button>`).join('');

    // Each black key is centred over the gap between two white keys.
    // Position = (after+1) / 7 of the keyboard width, then nudged left by half its own width.
    const blackHtml = BLACKS.map((b) => {
      const left = ((b.after + 1) / WHITES.length) * 100;
      return `<button type="button" class="pg-kb-key pg-kb-black${hiSet.has(b.note) ? ' on' : ''}" ` +
        `data-role="key" data-note="${esc(b.note)}" aria-pressed="${hiSet.has(b.note) ? 'true' : 'false'}" ` +
        `style="left:${left.toFixed(4)}%"><span class="pg-kb-name">${esc(b.note)}</span></button>`;
    }).join('');

    const html =
      `<div class="pg-stage">` +
      title +
      `<div class="pg-kb-readout"><span class="pg-kb-tag">Highlighted</span>` +
      label +
      `<span class="pg-kb-list" data-role="list">—</span></div>` +
      `<div class="pg-kb-board" data-role="board">` +
      `<div class="pg-kb-whites">${whiteHtml}</div>` +
      `<div class="pg-kb-blacks">${blackHtml}</div>` +
      `</div>` +
      caption +
      `</div>`;

    const css = [
      `#${domId} .pg-kb-title{font-weight:600;color:var(--ink,#e9eef8);margin-bottom:.5rem}`,
      `#${domId} .pg-kb-readout{display:flex;flex-wrap:wrap;align-items:center;gap:.45rem;margin-bottom:.7rem;font-size:.92rem}`,
      `#${domId} .pg-kb-tag{color:var(--ink-dim,#9fb0c8);text-transform:uppercase;letter-spacing:.05em;font-size:.72rem}`,
      `#${domId} .pg-kb-label{padding:.1rem .5rem;border-radius:999px;border:1px solid #2dd4bf66;background:rgba(45,212,191,.12);color:#2dd4bf;font-weight:600}`,
      `#${domId} .pg-kb-list{color:var(--ink,#e9eef8);font-weight:600;font-variant-numeric:tabular-nums}`,
      `#${domId} .pg-kb-board{position:relative;width:100%;max-width:520px;aspect-ratio:7 / 4;user-select:none}`,
      `#${domId} .pg-kb-whites{display:flex;height:100%;gap:0}`,
      `#${domId} .pg-kb-blacks{position:absolute;inset:0;pointer-events:none}`,
      `#${domId} .pg-kb-key{font:inherit;cursor:pointer;padding:0;display:flex;align-items:flex-end;justify-content:center;transition:background .12s,box-shadow .12s,color .12s}`,
      `#${domId} .pg-kb-white{flex:1 1 0;height:100%;border:1px solid #23304a;border-radius:0 0 6px 6px;background:#f3f6fb;color:#1a2436}`,
      `#${domId} .pg-kb-white+.pg-kb-white{border-left:0}`,
      `#${domId} .pg-kb-white:first-child{border-radius:0 0 6px 6px}`,
      `#${domId} .pg-kb-white .pg-kb-name{padding-bottom:.45rem;font-size:.78rem;font-weight:600;opacity:.55}`,
      `#${domId} .pg-kb-black{position:absolute;top:0;width:9%;height:62%;transform:translateX(-50%);border:1px solid #000;border-radius:0 0 5px 5px;background:#10151f;color:#cdd6e6;pointer-events:auto;box-shadow:0 2px 4px rgba(0,0,0,.5);z-index:2}`,
      `#${domId} .pg-kb-black .pg-kb-name{padding-bottom:.3rem;font-size:.62rem;font-weight:600;opacity:.5}`,
      `#${domId} .pg-kb-white.on{background:#22d3ee;color:#04060c;box-shadow:inset 0 0 0 2px #22d3ee}`,
      `#${domId} .pg-kb-black.on{background:#818cf8;color:#04060c}`,
      `#${domId} .pg-kb-white.on .pg-kb-name,#${domId} .pg-kb-black.on .pg-kb-name{opacity:.9}`,
      `#${domId} .pg-kb-key:focus-visible{outline:2px solid #fbbf24;outline-offset:1px}`,
      `#${domId} .pg-kb-caption{margin-top:.6rem;color:var(--ink-dim,#9fb0c8);font-size:.88rem}`,
    ].join('\n');

    const jsBody = `
var list=$('[data-role=list]');
function refresh(){
  if(!list)return;
  var on=[];
  $$('[data-role=key].on').forEach(function(k){on.push(k.getAttribute('data-note'));});
  list.textContent=on.length?on.join('  ·  '):'none — tap a key';
}
$$('[data-role=key]').forEach(function(key){
  key.addEventListener('click',function(){
    var on=key.classList.toggle('on');
    key.setAttribute('aria-pressed',on?'true':'false');
    refresh();
  });
});
refresh();
`;

    return { html, css, jsBody };
  },
};
