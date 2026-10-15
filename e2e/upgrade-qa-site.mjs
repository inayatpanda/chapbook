// Updates only the isolated release-test repository, preserving its mock posts and identity.
import {execFileSync} from 'node:child_process';import {readFile} from 'node:fs/promises';import assert from 'node:assert/strict';import {makeGithub} from '../src/seams/github.js';
const repo=process.env.CHAPBOOK_QA_REPO;assert.match(repo||'',/^chapbook-readiness-\d{8}$/);
const token=execFileSync('gh',['auth','token'],{encoding:'utf8'}).trim(),owner=(await makeGithub({token}).whoami()).login;
const gh=makeGithub({token,owner,repo,branch:'main'}),root=new URL('../../chapbook-template/',import.meta.url);
const files=execFileSync('git',['diff','--name-only',process.env.CHAPBOOK_TEMPLATE_BASE||'769a275','HEAD'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(p=>(p.startsWith('src/')&&p!=='src/data/site.json')||['package.json','package-lock.json'].includes(p));
const changes=await Promise.all(files.map(async path=>({path,content:await readFile(new URL(path,root),'utf8')})));
const site=JSON.parse((await gh.getFile('src/data/site.json')).content);site.defaultTheme='kiosk';changes.push({path:'src/data/site.json',content:JSON.stringify(site,null,2)});
const result=await gh.commitMany(changes,'test: install curated theme and appointment templates');console.log('PASS isolated QA template upgrade',result.commit,changes.length+' files');
