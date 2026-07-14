/* Lenient JSON extraction from model output. Models (esp. local/ollama and some
   Gemini responses) often wrap JSON in a ```json fence or add a preamble like
   "Here is the JSON:". This strips that and, as a fallback, pulls the first
   balanced {…}/[…] block. Throws if nothing parses — callers wrap as AI_PARSE. */
export function looseJson(text) {
  let s = String(text == null ? '' : text).trim();
  // 1) direct parse (the happy path — strict structured output)
  try { return JSON.parse(s); } catch { /* fall through */ }
  // 2) strip a markdown code fence ```json … ``` (or plain ``` … ```)
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) { try { return JSON.parse(fence[1].trim()); } catch { s = fence[1].trim(); } }
  // 3) extract the first balanced object/array, ignoring quoted braces
  const start = s.search(/[{[]/);
  if (start >= 0) {
    const open = s[start], close = open === '{' ? '}' : ']';
    let depth = 0, inStr = false, esc = false;
    for (let i = start; i < s.length; i++) {
      const c = s[i];
      if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
      if (c === '"') inStr = true;
      else if (c === open) depth++;
      else if (c === close && --depth === 0) return JSON.parse(s.slice(start, i + 1));
    }
  }
  throw new Error('no parseable JSON in model output');
}
