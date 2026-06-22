#!/usr/bin/env node
/** Executable wrapper for the Engram CLI. */

// Suppress the Node.js ExperimentalWarning for the built-in node:sqlite module.
// We dynamically try node:sqlite (>=22.5) and fall back to better-sqlite3; the
// warning is expected and harmless but confusing to end-users.
(process as any).on('warning', (warning: any) => {
  if (warning.name === 'ExperimentalWarning' && warning.message.includes('SQLite')) return;
  process.stderr.write(`${warning.name}: ${warning.message}\n`);
});

import { main } from '../cli.js';

await main();
