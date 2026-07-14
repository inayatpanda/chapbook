// Template loader — reads all *.json files in this directory at module load.
// Exports listTemplates() → array sorted blank-first, then alphabetical by name.
// Resilient: skips files that fail to parse rather than crashing boot.

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const DIR = dirname(fileURLToPath(import.meta.url));

const templates = [];

for (const file of readdirSync(DIR)) {
  if (extname(file) !== '.json') continue;
  try {
    const raw = readFileSync(join(DIR, file), 'utf8');
    templates.push(JSON.parse(raw));
  } catch (e) {
    console.warn(`[templates] skipping ${file} — parse error: ${e.message}`);
  }
}

// Sort: blank always first, then alphabetical by name
templates.sort((a, b) => {
  if (a.id === 'blank') return -1;
  if (b.id === 'blank') return 1;
  return (a.name || '').localeCompare(b.name || '');
});

export function listTemplates() {
  return templates;
}
