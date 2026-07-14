// Pure editor-navigation rules — which primary tab the block editor highlights,
// and where/what its back button points to, depending on HOW the editor was
// entered. Mirrors the context-aware logic in the Studio's inline module
// (public/studio/index.html): a brand-NEW post belongs to the Write tab (back →
// the New-post landing, no auto-picker), while editing an EXISTING post belongs
// to the Posts tab (back → the Posts list). Extracted so the rule is unit-tested.

// The two entry points and the section each implies.
export const ENTRY_NEW = 'startNewPost';       // → Write
export const ENTRY_EXISTING = 'openBlockEditor'; // → Posts

/* Given how the editor was opened, return the section the editor highlights. */
export function editorSectionFor(entry) {
  return entry === ENTRY_NEW ? 'write' : 'posts';
}

/* The back-button label for a given editorSection. */
export function editorBackLabel(editorSection) {
  return editorSection === 'write' ? '← Write' : '← Posts';
}

/* The view the back button navigates to for a given editorSection.
   'write'  → the New-post LANDING ('newpost') — never the template picker.
   'posts'  → the Posts list ('posts'). */
export function editorBackTarget(editorSection) {
  return editorSection === 'write' ? 'newpost' : 'posts';
}

/* The primary nav tab the editor highlights — same as the section. Kept as its
   own function so the highlight rule has a single named source of truth. */
export function editorHighlightSection(editorSection) {
  return editorSection === 'write' ? 'write' : 'posts';
}
