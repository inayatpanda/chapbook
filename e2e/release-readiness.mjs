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

// Minimal stateful GitHub REST/Git Data API; exercises the real application seam.
function githubFixture(){
  const files=new Map([
    ['src/data/site.json',JSON.stringify({name:'Readiness notebook',url:'https://writer.github.io/notebook',defaultTheme:'observatory'})],
    ['src/data/topics.json',JSON.stringify([{id:'notes',label:'Notes'}])],
    ['src/data/themes.json',JSON.stringify({themes:[{id:'observatory',name:'Observatory'}]})],
  ]);
  const blobs=new Map(),trees=new Map(),commits=new Map();let n=0,head='initial';
  commits.set(head,{tree:{sha:'initial-tree'}});
  const sha=()=>`fixture-${++n}`;
  const route=async route=>{
    const request=route.request(),u=new URL(request.url()),p=decodeURIComponent(u.pathname),method=request.method(),data=request.postDataJSON();
    const reply=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
    if(p==='/user') return reply({login:'writer',name:'Readiness Writer'});
    if(p==='/user/repos') return reply([{name:'notebook',full_name:'writer/notebook',owner:{login:'writer'},default_branch:'main',private:false}]);
    const contents=p.match(/\/contents\/(.*)/)?.[1];
    if(contents!=null){
      if(method==='PUT'){files.set(contents,Buffer.from(data.content,'base64').toString());return reply({content:{sha:sha()},commit:{sha:sha()}});}
      if(method==='DELETE'){files.delete(contents);return reply({commit:{sha:sha()}});}
      if(files.has(contents)) return reply({name:contents.split('/').pop(),path:contents,type:'file',sha:'blob-'+contents,content:Buffer.from(files.get(contents)).toString('base64'),encoding:'base64'});
      const list=[...files.keys()].filter(f=>f.startsWith(contents+'/')&&!f.slice(contents.length+1).includes('/')).map(f=>({name:f.split('/').pop(),path:f,type:'file',sha:'blob-'+f}));
      return list.length?reply(list):reply({message:'Not Found'},404);
    }
    if(p.includes('/git/ref/heads/')) return reply({object:{sha:head}});
    if(p.endsWith('/git/blobs')&&method==='POST'){const s=sha();blobs.set(s,data.encoding==='base64'?Buffer.from(data.content,'base64').toString():data.content);return reply({sha:s},201);}
    if(p.endsWith('/git/trees')&&method==='POST'){const s=sha();trees.set(s,data.tree);return reply({sha:s},201);}
    if(p.endsWith('/git/commits')&&method==='POST'){const s=sha();commits.set(s,{tree:{sha:data.tree},parents:data.parents});return reply({sha:s},201);}
    if(p.includes('/git/commits/')) return reply(commits.get(p.split('/').pop())||{tree:{sha:'initial-tree'}});
    if(p.includes('/git/trees/')) return reply({tree:[...files.keys()].map(path=>({path,type:'blob',size:files.get(path).length}))});
    if(p.includes('/git/refs/heads/')&&method==='PATCH'){
      head=data.sha;for(const f of trees.get(commits.get(head).tree.sha)||[]){if(f.sha===null) files.delete(f.path);else files.set(f.path,blobs.get(f.sha));}return reply({object:{sha:head}});
    }
    if(p.endsWith('/pages')) return reply({html_url:'https://writer.github.io/notebook/',status:'built',build_type:'workflow'});
    return reply({message:'Not Found'},404);
  };
  return {route,files};
}

const context=await browser.newContext({viewport:{width:1440,height:1000}});
const gh=githubFixture();
await context.route('https://api.github.com/**',gh.route);
await context.route(/https:\/\/(?!api\.github\.com)/,route=>{
  if(process.env.GEMINI_API_KEY && new URL(route.request().url()).hostname==='generativelanguage.googleapis.com') return route.continue();
  return route.fulfill({status:404,body:'Test fixture: external request not enabled'});
});
await context.addInitScript(({licence,geminiKey})=>{
  if(window.top !== window) return;
  if(!localStorage.getItem('readiness.seeded')){
    localStorage.setItem('helm.studio.licence',licence);
    localStorage.setItem('chapbook.legalConsent.v1',JSON.stringify({version:'2026-10-18',termsAccepted:true,noticesAcknowledged:true,ageConfirmed:true,acceptedAt:new Date().toISOString()}));
    localStorage.setItem('helm.studio.config.v1',JSON.stringify({ghOwner:'writer',ghRepo:'notebook',ghToken:'fixture-token',ghBranch:'main',...(geminiKey?{aiProvider:'google',aiKey:geminiKey,aiModel:'gemini-flash-latest'}:{}),profile:{name:'Readiness Writer',role:'Writer',writesAbout:'notebooks'}}));
    localStorage.setItem('helm.studio.gettingStarted.dismissed','1');localStorage.setItem('helm.studio.onboarded','1');localStorage.setItem('readiness.seeded','1');
  }
},{licence:mintTestLicence(),geminiKey:process.env.GEMINI_API_KEY||''});
const page=await context.newPage();
page.on('dialog',dialog=>dialog.accept());
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const api=(path,body,method=body?'POST':'GET')=>page.evaluate(async({path,body,method})=>window.__studioApi(path,{method,...(body?{body:JSON.stringify(body)}:{})}),{path,body,method});
const doc={version:1,blocks:[{id:'text1',type:'text',html:'<p>Readiness draft with <strong>formatting</strong>.</p>'}]};

try {
  await page.goto(url);await page.locator('#app').waitFor({state:'visible'});
  await check('app boots without runtime errors',async()=>assert.deepEqual(errors,[]));
  for(const width of [1440,820,390]){
    await page.setViewportSize({width,height:1000});
    for(const view of ['getting-started','newpost','posts','inbox','drafts','compose','review','queue','settings','site-settings','topics-settings','connect','more','partner','library','video']){
      await check(`${width}px navigation ${view}`,async()=>{
        await page.evaluate(v=>window.go(v),view);
        assert.ok(await page.locator('#v-'+view).isVisible());
        const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
        const outside=overflow>2?await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.right>innerWidth+2;}).slice(-8).map(el=>el.id||el.className||el.tagName)):[];
        assert.ok(overflow<=2,`horizontal overflow: ${overflow}px; ${outside.join(', ')}`);
      });
    }
    await page.screenshot({path:`${artifacts}/navigation-${width}.png`});
  }
  await page.setViewportSize({width:1440,height:1000});
  await check('Settings has four accessible groups and optional storage stays collapsed',async()=>{
    await page.evaluate(async()=>{window.go('settings');await window.loadSettings();});
    assert.equal(await page.locator('.settings-nav a').count(),4);
    assert.equal(await page.locator('.settings-storage').getAttribute('open'),null);
    assert.match(await page.locator('#connRow').innerText(),/writer\/notebook/);
    await page.locator('.settings-nav a').filter({hasText:'Privacy'}).focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'settingsPrivacyTitle');
    await page.waitForFunction(()=>document.querySelector('#settingsBackupStatus').textContent.includes('saved items'));
  });
  await check('Settings connection check verifies the selected site without changing it',async()=>{
    const before=await page.evaluate(()=>window.__studioConfig.getGithub());
    await page.locator('#settingsCheckBtn').click();
    await page.waitForFunction(()=>document.querySelector('#settingsConnectionCheck').textContent.includes('read successfully'));
    assert.equal(await page.locator('#settingsSiteLink').getAttribute('href'),'https://writer.github.io/notebook');
    assert.deepEqual(await page.evaluate(()=>window.__studioConfig.getGithub()),before);
    await page.evaluate(()=>{window.__studioConfig.saveRepo({owner:'writer',repo:'changed',branch:'main'});window.refreshConnStatus();});
    assert.ok(!(await page.locator('#settingsSiteLink').isVisible()));
    assert.match(await page.locator('#settingsConnectionCheck').innerText(),/Connection changed/);
    await page.evaluate(g=>window.__studioConfig.saveRepo(g),before);
  });
  await check('Inactive AI providers expand with the keyboard and have labelled fields',async()=>{
    const card=page.locator('.ai-card[data-id="google"]');
    assert.equal(await card.getAttribute('open'),null);
    await card.locator('summary').first().focus(); await page.keyboard.press('Enter');
    assert.ok(await card.getByLabel('API key',{exact:true}).isVisible());
    assert.ok(await card.getByRole('button',{name:'Save & use',exact:true}).isVisible());
    await card.locator('summary').first().focus(); await page.keyboard.press('Enter');
    assert.ok(!(await card.getByLabel('API key',{exact:true}).isVisible()));
  });
  await check('Settings reflows at 320 CSS pixels in light and dark mode',async()=>{
    await page.setViewportSize({width:320,height:800});
    for(const mode of ['light','dark']){
      await page.evaluate(mode=>document.documentElement.dataset.theme=mode,mode);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
      await page.locator('.settings-nav a').first().click();
      await page.screenshot({path:`${artifacts}/settings-${mode}-320.png`,animations:'disabled'});
    }
    await page.setViewportSize({width:1440,height:1000});
    await page.evaluate(()=>document.documentElement.dataset.theme='light');
    await page.evaluate(()=>window.scrollTo(0,0));
    assert.equal(await page.locator('.picker-sheet.open').count(),0);
    await page.screenshot({path:`${artifacts}/settings-desktop.png`,animations:'disabled'});
  });
  await check('idea inbox create, update, delete',async()=>{
    const idea=await api('/ideas',{text:'A test idea'});assert.ok(idea.id);
    await api('/ideas/'+idea.id,{text:'Revised idea'},'PUT');assert.ok((await api('/ideas')).some(x=>x.text==='Revised idea'));
    await api('/ideas/'+idea.id,null,'DELETE');assert.ok(!(await api('/ideas')).some(x=>x.id===idea.id));
  });
  await check('social draft create, edit, persist across reload, delete',async()=>{
    const draft=await api('/drafts',{text:'First draft',platform:'x'});
    await api('/drafts/'+draft.id,{text:'Revised draft',platform:'x'},'PUT');
    await page.reload();await page.locator('#app').waitFor({state:'visible'});
    assert.ok((await api('/drafts')).some(x=>x.id===draft.id&&x.text==='Revised draft'));
    await api('/drafts/'+draft.id,null,'DELETE');
  });
  await check('block draft and version history survive reload',async()=>{
    await api('/posts/readiness/blocks',{doc,meta:{title:'Readiness'}},'PUT');
    await api('/posts/readiness/versions',{doc,meta:{title:'Readiness'},label:'First version'});
    await page.reload();await page.locator('#app').waitFor({state:'visible'});
    assert.equal((await api('/posts/readiness/blocks')).doc.blocks[0].html,doc.blocks[0].html);
    assert.equal((await api('/posts/readiness/versions')).versions[0].label,'First version');
  });
  await check('local draft is visible in Write and Posts after reload, including when GitHub fails',async()=>{
    await page.evaluate(()=>goSection('write'));
    await page.locator('#writeLocalDrafts').getByRole('button',{name:/Readiness/}).waitFor();
    await page.locator('#writeLocalDrafts').getByRole('button',{name:/Readiness/}).click();
    await page.waitForFunction(()=>document.querySelector('#editorTitle')?.value==='Readiness');
    await page.reload();await page.locator('#app').waitFor({state:'visible'});
    const offline=route=>route.abort();
    await context.route('https://api.github.com/**',offline);
    try{
      await page.evaluate(()=>goSection('posts'));
      const resume=page.locator('#postsLocalDrafts').getByRole('button',{name:/Readiness/});
      await resume.waitFor(); await resume.click();
      await page.waitForFunction(()=>document.querySelector('#editorTitle')?.value==='Readiness');
      assert.equal((await api('/posts/readiness/blocks')).doc.blocks[0].html,doc.blocks[0].html);
    }finally{await context.unroute('https://api.github.com/**',offline);}
  });
  await check('chat thread persists in IndexedDB',async()=>{
    await api('/thread/readiness',{mode:'chat',turns:[]},'PUT');
    assert.ok(await api('/thread/readiness'));
  });
  await check('templates open in the actual block editor',async()=>{
    const templates=await api('/templates');assert.ok(templates.length>=9);
    for(const t of templates){await page.evaluate(d=>window.startNewPost(d),t.doc);assert.ok(await page.locator('#v-editor').isVisible(),t.id);}
  });
  await check('untrusted imported text and quotes cannot execute',async()=>{
    await page.evaluate(()=>{window.__readinessXss=0;return window.startNewPost({version:1,blocks:[
      {id:'x1',type:'text',html:'<img src=x onerror="window.__readinessXss=1"><strong>Safe text</strong>'},
      {id:'x2',type:'quote',html:'<svg onload="window.__readinessXss=2"></svg>Safe quote'},
    ]});});
    await page.waitForTimeout(150);
    assert.equal(await page.evaluate(()=>window.__readinessXss),0);
    assert.equal(await page.locator('#v-editor [onerror],#v-editor svg[onload]').count(),0);
  });
  await check('typing without a title survives reload, recovery and naming',async()=>{
    await page.evaluate(()=>window.startNewPost());
    const prose=page.locator('#v-editor [contenteditable="true"]').first();
    await prose.fill('Untitled writing must survive a reload.');
    await page.waitForFunction(()=>document.querySelector('#editorStatus')?.dataset.save==='saved');
    await page.reload();await page.locator('#app').waitFor({state:'visible'});
    await page.evaluate(()=>window.openUntitledDraft());
    assert.match(await page.locator('#v-editor').innerText(),/Untitled writing must survive/);
    await page.locator('#editorTitle').fill('Recovered writing');
    await page.waitForFunction(()=>document.querySelector('#editorStatus')?.dataset.save==='saved');
    const recovered=await api('/posts/recovered-writing/blocks');assert.match(JSON.stringify(recovered.doc),/Untitled writing must survive/);
    await page.reload();await page.locator('#app').waitFor({state:'visible'});
  });
  await check('draft backup downloads valid portable JSON without credentials',async()=>{
    await page.evaluate(()=>window.go('settings'));
    const download=page.waitForEvent('download');
    await page.locator('#v-settings').getByRole('button',{name:/Export drafts/}).click();
    const file=await download;const text=await readFile(await file.path(),'utf8');
    const data=JSON.parse(text);assert.equal(data.format,'chapbook-drafts');assert.ok(data.count>=2);
    assert.ok(data.stores.blockdrafts.length);assert.ok(!text.includes('fixture-token'));
    if(process.env.GEMINI_API_KEY) assert.ok(!text.includes(process.env.GEMINI_API_KEY));
  });
  await check('portable backup imports through the file picker and restores an idea',async()=>{
    const data={format:'chapbook-drafts',version:1,stores:{ideas:[{id:'backup-import-fixture',text:'Restored synthetic idea'}]}};
    await page.locator('#draftsImportInput').setInputFiles({name:'drafts.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
    await page.locator('#hdOk').click();
    await page.waitForFunction(()=>document.querySelector('#draftsMsg')?.textContent.includes('Imported 1 item'));
    assert.ok((await api('/ideas')).some(x=>x.id==='backup-import-fixture'));
  });
  await check('malformed backup is rejected without erasing existing drafts',async()=>{
    await page.locator('#draftsImportInput').setInputFiles({name:'broken.json',mimeType:'application/json',buffer:Buffer.from('{broken')});
    await page.waitForFunction(()=>document.querySelector('#draftsMsg')?.textContent.includes('not valid JSON'));
    assert.ok((await api('/ideas')).some(x=>x.id==='backup-import-fixture'));
  });
  await check('site details save services and a booking link without losing existing settings',async()=>{
    await page.evaluate(async()=>{window.go('site-settings');await window.loadSiteSettings();});
    await page.locator('details').filter({has:page.locator('#ss-professional')}).locator('summary').click();
    await page.locator('#pro-heading').fill('A small independent practice');
    await page.locator('#pro-bookingUrl').fill('https://calendar.example.com/visit');
    await page.locator('#pro-email').fill('hello@example.com');
    await page.getByRole('button',{name:'Add a service',exact:true}).click();
    await page.locator('[data-service=name]').fill('First visit');
    await page.locator('[data-service=description]').fill('Time to discuss what you need.');
    await page.locator('[data-service=duration]').fill('45 minutes');
    await page.locator('[data-service=bookingUrl]').fill('https://cal.com/test/first-visit');
    await page.locator('#ssSaveBtn').click();
    await page.waitForFunction(()=>!document.querySelector('#ssSaveBtn').disabled);
    const saved=JSON.parse(gh.files.get('src/data/site.json'));
    assert.equal(saved.professional.bookingUrl,'https://calendar.example.com/visit');
    assert.equal(saved.professional.services[0].duration,'45 minutes');assert.equal(saved.professional.services[0].bookingUrl,'https://cal.com/test/first-visit');assert.equal(saved.professional.services[0].name,'First visit');assert.equal(saved.name,'Readiness notebook');
  });
  await check('publish writes markdown and editable sidecar atomically',async()=>{
    const result=await api('/posts/readiness/publish',{doc,meta:{title:'Readiness',description:'Synthetic publishing fixture',tags:['notes'],draft:false}});
    assert.ok(result.commit);assert.match(gh.files.get('src/content/blog/readiness.md'),/Readiness draft/);
    assert.equal(JSON.parse(gh.files.get('src/content/blog/_blocks/readiness.json')).blocks[0].html,doc.blocks[0].html);
    assert.equal((await api('/posts/readiness/blocks')).source,'sidecar');
  });
  await check('schedule stays a hidden draft until due',async()=>{
    await api('/posts/scheduled/publish',{doc,meta:{title:'Scheduled',publishAt:'2030-01-01T12:00:00Z',draft:false}});
    const md=gh.files.get('src/content/blog/scheduled.md');assert.match(md,/draft: true/);assert.match(md,/2030-01-01/);
  });
  await check('take down, republish, duplicate, delete',async()=>{
    await api('/posts/readiness/takedown',{});assert.match(gh.files.get('src/content/blog/readiness.md'),/draft: true/);
    await api('/posts/readiness/republish',{});assert.doesNotMatch(gh.files.get('src/content/blog/readiness.md'),/draft: true/);
    const duplicate=await api('/posts/readiness/duplicate',{});assert.ok(duplicate.slug!== 'readiness');
    await api('/posts/'+duplicate.slug,null,'DELETE');assert.ok(!gh.files.has(`src/content/blog/${duplicate.slug}.md`));
  });
  await check('preview preserves formatting',async()=>assert.match((await api('/posts/readiness/preview',{doc})).html,/<strong>formatting<\/strong>/));
  await check('live preview displays the title and body inside its isolated frame',async()=>{
    await page.evaluate(()=>window.startNewPost({version:1,blocks:[{id:'preview-body',type:'text',html:'<p>Preview content survives the frame boundary.</p>'}]}));
    await page.locator('#editorTitle').fill('Preview check');
    await page.locator('#previewBtn').click();
    const iframe=page.locator('#previewBody iframe');
    assert.equal(await iframe.getAttribute('sandbox'),'allow-scripts allow-popups');
    const frame=page.frameLocator('#previewBody iframe');
    await frame.getByRole('heading',{name:'Preview check',exact:true}).waitFor();
    assert.match(await frame.locator('body').innerText(),/Preview content survives the frame boundary/);
    await page.locator('#previewCloseBtn').click();
  });
  await check('darkroom uploads photo and metadata to the selected post',async()=>{
    await page.evaluate(()=>window.openDarkroom());
    await page.locator('#dkPost option[value="readiness"]').waitFor({state:'attached'});
    await page.locator('#dkPost').selectOption('readiness');
    await page.locator('#dkInput').setInputFiles(resolve(projects,'atelier/src/core/fixtures/exif-sample.jpg'));
    await page.waitForFunction(()=>!document.querySelector('#dkCommit').disabled);
    await page.locator('#dkCommit').click();
    await page.waitForFunction(()=>document.querySelector('#dkDone')?.textContent.includes('committed'));
    const side=JSON.parse(gh.files.get('src/content/blog/_images/readiness/meta.json'));
    assert.ok(JSON.stringify(side).includes('camera'));assert.ok([...gh.files.keys()].some(p=>p.includes('_images/readiness/')&&p.endsWith('.jpg')));
    assert.match(await page.locator('#dkDone a').getAttribute('href'),/writer.github.io\/notebook\/darkroom\//);
  });
  await check('unsafe image path cannot publish',async()=>{
    await assert.rejects(()=>api('/posts/unsafe/publish',{doc:{version:1,blocks:[{id:'x',type:'image',file:'../../other.png',base64:'AAAA'}]},meta:{title:'Unsafe'}}),/unsafe.*filename/i);
    assert.ok(!gh.files.has('src/content/blog/unsafe.md'));
  });
  const families=await api('/playgrounds');
  for(const id of ['function-explorer','formula-calculator','mixer']){
    await check(`strict-CSP ${id} responds to slider input`,async()=>{
      const family=families.find(f=>f.id===id);
      const preset=id==='mixer'?family.presets[1]:family.presets[0];
      const {params}=await api(`/playgrounds/${id}/preset/${encodeURIComponent(preset.name)}`);
      const {block}=await api('/playgrounds/build',{familyId:id,params});
      const report=await api('/posts/readiness/check',{doc:{version:1,blocks:[block]},meta:{title:'Interactive test'}});
      assert.equal(report.errors.length,0,JSON.stringify(report.errors));
      const {html}=await api('/posts/readiness/preview',{doc:{version:1,blocks:[block]}});
      await page.evaluate(html=>{document.querySelector('#qaMath')?.remove();const f=document.createElement('iframe');f.id='qaMath';f.setAttribute('sandbox','allow-scripts');f.srcdoc=html;document.body.append(f);},html);
      const frame=page.frameLocator('#qaMath');const output=frame.locator('[data-role=out]').first();await output.waitFor();
      const before=await output.textContent();assert.ok(before&&before!=='–');
      await frame.locator('input[type=range]').first().evaluate(el=>{el.value=el.max;el.dispatchEvent(new Event('input',{bubbles:true}));});
      assert.notEqual(await output.textContent(),before);
      await page.evaluate(()=>document.querySelector('#qaMath').remove());
    });
  }
  const runtime=await context.newPage();
  for(const family of families){
    for(const preset of (family.presets.length?family.presets:[{name:'default'}])){
      await check(`interactive ${family.id}/${preset.name}`,async()=>{
        const params=(await api(`/playgrounds/${family.id}/preset/${encodeURIComponent(preset.name)}`)).params||{};
        const {block}=await api('/playgrounds/build',{familyId:family.id,params});
        const {html}=await api('/posts/readiness/preview',{doc:{version:1,blocks:[block]}});
        const runtimeErrors=[];const onError=e=>runtimeErrors.push(e.message);runtime.on('pageerror',onError);
        await runtime.setContent(html);await runtime.waitForTimeout(25);runtime.off('pageerror',onError);
        assert.deepEqual(runtimeErrors,[]);assert.ok(await runtime.locator('.playground').count());
      });
    }
  }
  for(const family of (await api('/figures')).families){
    await check(`figure ${family.id}`,async()=>{
      const {block}=await api('/figures/build',{familyId:family.id,params:{}});assert.match(block.svg,/<svg[\s>]/);
      await runtime.setContent(block.svg);assert.ok(await runtime.locator('svg').count());
    });
  }
  await check('sticker and stencil libraries are populated',async()=>{
    assert.ok((await api('/figures/stickers')).stickers.length>10);assert.ok((await api('/figures/stencils')).stencils.length>5);
  });
  if(process.env.GEMINI_API_KEY){
    await check('live Gemini draft-assist UI inserts generated prose',async()=>{
      await page.evaluate(()=>window.startNewPost({version:1,blocks:[{id:'live-prose',type:'text',html:''}]}));
      await page.evaluate(()=>window.openAiDraft('live-prose'));
      await page.locator('#aiDraftIdea').fill('A short paragraph about keeping a notebook for ideas.');
      await page.locator('#aiDraftRun').click();
      await page.waitForFunction(()=>document.querySelector('#aiDraftRun')?.disabled===false,null,{timeout:120000});
      const content=await page.locator('#v-editor [contenteditable="true"]').allTextContents();
      assert.ok(content.join(' ').length>50,`No generated prose inserted; ${await page.locator('#aiDraftMsg').textContent()}`);
      await page.evaluate(()=>window.closeAiDraft());
    });
    await check('live bundled Gemini returns factual alt-text',async()=>{
      const image=await readFile(resolve(projects,'chapbook/src/icon-192.png'));
      const result=await api('/ai/alt-text',{imageBase64:image.toString('base64'),mimeType:'image/png'});
      assert.ok(result.alt?.length>5);
    });
  }
  await check('all exercised UI paths remained free of uncaught errors',async()=>assert.deepEqual(errors,[]));
  await runtime.close();
  await check('installed service worker reopens the editor offline',async()=>{
    await page.evaluate(()=>Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(Error('Service worker never activated')),20000))]));
    await page.reload();await page.locator('#app').waitFor({state:'visible'});
    await context.setOffline(true);
    const response=await page.reload();assert.ok(response.fromServiceWorker(),'Offline navigation did not come from the service worker');
    await page.locator('#app').waitFor({state:'visible'});
    await context.setOffline(false);
  });
} catch(e){results.push({name:'harness',status:'FAIL',error:String(e.stack)});console.error(e);}
finally{
  await writeFile(`${artifacts}/results.json`,JSON.stringify({project,transport:'stateful GitHub fixture; disposable test licence',results},null,2));
  await browser.close();server.close();
}
const failures=results.filter(x=>x.status==='FAIL');
console.log(`${project}: ${results.length-failures.length} passed, ${failures.length} failed. ${artifacts}/results.json`);
process.exitCode=failures.length?1:0;
