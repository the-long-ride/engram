/** Guarded memory reads used by load, export, and sync. */
import { defaultConfig, scopeRootsForConfig } from '../runtime/config.js';
import { inside, readText } from '../system/fsx.js';
import { verifyMemoryHash } from './hash.js';
import { renderMemoryForAgent, renderMemoryForConfig } from '../memory/rule-variants.js';
import { scanInjection, scanSensitive } from './security.js';
import type { EngramConfig, MemoryEntry, Scope } from '../runtime/types.js';

export type GuardedRead = { entry: MemoryEntry; content: string; flagged?: string };

export type GuardedReadOptions = {
  render?: boolean;
  verifyHashes?: boolean;
  scanInjection?: boolean;
  scanSensitive?: boolean;
  forAgents?: boolean;
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
  const flagged = verify.ok ? undefined : verify.reason;
  if (flagged) return { entry, content: '', flagged };
  if (options.scanSensitive !== false) {
    const sensitive = scanSensitive(raw);
    if (sensitive.length) return { entry, content: '', flagged: `sensitive data: ${sensitive[0].reason}` };
  }
  if (options.scanInjection !== false) {
    const injection = scanInjection(raw);
    if (injection.length) return { entry, content: '', flagged: injection[0].value };
  }
  const content = options.render === false ? raw : options.forAgents
    ? renderMemoryForAgent(raw, entry, config)
    : renderMemoryForConfig(raw, entry, config);
  return { entry, content, flagged };
}
