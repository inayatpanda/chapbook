import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,chmod,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadServiceEnv} from './service-env.mjs';

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
