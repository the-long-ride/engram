import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  CONFIG_FIELDS,
  configFieldsForPanel,
  validateConfigPatch,
  isRiskyConfigKey,
  isKnownConfigKey
} from '../dist/core/web/config-schema.js';

test('config field metadata has unique editable keys', () => {
  const keys = CONFIG_FIELDS.map((field) => field.key);
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(keys.includes('scope'));
  assert.ok(keys.includes('load.limit'));
  assert.ok(keys.includes('global_git.branch'));
  assert.ok(keys.includes('theme'));
});

test('panel metadata hides internal theme field from config editor', () => {
  const fields = configFieldsForPanel();
  assert.ok(fields.some((field) => field.key === 'scope' && field.group === 'Core'));
  assert.equal(fields.some((field) => field.key === 'theme'), false);
});



test('generic config editor cannot mutate author profile keys', () => {
  assert.equal(configFieldsForPanel().some((field) => field.key.startsWith('author.')), false);
  assert.equal(isKnownConfigKey('author.name'), false);
  assert.equal(isKnownConfigKey('author.email'), false);
});

test('every visible config field has a unique explicit docs anchor', () => {
  const visible = configFieldsForPanel();
  const anchors = visible.map((field) => field.docsAnchor);
  assert.ok(anchors.every((anchor) => typeof anchor === 'string' && anchor.length > 0));
  assert.equal(new Set(anchors).size, anchors.length);
  assert.equal(visible.find((field) => field.key === 'global_git.branch')?.docsAnchor, 'global-git-branch');
  assert.equal(CONFIG_FIELDS.find((field) => field.key === 'theme')?.docsAnchor, undefined);
});

test('validateConfigPatch normalizes valid values', () => {
  const result = validateConfigPatch({
    scope: 'global',
    enabled: 'false',
    'load.limit': '16',
    'graph.min_related_score': '0.4',
    roles: 'agent, reviewer'
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.issues, []);
  assert.deepEqual(result.patch, {
    scope: 'global',
    enabled: 'false',
    'load.limit': '16',
    'graph.min_related_score': '0.4',
    roles: '["agent","reviewer"]'
  });
});

test('validateConfigPatch rejects unknown keys and unsafe values', () => {
  const result = validateConfigPatch({
    made_up: 'x',
    scope: 'globals',
    'load.limit': '99',
    roles: 'agent, bad role!'
  });

  assert.equal(result.ok, false);
  assert.match(result.issues.map((issue) => issue.message).join('\n'), /Unknown config key/);
  assert.match(result.issues.map((issue) => issue.message).join('\n'), /scope/);
  assert.match(result.issues.map((issue) => issue.message).join('\n'), /load.limit/);
  assert.match(result.issues.map((issue) => issue.message).join('\n'), /roles/);
  assert.deepEqual(result.patch, {});
});

test('risk classifier protects high-impact settings', () => {
  assert.equal(isRiskyConfigKey('enabled'), true);
  assert.equal(isRiskyConfigKey('scope'), true);
  assert.equal(isRiskyConfigKey('global_git.branch'), true);
  assert.equal(isRiskyConfigKey('encryption.enabled'), true);
  assert.equal(isRiskyConfigKey('read'), false);
});

test('validateConfigPatch rejects roles containing empty role names', () => {
  const result = validateConfigPatch({
    roles: 'agent, , reviewer'
  });
  assert.equal(result.ok, false);
  assert.match(result.issues.map((i) => i.message).join('\n'), /roles cannot contain empty role names/);
});

test('validateConfigPatch validates nonexistent global_path without creating it', () => {
  const tempPath = path.join(process.cwd(), 'temp-test-global-path-dir-12345');
  try { rmSync(tempPath, { recursive: true, force: true }); } catch {}

  const result = validateConfigPatch({
    global_path: tempPath
  });

  assert.equal(result.ok, true);
  assert.equal(existsSync(tempPath), false);

  try { rmSync(tempPath, { recursive: true, force: true }); } catch {}
});

test('validateConfigPatch fails when global_path has a file ancestor', () => {
  const blocker = path.join(process.cwd(), 'temp-test-global-path-file-12345');
  rmSync(blocker, { recursive: true, force: true });
  writeFileSync(blocker, 'not a directory');
  try {
    const result = validateConfigPatch({
      global_path: path.join(blocker, 'child')
    });
    assert.equal(result.ok, false);
    assert.match(result.issues.map((i) => i.message).join('\n'), /Failed to validate/);
  } finally {
    rmSync(blocker, { force: true });
  }
});

test('validateConfigPatch validates global_git.remote_url', () => {
  const valid = validateConfigPatch({
    'global_git.remote_url': 'https://github.com/the-long-ride/engram.git'
  });
  assert.equal(valid.ok, true);

  const invalid = validateConfigPatch({
    'global_git.remote_url': 'not a valid url'
  });
  assert.equal(invalid.ok, false);
  assert.match(invalid.issues.map((i) => i.message).join('\n'), /must be a valid Git remote URL/);
});


