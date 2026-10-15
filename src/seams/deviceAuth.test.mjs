import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeDeviceAuth} from './deviceAuth.js';
const response = data => new Response(JSON.stringify(data));
const code = {device_code:'device',user_code:'ABCD-EFGH',verification_uri:'https://github.com/login/device',interval:5,expires_in:900};
test('device approval survives a transient network failure using the same code', async()=>{
 let calls=0,retries=0;const auth=makeDeviceAuth({clientId:'test',relayBase:'/relay'},async()=>{
  calls++; if(calls===1)return response(code); if(calls===2)throw new TypeError('Failed to fetch');return response({access_token:'test-token'});
 });
 assert.equal((await auth.authorize({sleep:async()=>{},onRetry:()=>retries++})).token,'test-token');assert.equal(retries,1);assert.equal(calls,3);
});
test('cancel during the polling delay cannot accept a late token',async()=>{
 const controller=new AbortController();let calls=0;
 const auth=makeDeviceAuth({clientId:'test'},async()=>{calls++;return response(code)});
 await assert.rejects(auth.authorize({signal:controller.signal,sleep:async()=>controller.abort()}),e=>e.kind==='aborted');assert.equal(calls,1);
});
test('slow_down always increases polling interval by at least five seconds',async()=>{
 let calls=0;const delays=[];const auth=makeDeviceAuth({clientId:'test'},async()=>response(++calls===1?code:calls===2?{error:'slow_down',interval:1}:{access_token:'ok'}));
 await auth.authorize({sleep:async ms=>delays.push(ms)});assert.deepEqual(delays,[5000,10000]);
});
test('JSON gateway failures retry without discarding the approved device code',async()=>{
 let calls=0;const auth=makeDeviceAuth({clientId:'test'},async()=>++calls===1?response(code):calls===2?new Response(JSON.stringify({error:'upstream_unavailable'}),{status:503}):response({access_token:'ok'}));
 assert.equal((await auth.authorize({sleep:async()=>{}})).token,'ok');assert.equal(calls,3);
});
