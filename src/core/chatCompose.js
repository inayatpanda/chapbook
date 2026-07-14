// Pure logic for the Studio's Chat writing mode — which words a tapped block
// binds to the chatbox, how Enter behaves, and the html↔chat-text conversion.
// DOM-free and unit-tested; the inline module (public/studio/index.html) mirrors
// chatFieldFor/enterSends and imports nothing from here at runtime (the local
// build has no bundle). Keep the two in lockstep.

/* Which editable words a block offers the chatbox.
   Returns { field, label, md } — field names the block property, md means the
   text round-trips through the inline markdown converters. null = no words
   (select-only: gallery, table, divider, raw, hand-authored playgrounds). */
export function chatFieldFor(block) {
  if (!block || typeof block !== 'object') return null;
  switch (block.type) {
    case 'text':    return { field: 'html', label: 'paragraph', md: true };
    case 'heading': return { field: 'text', label: 'heading', md: false };
    case 'quote':   return { field: 'html', label: 'quote', md: true };
    case 'image':   return { field: 'caption', label: 'image caption', md: false };
    case 'embed':   return { field: 'caption', label: 'video caption', md: false };
    case 'figure':  return { field: 'caption', label: 'figure caption', md: false };
    case 'playground':
      return (block.template && block.template.familyId)
        ? { field: 'title', label: 'interactive title', md: false }
        : null;
    default: return null;
  }
}

/* WhatsApp rule everywhere: Enter is always a new paragraph; only ➤ (Send) commits.
   (Parameter kept for signature stability — behaviour no longer differs by pointer.) */
export function enterSends() { return false; }

/* The editing-state chip for a bound block: "Editing · Heading" (the bar's ✕ / Esc
   releases). With nothing bound the bar shows the plain write prompt instead. */
export function stripLabel(block) {
  const f = chatFieldFor(block);
  if (!f) return 'No text here — use the block’s own controls';
  return `Editing · ${f.label.charAt(0).toUpperCase()}${f.label.slice(1)}`;
}

/* Fast-path test: a single plain line (no md structure, no newline) can append
   as a local text block without the md-import round-trip. */
export function isPlainParagraph(text) {
  const t = String(text == null ? '' : text).trim();
  if (!t || /\n/.test(t)) return false;
  return !/^(#{1,6} |> |[-*] |\d+\. |```)/.test(t);
}

/* Minimal html → chat-text: enough to round-trip what the chatbox writes back
   via the inline md→html converter (bold/italic/links/line breaks); everything
   else is stripped to its text. NOT a general converter — a chat-editing aid. */
export function htmlToChatText(html) {
  let s = String(html == null ? '' : html);
  s = s.replace(/<br\s*\/?>(?=.)/gi, '\n').replace(/<br\s*\/?>/gi, '');
  s = s.replace(/<\/(p|div)>\s*<(p|div)[^>]*>/gi, '\n');
  s = s.replace(/<(strong|b)>([\s\S]*?)<\/\1>/gi, '**$2**');
  s = s.replace(/<(em|i)>([\s\S]*?)<\/\1>/gi, '*$2*');
  s = s.replace(/<code>([\s\S]*?)<\/code>/gi, '`$1`');
  s = s.replace(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');
  s = s.replace(/<[^>]+>/g, '');
  s = s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
  return s.trim();
}
