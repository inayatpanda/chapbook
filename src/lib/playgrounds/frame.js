/* Standard params + titled frame for every playground family.
   injectStdParams() merges a small, consistent set of properties (title/subtitle/
   caption/accent/accentCustom) into a family's object-schema so the Studio form
   shows them everywhere. frameWrap() wraps the built inner html with a heading/
   caption chrome ONLY when those fields are set (else it is a no-op → byte-identical
   to the pre-frame output). Local esc() avoids a circular import with index.js. */
import { ACCENTS } from './accent.js';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const STD_PROPS = {
  title:        { type: 'string', title: 'Title (heading above the widget)', 'x-inline': true, 'x-group': 'Heading' },
  subtitle:     { type: 'string', title: 'Subtitle', 'x-group': 'Heading' },
  caption:      { type: 'string', title: 'Caption (footnote under the widget)', 'x-control': 'textarea', 'x-group': 'Heading' },
  accent:       { type: 'string', enum: ACCENTS, default: 'default', title: 'Accent colour', 'x-control': 'segmented', 'x-group': 'Style' },
  accentCustom: { type: 'string', title: 'Custom accent (hex — used when accent = custom)', 'x-control': 'color', 'x-group': 'Style' },
  maxHeight:    { type: 'string', enum: ['auto', 'short', 'medium', 'tall'], default: 'auto', title: 'Height cap (taller content clips with a Show-all button)', 'x-control': 'segmented', 'x-group': 'Style' },
};

// Height caps in px for the maxHeight std param ('auto' = no cap).
const CLIP_HEIGHTS = { short: 240, medium: 400, tall: 560 };

const STD_KEYS = Object.keys(STD_PROPS);

export function injectStdParams(schema, opts = {}) {
  if (opts.stdParams === false) return schema;
  if (!schema || typeof schema !== 'object' || schema.type !== 'object') return schema;
  const omit = new Set(opts.omitStd || []);
  const props = { ...(schema.properties || {}) };
  for (const k of STD_KEYS) {
    if (omit.has(k)) continue;
    if (k in props) continue;                 // family already declares it — keep theirs
    props[k] = STD_PROPS[k];
  }
  return { ...schema, properties: props };
}

export function frameParams(params = {}) {
  return {
    title: params.title != null ? String(params.title) : '',
    subtitle: params.subtitle != null ? String(params.subtitle) : '',
    caption: params.caption != null ? String(params.caption) : '',
    accent: params.accent || 'default',
    accentCustom: params.accentCustom || '',
    maxHeight: params.maxHeight || 'auto',
  };
}

export function frameWrap({ html, domId, title, subtitle, caption, maxHeight }) {
  const hasHead = !!(title || subtitle);
  const hasCap = !!caption;
  const capPx = CLIP_HEIGHTS[maxHeight];
  if (!hasHead && !hasCap && !capPx) return { html: String(html || ''), css: '', js: '' };
  const head = hasHead
    ? '<div class="pg-frame-head">' +
        (title ? `<div class="pg-frame-title">${esc(title)}</div>` : '') +
        (subtitle ? `<div class="pg-frame-sub">${esc(subtitle)}</div>` : '') +
      '</div>'
    : '';
  const body = `<div class="pg-frame-body">${String(html || '')}</div>`;
  // Height cap: clip the body with a bottom fade + a "Show all" expander OUTSIDE
  // the clipped region. The js measures after the family renders (rAF) and, when
  // the content already fits, opens the clip and hides the button.
  const mid = capPx ? `<div class="pg-frame-clip" data-role="pg-clip">${body}</div>` : body;
  const more = capPx ? '<button type="button" class="pg-frame-more" data-role="pg-more">Show all ▾</button>' : '';
  const cap = hasCap ? `<div class="pg-frame-cap">${esc(caption)}</div>` : '';
  const wrapped = `<div class="pg-frame">${head}${mid}${more}${cap}</div>`;
  const css = [
    `#${domId} .pg-frame-head{margin:0 0 .8rem}`,
    `#${domId} .pg-frame-title{font:650 1.12rem/1.25 var(--font-display,system-ui);color:#fff;letter-spacing:-.01em}`,
    `#${domId} .pg-frame-sub{margin-top:.15rem;font-size:.86rem;color:var(--ink-dim,#9fb3c8)}`,
    `#${domId} .pg-frame-cap{margin-top:.85rem;font-size:.8rem;color:var(--ink-faint,#717d99);line-height:1.5}`,
  ];
  if (capPx) {
    css.push(
      `#${domId} .pg-frame-clip{max-height:${capPx}px;overflow:hidden;position:relative}`,
      `#${domId} .pg-frame-clip.is-open{max-height:none}`,
      `#${domId} .pg-frame-clip:not(.is-open)::after{content:"";position:absolute;left:0;right:0;bottom:0;height:56px;background:linear-gradient(transparent,var(--pg-bg,#0d1322));pointer-events:none}`,
      `#${domId} .pg-frame-more{display:block;margin:.6rem auto 0;min-height:40px;border:1px solid var(--line,#23304a);background:transparent;color:var(--cyan,#22d3ee);border-radius:999px;padding:.45rem 1.1rem;font:600 .8rem system-ui;cursor:pointer}`,
      `#${domId} .pg-frame-more:hover{border-color:var(--cyan,#22d3ee)}`,
    );
  }
  const js = capPx
    ? "var _pgClip=root.querySelector('[data-role=pg-clip]');" +
      "var _pgMore=root.querySelector('[data-role=pg-more]');" +
      "if(_pgClip&&_pgMore){" +
      "_pgMore.addEventListener('click',function(){_pgClip.classList.add('is-open');_pgMore.style.display='none';});" +
      "requestAnimationFrame(function(){if(_pgClip.scrollHeight<=_pgClip.clientHeight+24){_pgClip.classList.add('is-open');_pgMore.style.display='none';}});" +
      "}"
    : '';
  return { html: wrapped, css: css.join('\n'), js };
}
