// Frontmatter serialise/parse — YAML-safety of the q() quoter (M1).
// A title/description containing a backslash (a Windows path, a regex) MUST be escaped as
// `\\` so the emitted double-quoted YAML scalar is valid — otherwise the buyer's entire
// Astro build fails and the blog never deploys. These tests lock the escaping + round-trip.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse, serialise } from './frontmatter.js';

// Pull the raw `title:` line out of the serialised frontmatter (before the closing ---).
function titleLine(md) {
  const m = /^title:\s*(.*)$/m.exec(md);
  return m ? m[1] : null;
}

test('q() escapes a lone backslash as \\\\ (valid YAML) and round-trips', () => {
  const title = 'C:\\Users\\me';
  const md = serialise({ data: { title }, body: 'x' });
  // Emitted YAML must double every backslash inside the quoted scalar.
  assert.equal(titleLine(md), '"C:\\\\Users\\\\me"');
  assert.ok(!/[^\\]\\[^\\]/.test(titleLine(md)), 'no unescaped single backslash remains');
  assert.equal(parse(md).data.title, title);
});

test('q() escapes a double-quote as \\" and round-trips', () => {
  const title = 'She said "hi"';
  const md = serialise({ data: { title }, body: 'x' });
  assert.equal(titleLine(md), '"She said \\"hi\\""');
  assert.equal(parse(md).data.title, title);
});

test('q() escapes backslash AND quote together, order-safe, and round-trips', () => {
  // a, backslash, b, quote, c — the case a naive two-step replace/parse would mangle.
  const title = 'a\\b"c';
  const md = serialise({ data: { title }, body: 'x' });
  assert.equal(titleLine(md), '"a\\\\b\\"c"');
  assert.equal(parse(md).data.title, title);
});

test('a trailing backslash escapes cleanly (would otherwise escape the closing quote)', () => {
  const title = 'path\\';
  const md = serialise({ data: { title }, body: 'x' });
  assert.equal(titleLine(md), '"path\\\\"');
  assert.equal(parse(md).data.title, title);
});

test('description with a regex containing backslashes round-trips', () => {
  const description = 'Matches \\d+ digits and \\w words';
  const md = serialise({ data: { title: 'T', description }, body: 'x' });
  assert.equal(parse(md).data.description, description);
});

test('a plain title (no special chars) is unchanged — no regression', () => {
  const title = 'A Normal Title';
  const md = serialise({ data: { title }, body: 'x' });
  assert.equal(titleLine(md), '"A Normal Title"');
  assert.equal(parse(md).data.title, title);
});

test('legacy value with an unescaped backslash still parses (back-compat)', () => {
  // A pre-fix post written as an invalid `\U` sequence must not be corrupted on read.
  const md = '---\ntitle: "C:\\Users"\n---\n\nbody\n';
  assert.equal(parse(md).data.title, 'C:\\Users');
});
