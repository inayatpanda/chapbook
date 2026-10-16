import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clientIp, trustProxy } from './client-ip.mjs';
const request = (peer, forwarded) => ({ socket: { remoteAddress: peer }, headers: { 'x-forwarded-for': forwarded } });
test('untrusted direct clients cannot choose their own forwarded address', () => {
  assert.equal(clientIp(request('198.51.100.8', '203.0.113.9')), '198.51.100.8');
  assert.equal(clientIp(request('::ffff:198.51.100.8', '203.0.113.9')), '198.51.100.8');
});
test('verified proxy chain is read from the nearest hop and ignores forged prefixes', () => {
  const trusted = trustProxy('loopback,192.0.2.4');
  assert.equal(clientIp(request('127.0.0.1', '203.0.113.9, 198.51.100.8'), trusted), '198.51.100.8');
  assert.equal(clientIp(request('::1', '203.0.113.9, 198.51.100.8, 192.0.2.4'), trusted), '198.51.100.8');
  assert.equal(clientIp(request('10.0.0.3', '203.0.113.9'), trusted), '10.0.0.3');
});
test('missing or malformed proxy information fails closed', () => {
  for (const header of [undefined, '', 'not-an-ip', '198.51.100.8, bad', '198.51.100.8:443']) {
    assert.throws(() => clientIp(request('127.0.0.1', header), trustProxy('loopback')));
  }
  assert.throws(() => trustProxy('*'));
  assert.throws(() => trustProxy('10.0.0.0/8'));
});
