# Agent Hook Proof Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a configurable per-response Engram proof signal so supported agent hooks can show whether Engram memory was loaded, reused, or skipped on each eligible turn.

**Architecture:** Keep `set-read` semantics unchanged and introduce a separate proof setting. The hook runtime will compute a compact proof status on every eligible event and append it to `additionalContext`, while only injecting full routed memory when existing `set-read` behavior says to do so.

**Tech Stack:** TypeScript, Node.js CLI, Node test runner, Markdown docs/help.

---

### Task 1: Add failing CLI tests for proof configuration

**Files:**
- Modify: `tests/cli/admin.test.mjs`
- Modify: `tests/cli.test.mjs` if command coverage snapshots require it
- Modify: `src/commands/admin.ts`

- [ ] **Step 1: Write the failing test**

```javascript
test('set-proof configures per-response proof behavior', async () => {
  const { cwd, env } = await tempWorkspace('engram-proof-');
  await runEngram(cwd, env, ['init', '--no-skillset']);

  const status = await runEngram(cwd, env, ['set-proof', 'status']);
  assert.match(status.stdout, /Proof behavior: off/);

  const set = await runEngram(cwd, env, ['set-proof', 'compact']);
  assert.match(set.stdout, /Proof behavior: compact/);

  const bad = await runEngram(cwd, env, ['set-proof', 'verbose']);
  assert.ok(bad.code !== 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/cli/admin.test.mjs`
Expected: FAIL with `set-proof` command not found or unsupported behavior.

- [ ] **Step 3: Write minimal implementation**

```typescript
export async function cmdSetProof(args: string[]): Promise<string> {
  const ctx = await getContext();
  const value = (args[0] ?? 'status').toLowerCase();
  if (value === 'status') return proofStatus(ctx.config.proof);
  if (!['off', 'compact'].includes(value)) {
    throw new Error('set-proof expects off, compact, or status');
  }
  ctx.config.proof = value as 'off' | 'compact';
  await writeConfig(process.cwd(), ctx.config);
  return proofStatus(ctx.config.proof);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/cli/admin.test.mjs`
Expected: PASS for the new `set-proof` case.

- [ ] **Step 5: Commit**

```bash
git add tests/cli/admin.test.mjs src/commands/admin.ts src/cli.ts src/core/runtime/types.ts src/core/runtime/config.ts
git commit -m "feat: add proof visibility config"
```

### Task 2: Add failing hook runtime tests for per-turn proof output

**Files:**
- Modify: `tests/cli/agent-hooks.test.mjs`
- Modify: `src/core/integrations/agent-hook-runtime.ts`

- [ ] **Step 1: Write the failing tests**

```javascript
function proofLine(output) {
  return additionalContext(output).split('\n').find((line) => line.startsWith('Engram proof:')) ?? '';
}

test('agent-hook emits compact proof for loaded reused and skipped turns', async () => {
  const { cwd, env } = await tempWorkspace('engram-agent-hook-proof-');
  await runEngram(cwd, env, ['init', '--no-skillset']);
  await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', 'Auth tokens refresh before expiry'], 'A\n');
  await runEngram(cwd, env, ['set-proof', 'compact']);
  await runEngram(cwd, env, ['set-read', 'auto']);

  const first = await hookJson(cwd, env, ['agent-hook', '--host', 'codex'], {
    hook_event_name: 'UserPromptSubmit',
    session_id: 'p1',
    cwd,
    prompt: 'auth token work'
  });
  assert.match(proofLine(first), /loaded 1\/1/i);

  const repeat = await hookJson(cwd, env, ['agent-hook', '--host', 'codex'], {
    hook_event_name: 'UserPromptSubmit',
    session_id: 'p1',
    cwd,
    prompt: 'auth token work'
  });
  assert.match(proofLine(repeat), /reused prior Engram context/i);

  await runEngram(cwd, env, ['set-read', 'manual']);
  const manual = await hookJson(cwd, env, ['agent-hook', '--host', 'codex'], {
    hook_event_name: 'UserPromptSubmit',
    session_id: 'p2',
    cwd,
    prompt: 'auth token work'
  });
  assert.match(proofLine(manual), /no Engram load this turn \(read mode manual\)/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/cli/agent-hooks.test.mjs`
Expected: FAIL because no proof line is emitted yet.

- [ ] **Step 3: Write minimal implementation**

```typescript
type ProofMode = 'off' | 'compact';
type HookDecision = 'loaded' | 'reused' | 'skipped';

type HookProof = {
  mode: ProofMode;
  decision: HookDecision;
  readMode: EngramConfig['read'];
  selectedCount: number;
  relatedCount: number;
  reason: string;
  signature: string;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/cli/agent-hooks.test.mjs`
Expected: PASS with proof lines present on loaded, reused, and skipped turns.

- [ ] **Step 5: Commit**

```bash
git add tests/cli/agent-hooks.test.mjs src/core/integrations/agent-hook-runtime.ts
git commit -m "feat: emit per-turn agent hook proof"
```

### Task 3: Wire command/help/completion surfaces for the new proof setting

**Files:**
- Modify: `src/cli.ts`
- Modify: `src/core/cli/command-registry.ts`
- Modify: `src/core/cli/help-topics.ts`
- Modify: `src/core/cli/completion.ts`

- [ ] **Step 1: Write the failing test**

```javascript
const help = await runEngram(cwd, env, ['help', 'set-proof']);
assert.match(help.stdout, /Configure whether supported hooks append Engram proof/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/cli/admin.test.mjs tests/cli/completion-help.test.mjs`
Expected: FAIL because `set-proof` is missing from dispatch/help/completion.

- [ ] **Step 3: Write minimal implementation**

```typescript
case 'set-proof': return await cmdSetProof(rest);
```

```typescript
{ command: 'engram set-proof off|compact|status', alias: 'sp', purpose: 'Configure per-response Engram proof visibility for supported hooks' }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/cli/admin.test.mjs tests/cli/completion-help.test.mjs`
Expected: PASS with the new command documented and completable.

- [ ] **Step 5: Commit**

```bash
git add src/cli.ts src/core/cli/command-registry.ts src/core/cli/help-topics.ts src/core/cli/completion.ts tests/cli/admin.test.mjs tests/cli/completion-help.test.mjs
git commit -m "docs: expose set-proof command surface"
```

### Task 4: Update product docs and changelog

**Files:**
- Modify: `README.md`
- Modify: `docs/AGENT_INTEGRATIONS.md`
- Modify: `docs/SKILLSET_CONTRACT.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Write the failing documentation expectation**

```javascript
assert.match(readmeText, /engram set-proof compact/);
assert.match(contractText, /set-proof off\|compact\|status/);
```

- [ ] **Step 2: Run checks to verify docs are missing**

Run: `rg -n "set-proof|Engram proof" README.md docs/AGENT_INTEGRATIONS.md docs/SKILLSET_CONTRACT.md CHANGELOG.md`
Expected: No matches before the doc update.

- [ ] **Step 3: Write minimal documentation**

```md
Use `engram set-proof compact` when you want supported hooks to append a compact `Engram proof:` line to each eligible response context. Proof visibility reports loaded, reused, or skipped turns without changing `set-read` injection rules.
```

- [ ] **Step 4: Run checks to verify docs updated**

Run: `rg -n "set-proof|Engram proof" README.md docs/AGENT_INTEGRATIONS.md docs/SKILLSET_CONTRACT.md CHANGELOG.md`
Expected: Matches in all intended docs.

- [ ] **Step 5: Commit**

```bash
git add README.md docs/AGENT_INTEGRATIONS.md docs/SKILLSET_CONTRACT.md CHANGELOG.md
git commit -m "docs: document hook proof visibility"
```

### Task 5: Full verification

**Files:**
- Test: `tests/cli/admin.test.mjs`
- Test: `tests/cli/agent-hooks.test.mjs`
- Test: `tests/cli/completion-help.test.mjs`

- [ ] **Step 1: Run focused test suite**

Run: `npm test -- tests/cli/admin.test.mjs tests/cli/agent-hooks.test.mjs tests/cli/completion-help.test.mjs`
Expected: PASS

- [ ] **Step 2: Run repository line checks if touched help/docs formatting paths**

Run: `npm run lint:lines`
Expected: PASS

- [ ] **Step 3: Run broader CLI verification if focused tests pass**

Run: `npm run test:cli`
Expected: PASS

- [ ] **Step 4: Inspect diff before final handoff**

Run: `git diff -- src/commands/admin.ts src/core/integrations/agent-hook-runtime.ts src/core/runtime/types.ts src/core/runtime/config.ts src/core/cli/command-registry.ts src/core/cli/help-topics.ts src/core/cli/completion.ts tests/cli/admin.test.mjs tests/cli/agent-hooks.test.mjs README.md docs/AGENT_INTEGRATIONS.md docs/SKILLSET_CONTRACT.md CHANGELOG.md`
Expected: Only proof-visibility changes and matching docs/tests.

- [ ] **Step 5: Final commit**

```bash
git add src/commands/admin.ts src/core/integrations/agent-hook-runtime.ts src/core/runtime/types.ts src/core/runtime/config.ts src/core/cli/command-registry.ts src/core/cli/help-topics.ts src/core/cli/completion.ts tests/cli/admin.test.mjs tests/cli/agent-hooks.test.mjs README.md docs/AGENT_INTEGRATIONS.md docs/SKILLSET_CONTRACT.md CHANGELOG.md docs/superpowers/plans/2026-06-17-agent-hook-proof-visibility.md
git commit -m "feat: add per-response Engram proof visibility"
```
