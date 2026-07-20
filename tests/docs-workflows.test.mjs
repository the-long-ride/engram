import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

test('docs workflows use pnpm for website jobs', async () => {
  const root = path.resolve('.');
  const deployDocs = (await readFile(path.join(root, '.github', 'workflows', 'deploy-docs.yml'), 'utf8')).replace(/\r\n/g, '\n');
  const docs = (await readFile(path.join(root, '.github', 'workflows', 'docs.yml'), 'utf8')).replace(/\r\n/g, '\n');

  for (const workflow of [deployDocs, docs]) {
    assert.match(workflow, /pnpm\/action-setup@v4/);
    assert.match(workflow, /cache: pnpm/);
    assert.match(workflow, /cache-dependency-path: website\/pnpm-lock\.yaml/);
    assert.doesNotMatch(workflow, /package-lock\.json/);
    assert.match(workflow, /run: pnpm install --frozen-lockfile/);
    assert.doesNotMatch(workflow, /run: npm ci/);
  }

  assert.match(deployDocs, /run: pnpm build/);
  assert.match(deployDocs, /run: pnpm check:entry-fields/);
  assert.doesNotMatch(deployDocs, /run: npm run build/);
  assert.doesNotMatch(deployDocs, /run: npm run check:entry-fields/);

  assert.match(docs, /run: pnpm typecheck/);
  assert.match(docs, /run: pnpm build/);
  assert.match(docs, /run: pnpm check:entry-fields/);
  assert.doesNotMatch(docs, /run: npm run typecheck/);
  assert.doesNotMatch(docs, /run: npm run build/);
  assert.doesNotMatch(docs, /run: npm run check:entry-fields/);
});

test('test workflow runs the full suite on pull_request/push and exposes node + os matrix', async () => {
  const root = path.resolve('.');
  const workflow = (await readFile(path.join(root, '.github', 'workflows', 'test.yml'), 'utf8')).replace(/\r\n/g, '\n');

  // paths filter still scopes to relevant changes
  assert.match(workflow, /pull_request:\n\s+paths:\n(?:(?!\n  push:)[\s\S])*?      - 'website\/\*\*'/);
  // The full suite runs unconditionally; the conditional recent-files force/changed gate is gone.
  assert.equal(workflow.includes('steps.scope.outputs.force'), false, 'workflow must drop the force/changed-files gate');
  assert.equal(workflow.includes('steps.changed.outputs.any_changed'), false);
  assert.equal(workflow.includes('Run related tests'), false);
  assert.match(workflow, /name: Run full test suite\n\s+run: npm test/);
  // Node matrix covers declared minimum (>=20) plus the latest CI runtime.
  assert.match(workflow, /node: \[20, 24\]/);
  // Cross-platform smoke matrix
  assert.match(workflow, /os: \[windows-latest, macos-latest\]/);
  // Explicit least permissions at the workflow level
  assert.match(workflow, /^permissions:\n\s+contents: read/m);
  // Schedule full-suite safety net
  assert.match(workflow, /cron: '17 6 \* \* \*'/);
});
