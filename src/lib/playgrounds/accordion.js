import { esc } from './index.js';

export default {
  id: 'accordion',
  name: 'Accordion',
  category: 'reveal',
  description: 'A list of expandable rows — tap a question to reveal the answer.',
  paramsSchema: {
    type: 'object', additionalProperties: false, required: ['items'],
    properties: {
      title: { type: 'string' },
      caption: { type: 'string' },
      items: { type: 'array', minItems: 2, maxItems: 10, items: {
        type: 'object', additionalProperties: false, required: ['q', 'a'],
        properties: { q: { type: 'string' }, a: { type: 'string' } } } },
    },
  },
  presets: [
    { name: 'Common questions', params: {
      title: 'Common questions',
      items: [
        { q: 'Is it free?', a: 'Yes — and it stays on your own machine.' },
        { q: 'Do I need the internet?', a: 'Only to publish; everything else works offline.' },
        { q: 'Can I undo things?', a: 'Always. Nothing is final until you publish.' },
      ] } },
    { name: 'Myth or fact', params: {
      title: 'Myth or fact',
      items: [
        { q: 'Goldfish have a 3-second memory', a: 'Myth — they remember for months.' },
        { q: 'We use 10% of our brains', a: 'Myth — we use all of it, just not all at once.' },
      ] } },
  ],
  build(params, domId) {
    const items = (Array.isArray(params.items) ? params.items : [])
      .filter((it) => it && typeof it === 'object')
      .slice(0, 10);
    const title = params.title ? `<div class="pg-ac-title">${esc(params.title)}</div>` : '';
    const caption = params.caption ? `<div class="pg-ac-caption">${esc(params.caption)}</div>` : '';

    const rowsHtml = items.map((it) =>
      `<div class="pg-ac-row" data-role="row">` +
        `<button type="button" class="pg-ac-head" data-role="head" aria-expanded="false">` +
          `<span class="pg-ac-q">${esc(it.q)}</span>` +
          `<span class="pg-ac-chev" aria-hidden="true">&#9656;</span>` +
        `</button>` +
        `<div class="pg-ac-panel" data-role="panel">` +
          `<div class="pg-ac-a">${esc(it.a)}</div>` +
        `</div>` +
      `</div>`
    ).join('');

    const html = `<div class="pg-stage">${title}` +
      `<div class="pg-ac-list">${rowsHtml}</div>` +
      `${caption}</div>`;

    const css = [
      `#${domId} .pg-ac-title{font-weight:600;color:var(--ink,#e9eef8);margin-bottom:.6rem}`,
      `#${domId} .pg-ac-list{display:flex;flex-direction:column;gap:.5rem}`,
      `#${domId} .pg-ac-row{border:1px solid var(--line,#23304a);border-radius:12px;background:rgba(140,160,200,.04);overflow:hidden;transition:border-color .18s}`,
      `#${domId} .pg-ac-row.open{border-color:#22d3ee}`,
      `#${domId} .pg-ac-head{display:flex;align-items:center;justify-content:space-between;gap:.8rem;width:100%;font:inherit;text-align:left;cursor:pointer;border:0;background:transparent;color:var(--ink,#e9eef8);padding:.8rem 1rem}`,
      `#${domId} .pg-ac-head:hover .pg-ac-q{color:#22d3ee}`,
      `#${domId} .pg-ac-q{font-weight:600;line-height:1.4}`,
      `#${domId} .pg-ac-chev{flex:0 0 auto;color:#22d3ee;font-size:.9rem;transition:transform .25s}`,
      `#${domId} .pg-ac-row.open .pg-ac-chev{transform:rotate(90deg)}`,
      `#${domId} .pg-ac-panel{display:grid;grid-template-rows:0fr;opacity:0;transition:grid-template-rows .28s ease,opacity .28s ease}`,
      `#${domId} .pg-ac-row.open .pg-ac-panel{grid-template-rows:1fr;opacity:1}`,
      `#${domId} .pg-ac-a{min-height:0;overflow:hidden;color:var(--ink-dim,#cdd6e6);line-height:1.55;padding:0 1rem}`,
      `#${domId} .pg-ac-row.open .pg-ac-a{padding-bottom:.9rem}`,
      `#${domId}.pg-ac-reduce .pg-ac-panel{transition:none}`,
      `#${domId}.pg-ac-reduce .pg-ac-chev{transition:none}`,
      `#${domId}.pg-ac-reduce .pg-ac-row{transition:none}`,
      `#${domId} .pg-ac-caption{margin-top:.6rem;font-size:.85rem;color:var(--ink-dim,#9fb0c8)}`,
    ].join('\n');

    const jsBody = `
if(reduced)root.classList.add('pg-ac-reduce');
var rows=$$('[data-role=row]');
if(!rows.length)return;
rows.forEach(function(row){
  var head=row.querySelector('[data-role=head]');
  if(!head)return;
  head.addEventListener('click',function(){
    var open=row.classList.toggle('open');
    head.setAttribute('aria-expanded',open?'true':'false');
  });
});
`;
    return { html, css, jsBody };
  },
};
