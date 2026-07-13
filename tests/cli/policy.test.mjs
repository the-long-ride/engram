import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { runEngram, tempWorkspace } from '../helpers.mjs';

test('policy defaults deny autosave and init writes local policy', async () => {
  const { cwd, env } = await tempWorkspace('engram-policy-default-');
  const denied = await runEngram(cwd, env, ['autosave', '--policy', '--json', 'TYPE: knowledge | TEXT: durable fact']);
  assert.equal(denied.code, 0);
  assert.equal(JSON.parse(denied.stdout).data.status, 'denied');
  const missingStrict = await runEngram(cwd, env, ['policy', 'validate', '--strict', '--json']);
  assert.equal(missingStrict.code, 5);
  assert.equal(JSON.parse(missingStrict.stdout).ok, false);
  const initialized = await runEngram(cwd, env, ['policy', 'init', '--json']);
  assert.equal(initialized.code, 0);
  const policy = JSON.parse(await readFile(path.join(cwd, '.agents', 'engram.policy.json'), 'utf8'));
  assert.equal(policy.autonomous_writes.enabled, false);
  await runEngram(cwd, env, ['policy', 'validate', '--json']);
  const strict = await runEngram(cwd, env, ['policy', 'validate', '--strict', '--json']);
  assert.equal(strict.code, 0);
  assert.equal(JSON.parse(strict.stdout).ok, true);
});

test('invalid policy fails closed and dry-run never writes memory', async () => {
  const { cwd, env } = await tempWorkspace('engram-policy-invalid-');
  const file = path.join(cwd, '.agents', 'engram.policy.json');
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify({ version: 99 }, null, 2));
  const result = await runEngram(cwd, env, ['autosave', '--policy', '--dry-run', '--json', 'TYPE: knowledge | TEXT: should not write']);
  assert.equal(result.code, 0);
  const body = JSON.parse(result.stdout);
  assert.equal(body.data.status, 'denied');
  assert.match(body.data.reason, /invalid/i);
  const validation = await runEngram(cwd, env, ['policy', 'validate', '--json']);
  assert.equal(validation.code, 5);
  assert.equal(JSON.parse(validation.stdout).ok, false);
});

test('policy quota audits writes and exposes archive rollback', async () => {
  const { cwd, env } = await tempWorkspace('engram-policy-audit-');
  const init = await runEngram(cwd, env, ['inject', '--no-skillset']);
  assert.equal(init.code, 0, init.stderr);
  const policyFile = path.join(cwd, '.agents', 'engram.policy.json');
  await mkdir(path.dirname(policyFile), { recursive: true });
  await writeFile(policyFile, JSON.stringify({
    version: 1,
    autonomous_writes: { enabled: true, mode: 'autonomous', allowed_types: ['knowledge'], allowed_scopes: ['workspace'], allowed_sources: ['autosave'], confidence_threshold: 'high', daily_limit: 1, rollback_retention_days: 30 },
    review: { max_rule_lines: 100, benchmark_min_recall_at_k: 0.9 }
  }, null, 2));
  const first = await runEngram(cwd, env, ['autosave', '--policy', '--scope', 'workspace', '--skip-task-type-prompt', '--json', 'TYPE: knowledge | CONFIDENCE: high | TEXT: policy audit durable fact']);
  assert.equal(first.code, 0, first.stderr);
  const firstBody = JSON.parse(first.stdout);
  assert.equal(firstBody.data.status, 'written');
  const knowledgeFiles = (await readdir(path.join(cwd, '.agents', '.engram', 'knowledge'))).filter((file) => file.endsWith('.md'));
  assert.equal(knowledgeFiles.length, 1);
  const savedContent = await readFile(path.join(cwd, '.agents', '.engram', 'knowledge', knowledgeFiles[0]), 'utf8');
  assert.doesNotMatch(savedContent, /--scope workspace/);
  assert.match(savedContent, /policy audit durable fact/);
  assert.match(firstBody.data.rollback, /policy rollback autosave-/);
  const second = await runEngram(cwd, env, ['autosave', '--policy', '--scope', 'workspace', '--skip-task-type-prompt', '--json', 'TYPE: knowledge | CONFIDENCE: high | TEXT: second fact blocked by quota']);
  assert.equal(JSON.parse(second.stdout).data.status, 'denied');
  assert.match(JSON.parse(second.stdout).data.reason, /quota/i);
  const rollback = await runEngram(cwd, env, ['policy', 'rollback', firstBody.data.audit_id, '--json']);
  assert.equal(rollback.code, 0, rollback.stderr);
  assert.equal(JSON.parse(rollback.stdout).data.rolled_back, firstBody.data.audit_id);
  const audit = await runEngram(cwd, env, ['policy', 'audit', '--json']);
  assert.equal(audit.code, 0, audit.stderr);
  const auditBody = JSON.parse(audit.stdout);
  assert.ok(auditBody.data.records.some((record) => record.id === firstBody.data.audit_id));
  assert.doesNotMatch(audit.stdout, /policy audit durable fact/);
});

test('policy enforces mandatory metadata and rule length', async () => {
  const { cwd, env } = await tempWorkspace('engram-policy-metadata-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  const file = path.join(cwd, '.agents', 'engram.policy.json');
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify({
    version: 1,
    autonomous_writes: { enabled: true, mode: 'autonomous', allowed_types: ['rule'], allowed_scopes: ['workspace'], allowed_sources: ['autosave'], confidence_threshold: 'high', daily_limit: 5, rollback_retention_days: 30 },
    review: { max_rule_lines: 1, benchmark_min_recall_at_k: 0.9, mandatory_metadata: { context: true, triggers: true, role: true } }
  }));
  const denied = await runEngram(cwd, env, ['autosave', '--policy', '--scope', 'workspace', '--skip-task-type-prompt', '--json', 'TYPE: rule | CONFIDENCE: high | TEXT: line one\nline two']);
  assert.equal(denied.code, 0);
  assert.match(JSON.parse(denied.stdout).data.reason, /mandatory metadata|max_rule_lines/i);
});

test('autosave defers implicit updates until an explicit UPDATE target is supplied', async () => {
  const { cwd, env } = await tempWorkspace('engram-policy-duplicate-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', 'Stable release checklist'], 'A\n');
  const policyFile = path.join(cwd, '.agents', 'engram.policy.json');
  await mkdir(path.dirname(policyFile), { recursive: true });
  await writeFile(policyFile, JSON.stringify({
    version: 1,
    autonomous_writes: { enabled: true, mode: 'autonomous', allowed_types: ['knowledge'], allowed_scopes: ['workspace'], allowed_sources: ['autosave'], confidence_threshold: 'high', daily_limit: 5, rollback_retention_days: 30 },
    review: { max_rule_lines: 100, benchmark_min_recall_at_k: 0.9 }
  }));
  const result = await runEngram(cwd, env, ['autosave', '--policy', '--scope', 'workspace', '--json', 'TYPE: knowledge | CONFIDENCE: high | TEXT: Stable release checklist']);
  assert.equal(result.code, 0);
  const body = JSON.parse(result.stdout);
  assert.equal(body.data.status, 'deferred');
  assert.match(body.data.reason, /explicit UPDATE/i);
});

test('autosave enforces the configured confidence threshold', async () => {
  const { cwd, env } = await tempWorkspace('engram-policy-confidence-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  const policyFile = path.join(cwd, '.agents', 'engram.policy.json');
  await mkdir(path.dirname(policyFile), { recursive: true });
  await writeFile(policyFile, JSON.stringify({
    version: 1,
    autonomous_writes: { enabled: true, mode: 'autonomous', allowed_types: ['knowledge'], allowed_scopes: ['workspace'], allowed_sources: ['autosave'], confidence_threshold: 'high', daily_limit: 5, rollback_retention_days: 30 },
    review: { max_rule_lines: 100, benchmark_min_recall_at_k: 0.9 }
  }));
  const result = await runEngram(cwd, env, ['autosave', '--policy', '--scope', 'workspace', '--skip-task-type-prompt', '--json', 'TYPE: knowledge | CONFIDENCE: medium | TEXT: uncertain fact']);
  assert.equal(result.code, 0);
  assert.equal(JSON.parse(result.stdout).data.status, 'denied');
  assert.match(JSON.parse(result.stdout).data.reason, /confidence/i);
});

test('autosave preserves the exact approved candidate metadata and target', async () => {
  const { cwd, env } = await tempWorkspace('engram-policy-exact-plan-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', 'Autosave target baseline'], 'A\n');
  await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', 'Autosave dependency baseline'], 'A\n');
  const policyFile = path.join(cwd, '.agents', 'engram.policy.json');
  await writeFile(policyFile, JSON.stringify({
    version: 1,
    autonomous_writes: { enabled: true, mode: 'autonomous', allowed_types: ['knowledge'], allowed_scopes: ['workspace'], allowed_sources: ['autosave'], confidence_threshold: 'medium', daily_limit: 5, rollback_retention_days: 30 },
    review: { max_rule_lines: 100, benchmark_min_recall_at_k: 0.9 }
  }));
  const result = await runEngram(cwd, env, [
    'autosave', '--policy', '--scope', 'workspace', '--skip-task-type-prompt', '--json',
    'TYPE: knowledge | TEXT: Autosave target baseline gains exact metadata. | CONFIDENCE: medium | ORIGIN: approved automation source | TRIGGERS: exact-plan, metadata | DEPENDS_ON: autosave-dependency-baseline | UPDATE: autosave-target-baseline'
  ]);
  assert.equal(result.code, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).data.status, 'written');
  const saved = await readFile(path.join(cwd, '.agents', '.engram', 'knowledge', 'autosave-target-baseline.md'), 'utf8');
  assert.match(saved, /^confidence: medium$/m);
  assert.match(saved, /^source: autosave$/m);
  assert.match(saved, /^triggers: \[exact-plan, metadata\]$/m);
  assert.match(saved, /^depends_on: \[autosave-dependency-baseline\]$/m);
  assert.match(saved, /approved automation source/);
});

test('autosave fails closed for missing or invalid confidence', async () => {
  const { cwd, env } = await tempWorkspace('engram-policy-confidence-closed-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  const policyFile = path.join(cwd, '.agents', 'engram.policy.json');
  await writeFile(policyFile, JSON.stringify({
    version: 1,
    autonomous_writes: { enabled: true, mode: 'autonomous', allowed_types: ['knowledge'], allowed_scopes: ['workspace'], allowed_sources: ['autosave'], confidence_threshold: 'high', daily_limit: 5, rollback_retention_days: 30 },
    review: { max_rule_lines: 100, benchmark_min_recall_at_k: 0.9 }
  }));
  const missing = await runEngram(cwd, env, ['autosave', '--policy', '--scope', 'workspace', '--skip-task-type-prompt', '--json', 'TYPE: knowledge | TEXT: no confidence supplied']);
  assert.equal(missing.code, 0, missing.stderr);
  assert.equal(JSON.parse(missing.stdout).data.status, 'denied');
  const invalid = await runEngram(cwd, env, ['autosave', '--policy', '--scope', 'workspace', '--skip-task-type-prompt', '--json', 'TYPE: knowledge | CONFIDENCE: certain | TEXT: invalid confidence supplied']);
  assert.notEqual(invalid.code, 0);
  assert.match(invalid.stderr || invalid.stdout, /confidence/i);
});

test('autosave rejects an explicit UPDATE target that does not exist', async () => {
  const { cwd, env } = await tempWorkspace('engram-policy-update-target-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', 'Existing autosave target remains unchanged'], 'A\n');
  const target = path.join(cwd, '.agents', '.engram', 'knowledge', 'existing-autosave-target-remains-unchanged.md');
  const before = await readFile(target, 'utf8');
  await writeFile(path.join(cwd, '.agents', 'engram.policy.json'), JSON.stringify({
    version: 1,
    autonomous_writes: { enabled: true, mode: 'autonomous', allowed_types: ['knowledge'], allowed_scopes: ['workspace'], allowed_sources: ['autosave'], confidence_threshold: 'high', daily_limit: 5, rollback_retention_days: 30 },
    review: { max_rule_lines: 100, benchmark_min_recall_at_k: 0.9 }
  }));
  const result = await runEngram(cwd, env, ['autosave', '--policy', '--scope', 'workspace', '--json', 'TYPE: knowledge | CONFIDENCE: high | TEXT: Existing autosave target remains unchanged with new text | UPDATE: missing-target']);
  assert.notEqual(result.code, 0);
  assert.match(result.stderr || result.stdout, /UPDATE target not found/i);
  assert.equal(await readFile(target, 'utf8'), before);
});

test('policy rollback restores an autonomously updated memory', async () => {
  const { cwd, env } = await tempWorkspace('engram-policy-update-rollback-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', 'Rollback update baseline'], 'A\n');
  const target = path.join(cwd, '.agents', '.engram', 'knowledge', 'rollback-update-baseline.md');
  const before = await readFile(target, 'utf8');
  await writeFile(path.join(cwd, '.agents', 'engram.policy.json'), JSON.stringify({
    version: 1,
    autonomous_writes: { enabled: true, mode: 'autonomous', allowed_types: ['knowledge'], allowed_scopes: ['workspace'], allowed_sources: ['autosave'], confidence_threshold: 'high', daily_limit: 5, rollback_retention_days: 30 },
    review: { max_rule_lines: 100, benchmark_min_recall_at_k: 0.9 }
  }));
  const update = await runEngram(cwd, env, ['autosave', '--policy', '--scope', 'workspace', '--skip-task-type-prompt', '--json', 'TYPE: knowledge | CONFIDENCE: high | TEXT: Rollback update baseline now has autonomous detail. | UPDATE: rollback-update-baseline']);
  assert.equal(update.code, 0, update.stderr);
  const auditId = JSON.parse(update.stdout).data.audit_id;
  assert.notEqual(await readFile(target, 'utf8'), before);
  const rollback = await runEngram(cwd, env, ['policy', 'rollback', auditId, '--json']);
  assert.equal(rollback.code, 0, rollback.stderr);
  assert.equal(await readFile(target, 'utf8'), before);
});

test('policy init honors an explicit policy path', async () => {
  const { cwd, env } = await tempWorkspace('engram-policy-custom-init-');
  const result = await runEngram(cwd, env, ['policy', 'init', '--policy', 'config/team-policy.json', '--json']);
  assert.equal(result.code, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.data.path, path.join(cwd, 'config', 'team-policy.json'));
  const policy = JSON.parse(await readFile(path.join(cwd, 'config', 'team-policy.json'), 'utf8'));
  assert.equal(policy.version, 1);
});
