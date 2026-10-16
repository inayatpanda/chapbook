import { createHmac, randomBytes } from 'node:crypto';
import { normalizeIp, clientIp, trustProxy } from './client-ip.mjs';
const key = randomBytes(32);
const fingerprint = value => {
  const ip = normalizeIp(value);
  return ip ? createHmac('sha256', key).update(ip).digest('hex').slice(0, 24) : null;
};
// Read-only preview diagnostics. No raw visitor address is returned or logged;
// ephemeral fingerprints allow the operator to test spoofed forwarding headers.
export function previewNetwork(req) {
  const peer = normalizeIp(req.socket.remoteAddress);
  let candidate = null;
  try { candidate = fingerprint(clientIp(req, trustProxy('loopback'))); } catch {}
  return {
    peer: peer === '127.0.0.1' || peer === '::1' ? 'loopback' : 'other',
    socket: fingerprint(peer),
    candidate,
    realIp: fingerprint(req.headers['x-real-ip']),
    forwarded: String(req.headers['x-forwarded-for'] || '').split(',').slice(-8).map(fingerprint),
  };
}
