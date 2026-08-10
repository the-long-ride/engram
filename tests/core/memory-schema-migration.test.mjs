import test from 'node:test';
import assert from 'node:assert/strict';
import { chmod, mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';

import {
  migrateMemorySchema,
  planMemorySchemaMigration
} from '../../dist/core/memory/migrate-schema.js';
import { parseMemory, validateMemoryRaw } from '../../dist/core/memory/schema.js';
import { writeTrace } from '../../dist/core/traces/storage.js';

const sha256 = (text) => createHash('sha256').update(text).digest('hex');

async function tempRoot() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'engram-memory-schema-migration-'));
  for (const dir of ['rules', 'skills', 'knowledge', 'archive']) await mkdir(path.join(root, dir), { recursive: true });
  await writeFile(path.join(root, 'memory.hashes.json'), '{}\n');
  return root;
}

function legacyV1({ id = 'legacy-rule', type = 'rule', scope = 'workspace', evidence = '' } = {}) {
  return `---
id: ${id}
type: ${type}
scope: ${scope}
tags: [legacy, migration]
created: 2025-02-03
updated: 2025-04-05
author: old@example.com
source: manual
confidence: high
${evidence}---
# Legacy title

## Context

Original context stays untouched.${'  '}

## Content

- Preserve this body exactly.

## Example

\`engram old\`
`;
}

function legacyV2({ id = 'legacy-knowledge', type = 'knowledge', scope = 'workspace' } = {}) {
  return `---
id: ${id}
type: ${type}
scope: ${scope}
tags: [legacy, v2]
created: 2025-06-07
author: old@example.com
source: manual
confidence: medium
---
# Legacy V2

## Content

- V2 content remains byte-for-byte.${'  '}

## Origin

Imported from an older Engram release.
`;
}

function bodyOf(raw) {
  const index = raw.indexOf('\n---\n', 4);
  return index < 0 ? raw : raw.slice(index + 5);
}

test('plan reports eligible legacy memories without writing files', async () => {
  const root = await tempRoot();
  const file = path.join(root, 'rules', 'legacy-rule.md');
  const raw = legacyV1();
  await writeFile(file, raw);

  const result = await planMemorySchemaMigration(root, 'workspace');

  assert.equal(result.scope, 'workspace');
  assert.equal(result.eligible, 1);
  assert.equal(result.migrated, 0);
  assert.equal(result.skipped, 0);
  assert.equal(result.files[0].action, 'migrate');
  assert.equal(await readFile(file, 'utf8'), raw);
  await assert.rejects(readFile(`${file}.pre-v3.bak`, 'utf8'));
  await rm(root, { recursive: true, force: true });
});

test('migration upgrades v1 and v2 frontmatter while preserving bodies exactly', async () => {
  const root = await tempRoot();
  const v1File = path.join(root, 'rules', 'legacy-rule.md');
  const v2File = path.join(root, 'knowledge', 'legacy-knowledge.md');
  const v1 = legacyV1();
  const v2 = legacyV2();
  await writeFile(v1File, v1);
  await writeFile(v2File, v2);

  const result = await migrateMemorySchema(root, 'workspace');

  assert.equal(result.eligible, 2);
  assert.equal(result.migrated, 2);
  assert.equal(result.failed, 0);
  const migratedV1 = await readFile(v1File, 'utf8');
  const migratedV2 = await readFile(v2File, 'utf8');
  assert.equal(bodyOf(migratedV1), bodyOf(v1));
  assert.equal(bodyOf(migratedV2), bodyOf(v2));
  assert.equal(await readFile(`${v1File}.pre-v3.bak`, 'utf8'), v1);
  assert.equal(await readFile(`${v2File}.pre-v3.bak`, 'utf8'), v2);

  const v1Doc = parseMemory(migratedV1);
  assert.equal(v1Doc.frontmatter.schema_version, 3);
  assert.equal(v1Doc.frontmatter.authority, 'instruction');
  assert.equal(v1Doc.frontmatter.revision, 1);
  assert.equal(v1Doc.frontmatter.valid_from, '2025-02-03');
  assert.equal(v1Doc.frontmatter.last_confirmed, '2025-04-05');
  assert.equal(v1Doc.frontmatter.evidence_status, 'unverified');
  validateMemoryRaw(migratedV1);

  const v2Doc = parseMemory(migratedV2);
  assert.equal(v2Doc.frontmatter.authority, 'reference');
  assert.equal(v2Doc.frontmatter.last_confirmed, '2025-06-07');
  validateMemoryRaw(migratedV2);
  await rm(root, { recursive: true, force: true });
});

test('migration preserves evidence refs but leaves missing traces unverified', async () => {
  const root = await tempRoot();
  const file = path.join(root, 'skills', 'with-evidence.md');
  const raw = legacyV1({
    id: 'with-evidence',
    type: 'skill',
    evidence: 'evidence_refs: [tr_workspace_abc]\nderived_from: [session:old]\n'
  });
  await writeFile(file, raw);

  await migrateMemorySchema(root, 'workspace');

  const doc = parseMemory(await readFile(file, 'utf8'));
  assert.deepEqual(doc.frontmatter.evidence_refs, ['tr_workspace_abc']);
  assert.deepEqual(doc.frontmatter.derived_from, ['session:old']);
  assert.equal(doc.frontmatter.evidence_status, 'unverified');
  await rm(root, { recursive: true, force: true });
});

test('migration marks evidence verified only when its trace exists and validates', async () => {
  const root = await tempRoot();
  const traceId = 'tr_workspace_verified';
  await writeTrace(root, {
    traceId,
    sessionId: 'session-verified',
    host: 'test',
    eventTime: '2025-06-07T00:00:00.000Z',
    source: 'migration-test',
    text: 'Verified source evidence.',
    trustLevel: 'human',
    sensitivity: 'internal',
    retention: 'permanent',
    redactedFindings: 0,
    removedInjectionLines: 0
  });
  const file = path.join(root, 'knowledge', 'verified-evidence.md');
  const raw = legacyV1({
    id: 'verified-evidence',
    type: 'knowledge',
    evidence: `evidence_refs: [${traceId}]\nderived_from: [session-verified]\n`
  });
  await writeFile(file, raw);

  await migrateMemorySchema(root, 'workspace');

  const doc = parseMemory(await readFile(file, 'utf8'));
  assert.equal(doc.frontmatter.evidence_status, 'verified');
  await rm(root, { recursive: true, force: true });
});

test('migration uses file modification time only when legacy dates are absent', async () => {
  const root = await tempRoot();
  const file = path.join(root, 'knowledge', 'undated.md');
  const raw = `---\nid: undated\ntype: knowledge\nscope: workspace\ntags: [legacy]\nauthor: old@example.com\nconfidence: low\n---\n# Undated\n\n## Content\n\n- Still valid.\n`;
  await writeFile(file, raw);
  const before = await stat(file);

  await migrateMemorySchema(root, 'workspace');

  const doc = parseMemory(await readFile(file, 'utf8'));
  assert.equal(doc.frontmatter.valid_from, before.mtime.toISOString());
  assert.equal(doc.frontmatter.last_confirmed, before.mtime.toISOString());
  assert.equal(doc.frontmatter.migration_date_source, 'file_mtime');
  await rm(root, { recursive: true, force: true });
});

test('migration skips invalid files and never rewrites archives', async () => {
  const root = await tempRoot();
  const invalid = path.join(root, 'rules', 'invalid.md');
  const archived = path.join(root, 'archive', 'legacy.md');
  await writeFile(invalid, '---\nid: invalid\ntype: mystery\nauthor: old@example.com\n---\n# Invalid\n\n## Content\n\n- Invalid type.\n');
  const archivedRaw = legacyV1({ id: 'archived' });
  await writeFile(archived, archivedRaw);

  const result = await migrateMemorySchema(root, 'workspace');

  assert.equal(result.failed, 1);
  assert.match(result.files.find((row) => row.file === 'rules/invalid.md').reason, /Invalid memory type/);
  assert.equal(await readFile(archived, 'utf8'), archivedRaw);
  await assert.rejects(readFile(`${archived}.pre-v3.bak`, 'utf8'));
  await rm(root, { recursive: true, force: true });
});

test('migration refreshes hashes and is idempotent without overwriting backups', async () => {
  const root = await tempRoot();
  const rel = 'rules/legacy-rule.md';
  const file = path.join(root, rel);
  const raw = legacyV1();
  await writeFile(file, raw);

  const first = await migrateMemorySchema(root, 'workspace');
  const migrated = await readFile(file, 'utf8');
  const backupStat = await stat(`${file}.pre-v3.bak`);
  const hashes = JSON.parse(await readFile(path.join(root, 'memory.hashes.json'), 'utf8'));
  assert.equal(hashes[rel], sha256(migrated));
  assert.equal(first.migrated, 1);

  const second = await migrateMemorySchema(root, 'workspace');
  assert.equal(second.eligible, 0);
  assert.equal(second.migrated, 0);
  assert.equal(await readFile(file, 'utf8'), migrated);
  assert.equal((await stat(`${file}.pre-v3.bak`)).mtimeMs, backupStat.mtimeMs);
  await rm(root, { recursive: true, force: true });
});

test('migration preserves a legacy body without adding a terminal newline', async () => {
  const root = await tempRoot();
  const file = path.join(root, 'knowledge', 'no-terminal-newline.md');
  const raw = `---\nid: no-terminal-newline\ntype: knowledge\nscope: workspace\ntags: [legacy]\ncreated: 2025-06-07\nauthor: old@example.com\nconfidence: medium\n---\n# No terminal newline\n\n## Content\n\nExact ending.`;
  await writeFile(file, raw);

  await migrateMemorySchema(root, 'workspace');

  const migrated = await readFile(file, 'utf8');
  assert.equal(bodyOf(migrated), bodyOf(raw));
  assert.equal(migrated.endsWith('\n'), false);
  await rm(root, { recursive: true, force: true });
});


test('migration preserves restrictive memory file permissions', async (t) => {
  if (process.platform === 'win32') return t.skip('POSIX mode bits are not portable on Windows');
  const root = await tempRoot();
  const file = path.join(root, 'rules', 'private-rule.md');
  await writeFile(file, legacyV1({ id: 'private-rule' }));
  await chmod(file, 0o600);

  await migrateMemorySchema(root, 'workspace');

  assert.equal((await stat(file)).mode & 0o777, 0o600);
  assert.equal((await stat(`${file}.pre-v3.bak`)).mode & 0o777, 0o600);
  await rm(root, { recursive: true, force: true });
});

test('migration restores the legacy file when hash refresh fails', async () => {
  const root = await tempRoot();
  const file = path.join(root, 'rules', 'hash-failure.md');
  const raw = legacyV1({ id: 'hash-failure' });
  await writeFile(file, raw);
  await rm(path.join(root, 'memory.hashes.json'));
  await mkdir(path.join(root, 'memory.hashes.json'));

  const result = await migrateMemorySchema(root, 'workspace');

  assert.equal(result.migrated, 0);
  assert.equal(result.failed, 1);
  assert.equal(await readFile(file, 'utf8'), raw);
  assert.equal(await readFile(`${file}.pre-v3.bak`, 'utf8'), raw);
  await rm(root, { recursive: true, force: true });
});
