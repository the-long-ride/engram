/** Managed scope `.gitignore`: local-only sidecars that must never show up as untracked files. */
import path from 'node:path';
import { readText, writeText } from '../system/fsx.js';

export const SCOPE_GITIGNORE = `# Engram generated routing sidecars.
memory.vec.sqlite
memory.vec.sqlite-*

# Local usage counters; never committed.
usage.json

# Agent hook per-session delivered-memory cache; local only.
agent-hook-cache.json

# MCP approval tokens awaiting engram_commit; local only.
pending-approvals.json
pending-approvals.json.*.tmp

# Opt-in SessionEnd transcript queue (absolute transcript paths); local only.
session-queue.json
session-queue.json.lock
session-queue.json.*.tmp

# Atomic-write temp files for local sidecars; a crash can leave one behind.
*.json.*.tmp

# Cross-process lock files guarding local sidecar updates.
*.json.lock

# Working-tier memories (D16): task-scoped, expiring, local only.
working/

# Source freshness results from engram verify --sources (D17); local derived state.
stale.json

# Default engram export JSON bundles; they keep live working memories, so local only.
exports/

# Migration backups (schema, author, upgrade); local only.
backups/
`;

/**
 * Add any missing managed entries to a scope `.gitignore` before writing local-only state, so a scope initialised by
 * an older Engram never shows a new sidecar as untracked. Returns true when the file changed.
 */
export async function ensureScopeGitignore(root: string): Promise<boolean> {
  const file = path.join(root, '.gitignore');
  const current = await readText(file);
  if (!current.trim()) {
    await writeText(file, SCOPE_GITIGNORE);
    return true;
  }
  const existing = new Set(current.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean));
  const missing = SCOPE_GITIGNORE.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean).filter((line) => !line.startsWith('#') && !existing.has(line));
  if (!missing.length) return false;
  await writeText(file, `${current.trimEnd()}\n${missing.join('\n')}\n`);
  return true;
}
