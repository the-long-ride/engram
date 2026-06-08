import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

test('npm publish metadata declares a package README', async () => {
  const root = path.resolve('.');
  const manifest = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  const readme = await readFile(path.join(root, 'README.md'), 'utf8');
  assert.match(readme, /^# Engram/m);
  assert.ok(readme.length > 1000);
  assert.ok(manifest.files.includes('README.md'));
  assert.equal(manifest.files.filter((file) => file === 'README.md').length, 1);
});
