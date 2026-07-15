// Pure helpers for the schema→form renderer's richer, mobile-first controls.
// MIRRORED VERBATIM into public/studio/index.html's inline module — keep the two
// in lockstep; this test file pins the canonical behaviour.

export const PALETTE_SWATCHES = ['#2dd4bf', '#22d3ee', '#818cf8', '#f59e0b', '#fb7185', '#e2e8f0'];

const STD_ONLY = new Set(['subtitle', 'caption', 'accent', 'accentCustom']);

export function resolveControl(schema) {
  if (!schema || typeof schema !== 'object') return 'text';
  const x = schema['x-control'];
  if (x === 'color' || x === 'slider' || x === 'textarea' || x === 'segmented') return x;
  const t = schema.type;
  if (t === 'boolean') return 'checkbox';
  if (t === 'number' || t === 'integer') {
    return (typeof schema.minimum === 'number' && typeof schema.maximum === 'number') ? 'slider' : 'number';
  }
  if (t === 'string') {
    if (Array.isArray(schema.enum) && schema.enum.length) return schema.enum.length <= 4 ? 'segmented' : 'select';
    return 'text';
  }
  return 'text';
}

export function groupFields(properties) {
  const order = [];
  const groups = {};
  for (const key of Object.keys(properties || {})) {
    const g = (properties[key] && properties[key]['x-group']) || '';
    if (!(g in groups)) { groups[g] = []; order.push(g); }
    groups[g].push(key);
  }
  order.sort((a, b) => (a === '' ? -1 : b === '' ? 1 : 0));
  return order.map((g) => ({ group: g, keys: groups[g] }));
}

export function collectInlineFields(schema) {
  const props = (schema && schema.properties) || {};
  const keys = Object.keys(props);
  const declared = keys.filter((k) => props[k] && props[k]['x-inline'] === true);
  const out = declared.length ? declared.slice() : ('title' in props ? ['title'] : []);
  // The injected std `title` declares x-inline on every family — if it is the ONLY
  // inline field, add the family's first own string field so the inline editor
  // covers "title + key field", not just the heading.
  if (out.length === 1 && out[0] === 'title') {
    const firstStr = keys.find((k) => props[k] && props[k].type === 'string' && !props[k].enum && k !== 'title' && !STD_ONLY.has(k));
    if (firstStr) out.push(firstStr);
  }
  return out;
}

export function moveItem(arr, from, to) {
  if (!Array.isArray(arr)) return arr;
  if (from < 0 || from >= arr.length || to < 0 || to >= arr.length || from === to) return arr;
  const [it] = arr.splice(from, 1);
  arr.splice(to, 0, it);
  return arr;
}
