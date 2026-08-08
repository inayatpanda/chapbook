import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extractLegalBlock, LEGAL_TITLES } from './src/marketing/build-marketing.mjs';

const html = readFileSync(new URL('./src/index.html', import.meta.url), 'utf8');

test('first-use gate is mandatory, versioned and uses three separate affirmative checks', () => {
  const gate = html.match(/<div id="legalConsentGate"[\s\S]*?<script>[\s\S]*?<\/script>/)?.[0] || '';
  assert.match(gate, /2026-08-08/);
  assert.match(gate, /chapbook\.legalConsent\.v1/);
  assert.match(gate, /I have read and agree/);
  assert.match(gate, /I acknowledge/);
  assert.match(gate, /at least 16/);
  assert.equal((gate.match(/type="checkbox"/g) || []).length, 3);
  assert.match(gate, /id="lcAccept"[^>]*disabled/);
  assert.match(gate, /method:'clickwrap'/);
});

test('legal centre exports every public launch document from the in-app source', () => {
  const expected = ['legal', 'privacy', 'terms', 'refunds', 'ai', 'storage', 'acceptable', 'accessibility'];
  assert.deepEqual(Object.keys(LEGAL_TITLES), expected);
  for (const kind of expected) {
    const block = extractLegalBlock(html, kind);
    assert.ok(block.length > 180, `${kind} legal block should be substantive`);
  }
});

test('AI interaction is disclosed on the Partner surface before the conversation starts', () => {
  const section = html.match(/<section class="view" id="v-partner">[\s\S]*?<\/section>/)?.[0] || '';
  assert.match(section, /AI writing partner/);
  assert.match(section, /may be inaccurate/);
  assert.match(section, /before publishing/);
});
