import { isIP } from 'node:net';

export function normalizeIp(value) {
  if (typeof value !== 'string') return null;
  const ip = value.trim().replace(/^::ffff:(?=\d+\.)/i, '');
  return isIP(ip) ? ip : null;
}

// Only exact, operator-verified proxy peers are trusted. Never trust all private
// networks or the first X-Forwarded-For entry supplied by an arbitrary client.
export function trustProxy(value = '') {
  const peers = new Set();
  for (const item of value.split(',').map(s => s.trim()).filter(Boolean)) {
    if (item === 'loopback') { peers.add('127.0.0.1'); peers.add('::1'); }
    else { const ip = normalizeIp(item); if (!ip) throw Error('Invalid trusted proxy address'); peers.add(ip); }
  }
  return ip => peers.has(normalizeIp(ip));
}

export function clientIp(req, trusted = trustProxy()) {
  let address = normalizeIp(req.socket.remoteAddress);
  if (!address) throw Error('Client address unavailable');
  if (!trusted(address)) return address;
  const header = req.headers['x-forwarded-for'];
  if (typeof header !== 'string' || header.length > 2048) throw Error('Forwarded address unavailable');
  const chain = header.split(',').map(normalizeIp);
  if (!chain.length || chain.some(ip => !ip)) throw Error('Invalid forwarded address');
  for (let i = chain.length - 1; i >= 0 && trusted(address); i--) address = chain[i];
  return address;
}
