// Read/write the site's identity config (src/data/site.json) over the github seam.
const PATH = 'src/data/site.json';

export async function getSiteConfig(gh) {
  const f = await gh.getFile(PATH);
  if (!f) return { data: {}, sha: null };
  const data = JSON.parse(f.content);
  // Surface configurable pages + galaxy figure with documented defaults when absent.
  if (!Array.isArray(data.nav)) data.nav = [];
  if (typeof data.core !== 'string') data.core = '';
  return { data, sha: f.sha };
}

export async function putSiteConfig(gh, data, sha) {
  return gh.putFile(PATH, JSON.stringify(data, null, 2) + '\n', 'studio: update site settings', sha || undefined);
}
