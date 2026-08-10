import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { launchEditor, resolveEditorCommand, splitEditorCommand } from '../../dist/core/system/editor.js';

test('editor resolution prefers VISUAL over EDITOR and preserves quoted args', () => {
  const env = { VISUAL: '"C:/Program Files/Editor/editor.exe" --wait "two words"', EDITOR: 'fallback-editor' };
  assert.deepEqual(resolveEditorCommand({ platform: 'win32', env, web: true }), ['C:/Program Files/Editor/editor.exe', '--wait', 'two words']);
  assert.deepEqual(splitEditorCommand("code --reuse-window 'two words'"), ['code', '--reuse-window', 'two words']);
  assert.deepEqual(resolveEditorCommand({ platform: 'linux', env: { EDITOR: 'nano --wait' }, web: true }), ['nano', '--wait']);
});

test('editor web fallbacks are non-terminal platform defaults', () => {
  assert.deepEqual(resolveEditorCommand({ platform: 'win32', env: {}, web: true }), ['notepad.exe']);
  assert.deepEqual(resolveEditorCommand({ platform: 'darwin', env: {}, web: true }), ['open', '-t']);
  assert.deepEqual(resolveEditorCommand({ platform: 'linux', env: {}, web: true }), ['xdg-open']);
  assert.deepEqual(resolveEditorCommand({ platform: 'darwin', env: {}, web: false }), ['open', '-W', '-t']);
  assert.deepEqual(resolveEditorCommand({ platform: 'linux', env: {}, web: false }), ['vi']);
});

test('launchEditor appends the file as a separate argv element without a shell', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'engram-editor-argv-'));
  const record = path.join(root, 'argv.json');
  const script = path.join(root, 'capture.mjs');
  const file = path.join(root, 'file with spaces.md');
  await writeFile(file, 'x');
  await writeFile(script, `import { writeFileSync } from 'node:fs'; writeFileSync(${JSON.stringify(record)}, JSON.stringify(process.argv.slice(2)));`);
  try {
    await launchEditor([process.execPath, script, '--flag'], file, { wait: true, stdio: 'ignore' });
    assert.deepEqual(JSON.parse(await readFile(record, 'utf8')), ['--flag', file]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
