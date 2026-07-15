import { esc } from './index.js';

export default {
  id: 'timeline-scrubber',
  name: 'Timeline',
  category: 'history',
  description: 'Drag along a timeline to land on each moment in turn.',
  paramsSchema: {
    type: 'object', additionalProperties: false, required: ['events'],
    properties: {
      title: { type: 'string' },
      caption: { type: 'string' },
      events: { type: 'array', minItems: 2, maxItems: 12, items: {
        type: 'object', additionalProperties: false, required: ['year', 'label'],
        properties: {
          year: { type: 'number' },
          label: { type: 'string' },
          note: { type: 'string' },
        } } },
    },
  },
  presets: [
    { name: 'A short history of flight', params: {
      title: 'A short history of flight',
      events: [
        { year: 1903, label: 'First powered flight', note: 'The Wright brothers, 12 seconds, 37 metres.' },
        { year: 1927, label: 'Solo across the Atlantic', note: 'Lindbergh, 33.5 hours, alone.' },
        { year: 1947, label: 'Breaking the sound barrier' },
        { year: 1969, label: 'The Moon', note: 'Apollo 11.' },
        { year: 1976, label: 'Concorde enters service' },
        { year: 2004, label: 'First private spaceflight', note: 'SpaceShipOne.' },
      ] } },
    { name: 'The personal computer', params: {
      title: 'The personal computer',
      events: [
        { year: 1971, label: 'The microprocessor' },
        { year: 1977, label: 'Apple II' },
        { year: 1981, label: 'IBM PC' },
        { year: 1984, label: 'The Macintosh' },
        { year: 1991, label: 'The Web goes public' },
        { year: 2007, label: 'iPhone' },
      ] } },
  ],
  build(params, domId) {
    const events = (Array.isArray(params.events) ? params.events : [])
      .filter((e) => e && typeof e.year === 'number' && isFinite(e.year))
      .map((e) => ({ year: Math.round(e.year), label: String(e.label == null ? '' : e.label), note: e.note ? String(e.note) : '' }))
      .sort((a, b) => a.year - b.year)
      .slice(0, 12);

    const min = events.length ? events[0].year : 0;
    const max = events.length ? events[events.length - 1].year : 0;
    const span = max - min || 1;

    const title = params.title ? `<div class="pg-tl-title">${esc(params.title)}</div>` : '';
    const caption = params.caption ? `<div class="pg-tl-caption">${esc(params.caption)}</div>` : '';

    const dots = events.map((e, i) => {
      const pos = ((e.year - min) / span) * 100;
      return `<button type="button" class="pg-tl-dot" data-role="dot" data-index="${i}" data-year="${e.year}" ` +
        `style="left:${pos}%" aria-label="${esc(e.year + ': ' + e.label)}"><span class="pg-tl-dot-year">${esc(String(e.year))}</span></button>`;
    }).join('');

    const html = `<div class="pg-stage">${title}` +
      `<div class="pg-tl-track">` +
        `<div class="pg-tl-axis"></div>` +
        `<div class="pg-tl-marker" data-role="marker"></div>` +
        dots +
      `</div>` +
      `<div class="pg-controls"><div class="pg-row pg-field">` +
        `<label><b>Year</b> <span class="pg-readout" data-role="yearout">${esc(String(min))}</span></label>` +
        `<input type="range" data-role="slider" min="${min}" max="${max}" step="1" value="${min}">` +
      `</div></div>` +
      `<div class="pg-readout pg-tl-readout" data-role="readout" aria-live="polite"></div>` +
      caption +
    `</div>`;

    const css = [
      `#${domId} .pg-tl-title{font-weight:700;margin-bottom:.4rem;color:var(--ink,#e9eef8)}`,
      `#${domId} .pg-tl-track{position:relative;height:64px;margin:1.4rem .6rem .6rem}`,
      `#${domId} .pg-tl-axis{position:absolute;left:0;right:0;top:50%;height:2px;transform:translateY(-50%);background:linear-gradient(90deg,#2dd4bf,#22d3ee,#818cf8);border-radius:2px;opacity:.65}`,
      `#${domId} .pg-tl-marker{position:absolute;top:50%;left:0;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;background:#fbbf24;box-shadow:0 0 0 4px rgba(251,191,36,.18);transition:left .25s ease}`,
      `#${domId}.pg-tl-reduce .pg-tl-marker{transition:none}`,
      `#${domId} .pg-tl-dot{position:absolute;top:50%;transform:translate(-50%,-50%);width:13px;height:13px;padding:0;border:2px solid #0a0e18;border-radius:50%;background:#22d3ee;cursor:pointer;font:inherit}`,
      `#${domId} .pg-tl-dot:hover,#${domId} .pg-tl-dot.active{background:#818cf8}`,
      `#${domId} .pg-tl-dot-year{position:absolute;left:50%;bottom:140%;transform:translateX(-50%);font-size:.62rem;color:var(--ink-dim,#9fb0c8);white-space:nowrap;pointer-events:none}`,
      `#${domId} .pg-tl-dot.active .pg-tl-dot-year{color:#818cf8}`,
      `#${domId} input[type=range]{width:100%}`,
      `#${domId} .pg-tl-readout{margin-top:.6rem;min-height:2.6rem}`,
      `#${domId} .pg-tl-readout .yr{color:#fbbf24;font-weight:700}`,
      `#${domId} .pg-tl-readout .lab{color:var(--ink,#e9eef8);font-weight:600}`,
      `#${domId} .pg-tl-readout .note{display:block;margin-top:.2rem;color:var(--ink-dim,#9fb0c8);font-size:.92em}`,
      `#${domId} .pg-tl-caption{margin-top:.6rem;color:var(--ink-dim,#9fb0c8);font-size:.88rem}`,
    ].join('\n');

    const jsBody = `
var EVENTS=${JSON.stringify(events)};
var MIN=${min},MAX=${max},SPAN=${span};
if(!EVENTS.length)return;
if(reduced)root.classList.add('pg-tl-reduce');
var slider=$('[data-role=slider]'),marker=$('[data-role=marker]'),yearout=$('[data-role=yearout]'),readout=$('[data-role=readout]');
if(!slider||!marker||!readout)return;
var dots=$$('[data-role=dot]');
function nearest(y){
  var best=0,bd=Infinity;
  for(var i=0;i<EVENTS.length;i++){var d=Math.abs(EVENTS[i].year-y);if(d<bd){bd=d;best=i;}}
  return best;
}
function render(y){
  var pos=((y-MIN)/SPAN)*100;
  marker.style.left=pos+'%';
  if(yearout)yearout.textContent=y;
  var idx=nearest(y),e=EVENTS[idx];
  var html='<span class="yr">'+e.year+'</span> <span class="lab">'+e.label.replace(/[&<>]/g,function(c){return c==='&'?'&amp;':c==='<'?'&lt;':'&gt;';})+'</span>';
  if(e.note)html+='<span class="note">'+e.note.replace(/[&<>]/g,function(c){return c==='&'?'&amp;':c==='<'?'&lt;':'&gt;';})+'</span>';
  readout.innerHTML=html;
  dots.forEach(function(d){d.classList.toggle('active',parseInt(d.getAttribute('data-index'),10)===idx);});
}
slider.addEventListener('input',function(){render(parseInt(slider.value,10));});
dots.forEach(function(d){
  d.addEventListener('click',function(){
    var y=parseInt(d.getAttribute('data-year'),10);
    slider.value=y;
    render(y);
  });
});
render(MIN);
`;

    return { html, css, jsBody };
  },
};
