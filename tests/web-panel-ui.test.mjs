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

test('panel confirm modal uses Cancel left, Confirm right, Esc cancel, Enter confirm', async () => {
  const panel = await readFile(new URL('../src/core/web/panel.js', import.meta.url), 'utf8');
  assert.match(panel, /function confirmAction\(/);
  assert.match(panel, /event\.key === 'Escape'/);
  assert.match(panel, /event\.key === 'Enter'/);
  assert.match(panel, /data-confirm-cancel/);
  assert.match(panel, /data-confirm-confirm/);
  assert.match(panel, /<button class="btn btn-outline" data-confirm-cancel/);
  assert.match(panel, /<button class="btn btn-primary" data-confirm-confirm/);
});

test('panel routes destructive unlink actions through confirmAction', async () => {
  const panel = await readFile(new URL('../src/core/web/panel.js', import.meta.url), 'utf8');
  assert.match(panel, /async function toggleLink\(path, linked\)/);
  assert.match(panel, /Unlink workspace/);
  assert.match(panel, /await confirmAction\(\{/);
  assert.match(panel, /async function unlinkAgent\(agentId, isGlobal\)/);
  assert.match(panel, /Unlink AI agent/);
  assert.doesNotMatch(panel, /confirm\('/);
});

test('panel UI contains Core tab navigation and refresh functions', async () => {
  const html = await readFile(new URL('../src/core/web/panel.html', import.meta.url), 'utf8');
  assert.match(html, /data-tab="core"/);
  assert.match(html, /id="tab-core"/);
  assert.match(html, /href="\/favicon.svg"/);

  const js = await readFile(new URL('../src/core/web/panel.js', import.meta.url), 'utf8');
  assert.match(js, /function loadCore\(/);
  assert.match(js, /function renderCore\(/);
  assert.match(js, /function refreshCore\(/);
  assert.match(js, /\/api\/core/);

  const css = await readFile(new URL('../src/core/web/panel.css', import.meta.url), 'utf8');
  assert.match(css, /\.core-toolbar/);
  assert.match(css, /\.core-relationship/);
});

test('panel Core tab renders duplicates, relationship line, and copy prompts', async () => {
  const panel = await readFile(new URL('../src/core/web/panel.js', import.meta.url), 'utf8');
  assert.match(panel, /function renderCoreDuplicates\(/);
  assert.match(panel, /function renderCoreRelationship\(/);
  assert.match(panel, /function copyCorePrompt\(/);
  assert.match(panel, /function copyResolvePairPrompt\(/);
  assert.match(panel, /Resolve duplicate memories/);
  assert.match(panel, /Metacognize memory/);
  assert.match(panel, /consume more tokens/);
  assert.match(panel, /profile &lt;-&gt; global &lt;-&gt; workspace/);
});

test('panel JS prepends /engram prefix to copied prompts', async () => {
  const panel = await readFile(new URL('../src/core/web/panel.js', import.meta.url), 'utf8');
  assert.match(panel, /var val = '\/engram ' \+ prompt;/);
  assert.match(panel, /var val = '\/engram ' \+ text;/);
  assert.match(panel, /window\._modalCopyContent = '\/engram ' \+ text;/);
});
