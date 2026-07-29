import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('interactive catalogue lazy-mounts iframe previews near the viewport', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const start = html.indexOf('async function loadLibInteractives()');
  const end = html.indexOf("$('libSeg')?.addEventListener", start);
  const source = html.slice(start, end);

  assert.match(source, /IntersectionObserver/);
  assert.match(source, /document\.createElement\('iframe'\)/);
  assert.match(source, /rootMargin:'600px 0px'/);
  assert.doesNotMatch(source, /<iframe class="lib-ix-frame"/);
});
