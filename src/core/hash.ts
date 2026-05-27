/** SHA-256 memory integrity helpers. */
import path from 'node:path';
import { createHash } from 'node:crypto';
import { HASH_FILE } from './constants.js';
import type { HashStore, Scope } from './types.js';
import { listFiles, readJson, readText, writeJson } from './fsx.js';

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
