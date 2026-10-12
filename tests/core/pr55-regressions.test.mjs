import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { tempWorkspace, workspaceMemoryRoot } from '../helpers.mjs';
import { enqueueSession, drainSessionQueue, readSessionQueue } from '../../dist/core/memory/session-queue.js';
import { planRefresh } from '../../dist/core/memory/refresh.js';

test('draining an old session entry keeps a replacement queued during the drain', async () => {
  const { cwd } = await tempWorkspace('engram-queue-race-');
  const root = workspaceMemoryRoot(cwd);
  await fs.mkdir(root, { recursive: true });
  const old = { host: 'claude', session: 's1', transcript_path: path.join(cwd, 'old.jsonl'), at: '2026-10-12T00:00:00Z' };
  const replacement = { ...old, transcript_path: path.join(cwd, 'new.jsonl'), at: '2026-10-12T00:00:01Z' };
  await enqueueSession(root, old);
  const lstat = fs.lstat;
  fs.lstat = async (file, ...args) => {
    if (file === old.transcript_path) await enqueueSession(root, replacement);
    return lstat(file, ...args);
  };
  try {
    const drained = await drainSessionQueue(root);
    assert.equal(drained[0].status, 'skipped');
    assert.deepEqual(await readSessionQueue(root), [replacement]);
  } finally {
    fs.lstat = lstat;
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('refresh ceiling defers memories with incomplete sources and preserves their stale keys', async () => {
  const { cwd } = await tempWorkspace('engram-refresh-ceiling-');
  const root = workspaceMemoryRoot(cwd);
  await fs.mkdir(path.join(root, 'knowledge'), { recursive: true });
  await fs.mkdir(path.join(cwd, 'docs'));
  const files = Array.from({ length: 101 }, (_, index) => `docs/source-${String(index).padStart(3, '0')}.md`);
  await Promise.all(files.map((file) => fs.writeFile(path.join(cwd, file), `# ${file}\n\nSource guidance.\n`)));
  const entries = [{ id: 'complete', file: 'knowledge/complete.md', scope: 'workspace', type: 'knowledge', summary: 'Complete' }, { id: 'partial', file: 'knowledge/partial.md', scope: 'workspace', type: 'knowledge', summary: 'Partial' }];
  await fs.writeFile(path.join(root, entries[0].file), `---\nsource_files: [${files[0]}]\n---\nComplete\n`);
  await fs.writeFile(path.join(root, entries[1].file), `---\nsource_files: [${files.join(', ')}]\n---\nPartial\n`);
  const stale = { 'workspace:knowledge/complete.md': [files[0]], 'workspace:knowledge/partial.md': [files[100]] };
  await fs.writeFile(path.join(root, 'stale.json'), JSON.stringify(stale));
  try {
    const plan = await planRefresh({ cwd, roots: { workspace: root }, index: { entries }, ignorePatterns: [] });
    assert.equal(plan.plan.sources.length, 100);
    assert.deepEqual(plan.targets.map((target) => target.id), ['complete']);
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(root, 'stale.json'), 'utf8')), stale);
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('config set persists and validates settings when SQLite is unavailable', async () => {
  const { cwd, env } = await tempWorkspace('engram-config-json-');
  const { setConfigDbUnavailableForTests } = await import('../../dist/core/config-db/schema.js');
  const { cmdConfig } = await import('../../dist/commands/config-cmd.js');
  const { loadConfig } = await import('../../dist/core/runtime/config.js');
  const previous = process.cwd();
  const previousConfig = process.env.ENGRAM_CONFIG_DIR;
  process.chdir(cwd);
  process.env.ENGRAM_CONFIG_DIR = env.ENGRAM_CONFIG_DIR;
  setConfigDbUnavailableForTests(true);
  try {
    const output = await cmdConfig(['set', 'hooks.path_rules', 'hook']);
    assert.match(output, /User config set/);
    assert.equal((await loadConfig(cwd)).hooks.path_rules, 'hook');
    await cmdConfig(['set', 'memory.include_author_email', 'true']);
    assert.equal((await loadConfig(cwd)).memory.include_author_email, true);
    await assert.rejects(cmdConfig(['set', 'bogus.key', 'value']), /unknown config key/);
  } finally {
    setConfigDbUnavailableForTests(false);
    process.chdir(previous);
    if (previousConfig === undefined) delete process.env.ENGRAM_CONFIG_DIR;
    else process.env.ENGRAM_CONFIG_DIR = previousConfig;
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('refresh drops intentionally rejected empty sources while keeping the stale memory eligible', async () => {
  const { cwd } = await tempWorkspace('engram-refresh-empty-');
  const root = workspaceMemoryRoot(cwd);
  await fs.mkdir(path.join(root, 'knowledge'), { recursive: true });
  await fs.mkdir(path.join(cwd, 'docs'));
  await fs.writeFile(path.join(cwd, 'docs/valid.md'), '# Valid\n\nUse the billing ledger.\n');
  await fs.writeFile(path.join(cwd, 'docs/empty.md'), '   \n');
  const entry = { id: 'billing', file: 'knowledge/billing.md', scope: 'workspace', type: 'knowledge', summary: 'Billing' };
  await fs.writeFile(path.join(root, entry.file), '---\nsource_files: [docs/valid.md, docs/empty.md]\n---\nBilling\n');
  await fs.writeFile(path.join(root, 'stale.json'), JSON.stringify({ 'workspace:knowledge/billing.md': ['docs/empty.md'] }));
  try {
    const plan = await planRefresh({ cwd, roots: { workspace: root }, index: { entries: [entry] }, ignorePatterns: [] });
    assert.equal(plan.targets.length, 1);
    assert.deepEqual(plan.targets[0].source.sourceFiles, ['docs/valid.md']);
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});
