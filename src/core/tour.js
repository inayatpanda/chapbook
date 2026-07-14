// First-run "write your first post" tour — PURE step model + state logic. No DOM.
// The inline UI (index.html, window.__studioTour) renders these steps in a small
// coach card; app.js flags the tour as pending right after a blog is created so it
// auto-opens exactly once. Reuses the same localStorage-dismissal idea as the
// "Getting started" checklist, but with its own keys. Unit-tested (tour.test.mjs)
// with an injected fake store; the browser default is used when no store is passed.

// The four light steps a brand-new writer walks: template → write → image → publish.
export const TOUR_STEPS = [
  { id: 'template', section: 'write', title: 'Pick a template',
    body: 'Open Write → New post and choose a starting template. It gives your first post a shape you can edit.' },
  { id: 'write', section: 'write', title: 'Write your post',
    body: 'Type in the editor — a title and a few paragraphs is plenty. Everything saves to a draft as you go.' },
  { id: 'image', section: 'media', title: 'Add an image',
    body: 'Use an image block (or the Darkroom) to drop in a photo. Images commit to your GitHub repo — free, no extra setup.' },
  { id: 'interactive', section: 'write', title: 'Make it interactive',
    body: 'Tap ✦ Interactive to drop in a poll, quiz, chart or timeline — pick a template, set a title, done. Or sketch a flipbook in ◆ Figure → Draw.' },
  { id: 'publish', section: 'posts', title: 'Publish',
    body: 'Happy with it? Publish. Your post commits to your repo and GitHub Pages rebuilds your blog automatically.' },
];

// localStorage keys — namespaced like the existing helm.studio.* flags.
export const TOUR_DONE_KEY = 'helm.studio.firstPostTour.done';
export const TOUR_PENDING_KEY = 'helm.studio.firstPostTour.pending';

// Browser default store (used when callers pass no store). Guarded for non-DOM/test envs.
const browserStore = (typeof localStorage !== 'undefined') ? {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  remove: (k) => { try { localStorage.removeItem(k); } catch {} },
} : null;
const S = (store) => store || browserStore;

// --- step navigation (pure index maths) ---
export function tourStepCount() { return TOUR_STEPS.length; }
export function clampStep(i) {
  i = Number(i); if (!Number.isFinite(i) || i < 0) return 0;
  const max = TOUR_STEPS.length - 1;
  return i > max ? max : Math.floor(i);
}
export function tourStepAt(i) { return TOUR_STEPS[clampStep(i)] || null; }
export function isLastStep(i) { return clampStep(i) === TOUR_STEPS.length - 1; }

// --- state (pending / done) ---
export function markPending(store) { const s = S(store); if (s) s.set(TOUR_PENDING_KEY, '1'); }
export function clearPending(store) { const s = S(store); if (s) s.remove(TOUR_PENDING_KEY); }
export function isPending(store) { const s = S(store); return !!(s && s.get(TOUR_PENDING_KEY)); }
export function markDone(store) { const s = S(store); if (s) { s.set(TOUR_DONE_KEY, '1'); s.remove(TOUR_PENDING_KEY); } }
export function isDone(store) { const s = S(store); return !!(s && s.get(TOUR_DONE_KEY)); }
export function resetTour(store) { const s = S(store); if (s) { s.remove(TOUR_DONE_KEY); s.remove(TOUR_PENDING_KEY); } }

// Should the tour auto-open on boot? Only right after a blog was created (pending set)
// and never yet completed/dismissed. The reopen button ignores this and always opens.
export function shouldAutoOpen(store) { return isPending(store) && !isDone(store); }
