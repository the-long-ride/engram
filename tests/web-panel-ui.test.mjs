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

test('panel css defines full size of parent for sb-logo-icon', async () => {
  const css = await readFile(new URL('../src/core/web/panel.css', import.meta.url), 'utf8');
  assert.match(css, /\.sb-logo-icon\s*\{[^}]*width:\s*100%/);
  assert.match(css, /\.sb-logo-icon\s*\{[^}]*height:\s*100%/);
});

test('panel js includes engram upgrade --latest in cpUpgradeCmd copy string', async () => {
  const panel = await readFile(new URL('../src/core/web/panel.js', import.meta.url), 'utf8');
  assert.match(panel, /engram upgrade --latest/);
});

test('panel js handles default_profile select dropdown options dynamically', async () => {
  const panel = await readFile(new URL('../src/core/web/panel.js', import.meta.url), 'utf8');
  assert.match(panel, /f\.key === 'default_profile'/);
  assert.match(panel, /D\.profiles\.forEach/);
  assert.match(panel, /<option/);
});

test('panel js validates text and number inputs on blur', async () => {
  const panel = await readFile(new URL('../src/core/web/panel.js', import.meta.url), 'utf8');
  assert.match(panel, /onblur="changeCfg\(this\.dataset\.key, this\.value\)"/);
});

test('panel js roles validator rejects empty role names', async () => {
  const panel = await readFile(new URL('../src/core/web/panel.js', import.meta.url), 'utf8');
  assert.match(panel, /roles cannot contain empty role names/);
});

test('panel js dynamically validates global_path on the server in changeCfg', async () => {
  const panel = await readFile(new URL('../src/core/web/panel.js', import.meta.url), 'utf8');
  assert.match(panel, /key === 'global_path'/);
  assert.match(panel, /\/api\/config\/validate/);
});

test('panel UI contains connection tab navigation and functions', async () => {
  const html = await readFile(new URL('../src/core/web/panel.html', import.meta.url), 'utf8');
  assert.match(html, /data-tab="connection"/);
  assert.match(html, /id="tab-connection"/);

  const js = await readFile(new URL('../src/core/web/panel.js', import.meta.url), 'utf8');
  assert.match(js, /function scanAgents\(/);
  assert.match(js, /function renderConnection\(/);
  assert.match(js, /async function linkAgent\(/);
  assert.match(js, /async function unlinkAgent\(/);

  const css = await readFile(new URL('../src/core/web/panel.css', import.meta.url), 'utf8');
  assert.match(css, /\.conn-grid/);
  assert.match(css, /\.conn-card/);
});

