// The Twemoji filename rule is the one subtle thing in scripts/stage-emoji.mjs, and it
// fails QUIETLY: get it wrong and a slice of the set 404s, leaving a picker with holes in
// it rather than an error. The staging script guards the aggregate (it exits non-zero if
// more than 5% are missing); these pin the rule itself so a regression is named, not just
// counted.
import { test } from 'node:test';
import assert from 'node:assert';
import { twemojiCode } from '../scripts/stage-emoji.mjs';

test('a plain single-codepoint emoji maps to its hex', () => {
  assert.equal(twemojiCode('😀'), '1f600');   // U+1F600
  assert.equal(twemojiCode('🥇'), '1f947');
});

// The trap: emoji with a text presentation form carry U+FE0F, and Twemoji's filenames
// omit it. Keeping it 404s every one of them — a large, non-obvious slice of the set.
test('the U+FE0F variation selector is dropped', () => {
  assert.equal(twemojiCode('❤️'), '2764');    // U+2764 U+FE0F
  assert.equal(twemojiCode('☂️'), '2602');
  assert.ok(!twemojiCode('❤️').includes('fe0f'));
});

// ...but NOT in a ZWJ sequence, where Twemoji keeps it. Dropping it there 404s instead,
// so the rule genuinely has to be conditional rather than "always strip".
test('U+FE0F is kept when the sequence contains a zero-width joiner', () => {
  const rainbowFlag = twemojiCode('🏳️‍🌈');   // 1F3F3 FE0F 200D 1F308
  assert.equal(rainbowFlag, '1f3f3-fe0f-200d-1f308');
  assert.ok(rainbowFlag.includes('fe0f'), 'ZWJ sequences keep the selector');
  assert.ok(rainbowFlag.includes('200d'));
});

test('multi-codepoint sequences join with hyphens', () => {
  assert.equal(twemojiCode('🇬🇧'), '1f1ec-1f1e7');           // regional indicators
  assert.equal(twemojiCode('👨‍👩‍👧'), '1f468-200d-1f469-200d-1f467');
});

test('surrogate pairs are read as one code point, not two', () => {
  // '😀'.length is 2 in UTF-16; a naive charCodeAt loop yields 'd83d-de00' and 404s.
  assert.equal(twemojiCode('😀').split('-').length, 1);
});
