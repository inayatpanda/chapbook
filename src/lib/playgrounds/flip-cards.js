/* Family: flip cards — a deck of tap-to-flip cards (front prompt → back reveal).
   For "N myths about X", term→definition, claim→verdict. Distinct from quiz-reveal
   (a single question): this is a browsable grid of independent cards. */
import { esc } from './index.js';

export default {
  id: 'flip-cards',
  name: 'Flip cards',
  category: 'reveal',
  description: 'A deck of tap-to-flip cards (prompt on the front, reveal on the back). For myths, definitions, claim→verdict.',
  paramsSchema: {
    type: 'object', additionalProperties: false,
    required: ['cards'],
    properties: {
      title: { type: 'string', title: 'Optional label above the deck' },
      columns: { type: 'number', title: 'Columns (desktop)', default: 2, minimum: 1, maximum: 4 },
      accent: { type: 'string', title: 'Back-face accent (hex)', default: '#22d3ee' },
      cards: {
        type: 'array', title: 'Cards', minItems: 1, maxItems: 12,
        items: {
          type: 'object', additionalProperties: false, required: ['front', 'back'],
          properties: {
            front: { type: 'string', title: 'Front (the prompt / myth / term)' },
            back: { type: 'string', title: 'Back (the reveal / verdict)' },
            tag: { type: 'string', title: 'Tiny tag on the back (e.g. Myth, True)' },
          },
        },
      },
    },
  },
  presets: [
    {
      name: 'Myth-buster',
      params: {
        title: 'Three things people get wrong about bread', columns: 3, accent: '#22d3ee',
        cards: [
          { front: '“Kneading longer always makes a better loaf.”', back: 'Past a point it does little — time and folding build the same structure with less effort.', tag: 'Myth' },
          { front: '“A loaf is done when the top looks golden.”', back: 'Usually a good sign — but colour and doneness differ. A tap or a probe tells you more.', tag: 'Mostly' },
          { front: '“Fresh from the oven is the best time to slice.”', back: 'The crumb is still setting. Cutting too soon leaves it gummy; let it cool first.', tag: 'Myth' },
        ],
      },
    },
    {
      name: 'Term → meaning',
      params: {
        title: 'Three words typographers use', columns: 3, accent: '#818cf8',
        cards: [
          { front: 'Kerning', back: 'Adjusting the space between two particular letters so the word looks even.', tag: 'Term' },
          { front: 'Leading', back: 'The vertical space between lines of type. Named after the strips of lead once used.', tag: 'Term' },
          { front: 'Ligature', back: 'Two letters drawn as one shape — like “fi” — to avoid an awkward collision.', tag: 'Term' },
        ],
      },
    },
  ],
  build(params, domId) {
    const cards = Array.isArray(params.cards) ? params.cards.slice(0, 12) : [];
    const columns = Math.max(1, Math.min(4, Math.round(params.columns || 2)));
    const accent = /^#[0-9a-fA-F]{3,8}$/.test(params.accent || '') ? params.accent : '#22d3ee';
    const title = params.title ? `<div class="pg-fc-title">${esc(params.title)}</div>` : '';
    const cardsHtml = cards.map((c, i) =>
      `<button type="button" class="pg-fc-card" data-role="card" aria-pressed="false">` +
      `<span class="pg-fc-face pg-fc-front">${esc(c.front)}<span class="pg-fc-hint">tap to reveal</span></span>` +
      `<span class="pg-fc-face pg-fc-back">${c.tag ? `<span class="pg-fc-tag">${esc(c.tag)}</span>` : ''}<span>${esc(c.back)}</span></span>` +
      `</button>`).join('');
    const html =
      `<div class="pg-stage">${title}<div class="pg-fc-grid" data-role="grid">${cardsHtml}</div></div>`;
    const css = [
      `#${domId} .pg-fc-title{font-size:.9rem;color:var(--ink-dim,#9fb3c8);margin:0 0 .8rem}`,
      `#${domId} .pg-fc-grid{display:grid;grid-template-columns:1fr;gap:.7rem}`,
      `@media(min-width:560px){#${domId} .pg-fc-grid{grid-template-columns:repeat(${columns},1fr)}}`,
      `#${domId} .pg-fc-card{position:relative;display:block;width:100%;min-height:130px;border:0;background:transparent;padding:0;cursor:pointer;font:inherit;text-align:left;perspective:1000px}`,
      `#${domId} .pg-fc-face{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;gap:.5rem;padding:1rem 1.1rem;border-radius:12px;border:1px solid var(--line,#23304a);backface-visibility:hidden;transition:transform .5s;line-height:1.45}`,
      `#${domId} .pg-fc-front{background:rgba(140,160,200,.06);color:var(--ink,#e9eef8);font-weight:600}`,
      `#${domId} .pg-fc-back{background:rgba(34,211,238,.06);border-color:${accent}55;color:var(--ink-dim,#cdd6e6);transform:rotateY(180deg);font-size:.92rem}`,
      `#${domId} .pg-fc-card.flipped .pg-fc-front{transform:rotateY(180deg)}`,
      `#${domId} .pg-fc-card.flipped .pg-fc-back{transform:rotateY(360deg)}`,
      `#${domId} .pg-fc-hint{font-size:.7rem;font-weight:500;color:var(--ink-faint,#8aa0b8);text-transform:uppercase;letter-spacing:.08em}`,
      `#${domId} .pg-fc-tag{align-self:flex-start;font-size:.66rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:${accent};border:1px solid ${accent}66;border-radius:99px;padding:.1em .6em}`,
      `#${domId}.pg-fc-reduce .pg-fc-face{transition:none}`,
    ].join('\n');
    const jsBody = `
if(reduced)root.classList.add('pg-fc-reduce');
$$('[data-role=card]').forEach(function(card){
  card.addEventListener('click',function(){
    var f=card.classList.toggle('flipped');
    card.setAttribute('aria-pressed',f?'true':'false');
  });
});
`;
    return { html, css, jsBody };
  },
};
