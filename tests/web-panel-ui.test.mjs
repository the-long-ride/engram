import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('panel config controls stage changes instead of saving on change', async () => {
  const panel = await readFile(new URL('../src/core/web/panel.js', import.meta.url), 'utf8');
  assert.match(panel, /function changeCfg\(/);
  assert.match(panel, /function openCfgReview\(/);
  assert.match(panel, /function confirmCfgSave\(/);
  assert.doesNotMatch(panel, /onchange="saveCfg/);
  assert.doesNotMatch(panel, /function saveCfg\(/);
});

test('panel shows review modal and risky confirmation copy', async () => {
  const panel = await readFile(new URL('../src/core/web/panel.js', import.meta.url), 'utf8');
  assert.match(panel, /Review config changes/);
  assert.match(panel, /I reviewed risky changes/);
  assert.match(panel, /\/api\/config\/validate/);
});

test('panel css defines correct colors for form inputs and selects', async () => {
  const css = await readFile(new URL('../src/core/web/panel.css', import.meta.url), 'utf8');
  assert.match(css, /\.form-input\s*\{[^}]*color:\s*var\(--g1000\)/);
  assert.match(css, /\.form-select\s*\{[^}]*color:\s*var\(--g1000\)/);
});
