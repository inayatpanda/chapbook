import { stat, realpath } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

// Netlify's secret-variable API returns masks outside the dev context. A
// nonempty exported value therefore does not prove that a migration has keys.
export function assertLiveServiceEnv(env = process.env) {
  if (env.CHAPBOOK_PREVIEW === '1') return;
  if ((env.FULFIL_WORKER && !['github', 'hostinger'].includes(env.FULFIL_WORKER)) ||
      (env.FULFIL_WORKER !== 'hostinger' && !/^(?:github_pat_|gh[pousr]_)[A-Za-z0-9_]{20,}$/.test(env.GITHUB_QUEUE_TOKEN || '')) ||
      !/^whsec_[A-Za-z0-9]{20,}$/.test(env.STRIPE_WEBHOOK_SECRET || '')) {
    throw Error('Live account services require valid queue and webhook credentials');
  }
}

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
