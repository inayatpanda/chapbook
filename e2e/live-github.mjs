// Opt-in integration test: creates ONE private synthetic repository, never edits a user's blog.
// CHAPBOOK_QA_REPO=chapbook-readiness-YYYYMMDD node e2e/live-github.mjs
// Requires an authenticated gh CLI. Credentials stay in memory.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { makeGithub } from '../src/seams/github.js';
import { makePosts } from '../src/core/posts.js';
const name=process.env.CHAPBOOK_QA_REPO;
assert.match(name||'',/^chapbook-readiness-\d{8}(?:-\d+)?$/,'Explicit test repository name required');
const token=execFileSync('gh',['auth','token'],{encoding:'utf8'}).trim();
const initial=makeGithub({token});
const {login:owner}=await initial.whoami();
const repo=process.argv.includes('--resume') ? {fullName:`${owner}/${name}`,branch:'main'} : await initial.generateFromTemplate({templateOwner:'RQAI-projects',templateRepo:'chapbook-template',owner,name,isPrivate:true,description:'Synthetic Chapbook/Atelier release integration evidence. No personal content.'});
console.log(JSON.stringify({step:'create-from-template',status:'PASS',repository:repo.fullName,private:true}));
const gh=makeGithub({token,owner,repo:name,branch:repo.branch});
for(let i=0;i<30;i++){
  if(await gh.getFile('package.json'))break;
  await new Promise(r=>setTimeout(r,2000));
}
assert.ok(await gh.getFile('package.json'));
// Exercise the proposed template fixes before updating the public template.
await gh.commitMany(await Promise.all(['.github/workflows/scheduled-publish.yml','src/lib/darkroom-build.mjs'].map(async path=>({path,content:await readFile(new URL('../../chapbook-template/'+path,import.meta.url),'utf8')}))),'test: install candidate scheduling and photo build fixes');
let pages;
try{pages=await gh.enablePages({owner,repo:name});console.log(JSON.stringify({step:'enable-pages',status:'PASS',url:pages.url}));}
catch(e){console.log(JSON.stringify({step:'enable-pages',status:'BLOCKED',reason:e.message}));}
const posts=makePosts(gh);
const doc={version:1,blocks:[{id:'prose',type:'text',html:'<p>Synthetic release integration check with <strong>formatting</strong>.</p>'}]};
await posts.publishBlocks('readiness',doc,{title:'Synthetic readiness check',description:'Integration test content',tags:['test']});
assert.match((await posts.getPost('readiness')).body,/\*\*formatting\*\*|<strong>formatting<\/strong>/);
assert.equal((await posts.getPostBlocks('readiness')).source,'sidecar');
console.log(JSON.stringify({step:'atomic-publish-and-block-sidecar',status:'PASS'}));
await posts.takedownPost('readiness');assert.equal((await posts.getPost('readiness')).data.draft,true);
await posts.republishPost('readiness');assert.notEqual((await posts.getPost('readiness')).data.draft,true);
const copy=await posts.duplicatePost('readiness');assert.equal((await posts.getPost(copy.slug)).data.draft,true);
await posts.deletePost(copy.slug);assert.equal(await posts.getPost(copy.slug),null);
console.log(JSON.stringify({step:'take-down-republish-duplicate-delete',status:'PASS'}));
await posts.publishBlocks('scheduled-readiness',doc,{title:'Synthetic scheduled readiness check',publishAt:'2020-01-01T00:00:00Z'});
assert.equal((await posts.getPost('scheduled-readiness')).data.draft,true);
execFileSync('gh',['workflow','enable','scheduled-publish.yml','--repo',repo.fullName],{stdio:'pipe'});
execFileSync('gh',['workflow','run','scheduled-publish.yml','--repo',repo.fullName],{stdio:'pipe'});
console.log(JSON.stringify({step:'schedule-hidden-and-dispatch',status:'PASS',repository:repo.fullName}));
