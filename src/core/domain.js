// Custom-domain helpers for the Studio's Site-settings panel. PURE + unit-tested
// (studio-app/core/domain.test.mjs) — no DOM, no network. Shared by the inline UI
// (bundled via build.mjs → window.__studioDomain) and the tests.
//
// A GitHub-Pages custom domain needs three things, all derivable here:
//   1. a validated BARE hostname (apex or sub-domain — no scheme, path, or port),
//   2. the exact bytes of the repo-root `CNAME` file (the bare host + a trailing \n),
//   3. the DNS records the owner must add at their registrar.

// Normalise loose user input to a candidate hostname: trim, drop a scheme,
// any path/query/hash, a :port, and a single trailing dot, then lowercase.
// A leading "www." is KEPT (validated separately). Returns '' for blank.
export function normaliseDomain(input) {
  let s = String(input || '').trim().toLowerCase();
  if (!s) return '';
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//, ''); // strip scheme://
  s = s.replace(/[/?#].*$/, '');                // strip path / query / fragment
  s = s.replace(/:\d+$/, '');                   // strip :port
  s = s.replace(/\.$/, '');                     // strip a single trailing dot (FQDN form)
  return s;
}

// Is `input` a valid BARE hostname for a custom domain? Apex (example.com) or
// sub-domain (blog.example.com / www.example.com) — at least two labels, each
// 1–63 chars of [a-z0-9-] not starting/ending with a hyphen, a letter-led TLD
// of ≥2 chars. No scheme/path/port (those are stripped first, so e.g.
// "https://x.com/p" → valid x.com, but a bare "localhost" or "x" is rejected).
export function isValidDomain(input) {
  const s = normaliseDomain(input);
  if (!s || s.length > 253) return false;
  const labels = s.split('.');
  if (labels.length < 2) return false;
  const tld = labels[labels.length - 1];
  if (!/^[a-z][a-z0-9-]*$/.test(tld) || tld.length < 2) return false;       // TLD: letter-led, ≥2
  const labelRe = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;                            // no leading/trailing hyphen
  return labels.every((l) => labelRe.test(l));
}

// True when the host is an apex/naked domain (exactly two labels, e.g. example.com).
// Apex domains can't use a CNAME record → they need the four GitHub A records.
export function isApex(input) {
  const s = normaliseDomain(input);
  return isValidDomain(s) && s.split('.').length === 2;
}

// The exact CONTENT of the repo-root `CNAME` file: the bare host + ONE trailing
// newline (GitHub writes it this way; matching avoids needless churn). Throws on
// an invalid domain so callers never commit rubbish.
export function cnameFileContent(input) {
  const s = normaliseDomain(input);
  if (!isValidDomain(s)) throw new Error('Enter a valid domain, e.g. example.com');
  return s + '\n';
}

// GitHub Pages' apex A-record IPs (https://docs.github.com/pages custom-domain docs).
export const GH_PAGES_A = ['185.199.108.153', '185.199.109.153', '185.199.110.153', '185.199.111.153'];

// The DNS records the owner must add at their registrar, given the chosen domain
// and their github user (for the www-style CNAME target `<user>.github.io`).
// Returns an ordered array of { type, host, value, note } rows for display.
//   • apex (example.com):     four A records on @  + a www CNAME → <user>.github.io
//   • sub-domain (x.example): one CNAME on the sub-label → <user>.github.io
export function dnsRecordsFor(input, ghUser) {
  const s = normaliseDomain(input);
  if (!isValidDomain(s)) return [];
  const user = String(ghUser || '').trim().toLowerCase();
  const target = user ? `${user}.github.io` : '<your-user>.github.io';
  const labels = s.split('.');

  if (labels.length === 2) {
    // Apex: A records on @, plus a courtesy www CNAME so www.<apex> also resolves.
    const rows = GH_PAGES_A.map((ip) => ({ type: 'A', host: '@', value: ip, note: 'GitHub Pages' }));
    rows.push({ type: 'CNAME', host: 'www', value: target, note: 'so www also works' });
    return rows;
  }
  // Sub-domain: a single CNAME on the left-most label → <user>.github.io.
  const sub = labels.slice(0, labels.length - 2).join('.') || labels[0];
  return [{ type: 'CNAME', host: sub, value: target, note: 'GitHub Pages' }];
}

// Interpret a GitHub Pages API response (GET /repos/{owner}/{repo}/pages) against the
// domain the user is trying to set. PURE — no network; the seam does the fetch and hands
// the parsed JSON (or null when Pages isn't enabled / 404) in here. `expectedInput` is the
// domain the user typed (optional: when blank we just report whatever GitHub has). Returns
// a flat status the UI can render verbatim:
//   { configured, matches, cname, built, httpsEnforced, certState, certReady, ok, message }
export function pagesDomainStatus(pages, expectedInput) {
  const host = normaliseDomain(expectedInput);
  const cname = pages && pages.cname ? normaliseDomain(pages.cname) : '';
  const built = !!(pages && pages.status === 'built');
  const httpsEnforced = !!(pages && pages.https_enforced);
  const cert = pages && pages.https_certificate;
  const certState = cert && cert.state ? String(cert.state) : '';
  const certReady = certState === 'approved';
  const configured = !!cname;
  const matches = configured && !!host && cname === host;

  let message;
  if (!pages) {
    message = "GitHub Pages isn't reporting a site yet — publish once (or wait a moment after enabling Pages), then check again.";
  } else if (!configured) {
    message = 'No custom domain is set on GitHub yet. Add the DNS records above, press "Connect this domain", then check again in a few minutes.';
  } else if (host && !matches) {
    message = `GitHub currently has a different domain set (${cname}). Press "Connect this domain" again to switch it to ${host}.`;
  } else {
    const shown = host || cname;
    if (certReady && httpsEnforced) message = `${shown} is verified and live over HTTPS ✓`;
    else if (certReady) message = `${shown} is verified and its HTTPS certificate is ready ✓`;
    else message = `${shown} is set on GitHub. It's still provisioning the free HTTPS certificate — this can take a few minutes, up to an hour the first time. Check again shortly.`;
  }

  // "ok" = the domain is correctly registered on GitHub (matches what we asked for, or —
  // when no expected host was given — simply that a custom domain is configured).
  const ok = matches || (configured && !host);
  return { configured, matches, cname, built, httpsEnforced, certState, certReady, ok, message };
}
