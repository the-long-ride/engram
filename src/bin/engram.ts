#!/usr/bin/env node
/** Executable wrapper for the Engram CLI. */

import { main } from '../cli.js';
import { suppressSqliteExperimentalWarning } from '../core/system/warnings.js';

suppressSqliteExperimentalWarning();

await main();