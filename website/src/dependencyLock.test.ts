import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const lockfile = readFileSync(resolve(import.meta.dirname, '../pnpm-lock.yaml'), 'utf8');

describe('dependency lockfile security overrides', () => {
  it('does not keep vulnerable serialize-javascript resolution', () => {
    assert.doesNotMatch(lockfile, /serialize-javascript@6\.0\.2:/);
  });

  it('does not keep vulnerable uuid resolution', () => {
    assert.doesNotMatch(lockfile, /uuid@8\.3\.2:/);
  });
});
