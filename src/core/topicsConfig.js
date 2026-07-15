// Read/write the site's topic taxonomy (src/data/topics.json) over the github seam.
// Mirrors core/siteConfig.js; `data` is the topics ARRAY. Only name/subtitle/color/blurb
// are edited by the Studio Topics screen — tag + sub are preserved by the caller.
const PATH = 'src/data/topics.json';

export async function getTopicsConfig(gh) {
  const f = await gh.getFile(PATH);
  if (!f) return { data: [], sha: null };
  return { data: JSON.parse(f.content), sha: f.sha };
}

export async function putTopicsConfig(gh, data, sha) {
  return gh.putFile(PATH, JSON.stringify(data, null, 2) + '\n', 'studio: update topics', sha || undefined);
}
