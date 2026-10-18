// Fail closed: these old commands must not spend credits or revive stale storage.
console.error('Chapbook production is hosted by Hostinger. Netlify deployment is retired.');
console.error('Follow hosting/README.md and upload the verified current release archive in Hostinger Web Apps.');
console.error('Do not re-enable the retired Netlify site: its data is a stale migration snapshot.');
process.exitCode = 1;
