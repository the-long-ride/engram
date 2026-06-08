import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

test('npm package preview includes README metadata and file', async () => {
  const root = path.resolve('.');
  const manifest = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  const readme = await readFile(path.join(root, 'README.md'), 'utf8');
  assert.match(readme, /^# Engram/m);
  assert.ok(readme.length > 1000);
  assert.ok(manifest.files.includes('README.md'));

  const cache = await mkdtemp(path.join(os.tmpdir(), 'engram-npm-cache-'));
  try {
    const npmArgs = ['pack', '--dry-run', '--json', '--ignore-scripts', '--cache', cache];
    const command = process.env.npm_execpath ? process.execPath : 'npm';
    const args = process.env.npm_execpath ? [process.env.npm_execpath, ...npmArgs] : npmArgs;
    const preview = spawnSync(command, args, {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 2 * 1024 * 1024
    });
    assert.ifError(preview.error);
    assert.equal(preview.status, 0, preview.stderr);
    const [pack] = JSON.parse(preview.stdout);
    assert.equal(pack.name, manifest.name);
    assert.equal(pack.version, manifest.version);
    const files = new Map(pack.files.map((file) => [file.path, file]));
    assert.ok(files.has('README.md'));
    assert.ok(files.get('README.md').size > 1000);
  } finally {
    await rm(cache, { recursive: true, force: true });
  }
});
