// Opt-in paid-provider checks. Never saves the key, prompts, or generated content.
// GEMINI_API_KEY=... node e2e/live-gemini.mjs [feature ...]
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeAi } from '../src/seams/ai.js';
import * as studio from '../src/lib/studio.js';
import { validateDoc } from '../src/lib/blocks.js';

const key = process.env.GEMINI_API_KEY;
assert.ok(key, 'Set GEMINI_API_KEY for this opt-in live test.');
const ai = makeAi({ getAi: () => ({ provider:'google', key, model:process.env.GEMINI_MODEL || 'gemini-flash-latest' }), save() {} });
const image = readFileSync(new URL('../src/icon-192.png', import.meta.url)).toString('base64');
const source = 'A notebook helps a writer capture ideas. Write one sentence each morning, review it on Friday, and expand the strongest idea into a short post.';
const doc = { version:1, blocks:[{ id:'p1', type:'text', html:`<p>${source}</p>` }] };
const nonempty = v => assert.ok(typeof v === 'string' && v.trim().length > 0, 'Expected non-empty text');
const validDoc = d => { assert.ok(d?.blocks?.length); assert.equal(validateDoc(d), true); };
const figure = r => { assert.equal(r.block?.type,'figure'); assert.match(r.block.svg, /<svg[\s>]/); assert.doesNotMatch(r.block.svg, /<script|onload=/i); };
const cases = {
  text: async () => nonempty((await ai.generateText({prompt:'Reply with the word ready.',maxTokens:500})).text),
  draft: async () => nonempty((await studio.draftPost({idea:source},ai)).post),
  expand: async () => { const r=await studio.expandToBlog({idea:source},ai); assert.ok(JSON.stringify(r).length>100); },
  social: async () => { const r=await studio.socialPack({source},ai); assert.ok(Object.keys(r).length); },
  repurpose: async () => { const r=await studio.repurposeThread({source},ai); assert.ok(JSON.stringify(r).length>100); },
  ideas: async () => { const r=await studio.goblinMode({topic:'keeping a notebook'},ai); assert.ok(r.ideas?.length); },
  editor: async () => { const r=await studio.editorPass({doc},ai); nonempty(r.summary); },
  structure: async () => validDoc(await studio.structureNotes({notes:source},ai)),
  alt: async () => nonempty((await studio.altText({imageBase64:image,mimeType:'image/png'},ai)).alt),
  rewrite: async () => { const r=await studio.rewriteText({text:source},ai); assert.ok(JSON.stringify(r).length>50); },
  seo: async () => nonempty((await studio.seoSuggest({title:'Keep a notebook',body:source},ai)).description),
  citation: async () => { const r=await studio.formatCitation({raw:'Darwin C. On the Origin of Species. London: John Murray; 1859.'},ai); assert.ok(JSON.stringify(r).length>30); },
  document: async () => { const r=await studio.importDocument({fileBase64:image,mimeType:'image/png'},ai); assert.ok(Array.isArray(r.blocks)); },
  image: async () => { const r=await studio.genImage({prompt:'A simple blue notebook on a cream background. No text.',size:'1024x1024'},ai); assert.ok(r.base64?.length>100 || r.url); },
  interactive: async () => { const r=await studio.suggestInteractive({description:'A colour palette with three blue swatches'},ai); assert.equal(r.block?.type,'playground'); nonempty(r.block.html); },
  tweakInteractive: async () => { const r=await studio.tweakInteractive({familyId:'toggle-ab',instruction:'Compare writing in the morning with writing at night',params:{}},ai); nonempty(r.block.html); },
  figure: async () => figure(await studio.suggestFigure({description:'Three steps: capture, review, publish'},ai)),
  tweakFigure: async () => figure(await studio.tweakFigure({familyId:'step-flow',params:{},instruction:'Use three steps: Capture, Review, Publish'},ai)),
  inventInteractive: async () => { const r=await studio.inventInteractive({description:'A button that counts clicks with a reset button'},ai); assert.ok(!r.jsError,r.jsError); nonempty(r.html || r.block?.html); },
  inventFigure: async () => figure(await studio.inventFigure({description:'A simple notebook with three horizontal lines'},ai)),
  sticker: async () => figure(await studio.generateSticker({description:'A little blue notebook'},ai)),
  vectorise: async () => figure(await studio.vectoriseSketch({image,mimeType:'image/png'},ai)),
  labels: async () => { const r=await studio.suggestLabels({description:'A notebook with a cover, pages, and binding'},ai); assert.ok(r.labels?.length); },
};
let failed=0;
for (const name of (process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(cases))) {
  const start=Date.now();
  try { assert.ok(cases[name],`Unknown test ${name}`); await cases[name](); console.log(JSON.stringify({feature:name,status:'PASS',ms:Date.now()-start})); }
  catch(e) { failed++; console.log(JSON.stringify({feature:name,status:'FAIL',ms:Date.now()-start,code:e.code,http:e.status,error:String(e.message).replaceAll(key,'[REDACTED]').slice(0,350)})); }
}
process.exitCode=failed?1:0;
