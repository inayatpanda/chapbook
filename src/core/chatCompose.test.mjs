import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chatFieldFor, enterSends, stripLabel, isPlainParagraph, htmlToChatText, isEmptyGuideBlock, dropEmptyGuides } from './chatCompose.js';

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

test('isEmptyGuideBlock: only untouched template guides (ph + empty content) match', () => {
  // untouched guides from a template (e.g. "Announcement") → true
  assert.equal(isEmptyGuideBlock({ type: 'heading', text: '', ph: "What's the news?" }), true);
  assert.equal(isEmptyGuideBlock({ type: 'text', html: '', ph: 'State it plainly.' }), true);
  assert.equal(isEmptyGuideBlock({ type: 'quote', html: '<br>', ph: 'A line.' }), true);
  // a FILLED guide box is kept (partly-written scaffold survives)
  assert.equal(isEmptyGuideBlock({ type: 'heading', text: 'My real title', ph: 'x' }), false);
  assert.equal(isEmptyGuideBlock({ type: 'text', html: '<em>hi</em>', ph: 'x' }), false);
  // a plain empty new-post seed (no ph) is NOT a guide
  assert.equal(isEmptyGuideBlock({ type: 'text', html: '' }), false);
  assert.equal(isEmptyGuideBlock(null), false);
});

test('dropEmptyGuides removes only the stranded instruction boxes (bug: leftover block above)', () => {
  // "Announcement": heading + text guides. A sent message must not strand the heading above it.
  const blocks = [
    { id: 'h1', type: 'heading', text: '', ph: "What's the news?" },
    { id: 'p1', type: 'text', html: '', ph: 'State it plainly.' },
  ];
  assert.deepEqual(dropEmptyGuides(blocks), [], 'both untouched guides are dropped');
  // partly-filled: the filled heading survives, the empty guide goes
  const mixed = [
    { id: 'h1', type: 'heading', text: 'Real title' },
    { id: 'p1', type: 'text', html: '', ph: 'guide' },
    { id: 'p2', type: 'text', html: '' },
  ];
  assert.deepEqual(dropEmptyGuides(mixed).map((b) => b.id), ['h1', 'p2'], 'filled + plain-empty kept, guide removed');
});

test('htmlToChatText round-trips the chat-writable formatting', () => {
  assert.equal(htmlToChatText('The <strong>fast</strong> and the <em>slow</em>.'), 'The **fast** and the *slow*.');
  assert.equal(htmlToChatText('See <a href="https://x.y/z">the trial</a>.'), 'See [the trial](https://x.y/z).');
  assert.equal(htmlToChatText('line one<br>line two'), 'line one\nline two');
  assert.equal(htmlToChatText('a &amp; b &lt;c&gt;'), 'a & b <c>');
  assert.equal(htmlToChatText('<span class="x">plain</span>'), 'plain');
});
