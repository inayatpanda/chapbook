// Browser-safe template registry for BYOK Studio. The server reads the same *.json
// files from disk (server/templates/index.js); here we static-import them so esbuild
// bundles them into the client (no node:fs in the browser). Keep this list in sync
// with the files in server/templates/ — both surfaces must offer the same templates.
import blank from '../lib/templates/blank.json' with { type: 'json' };
import announcement from '../lib/templates/announcement.json' with { type: 'json' };
import essay from '../lib/templates/essay.json' with { type: 'json' };
import howTo from '../lib/templates/how-to.json' with { type: 'json' };
import interactive from '../lib/templates/interactive.json' with { type: 'json' };
import listRoundup from '../lib/templates/list-roundup.json' with { type: 'json' };
import photoStory from '../lib/templates/photo-story.json' with { type: 'json' };
import review from '../lib/templates/review.json' with { type: 'json' };
import travelNote from '../lib/templates/travel-note.json' with { type: 'json' };

const all = [blank, announcement, essay, howTo, interactive, listRoundup, photoStory, review, travelNote];

// Sort: blank always first, then alphabetical by name — identical to the server loader.
all.sort((a, b) => {
  if (a.id === 'blank') return -1;
  if (b.id === 'blank') return 1;
  return (a.name || '').localeCompare(b.name || '');
});

export const templates = { list: () => all };
