// Technical origin metadata, not a claim of factual accuracy or a C2PA signature.
// It deliberately excludes prompts, source documents, keys and personal details.
const token = value => String(value || '').replace(/[^a-zA-Z0-9_./:-]/g, '').slice(0, 100);
export function cleanProvenance(value) {
  if (!Array.isArray(value)) return [];
  const unique = new Map();
  for (const item of value.slice(0, 100)) {
    if (!item || !['generated', 'assisted'].includes(item.kind)) continue;
    const entry = { kind: item.kind, tool: token(item.tool) || 'AI', action: token(item.action) || 'generation' };
    unique.set(JSON.stringify(entry), entry);
  }
  return [...unique.values()];
}
export function postProvenance(doc, meta = {}) {
  return cleanProvenance([...(meta.aiProvenance || []), ...(doc?.aiProvenance || []), ...(doc?.blocks || []).flatMap(b => b.aiProvenance || [])]);
}
export function provenanceMarkup(value) {
  const entries = cleanProvenance(value);
  if (!entries.length) return '';
  // Safe JSON inside an inert HTML comment survives Markdown exports. Published
  // block HTML also carries a semantic data attribute, including on older sites.
  return `<!-- chapbook-ai-origin:${JSON.stringify(entries)} -->\n`;
}
