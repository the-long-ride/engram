import test from 'node:test';
import assert from 'node:assert/strict';
import { relatedTestsForChangedFiles } from '../scripts/run-related-tests.mjs';

test('related test selection covers current workflow and website changes', async () => {
  const selected = await relatedTestsForChangedFiles([
    '.github/workflows/deploy-docs.yml',
    '.github/workflows/docs.yml',
    '.github/workflows/test.yml',
    'package.json',
    'website/src/pages/index.tsx',
    'scripts/run-related-tests.mjs',
    'website/static/img/demo/engram_diagram_dark_transparent.svg',
    'website/static/img/demo/engram_diagram_white_transparent.svg',
  ]);

  assert.deepEqual(selected, [
    'tests/core.test.mjs',
    'tests/docs-workflows.test.mjs',
    'tests/publish/package.test.mjs',
    'tests/website-footer.test.mjs',
    'tests/website-mobile-nav-cleanup.test.mjs',
    'tests/website-mobile-sidebar.test.mjs',
  ]);
});

test('unmapped source or script changes fall back to the full suite', async () => {
  const selected = await relatedTestsForChangedFiles(['src/new-entrypoint.ts']);

  assert.ok(selected.includes('tests/core.test.mjs'));
  assert.ok(selected.includes('tests/cli/admin.test.mjs'));
  assert.ok(selected.includes('tests/app/App.test.tsx'));
});
