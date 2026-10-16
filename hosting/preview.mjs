// Preview entry point is deliberately incapable of accepting live account traffic.
import { createApp } from './server.mjs';
import { databaseConfigured } from './mysql-store.mjs';
import { probeStorage } from './storage-probe.mjs';
let probe = { status: 'unconfigured' };
const server = await createApp({preview:true, previewDiagnostics:()=>({probe})});
server.requestTimeout=30000;server.headersTimeout=15000;
server.listen(Number(process.env.PORT||3000),'0.0.0.0',async()=>{
  console.log('Chapbook preview ready; account services disabled');
  if (!databaseConfigured()) return;
  probe = { status: 'running' };
  try { probe = await probeStorage(); }
  catch { probe = { status: 'failed' }; }
  // Never log database errors, credentials, record contents or signing material.
  console.log('Chapbook synthetic storage checks: ' + JSON.stringify(probe));
});
