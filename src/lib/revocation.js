// Licence revocation — pure decision logic (touchpoint 2 of the Helm boundary).
//
// The shipped licence gate (src/index.html `verifyLicence` / `licenceGate`) fetches
// Helm's signed revocation list from https://inayatpanda.com/licences/revoked.json
// (an `IPLR1.…` token: base64url payload `{ updated, revoked:[jti…] }` + Ed25519
// signature over the payload segment, verified with the SAME key as licence keys).
//
// The network/crypto/cache plumbing lives inline in the gate (it can't import this
// module — src/lib/ is not shipped to dist/), but the two pure decisions live here so
// they can be unit-tested and kept honest. The inline gate MIRRORS these predicates
// verbatim (like AI_DEFAULT_MODELS is mirrored); keep the two copies in lockstep.
//
// Both functions FAIL OPEN by construction: a malformed list, a bad signature, a
// missing jti, or an older list all resolve to "not revoked" / "don't trust it".

// Is this licence revoked? True iff its identifying `jti` is present in the list.
// A falsy id (legacy keys minted without a jti) or a non-array list ⇒ false, so a
// missing/garbled list can never revoke a paying customer.
export function isRevoked(licenceId, revokedList) {
  return !!licenceId && Array.isArray(revokedList) && revokedList.includes(licenceId);
}

// Should a freshly-fetched list replace the cached one?
//   `fetched`: { ok:boolean, updated:string, revoked:array } parsed from the IPLR1 token
//   `sigOk`:   result of the Ed25519 signature check over the fetched payload
// Only a well-formed, signature-valid, newer-or-equal list is trusted — so a tampered
// host cannot poison the cache, and a stale CDN copy can never transiently un-revoke a
// key (monotonic guard). A first-ever fetch (no cached.updated) is always accepted.
export function shouldReplaceCache(cached, fetched, sigOk) {
  if (!fetched || !fetched.ok || !sigOk) return false;
  if (!Array.isArray(fetched.revoked)) return false;
  if (!cached || !cached.updated) return true;
  return Date.parse(fetched.updated) >= Date.parse(cached.updated);
}
