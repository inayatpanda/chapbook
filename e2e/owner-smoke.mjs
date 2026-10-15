// Read-only smoke test for the running personal Helm/Atelier. PIN is transient env only.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const origin='http://localhost:4800';
assert.ok(process.env.HELM_PIN,'Set HELM_PIN in the process environment');
const unlock=await fetch(origin+'/admin/api/pin/verify',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({pin:process.env.HELM_PIN})});
assert.equal(unlock.status,200,'Owner PIN unlock failed');
const {token}=await unlock.json();
console.log('PASS owner PIN unlock');
for(const path of ['/admin/api/health','/studio/api/drafts','/studio/api/ideas','/studio/api/posts','/studio/api/templates','/studio/api/playgrounds','/studio/api/figures','/studio/api/settings/ai']){
  const response=await fetch(origin+path,{headers:{'x-admin-token':token}});
  assert.equal(response.status,200,path);await response.json();console.log('PASS authenticated '+path);
}
const browser=await chromium.launch();
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 await context.addInitScript(token=>{if(window.top!==window)return;localStorage.setItem('studio_token',token);localStorage.setItem('helm.studio.onboarded','1');},token);
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/studio');await page.locator('#app').waitFor({state:'visible'});
 for(const v of ['newpost','posts','inbox','drafts','settings','connect','more','library','video']){
   await page.evaluate(v=>window.go(v),v);assert.ok(await page.locator('#v-'+v).isVisible());console.log('PASS local Atelier view '+v);
 }
 assert.deepEqual(errors,[]);console.log('PASS local Atelier no uncaught browser errors');
}finally{await browser.close();}
