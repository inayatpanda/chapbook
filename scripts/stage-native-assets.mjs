// A web deployment includes downloadable installers. Embedding those installers
// inside another installer wastes hundreds of MB and serves no offline purpose.
import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import './assert-deployable.mjs';
const source = resolve('dist'), destination = resolve('native-dist');
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true, filter: path => {
  const rel = relative(source, path);
  return rel !== 'downloads' && !rel.startsWith('downloads/');
}});
console.log('Native assets staged with speech models and glyphs; installer downloads excluded.');
