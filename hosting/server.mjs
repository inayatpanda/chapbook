import { createServer } from 'node:http';
import { readFile, stat, realpath } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import ghDevice from '../netlify/functions/gh-device.mjs';
import trial from '../netlify/functions/trial-request.mjs';
import stripe from '../netlify/functions/stripe-webhook.mjs';
import privateStore from '../netlify/functions/fulfil-store.mjs';
import metrics from '../netlify/functions/metrics.mjs';
import { databaseConfigured, database } from './mysql-store.mjs';
import { clientIp, trustProxy } from './client-ip.mjs';
import { loadServiceEnv, assertLiveServiceEnv } from './service-env.mjs';

const functions = { 'gh-device': ghDevice, 'trial-request': trial, 'stripe-webhook': stripe, 'fulfil-store': privateStore, metrics };
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.gif':'image/gif', '.ico':'image/x-icon', '.woff2':'font/woff2', '.wasm':'application/wasm', '.mp4':'video/mp4', '.webm':'video/webm', '.webmanifest':'application/manifest+json', '.xml':'application/xml', '.txt':'text/plain; charset=utf-8' };

export async function securityHeaders(configPath = new URL('../netlify.toml', import.meta.url)) {
  const config = await readFile(configPath, 'utf8');
  const blocks = config.split('[[headers]]').slice(1);
  return blocks.map(block => ({ path: block.match(/for = "([^"]+)"/)[1], headers: Object.fromEntries([...block.matchAll(/^\s{4}([\w-]+) = "([^"]*)"/gm)].map(m=>[m[1],m[2]])) }));
}

export async function createApp({ root = resolve('dist'), preview = process.env.CHAPBOOK_PREVIEW === '1', handlers = functions, previewDiagnostics = () => ({}), previewNetwork = null } = {}) {
  const rules = await securityHeaders();
  const base = await realpath(root);
  const trustedProxy = trustProxy(process.env.CHAPBOOK_TRUSTED_PROXY || '');
  return createServer(async (req, res) => {
    const respond = (status, message) => { res.writeHead(status, { 'Content-Type':'text/plain; charset=utf-8', 'Cache-Control':'no-store' }); res.end(message); };
    try {
      const url = new URL(req.url, 'https://chapbook.rqai.co.uk');
      for (const rule of rules) if (rule.path === '/*' || rule.path === url.pathname) for (const [key,value] of Object.entries(rule.headers)) res.setHeader(key,value);
      if (preview) res.setHeader('X-Robots-Tag','noindex, nofollow');
      if (preview && previewNetwork && url.pathname === '/__preview/request-diagnostics' && req.method === 'GET') {
        res.writeHead(200, {'Content-Type':'application/json','Cache-Control':'no-store'});
        res.end(JSON.stringify(previewNetwork(req))); return;
      }
      if (url.pathname === '/healthz') {
        let storage = 'unconfigured';
        if (databaseConfigured()) { try { await (await database()).execute('SELECT 1'); storage='ready'; } catch { storage='unavailable'; } }
        res.writeHead(preview || storage === 'ready' ? 200 : 503, {'Content-Type':'application/json','Cache-Control':'no-store'});
        res.end(JSON.stringify({status:preview?'preview':storage==='ready'?'ready':'unavailable',storage,...(preview?previewDiagnostics():{})})); return;
      }
      const name = url.pathname.match(/^\/\.netlify\/functions\/([a-z-]+)$/)?.[1];
      if (name && Object.hasOwn(handlers,name)) {
        // Staging is deliberately unable to enqueue a real trial, payment or private record.
        if (preview) return respond(503,'Preview: live account services are disabled.');
        if (!databaseConfigured()) return respond(503,'Account services temporarily unavailable.');
        let bytes=0; const chunks=[];
        for await (const chunk of req) { bytes+=chunk.length; if(bytes>2_000_000) return respond(413,'Request too large'); chunks.push(chunk); }
        const request = new Request(url, {method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
        try {
          const response = await handlers[name](request, {ip:clientIp(req, trustedProxy)});
          res.writeHead(response.status,Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer()));
        } catch { respond(503,'Account services temporarily unavailable.'); }
        return;
      }
      if (url.pathname.startsWith('/.netlify/')) return respond(404,'Not found');
      if (!['GET','HEAD'].includes(req.method)) return respond(405,'Method not allowed');
      let path;
      try { path=decodeURIComponent(url.pathname); } catch { return respond(400,'Invalid path'); }
      if (path.includes('\\') || path.split('/').some(p=>p.startsWith('.'))) return respond(404,'Not found');
      let file=resolve(base,'.'+path);
      if(file!==base && !file.startsWith(base+sep)) return respond(404,'Not found');
      let info;
      try {info=await stat(file);} catch { if(!extname(file)){file+='.html';info=await stat(file);}else throw Error('not found'); }
      // Match the existing pretty URLs when a page and its asset directory
      // share a name (themes.html and themes/). Keep real directory redirects.
      if (info.isDirectory() && !path.endsWith('/')) {
        try {
          const page = await stat(file+'.html');
          if (page.isFile()) { file+='.html'; info=page; }
        } catch { /* No sibling page: use the directory index below. */ }
      }
      if(info.isDirectory()) {
        if(!path.endsWith('/')) {res.writeHead(308,{Location:path+'/'+url.search});res.end();return;}
        file=resolve(file,'index.html');info=await stat(file);
      }
      const actual=await realpath(file); if(!actual.startsWith(base+sep)) return respond(404,'Not found');
      res.setHeader('Content-Type',MIME[extname(file)]||'application/octet-stream');
      res.setHeader('Cache-Control',/\.(?:html|js|json|webmanifest)$/.test(file)?'no-cache':'public, max-age=3600');
      res.setHeader('Accept-Ranges','bytes');
      let start=0,end=info.size-1,status=200;
      if(req.headers.range) {
        const match=req.headers.range.match(/^bytes=(\d*)-(\d*)$/);
        if(!match || (!match[1]&&!match[2])) return respond(416,'Invalid range');
        if(!match[1]) start=Math.max(0,info.size-Number(match[2]));
        else {start=Number(match[1]);if(match[2])end=Math.min(end,Number(match[2]));}
        if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=info.size) {res.setHeader('Content-Range',`bytes */${info.size}`);return respond(416,'Invalid range');}
        status=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${info.size}`);
      }
      res.writeHead(status,{'Content-Length':Math.max(0,end-start+1)});
      if(req.method==='HEAD'||info.size===0){res.end();return;}
      createReadStream(file,{start,end}).on('error',()=>res.destroy()).pipe(res);
    } catch { if(!res.headersSent)respond(404,'Not found');else res.destroy(); }
  });
}

export async function startApp() {
  await loadServiceEnv();
  assertLiveServiceEnv();
  process.env.CHAPBOOK_STORAGE='mysql';
  process.env.CHAPBOOK_MIGRATION_GUARD='1';
  const server=await createApp(); server.requestTimeout=30000;server.headersTimeout=15000;
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(Number(process.env.PORT||3000),'0.0.0.0',resolve);});
  console.log('Chapbook HTTP server ready');
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await startApp();
}
