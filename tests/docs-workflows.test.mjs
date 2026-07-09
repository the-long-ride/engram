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

test('test workflow keeps full verification on push changes', async () => {
  const root = path.resolve('.');
  const workflow = await readFile(path.join(root, '.github', 'workflows', 'test.yml'), 'utf8');

  assert.match(workflow, /name: Typecheck\n\s+if: steps\.scope\.outputs\.force == 'true' \|\| steps\.changed\.outputs\.any_changed == 'true'\n\s+run: npm run typecheck/);
  assert.match(workflow, /name: Line check\n\s+if: steps\.scope\.outputs\.force == 'true' \|\| steps\.changed\.outputs\.any_changed == 'true'\n\s+run: npm run lint:lines/);
  assert.match(workflow, /name: Run coverage\n\s+if: steps\.scope\.outputs\.force == 'true' \|\| steps\.changed\.outputs\.any_changed == 'true'\n\s+run: npm run coverage/);
  assert.match(workflow, /name: Run related tests\n\s+if: steps\.scope\.outputs\.force != 'true' && steps\.changed\.outputs\.any_changed == 'true'\n\s+run: npm run test:related -- \$\{\{ steps\.changed\.outputs\.all_changed_files \}\}/);
});
