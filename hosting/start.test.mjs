import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('managed entry starts when a host launcher imports it', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'chapbook-launcher-'));
  await mkdir(join(cwd, 'dist'));
  const env = { ...process.env, PORT: '0', CHAPBOOK_PREVIEW: '1' };
  for (const key of Object.keys(env)) {
    if (key.startsWith('DB_') || key === 'CHAPBOOK_SERVICE_ENV') delete env[key];
  }
  try {
    // The host launcher, not start.mjs, owns argv[1]. Importing the entry must
    // still open the listener; importing server.mjs alone remains side-effect free.
    const code = `
      const { server } = await import(${JSON.stringify(new URL('./start.mjs', import.meta.url).href)});
      try {
        const response = await fetch('http://127.0.0.1:' + server.address().port + '/healthz');
        console.log(JSON.stringify({ httpStatus: response.status, health: await response.json() }));
      } finally {
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
      }
    `;
    const output = execFileSync(process.execPath, ['--input-type=module', '--eval', code], {
      cwd, env, encoding: 'utf8', timeout: 10000,
    });
    const result = JSON.parse(output.trim().split('\n').at(-1));
    assert.deepEqual(result, { httpStatus: 200, health: { status: 'preview', storage: 'unconfigured' } });
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
