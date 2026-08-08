// TEST-ONLY Ed25519 licence fixture.
//
// The audit could not run a signed-in E2E at all: the app stops at "Activate Chapbook"
// and there was no safe way past it. Borrowing a real licence would put a production
// credential in the repo and in CI logs, so instead this mints licences with a keypair
// that has NO power over any shipped build.
//
// WHY THIS IS SAFE — the guarantee is cryptographic, not procedural:
//   • The seed below is a literal ASCII string, obviously synthetic, committed on purpose.
//   • Its public key differs from the production key, so a licence minted here fails
//     signature verification on any normally-built Chapbook. It opens ONLY a build
//     deliberately baked with TEST_PUBLIC_KEY_HEX (build.mjs refuses to do that without
//     CHAPBOOK_TEST_BUILD=1, and marks any build that does).
//   • The production PRIVATE key is not here and is never needed: nothing in the test
//     path signs with it.
// Never replace this seed with the production signing key. There is no scenario where a
// test needs that: a test-keyed build is the point.
import { createPrivateKey, createPublicKey, sign as edSign } from 'node:crypto';

// A 32-byte Ed25519 seed that reads as what it is.
const TEST_SEED = Buffer.from('chapbook-test-only-licence-seed!', 'utf8');

// DER prefixes for raw Ed25519 keys (RFC 8410), so no dependency is needed to wrap them.
const PKCS8_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');
const SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

const privateKey = createPrivateKey({
  key: Buffer.concat([PKCS8_PREFIX, TEST_SEED]),
  format: 'der',
  type: 'pkcs8',
});

export function testPublicKeyObject() { return createPublicKey(privateKey); }

// The hex verify key to bake into a test build (window.__LICENCE_PUBLIC_KEY).
export const TEST_PUBLIC_KEY_HEX = createPublicKey(privateKey)
  .export({ format: 'der', type: 'spki' })
  .subarray(-32)
  .toString('hex');

// Kept here ONLY so tests can assert the two are different. Public data — it is already
// baked into every shipped build and served to every visitor.
export const PRODUCTION_PUBLIC_KEY_HEX =
  '20e5e11738c29f3ee250dd38fa1b72695a327a2eb18cf4f9b817c56c664c7201';

const b64url = (buf) => Buffer.from(buf).toString('base64')
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

let seq = 0;

// Mint an `IPL1.<b64url payload>.<b64url signature>` key.
//
// The gate verifies the signature over the ENCODED payload string (parts[1]), not over the
// decoded JSON — see verifyLicence()/_ed25519Verify() in src/index.html. Signing the JSON
// bytes instead yields a licence that looks correct and fails every time.
export function mintTestLicence({
  name = 'E2E Test User',
  product = 'studio',
  expires = null,
  jti = `test-${++seq}`,
} = {}) {
  const payload = { name, product, jti };
  if (expires !== null) payload.expires = expires;
  const payloadB64 = b64url(Buffer.from(JSON.stringify(payload), 'utf8'));
  const sig = edSign(null, Buffer.from(payloadB64, 'utf8'), privateKey);
  return `IPL1.${payloadB64}.${b64url(sig)}`;
}
