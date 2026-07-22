// Pure Ed25519 signature VERIFICATION (RFC 8032) — dependency-free fallback for browsers
// whose WebCrypto lacks the Ed25519 algorithm. WebCrypto Ed25519 only shipped in
// Safari/iOS 17; on iOS 16 / older Mac Safari, importKey({name:'Ed25519'}) throws and the
// Studio licence gate could never activate. This module needs only two platform features
// that far predate Ed25519 support: BigInt (Safari 14+) and crypto.subtle.digest('SHA-512')
// (Safari 11+), so the same activation key verifies on every Safari the app can run on.
//
// VERIFY ONLY — no signing, no key generation, no secrets: everything handled here
// (signature, payload, public key) is public data, so non-constant-time BigInt math is fine.
// The maths follows RFC 8032 §5.1 exactly: point decompression (§5.1.3), the k =
// SHA-512(R‖A‖M) challenge, the canonical-s (< L) check, and the [s]B = R + [k]A equation.
// Exposed to the inline licence gate as window.__studioEd25519 (see app.js) because the
// inline module can't import lib/ — same pattern as __studioThread/__studioSanitise.

const P = 2n ** 255n - 19n;                                                   // field prime
const L = 2n ** 252n + 27742317777372353535851937790883648493n;               // group order
const D = 37095705934669439343138083508754565189542113879843219016388785533085940283555n; // -121665/121666 mod P
const Gx = 15112221349535400772501151409588531511454012693041857206046113283949847762202n;
const Gy = 46316835694926478169428394003475163141307993866256225615783033603165251855960n;

const mod = (a) => { const r = a % P; return r >= 0n ? r : r + P; };

function modpow(b, e) {
  let r = 1n;
  b = mod(b);
  while (e > 0n) {
    if (e & 1n) r = (r * b) % P;
    b = (b * b) % P;
    e >>= 1n;
  }
  return r;
}

// Points are extended homogeneous coordinates [X, Y, Z, T] with x = X/Z, y = Y/Z, T = XY/Z.
const IDENTITY = [0n, 1n, 1n, 0n];
const BASE = [Gx, Gy, 1n, mod(Gx * Gy)];

// Unified addition ("add-2008-hwcd-3", complete for ed25519's a = -1, d non-square —
// no special-casing of doubling or the identity needed).
function ptAdd(p, q) {
  const [X1, Y1, Z1, T1] = p, [X2, Y2, Z2, T2] = q;
  const A = mod((Y1 - X1) * (Y2 - X2));
  const B = mod((Y1 + X1) * (Y2 + X2));
  const C = mod(2n * D * T1 * T2);
  const Dd = mod(2n * Z1 * Z2);
  const E = B - A, F = Dd - C, G = Dd + C, H = B + A;
  return [mod(E * F), mod(G * H), mod(F * G), mod(E * H)];
}

function ptMul(k, p) {
  let r = IDENTITY, q = p;
  while (k > 0n) {
    if (k & 1n) r = ptAdd(r, q);
    q = ptAdd(q, q);
    k >>= 1n;
  }
  return r;
}

function ptEqual(p, q) {
  const [X1, Y1, Z1] = p, [X2, Y2, Z2] = q;
  return mod(X1 * Z2) === mod(X2 * Z1) && mod(Y1 * Z2) === mod(Y2 * Z1);
}

function bytesToLE(b) {
  let r = 0n;
  for (let i = b.length - 1; i >= 0; i--) r = (r << 8n) | BigInt(b[i]);
  return r;
}

// RFC 8032 §5.1.3 point decompression: 32 LE bytes (y + x-sign bit) → point, or null.
function decodePoint(b) {
  if (b.length !== 32) return null;
  const yEnc = bytesToLE(b);
  const sign = (yEnc >> 255n) & 1n;
  const y = yEnc & ((1n << 255n) - 1n);
  if (y >= P) return null;
  const y2 = mod(y * y);
  const u = mod(y2 - 1n);
  const v = mod(D * y2 + 1n);
  // candidate root x = u·v³·(u·v⁷)^((p−5)/8)
  const v3 = mod(v * v * v);
  const v7 = mod(v3 * v3 * v);
  let x = mod(u * v3 * modpow(mod(u * v7), (P - 5n) / 8n));
  const vx2 = mod(v * x * x);
  if (vx2 === u) { /* root found */ }
  else if (vx2 === mod(-u)) x = mod(x * modpow(2n, (P - 1n) / 4n));
  else return null;                        // y is not on the curve
  if (x === 0n && sign === 1n) return null;
  if ((x & 1n) !== sign) x = P - x;
  return [x, y, 1n, mod(x * y)];
}

function asBytes(v) {
  if (v instanceof Uint8Array) return v;
  if (v instanceof ArrayBuffer) return new Uint8Array(v);
  if (ArrayBuffer.isView(v)) return new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
  return null;
}

async function sha512(bytes) {
  const digest = await globalThis.crypto.subtle.digest('SHA-512', bytes);
  return new Uint8Array(digest);
}

/**
 * Verify an Ed25519 signature (RFC 8032). Never throws — any malformed input → false.
 * @param {Uint8Array|ArrayBuffer} sigBytes        64-byte signature (R ‖ s)
 * @param {Uint8Array|ArrayBuffer} msgBytes        the signed message bytes
 * @param {Uint8Array|ArrayBuffer} publicKeyBytes  32-byte raw public key
 * @returns {Promise<boolean>}
 */
export async function ed25519Verify(sigBytes, msgBytes, publicKeyBytes) {
  try {
    const sig = asBytes(sigBytes), msg = asBytes(msgBytes), pk = asBytes(publicKeyBytes);
    if (!sig || sig.length !== 64 || !msg || !pk || pk.length !== 32) return false;
    const A = decodePoint(pk);
    const R = decodePoint(sig.subarray(0, 32));
    if (!A || !R) return false;
    const s = bytesToLE(sig.subarray(32));
    if (s >= L) return false;              // non-canonical s — reject (malleability guard)
    const hIn = new Uint8Array(64 + msg.length);
    hIn.set(sig.subarray(0, 32), 0);
    hIn.set(pk, 32);
    hIn.set(msg, 64);
    const k = bytesToLE(await sha512(hIn)) % L;
    return ptEqual(ptMul(s, BASE), ptAdd(R, ptMul(k, A)));
  } catch {
    return false;
  }
}
