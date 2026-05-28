/** Interop export/import and generated-agent-file rendering. */
import path from 'node:path';
import { GENERATED_HEADER } from './constants.js';
import type { MemoryEntry } from './types.js';
import { inside, readText, writeJson, writeText } from './fsx.js';
import { loadConfig, scopeRoots } from './config.js';
import { renderMemoryForConfig } from './rule-variants.js';

/** Render memory into common agent instruction formats. */
export async function renderFormat(cwd: string, entries: MemoryEntry[], format: string): Promise<string> {
  const roots = scopeRoots(cwd);
  const config = await loadConfig(cwd);
  const chunks = [GENERATED_HEADER, '# Engram Memory Export'];
  for (const entry of entries) {
    const content = await readText(inside(roots[entry.scope], entry.file));
    chunks.push(`\n<!-- ${entry.scope}:${entry.file} -->\n${renderMemoryForConfig(content, entry, config).trim()}`);
  }
  if (format === 'cursorrules') return chunks.join('\n\n').replace(/^# Engram Memory Export/m, '# Cursor Rules');
  if (format === 'claude-md') return chunks.join('\n\n').replace(/^# Engram Memory Export/m, '# CLAUDE.md');
  return chunks.join('\n\n').replace(/^# Engram Memory Export/m, '# AGENTS.md');
}

/** Export a deterministic JSON bundle. */
export async function exportBundle(cwd: string, entries: MemoryEntry[], outFile: string): Promise<void> {
  const roots = scopeRoots(cwd);
  const memories = [];
  for (const entry of entries) memories.push({ entry, content: await readText(inside(roots[entry.scope], entry.file)) });
  await writeJson(outFile, { version: '0.8', exported_at: new Date().toISOString(), memories });
}

/** Write live-sync targets without touching non-generated files. */
export async function writeSyncTarget(cwd: string, format: string, content: string): Promise<string> {
  const target = format === 'claude-md' ? 'CLAUDE.md' : format === 'agents-md' ? 'AGENTS.md' : path.join('.cursor', 'rules', 'engram.md');
  const full = path.join(cwd, target);
  const current = await readText(full);
  if (current && !current.startsWith(GENERATED_HEADER)) throw new Error(`Refusing to overwrite non-generated ${target}`);
  await writeText(full, content);
  return target;
}
