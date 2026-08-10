import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ensureGlobalGit, git, gitCommitGlobal } from '../../dist/core/vcs/git.js';

test('Engram Git commits use resolved author without changing local config', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'engram-author-commit-'));
  await ensureGlobalGit(root, 'main');
  await writeFile(path.join(root, 'README.md'), '# Memory\n');
  await gitCommitGlobal(
    root,
    'test identity',
    { enabled: true, remote: 'origin', branch: 'main', auto_sync: false, auto_resolve: true },
    async () => 0,
    { cwd: root, author: { name: 'Workspace User', email: 'workspace@example.com', source: 'workspace', complete: true } }
  );
  assert.equal((await git(['-C', root, 'show', '-s', '--format=%an', 'HEAD'])).trim(), 'Workspace User');
  assert.equal((await git(['-C', root, 'show', '-s', '--format=%ae', 'HEAD'])).trim(), 'workspace@example.com');
  assert.equal((await git(['-C', root, 'show', '-s', '--format=%cn', 'HEAD'])).trim(), 'Workspace User');
  assert.equal((await git(['-C', root, 'show', '-s', '--format=%ce', 'HEAD'])).trim(), 'workspace@example.com');
  assert.equal((await git(['-C', root, 'config', '--local', '--get', 'user.name']).catch(() => '')).trim(), '');
  assert.equal((await git(['-C', root, 'config', '--local', '--get', 'user.email']).catch(() => '')).trim(), '');
  await rm(root, { recursive: true, force: true });
});

test('Git commit commands are centralized and never hard-code Engram identity', async () => {
  const { readdir, readFile } = await import('node:fs/promises');
  const root = path.resolve('src');
  async function walk(dir) {
    const files = [];
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) files.push(...await walk(full));
      else if (/\.(?:ts|tsx)$/.test(entry.name)) files.push(full);
    }
    return files;
  }
  for (const file of await walk(root)) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(source, /user\.name=Engram|engram@example\.local/, `hard-coded Git identity: ${file}`);
    if (!file.endsWith(path.join('core', 'vcs', 'git.ts')) && !file.endsWith(path.join('core', 'vcs', 'submodule.ts'))) {
      assert.doesNotMatch(source, /['"]commit['"]\s*,\s*['"]-m['"]/, `direct Git commit invocation: ${file}`);
    }
  }
});
