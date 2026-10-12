import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { runEngram, tempWorkspace, workspaceMemoryRoot } from '../helpers.mjs';
import { testMemory } from './fixtures.mjs';

test('agent load output never carries CRLF line endings from a Windows checkout', async () => {
  const { cwd, env } = await tempWorkspace('engram-crlf-render-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  const dir = path.join(workspaceMemoryRoot(cwd), 'knowledge');
  await mkdir(dir, { recursive: true });
  const body = testMemory({ id: 'pnpm-install-root', tags: ['pnpm', 'install'], content: '- Run pnpm install from the repository root.\n- Never use npm here.' });
  await writeFile(path.join(dir, 'pnpm-install-root.md'), body.replace(/\r?\n/g, '\r\n'));
  await runEngram(cwd, env, ['rehash']);
  await runEngram(cwd, env, ['rebuild-index']);
  const loaded = await runEngram(cwd, env, ['load', 'pnpm install']);
  assert.equal(loaded.code, 0, loaded.stderr);
  assert.match(loaded.stdout, /Run pnpm install from the repository root/);
  assert.doesNotMatch(loaded.stdout, /\r/);
});
