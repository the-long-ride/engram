/** SHA-256 memory integrity helpers. */
import path from 'node:path';
import { createHash } from 'node:crypto';
import { HASH_FILE } from '../runtime/constants.js';
import type { HashStore, Scope } from '../runtime/types.js';
import { inside, listFiles, readJson, readText, writeJson } from '../system/fsx.js';

/** Compute a SHA-256 hex digest. */
export function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

/** Load hash storage for a scope root. */
export async function loadHashes(root: string): Promise<HashStore> {
  return readJson<HashStore>(path.join(root, HASH_FILE), {});
}

/** Update one stored hash. */
export async function updateHash(root: string, relFile: string, content: string): Promise<void> {
  const hashes = await loadHashes(root);
  hashes[relFile.replace(/\\/g, '/')] = sha256(content);
  await writeJson(path.join(root, HASH_FILE), hashes);
}

/** Verify one memory file against the stored hash without trusting its content. */
export async function verifyMemoryHash(root: string, relFile: string, content?: string): Promise<{ ok: boolean; reason?: string }> {
  const normalized = relFile.replace(/\\/g, '/');
  const expected = (await loadHashes(root))[normalized];
  if (!expected) return { ok: false, reason: 'missing hash' };
  const current = sha256(content ?? await readText(inside(root, normalized)));
  return expected === current ? { ok: true } : { ok: false, reason: 'hash mismatch' };
}

/** Verify every Markdown memory file under a root. */
export async function verifyRoot(root: string, scope: Scope): Promise<Array<{ file: string; scope: Scope; ok: boolean }>> {
  const hashes = await loadHashes(root);
  const files = (await listFiles(root)).filter((file) => file.endsWith('.md') && !file.includes(`${path.sep}archive${path.sep}`));
  const rows = [];
  for (const file of files) {
    const rel = path.relative(root, file).replace(/\\/g, '/');
    if (rel === 'HELP.md' || rel === 'README.md' || rel === 'changelog.md') continue;
    const current = sha256(await readText(file));
    rows.push({ file: rel, scope, ok: hashes[rel] === current });
  }
  return rows;
}
