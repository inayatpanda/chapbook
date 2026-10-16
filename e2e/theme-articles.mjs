// Capture the same example article under every site theme for the public gallery.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { BAKED_CATALOGUE } from '../src/core/themeCatalogue.js';
const root=fileURLToPath(new URL('../../chapbook-template/',import.meta.url));
const config=root+'src/data/site.json',original=await readFile(config,'utf8');
const themes=BAKED_CATALOGUE.themes;
const out=fileURLToPath(new URL('../docs/readiness-20261015/templates/',import.meta.url));
await mkdir(out,{recursive:true});
const server=spawn(process.execPath,[root+'node_modules/astro/astro.js','dev','--host','127.0.0.1','--port','4329'],{cwd:root,stdio:'ignore'});
const browser=await chromium.launch();
try {
  let ready=false;
  for(let i=0;i<60;i++){try{ready=(await fetch('http://127.0.0.1:4329')).ok;}catch{}if(ready)break;await new Promise(r=>setTimeout(r,500));}
  assert.ok(ready,'Template preview server started');
  const page=await browser.newPage();
  for(const theme of themes){
    await writeFile(config,JSON.stringify({...JSON.parse(original),defaultTheme:theme.id},null,2));
    await page.waitForTimeout(450);
    for(const width of [1440,390]){
      await page.setViewportSize({width,height:1000});
      await page.goto('http://127.0.0.1:4329/blog/plain-text-outlives-everything/');
      await page.waitForFunction(t=>document.documentElement.dataset.blogTheme===t,theme.id);
      await page.locator('article h1').waitFor();
      await page.addStyleTag({content:'astro-dev-toolbar{display:none!important}'});
      const height=await page.evaluate(()=>document.documentElement.scrollHeight);
      for(let y=0;y<height;y+=800){await page.evaluate(y=>window.scrollTo(0,y),y);await page.waitForTimeout(50);}
      await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(400);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),theme.id+' article overflow at '+width);
      assert.equal(await page.locator('article h1').count(),1);
      await page.screenshot({path:out+theme.id+'-article-'+width+'.png',fullPage:true});
      console.log('PASS '+theme.id+' article at '+width);
    }
  }
} finally {await writeFile(config,original);await browser.close();server.kill('SIGTERM');}
