import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign as nodeSign } from 'node:crypto';
import { ed25519Verify } from './ed25519Verify.js';

// The Studio licence gate verifies keys with WebCrypto Ed25519 — which only shipped in
// Safari/iOS 17. On iOS 16 / older Mac Safari, importKey({name:'Ed25519'}) throws and
// activation broke entirely. ed25519Verify is the dependency-free RFC 8032 fallback the
// gate uses when WebCrypto lacks the algorithm (BigInt curve math + SHA-512 via
// crypto.subtle.digest, which every BigInt-capable Safari supports). These tests sign with
// Node's REAL Ed25519 (node:crypto — the same signer Helm's licence CLI uses) and check
// the pure verifier agrees, including on tampered and malformed inputs.

function keypair() {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const jwk = publicKey.export({ format: 'jwk' });
  const raw = Uint8Array.from(Buffer.from(jwk.x, 'base64url')); // 32-byte raw public key
  return { raw, privateKey };
}
const enc = (s) => new TextEncoder().encode(s);

test('verifies a signature produced by node:crypto Ed25519 (the licence signer)', async () => {
  const { raw, privateKey } = keypair();
  const msg = enc('eyJuYW1lIjoiVGVzdCBCdXllciJ9'); // a payload segment, like the gate signs over
  const sig = new Uint8Array(nodeSign(null, msg, privateKey));
  assert.equal(await ed25519Verify(sig, msg, raw), true);
});

test('rejects a tampered message', async () => {
  const { raw, privateKey } = keypair();
  const sig = new Uint8Array(nodeSign(null, enc('the real payload'), privateKey));
  assert.equal(await ed25519Verify(sig, enc('the reaL payload'), raw), false);
});

test('rejects a tampered signature (each half)', async () => {
  const { raw, privateKey } = keypair();
  const msg = enc('payload');
  const sig = new Uint8Array(nodeSign(null, msg, privateKey));
  const flipR = Uint8Array.from(sig); flipR[3] ^= 0x01;   // corrupt R
  const flipS = Uint8Array.from(sig); flipS[40] ^= 0x01;  // corrupt s
  assert.equal(await ed25519Verify(flipR, msg, raw), false);
  assert.equal(await ed25519Verify(flipS, msg, raw), false);
});

test('rejects a signature under a DIFFERENT public key', async () => {
  const a = keypair();
  const b = keypair();
  const msg = enc('payload');
  const sig = new Uint8Array(nodeSign(null, msg, a.privateKey));
  assert.equal(await ed25519Verify(sig, msg, b.raw), false);
});

test('returns false (never throws) on malformed inputs', async () => {
  const { raw, privateKey } = keypair();
  const msg = enc('payload');
  const sig = new Uint8Array(nodeSign(null, msg, privateKey));
  assert.equal(await ed25519Verify(sig.subarray(0, 63), msg, raw), false);   // short sig
  assert.equal(await ed25519Verify(sig, msg, raw.subarray(0, 31)), false);   // short key
  assert.equal(await ed25519Verify(null, msg, raw), false);
  assert.equal(await ed25519Verify(sig, msg, null), false);
  assert.equal(await ed25519Verify('junk', 'junk', 'junk'), false);
  assert.equal(await ed25519Verify(new Uint8Array(64), msg, new Uint8Array(32)), false); // all-zero
});

test('rejects a non-canonical s (s >= group order) even when the point maths would pass', async () => {
  const { raw, privateKey } = keypair();
  const msg = enc('payload');
  const sig = new Uint8Array(nodeSign(null, msg, privateKey));
  // s + L is the same scalar mod L but MUST be rejected per RFC 8032 (malleability guard).
  const L = 2n ** 252n + 27742317777372353535851937790883648493n;
  let s = 0n;
  for (let i = 63; i >= 32; i--) s = (s << 8n) | BigInt(sig[i]);
  let sPlusL = s + L;
  const forged = Uint8Array.from(sig);
  for (let i = 32; i < 64; i++) { forged[i] = Number(sPlusL & 0xffn); sPlusL >>= 8n; }
  assert.equal(await ed25519Verify(forged, msg, raw), false);
});

test('agrees with WebCrypto Ed25519 on the same inputs (parity with the primary path)', async () => {
  const { raw, privateKey } = keypair();
  const msg = enc('IPL1 payload segment');
  const sig = new Uint8Array(nodeSign(null, msg, privateKey));
  const key = await globalThis.crypto.subtle.importKey('raw', raw, { name: 'Ed25519' }, false, ['verify']);
  const good = await globalThis.crypto.subtle.verify({ name: 'Ed25519' }, key, sig, msg);
  assert.equal(await ed25519Verify(sig, msg, raw), good);
  const bad = Uint8Array.from(sig); bad[10] ^= 0xff;
  const wcBad = await globalThis.crypto.subtle.verify({ name: 'Ed25519' }, key, bad, msg);
  assert.equal(await ed25519Verify(bad, msg, raw), wcBad);
});
