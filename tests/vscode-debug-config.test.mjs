import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function readJson(rel) {
  const raw = await readFile(new URL('../' + rel, import.meta.url), 'utf8');
  return JSON.parse(raw);
}

test('F5 docs launch uses live dev server instead of static build and serve', async () => {
  const launch = await readJson('.vscode/launch.json');
  const docsConfig = launch.configurations.find(
    (config) => config.name === 'Start Docs Site',
  );

  assert.ok(docsConfig, 'Start Docs Site config should exist');
  assert.equal(docsConfig.type, 'node-terminal');
  assert.equal(docsConfig.command, 'pnpm start');
  assert.notEqual(docsConfig.command, 'pnpm build && pnpm serve');
  assert.equal(docsConfig.cwd, '${workspaceFolder}/website');
});
