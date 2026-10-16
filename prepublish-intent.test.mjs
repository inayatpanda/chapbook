import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Exercise the real dialog handlers: the first-use walkthrough previously saved
// a hidden draft when a new writer clicked a button labelled only “Publish”.
const html = readFileSync(new URL('./src/index.html', import.meta.url), 'utf8');
const start = html.indexOf('function renderPrepublish(res, onPublish){');
const end = html.indexOf('\n/* Async broken-link', start);
assert.ok(start > 0 && end > start);

function dialog(meta = { draft: true }) {
  const nodes = new Map();
  const $ = id => {
    if (!nodes.has(id)) nodes.set(id, { style: {}, classList: { toggle() {} }, hidden: true });
    return nodes.get(id);
  };
  const commits = [];
  const context = vm.createContext({
    $, meta, esc: String, renderHints: () => '', renderPolish: () => '',
    runLinkCheck() {},
    closePrepublish: () => { $('prepublishPanel').hidden = true; },
    setDraft: value => { meta.draft = value; },
    doPublish: () => { commits.push({ ...meta }); },
  });
  vm.runInContext(html.slice(start, end), context);
  const render = (result = {}, action = context.doPublish) => context.renderPrepublish(
    { errors: [], warnings: [], ...result }, action,
  );
  return { $, meta, commits, render, context };
}

test('reviewing and cancelling a new post never publishes or changes its draft state', () => {
  const d = dialog(); d.render();
  assert.equal(d.$('ppPublish').textContent, 'Save draft to GitHub');
  assert.equal(d.$('ppPublishNow').style.display, '');
  assert.match(d.$('ppBody').innerHTML, /This post is a draft/);
  d.context.closePrepublish();
  assert.equal(d.meta.draft, true);
  assert.equal(d.commits.length, 0);
});

test('saving a draft commits it unpublished', () => {
  const d = dialog(); d.render(); d.$('ppPublish').onclick();
  assert.deepEqual(d.commits, [{ draft: true }]);
  assert.equal(d.$('prepublishPanel').hidden, true);
});

test('explicit Publish now commits the post with draft false', () => {
  const d = dialog(); d.render(); d.$('ppPublishNow').onclick();
  assert.deepEqual(d.commits, [{ draft: false }]);
  assert.equal(d.$('prepublishPanel').hidden, true);
});

test('republishing an already public post keeps it public', () => {
  const d = dialog({ draft: false }); d.render();
  assert.equal(d.$('ppPublish').textContent, 'Publish now');
  assert.equal(d.$('ppPublishNow').style.display, 'none');
  d.$('ppPublish').onclick();
  assert.deepEqual(d.commits, [{ draft: false }]);
});

test('scheduled posts preserve their date and cannot accidentally publish early', () => {
  const meta = { draft: true, publishAt: '2030-11-01T09:00:00Z' };
  const d = dialog({ ...meta }); d.render();
  assert.equal(d.$('ppPublish').textContent, 'Save scheduled post');
  assert.equal(d.$('ppPublishNow').style.display, 'none');
  assert.equal(d.$('ppPublishNow').onclick, null);
  d.$('ppPublish').onclick();
  assert.deepEqual(d.commits, [meta]);
});

test('blocking errors and check-only reviews clear previous publish handlers', () => {
  for (const checkOnly of [false, true]) {
    const d = dialog(); d.render();
    if (checkOnly) d.render({}, null);
    else d.render({ errors: [{ message: 'Add a title' }] });
    for (const id of ['ppPublish', 'ppPublishNow']) {
      assert.equal(d.$(id).style.display, 'none');
      assert.equal(d.$(id).onclick, null);
    }
    assert.equal(d.commits.length, 0);
    assert.equal(d.meta.draft, true);
  }
});

test('advisory warnings allow explicit publication; unrelated callbacks do not change status', () => {
  const d = dialog(); d.render({ warnings: [{ message: 'Add a description' }] });
  d.$('ppPublishNow').onclick();
  assert.equal(d.commits[0].draft, false);
  d.meta.draft = true;
  let continued = false;
  d.render({}, () => { continued = true; });
  assert.equal(d.$('ppPublish').textContent, 'Continue');
  assert.equal(d.$('ppPublishNow').onclick, null);
  d.$('ppPublish').onclick();
  assert.equal(continued, true);
  assert.equal(d.meta.draft, true);
});
