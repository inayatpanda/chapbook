// Pure, importable helpers for the Chapbook marketing build.
// These do the string surgery that build.mjs orchestrates: pulling the live Stripe
// buy link and the legal copy out of the read-only src/index.html, and pouring nav /
// footer / trial partials and price/year tokens into the marketing + legal templates.
//
// Every export is pure (input string in, string out) so it is unit-testable without a
// build. The one exception is renderLegalPage's convenience of reading its default
// template from disk when a caller does not pass one in; the build passes `tpl`
// explicitly so the hot path stays fs-free.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Mirrors the inline `titles` map in src/index.html (openLegal, ~line 5949). Kept in
// sync by hand: if that map changes, update this too.
export const LEGAL_TITLES = { privacy: 'Privacy', terms: 'Terms of use', refunds: 'Refund policy' };

// The legal wrapper doc lives next to this module. Resolve it relative to the module
// (not the cwd) so renderLegalPage's disk fallback works regardless of where it runs.
const LEGAL_TEMPLATE_PATH = fileURLToPath(new URL('./legal.template.html', import.meta.url));

// Pull the single live Stripe buy link out of index.html. The client_reference_id=studio
// query tags the checkout as a Studio licence purchase; the id segment is the live link
// (test links carry a `test_` segment, which the caller asserts against).
export function extractStripeUrl(indexHtml) {
  const m = indexHtml.match(/https:\/\/buy\.stripe\.com\/[A-Za-z0-9_]+\?client_reference_id=studio/);
  if (!m) throw new Error('build-marketing: live Stripe buy URL not found in index.html');
  return m[0];
}

// Return the INNER html of `<div id="legal-<kind>" hidden> … </div>`. The legal blocks
// carry no nested <div>, and each closes with `</div>` at column 0, so a non-greedy match
// up to the first `\n</div>` lands on the real closing tag. Throws if the block is absent.
export function extractLegalBlock(indexHtml, kind) {
  const re = new RegExp(`<div id="legal-${kind}" hidden>([\\s\\S]*?)\\n</div>`);
  const m = indexHtml.match(re);
  if (!m) throw new Error(`build-marketing: legal block #legal-${kind} not found in index.html`);
  return m[1].trim();
}

// Fill a marketing page's markers and tokens. Markers are HTML comments that get replaced
// by whole partials; tokens are %%…%% placeholders. Order matters: partials (footer) are
// injected first so any %%YEAR%% they carry is then resolved by the token pass below.
export function injectMarketing(pageHtml, { nav, footer, trial, stripeUrl, price, year }) {
  return pageHtml
    .replaceAll('<!-- MKT:NAV -->', nav ?? '')
    .replaceAll('<!-- MKT:FOOTER -->', footer ?? '')
    .replaceAll('<!-- MKT:TRIAL -->', trial ?? '')
    .replaceAll('%%STRIPE_BUY_URL%%', stripeUrl ?? '')
    .replaceAll('%%PRICE%%', price ?? '')
    .replaceAll('%%YEAR%%', String(year));
}

// Render one standalone legal page. Fills the legal-specific tokens (title, kind, body)
// then runs the shared marketing injection for nav/footer/year. `tpl` may be passed in
// (build.mjs reads it once); when omitted it is read from disk next to this module.
export function renderLegalPage({ kind, title, inner, nav, footer, year, tpl }) {
  const template = tpl ?? readFileSync(LEGAL_TEMPLATE_PATH, 'utf8');
  const withBody = template
    .replaceAll('%%LEGAL_TITLE%%', title)
    .replaceAll('%%LEGAL_KIND%%', kind)
    .replaceAll('<!-- MKT:LEGAL_BODY -->', inner);
  return injectMarketing(withBody, { nav, footer, trial: '', stripeUrl: '', price: '', year });
}
