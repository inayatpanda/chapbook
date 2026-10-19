import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import vm from 'node:vm';
import { mintTestLicence, TEST_PUBLIC_KEY_HEX } from './test/fixtures/testLicence.mjs';

// Execute the shipped inline gate with real signatures from the isolated test keypair.
// This catches scope drift between Chapbook and the generated licence client.
const html = readFileSync(new URL('./src/index.html', import.meta.url), 'utf8');
const cryptoStart = html.indexOf("const LIC_STORE=");
const cryptoEnd = html.indexOf('/* ── Licence revocation', cryptoStart);
const verifyStart = html.indexOf('async function verifyLicence(');
const verifyEnd = html.indexOf('/* Resolve the stored licence key.', verifyStart);
assert.ok(cryptoStart > 0 && cryptoEnd > cryptoStart && verifyStart > cryptoEnd && verifyEnd > verifyStart);
const verify = vm.runInNewContext(
  html.slice(cryptoStart, cryptoEnd) + html.slice(verifyStart, verifyEnd) + '\nverifyLicence',
  { window: { __LICENCE_PUBLIC_KEY: TEST_PUBLIC_KEY_HEX }, crypto: webcrypto, TextEncoder, TextDecoder, Uint8Array, atob },
);

for (const product of ['studio', 'trial', 'all']) {
  test(`the shipped gate accepts a signed ${product} licence`, async () => {
    assert.equal((await verify(mintTestLicence({ product }))).valid, true);
  });
}

for (const product of ['someotherproduct', null, '', ['all']]) {
  test(`the shipped gate rejects unrelated or unscoped product ${JSON.stringify(product)}`, async () => {
    assert.equal((await verify(mintTestLicence({ product }))).reason, 'wrong-product');
  });
}

test('all-products licences must still have a valid signature', async () => {
  const key = mintTestLicence({ product: 'someotherproduct' });
  const [, payload, signature] = key.split('.');
  const changed = { ...JSON.parse(Buffer.from(payload, 'base64url')), product: 'all' };
  const forged = `IPL1.${Buffer.from(JSON.stringify(changed)).toString('base64url')}.${signature}`;
  assert.equal((await verify(forged)).reason, 'bad-signature');
});

test('all-products licences still expire', async () => {
  assert.equal((await verify(mintTestLicence({ product: 'all', expires: '2020-01-01' }))).reason, 'expired');
});
