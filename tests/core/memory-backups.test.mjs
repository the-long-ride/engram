import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  applyBackupMoves,
  backupPath,
  backupRelative,
  planBackupMoves,
  strayBackups,
  writeBackupOnce
} from '../../dist/core/memory/backups.js';

async function tempRoot() {
  return mkdtemp(path.join(os.tmpdir(), 'engram-memory-backups-'));
}

test('backupPath builds backups/<kind>-<label>/<relative><suffix> and refuses paths that escape the scope', async () => {
  const root = await tempRoot();
  const file = backupPath(root, 'schema', 'v3', 'rules/x.md', '.pre-v3.bak');
  assert.equal(backupRelative(root, file), 'backups/schema-v3/rules/x.md.pre-v3.bak');
  assert.equal(backupRelative(root, backupPath(root, 'upgrade', '0.1.0-rc/1', 'knowledge\\y.md', '.engram-upgrade-x.bak')), 'backups/upgrade-0.1.0-rc_1/knowledge/y.md.engram-upgrade-x.bak');
  assert.throws(() => backupPath(root, 'schema', 'v3', '../outside.md', '.bak'), /escapes the scope/);
  assert.throws(() => backupPath(root, 'schema', 'v3', '..', '.bak'), /escapes the scope/);
  assert.throws(() => backupPath(root, 'schema', 'v3', path.resolve(root, 'abs.md'), '.bak'), /escapes the scope/);
  await rm(root, { recursive: true, force: true });
});

test('writeBackupOnce is write-once, byte-checked, and adds backups/ to the scope gitignore', async () => {
  const root = await tempRoot();
  const file = backupPath(root, 'schema', 'v3', 'rules/x.md', '.pre-v3.bak');
  await writeBackupOnce(root, file, 'original');
  assert.match(await readFile(path.join(root, '.gitignore'), 'utf8'), /^backups\/$/m);
  await writeBackupOnce(root, file, 'original');
  await assert.rejects(writeBackupOnce(root, file, 'changed'), /does not match/);
  await writeBackupOnce(root, file, 'changed', undefined, false);
  assert.equal(await readFile(file, 'utf8'), 'original');
  await rm(root, { recursive: true, force: true });
});

test('strayBackups and planBackupMoves classify legacy suffixes and skip the backups folder', async () => {
  const root = await tempRoot();
  for (const dir of ['rules', 'knowledge', 'working/rules', 'backups/schema-v3/rules']) await mkdir(path.join(root, ...dir.split('/')), { recursive: true });
  const files = [
    'rules/a.md.pre-v3.bak',
    'knowledge/b.md.pre-author-v3.bak',
    'knowledge/c.md.engram-upgrade-0.0.28.bak',
    'working/rules/d.md.bak',
    'backups/schema-v3/rules/already.md.pre-v3.bak',
    'rules/live.md'
  ];
  for (const rel of files) await writeFile(path.join(root, ...rel.split('/')), 'x');
  assert.deepEqual(await strayBackups(root), [
    'knowledge/b.md.pre-author-v3.bak',
    'knowledge/c.md.engram-upgrade-0.0.28.bak',
    'rules/a.md.pre-v3.bak',
    'working/rules/d.md.bak'
  ]);
  const plan = await planBackupMoves(root);
  assert.deepEqual(plan.map((move) => [move.from, move.to, move.action]), [
    ['knowledge/b.md.pre-author-v3.bak', 'backups/author-v3/knowledge/b.md.pre-author-v3.bak', 'move'],
    ['knowledge/c.md.engram-upgrade-0.0.28.bak', 'backups/upgrade-0.0.28/knowledge/c.md.engram-upgrade-0.0.28.bak', 'move'],
    ['rules/a.md.pre-v3.bak', 'backups/schema-v3/rules/a.md.pre-v3.bak', 'move'],
    ['working/rules/d.md.bak', 'backups/legacy-unknown/working/rules/d.md.bak', 'move']
  ]);
  assert.deepEqual(await readdir(path.join(root, 'rules')), ['a.md.pre-v3.bak', 'live.md']);
  const moved = await applyBackupMoves(root, plan);
  assert.deepEqual(moved.map((move) => move.action), ['moved', 'moved', 'moved', 'moved']);
  assert.deepEqual(await strayBackups(root), []);
  assert.equal(await readFile(path.join(root, 'backups', 'author-v3', 'knowledge', 'b.md.pre-author-v3.bak'), 'utf8'), 'x');
  assert.deepEqual(await readdir(path.join(root, 'rules')), ['live.md']);
  await rm(root, { recursive: true, force: true });
});

test('applyBackupMoves removes identical duplicates and never touches conflicts', async () => {
  const root = await tempRoot();
  await mkdir(path.join(root, 'rules'), { recursive: true });
  await mkdir(path.join(root, 'backups', 'schema-v3', 'rules'), { recursive: true });
  await writeFile(path.join(root, 'rules', 'same.md.pre-v3.bak'), 'one');
  await writeFile(path.join(root, 'backups', 'schema-v3', 'rules', 'same.md.pre-v3.bak'), 'one');
  await writeFile(path.join(root, 'rules', 'clash.md.pre-v3.bak'), 'one');
  await writeFile(path.join(root, 'backups', 'schema-v3', 'rules', 'clash.md.pre-v3.bak'), 'two');
  const plan = await planBackupMoves(root);
  assert.deepEqual(plan.map((move) => move.action), ['conflict', 'identical']);
  const result = await applyBackupMoves(root, plan);
  assert.deepEqual(result.map((move) => move.action), ['conflict', 'moved']);
  assert.equal(await readFile(path.join(root, 'rules', 'clash.md.pre-v3.bak'), 'utf8'), 'one');
  await assert.rejects(readFile(path.join(root, 'rules', 'same.md.pre-v3.bak'), 'utf8'));
  await rm(root, { recursive: true, force: true });
});
