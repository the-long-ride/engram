import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

test('docs workflows use pnpm for website jobs', async () => {
  const root = path.resolve('.');
  const deployDocs = await readFile(path.join(root, '.github', 'workflows', 'deploy-docs.yml'), 'utf8');
  const docs = await readFile(path.join(root, '.github', 'workflows', 'docs.yml'), 'utf8');

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
