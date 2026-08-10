import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (file) => readFile(file, 'utf8');

test('README exposes safe configuration upgrade and Git author workflows', async () => {
  const readme = await read('README.md');
  for (const token of [
    'engram upgrade --latest --plan',
    'engram upgrade --latest',
    'engram author show',
    'engram author set --name',
    'engram author sync-git-global --confirm'
  ]) assert.ok(readme.includes(token), token);
});

test('canonical configuration upgrade docs cover shared inventory, kind tabs, copy action, and vector degradation', async () => {
  const doc = await read('website/docs/operations/configuration-upgrades.md');
  for (const token of [
    'workspace', 'global', 'memory', 'instruction', 'skillset', 'config', 'hook', 'plugin',
    'fingerprint', 'transaction', 'backup', 'rollback', 'conflict', 'user edits',
    'memory_vectors', 'BigInt', 'degraded', 'Web UI', 'engram upgrade --latest --plan', 'engram upgrade --help',
    '`All`', '`Config`', '`Instructions`', '`Memories`', '`Skillsets`', '`Hooks`', '`Plugins`',
    'copy command', 'grouped by artifact kind'
  ]) assert.ok(doc.includes(token), token);
});

test('canonical Git docs cover identity precedence, Global Git configuration, and explicit sync', async () => {
  const doc = await read('website/docs/operations/git-author-settings.md');
  for (const token of [
    'author_name', 'author_email', 'workspace', 'global', 'Git fallback',
    'GIT_AUTHOR_NAME', 'GIT_AUTHOR_EMAIL', 'engram author show',
    'engram author sync-git-global --confirm', 'engram author migrate-memories --help',
    'Settings → Git', 'Global Git configuration', 'global_git.enabled', 'global_git.branch',
    'only in the Global tab'
  ]) assert.ok(doc.includes(token), token);  assert.ok(!doc.includes('Settings → Git Author'));
});

test('current docs sidebar links both operation guides', async () => {
  const sidebar = await read('website/sidebars.ts');
  assert.ok(sidebar.includes('operations/configuration-upgrades'));
  assert.ok(sidebar.includes('operations/git-author-settings'));
});

test('troubleshooting documents sqlite-vec primary key compatibility failure', async () => {
  const doc = await read('website/docs/operations/troubleshooting.md');
  assert.ok(doc.includes('Only integers are allowed for primary key values on memory_vectors'));
  assert.ok(doc.includes('BigInt'));
  assert.ok(doc.includes('degraded'));
});


test('Construct docs route Global Git configuration to the Git tab', async () => {
  const doc = await read('website/docs/entry/construct.md');
  assert.ok(doc.includes('Git → Global'));
  assert.ok(doc.includes('Global Git configuration'));
  assert.ok(!doc.includes('## Global Git group'));
});
