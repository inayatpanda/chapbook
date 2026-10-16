// Preview entry point is deliberately incapable of accepting live account traffic.
import { createApp } from './server.mjs';
const server = await createApp({preview:true});
server.requestTimeout=30000;server.headersTimeout=15000;
server.listen(Number(process.env.PORT||3000),'0.0.0.0',()=>console.log('Chapbook preview ready; account services disabled'));
