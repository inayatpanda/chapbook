/* Tests for the three interactive HTML-drop families: poll, scratch-reveal,
   swipe-carousel. Each must build() to non-empty, self-contained markup + js that
   contains its key content and breaks NONE of the playground rules (no on* inline
   handlers, no fetch/network, no localStorage), and all three must be registered. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { families } from './registry.js';
import { listFamilies, buildInstance } from './index.js';

// A built instance's combined surface (html + css + js) must obey the playground rules.
function assertSelfContained(inst, label) {
  const surface = (inst.html || '') + '\n' + (inst.css || '') + '\n' + (inst.js || '');
  assert.ok((inst.html || '').length > 0, `${label}: non-empty html`);
  assert.ok((inst.js || '').length > 0, `${label}: non-empty js`);
  // No inline on* event handlers (e.g. onclick=, onload=).
  assert.ok(!/\son\w+\s*=/.test(surface), `${label}: no inline on* handlers`);
  // No network.
  assert.ok(!/fetch\s*\(/.test(surface), `${label}: no fetch()`);
  assert.ok(!/XMLHttpRequest/.test(surface), `${label}: no XMLHttpRequest`);
  // No storage.
  assert.ok(!/localStorage|sessionStorage/.test(surface), `${label}: no web storage`);
  // Scoped to the instance domId (collision-safe across multiple on one page).
  assert.ok(inst.domId && (inst.css || '').includes('#' + inst.domId), `${label}: css scoped by #domId`);
  assert.ok(inst.js.includes(JSON.stringify(inst.domId)), `${label}: js scoped by domId`);
}

test('registry: all three interactive-drop families are registered', () => {
  for (const id of ['poll', 'scratch-reveal', 'swipe-carousel']) {
    assert.ok(families[id], `family "${id}" is registered`);
  }
  const ids = listFamilies().map((f) => f.id);
  assert.ok(ids.includes('poll') && ids.includes('scratch-reveal') && ids.includes('swipe-carousel'),
    'listFamilies() includes all three');
});

test('poll: builds, shows the question + options, self-contained (pick + bars)', () => {
  // showResults:'none' — pick-only
  const a = buildInstance('poll', {
    question: 'Best first step?', options: ['Look', 'Feel', 'Move'], showResults: 'none',
  });
  assertSelfContained(a, 'poll/none');
  assert.ok(a.html.includes('Best first step?'), 'poll: question rendered');
  assert.ok(a.html.includes('Look') && a.html.includes('Move'), 'poll: options rendered');
  assert.ok(a.html.includes('role="radiogroup"'), 'poll: radiogroup semantics');
  assert.ok(/you chose/i.test(a.css) || /you chose/i.test(a.js), 'poll: has a "you chose" pick state');

  // showResults:'bars' — author-weighted distribution
  const b = buildInstance('poll', {
    question: 'Commonest?', options: [{ label: 'ACL', weight: 60 }, { label: 'MCL', weight: 40 }], showResults: 'bars',
  });
  assertSelfContained(b, 'poll/bars');
  assert.ok(b.html.includes('Commonest?') && b.html.includes('ACL'), 'poll/bars: content rendered');
  assert.ok(b.html.includes('data-role="bar"'), 'poll/bars: has bar elements');
});

test('scratch-reveal: builds, hides reveal text behind a canvas, self-contained', () => {
  const inst = buildInstance('scratch-reveal', {
    title: 'The answer', coverLabel: 'Scratch me', revealText: 'The axillary nerve.', color: '#2dd4bf',
  });
  assertSelfContained(inst, 'scratch-reveal');
  assert.ok(inst.html.includes('The axillary nerve.'), 'scratch: reveal text present');
  assert.ok(inst.html.includes('Scratch me'), 'scratch: cover label present');
  assert.ok(/<canvas/.test(inst.html), 'scratch: has a <canvas>');
  assert.ok(inst.html.includes('Reveal all'), 'scratch: has a reveal-all affordance');
  assert.ok(/touch-action:\s*none/.test(inst.css), 'scratch: touch-action:none on the scratch surface');
  assert.ok(/pg-scr-reveal/.test(inst.css) && /reduced/.test(inst.js), 'scratch: reduced-motion fallback path');
});

test('swipe-carousel: builds, renders slides + dots, self-contained', () => {
  const inst = buildInstance('swipe-carousel', {
    title: 'Tips', loop: true,
    slides: [{ title: 'One', text: 'First card.' }, { title: 'Two', text: 'Second card.' }, { emoji: '🤚', title: 'Three' }],
  });
  assertSelfContained(inst, 'swipe-carousel');
  assert.ok(inst.html.includes('First card.') && inst.html.includes('Two'), 'carousel: slide content present');
  assert.ok((inst.html.match(/data-role="card"/g) || []).length === 3, 'carousel: one card per slide');
  assert.ok((inst.html.match(/data-role="dot"/g) || []).length === 3, 'carousel: one dot per slide');
  assert.ok(inst.html.includes('aria-label="Next slide"'), 'carousel: prev/next controls');
  assert.ok(/ArrowRight/.test(inst.js) && /ArrowLeft/.test(inst.js), 'carousel: keyboard arrows');
  assert.ok(/pointerdown/.test(inst.js), 'carousel: pointer-based swipe');
});

test('collision-safe: two poll instances on one page get distinct domIds + scopes', () => {
  const a = buildInstance('poll', { question: 'Q?', options: ['x', 'y'] }, 'pg-poll-aaa');
  const b = buildInstance('poll', { question: 'Q?', options: ['x', 'y'] }, 'pg-poll-bbb');
  assert.notEqual(a.domId, b.domId, 'distinct domIds');
  assert.ok(a.css.includes('#pg-poll-aaa') && !a.css.includes('#pg-poll-bbb'), 'instance A css scoped to A only');
  assert.ok(b.js.includes('"pg-poll-bbb"'), 'instance B js targets B');
});
