import { esc } from './index.js';

export default {
  id: 'tabs-panel',
  name: 'Tabs',
  category: 'ui',
  description: 'Switch between a few short panels of text with tabs — use to compare a handful of takes on one thing.',
  paramsSchema: {
    type: 'object', additionalProperties: false, required: ['tabs'],
    properties: {
      title: { type: 'string' },
      caption: { type: 'string' },
      tabs: { type: 'array', minItems: 2, maxItems: 6, items: {
        type: 'object', additionalProperties: false, required: ['label', 'body'],
        properties: { label: { type: 'string' }, body: { type: 'string' } } } },
    },
  },
  presets: [
    { name: 'Three ways to look at it', params: {
      title: 'Three ways to look at it',
      tabs: [
        { label: 'Optimist', body: 'The glass is refillable.' },
        { label: 'Pessimist', body: 'The glass is evaporating.' },
        { label: 'Engineer', body: 'The glass is twice as big as it needs to be.' },
      ] } },
    { name: 'Tea vs coffee vs neither', params: {
      title: 'Tea vs coffee vs neither',
      tabs: [
        { label: 'Tea', body: 'Patient, civilised, faintly smug.' },
        { label: 'Coffee', body: 'Loud, effective, slightly anxious.' },
        { label: 'Neither', body: 'Suspicious, but probably sleeping better than you.' },
      ] } },
  ],
  build(params, domId) {
    const tabs = (Array.isArray(params.tabs) ? params.tabs : [])
      .filter((t) => t && typeof t === 'object')
      .slice(0, 6);
    const title = params.title ? `<div class="pg-tp-title">${esc(params.title)}</div>` : '';
    const caption = params.caption ? `<div class="pg-tp-caption">${esc(params.caption)}</div>` : '';

    const tabsHtml = tabs.map((t, i) =>
      `<button type="button" class="pg-tp-tab${i === 0 ? ' active' : ''}" data-role="tab" data-index="${i}" role="tab" aria-selected="${i === 0 ? 'true' : 'false'}">${esc(t.label)}</button>`
    ).join('');

    const panelsHtml = tabs.map((t, i) =>
      `<div class="pg-tp-panel${i === 0 ? ' active' : ''}" data-role="panel" data-index="${i}" role="tabpanel"${i === 0 ? '' : ' hidden'}>${esc(t.body)}</div>`
    ).join('');

    const html = `<div class="pg-stage">${title}` +
      `<div class="pg-tp-bar" role="tablist">${tabsHtml}</div>` +
      `<div class="pg-tp-body">${panelsHtml}</div>` +
      `${caption}</div>`;

    const css = [
      `#${domId} .pg-tp-title{font-weight:600;color:var(--ink,#e9eef8);margin-bottom:.6rem}`,
      `#${domId} .pg-tp-bar{display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.7rem}`,
      `#${domId} .pg-tp-tab{font:inherit;cursor:pointer;padding:.4rem .8rem;border-radius:8px;border:1px solid var(--line,#23304a);background:rgba(140,160,200,.06);color:var(--ink-dim,#cdd6e6);transition:background .18s,border-color .18s,color .18s}`,
      `#${domId} .pg-tp-tab:hover{border-color:#22d3ee88;color:var(--ink,#e9eef8)}`,
      `#${domId} .pg-tp-tab.active{background:rgba(34,211,238,.12);border-color:#22d3ee;color:#22d3ee;font-weight:600}`,
      `#${domId} .pg-tp-body{border:1px solid var(--line,#23304a);border-radius:12px;padding:1rem;background:rgba(140,160,200,.04);min-height:3.2rem}`,
      `#${domId} .pg-tp-panel{color:var(--ink,#e9eef8);line-height:1.5}`,
      `#${domId} .pg-tp-panel[hidden]{display:none}`,
      `#${domId} .pg-tp-caption{margin-top:.6rem;font-size:.85rem;color:var(--ink-dim,#9fb0c8)}`,
    ].join('\n');

    const jsBody = `
var tabs=$$('[data-role=tab]');
var panels=$$('[data-role=panel]');
if(!tabs.length||!panels.length)return;
function select(idx){
  tabs.forEach(function(t){
    var on=t.getAttribute('data-index')===String(idx);
    t.classList.toggle('active',on);
    t.setAttribute('aria-selected',on?'true':'false');
  });
  panels.forEach(function(p){
    var on=p.getAttribute('data-index')===String(idx);
    p.classList.toggle('active',on);
    if(on)p.removeAttribute('hidden');else p.setAttribute('hidden','');
  });
}
tabs.forEach(function(t){
  t.addEventListener('click',function(){ select(t.getAttribute('data-index')); });
});
select(0);
`;
    return { html, css, jsBody };
  },
};
