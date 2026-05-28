/** Interop export/import and generated-agent-file rendering. */
import path from 'node:path';
import { GENERATED_HEADER } from './constants.js';
import type { MemoryEntry } from './types.js';
import { readText, writeJson, writeText } from './fsx.js';
import { loadConfig } from './config.js';
import { readGuardedMemory } from './safe-read.js';

const formats = new Set(['agents-md', 'claude-md', 'cursorrules']);

/** Render memory into common agent instruction formats. */
export async function renderFormat(cwd: string, entries: MemoryEntry[], format: string): Promise<string> {
  assertFormat(format);
  const config = await loadConfig(cwd);
  const chunks = [GENERATED_HEADER, '# Engram Memory Export'];
  for (const entry of entries) {
    const row = await readGuardedMemory(cwd, entry, config);
    if (row.flagged) chunks.push(`\n<!-- skipped ${entry.scope}:${entry.file}: ${row.flagged} -->`);
    else chunks.push(`\n<!-- ${entry.scope}:${entry.file} -->\n${row.content.trim()}`);
  }
  if (format === 'cursorrules') return chunks.join('\n\n').replace(/^# Engram Memory Export/m, '# Cursor Rules');
  if (format === 'claude-md') return chunks.join('\n\n').replace(/^# Engram Memory Export/m, '# CLAUDE.md');
  return chunks.join('\n\n').replace(/^# Engram Memory Export/m, '# AGENTS.md');
}

/** Export a deterministic JSON bundle. */
export async function exportBundle(cwd: string, entries: MemoryEntry[], outFile: string): Promise<void> {
  const config = await loadConfig(cwd);
  const memories = [];
  for (const entry of entries) {
    const row = await readGuardedMemory(cwd, entry, config, { render: false });
    if (!row.flagged) memories.push({ entry, content: row.content });
  }
  await writeJson(outFile, { version: '0.8', exported_at: new Date().toISOString(), memories });
}

/** Write live-sync targets without touching non-generated files. */
export async function writeSyncTarget(cwd: string, format: string, content: string): Promise<string> {
  assertFormat(format);
  const target = format === 'claude-md' ? 'CLAUDE.md' : format === 'agents-md' ? 'AGENTS.md' : path.join('.cursor', 'rules', 'engram.mdc');
  const full = path.join(cwd, target);
  const current = await readText(full);
  if (current && !current.startsWith(GENERATED_HEADER)) throw new Error(`Refusing to overwrite non-generated ${target}`);
  await writeText(full, content);
  return target.replace(/\\/g, '/');
}

export function assertFormat(format: string): void {
  if (!formats.has(format)) throw new Error(`unsupported export format: ${format}`);
}
