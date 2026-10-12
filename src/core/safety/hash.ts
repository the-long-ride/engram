/** SHA-256 memory integrity helpers. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { HASH_FILE, WORKING_HASH_FILE, isActiveMemoryPath, isWorkingPath } from '../runtime/constants.js';
import type { HashStore, Scope } from '../runtime/types.js';
import { inside, listFiles, readJson, readText, writeJsonAtomic, writeJsonIfChanged } from '../system/fsx.js';

/** Compute a SHA-256 hex digest. */
export function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

/** Load hash storage for a scope root: the committed store plus the gitignored `working/` store. */
export async function loadHashes(root: string): Promise<HashStore> {
  return { ...await readJson<HashStore>(path.join(root, HASH_FILE), {}), ...await readJson<HashStore>(path.join(root, WORKING_HASH_FILE), {}) };
}

/** Persist hashes: `working/` keys go to the local working store so the committed store never names them. */
export async function saveHashes(root: string, hashes: HashStore): Promise<void> {
  const durable: HashStore = {};
  const working: HashStore = {};
  for (const [file, hash] of Object.entries(hashes)) (isWorkingPath(file) ? working : durable)[file] = hash;
  // The committed store is only rewritten when a durable hash changes.
  await writeJsonIfChanged(path.join(root, HASH_FILE), durable);
  if (Object.keys(working).length) await writeJsonAtomic(path.join(root, WORKING_HASH_FILE), working);
  else await fs.rm(path.join(root, WORKING_HASH_FILE), { force: true });
}

/** Update one stored hash. */
export async function updateHash(root: string, relFile: string, content: string): Promise<void> {
  const hashes = await loadHashes(root);
  hashes[relFile.replace(/\\/g, '/')] = sha256(content);
  await saveHashes(root, hashes);
}

/** Remove one hash entry after an approved archive/move. */
export async function removeHash(root: string, relFile: string): Promise<void> {
  const hashes = await loadHashes(root);
  delete hashes[relFile.replace(/\\/g, '/')];
  await saveHashes(root, hashes);
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
  const files = (await listFiles(root)).filter((file) => file.endsWith('.md'));
  const rows = [];
  for (const file of files) {
    const rel = path.relative(root, file).replace(/\\/g, '/');
    if (!isActiveMemoryPath(rel)) continue;
    if (rel === 'HELP.md' || rel === 'README.md' || rel === 'changelog.md') continue;
    const current = sha256(await readText(file));
    rows.push({ file: rel, scope, ok: hashes[rel] === current });
  }
  return rows;
}
