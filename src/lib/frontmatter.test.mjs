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

// ── unknown/custom frontmatter fields survive a parse → serialise round-trip ──
// setDraft/updatePost spread the parsed data and re-serialise; the old allowlist
// silently DELETED any hand-added field from the post on every studio edit.

test('an unknown string field round-trips through parse → serialise → parse', () => {
  const md = '---\ntitle: "T"\ncustomField: "keep-me"\ndraft: true\n---\n\nbody\n';
  const { data, body } = parse(md);
  assert.equal(data.customField, 'keep-me');
  const out = serialise({ data, body });
  assert.match(out, /^customField: "keep-me"$/m);
  assert.equal(parse(out).data.customField, 'keep-me');
});

test('an unknown boolean field round-trips and stays a boolean', () => {
  const md = '---\ntitle: "T"\nfeatured: true\n---\n\nbody\n';
  const out = serialise(parse(md));
  assert.match(out, /^featured: true$/m);
  assert.equal(parse(out).data.featured, true);
});

test('a hyphenated unknown key (og-image) round-trips through parse → serialise → parse', () => {
  const md = '---\ntitle: "T"\nog-image: /x.png\n---\n\nbody\n';
  const { data, body } = parse(md);
  assert.equal(data['og-image'], '/x.png');
  const out = serialise({ data, body });
  assert.match(out, /^og-image: "\/x\.png"$/m);
  assert.equal(parse(out).data['og-image'], '/x.png');
});

// ── newline injection: no scalar may break out of its frontmatter line ──
// Independent adversarial finding: a title of 'Normal title\npublishAt: …' used to
// serialise the raw newline into the quoted scalar, producing a SECOND frontmatter
// line that parse() then honoured — arbitrary key injection from ANY user-controlled
// scalar (title/description/series/unknown passthrough). q() now collapses \r\n/\n/\r
// runs to a single space, so every scalar stays on one line and parse() reads back
// one intended value with no injected key.

// The frontmatter block between the two --- fences, as individual lines.
function fmLines(md) {
  return /^---\n([\s\S]*?)\n---\n/.exec(md)[1].split('\n');
}

test('a title containing a newline cannot inject a second frontmatter key', () => {
  const md = serialise({ data: { title: 'Normal title\npublishAt: 2099-01-01T00:00:00Z' }, body: 'body' });
  assert.equal(fmLines(md).length, 1, `one key must emit exactly one line:\n${md}`);
  const round = parse(md);
  assert.equal(round.data.publishAt, undefined, `injected publishAt survived:\n${md}`);
  assert.equal(round.data.title, 'Normal title publishAt: 2099-01-01T00:00:00Z');
});

test('a description containing a newline cannot inject a second frontmatter key', () => {
  const md = serialise({ data: { title: 'T', description: 'ok\ndraft: false\npublishAt: 2099-01-01T00:00:00Z' }, body: 'body' });
  assert.equal(fmLines(md).length, 2, `two keys must emit exactly two lines:\n${md}`);
  const round = parse(md);
  assert.equal(round.data.publishAt, undefined);
  assert.equal(round.data.draft, undefined);
  assert.equal(round.data.description, 'ok draft: false publishAt: 2099-01-01T00:00:00Z');
});

test('an unknown passthrough field containing a newline cannot inject a key', () => {
  const md = serialise({ data: { title: 'T', customField: 'x\ninjected: true' }, body: 'body' });
  assert.equal(fmLines(md).length, 2, `two keys must emit exactly two lines:\n${md}`);
  const round = parse(md);
  assert.equal(round.data.injected, undefined, `injected key survived:\n${md}`);
  assert.equal(round.data.customField, 'x injected: true');
});

test('newlines in the raw-emitted date/publishAt scalars are neutralised too', () => {
  const md = serialise({ data: {
    title: 'T', date: '2026-01-01\ninjected: true', draft: true, publishAt: '2099-01-01T00:00:00Z\nevil: yes',
  }, body: 'body' });
  const round = parse(md);
  assert.equal(round.data.injected, undefined, md);
  assert.equal(round.data.evil, undefined, md);
});

test('CRLF and lone CR line breaks collapse to a single space (series + tags items)', () => {
  const md = serialise({ data: { title: 'a\r\nb\rc', series: 's\r\ninjected: true', tags: ['t\nx'] }, body: 'body' });
  const round = parse(md);
  assert.equal(round.data.injected, undefined, md);
  assert.equal(round.data.title, 'a b c');
  assert.deepEqual(round.data.tags, ['t x']);
});

test('a doc with only known fields serialises byte-identically (no passthrough noise)', () => {
  const data = { title: 'T', description: 'D', date: '2026-07-01', tags: ['a'], accent: '#2dd4bf', draft: true };
  assert.equal(
    serialise({ data, body: 'body\n' }),
    '---\ntitle: "T"\ndescription: "D"\ndate: 2026-07-01\ntags: ["a"]\naccent: "#2dd4bf"\ndraft: true\n---\n\nbody\n'
  );
});
