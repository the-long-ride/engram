import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(rel) {
  return readFile(new URL('../' + rel, import.meta.url), 'utf8');
}

test('website mobile nav keeps nested-menu back control visible', async () => {
  const css = await read('website/src/css/custom.css');

  assert.ok(css.includes('@media (max-width: 996px)'));
  assert.equal(css.includes('.navbar-sidebar__back {'), false);
});
