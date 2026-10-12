import test from 'node:test';
import assert from 'node:assert/strict';
import { rm, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { runEngram, tempWorkspace } from '../helpers.mjs';

async function put(cwd, rel, body) {
  await mkdir(path.dirname(path.join(cwd, rel)), { recursive: true });
  await writeFile(path.join(cwd, rel), body);
}

const SECRET = 'hunter2-fixture-secret';

test('take-control --kind code guidance shows directory blocks instead of per-file excerpts', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  for (const dir of ['src/api', 'src/core', 'src/web']) {
    for (let i = 0; i < 10; i += 1) {
      await put(cwd, `${dir}/f${i}.ts`, `import { dep } from './dep${i}.js';\nexport function ${dir.split('/')[1]}Fn${i}(input: string, password = "${SECRET}"): string { return input; }\n`);
    }
  }
  await put(cwd, 'CLAUDE.md', '# Team\nAlways run release smoke tests before deploy.\n');
  await put(cwd, 'config/app.json', JSON.stringify({ Logging: { Level: 'x' } }));
  const result = await runEngram(cwd, env, ['take-control', '--kind', 'all', '--dry-run']);
  assert.equal(result.code, 0, result.stderr);
  const headings = result.stdout.split('\n').filter((line) => line.startsWith('## '));
  assert.deepEqual(headings, ['## src/api (10 files)', '## src/core (10 files)', '## src/web (10 files)']);
  assert.match(result.stdout, /### CLAUDE\.md \(/);
  assert.match(result.stdout, /### config\/app\.json \(/);
  assert.doesNotMatch(result.stdout, /### src\//);
  assert.doesNotMatch(result.stdout, new RegExp(SECRET));
  assert.match(result.stdout, /apiFn0/);
  await rm(cwd, { recursive: true, force: true });
});
