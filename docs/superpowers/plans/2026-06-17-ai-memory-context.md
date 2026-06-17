# AI Memory Context Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let AI-generated Engram memory candidates include an optional `CONTEXT:` field that explains why the memory exists.

**Architecture:** Extend the existing candidate parser to carry optional context text through the save plan into `draftMemory` and `updateMemory`. Keep `CONTEXT:` optional; when it is missing, the existing deterministic context sentence remains.

**Tech Stack:** TypeScript CLI code, Node test runner, Markdown memory files.

---

### Task 1: Candidate Parsing And Rendering

**Files:**
- Modify: `src/core/memory/memory-candidate.ts`
- Modify: `src/core/memory/memory-template.ts`
- Modify: `src/core/memory/save-plan.ts`
- Modify: `src/commands/write.ts`
- Test: `tests/core.test.mjs`
- Test: `tests/cli/save.test.mjs`

- [ ] **Step 1: Write failing parser tests**

Add assertions that compact and multiline candidates preserve optional context:

```js
const compact = parseMemoryCandidate('TYPE: knowledge | TEXT: Engram remembers project rules. | CONTEXT: Created after the user asked why the rule exists.');
assert.equal(compact.context, 'Created after the user asked why the rule exists.');
```

- [ ] **Step 2: Run parser tests to verify failure**

Run: `node --test tests/core.test.mjs`
Expected: FAIL because `context` is not parsed yet.

- [ ] **Step 3: Write failing save tests**

Add a `save-session --accept-all` case proving `CONTEXT:` appears under `## Context`, and another case proving missing `CONTEXT:` still falls back to the current approved sentence.

- [ ] **Step 4: Run save tests to verify failure**

Run: `node --test tests/cli/save.test.mjs`
Expected: FAIL because saved memories ignore candidate context.

- [ ] **Step 5: Implement minimal parser support**

Extend `MemoryCandidate` with `context?: string`, parse `CONTEXT:` from compact pipe fields and multiline candidates, and include it in the uniqueness key.

- [ ] **Step 6: Implement minimal render support**

Add `context?: string` to memory template inputs and save-plan plumbing. Render sanitized provided context when present; otherwise keep the existing fallback sentence.

- [ ] **Step 7: Verify focused tests pass**

Run: `node --test tests/core.test.mjs tests/cli/save.test.mjs`
Expected: PASS.

### Task 2: Guidance And Documentation

**Files:**
- Modify: `src/core/memory/memory-candidate.ts`
- Modify: `src/core/cli/help-topics.ts`
- Modify: `documentation/en/operations.md`
- Modify: localized operation docs if the existing docs already mirror the changed examples.
- Test: `tests/cli.test.mjs`

- [ ] **Step 1: Add guidance test**

Extend existing help/guidance assertions to expect optional `CONTEXT:` wording for AI-generated candidate formats.

- [ ] **Step 2: Run help tests to verify failure**

Run: `node --test tests/cli.test.mjs`
Expected: FAIL until guidance includes `CONTEXT:`.

- [ ] **Step 3: Update guidance and docs**

Tell agents to add `CONTEXT:` only when it helps explain why a memory exists, source situation, intended use, or boundary. Do not require it.

- [ ] **Step 4: Verify help tests pass**

Run: `node --test tests/cli.test.mjs`
Expected: PASS.

### Task 3: Final Verification

**Files:**
- Existing modified files only.

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 2: Review diff**

Run: `git diff --check` and `git diff --stat`
Expected: no whitespace errors; changed files match the feature scope.
