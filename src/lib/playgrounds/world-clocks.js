import { esc } from './index.js';
export default {
  id: 'world-clocks',
  name: 'World clocks',
  category: 'data',
  description: 'Live local times across a handful of cities at once — handy for working out when anyone is actually awake.',
  paramsSchema: {
    type: 'object', additionalProperties: false, required: ['cities'],
    properties: {
      title: { type: 'string' },
      caption: { type: 'string' },
      cities: { type: 'array', minItems: 2, maxItems: 8, items: {
        type: 'object', additionalProperties: false, required: ['name', 'offset'],
        properties: {
          name: { type: 'string' },
          offset: { type: 'number', minimum: -12, maximum: 14 },
        } } },
    },
  },
  presets: [
    { name: 'Around the world right now', params: {
      title: 'Around the world right now',
      cities: [
        { name: 'London', offset: 0 },
        { name: 'New York', offset: -5 },
        { name: 'Mumbai', offset: 5.5 },
        { name: 'Tokyo', offset: 9 },
        { name: 'Sydney', offset: 11 },
      ],
      caption: 'Local times, updating every second. Offsets are from UTC and ignore daylight saving.' } },
    { name: 'When can I call home?', params: {
      title: 'When can I call home?',
      cities: [
        { name: 'London', offset: 0 },
        { name: 'Los Angeles', offset: -8 },
        { name: 'Berlin', offset: 1 },
      ],
      caption: 'Find the overlap where everyone is awake before you dial.' } },
  ],
  build(params, domId) {
    const cities = (Array.isArray(params.cities) ? params.cities : [])
      .slice(0, 8)
      .filter((c) => c && typeof c.name === 'string')
      .map((c) => ({ name: c.name, offset: Number(c.offset) || 0 }));
    const title = params.title ? `<div class="pg-wc-title">${esc(params.title)}</div>` : '';
    const caption = params.caption ? `<div class="pg-wc-caption">${esc(params.caption)}</div>` : '';
    const cardsHtml = cities.map((c) =>
      `<div class="pg-wc-card" data-role="card" data-offset="${c.offset}">` +
      `<div class="pg-wc-name">${esc(c.name)}</div>` +
      `<div class="pg-wc-time"><span class="pg-wc-hm" data-role="hm">--:--</span><span class="pg-wc-sec" data-role="sec">--</span></div>` +
      `<div class="pg-wc-glyph" data-role="glyph" aria-hidden="true">·</div>` +
      `</div>`).join('');
    const html = `<div class="pg-stage">${title}<div class="pg-wc-grid">${cardsHtml}</div>${caption}</div>`;
    const css = [
      `#${domId} .pg-wc-title{font-weight:700;font-size:1.05rem;margin-bottom:.7rem;color:#e9eef8}`,
      `#${domId} .pg-wc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:.7rem}`,
      `#${domId} .pg-wc-card{position:relative;padding:.9rem 1rem;border-radius:12px;border:1px solid #23304a;background:rgba(140,160,200,.05)}`,
      `#${domId} .pg-wc-card.is-night{background:rgba(129,140,248,.07);border-color:#818cf855}`,
      `#${domId} .pg-wc-card.is-day{background:rgba(251,191,36,.06);border-color:#fbbf2455}`,
      `#${domId} .pg-wc-name{font-weight:600;color:#cdd6e6;font-size:.9rem;letter-spacing:.01em}`,
      `#${domId} .pg-wc-time{margin-top:.35rem;display:flex;align-items:baseline;gap:.3rem;font-variant-numeric:tabular-nums}`,
      `#${domId} .pg-wc-hm{font-size:1.8rem;font-weight:700;color:#22d3ee;line-height:1}`,
      `#${domId} .pg-wc-sec{font-size:.95rem;font-weight:600;color:#2dd4bf}`,
      `#${domId} .pg-wc-glyph{position:absolute;top:.7rem;right:.85rem;font-size:1.2rem}`,
      `#${domId} .pg-wc-caption{margin-top:.8rem;font-size:.82rem;color:#9aa6bd}`,
    ].join('\n');
    const jsBody = `
var cards=$$('[data-role=card]');
if(!cards.length)return;
function pad(n){return (n<10?'0':'')+n;}
function tick(){
  var now=new Date();
  var utcMs=now.getTime()+now.getTimezoneOffset()*60000;
  cards.forEach(function(card){
    var offset=parseFloat(card.getAttribute('data-offset'))||0;
    var local=new Date(utcMs+offset*3600000);
    var h=local.getHours(), m=local.getMinutes(), s=local.getSeconds();
    var hm=card.querySelector('[data-role=hm]');
    var sec=card.querySelector('[data-role=sec]');
    var glyph=card.querySelector('[data-role=glyph]');
    if(hm)hm.textContent=pad(h)+':'+pad(m);
    if(sec)sec.textContent=pad(s);
    var day=(h>=6&&h<18);
    if(glyph)glyph.textContent=day?'☀':'🌙';
    card.classList.toggle('is-day',day);
    card.classList.toggle('is-night',!day);
  });
}
tick();
if(root._wcTimer)clearInterval(root._wcTimer);
root._wcTimer=setInterval(tick,1000);
`;
    return { html, css, jsBody };
  },
};
