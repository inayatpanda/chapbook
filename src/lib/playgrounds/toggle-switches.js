import { esc } from './index.js';

export default {
  id: 'toggle-switches',
  name: 'Toggles',
  category: 'ui',
  description: 'A set of on/off switches with a live summary of how many are on.',
  paramsSchema: {
    type: 'object', additionalProperties: false, required: ['switches'],
    properties: {
      title: { type: 'string' },
      switches: {
        type: 'array', minItems: 2, maxItems: 10, items: {
          type: 'object', additionalProperties: false, required: ['label'],
          properties: {
            label: { type: 'string' },
            on: { type: 'boolean', default: false },
          },
        },
      },
      summary: { type: 'string' },
      caption: { type: 'string' },
    },
  },
  presets: [
    { name: 'What makes a good holiday?', params: {
      title: 'What makes a good holiday?',
      switches: [
        { label: 'Sunshine', on: true },
        { label: 'Good food', on: true },
        { label: 'Wi-Fi', on: false },
        { label: 'Adventure', on: false },
        { label: 'Doing nothing', on: true },
      ],
    } },
    { name: 'Dealbreakers', params: {
      title: 'Dealbreakers',
      switches: [
        { label: 'Snores', on: false },
        { label: 'Likes the same films', on: true },
        { label: 'Tidy', on: false },
        { label: 'Good with money', on: true },
      ],
      caption: 'Flip the ones that matter to you.',
    } },
  ],
  build(params, domId) {
    const sw = (Array.isArray(params.switches) ? params.switches : [])
      .filter((s) => s && typeof s.label === 'string')
      .slice(0, 10)
      .map((s) => ({ label: s.label, on: s.on === true }));
    const total = sw.length;

    const summary = typeof params.summary === 'string' && params.summary.trim()
      ? params.summary : '';
    const title = params.title ? `<div class="pg-ts-title">${esc(params.title)}</div>` : '';
    const caption = params.caption ? `<div class="pg-ts-caption">${esc(params.caption)}</div>` : '';

    const rows = sw.map((s, i) =>
      `<button type="button" class="pg-ts-row${s.on ? ' on' : ''}" data-role="switch" role="switch" aria-checked="${s.on ? 'true' : 'false'}" data-i="${i}">` +
        `<span class="pg-ts-label">${esc(s.label)}</span>` +
        `<span class="pg-ts-track" aria-hidden="true"><span class="pg-ts-knob"></span></span>` +
      `</button>`).join('');

    const html =
      `<div class="pg-stage">` +
        title +
        `<div class="pg-ts-list" data-role="list">${rows}</div>` +
        `<div class="pg-ts-foot">` +
          `<span class="pg-readout" data-role="count">0 of ${total} on</span>` +
        `</div>` +
        caption +
      `</div>`;

    const css = [
      `#${domId} .pg-ts-title{font-weight:700;font-size:1.05rem;color:var(--ink,#e9eef8);margin-bottom:.7rem}`,
      `#${domId} .pg-ts-list{display:flex;flex-direction:column;gap:.45rem}`,
      `#${domId} .pg-ts-row{display:flex;align-items:center;justify-content:space-between;gap:.9rem;width:100%;text-align:left;font:inherit;cursor:pointer;padding:.55rem .8rem;border-radius:10px;border:1px solid var(--line,#23304a);background:rgba(140,160,200,.05);color:var(--ink,#e9eef8)}`,
      `#${domId} .pg-ts-row:hover{border-color:#2dd4bf66}`,
      `#${domId} .pg-ts-row:focus-visible{outline:2px solid #22d3ee;outline-offset:2px}`,
      `#${domId} .pg-ts-row.on{border-color:#2dd4bf55;background:rgba(45,212,191,.08)}`,
      `#${domId} .pg-ts-label{flex:1 1 auto;min-width:0}`,
      `#${domId} .pg-ts-track{flex:0 0 auto;position:relative;display:inline-block;width:44px;height:24px;border-radius:99px;background:rgba(140,160,200,.18);border:1px solid #3a4865;transition:background .2s,border-color .2s}`,
      `#${domId} .pg-ts-row.on .pg-ts-track{background:linear-gradient(90deg,#2dd4bf,#22d3ee);border-color:#22d3ee}`,
      `#${domId} .pg-ts-knob{position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:50%;background:#e9eef8;box-shadow:0 1px 3px rgba(0,0,0,.4);transition:transform .2s ease}`,
      `#${domId} .pg-ts-row.on .pg-ts-knob{transform:translateX(20px)}`,
      `#${domId} .pg-ts-foot{display:flex;align-items:center;justify-content:flex-end;margin-top:.9rem}`,
      `#${domId} .pg-readout{font-variant-numeric:tabular-nums}`,
      `#${domId} .pg-ts-caption{margin-top:.7rem;font-size:.85rem;color:var(--ink-dim,#8b97ac)}`,
      `#${domId}.pg-ts-reduce .pg-ts-track,#${domId}.pg-ts-reduce .pg-ts-knob{transition:none}`,
    ].join('\n');

    const jsBody = `
if(reduced)root.classList.add('pg-ts-reduce');
var rows=$$('[data-role=switch]');
var total=rows.length;
if(!total)return;
var count=$('[data-role=count]');
var tpl=${JSON.stringify(summary)};
function refresh(){
  var n=0;
  rows.forEach(function(r){ if(r.classList.contains('on'))n++; });
  if(count){
    var txt=n+' of '+total+' on';
    if(tpl){
      txt=tpl.replace(/\\{n\\}/g,n).replace(/\\{m\\}/g,total).replace(/\\bN\\b/g,n).replace(/\\bM\\b/g,total);
    }
    count.textContent=txt;
  }
}
rows.forEach(function(r){
  r.addEventListener('click',function(){
    var on=r.classList.toggle('on');
    r.setAttribute('aria-checked',on?'true':'false');
    refresh();
  });
});
refresh();
`;

    return { html, css, jsBody };
  },
};
