// Disposable MySQL integration: CHAPBOOK_DB_TEST_CONFIG must identify a local
// synthetic database. No production endpoints or credentials are used.
import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateKeyPairSync, randomBytes, sign } from 'node:crypto';
import { database, mysqlStore } from '../hosting/mysql-store.mjs';
import { privateStoreAdapter } from '../netlify/lib/fulfil-store.mjs';
import { createHandler, signingMessage } from '../netlify/functions/fulfil-store.mjs';
import { createApp } from '../hosting/server.mjs';

const config=JSON.parse(await readFile(process.env.CHAPBOOK_DB_TEST_CONFIG,'utf8'));
assert.equal(config.host,'127.0.0.1'); assert.equal(config.database,'chapbook_test');
Object.assign(process.env,{DB_HOST:config.host,DB_PORT:String(config.port),DB_USER:config.user,DB_PASSWORD:config.password,DB_NAME:config.database});
const pool=await database();
const name='test-'+randomBytes(8).toString('hex');
const store=mysqlStore(name),control=mysqlStore(name+'-control'),api=privateStoreAdapter(store,control);
let passed=0;
async function check(label,fn){await fn();passed++;console.log('PASS '+label);}
let server,preview,dir;
try {
  await check('concurrent inserts create exactly one record',async()=>{
    const writes=await Promise.all(Array.from({length:20},(_,i)=>store.setJSON('queue/once.json',{i},{onlyIfNew:true})));
    assert.equal(writes.filter(x=>x.modified).length,1);
  });
  await check('compare-and-set rejects stale writers',async()=>{
    const current=await store.getWithMetadata('queue/once.json');
    const writes=await Promise.all(Array.from({length:20},(_,i)=>store.setJSON('queue/once.json',{updated:i},{onlyIfMatch:current.etag})));
    assert.equal(writes.filter(x=>x.modified).length,1);
  });
  await check('prefix matching treats underscores literally',async()=>{
    await store.setJSON('queue/a_b.json',{});await store.setJSON('queue/axb.json',{});
    assert.deepEqual((await store.list({prefix:'queue/a_'})).blobs.map(x=>x.key),['queue/a_b.json']);
  });
  await check('stores are isolated and a new connection reads persisted data',async()=>{
    assert.equal(await control.get('queue/once.json'),null);
    const mysql=await import('mysql2/promise');const second=await mysql.createConnection(config);
    try{const [r]=await second.execute('SELECT COUNT(*) AS n FROM chapbook_records WHERE store_name=?',[name]);assert.equal(r[0].n,3);}finally{await second.end();}
  });
  await check('private delete requires the current version and removes its lock',async()=>{
    const sha=await api.put('done/synthetic.json',{email:'qa@example.invalid'});
    await assert.rejects(api.del('done/synthetic.json','wrong'),/conflict/);
    await api.del('done/synthetic.json',sha);assert.equal(await api.get('done/synthetic.json'),null);
    assert.equal((await control.list({prefix:'locks/'})).blobs.length,0);
  });
  const {privateKey,publicKey}=generateKeyPairSync('ed25519');
  const handler=createHandler({store,control,publicKey:publicKey.export({format:'der',type:'spki'}).subarray(-32).toString('hex')});
  const request=payload=>{const body=JSON.stringify({ts:Date.now(),nonce:randomBytes(16).toString('hex'),...payload});return new Request('https://chapbook.rqai.co.uk/.netlify/functions/fulfil-store',{method:'POST',headers:{'x-rqai-signature':sign(null,signingMessage(body),privateKey).toString('base64url')},body});};
  await check('real SQL nonce receipts reject signed replay',async()=>{
    const req=request({op:'put',path:'state/test.json',record:{synthetic:true}}),clone=req.clone();
    assert.equal((await handler(req)).status,200);assert.equal((await handler(clone)).status,409);
    assert.equal((await handler(new Request('https://x',{method:'POST',body:'{}'}))).status,401);
  });
  await check('real SQL signed list and delete preserve namespace boundaries',async()=>{
    await api.put('sandbox/state/test.json',{sandbox:true});
    const record=await (await handler(request({op:'get',path:'state/test.json'}))).json();
    assert.equal((await handler(request({op:'del',path:'state/test.json',sha:record.sha}))).status,200);
    assert.equal(await api.get('state/test.json'),null);assert.ok(await api.get('sandbox/state/test.json'));
  });
  dir=await mkdtemp(join(tmpdir(),'chapbook-http-'));
  await mkdir(join(dir,'app'));await mkdir(join(dir,'themes-css'));
  await writeFile(join(dir,'app/index.html'),'<h1>Synthetic preview</h1>');
  await writeFile(join(dir,'privacy.html'),'privacy');
  await writeFile(join(dir,'themes-css/sample-post.html'),'sample');
  await writeFile(join(dir,'asset.bin'),'0123456789');
  await writeFile(join(dir,'.env'),'NOT_PUBLIC');
  server=await createApp({root:dir,handlers:{'fulfil-store':handler,'stripe-webhook':async()=>{throw Error('private database failure');}}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
  await check('static paths, extensionless policies and security headers are preserved',async()=>{
    const r=await fetch(base+'/app/');assert.equal(r.status,200);assert.equal(r.headers.get('x-frame-options'),'DENY');assert.match(r.headers.get('content-security-policy'),/frame-ancestors 'none'/);
    assert.equal((await fetch(base+'/privacy')).status,200);
    const frame=await fetch(base+'/themes-css/sample-post.html');assert.equal(frame.headers.get('x-frame-options'),'SAMEORIGIN');
  });
  await check('files outside public root and dotfiles are inaccessible',async()=>{
    for(const path of ['/.env','/%2eenv','/%2e%2e%2fpackage.json','/.netlify/functions/unknown'])assert.equal((await fetch(base+path)).status,404);
  });
  await check('download byte ranges and HEAD responses are correct',async()=>{
    const r=await fetch(base+'/asset.bin',{headers:{range:'bytes=3-5'}});assert.equal(r.status,206);assert.equal(await r.text(),'345');
    assert.equal((await fetch(base+'/asset.bin',{headers:{range:'bytes=100-'}})).status,416);
    const head=await fetch(base+'/asset.bin',{method:'HEAD'});assert.equal(head.headers.get('content-length'),'10');assert.equal(await head.text(),'');
  });
  await check('database errors become retryable 503 and signed HTTP requests work',async()=>{
    assert.equal((await fetch(base+'/.netlify/functions/stripe-webhook',{method:'POST',body:'{}'})).status,503);
    const r=request({op:'get',path:'sandbox/state/test.json'});
    const result=await fetch(base+'/.netlify/functions/fulfil-store',{method:'POST',headers:r.headers,body:await r.text()});assert.equal(result.status,200);assert.equal((await result.json()).record.sandbox,true);
  });
  preview=await createApp({root:dir,preview:true});await new Promise(r=>preview.listen(0,'127.0.0.1',r));const staging='http://127.0.0.1:'+preview.address().port;
  await check('preview cannot create trials, payments or read private records',async()=>{
    for(const endpoint of ['trial-request','stripe-webhook','fulfil-store'])assert.equal((await fetch(staging+'/.netlify/functions/'+endpoint,{method:'POST',body:'{}'})).status,503);
    assert.equal((await fetch(staging+'/app/')).headers.get('x-robots-tag'),'noindex, nofollow');
  });
  console.log(`${passed} Hostinger/MySQL checks passed`);
} finally {
  if(server)await new Promise(r=>server.close(r));if(preview)await new Promise(r=>preview.close(r));
  await pool.execute('DELETE FROM chapbook_records WHERE store_name IN (?,?)',[name,name+'-control']);await pool.end();
  if(dir)await rm(dir,{recursive:true,force:true});
}
