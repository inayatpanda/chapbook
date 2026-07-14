import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chatFieldFor, enterSends, stripLabel, isPlainParagraph, htmlToChatText } from './chatCompose.js';

test('chatFieldFor maps every wordy block type', () => {
  assert.deepEqual(chatFieldFor({ type: 'text' }), { field: 'html', label: 'paragraph', md: true });
  assert.deepEqual(chatFieldFor({ type: 'heading' }), { field: 'text', label: 'heading', md: false });
  assert.deepEqual(chatFieldFor({ type: 'quote' }), { field: 'html', label: 'quote', md: true });
  assert.equal(chatFieldFor({ type: 'image' }).field, 'caption');
  assert.equal(chatFieldFor({ type: 'embed' }).field, 'caption');
  assert.equal(chatFieldFor({ type: 'video' }).field, 'caption');
  assert.equal(chatFieldFor({ type: 'figure' }).field, 'caption');
});

test('chatFieldFor: playground binds Title only when template-built', () => {
  assert.equal(chatFieldFor({ type: 'playground', template: { familyId: 'poll' } }).field, 'title');
  assert.equal(chatFieldFor({ type: 'playground' }), null);
});

test('chatFieldFor: wordless blocks are select-only', () => {
  for (const type of ['gallery', 'table', 'divider', 'raw', 'nope']) {
    assert.equal(chatFieldFor({ type }), null, type);
  }
  assert.equal(chatFieldFor(null), null);
});

test('enterSends: Enter never sends — new paragraph everywhere, ➤ commits', () => {
  assert.equal(enterSends(false), false);
  assert.equal(enterSends(true), false);
});

test('stripLabel names the bound block or points at its own controls', () => {
  assert.equal(stripLabel({ type: 'heading' }), 'Editing · Heading');
  assert.equal(stripLabel({ type: 'divider' }), 'No text here — use the block’s own controls');
});

test('isPlainParagraph: plain single lines only', () => {
  assert.equal(isPlainParagraph('Just a sentence with **bold**.'), true);
  assert.equal(isPlainParagraph('## A heading'), false);
  assert.equal(isPlainParagraph('> a quote'), false);
  assert.equal(isPlainParagraph('- a list'), false);
  assert.equal(isPlainParagraph('1. numbered'), false);
  assert.equal(isPlainParagraph('two\nlines'), false);
  assert.equal(isPlainParagraph('   '), false);
});

test('htmlToChatText round-trips the chat-writable formatting', () => {
  assert.equal(htmlToChatText('The <strong>fast</strong> and the <em>slow</em>.'), 'The **fast** and the *slow*.');
  assert.equal(htmlToChatText('See <a href="https://x.y/z">the trial</a>.'), 'See [the trial](https://x.y/z).');
  assert.equal(htmlToChatText('line one<br>line two'), 'line one\nline two');
  assert.equal(htmlToChatText('a &amp; b &lt;c&gt;'), 'a & b <c>');
  assert.equal(htmlToChatText('<span class="x">plain</span>'), 'plain');
});
