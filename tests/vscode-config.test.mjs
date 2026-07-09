import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

test('VS Code website tasks use pnpm commands', async () => {
  const root = path.resolve('.');
  const launchPath = path.join(root, '.vscode', 'launch.json');
  const tasksPath = path.join(root, '.vscode', 'tasks.json');

  try {
    await Promise.all([access(launchPath), access(tasksPath)]);
  } catch {
    test.skip('VS Code config is not present in this environment');
    return;
  }

  const launch = JSON.parse(await readFile(launchPath, 'utf8'));
  const tasks = JSON.parse(await readFile(tasksPath, 'utf8'));

  assert.equal(launch.configurations[0].cwd, '${workspaceFolder}/website');
  assert.equal(launch.configurations[0].command, 'pnpm start');

  const startTask = tasks.tasks.find((task) => task.label === 'Start Docusaurus Dev Server');
  const buildTask = tasks.tasks.find((task) => task.label === 'Build Docusaurus (Fast, EN only)');

  assert.equal(startTask?.command, 'pnpm start');
  assert.equal(buildTask?.command, 'pnpm build:fast');
});
