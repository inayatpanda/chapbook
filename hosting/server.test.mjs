import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from './server.mjs';

test('pretty pages take precedence over sibling asset directories', async () => {
  const root = await mkdtemp(join(tmpdir(), 'chapbook-routes-'));
  let server;
  try {
    await mkdir(join(root, 'themes'));
    await writeFile(join(root, 'themes.html'), 'Gallery');
    await writeFile(join(root, 'themes/index.html'), 'Directory gallery');
    await mkdir(join(root, 'app'));
    await writeFile(join(root, 'app/index.html'), 'Editor');
    server = await createApp({ root, preview: true });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = 'http://127.0.0.1:' + server.address().port;
    const gallery = await fetch(origin+'/themes?category=personal', { redirect:'manual' });
    assert.equal(gallery.status, 200);
    assert.match(gallery.headers.get('content-type'), /text\/html/);
    assert.equal(await gallery.text(), 'Gallery');
    const app = await fetch(origin+'/app?draft=1', { redirect:'manual' });
    assert.equal(app.status, 308);
    assert.equal(app.headers.get('location'), '/app/?draft=1');
    assert.equal(await (await fetch(origin+'/themes/')).text(), 'Directory gallery');
  } finally {
    if (server) {
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
    }
    await rm(root, { recursive:true, force:true });
  }
});
