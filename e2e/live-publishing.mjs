// Real hosted UI -> GitHub -> isolated test blog. Never targets a personal content repo.
// Requires gh authentication and a running local Helm; HELM_PIN authorises a one-day test licence.
// CHAPBOOK_QA_REPO=chapbook-readiness-YYYYMMDD node e2e/live-publishing.mjs
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { makeGithub } from '../src/seams/github.js';
const repo=process.env.CHAPBOOK_QA_REPO;
assert.match(repo||'',/^chapbook-readiness-\d{8}(?:-\d+)?$/);
const token=execFileSync('gh',['auth','token'],{encoding:'utf8'}).trim();
const {login:owner}=await makeGithub({token}).whoami();
assert.ok(process.env.HELM_PIN,'Set HELM_PIN to authorise the release test licence');
const unlock=await fetch('http://localhost:4800/admin/api/pin/verify',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({pin:process.env.HELM_PIN})});
assert.equal(unlock.status,200);
const {token:admin}=await unlock.json();
const headers={'content-type':'application/json','x-admin-token':admin};
const ledger=await (await fetch('http://localhost:4800/admin/api/licences/?product=studio',{headers})).json();
let testLicence=ledger.find(x=>x.note===`release integration ${repo}`&&x.status==='active');
if(!testLicence){
 const response=await fetch('http://localhost:4800/admin/api/licences/mint',{method:'POST',headers,body:JSON.stringify({product:'studio',name:'Release integration test',note:`release integration ${repo}`,expires:new Date(Date.now()+86400000).toISOString()})});
 assert.equal(response.status,200);testLicence=await response.json();
}
const licence=testLicence.key;
console.log('PASS genuine one-day test licence available (no activation bypass)');
const gh=makeGithub({token,owner,repo,branch:'main'});
const siteUrl=`https://${owner}.github.io/${repo}`;
const cfg=await gh.getFile('src/data/site.json');
await gh.putFile('src/data/site.json',JSON.stringify({...JSON.parse(cfg.content),name:'Chapbook release test notebook',url:siteUrl},null,2),'test: set isolated notebook URL',cfg.sha);
const out='/tmp/chapbook-live-publishing-20261015';await mkdir(out,{recursive:true});
const browser=await chromium.launch();
const results=process.env.ONLY_INTERACTIVE?JSON.parse(await readFile(out+'/results.json','utf8')).filter(p=>!p.slug.includes('interactive-comparison')):[];
try{
for(const project of ['chapbook','atelier']){
  if(process.env.ONLY_INTERACTIVE&&project!=='chapbook')continue;
  const context=await browser.newContext({viewport:{width:1600,height:1100}});
  await context.addInitScript(({token,owner,repo,licence})=>{
    if(window.top!==window)return;
    localStorage.setItem('helm.studio.licence',licence);
    localStorage.setItem('chapbook.legalConsent.v1',JSON.stringify({version:'2026-10-18',termsAccepted:true,noticesAcknowledged:true,ageConfirmed:true,acceptedAt:new Date().toISOString()}));
    localStorage.setItem('helm.studio.config.v1',JSON.stringify({ghOwner:owner,ghRepo:repo,ghToken:token,ghBranch:'main',profile:{name:'Release Test Writer',role:'Writer',writesAbout:'Synthetic test content'}}));
    localStorage.setItem('helm.studio.onboarded','1');
  },{token,owner,repo,licence});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(project==='chapbook'?'https://chapbook.rqai.co.uk/app/':'https://studio.inayatpanda.com/');
  await page.locator('#app').waitFor({state:'visible',timeout:60000});
  console.log(`PASS ${project} hosted activation and GitHub connection`);
  const api=(path,body)=>page.evaluate(({path,body})=>window.__studioApi(path,{method:body?'POST':'GET',...(body?{body:JSON.stringify(body)}:{})}),{path,body});
  const fig=(await api('/figures/build',{familyId:'step-flow',params:{orientation:'h',steps:[{title:'Capture'},{title:'Revise'},{title:'Publish'}]}})).block;
  const interactive=(await api('/playgrounds/build',{familyId:'toggle-ab',params:{title:'Two ways to draft',stateA:{label:'Quick note',caption:'Capture one observation.',readouts:[{label:'Focus',value:'One idea'}]},stateB:{label:'Revised post',caption:'Add context and a clear ending.',readouts:[{label:'Focus',value:'One useful takeaway'}]}}})).block;
  const image=(await readFile(new URL('../src/icon-192.png',import.meta.url))).toString('base64');
  const cases=project==='chapbook' ? [
    {title:'Release test - a small writing ritual',blocks:[{id:'intro',type:'text',html:'<h2>Capture one useful thought</h2><p>This is a synthetic release test. Each morning, write <strong>one observation</strong>, keep the detail concrete, and return to it after lunch.</p><ul><li>Capture the observation.</li><li>Revise the sentence.</li><li>Publish when it is ready.</li></ul>'},{id:'quote',type:'quote',html:'<p>A draft is a place to think.</p>',cite:'Synthetic test quotation'},fig]},
    {title:'Release test - an interactive comparison',blocks:[{id:'intro',type:'text',html:'<p>This synthetic post tests an interactive comparison inside a published article. Switch between the two views below, then resize the page.</p>'},interactive]},
  ] : [
    {title:'Release test - a visual notebook',blocks:[{id:'intro',type:'text',html:'<p>This synthetic photo workflow checks image publishing, a gallery, captions and accessible descriptions. The pictures use the application icon as a harmless test asset.</p>'},{id:'photo',type:'image',file:'notebook.png',base64:image,alt:'Chapbook application icon used as a synthetic image fixture',caption:'A synthetic test image.'},{id:'gallery',type:'gallery',images:[{file:'gallery-a.png',base64:image,alt:'First synthetic gallery image'},{file:'gallery-b.png',base64:image,alt:'Second synthetic gallery image'}]}]},
    {title:'Release test - Atelier editing roundtrip',blocks:[{id:'intro',type:'text',html:'<h2>From draft to published page</h2><p>This synthetic article tests Atelier’s live publishing controls and editable block sidecar.</p><p>The finished page should preserve <em>emphasis</em>, <strong>strong text</strong>, and the diagram below.</p>'},fig]},
  ];
  for(const sample of cases){
    if(process.env.ONLY_INTERACTIVE&&!sample.title.includes('interactive comparison'))continue;
    const existing=process.env.ONLY_INTERACTIVE?(await api('/posts')).find(p=>p.title===sample.title):null;
    if(existing){
      await api('/posts/'+existing.slug+'/publish',{doc:{version:1,blocks:sample.blocks},meta:{title:sample.title,description:'Synthetic release test of an interactive comparison.',draft:false,tags:['interactive']}});
      await page.evaluate(slug=>window.openBlockEditor(slug),existing.slug);
    }else await page.evaluate(d=>window.startNewPost(d),{version:1,blocks:sample.blocks});
    await page.locator('#editorTitle').fill(sample.title);
    await page.evaluate(()=>window.setDraft(false));
    await page.locator('#editorPublishBtn').click();
    await page.locator('#prepublishPanel').waitFor({state:'visible'});
    assert.ok(await page.locator('#ppPublish').isVisible(),await page.locator('#ppBody').innerText());
    await page.locator('#ppPublish').click();
    await page.waitForFunction(()=>document.querySelector('#editorStatus')?.textContent.includes('Sent to website'),null,{timeout:120000});
    const candidates=(await api('/posts')).filter(p=>p.title===sample.title);
    const slug=candidates.sort((a,b)=>b.slug.length-a.slug.length)[0]?.slug;
    assert.ok(slug,'Published post must appear in the real repository list');
    const saved=await gh.getFile(`src/content/blog/${slug}.md`);assert.ok(saved);assert.doesNotMatch(saved.content,/^draft: true$/m);
    const side=JSON.parse((await gh.getFile(`src/content/blog/_blocks/${slug}.json`)).content);assert.equal(side.blocks.length,sample.blocks.length);
    await page.screenshot({path:`${out}/${project}-${slug}.png`});
    const result={project,title:sample.title,slug,url:`${siteUrl}/blog/${slug}/`,status:'PASS'};results.push(result);console.log(JSON.stringify(result));
  }
  assert.deepEqual(errors,[]);
  await context.close();
}
}finally{await browser.close();await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));}
