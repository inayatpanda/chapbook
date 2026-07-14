import { esc } from './index.js';

export default {
  id: 'chord-diagram',
  name: 'Chord shapes',
  category: 'music',
  description: 'Tap a chord to see where your fingers go on a guitar fretboard.',
  paramsSchema: {
    type: 'object', additionalProperties: false, required: ['chords'],
    properties: {
      title: { type: 'string' },
      caption: { type: 'string' },
      chords: { type: 'array', minItems: 2, maxItems: 10, items: {
        type: 'object', additionalProperties: false, required: ['name', 'frets'],
        properties: {
          name: { type: 'string' },
          frets: { type: 'array', minItems: 6, maxItems: 6, items: { type: 'number' } },
        } } },
    },
  },
  presets: [
    { name: 'First chords to learn', params: { title: 'First chords to learn', chords: [
      { name: 'C', frets: [-1, 3, 2, 0, 1, 0] },
      { name: 'G', frets: [3, 2, 0, 0, 0, 3] },
      { name: 'D', frets: [-1, -1, 0, 2, 3, 2] },
      { name: 'Em', frets: [0, 2, 2, 0, 0, 0] },
      { name: 'Am', frets: [-1, 0, 2, 2, 1, 0] },
    ], caption: 'Six strings, low E on the left.' } },
    { name: 'Three-chord songs', params: { title: 'Three chords, a thousand songs', chords: [
      { name: 'G', frets: [3, 2, 0, 0, 0, 3] },
      { name: 'C', frets: [-1, 3, 2, 0, 1, 0] },
      { name: 'D', frets: [-1, -1, 0, 2, 3, 2] },
    ], caption: 'G, C and D will get you through most campfires.' } },
  ],
  build(params, domId) {
    const raw = Array.isArray(params.chords) ? params.chords.slice(0, 10) : [];
    const chords = raw
      .map((c) => {
        const frets = (Array.isArray(c.frets) ? c.frets : [])
          .slice(0, 6)
          .map((f) => {
            const n = Math.round(Number(f));
            return Number.isFinite(n) ? n : -1;
          });
        while (frets.length < 6) frets.push(-1);
        return { name: String(c && c.name != null ? c.name : '?'), frets };
      })
      .filter((c) => c.frets.length === 6);

    const title = params.title ? `<div class="pg-cd-title">${esc(params.title)}</div>` : '';
    const caption = params.caption ? `<div class="pg-cd-caption">${esc(params.caption)}</div>` : '';
    const btns = chords.map((c, i) =>
      `<button type="button" class="pg-cd-btn" data-role="chord" data-i="${i}" aria-pressed="${i === 0 ? 'true' : 'false'}">${esc(c.name)}</button>`
    ).join('');

    const html =
      `<div class="pg-stage">` +
        title +
        `<div class="pg-controls"><div class="pg-row pg-cd-btns">${btns}</div></div>` +
        `<div class="pg-cd-board"><svg data-role="svg" viewBox="0 0 200 240" role="img" aria-label="Guitar chord diagram"></svg></div>` +
        `<div class="pg-readout" data-role="readout"></div>` +
        caption +
      `</div>`;

    const css = [
      `#${domId} .pg-cd-title{font-weight:600;margin-bottom:.5rem}`,
      `#${domId} .pg-cd-btns{flex-wrap:wrap;gap:.4rem}`,
      `#${domId} .pg-cd-btn{font:inherit;cursor:pointer;padding:.35rem .7rem;border-radius:8px;border:1px solid var(--line,#23304a);background:rgba(140,160,200,.06);color:var(--ink-dim,#cdd6e6);font-weight:600}`,
      `#${domId} .pg-cd-btn[aria-pressed=true]{border-color:#22d3ee;background:rgba(34,211,238,.12);color:#e9eef8}`,
      `#${domId} .pg-cd-board{display:flex;justify-content:center;margin:.8rem 0}`,
      `#${domId} .pg-cd-board svg{width:200px;max-width:100%;height:auto}`,
      `#${domId} .pg-readout{text-align:center;font-weight:600;color:#22d3ee}`,
      `#${domId} .pg-cd-caption{margin-top:.4rem;text-align:center;color:var(--ink-dim,#cdd6e6);font-size:.9rem;opacity:.85}`,
    ].join('\n');

    const jsBody = `
var data = ${JSON.stringify(chords)};
var svg = $('[data-role=svg]');
var readout = $('[data-role=readout]');
if(!svg || !readout || !data.length) return;
var NS = 'http://www.w3.org/2000/svg';
var STRINGS = 6;
var X0 = 30, X1 = 170, Y0 = 50, GAP = (X1 - X0) / (STRINGS - 1);
var INK = '#cdd6e6', LINE = '#3a4a66', ACCENT = '#22d3ee';

function el(name, attrs){
  var e = document.createElementNS(NS, name);
  for(var k in attrs) if(attrs.hasOwnProperty(k)) e.setAttribute(k, attrs[k]);
  return e;
}
function txt(x, y, s, attrs){
  var t = el('text', attrs || {});
  t.setAttribute('x', x); t.setAttribute('y', y);
  t.setAttribute('text-anchor', 'middle');
  t.textContent = s;
  return t;
}
function stringX(i){ return X0 + i * GAP; }

function draw(chord){
  while(svg.firstChild) svg.removeChild(svg.firstChild);
  var played = chord.frets.filter(function(f){ return f > 0; });
  var maxFret = played.length ? Math.max.apply(null, played) : 0;
  var rows = Math.max(4, maxFret);
  var rowH = (240 - Y0 - 20) / rows;

  // fret rows (horizontal)
  for(var r = 0; r <= rows; r++){
    var y = Y0 + r * rowH;
    svg.appendChild(el('line', { x1: X0, y1: y, x2: X1, y2: y, stroke: LINE, 'stroke-width': r === 0 ? 4 : 1.5 }));
  }
  // strings (vertical)
  for(var s = 0; s < STRINGS; s++){
    var x = stringX(s);
    svg.appendChild(el('line', { x1: x, y1: Y0, x2: x, y2: Y0 + rows * rowH, stroke: LINE, 'stroke-width': 1.5 }));
  }

  // markers above the nut + dots on frets
  for(var i = 0; i < STRINGS; i++){
    var f = chord.frets[i];
    var sx = stringX(i);
    if(f === -1){
      svg.appendChild(txt(sx, Y0 - 14, '×', { fill: INK, 'font-size': '16', 'font-weight': '700' }));
    } else if(f === 0){
      svg.appendChild(el('circle', { cx: sx, cy: Y0 - 18, r: 6, fill: 'none', stroke: INK, 'stroke-width': 1.5 }));
    } else {
      var cy = Y0 + (f - 0.5) * rowH;
      svg.appendChild(el('circle', { cx: sx, cy: cy, r: 8, fill: ACCENT }));
    }
  }

  readout.textContent = chord.name;
}

var btns = $$('[data-role=chord]');
btns.forEach(function(b){
  b.addEventListener('click', function(){
    var idx = parseInt(b.getAttribute('data-i'), 10) || 0;
    if(!data[idx]) return;
    btns.forEach(function(o){ o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
    draw(data[idx]);
  });
});

draw(data[0]);
`;

    return { html, css, jsBody };
  },
};
