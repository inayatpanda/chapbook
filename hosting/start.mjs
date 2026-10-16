// Hostinger imports the configured entry from its launcher; process.argv[1]
// names that launcher, not this file. Start unconditionally in this entry only.
import { startApp } from './server.mjs';
export const server = await startApp();
