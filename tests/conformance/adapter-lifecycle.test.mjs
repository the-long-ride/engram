import test from 'node:test';
import assert from 'node:assert/strict';
import { applyAgentHookAction, detectInstalledHookTargets } from '../../dist/core/integrations/agent-hooks.js';
import { adapterCapabilities } from '../../dist/core/integrations/capabilities.js';
import { tempWorkspace } from '../helpers.mjs';

test('supported adapters install, detect, and unlink managed hooks in a fixture workspace', async () => {
  const { cwd } = await tempWorkspace('engram-adapter-conformance-');
  const supported = adapterCapabilities().filter((row) => row.unlink_cleanup && ['codex', 'claude', 'gemini', 'opencode', 'cursor', 'windsurf'].includes(row.host)).map((row) => row.host);
  const installed = await applyAgentHookAction('install', 'all', { cwd });
  for (const host of supported) assert.match(installed, new RegExp(host), `install must report ${host}`);
  const detected = await detectInstalledHookTargets({ cwd });
  for (const host of supported) assert.ok(detected.includes(host), `detect must find ${host}`);
  const removed = await applyAgentHookAction('uninstall', 'all', { cwd });
  for (const host of supported) assert.match(removed, new RegExp(host), `unlink must report ${host}`);
  assert.equal((await detectInstalledHookTargets({ cwd })).length, 0);
});

test('unsupported hosts remain explicit instead of receiving fake hook support', async () => {
  const { cwd } = await tempWorkspace('engram-adapter-unsupported-');
  const result = await applyAgentHookAction('install', 'all', { cwd });
  assert.match(result, /copilot/);
  assert.match(result, /cline/);
  const rows = adapterCapabilities();
  assert.equal(rows.find((row) => row.host === 'copilot')?.prompt_turn_injection, false);
  assert.equal(rows.find((row) => row.host === 'cline')?.prompt_turn_injection, false);
});
