import test from 'node:test';
import assert from 'node:assert/strict';
import { draftMemory } from '../../dist/core/memory/memory-template.js';
import { entryFromMemory, validateMemoryRaw } from '../../dist/core/memory/schema.js';

test('new memories write author_name and author_email only', () => {
  const draft = draftMemory({
    text: 'Prefer deterministic tests.',
    type: 'knowledge',
    scope: 'workspace',
    authorName: 'Jane Doe',
    authorEmail: 'jane@example.com'
  });
  assert.match(draft.content, /^author_name:\s*(?:"Jane Doe"|Jane Doe)$/m);
  assert.match(draft.content, /^author_email:\s*jane@example\.com$/m);
  assert.doesNotMatch(draft.content, /^author:/m);
  assert.doesNotThrow(() => validateMemoryRaw(draft.content));
});

test('legacy author email remains readable without inventing a name', () => {
  const raw = `---\nid: legacy\ntype: knowledge\nscope: workspace\ntags: [legacy]\ncreated: 2025-01-01\nupdated: 2025-01-01\nauthor: old@example.com\nconfidence: medium\n---\n# Legacy\n\n## Content\n\n- Old memory.\n`;
  const entry = entryFromMemory(raw, 'knowledge/legacy.md', 'workspace');
  assert.equal(entry.authorEmail, 'old@example.com');
  assert.equal(entry.legacyAuthorEmail, 'old@example.com');
  assert.equal(entry.authorName, undefined);
});

test('new author metadata must be a complete pair', () => {
  const raw = `---\nschema_version: 3\nid: incomplete\ntype: knowledge\nscope: workspace\ntags: [test]\ncreated: 2025-01-01\nupdated: 2025-01-01\nauthor_name: Jane Doe\nsource: manual\nconfidence: high\nauthority: reference\nrevision: 1\nvalid_from: 2025-01-01\nlast_confirmed: 2025-01-01\n---\n# Incomplete\n\n## Content\n\n- Missing email.\n`;
  assert.throws(() => validateMemoryRaw(raw), /author email/i);
});

test('author email metadata is allowed while body email remains sensitive', async () => {
  const { scanSensitive } = await import('../../dist/core/safety/security.js');
  const metadata = `---\nauthor_name: Jane Doe\nauthor_email: jane@example.com\n---\n# Memory\n\n## Content\n\n- Safe body.\n`;
  assert.deepEqual(scanSensitive(metadata), []);
  const body = `---\nauthor_name: Jane Doe\nauthor_email: jane@example.com\n---\n# Memory\n\n## Content\n\n- Contact jane@example.com.\n`;
  assert.equal(scanSensitive(body).length, 1);
  assert.equal(scanSensitive(body)[0].line, 9);
});

test('save without any author identity leaves memory state unchanged', async () => {
  const { runEngram, tempWorkspace, workspaceMemoryRoot } = await import('../helpers.mjs');
  const { readdir, readFile, rm, mkdtemp } = await import('node:fs/promises');
  const os = await import('node:os');
  const path = await import('node:path');
  const { cwd, env } = await tempWorkspace('engram-author-missing-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  const root = workspaceMemoryRoot(cwd);
  async function snapshot(dir) {
    const tracked = ['rules', 'skills', 'knowledge', 'traces', 'inbox', 'memory.hashes.json', 'memory.index.json', 'changelog.md'];
    const rows = [];
    async function walk(current) {
      for (const entry of await readdir(current, { withFileTypes: true })) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) await walk(full);
        else rows.push([path.relative(dir, full), await readFile(full, 'utf8')]);
      }
    }
    for (const name of tracked) {
      const full = path.join(dir, name);
      try {
        const stat = await import('node:fs/promises').then(({ stat }) => stat(full));
        if (stat.isDirectory()) await walk(full);
        else rows.push([name, await readFile(full, 'utf8')]);
      } catch {}
    }
    return rows.sort(([a], [b]) => a.localeCompare(b));
  }
  const before = await snapshot(root);
  const home = await mkdtemp(path.join(os.tmpdir(), 'engram-no-git-author-'));
  const noAuthor = { ...env, HOME: home, ENGRAM_CONFIG_DIR: path.join(home, 'config'), GIT_CONFIG_COUNT: '0' };
  delete noAuthor.GIT_CONFIG_KEY_0;
  delete noAuthor.GIT_CONFIG_VALUE_0;
  delete noAuthor.GIT_CONFIG_KEY_1;
  delete noAuthor.GIT_CONFIG_VALUE_1;
  const saved = await runEngram(cwd, noAuthor, ['save', 'knowledge', '--scope', 'workspace', '--force', 'Must not be written']);
  assert.notEqual(saved.code, 0);
  assert.match(saved.stderr, /No complete Engram author identity/);
  assert.deepEqual(await snapshot(root), before);
  await rm(cwd, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});
