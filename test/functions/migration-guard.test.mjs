import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withMigrationGuard } from '../../netlify/lib/migration-guard.mjs';

test('paused and unreadable migration state never reaches a writer or acknowledges a webhook', async()=>{
  let writes=0;
  for(const readState of [async()=>({paused:true}),async()=>({unexpected:true}),async()=>{throw Error('storage unavailable');}]){
    const guarded=withMigrationGuard(()=>{writes++;return new Response('written');},{enabled:()=>true,readState});
    for(const method of ['POST','GET','DELETE']){
      const response=await guarded(new Request('https://example.invalid',{method}));
      assert.equal(response.status,503);assert.equal(response.headers.get('retry-after'),'60');
    }
  }
  assert.equal(writes,0);
});
test('unlock is read afresh and preserves the verified request context',async()=>{
  let state={paused:true},reads=0;
  const context={ip:'192.0.2.1'};
  const guarded=withMigrationGuard((req,ctx)=>{assert.equal(ctx,context);return new Response('ok');},{enabled:()=>true,readState:async()=>{reads++;return state;}});
  const request=new Request('https://example.invalid',{method:'POST'});
  assert.equal((await guarded(request,context)).status,503);
  state={paused:false};assert.equal((await guarded(request,context)).status,200);
  state=null;assert.equal((await guarded(request,context)).status,200);
  assert.equal(reads,3);
});
