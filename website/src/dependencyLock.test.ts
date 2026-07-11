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
    assert.equal(manifest.dependencies?.['@docusaurus/plugin-content-docs'], '3.10.1');
    assert.equal(manifest.devDependencies?.['@types/react-dom'], '^19.0.0');
    assert.match(lockfile, /'@docusaurus\/plugin-content-docs':\n\s+specifier: 3\.10\.1/);
    assert.match(lockfile, /'@types\/react-dom':\n\s+specifier: \^19\.0\.0/);
  });
});
