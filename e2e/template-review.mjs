// Preview fictional template examples without changing the template's saved site identity.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=fileURLToPath(new URL('../../chapbook-template/',import.meta.url));
const config=root+'src/data/site.json',original=await readFile(config,'utf8');
const out=fileURLToPath(new URL('../docs/readiness-20261015/templates/',import.meta.url));await mkdir(out,{recursive:true});
const fixtures={
 folio:{name:'Rowan Ellis',masthead:'Rowan Ellis',professional:{eyebrow:'Independent designer & writer',heading:'A considered approach to useful things.',intro:'I work with small teams on the things people read, use and come back to. This is a collection of my work, notes and current interests.',location:'Bristol, UK',email:'hello@example.com',services:[{name:'Product & interface design',description:'From the first question to a working prototype.'},{name:'Editorial projects',description:'Structure, typography and a clear point of view.'}],credentials:['Independent since 2018','Working across the UK']}},
 practice:{name:'Dr Alex Morgan',masthead:'Alex Morgan',professional:{eyebrow:'Consultant orthopaedic surgeon',heading:'Time to understand. A plan to move forward.',intro:'Appointments begin with a conversation: what has changed, what matters to you, and what you would like to be able to do. Together, we consider the next step.',location:'Bristol · In-person consultations',hours:'Appointments by arrangement',bookingUrl:'https://calendar.example.com/consultation',bookingLabel:'Arrange a consultation',credentials:['Qualifications belong here','Registration details belong here'],services:[{name:'First consultation',description:'A discussion of your symptoms, an examination and time for questions.'},{name:'Follow-up',description:'Review progress and agree the next part of your care.'},{name:'Second opinion',description:'An independent review of the information you already have.'}]}},
 petal:{name:'Rose Room · Example studio',masthead:'Rose Room',professional:{eyebrow:'Beauty & skin studio',heading:'A little time, just for you.',intro:'Skin consultations, considered treatments and a quiet room away from the rush. Find your appointment, ask a question, or take a look around.',location:'Bristol · Example address',hours:'Tuesday–Saturday · By appointment',bookingUrl:'https://cal.com/chapbook-test/consultation',bookingLabel:'Find an appointment',services:[{name:'Skin consultation',description:'Time to talk through your routine and what you would like from your visit.',duration:'30 minutes',price:'£25',bookingUrl:'https://cal.com/chapbook-test/consultation'},{name:'Signature facial',description:'A treatment chosen together at your appointment.',duration:'60 minutes',price:'£70'},{name:'Brow shaping',description:'A shape that works for you.',duration:'20 minutes',price:'£20'}]}},

};
for(const [theme,name,label,heading] of [
 ['contour','Contour House · Example clinic','Skin & aesthetics','A considered approach to skin.'],
 ['cut','FORM · Example salon','An independent hair studio','A cut of your own.'],
 ['still','Still Room · Example practice','Movement & wellbeing','A moment to come back to yourself.'],
 ['office','Alex Reed · Example consultant','Independent consulting','A clear plan for what comes next.'],
 ['portrait','Rowan Ellis · Example portfolio','Designer. Writer. Independent.','Hello, I’m Rowan.']]){
 fixtures[theme]={...fixtures.petal,name,masthead:name,professional:{...fixtures.petal.professional,eyebrow:label,heading,
 intro:theme==='cut'?'Good hair starts with a conversation. Tell us what you like, how you wear it and how much time you have in the morning.':theme==='office'?'I help small teams turn a difficult question into a practical next step. Research, a clear brief and work you can put to use.':theme==='portrait'?'I make useful things for people and write about what I learn along the way. Here is a little of both.':theme==='still'?'Small-group sessions and one-to-one appointments, with room to find your own pace.':fixtures.petal.professional.intro,
 services:theme==='cut'?[{name:'Cut & finish',duration:'60 minutes',price:'From £55'},{name:'Colour consultation',duration:'20 minutes',price:'By arrangement'},{name:'Restyle',duration:'90 minutes',price:'From £80'}]:theme==='office'?[{name:'Research & discovery',description:'Get a clearer view of the question.'},{name:'Strategy sessions',description:'Make a plan your team can use.'}]:theme==='portrait'?fixtures.folio.professional.services:theme==='still'?[{name:'First session',duration:'45 minutes'},{name:'One-to-one',duration:'60 minutes'},{name:'Small group',duration:'60 minutes'}]:fixtures.petal.professional.services}};
}
const server=spawn(process.execPath,[root+'node_modules/astro/astro.js','dev','--host','127.0.0.1','--port','4329'],{cwd:root,stdio:'ignore'});
const browser=await chromium.launch();const results=[];const selected=process.env.THEMES?.split(',');
try{
 for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:4329')).ok)break;}catch{}await new Promise(r=>setTimeout(r,500));}
 const page=await browser.newPage();
 for(const [theme,fixture]of Object.entries(fixtures)){
  if(selected&&!selected.includes(theme))continue;
  await writeFile(config,JSON.stringify({...JSON.parse(original),...fixture,defaultTheme:theme,nav:[{href:'/',label:'Home',primary:true},{href:'/about/',label:'About',primary:true},{href:'/posts/',label:'Journal',primary:true},{href:'/contact/',label:'Contact'}]},null,2));
  await page.waitForTimeout(800);
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});await page.goto('http://127.0.0.1:4329/');
   await page.waitForFunction(t=>document.documentElement.dataset.blogTheme===t,theme);
   await page.locator('.pro-site h1').waitFor();assert.equal(await page.locator('.pro-site h1').count(),1);
   assert.ok((await page.locator('.pro-site').textContent()).includes(fixture.professional.heading));
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),theme+' overflows at '+width);
   const result={theme,width,status:'PASS'};results.push(result);console.log(JSON.stringify(result));
   await page.addStyleTag({content:'astro-dev-toolbar{display:none!important}'});
   await page.screenshot({path:out+theme+'-'+width+'.png',fullPage:true});
  }
  await page.goto('http://127.0.0.1:4329/appointments/');
  assert.equal(await page.locator('iframe').count(),0,'No provider request before visitor action');
  if(fixture.professional.bookingUrl?.includes('cal.com/')){
   // Exercise our loader and the actual upstream embed library; intercept only the remote booking frame.
   await page.route('https://{cal.com,app.cal.com}/chapbook-test/**',route=>route.fulfill({status:200,contentType:'text/html',body:'<h1>Booking provider test fixture</h1>'}));
   await page.locator('.booking-load').click();
   await page.locator('#booking-calendar iframe').waitFor({state:'attached',timeout:25000});
   assert.match(await page.locator('#booking-calendar iframe').getAttribute('src'),/^https:\/\/(?:app\.)?cal.com\/chapbook-test\/consultation/);
   await page.screenshot({path:out+theme+'-booking.png',fullPage:true});
   await page.unroute('https://{cal.com,app.cal.com}/chapbook-test/**');
  }else{
   const href=await page.locator('.appointment-layout .pro-button').getAttribute('href');
   assert.ok(href.startsWith(theme==='folio'?'mailto:':'https://calendar.example.com/'));
  }
  await page.goto('http://127.0.0.1:4329/contact/');assert.equal(await page.locator('form').count(),0,'Unconfigured placeholder form must be hidden');
  console.log(JSON.stringify({theme,workflow:'booking/contact',status:'PASS'}));
 }
 if(!selected||selected.includes('petal')){
  await writeFile(config,JSON.stringify({...JSON.parse(original),...fixtures.petal,defaultTheme:'petal'},null,2));await page.waitForTimeout(600);
  const unavailable=await browser.newPage();await unavailable.route('https://app.cal.com/embed/embed.js',route=>route.abort());
  await unavailable.goto('http://127.0.0.1:4329/appointments/');await unavailable.locator('.booking-load').click();
  await unavailable.getByRole('status').filter({hasText:'could not load'}).waitFor();assert.equal(await unavailable.locator('.booking-load').isDisabled(),false);
  assert.ok(await unavailable.getByRole('link',{name:'Open booking in a separate page'}).isVisible());await unavailable.close();
  results.push({theme:'petal',workflow:'provider failure retains direct link',status:'PASS'});
 }
 const registry=JSON.parse(await readFile(root+'src/data/themes.json','utf8'));
 for(const theme of registry.themes.filter(t=>!fixtures[t.id]&&(!selected||selected.includes(t.id)))){
  await writeFile(config,JSON.stringify({...JSON.parse(original),defaultTheme:theme.id},null,2));await page.waitForTimeout(450);
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});await page.goto('http://127.0.0.1:4329/');await page.waitForFunction(t=>document.documentElement.dataset.blogTheme===t,theme.id);
   await page.waitForTimeout(300);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),theme.id+' overflow '+width);
   await page.addStyleTag({content:'astro-dev-toolbar{display:none!important}'});
   if(['darkroom','contact-sheet','polaroid','scrapbook','kiosk'].includes(theme.id)){
    const photos=page.locator('main img');assert.ok(await photos.count()>0,theme.id+' must show real post photographs');
    await photos.first().evaluate(img=>img.decode());
   }
   if(theme.id==='kiosk'){
    await page.getByRole('searchbox',{name:'Search posts'}).fill('no-such-article-zz');assert.equal(await page.locator('.nw-card:visible').count(),0);assert.match(await page.locator('.nw-results').innerText(),/No articles/);
    await page.getByRole('searchbox',{name:'Search posts'}).fill('Kyoto');assert.equal(await page.locator('.nw-card:visible').count(),1);
    await page.getByRole('searchbox',{name:'Search posts'}).fill('');assert.ok(await page.locator('.nw-card:visible').count()>1);
   }
   await page.screenshot({path:out+theme.id+'-'+width+'.png',fullPage:true});
   results.push({theme:theme.id,width,status:'PASS'});console.log(JSON.stringify(results.at(-1)));
  }
 }

}finally{await writeFile(config,original);await browser.close();server.kill('SIGTERM');await writeFile(out+'results.json',JSON.stringify(results,null,2));}
