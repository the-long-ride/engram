import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(rel) {
  return readFile(new URL('../' + rel, import.meta.url), 'utf8');
}

test('website footer copyright component preserves three mobile lines', async () => {
  const component = await read('website/src/theme/Footer/Copyright/index.tsx');
  const css = await read('website/src/css/custom.css');

  assert.ok(component.includes('footer__copyright-shell'));
  assert.ok(component.includes('footer__copyright-line footer__copyright-line--meta'));
  assert.ok(component.includes('footer__copyright-line footer__copyright-line--links'));
  assert.ok(component.includes('footer__copyright-line footer__copyright-line--npm'));
  assert.ok(component.includes('footer__copyright-sep'));
  assert.ok(component.includes('footer__copyright-npm-logo'));

  assert.ok(css.includes('@media (max-width: 768px)'));
  assert.ok(css.includes('.footer__copyright-shell {'));
  assert.ok(css.includes('.footer__copyright-line {'));
  assert.ok(css.includes('.footer__copyright-line--links {'));
  assert.ok(css.includes('.footer__copyright-line--npm {'));
  assert.ok(css.includes('.footer__copyright-shell > .footer__copyright-line {'));
  assert.ok(css.includes('display: block;'));
  assert.ok(css.includes('width: 100%;'));
  assert.ok(css.includes('.footer__copyright-line--npm .footer__copyright-sep {'));
});

test('website footer keeps copyright content on one desktop row', async () => {
  const css = await read('website/src/css/custom.css');

  assert.ok(css.includes('@media (min-width: 769px)'));
  assert.ok(css.includes('flex-direction: row;'));
  assert.ok(css.includes('flex-wrap: nowrap;'));
  assert.ok(css.includes('white-space: nowrap;'));
  assert.ok(css.includes('.footer__copyright-line--meta::after'));
});
