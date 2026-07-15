import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TOUR_STEPS,
  TOUR_DONE_KEY,
  TOUR_PENDING_KEY,
  tourStepCount,
  clampStep,
  tourStepAt,
  isLastStep,
  markPending,
  clearPending,
  isPending,
  markDone,
  isDone,
  resetTour,
  shouldAutoOpen,
} from './tour.js';

// A tiny in-memory store matching the { get, set, remove } shape the module expects.
function fakeStore(seed = {}) {
  const m = new Map(Object.entries(seed));
  return {
    get: (k) => (m.has(k) ? m.get(k) : null),
    set: (k, v) => m.set(k, v),
    remove: (k) => m.delete(k),
    _map: m,
  };
}

// --- step model ---
test('TOUR_STEPS is the ordered template→write→image→interactive→publish walk', () => {
  assert.equal(tourStepCount(), 5);
  assert.deepEqual(TOUR_STEPS.map((s) => s.id), ['template', 'write', 'image', 'interactive', 'publish']);
  assert.ok(TOUR_STEPS.every((s) => s.title && s.body && s.section));
});
test('clampStep clamps out-of-range / bad input into [0, last]', () => {
  assert.equal(clampStep(-5), 0);
  assert.equal(clampStep(0), 0);
  assert.equal(clampStep(2), 2);
  assert.equal(clampStep(99), 4);
  assert.equal(clampStep(NaN), 0);
  assert.equal(clampStep(1.9), 1);
});
test('tourStepAt returns the step object and clamps', () => {
  assert.equal(tourStepAt(0).id, 'template');
  assert.equal(tourStepAt(99).id, 'publish');
});
test('isLastStep is true only on the final index', () => {
  assert.equal(isLastStep(0), false);
  assert.equal(isLastStep(3), false);
  assert.equal(isLastStep(4), true);
  assert.equal(isLastStep(99), true);
});

// --- state ---
test('markPending / isPending / clearPending round-trip', () => {
  const s = fakeStore();
  assert.equal(isPending(s), false);
  markPending(s);
  assert.equal(isPending(s), true);
  assert.equal(s.get(TOUR_PENDING_KEY), '1');
  clearPending(s);
  assert.equal(isPending(s), false);
});
test('markDone sets the done flag AND clears pending', () => {
  const s = fakeStore();
  markPending(s);
  markDone(s);
  assert.equal(isDone(s), true);
  assert.equal(s.get(TOUR_DONE_KEY), '1');
  assert.equal(isPending(s), false);
});
test('resetTour clears both flags', () => {
  const s = fakeStore({ [TOUR_DONE_KEY]: '1', [TOUR_PENDING_KEY]: '1' });
  resetTour(s);
  assert.equal(isDone(s), false);
  assert.equal(isPending(s), false);
});

// --- auto-open decision ---
test('shouldAutoOpen only when pending AND not done', () => {
  assert.equal(shouldAutoOpen(fakeStore()), false);                                  // neither
  assert.equal(shouldAutoOpen(fakeStore({ [TOUR_PENDING_KEY]: '1' })), true);        // just created
  assert.equal(shouldAutoOpen(fakeStore({ [TOUR_PENDING_KEY]: '1', [TOUR_DONE_KEY]: '1' })), false); // already dismissed
  assert.equal(shouldAutoOpen(fakeStore({ [TOUR_DONE_KEY]: '1' })), false);          // done, not pending
});
test('after a blog is created then the tour is finished, it never auto-opens again', () => {
  const s = fakeStore();
  markPending(s);                         // blog just created
  assert.equal(shouldAutoOpen(s), true);
  markDone(s);                            // user finished / skipped
  assert.equal(shouldAutoOpen(s), false);
  markPending(s);                         // even a later create won't re-nag once done
  assert.equal(shouldAutoOpen(s), false);
});
