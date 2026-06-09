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
  assert.equal(manifest.scripts['test:package'], 'npm run build && node --test tests/publish/*.test.mjs');
  assert.doesNotMatch(manifest.scripts['test:package'], /test-isolation/);
  assert.equal(manifest.scripts.publish, 'npm publish --access public --ignore-scripts');
  assert.equal(manifest.scripts.prepublishOnly, 'npm run test:package');
  assert.equal(manifest.scripts.preinstall, undefined);
  assert.equal(manifest.scripts.install, undefined);
  assert.equal(manifest.scripts.postinstall, undefined);
});
