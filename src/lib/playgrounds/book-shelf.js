import { esc } from './index.js';

const PALETTE = ['#2dd4bf', '#22d3ee', '#818cf8', '#f472b6', '#fbbf24', '#34d399'];

export default {
  id: 'book-shelf',
  name: 'Bookshelf',
  category: 'reveal',
  description: 'A shelf of book spines; tap a spine to reveal its title, author and a one-line note.',
  paramsSchema: {
    type: 'object', additionalProperties: false, required: ['books'],
    properties: {
      title: { type: 'string' },
      caption: { type: 'string' },
      books: {
        type: 'array', minItems: 2, maxItems: 10, items: {
          type: 'object', additionalProperties: false, required: ['title', 'author', 'note'],
          properties: {
            title: { type: 'string' },
            author: { type: 'string' },
            note: { type: 'string' },
            colour: { type: 'string' },
          },
        },
      },
    },
  },
  presets: [
    {
      name: 'Three that changed how I think', params: {
        title: 'Three that changed how I think',
        books: [
          { title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', note: 'Why your gut is confidently wrong.' },
          { title: 'Sapiens', author: 'Yuval Noah Harari', note: 'A cheeky gallop through human history.' },
          { title: 'The Order of Time', author: 'Carlo Rovelli', note: 'Time is stranger, and more local, than you think.' },
        ],
      },
    },
    {
      name: 'Holiday reading', params: {
        title: 'Holiday reading',
        books: [
          { title: 'The Hobbit', author: 'J.R.R. Tolkien', note: 'There and back again.' },
          { title: 'Project Hail Mary', author: 'Andy Weir', note: 'Science, alone, in space — and oddly heart-warming.' },
        ],
      },
    },
  ],
  build(params, domId) {
    const raw = Array.isArray(params.books) ? params.books.slice(0, 10) : [];
    const books = raw.map((b, i) => {
      const colour = /^#[0-9a-fA-F]{3,8}$/.test(b && b.colour || '') ? b.colour : PALETTE[i % PALETTE.length];
      return { title: String(b && b.title || ''), author: String(b && b.author || ''), note: String(b && b.note || ''), colour };
    });
    const title = params.title ? `<div class="pg-bs-title">${esc(params.title)}</div>` : '';
    const caption = params.caption ? `<div class="pg-bs-caption">${esc(params.caption)}</div>` : '';

    const spines = books.map((b, i) =>
      `<button type="button" class="pg-bs-spine" data-role="spine" data-i="${i}" aria-pressed="false" ` +
      `style="--spine:${esc(b.colour)}"><span class="pg-bs-spine-text">${esc(b.title)}</span></button>`
    ).join('');

    const html =
      `<div class="pg-stage">${title}` +
      `<div class="pg-bs-shelf" role="group" aria-label="Bookshelf">` +
      `<div class="pg-bs-row">${spines}</div>` +
      `<div class="pg-bs-board" aria-hidden="true"></div>` +
      `</div>` +
      `<div class="pg-bs-detail" data-role="detail" aria-live="polite">` +
      `<span class="pg-bs-prompt">Pick a book.</span>` +
      `</div>${caption}</div>`;

    const css = [
      `#${domId} .pg-bs-title{font-weight:700;font-size:1.05rem;margin-bottom:.7rem;color:var(--ink,#e9eef8)}`,
      `#${domId} .pg-bs-shelf{display:flex;flex-direction:column;align-items:stretch}`,
      `#${domId} .pg-bs-row{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:center;gap:.45rem;padding:0 .3rem}`,
      `#${domId} .pg-bs-board{height:10px;border-radius:0 0 6px 6px;background:linear-gradient(180deg,#3a2e22,#241b12);box-shadow:0 6px 14px rgba(0,0,0,.45);margin-top:-2px}`,
      `#${domId} .pg-bs-spine{position:relative;width:46px;height:170px;border:1px solid rgba(0,0,0,.35);border-radius:4px 4px 2px 2px;padding:.5rem .2rem;cursor:pointer;font:inherit;` +
        `background:linear-gradient(90deg,rgba(255,255,255,.18),rgba(255,255,255,0) 22%,rgba(0,0,0,.12) 86%,rgba(0,0,0,.28)),var(--spine);` +
        `color:#0a0d14;display:flex;align-items:flex-start;justify-content:center;transition:transform .22s ease,box-shadow .22s ease,filter .22s ease}`,
      `#${domId} .pg-bs-spine-text{writing-mode:vertical-rl;transform:rotate(180deg);font-weight:700;font-size:.8rem;line-height:1.05;letter-spacing:.01em;` +
        `text-shadow:0 1px 0 rgba(255,255,255,.25);overflow:hidden;max-height:150px}`,
      `#${domId} .pg-bs-spine:hover{filter:brightness(1.08)}`,
      `#${domId} .pg-bs-spine:focus-visible{outline:2px solid #fff;outline-offset:2px}`,
      `#${domId} .pg-bs-spine.is-on{transform:translateY(-14px);box-shadow:0 14px 22px rgba(0,0,0,.5);filter:brightness(1.12)}`,
      `#${domId}.pg-bs-reduce .pg-bs-spine{transition:none}`,
      `#${domId}.pg-bs-reduce .pg-bs-spine.is-on{transform:none;outline:2px solid #fff;outline-offset:2px}`,
      `#${domId} .pg-bs-detail{margin-top:1rem;padding:.9rem 1rem;border:1px solid var(--line,#23304a);border-radius:12px;background:rgba(140,160,200,.06);min-height:64px;color:var(--ink-dim,#cdd6e6)}`,
      `#${domId} .pg-bs-prompt{color:var(--ink-dim,#9fb0c8);font-style:italic}`,
      `#${domId} .pg-bs-dt{display:block;font-weight:700;font-size:1.02rem;color:var(--ink,#e9eef8)}`,
      `#${domId} .pg-bs-da{display:block;font-size:.9rem;margin:.1rem 0 .45rem;color:var(--ink-dim,#cdd6e6)}`,
      `#${domId} .pg-bs-dn{display:block;font-size:.95rem;line-height:1.5}`,
      `#${domId} .pg-bs-caption{margin-top:.7rem;font-size:.82rem;color:var(--ink-dim,#9fb0c8)}`,
    ].join('\n');

    const jsBody = `
var BOOKS = (CONFIG.books || []);
if(reduced) root.classList.add('pg-bs-reduce');
var detail = $('[data-role=detail]');
if(!detail) return;
var spines = $$('[data-role=spine]');
if(!spines.length) return;
function clear(){
  spines.forEach(function(s){ s.classList.remove('is-on'); s.setAttribute('aria-pressed','false'); });
}
function prompt(){
  detail.innerHTML = '<span class="pg-bs-prompt">Pick a book.</span>';
}
function show(b){
  detail.textContent = '';
  function row(cls, txt){ var el = document.createElement('span'); el.className = cls; el.textContent = txt; detail.appendChild(el); }
  row('pg-bs-dt', b.title || 'Untitled');
  if(b.author) row('pg-bs-da', b.author);
  if(b.note) row('pg-bs-dn', b.note);
}
spines.forEach(function(s){
  s.addEventListener('click', function(){
    var on = s.classList.contains('is-on');
    clear();
    if(on){ prompt(); return; }
    s.classList.add('is-on'); s.setAttribute('aria-pressed','true');
    var i = parseInt(s.getAttribute('data-i'), 10) || 0;
    show(BOOKS[i] || {});
  });
});
`;
    return { html, css, jsBody };
  },
};
