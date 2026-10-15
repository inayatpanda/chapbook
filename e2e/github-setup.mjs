// Browser integration coverage for both independently built apps.
// node e2e/release-readiness.mjs chapbook|atelier
// GitHub is a stateful transport fixture: no real account or public posts are changed.
// The HTTP fixture substitutes a disposable licence public key IN MEMORY only.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { mintTestLicence, TEST_PUBLIC_KEY_HEX } from '../test/fixtures/testLicence.mjs';

const project=process.argv[2] || 'chapbook';
assert.ok(['chapbook','atelier'].includes(project));
const projects=fileURLToPath(new URL('../..',import.meta.url));
const root=resolve(projects,project,'dist');
const artifacts=process.env.READINESS_OUTPUT || `/tmp/${project}-readiness-20261015`;
await mkdir(artifacts,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.webmanifest':'application/manifest+json','.wasm':'application/wasm'};
const server=createServer(async(req,res)=>{
  try {
    let path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
    if(path!==root && !path.startsWith(root+sep)) throw Error('outside root');
    if((await stat(path)).isDirectory()) path+='/index.html';
    let body=await readFile(path);
    if(path.endsWith('index.html')) body=Buffer.from(body.toString().replace(/window\.__LICENCE_PUBLIC_KEY='[^']*'/,`window.__LICENCE_PUBLIC_KEY='${TEST_PUBLIC_KEY_HEX}'`));
    res.writeHead(200,{'content-type':mime[extname(path)]||'application/octet-stream','cache-control':'no-store','content-security-policy':"default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline' https:; img-src * data: blob:; connect-src *; font-src * data:; frame-src * data: blob:; worker-src 'self' blob:;"});res.end(body);
  } catch {res.writeHead(404);res.end('not found');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
const url=origin+(project==='chapbook'?'/app/':'/');
const browser=await chromium.launch();
const results=[];
async function check(name,fn){
  try{await fn();results.push({name,status:'PASS'});console.log(`PASS ${name}`);}
  catch(e){results.push({name,status:'FAIL',error:String(e.message).slice(0,650)});console.log(`FAIL ${name}: ${String(e.message).slice(0,300)}`);}
}


const licence=mintTestLicence();
async function scenario(name, run, options={}){
 await check(name,async()=>{
  const ctx=await browser.newContext({viewport:{width:options.mobile?390:1280,height:900}});
  const state={listFail:false, repoKind:'valid', account:'writer', generated:0, writeFail:false, pollCalls:0};
  await ctx.addInitScript(({licence})=>{
   if (window.top !== window) return;
   if(!localStorage.getItem('setup.seeded')){
    localStorage.setItem('helm.studio.licence',licence);
    localStorage.setItem('chapbook.legalConsent.v1',JSON.stringify({version:'2026-08-08',termsAccepted:true,noticesAcknowledged:true,ageConfirmed:true,acceptedAt:new Date().toISOString()}));
    localStorage.setItem('helm.studio.config.v1',JSON.stringify({ghOwner:'writer',ghRepo:'notebook',ghBranch:'main',ghToken:'original-token',ghLogin:'writer',ghAuthMethod:'device',profile:{name:'Writer'}}));
    localStorage.setItem('helm.studio.onboarded','1');localStorage.setItem('helm.studio.gettingStarted.dismissed','1');localStorage.setItem('setup.seeded','1');
   }
  },{licence});
  await ctx.route('**/*gh-device',async route=>{
   const data=route.request().postDataJSON();
   if(data.step==='token')state.pollCalls++;
   await route.fulfill({contentType:'application/json',body:JSON.stringify(data.step==='code'?{device_code:'code',user_code:'TEST-CODE',verification_uri:'https://github.com/login/device',interval:1,expires_in:900}:{access_token:'replacement-token'})});
  });
  await ctx.route('https://api.github.com/**',async route=>{
   const req=route.request(),u=new URL(req.url()),p=u.pathname;
   const reply=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
   if(p==='/user')return reply({login:req.headers().authorization?.includes('replacement')?'other-writer':'writer'});
   if(p==='/user/repos')return state.listFail?reply({message:'temporarily unavailable'},503):reply([{full_name:'writer/notebook',name:'notebook',owner:{login:'writer'},default_branch:'main'},{full_name:'team/second-site',name:'second-site',owner:{login:'team'},default_branch:'website'}]);
   if(p.endsWith('/generate')){state.generated++;return reply({full_name:'writer/new-site',name:'new-site',owner:{login:'writer'},default_branch:'main'},201)}
   if(p.includes('/branches/'))return reply({},state.repoKind==='branch'?404:200);
   if(p.endsWith('/contents/src/data/site.json')){
    if(req.method()==='PUT')return state.writeFail?reply({message:'temporary failure'},503):reply({commit:{sha:'new'}});
    return state.repoKind==='wrong'?reply({message:'not found'},404):reply({sha:'site',encoding:'base64',content:Buffer.from(JSON.stringify({name:'Test website',defaultTheme:'observatory'})).toString('base64')});
   }
   if(p.match(/^\/repos\/[^/]+\/[^/]+$/))return reply({name:'site',default_branch:'main',permissions:{push:state.repoKind!=='readonly'}});
   if(p.endsWith('/pages'))return reply({html_url:'https://writer.github.io/new-site/'});
   if(p.includes('/contents/'))return reply({message:'Not Found'},404);
   return reply({tree:[]});
  });
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(url);await page.waitForFunction(()=>!!window.__studioOnboard);
   await page.evaluate(()=>window.__studioOnboard());
   await page.locator('#gh-repo-select option').first().waitFor({state:'attached'});
   await run(page,state);
   assert.deepEqual(errors,[]);
  }finally{await ctx.close();}
 });
}
const current=page=>page.evaluate(()=>window.__studioConfig.all());
try{
 await scenario('GitHub service and permission errors give the correct recovery advice',async page=>{
  const errors=await page.evaluate(()=>[403,401,503].map(status=>{const e=window.classifyError({raw:Object.assign(new Error(status===403?'API rate limit exceeded':'Service error'),{status,code:'GITHUB_HTTP'})});return {kind:e.kind,message:e.message};}));
  assert.equal(errors[0].kind,'github');assert.match(errors[0].message,/limiting requests/);
  assert.equal(errors[1].kind,'auth');assert.match(errors[1].message,/Sign in again/);
  assert.equal(errors[2].kind,'github');assert.match(errors[2].message,/GitHub is temporarily unavailable/);
 });
 await scenario('manual token path validates the chosen repository before saving',async(page,state)=>{
  const details=page.locator('details').filter({has:page.locator('#byok-token')});await details.locator('summary').click();
  await page.locator('#byok-owner').fill('team');await page.locator('#byok-repo').fill('second-site');await page.locator('#byok-token').fill('manual-token');
  state.repoKind='wrong';await page.locator('#byok-save').click();await page.locator('#byok-msg').filter({hasText:'not a compatible'}).waitFor();assert.equal((await current(page)).ghToken,'original-token');
  state.repoKind='valid';await page.locator('#byok-save').click();await page.waitForFunction(()=>window.__studioConfig.all().ghToken==='manual-token');
 });
 await scenario('publish confirmation distinguishes GitHub save from website deployment',async page=>{
  await page.evaluate(async()=>{document.querySelector('#byok-overlay')?.remove();await window.offerAnnounce('https://writer.github.io/notebook/blog/test/','Test');});
  assert.match(await page.locator('#pubBar').innerText(),/website updating/);
  assert.equal(await page.locator('#pubBar a').filter({hasText:'Check website build'}).getAttribute('href'),'https://github.com/writer/notebook/actions');
 });
 await scenario('saved sign-in restores searchable repository picker on mobile',async page=>{
  assert.match(await page.locator('#gh-signedin').textContent(),/@writer/);
  await page.locator('#gh-repo-search').fill('second');assert.equal(await page.locator('#gh-repo-select option').count(),1);
  assert.equal(await page.locator('#gh-create details').getAttribute('open'),null);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:artifacts+'/github-setup-mobile.png',fullPage:true});
 },{mobile:true});
 await scenario('repository list failure is visible and retry does not reauthenticate',async(page,state)=>{
  state.listFail=true;await page.locator('#gh-repo-retry').click();await page.getByRole('status').filter({hasText:'temporarily unavailable'}).waitFor();
  assert.ok(await page.locator('#gh-repo-use').isDisabled());
  state.listFail=false;await page.locator('#gh-repo-retry').click();await page.getByRole('status').filter({hasText:'2 repositories'}).waitFor();
  assert.equal((await current(page)).ghToken,'original-token');assert.equal(state.pollCalls,0);
 });
 for(const [kind,error]of [['wrong','not a compatible'],['readonly','read-only'],['branch','not found']]){
  await scenario('rejects '+kind+' repository without replacing current connection',async(page,state)=>{
   state.repoKind=kind;await page.locator('#gh-repo-select').selectOption('team/second-site');await page.locator('#gh-repo-use').click();
   await page.locator('#byok-msg').filter({hasText:error}).waitFor();assert.equal((await current(page)).ghRepo,'notebook');
  });
 }
 await scenario('repository choice validates then preserves its actual default branch',async page=>{
  await page.locator('#gh-repo-select').selectOption('team/second-site');await page.locator('#gh-repo-use').click();
  await page.waitForFunction(()=>window.__studioConfig.all().ghRepo==='second-site');const c=await current(page);assert.equal(c.ghOwner,'team');assert.equal(c.ghBranch,'website');
 });
 await scenario('closing setup cancels polling and retains the existing connection',async(page,state)=>{
  await page.locator('#gh-start').click();await page.locator('#gh-code').filter({hasText:'TEST-CODE'}).waitFor();await page.locator('#byok-close').click();
  await page.waitForTimeout(1200);assert.equal(await page.locator('#byok-overlay').count(),0);assert.equal(state.pollCalls,0);assert.equal((await current(page)).ghToken,'original-token');
 });
 await scenario('cancelling device sign-in prevents a late token from changing the connection',async(page,state)=>{
  await page.locator('#gh-start').click();await page.locator('#gh-code').filter({hasText:'TEST-CODE'}).waitFor();await page.locator('#gh-cancel').click();
  await page.waitForTimeout(1200);assert.equal(state.pollCalls,0);assert.equal((await current(page)).ghToken,'original-token');
 });
 await scenario('switching accounts stages credentials until the new website is chosen',async page=>{
  await page.locator('#gh-start').click();await page.locator('#gh-signedin').filter({hasText:'other-writer'}).waitFor();
  assert.equal((await current(page)).ghToken,'original-token');
  await page.locator('#gh-repo-select').selectOption('team/second-site');await page.locator('#gh-repo-use').click();
  await page.waitForFunction(()=>window.__studioConfig.all().ghToken==='replacement-token');assert.equal((await current(page)).ghLogin,'other-writer');
 });
 await scenario('retry after partial website creation resumes the same repository',async(page,state)=>{
  await page.locator('#gh-create summary').click();await page.locator('#cb-name').fill('New site');state.writeFail=true;
  await page.locator('#cb-go').click();await page.locator('#cb-status').filter({hasText:'Could not create'}).waitFor();assert.equal(state.generated,1);
  state.writeFail=false;await page.locator('#cb-go').click();await page.locator('#cb-continue').waitFor();assert.equal(state.generated,1);assert.equal((await current(page)).ghRepo,'new-site');
 });
}finally{
 await browser.close();await new Promise(r=>server.close(r));await writeFile(artifacts+'/github-setup-results.json',JSON.stringify(results,null,2));
}
console.log(`${results.filter(r=>r.status==='PASS').length} passed; ${results.filter(r=>r.status==='FAIL').length} failed`);
if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
