import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(rel) {
  return readFile(new URL('../' + rel, import.meta.url), 'utf8');
}

test('website mobile sidebar forces full viewport drawer height', async () => {
  const css = await read('website/src/css/custom.css');

  assert.ok(css.includes('@media (max-width: 996px)'));
  assert.ok(css.includes('.navbar-sidebar {'));
  assert.ok(css.includes('width: 100vw;'));
  assert.ok(css.includes('max-width: 100vw;'));
  assert.ok(css.includes('height: 100dvh;'));
  assert.ok(css.includes('--ifm-navbar-sidebar-width: 100vw;'));
  assert.ok(css.includes('overflow: hidden;'));
  assert.ok(css.includes('.navbar-sidebar__items {'));
  assert.ok(css.includes('width: 200vw;'));
  assert.ok(css.includes('min-height: 100dvh;'));
  assert.ok(css.includes('.navbar-sidebar__item {'));
  assert.ok(css.includes('min-width: 100vw;'));
  assert.ok(css.includes('.navbar-sidebar__items--show-secondary {'));
  assert.ok(css.includes('transform: translate3d(-100vw, 0, 0);'));
  assert.ok(css.includes('.navbar-sidebar__brand {'));
  assert.ok(css.includes('.navbar-sidebar .menu {'));
});
