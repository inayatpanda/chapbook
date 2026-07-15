import { esc } from './index.js';

export default {
  id: 'map-route',
  name: 'Journey',
  category: 'diagram',
  description: 'A route through a set of stops you can play through end to end or tap one at a time.',
  paramsSchema: {
    type: 'object', additionalProperties: false, required: ['stops'],
    properties: {
      title: { type: 'string' },
      caption: { type: 'string' },
      stops: {
        type: 'array', minItems: 2, maxItems: 8, items: {
          type: 'object', additionalProperties: false, required: ['name', 'x', 'y'],
          properties: {
            name: { type: 'string' },
            x: { type: 'number', minimum: 0, maximum: 100 },
            y: { type: 'number', minimum: 0, maximum: 100 },
            note: { type: 'string' },
          },
        },
      },
    },
  },
  presets: [
    { name: 'A weekend in Rome', params: {
      title: 'A weekend in Rome',
      caption: 'Four stops, comfortable shoes, no regrets.',
      stops: [
        { name: 'Colosseum', x: 20, y: 70, note: 'Start with the crowds, get them over with.' },
        { name: 'Pantheon', x: 45, y: 45, note: 'Look up. The hole is the point.' },
        { name: 'Trevi Fountain', x: 62, y: 35, note: 'Throw a coin, fight for a photo.' },
        { name: 'Vatican', x: 85, y: 20, note: 'Wear something with sleeves.' },
      ] } },
    { name: 'The coast road', params: {
      title: 'The coast road',
      caption: 'One tank of fuel, the sea on your left the whole way.',
      stops: [
        { name: 'Start', x: 10, y: 80, note: 'Top up the tank.' },
        { name: 'The cliffs', x: 40, y: 50, note: 'Pull over. Breathe.' },
        { name: 'Fishing village', x: 70, y: 60, note: 'Lunch. Obviously.' },
        { name: 'Lighthouse', x: 92, y: 25, note: 'The end of the land.' },
      ] } },
  ],
  build(params, domId) {
    const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
    const stops = (Array.isArray(params.stops) ? params.stops : [])
      .slice(0, 8)
      .map((s) => ({
        name: String(s && s.name != null ? s.name : ''),
        note: String(s && s.note != null ? s.note : ''),
        x: clamp(Number(s && s.x) || 0, 0, 100),
        y: clamp(Number(s && s.y) || 0, 0, 100),
      }));

    const title = params.title ? `<div class="pg-mr-title">${esc(params.title)}</div>` : '';
    const caption = params.caption ? `<div class="pg-mr-caption">${esc(params.caption)}</div>` : '';

    // Pass the validated stops to jsBody as JSON so coordinate maths lives in one place.
    const dataJson = JSON.stringify(stops);

    const html = `<div class="pg-stage">
${title}
<svg class="pg-mr-svg" data-role="svg" viewBox="0 0 100 64" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Route map"></svg>
<div class="pg-readout" data-role="readout" aria-live="polite"></div>
<div class="pg-controls"><div class="pg-row">
<button type="button" class="pg-mr-play" data-role="play">Play journey</button>
</div></div>
${caption}
</div>`;

    const css = [
      `#${domId} .pg-mr-title{font-weight:600;margin:0 0 .5rem;color:var(--ink,#e9eef8)}`,
      `#${domId} .pg-mr-svg{display:block;width:100%;height:auto;background:rgba(140,160,200,.05);border:1px solid var(--line,#23304a);border-radius:12px}`,
      `#${domId} .pg-mr-edge{fill:none;stroke:#818cf8;stroke-width:.6;stroke-dasharray:2 1.6;stroke-linecap:round;opacity:.7}`,
      `#${domId} .pg-mr-stop{cursor:pointer}`,
      `#${domId} .pg-mr-ring{fill:rgba(34,211,238,.12);stroke:#22d3ee;stroke-width:.5;transition:fill .2s,stroke .2s}`,
      `#${domId} .pg-mr-stop.is-active .pg-mr-ring{fill:rgba(45,212,191,.3);stroke:#2dd4bf}`,
      `#${domId} .pg-mr-num{fill:var(--ink,#e9eef8);font-size:2.4px;font-weight:700;text-anchor:middle;dominant-baseline:central;pointer-events:none}`,
      `#${domId} .pg-mr-lbl{fill:var(--ink-dim,#cdd6e6);font-size:2.6px;text-anchor:middle;pointer-events:none}`,
      `#${domId} .pg-mr-traveller{fill:#fbbf24;stroke:#04060c;stroke-width:.4;filter:drop-shadow(0 0 1.5px #fbbf24)}`,
      `#${domId} .pg-readout{margin:.6rem 0;min-height:2.4em;color:var(--ink-dim,#cdd6e6);font-size:.95rem}`,
      `#${domId} .pg-readout b{color:var(--ink,#e9eef8)}`,
      `#${domId} .pg-mr-play{font:inherit;cursor:pointer;padding:.45rem .9rem;border-radius:9px;border:1px solid #22d3ee66;background:rgba(34,211,238,.08);color:var(--ink,#e9eef8)}`,
      `#${domId} .pg-mr-play:hover{background:rgba(34,211,238,.16)}`,
      `#${domId} .pg-mr-play[disabled]{opacity:.5;cursor:default}`,
      `#${domId} .pg-mr-caption{margin-top:.6rem;color:var(--ink-dim,#cdd6e6);font-size:.85rem;opacity:.85}`,
    ].join('\n');

    const jsBody = `
var STOPS = ${dataJson};
var svg = $('[data-role=svg]');
var play = $('[data-role=play]');
var readout = $('[data-role=readout]');
if(!svg || !readout || STOPS.length < 2) return;
var NS = 'http://www.w3.org/2000/svg';
// map params x:0-100 -> 0-100, y:0-100 -> 0-64 (y * 0.64) so it fits the viewBox.
function px(s){ return s.x; }
function py(s){ return s.y * 0.64; }

function el(name, attrs){
  var n = document.createElementNS(NS, name);
  for(var k in attrs){ if(Object.prototype.hasOwnProperty.call(attrs,k)) n.setAttribute(k, attrs[k]); }
  return n;
}

// dashed polyline through the stops in order
var pts = STOPS.map(function(s){ return px(s) + ',' + py(s); }).join(' ');
svg.appendChild(el('polyline', { points: pts, 'class': 'pg-mr-edge' }));

// stop markers + numbers + name labels
var groups = [];
STOPS.forEach(function(s, i){
  var g = el('g', { 'class': 'pg-mr-stop' });
  g.setAttribute('tabindex', '0');
  g.setAttribute('role', 'button');
  g.appendChild(el('circle', { cx: px(s), cy: py(s), r: 2.4, 'class': 'pg-mr-ring' }));
  var num = el('text', { x: px(s), y: py(s), 'class': 'pg-mr-num' });
  num.textContent = String(i + 1);
  g.appendChild(num);
  // place the name above the stop, or below if too near the top edge
  var below = py(s) < 8;
  var lbl = el('text', { x: px(s), y: py(s) + (below ? 6.4 : -3.6), 'class': 'pg-mr-lbl' });
  lbl.textContent = s.name;
  g.appendChild(lbl);
  svg.appendChild(g);
  groups.push(g);
  function select(){ arrive(i); }
  g.addEventListener('click', select);
  g.addEventListener('keydown', function(e){ if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); select(); } });
});

// traveller dot, parked at the first stop
var dot = el('circle', { cx: px(STOPS[0]), cy: py(STOPS[0]), r: 1.7, 'class': 'pg-mr-traveller' });
svg.appendChild(dot);

function moveDot(x, y){ dot.setAttribute('cx', x); dot.setAttribute('cy', y); }

function arrive(i){
  groups.forEach(function(g, j){ g.classList.toggle('is-active', j === i); });
  moveDot(px(STOPS[i]), py(STOPS[i]));
  var s = STOPS[i];
  var note = s.note ? ' — ' + s.note : '';
  readout.innerHTML = 'Stop ' + (i + 1) + ': <b>' + (s.name ? escHtml(s.name) : 'Unnamed') + '</b>' + escHtml(note);
}

function escHtml(t){ var d = document.createElement('div'); d.textContent = t == null ? '' : String(t); return d.innerHTML; }

var raf = null;
var timer = null;
var playing = false;

function cancelRun(){
  if(raf){ cancelAnimationFrame(raf); raf = null; }
  if(timer){ clearTimeout(timer); timer = null; }
}

function startPlay(){
  if(playing) return;             // ignore Play while a journey is running
  cancelRun();
  playing = true;
  if(play){ play.setAttribute('disabled', 'disabled'); }

  if(reduced){
    // reduced motion: step through stops on a short timer, no interpolation
    var i = 0;
    arrive(0);
    var tick = function(){
      i++;
      if(i >= STOPS.length){ finish(); return; }
      arrive(i);
      timer = setTimeout(tick, 500);
    };
    timer = setTimeout(tick, 500);
    return;
  }

  var seg = 0;                    // current segment index (from stop seg -> seg+1)
  var SEG_MS = 700;
  arrive(0);

  function runSeg(){
    var a = STOPS[seg], b = STOPS[seg + 1];
    var ax = px(a), ay = py(a), bx = px(b), by = py(b);
    var t0 = null;
    function frame(ts){
      if(t0 == null) t0 = ts;
      var p = Math.min(1, (ts - t0) / SEG_MS);
      moveDot(ax + (bx - ax) * p, ay + (by - ay) * p);
      if(p < 1){ raf = requestAnimationFrame(frame); return; }
      seg++;
      arrive(seg);                // landed on the next stop
      if(seg >= STOPS.length - 1){ finish(); return; }
      raf = requestAnimationFrame(runSeg);
    }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(runSeg);
}

function finish(){ cancelRun(); playing = false; if(play){ play.removeAttribute('disabled'); } }

if(play){ play.addEventListener('click', startPlay); }

// initial readout: first stop selected, tapping works straight away
arrive(0);
`;

    return { html, css, jsBody };
  },
};
