import { esc } from './index.js';

const GLYPHS = {
  sun: '☀️',
  partly: '⛅',
  cloud: '☁️',
  rain: '🌧️',
  storm: '⛈️',
  snow: '❄️',
  fog: '🌫️',
};
const WORDS = {
  sun: 'Sunny',
  partly: 'Partly cloudy',
  cloud: 'Cloudy',
  rain: 'Rain',
  storm: 'Thunderstorms',
  snow: 'Snow',
  fog: 'Fog',
};

export default {
  id: 'forecast-strip',
  name: 'Forecast',
  category: 'weather',
  description: 'A multi-day weather strip you can tap for the detail — use it to lay out a week (or a day) at a glance.',
  paramsSchema: {
    type: 'object', additionalProperties: false, required: ['unit', 'days'],
    properties: {
      title: { type: 'string' },
      unit: { type: 'string', default: '°C' },
      caption: { type: 'string' },
      days: {
        type: 'array', minItems: 3, maxItems: 7, items: {
          type: 'object', additionalProperties: false, required: ['day', 'condition', 'high', 'low'],
          properties: {
            day: { type: 'string' },
            condition: { type: 'string', enum: ['sun', 'partly', 'cloud', 'rain', 'storm', 'snow', 'fog'] },
            high: { type: 'number' },
            low: { type: 'number' },
            note: { type: 'string' },
          },
        },
      },
    },
  },
  presets: [
    {
      name: 'A British week',
      params: {
        unit: '°C',
        title: 'A British week',
        days: [
          { day: 'Mon', condition: 'cloud', high: 14, low: 8 },
          { day: 'Tue', condition: 'rain', high: 12, low: 7, note: 'Bring a coat.' },
          { day: 'Wed', condition: 'partly', high: 15, low: 9 },
          { day: 'Thu', condition: 'rain', high: 11, low: 6 },
          { day: 'Fri', condition: 'sun', high: 17, low: 10, note: 'Briefly glorious.' },
          { day: 'Sat', condition: 'storm', high: 13, low: 9 },
          { day: 'Sun', condition: 'cloud', high: 14, low: 8 },
        ],
      },
    },
    {
      name: 'Four seasons in a day',
      params: {
        unit: '°C',
        title: 'Four seasons in a day',
        days: [
          { day: 'Morning', condition: 'fog', high: 6, low: 4 },
          { day: 'Midday', condition: 'sun', high: 18, low: 12 },
          { day: 'Afternoon', condition: 'storm', high: 14, low: 10 },
          { day: 'Evening', condition: 'snow', high: 2, low: -1 },
        ],
      },
    },
  ],
  build(params, domId) {
    const allowed = ['sun', 'partly', 'cloud', 'rain', 'storm', 'snow', 'fog'];
    const unit = typeof params.unit === 'string' && params.unit ? params.unit : '°C';
    const days = (Array.isArray(params.days) ? params.days : []).slice(0, 7).map((d) => {
      const cond = allowed.indexOf(d && d.condition) >= 0 ? d.condition : 'cloud';
      return {
        day: String(d && d.day != null ? d.day : ''),
        condition: cond,
        high: Number(d && d.high),
        low: Number(d && d.low),
        note: d && d.note ? String(d.note) : '',
      };
    });
    const title = params.title ? `<div class="pg-fs-title">${esc(params.title)}</div>` : '';
    const caption = params.caption ? `<div class="pg-fs-caption">${esc(params.caption)}</div>` : '';

    const cardsHtml = days.map((d, i) =>
      `<button type="button" class="pg-fs-card" data-role="card" data-i="${i}" aria-pressed="false">` +
      `<span class="pg-fs-day">${esc(d.day)}</span>` +
      `<span class="pg-fs-glyph" aria-hidden="true">${GLYPHS[d.condition]}</span>` +
      `<span class="pg-fs-temps"><b class="pg-fs-high">${esc(String(d.high))}${esc(unit)}</b>` +
      `<span class="pg-fs-low">${esc(String(d.low))}${esc(unit)}</span></span>` +
      `</button>`).join('');

    const html = `<div class="pg-stage">${title}` +
      `<div class="pg-fs-strip" data-role="strip" role="list">${cardsHtml}</div>` +
      `<div class="pg-readout pg-fs-detail" data-role="detail" aria-live="polite">` +
      `<span class="pg-fs-hint">Tap a day for the detail.</span></div>` +
      `${caption}</div>`;

    const css = [
      `#${domId} .pg-fs-title{font-weight:700;margin-bottom:.6rem;color:var(--ink,#e9eef8)}`,
      `#${domId} .pg-fs-strip{display:flex;flex-wrap:wrap;gap:.55rem;overflow-x:auto;padding-bottom:.2rem}`,
      `#${domId} .pg-fs-card{flex:1 1 84px;min-width:84px;display:flex;flex-direction:column;align-items:center;gap:.35rem;padding:.7rem .5rem;border-radius:12px;border:1px solid var(--line,#23304a);background:rgba(140,160,200,.05);color:var(--ink,#e9eef8);cursor:pointer;font:inherit;transition:border-color .18s,background .18s,transform .18s}`,
      `#${domId} .pg-fs-card:hover{border-color:#22d3ee88;background:rgba(34,211,238,.06)}`,
      `#${domId} .pg-fs-card.selected{border-color:#2dd4bf;background:rgba(45,212,191,.12);transform:translateY(-2px)}`,
      `#${domId} .pg-fs-day{font-size:.82rem;font-weight:600;letter-spacing:.02em;color:var(--ink-dim,#cdd6e6)}`,
      `#${domId} .pg-fs-glyph{font-size:1.7rem;line-height:1}`,
      `#${domId} .pg-fs-temps{display:flex;flex-direction:column;align-items:center;line-height:1.15}`,
      `#${domId} .pg-fs-high{font-size:.95rem;color:#fbbf24}`,
      `#${domId} .pg-fs-low{font-size:.8rem;color:#818cf8}`,
      `#${domId} .pg-fs-detail{margin-top:.75rem;min-height:2.4rem;padding:.65rem .8rem;border-radius:10px;border:1px solid var(--line,#23304a);background:rgba(140,160,200,.05);color:var(--ink-dim,#cdd6e6);font-size:.92rem}`,
      `#${domId} .pg-fs-detail b{color:var(--ink,#e9eef8)}`,
      `#${domId} .pg-fs-detail .pg-fs-dglyph{font-size:1.15rem}`,
      `#${domId} .pg-fs-detail .pg-fs-note{display:block;margin-top:.3rem;color:#2dd4bf}`,
      `#${domId} .pg-fs-hint{opacity:.7}`,
      `#${domId} .pg-fs-caption{margin-top:.6rem;font-size:.85rem;color:var(--ink-dim,#cdd6e6);opacity:.85}`,
    ].join('\n');

    const jsBody = `
var DAYS=${JSON.stringify(days)};
var GLYPHS=${JSON.stringify(GLYPHS)};
var WORDS=${JSON.stringify(WORDS)};
var UNIT=${JSON.stringify(unit)};
var detail=$('[data-role=detail]');
var cards=$$('[data-role=card]');
if(!detail||!cards.length)return;
function pick(i){
  var d=DAYS[i];
  if(!d)return;
  cards.forEach(function(c){
    var on=Number(c.getAttribute('data-i'))===i;
    c.classList.toggle('selected',on);
    c.setAttribute('aria-pressed',on?'true':'false');
  });
  var parts='<b>'+esc(d.day)+'</b> · '+
    '<span class="pg-fs-dglyph" aria-hidden="true">'+(GLYPHS[d.condition]||'')+'</span> '+
    esc(WORDS[d.condition]||d.condition)+
    ' · high <b>'+esc(String(d.high))+esc(UNIT)+'</b>, low <b>'+esc(String(d.low))+esc(UNIT)+'</b>';
  if(d.note)parts+='<span class="pg-fs-note">'+esc(d.note)+'</span>';
  detail.innerHTML=parts;
}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
cards.forEach(function(c){
  c.addEventListener('click',function(){pick(Number(c.getAttribute('data-i')));});
});
`;

    return { html, css, jsBody };
  },
};
