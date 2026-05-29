/** Guarded memory reads used by load, export, and sync. */
import { defaultConfig, scopeRootsForConfig } from '../runtime/config.js';
import { inside, readText } from '../system/fsx.js';
import { verifyMemoryHash } from './hash.js';
import { renderMemoryForConfig } from '../memory/rule-variants.js';
import { scanInjection, scanSensitive } from './security.js';
import type { EngramConfig, MemoryEntry, Scope } from '../runtime/types.js';

export type GuardedRead = { entry: MemoryEntry; content: string; flagged?: string };

export type GuardedReadOptions = {
  render?: boolean;
  verifyHashes?: boolean;
  scanInjection?: boolean;
  scanSensitive?: boolean;
};

/** Read one memory file only after integrity and safety checks pass. */
export async function readGuardedMemory(
  cwd: string,
  entry: MemoryEntry,
  config: EngramConfig = defaultConfig(),
  options: GuardedReadOptions = {}
): Promise<GuardedRead> {
  const roots = scopeRootsForConfig(cwd, config);
  const root = roots[entry.scope as Scope];
  if (!root) return { entry, content: '', flagged: 'global memory is not configured' };
  const raw = await readText(inside(root, entry.file));
  const verify = options.verifyHashes !== false ? await verifyMemoryHash(root, entry.file, raw) : { ok: true };
  if (!verify.ok) return { entry, content: '', flagged: verify.reason };
  if (options.scanSensitive !== false) {
    const sensitive = scanSensitive(raw);
    if (sensitive.length) return { entry, content: '', flagged: `sensitive data: ${sensitive[0].reason}` };
  }
  if (options.scanInjection !== false) {
    const injection = scanInjection(raw);
    if (injection.length) return { entry, content: '', flagged: injection[0].value };
  }
  return { entry, content: options.render === false ? raw : renderMemoryForConfig(raw, entry, config) };
}
