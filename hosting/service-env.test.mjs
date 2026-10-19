import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,chmod,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadServiceEnv,assertLiveServiceEnv} from './service-env.mjs';

test('live startup rejects missing, masked and malformed service credentials without revealing them',()=>{
 const valid={GITHUB_QUEUE_TOKEN:'github_pat_'+ 'a'.repeat(60),STRIPE_WEBHOOK_SECRET:'whsec_'+ 'b'.repeat(32)};
 assert.doesNotThrow(()=>assertLiveServiceEnv(valid));
 for(const key of Object.keys(valid)) for(const value of [undefined,'********************','masked-production-value','invalid\nsecret']) {
  assert.throws(()=>assertLiveServiceEnv({...valid,[key]:value}),error=>{
   assert.equal(error.message,'Live account services require valid queue and webhook credentials');
   return true;
  });
 }
 assert.doesNotThrow(()=>assertLiveServiceEnv({CHAPBOOK_PREVIEW:'1'}));
 assert.throws(()=>assertLiveServiceEnv({}),/require valid/);
});

test('service environment loads only a private file outside the public directory',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'chapbook-env-')),root=join(dir,'dist'),file=join(dir,'private.env');
 try{
  await mkdir(root);
  await writeFile(file,'CHAPBOOK_ENV_TEST_ONLY=synthetic\n',{mode:0o600});
  await loadServiceEnv(file,root);assert.equal(process.env.CHAPBOOK_ENV_TEST_ONLY,'synthetic');delete process.env.CHAPBOOK_ENV_TEST_ONLY;
  await chmod(file,0o644);await assert.rejects(loadServiceEnv(file,root),/unsafe permissions/);
  const publicFile=join(root,'private.env');await writeFile(publicFile,'CHAPBOOK_ENV_TEST_ONLY=synthetic\n',{mode:0o600});
  await assert.rejects(loadServiceEnv(publicFile,root),/unsafe permissions/);
  assert.equal(process.env.CHAPBOOK_ENV_TEST_ONLY,undefined);
 }finally{delete process.env.CHAPBOOK_ENV_TEST_ONLY;await rm(dir,{recursive:true,force:true});}
});

test('explicit Hostinger worker needs Stripe verification but no GitHub queue secret', () => {
 const env={FULFIL_WORKER:'hostinger',STRIPE_WEBHOOK_SECRET:'whsec_'+'b'.repeat(32)};
 assert.doesNotThrow(()=>assertLiveServiceEnv(env));
 assert.throws(()=>assertLiveServiceEnv({...env,STRIPE_WEBHOOK_SECRET:'masked'}));
 assert.throws(()=>assertLiveServiceEnv({...env,FULFIL_WORKER:'unknown'}));
 assert.throws(()=>assertLiveServiceEnv({...env,FULFIL_WORKER:'github'}));
});
