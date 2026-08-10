import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, access, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ensureVectorIndex, __insertVectorEntriesForTest } from '../../dist/core/memory/vector-db.js';
import { defaultConfig } from '../../dist/core/runtime/config.js';

function entry(id='one') {
  return {
    id,
    type: 'knowledge',
    scope: 'workspace',
    tags: ['vector'],
    created: '2026-01-01T00:00:00.000Z',
    updated: '2026-01-01T00:00:00.000Z',
    author: 'test@example.com',
    confidence: 'high',
    source: 'manual',
    file: `knowledge/${id}.md`,
    summary: `entry ${id}`,
    body: 'body',
    ignored: false
  };
}

test('vec0 row IDs are bound as bigint', () => {
  const observed = [];
  const statements = [];
  const db = {
    exec() {},
    prepare(sql) {
      const vector = sql.includes('memory_vectors');
      const stmt = { run(rowid) { if (vector) observed.push(typeof rowid); } };
      statements.push(stmt);
      return stmt;
    }
  };
  __insertVectorEntriesForTest({ db, bindVector: (value) => value }, 'workspace', [entry('a'), entry('b')], 4);
  assert.deepEqual(observed, ['bigint', 'bigint']);
});

test('vector rebuild failure degrades and removes incomplete sidecars', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'engram-vector-fail-open-'));
  await mkdir(root, { recursive: true });
  const file = path.join(root, 'memory.vec.sqlite');
  for (const suffix of ['', '-wal', '-shm']) await writeFile(`${file}${suffix}`, 'partial');
  const config = defaultConfig();
  config.vector.auto_threshold = 1;
  const status = await ensureVectorIndex(root, 'workspace', [entry()], config, {
    force: true,
    _runtimeFactory: async () => { throw new Error('Only integers are allowed for primary key values on memory_vectors'); }
  });
  assert.equal(status.action, 'skipped');
  assert.match(status.reason ?? '', /^vector index degraded:/);
  for (const suffix of ['', '-wal', '-shm']) {
    await assert.rejects(access(`${file}${suffix}`));
  }
  await rm(root, { recursive: true, force: true });
});
