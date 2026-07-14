/**
 * Interactive template library (Helm-local; never deployed by itself).
 *
 * A small set of heavily-parameterised "families". Each family is written + tested
 * ONCE; the author fills a param form and the Helm bakes a concrete `playground`
 * block (the same shape server/blocks.js serialises). Families × presets × params
 * → hundreds of concrete interactives, with the interaction code fixed and correct.
 *
 * Contract — each family module default-exports:
 *   { id, name, category, description, paramsSchema, presets:[{name,params}], build(params, domId) }
 *   build() returns { html, css, jsBody } where:
 *     - html : INNER markup only (NO outer .playground wrapper — blocks.js adds it).
 *              Address interactive elements with data-role="…" (NOT ids) so multiple
 *              instances on one page never collide.
 *     - css  : style rules; selectors MUST be prefixed with `#${domId}` for page-safety.
 *     - jsBody : the family logic. Runs inside a wrapper that provides, in scope:
 *              CONFIG (the params + {domId}), root (the .playground element),
 *              reduced (prefers-reduced-motion bool), $(sel)/$$(sel) scoped to root.
 *              Vanilla JS only; re-runs on client navigation (re-query each run).
 */
import { families as registry } from './registry.js';
import { injectStdParams, frameParams, frameWrap } from './frame.js';
import { applyAccent } from './accent.js';

export function listFamilies() {
  return Object.values(registry).map((f) => ({
    id: f.id, name: f.name, category: f.category, description: f.description,
    paramsSchema: injectStdParams(f.paramsSchema, { stdParams: f.stdParams, omitStd: f.omitStd }),
    presets: (f.presets || []).map((p) => ({ name: p.name })),
  }));
}

export function getFamily(id) {
  const f = registry[id];
  if (!f) throw Object.assign(new Error(`Unknown playground family: ${id}`), { code: 'PG_FAMILY', status: 400 });
  return f;
}

export function getPreset(id, name) {
  const f = getFamily(id);
  const p = (f.presets || []).find((x) => x.name === name);
  return p ? p.params : null;
}

const SAFE_ID = /^[a-zA-Z][\w-]*$/;

/**
 * Build a concrete playground block from a family + params.
 * Returns a block: { id, type:'playground', domId, html, css, js } — ready to drop
 * into a doc and serialise. The family's jsBody is wrapped with CONFIG/root/reduced/$.
 */
export function buildInstance(familyId, params = {}, domId) {
  const f = getFamily(familyId);
  const id = domId && SAFE_ID.test(domId) ? domId : `pg-${familyId}-${idHash(JSON.stringify(params))}`;
  const { html, css, jsBody } = f.build(params, id);
  // Titled frame + accent re-tint (both no-ops when title/subtitle/caption are
  // empty and accent is 'default' — existing content builds byte-identically).
  const fp = frameParams(params);
  const framed = frameWrap({ html, domId: id, title: fp.title, subtitle: fp.subtitle, caption: fp.caption, maxHeight: fp.maxHeight });
  const mergedCss = framed.css ? (framed.css + '\n' + String(css || '')) : String(css || '');
  const finalCss = applyAccent(mergedCss, fp.accent, fp.accentCustom, id);
  const config = JSON.stringify({ domId: id, ...params });
  const js = [
    '(function(){',
    `var CONFIG=${config};`,
    `var root=document.getElementById(${JSON.stringify(id)});`,
    'if(!root)return;',
    "var reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;",
    'var $=function(s){return root.querySelector(s);};',
    'var $$=function(s){return Array.prototype.slice.call(root.querySelectorAll(s));};',
    // frame js (height-cap expander) runs BEFORE the family body — a family's
    // early `return` must not skip it; its rAF measures after the family renders.
    String(framed.js || '').trim(),
    String(jsBody || '').trim(),
    '})();',
  ].join('\n');
  return { id: 'pg-' + idHash(id), type: 'playground', domId: id, html: framed.html, css: finalCss, js };
}

// tiny deterministic id suffix (no Math.random — keeps builds reproducible)
function idHash(s) {
  let h = 0;
  for (let i = 0; i < String(s).length; i++) h = (h * 31 + s.charCodeAt(i)) % 1e9;
  return h.toString(36);
}

// small shared helpers families may import
export const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
