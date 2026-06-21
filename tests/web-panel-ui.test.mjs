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
