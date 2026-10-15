import {chromium} from 'playwright';import {createServer} from 'node:http';import {readFile,mkdir} from 'node:fs/promises';import {resolve,extname} from 'node:path';import assert from 'node:assert/strict';
const root=resolve('dist');const output=resolve('docs/readiness-20261015/github');await mkdir(output,{recursive:true});
const server=createServer(async(req,res)=>{try{let path=new URL(req.url,'http://local').pathname;if(path==='/tutorials')path='/tutorials.html';if(path==='/')path='/index.html';const file=resolve(root,'.'+path);if(!file.startsWith(root+'/'))throw Error('path');const body=await readFile(file);res.writeHead(200,{'content-type':({'.html':'text/html','.css':'text/css','.js':'text/javascript','.woff2':'font/woff2','.svg':'image/svg+xml'})[extname(file)]||'application/octet-stream'});res.end(body)}catch{res.writeHead(404);res.end()}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=process.env.TUTORIAL_URL||`http://127.0.0.1:${server.address().port}/tutorials`;
const browser=await chromium.launch();
try{
 const page=await browser.newPage();
 await page.goto(url,{waitUntil:'domcontentloaded'});
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});
  assert.equal(await page.locator('.walkthrough-grid details').count(),6);
  await page.locator('.walkthrough-grid details').evaluateAll(items=>items.forEach(d=>d.open=true));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
  await page.screenshot({path:output+'/walkthroughs-'+width+'.png'});
  console.log('PASS six written walkthroughs',width);
 }
 if(!process.env.SKIP_VIDEO){
  const videos=page.locator('video');assert.equal(await videos.count(),15);
  for(let i=0;i<await videos.count();i++){
   const result=await videos.nth(i).evaluate(async video=>{
    video.muted=true;
    if(video.readyState<1)await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('metadata timeout')),30000);video.addEventListener('loadedmetadata',()=>{clearTimeout(t);resolve()},{once:true});video.addEventListener('error',()=>{clearTimeout(t);reject(Error('video unavailable'))},{once:true});video.load()});
    await video.play();await new Promise(r=>setTimeout(r,150));video.pause();return {duration:video.duration,width:video.videoWidth};
   });
   assert.ok(result.duration>0&&result.width>0);console.log('PASS existing tutorial video',i+1,'loads and plays');
  }
 }
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
