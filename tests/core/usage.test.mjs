import test from 'node:test';
import assert from 'node:assert/strict';
import fsp, { mkdtemp, readdir, readFile, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import { defaultConfig } from '../../dist/core/runtime/config.js';
import { routeDetailed } from '../../dist/core/memory/routing.js';
import { neverFetched, readUsage, recordUsage, usageBoost } from '../../dist/core/memory/usage.js';
import { writeJsonAtomic } from '../../dist/core/system/fsx.js';

test('recordUsage accumulates counts per key and kind with an injectable clock', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'engram-usage-'));
  const t1 = new Date('2026-01-01T00:00:00.000Z');
  const t2 = new Date('2026-02-20T00:00:00.000Z');
  await recordUsage(root, ['workspace:a.md', 'workspace:b.md'], 'injected', t1);
  await recordUsage(root, ['workspace:a.md'], 'fetched', t1);
  await recordUsage(root, ['workspace:b.md'], 'injected', t1);
  const usage = await readUsage(root);
  assert.deepEqual(usage['workspace:a.md'], { injected: 1, fetched: 1, last: t1.toISOString() });
  assert.equal(usage['workspace:b.md'].injected, 2);
  // 50 days later: b was injected but never fetched; a was fetched.
  assert.deepEqual(neverFetched(usage, t2).map((item) => item.key), ['workspace:b.md']);
  assert.deepEqual(neverFetched(usage, new Date('2026-01-20T00:00:00.000Z')), []);
  await rm(root, { recursive: true, force: true });
});

test('usage store fails open on corrupt or unwritable state', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'engram-usage-'));
  await writeFile(path.join(root, 'usage.json'), '{not json');
  assert.deepEqual(await readUsage(root), {});
  await recordUsage(root, ['workspace:a.md'], 'fetched');
  assert.equal((await readUsage(root))['workspace:a.md'].fetched, 1);
  await writeFile(path.join(root, 'usage.json'), JSON.stringify({ 'workspace:x.md': { injected: 'many' }, bad: 4 }));
  assert.deepEqual(await readUsage(root), {});
  // Missing parent directory and empty input never throw.
  await recordUsage(path.join(root, 'nope', 'deeper'), ['k'], 'fetched');
  await recordUsage(root, [], 'fetched');
  await rm(root, { recursive: true, force: true });
});

test('usageBoost is 0.03*ln(1+fetched)', () => {
  assert.equal(usageBoost(undefined), 0);
  assert.equal(usageBoost({ fetched: 0 }), 0);
  assert.ok(Math.abs(usageBoost({ fetched: 2 }) - 0.03 * Math.log(3)) < 1e-12);
});

test('fetch history breaks ties between otherwise equal memories', () => {
  const entry = (id) => ({ id, type: 'knowledge', scope: 'workspace', tags: ['zephyr'], created: '2026-01-01', updated: '2026-01-01', author: 'a@example.com', confidence: 'high', source: 'manual', file: `knowledge/${id}.md`, summary: 'Zephyr cache warmup notes', body: '', ignored: false });
  const index = { version: '1', last_updated: '', entries: [entry('alpha'), entry('bravo')] };
  const config = { ...defaultConfig(), graph: { ...defaultConfig().graph, enabled: false } };
  const ids = (usage) => routeDetailed(index, 'zephyr cache warmup', config, false, usage ? { usage } : {}).entries.map((e) => e.id);
  assert.deepEqual(ids(), ['alpha', 'bravo']);
  assert.deepEqual(ids({ 'workspace:knowledge/bravo.md': { injected: 0, fetched: 3, last: '2026-01-01T00:00:00.000Z' } }), ['bravo', 'alpha']);
});

test('recordUsage never creates a missing scope folder', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'engram-usage-'));
  const missing = path.join(root, '.agents', '.engram');
  await recordUsage(missing, ['global:knowledge/a.md'], 'injected');
  assert.equal(existsSync(path.join(root, '.agents')), false);
  await rm(root, { recursive: true, force: true });
});

test('parallel recordUsage processes never wipe rows and the file always parses', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'engram-usage-race-'));
  const file = path.join(root, 'usage.json');
  const seed = {};
  for (let i = 0; i < 100; i += 1) seed[`workspace:knowledge/seed-${i}.md`] = { injected: 1, fetched: 0, last: '2026-01-01T00:00:00.000Z' };
  await writeFile(file, `${JSON.stringify(seed, null, 2)}\n`);
  const moduleUrl = pathToFileURL(path.resolve('dist/core/memory/usage.js')).href;
  const script = `const { recordUsage } = await import(${JSON.stringify(moduleUrl)});
for (let n = 0; n < 25; n += 1) await recordUsage(process.argv[1], ['workspace:knowledge/shared.md', 'workspace:knowledge/p' + process.argv[2] + '-' + n + '.md'], 'injected');`;
  let torn = 0;
  let polling = true;
  const poll = (async () => {
    while (polling) {
      try { JSON.parse(await readFile(file, 'utf8')); } catch (error) { if (error instanceof SyntaxError) torn += 1; }
      await new Promise((resolve) => setImmediate(resolve));
    }
  })();
  await Promise.all(Array.from({ length: 5 }, (_, child) => new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, ['--input-type=module', '-e', script, root, String(child)], { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', (chunk) => { stderr += chunk; });
    proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(stderr))));
  })));
  polling = false;
  await poll;
  const usage = JSON.parse(await readFile(file, 'utf8'));
  const lost = Object.keys(seed).filter((key) => !usage[key]);
  assert.deepEqual(lost, [], `seed rows lost: ${lost.length}`);
  assert.equal(torn, 0, 'a reader never saw a torn usage.json');
  assert.deepEqual((await readdir(root)).filter((name) => name.endsWith('.tmp')), []);
  await rm(root, { recursive: true, force: true });
});

test('writeJsonAtomic keeps the old file when the replace fails and retries a busy rename', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'engram-atomic-'));
  const file = path.join(root, 'state.json');
  await writeFile(file, '{"old":true}\n');
  const original = fsp.rename;
  try {
    fsp.rename = async () => { throw Object.assign(new Error('disk gone'), { code: 'EIO' }); };
    await assert.rejects(writeJsonAtomic(file, { new: true }), /disk gone/);
    assert.equal(await readFile(file, 'utf8'), '{"old":true}\n');
    assert.deepEqual((await readdir(root)).sort(), ['state.json'], 'the temp file is removed');

    let busy = 2;
    fsp.rename = async (from, to) => {
      if (busy-- > 0) throw Object.assign(new Error('busy'), { code: 'EPERM' });
      return original(from, to);
    };
    await writeJsonAtomic(file, { new: true });
    assert.deepEqual(JSON.parse(await readFile(file, 'utf8')), { new: true });
  } finally {
    fsp.rename = original;
  }
  await rm(root, { recursive: true, force: true });
});
