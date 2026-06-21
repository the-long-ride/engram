import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONFIG_FIELDS,
  configFieldsForPanel,
  validateConfigPatch,
  isRiskyConfigKey
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
