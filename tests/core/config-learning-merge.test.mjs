import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultConfig, mergeConfig } from '../../dist/core/runtime/config.js';

test('mergeConfig deep-merges partial learning objects across layers', () => {
  const withMode = mergeConfig(defaultConfig(), { learning: { mode: 'inbox' } });
  const merged = mergeConfig(withMode, { learning: { auto_drain: true } });

  assert.deepEqual(merged.learning, {
    mode: 'inbox',
    auto_drain: true,
  });
});

test('mergeConfig lets later learning keys override earlier ones while preserving siblings', () => {
  const base = mergeConfig(defaultConfig(), { learning: { mode: 'inbox', auto_drain: false } });
  const merged = mergeConfig(base, { learning: { auto_drain: true } });

  assert.deepEqual(merged.learning, {
    mode: 'inbox',
    auto_drain: true,
  });
});
