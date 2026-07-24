import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const lockfile = readFileSync(resolve(import.meta.dirname, '../pnpm-lock.yaml'), 'utf8');
const manifest = JSON.parse(
  readFileSync(resolve(import.meta.dirname, '../package.json'), 'utf8'),
) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

describe('dependency lockfile security overrides', () => {
  it('does not keep vulnerable serialize-javascript resolution', () => {
    assert.doesNotMatch(lockfile, /serialize-javascript@6\.0\.2:/);
  });

  it('does not keep vulnerable uuid resolution', () => {
    assert.doesNotMatch(lockfile, /uuid@8\.3\.2:/);
  });

  it('keeps typecheck-only dependencies explicit', () => {
    const pluginVersion = manifest.dependencies?.['@docusaurus/plugin-content-docs'];
    assert.ok(pluginVersion, '@docusaurus/plugin-content-docs missing from package.json');
    const escapedVersion = pluginVersion.replace(/\./g, '\\.');
    assert.match(lockfile, new RegExp(`'@docusaurus\\/plugin-content-docs':\\r?\\n\\s+specifier: ${escapedVersion}`));
    assert.equal(manifest.devDependencies?.['@types/react-dom'], '^19.0.0');
    assert.match(lockfile, /'@types\/react-dom':\r?\n\s+specifier: \^19\.0\.0/);
  });
});
