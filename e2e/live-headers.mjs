import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch();
try{
 const page=await browser.newPage();
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});
  await page.goto('https://inayatpanda.com/',{waitUntil:'domcontentloaded'});
  await page.locator('[data-header="classic"]').waitFor();
  assert.equal(await page.locator('#theme-menu-btn').count(),1,'Personal palette chooser preserved');
  await page.locator('#theme-menu-btn').click();await page.locator('#theme-menu-panel [data-theme="dune"]').click();
  await page.waitForFunction(()=>document.documentElement.dataset.siteTheme==='dune');
  await page.locator('#theme-menu-btn').click();await page.locator('#theme-menu-panel [data-theme="blueprint"]').click();
  await page.waitForFunction(()=>document.documentElement.dataset.siteTheme==='blueprint');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
  console.log('PASS personal palette Dune/Blueprint and responsive header',width);
  await page.goto('https://inayatpanda.github.io/chapbook-readiness-20261015/',{waitUntil:'domcontentloaded'});
  await page.locator('[data-header="ticker"]').waitFor();
  assert.equal(await page.locator('#site-nav a[aria-current="page"]').getAttribute('href'),'/chapbook-readiness-20261015/');
  if(width===390){await page.locator('#nav-toggle').click();assert.ok(await page.locator('#site-nav a').first().isVisible());await page.locator('#nav-toggle').press('Escape');assert.equal(await page.locator('#site-nav a').first().isVisible(),false);}
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
  console.log('PASS deployed project-subpath navigation',width);
 }
}finally{await browser.close();}
