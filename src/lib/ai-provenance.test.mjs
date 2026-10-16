import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanProvenance, postProvenance } from './ai-provenance.js';
import { parse, serialise } from './frontmatter.js';
import { serialiseBlocks } from './blocks.js';
import { makePosts } from '../core/posts.js';
const origin = [{ kind: 'generated', tool: 'AI', action: 'ai/generate-image' }];
test('origin metadata carries only bounded technical fields and survives frontmatter roundtrip', () => {
  const clean = cleanProvenance([...origin, { ...origin[0], prompt: 'private', key: 'secret' }, { kind: 'made-up' }]);
  assert.deepEqual(clean, origin);
  const md = serialise({ data: { title: 'Example', aiProvenance: clean, aiDisclosure: 'AI illustration; reviewed by the author.' }, body: 'Post' });
  assert.deepEqual(parse(md).data.aiProvenance, origin);
  assert.ok(!md.includes('private')); assert.ok(!md.includes('secret'));
});
test('origin is scoped to marked blocks; ordinary human text stays unlabelled', () => {
  const body = serialiseBlocks([{ type: 'text', html: 'Human text' }, { type: 'text', html: 'Generated text', aiProvenance: origin }]);
  assert.ok(body.startsWith('Human text\n\n<!-- chapbook-ai-origin:'));
  assert.match(body, /data-ai-origin="generated"/);
  assert.equal(postProvenance({blocks:[]}).length,0);
});
test('publishing preserves original generated image bytes, disclosure and block origins', async () => {
  let changes;
  const gh={async commitMany(c){changes=c;return {commit:'synthetic'};}};
  const bytes=Buffer.from('synthetic image with provider metadata').toString('base64');
  await makePosts(gh).publishBlocks('synthetic', {version:1,blocks:[{id:'img',type:'image',file:'image.png',base64:bytes,mimeType:'image/png',caption:'AI-generated illustration',aiProvenance:origin}]}, {title:'Synthetic',aiDisclosure:'AI image <script>alert(1)</script>'});
  const markdown=changes.find(c=>c.path.endsWith('.md')).content;
  const sidecar=JSON.parse(changes.find(c=>c.path.endsWith('.json')).content);
  assert.equal(changes.find(c=>c.base64).base64,bytes);
  assert.deepEqual(parse(markdown).data.aiProvenance,origin);
  assert.deepEqual(sidecar.blocks[0].aiProvenance,origin);
  assert.match(markdown,/data-ai-disclosure="true"/); assert.ok(!markdown.includes('<script>alert'));
});
