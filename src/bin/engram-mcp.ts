#!/usr/bin/env node
/** Executable wrapper for the Engram MCP stdio server. */
import { runMcp } from '../mcp/server.js';

await runMcp();
