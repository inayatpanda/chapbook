import { test } from 'node:test';
import assert from 'node:assert';
import { verify as edVerify } from 'node:crypto';
import { createPublicKey } from 'node:crypto';
import {
  TEST_PUBLIC_KEY_HEX, PRODUCTION_PUBLIC_KEY_HEX, mintTestLicence, testPublicKeyObject,
} from './testLicence.mjs';

const b64urlToBuf = (s) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

// The whole safety story rests on this: a licence minted here can NEVER open a build
// carrying the production key, because it is signed by a different key entirely.
test('the test key is not the production key', () => {
  assert.notEqual(TEST_PUBLIC_KEY_HEX, PRODUCTION_PUBLIC_KEY_HEX);
  assert.match(TEST_PUBLIC_KEY_HEX, /^[0-9a-f]{64}$/);
});

test('a minted licence has the IPL1.payload.signature shape the gate expects', () => {
  const parts = mintTestLicence().split('.');
  assert.equal(parts.length, 3);
  assert.equal(parts[0], 'IPL1');
  assert.equal(b64urlToBuf(parts[2]).length, 64, 'Ed25519 signatures are 64 bytes');
});

// The gate signs/verifies over the b64url payload STRING, not the decoded JSON bytes.
// Getting this wrong produces a licence that looks right and fails verification.
test('the signature is over the encoded payload string', () => {
  const [, payloadB64, sigB64] = mintTestLicence().split('.');
  const ok = edVerify(null, Buffer.from(payloadB64, 'utf8'), testPublicKeyObject(), b64urlToBuf(sigB64));
  assert.equal(ok, true);
});

test('a test licence does NOT verify under the production key', () => {
  const [, payloadB64, sigB64] = mintTestLicence().split('.');
  const prodKey = createPublicKey({
    key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(PRODUCTION_PUBLIC_KEY_HEX, 'hex')]),
    format: 'der', type: 'spki',
  });
  assert.equal(edVerify(null, Buffer.from(payloadB64, 'utf8'), prodKey, b64urlToBuf(sigB64)), false);
});

test('the payload carries the fields the gate requires', () => {
  const payload = JSON.parse(b64urlToBuf(mintTestLicence().split('.')[1]).toString('utf8'));
  assert.equal(typeof payload.name, 'string');
  assert.ok(['studio', 'trial'].includes(payload.product), `product=${payload.product}`);
  assert.equal(typeof payload.jti, 'string', 'a jti is needed to exercise revocation');
});

test('overrides let a test drive expiry, product scope and revocation', () => {
  const decode = (k) => JSON.parse(b64urlToBuf(k.split('.')[1]).toString('utf8'));
  assert.equal(decode(mintTestLicence({ product: 'trial' })).product, 'trial');
  assert.equal(decode(mintTestLicence({ jti: 'revoke-me' })).jti, 'revoke-me');
  const expired = decode(mintTestLicence({ expires: '2020-01-01T00:00:00.000Z' }));
  assert.ok(Date.parse(expired.expires) < Date.now());
  // A validly-signed key for another product must still be refusable by the gate.
  assert.equal(decode(mintTestLicence({ product: 'someotherproduct' })).product, 'someotherproduct');
});

test('two mints differ, so one test cannot be poisoned by another', () => {
  assert.notEqual(mintTestLicence({ jti: 'a' }), mintTestLicence({ jti: 'b' }));
});
