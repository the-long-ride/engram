import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(rel) {
  return readFile(new URL('../' + rel, import.meta.url), 'utf8');
}

test('web asset checker uses line budgets for css files', async () => {
  const script = await read('scripts/check-web-assets.mjs');

  assert.ok(script.includes("const cssDir = 'src/core/web';"));
  assert.ok(script.includes('const cssLineBudgetMax = 650;'));
  assert.equal(script.includes("['src/core/web/panel.css', 28000, minifyCss]"), false);
  assert.ok(script.includes("lineCount(source)"));
  assert.ok(script.includes("' lines > '"));
  assert.ok(script.includes("file.endsWith('.css')"));
});
