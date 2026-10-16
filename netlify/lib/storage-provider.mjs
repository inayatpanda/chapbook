import { getStore } from '@netlify/blobs';
import { mysqlStore } from '../../hosting/mysql-store.mjs';

export function openStore(name) {
  if (process.env.CHAPBOOK_STORAGE === 'mysql') return mysqlStore(name);
  // Metrics has its own per-read strong/fallback policy for older runtimes.
  if (name === 'metrics') return getStore(name);
  return getStore({ name, region: 'eu-central-1', consistency: 'strong' });
}
