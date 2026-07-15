// Pure schema-form helpers — the read/write/default primitives used by the
// Studio's generic "schema → form" renderer (the interactive-template picker AND
// the figure panel). Extracted here so the guards are unit-testable.
//
// These mirror EXACTLY the same-named helpers in the Studio's inline module
// (public/studio/index.html). The index.html inline module is NOT bundled from
// here (it's the local server build), so any behavioural change must be applied
// in BOTH places — these tests pin the contract.
//
// ROOT-CAUSE GUARD (the "reading 'accent'" crash): renderSchemaForm() can be
// handed an UNDEFINED params object when a family's schema is malformed/missing
// and schemaDefault() returns undefined. The recursive renderer then calls
// getVal(parent=undefined, key). Reading parent[key] on undefined throws
// "Cannot read properties of undefined (reading '<key>')" — and for any figure
// family whose schema carries an `accent` field (e.g. flashcards) the key IS
// 'accent', which is the crash the owner saw. getVal() must never read off a
// nullish parent; coerceParams() guarantees a usable object at the entry point.

/* get/set helpers that work for both object keys and array indices */
export function getVal(parent, key, schema) {
  if (key == null) return parent;            // node IS the value (rare top-level primitive)
  // GUARD: a malformed/missing schema can leave `parent` undefined here. Never
  // read a property off a nullish parent — fall back to the schema default.
  if (parent == null) return schema && 'default' in schema ? schema.default : undefined;
  const v = parent[key];
  if (v === undefined && schema && 'default' in schema) return schema.default;
  return v;
}

export function setVal(parent, key, v) {
  if (key == null) return;                   // top-level primitive: nothing to bind
  if (parent == null) return;                // nothing to bind into (defensive)
  if (v === undefined) delete parent[key]; else parent[key] = v;
}

/* Build a default value for a schema node (objects recurse; arrays default to
   [] unless a `default` is given; primitives use `default` then a type zero). */
export function schemaDefault(schema) {
  if (!schema || typeof schema !== 'object') return undefined;
  if ('default' in schema) return structuredClone(schema.default);
  const t = schema.type;
  if (t === 'object') {
    const o = {};
    const props = schema.properties || {};
    for (const k of Object.keys(props)) o[k] = schemaDefault(props[k]);
    return o;
  }
  if (t === 'array') return [];
  if (t === 'number' || t === 'integer') return 0;
  if (t === 'boolean') return false;
  if (t === 'string') return (schema.enum && schema.enum.length) ? schema.enum[0] : '';
  return undefined;
}

/* shallow-recursive merge: overlay wins; objects merge, arrays/scalars replace */
export function deepMerge(base, over) {
  if (Array.isArray(over)) return structuredClone(over);
  if (over && typeof over === 'object') {
    const out = (base && typeof base === 'object' && !Array.isArray(base)) ? { ...base } : {};
    for (const k of Object.keys(over)) out[k] = deepMerge(out[k], over[k]);
    return out;
  }
  return over === undefined ? base : over;
}

/* Coerce whatever was handed to renderSchemaForm() as `params` into a usable
   mutable container that matches the schema's shape. This is the single guard
   that stops the "reading 'accent'" crash at the form-entry boundary: an
   object schema always yields an object; an array schema an array; anything
   else (or a nullish params) yields a safe default the renderer can bind into. */
export function coerceParams(schema, params) {
  if (params != null && typeof params === 'object') return params;
  const seeded = schemaDefault(schema);
  if (seeded != null && typeof seeded === 'object') return seeded;
  // object-typed schema with no usable default → empty object; otherwise {} is
  // still a safe container (primitive top-level forms bind via key==null).
  return {};
}
