import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('retired deploy commands stop without building or contacting Netlify', () => {
  for (const target of ['deploy:draft', 'deploy:prod']) {
    const result = spawnSync('npm', ['run', '--silent', target], { encoding:'utf8', timeout:10000 });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /production is hosted by Hostinger/);
    assert.match(result.stderr, /Do not re-enable the retired Netlify site/);
    assert.equal(result.stdout, '');
  }
});
