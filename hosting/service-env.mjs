import { stat, realpath } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

// Optional SSH-managed secrets stay outside replaceable deployment assets.
// Hostinger's environment contains only the path; this file is never served.
export async function loadServiceEnv(path = process.env.CHAPBOOK_SERVICE_ENV, publicRoot = resolve('dist')) {
  if (!path) return;
  try {
    const file=await realpath(path),root=await realpath(publicRoot),info=await stat(file);
    if(file===root||file.startsWith(root+sep)||!info.isFile()||(info.mode&0o077)!==0)throw Error('unsafe');
    process.loadEnvFile(file);
  }catch{throw Error('Private service configuration is unavailable or has unsafe permissions');}
}
