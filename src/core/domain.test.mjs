import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normaliseDomain,
  isValidDomain,
  isApex,
  cnameFileContent,
  dnsRecordsFor,
  pagesDomainStatus,
  GH_PAGES_A,
} from './domain.js';

// --- normaliseDomain: strip scheme/path/port/trailing-dot, lowercase, trim ---
test('normaliseDomain lowercases and trims', () => {
  assert.equal(normaliseDomain('  Example.COM  '), 'example.com');
});
test('normaliseDomain strips a scheme', () => {
  assert.equal(normaliseDomain('https://example.com'), 'example.com');
  assert.equal(normaliseDomain('http://blog.example.com'), 'blog.example.com');
});
test('normaliseDomain strips path, query and fragment', () => {
  assert.equal(normaliseDomain('https://example.com/path?q=1#x'), 'example.com');
  assert.equal(normaliseDomain('example.com/blog'), 'example.com');
});
test('normaliseDomain strips a :port', () => {
  assert.equal(normaliseDomain('example.com:8080'), 'example.com');
});
test('normaliseDomain strips one trailing dot (FQDN form)', () => {
  assert.equal(normaliseDomain('example.com.'), 'example.com');
});
test('normaliseDomain keeps a leading www', () => {
  assert.equal(normaliseDomain('www.example.com'), 'www.example.com');
});
test('normaliseDomain returns empty for blank/garbage input', () => {
  assert.equal(normaliseDomain(''), '');
  assert.equal(normaliseDomain('   '), '');
  assert.equal(normaliseDomain(null), '');
  assert.equal(normaliseDomain(undefined), '');
});

// --- isValidDomain ---
test('isValidDomain accepts an apex domain', () => {
  assert.equal(isValidDomain('example.com'), true);
  assert.equal(isValidDomain('my-blog.co.uk'), true);
});
test('isValidDomain accepts sub-domains incl. www', () => {
  assert.equal(isValidDomain('blog.example.com'), true);
  assert.equal(isValidDomain('www.example.com'), true);
  assert.equal(isValidDomain('a.b.example.com'), true);
});
test('isValidDomain accepts after normalising a full URL', () => {
  assert.equal(isValidDomain('https://example.com/post'), true);
});
test('isValidDomain rejects single-label / localhost', () => {
  assert.equal(isValidDomain('localhost'), false);
  assert.equal(isValidDomain('x'), false);
  assert.equal(isValidDomain('com'), false);
});
test('isValidDomain rejects a numeric TLD', () => {
  assert.equal(isValidDomain('example.123'), false);
});
test('isValidDomain rejects a one-char TLD', () => {
  assert.equal(isValidDomain('example.c'), false);
});
test('isValidDomain rejects leading/trailing hyphen labels', () => {
  assert.equal(isValidDomain('-bad.com'), false);
  assert.equal(isValidDomain('bad-.com'), false);
  assert.equal(isValidDomain('a.-b.com'), false);
});
test('isValidDomain rejects spaces, underscores and empty labels', () => {
  assert.equal(isValidDomain('exa mple.com'), false);
  assert.equal(isValidDomain('under_score.com'), false);
  assert.equal(isValidDomain('a..com'), false);
});
test('isValidDomain rejects empty input', () => {
  assert.equal(isValidDomain(''), false);
  assert.equal(isValidDomain(null), false);
});
test('isValidDomain rejects an over-long name (>253)', () => {
  const tooLong = (`${'a'.repeat(60)}.`).repeat(5) + 'example.com';
  assert.equal(isValidDomain(tooLong), false);
});

// --- isApex ---
test('isApex is true only for exactly two labels', () => {
  assert.equal(isApex('example.com'), true);
  assert.equal(isApex('blog.example.com'), false);
  assert.equal(isApex('www.example.com'), false);
});
test('isApex is false for an invalid domain', () => {
  assert.equal(isApex('localhost'), false);
  assert.equal(isApex(''), false);
});

// --- cnameFileContent ---
test('cnameFileContent is the bare host + a single trailing newline', () => {
  assert.equal(cnameFileContent('example.com'), 'example.com\n');
  assert.equal(cnameFileContent('  https://Blog.Example.com/x  '), 'blog.example.com\n');
});
test('cnameFileContent throws on an invalid domain', () => {
  assert.throws(() => cnameFileContent('localhost'), /valid domain/);
  assert.throws(() => cnameFileContent(''), /valid domain/);
});

// --- dnsRecordsFor ---
test('dnsRecordsFor for an apex returns 4 A records on @ plus a www CNAME', () => {
  const rows = dnsRecordsFor('example.com', 'octocat');
  const aRecords = rows.filter((r) => r.type === 'A');
  assert.equal(aRecords.length, 4);
  assert.deepEqual(aRecords.map((r) => r.value), GH_PAGES_A);
  assert.ok(aRecords.every((r) => r.host === '@'));
  const cname = rows.find((r) => r.type === 'CNAME');
  assert.equal(cname.host, 'www');
  assert.equal(cname.value, 'octocat.github.io');
});
test('dnsRecordsFor for a sub-domain returns a single CNAME on the sub-label', () => {
  const rows = dnsRecordsFor('blog.example.com', 'octocat');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].type, 'CNAME');
  assert.equal(rows[0].host, 'blog');
  assert.equal(rows[0].value, 'octocat.github.io');
});
test('dnsRecordsFor handles a deep sub-domain (multi-label left side)', () => {
  const rows = dnsRecordsFor('a.b.example.com', 'octocat');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].host, 'a.b');
  assert.equal(rows[0].value, 'octocat.github.io');
});
test('dnsRecordsFor lowercases the github user', () => {
  const rows = dnsRecordsFor('example.com', 'OctoCat');
  assert.equal(rows.find((r) => r.type === 'CNAME').value, 'octocat.github.io');
});
test('dnsRecordsFor falls back to a placeholder when the user is unknown', () => {
  const rows = dnsRecordsFor('example.com', '');
  assert.equal(rows.find((r) => r.type === 'CNAME').value, '<your-user>.github.io');
});
test('dnsRecordsFor returns [] for an invalid domain', () => {
  assert.deepEqual(dnsRecordsFor('localhost', 'octocat'), []);
  assert.deepEqual(dnsRecordsFor('', 'octocat'), []);
});
test('GH_PAGES_A are the four documented GitHub Pages apex IPs', () => {
  assert.deepEqual(GH_PAGES_A, [
    '185.199.108.153', '185.199.109.153', '185.199.110.153', '185.199.111.153',
  ]);
});

// --- pagesDomainStatus (the custom-domain "verify" check) ---
test('pagesDomainStatus reports not-configured when GitHub has no cname', () => {
  const s = pagesDomainStatus({ status: 'built', cname: null }, 'example.com');
  assert.equal(s.configured, false);
  assert.equal(s.matches, false);
  assert.equal(s.ok, false);
  assert.match(s.message, /No custom domain is set/);
});
test('pagesDomainStatus reports no site when Pages is null (404)', () => {
  const s = pagesDomainStatus(null, 'example.com');
  assert.equal(s.configured, false);
  assert.equal(s.ok, false);
  assert.match(s.message, /isn't reporting a site yet/);
});
test('pagesDomainStatus flags a mismatched domain', () => {
  const s = pagesDomainStatus({ status: 'built', cname: 'old.example.com' }, 'blog.example.com');
  assert.equal(s.configured, true);
  assert.equal(s.matches, false);
  assert.equal(s.cname, 'old.example.com');
  assert.equal(s.ok, false);
  assert.match(s.message, /different domain/);
  assert.match(s.message, /blog\.example\.com/);
});
test('pagesDomainStatus is ok + live when matched, cert approved and https enforced', () => {
  const s = pagesDomainStatus(
    { status: 'built', cname: 'example.com', https_enforced: true, https_certificate: { state: 'approved' } },
    'https://Example.com/'
  );
  assert.equal(s.matches, true);
  assert.equal(s.certReady, true);
  assert.equal(s.httpsEnforced, true);
  assert.equal(s.ok, true);
  assert.match(s.message, /live over HTTPS/);
});
test('pagesDomainStatus is ok but cert-pending when matched without an approved cert', () => {
  const s = pagesDomainStatus(
    { status: 'building', cname: 'example.com', https_enforced: false, https_certificate: { state: 'authorization_pending' } },
    'example.com'
  );
  assert.equal(s.matches, true);
  assert.equal(s.certReady, false);
  assert.equal(s.ok, true);
  assert.match(s.message, /provisioning the free HTTPS certificate/);
});
test('pagesDomainStatus with no expected host still reports whatever GitHub has', () => {
  const s = pagesDomainStatus({ status: 'built', cname: 'example.com', https_certificate: { state: 'approved' }, https_enforced: true }, '');
  assert.equal(s.matches, false);       // nothing to match against
  assert.equal(s.configured, true);
  assert.equal(s.ok, true);             // a domain IS configured
  assert.match(s.message, /example\.com/);
});
test('pagesDomainStatus normalises the reported cname', () => {
  const s = pagesDomainStatus({ status: 'built', cname: 'Example.COM.' }, 'example.com');
  assert.equal(s.cname, 'example.com');
  assert.equal(s.matches, true);
});
