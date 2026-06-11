# Clone Memory Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `engram clone-memory --restructure` so workspace/global memory promotion can use save-session-style approval, related-memory hints, and agent restructuring.

**Architecture:** Keep mechanical clone behavior unchanged in `src/commands/clone.ts`. Add an opt-in restructure branch that turns verified source memories into save-session candidates and delegates all preview, approval, accept-all, validation, and writes to a shared helper exported from `src/commands/write.ts`.

**Tech Stack:** TypeScript ESM CLI, Node test runner, Engram memory Markdown parser, existing save-session planning and approval helpers.

---

## File Structure

- Modify `src/commands/clone.ts`: parse `--restructure`, reject incompatible flags, collect verified source memory candidates, and call the shared save-session helper for target scope writes.
- Modify `src/commands/write.ts`: export a helper that runs the existing save-session plan/approval/write flow for supplied candidate text and caller-selected scopes.
- Modify `src/cli/args.ts`: recognize `--restructure` as a boolean flag and preserve natural clone normalization.
- Modify `src/core/cli/command-registry.ts`: advertise the new flag in compact help.
- Modify `src/core/cli/help-topics.ts`: document restructure behavior, dry-run, accept-all, and force incompatibility.
- Modify `src/core/cli/completion.ts`: add `--restructure` to clone-memory completions.
- Modify `src/core/integrations/skillset-render.ts`: teach generated agent instructions the proposal-first clone mode.
- Modify `README.md`, `docs/SKILLSET_CONTRACT.md`, `docs/AGENT_INTEGRATIONS.md`, and localized operation/README clone-memory entries that already mention clone-memory.
- Modify `tests/cli.test.mjs`: add CLI behavior coverage.
- Modify `tests/core.test.mjs`: add parser/normalization coverage for `--restructure`.

---

### Task 1: Add Parser And Help-Surface Tests

**Files:**
- Modify: `tests/core.test.mjs`
- Modify: `tests/cli.test.mjs`

- [ ] **Step 1: Write the failing parser test**

In `tests/core.test.mjs`, extend the existing clone-memory parse assertions near the current `cloneMemory` test:

```js
  const cloneRestructure = parseArgs(['clone-memory', 'workspace', 'global', '--restructure', '--dry-run']);
  assert.equal(cloneRestructure.command, 'clone-memory');
  assert.equal(cloneRestructure.flags.restructure, true);
  assert.equal(cloneRestructure.flags['dry-run'], true);
  assert.deepEqual(cloneRestructure.rest, ['workspace', 'global']);

  const cloneNaturalRestructure = parseArgs(['clone', 'workspace', 'memory', 'to', 'global', '--restructure']);
  assert.equal(cloneNaturalRestructure.command, 'clone-memory');
  assert.equal(cloneNaturalRestructure.flags.restructure, true);
  assert.deepEqual(cloneNaturalRestructure.rest, ['workspace', 'global']);
```

- [ ] **Step 2: Write the failing help/completion test**

In `tests/cli.test.mjs`, extend existing help assertions:

```js
  assert.match((await runEngram(cwd, env, ['help', 'clone-memory'])).stdout, /--restructure/);
  assert.match((await runEngram(cwd, env, ['help', 'clone-memory'])).stdout, /proposal-first/);
```

Extend the existing completion assertions for clone-memory:

```js
  assert.match(bash.stdout, /--restructure/);
  assert.match(zsh.stdout, /--restructure/);
  assert.match(powershell.stdout, /--restructure/);
```

- [ ] **Step 3: Run tests and verify they fail for missing flag/help**

Run:

```sh
npm run build
node --test tests/core.test.mjs tests/cli.test.mjs
```

Expected: failures mention `restructure` is missing from parsed flags/help/completion.

- [ ] **Step 4: Commit failing tests only if the team wants red commits**

Do not commit red tests by default. Keep them unstaged for Task 2.

---

### Task 2: Wire The Restructure Flag Through CLI Metadata

**Files:**
- Modify: `src/cli/args.ts`
- Modify: `src/core/cli/command-registry.ts`
- Modify: `src/core/cli/help-topics.ts`
- Modify: `src/core/cli/completion.ts`

- [ ] **Step 1: Add the boolean flag**

In `src/cli/args.ts`, add `restructure` to `booleanFlags`:

```ts
const booleanFlags = new Set([
  'accept-all', 'all', 'auto', 'dry-run', 'force', 'h', 'help',
  'global', 'global-only', 'global-skillsets-only', 'latest', 'low-confidence', 'memory-only', 'no-auto-upgrade', 'no-global', 'no-skillset',
  'no-submodule', 'no-version-check', 'plan', 'propose', 'rebuild', 'restructure', 'self', 'semantic', 'stale',
  'submodule', 'use', 'user', 'v', 'version', 'workspace'
]);
```

- [ ] **Step 2: Update compact command registry**

In `src/core/cli/command-registry.ts`, update the clone-memory row to include the new flag:

```ts
{ command: 'engram clone-memory workspace global [--force] [--dry-run] [--restructure]', alias: 'cm', purpose: 'Clone active memory Markdown between workspace and global scopes; --restructure uses save-session-style approval instead of raw file copy' },
```

- [ ] **Step 3: Update detailed clone-memory help**

In `src/core/cli/help-topics.ts`, update the `clone-memory` topic examples and notes to include:

```ts
'engram clone-memory workspace global --restructure',
'engram clone-memory workspace global --restructure --dry-run',
'engram clone-memory workspace global --restructure --accept-all',
```

Add notes that normal clone is mechanical, restructure is proposal-first, `--force` is invalid with `--restructure`, and agents may use `--accept-all` only when the human supplied it.

- [ ] **Step 4: Update shell completion arguments**

In `src/core/cli/completion.ts`, change:

```ts
const cloneMemoryArgs = ['workspace', 'global', '--force', '--dry-run'].join(' ');
```

to:

```ts
const cloneMemoryArgs = ['workspace', 'global', '--force', '--dry-run', '--restructure', '--accept-all'].join(' ');
```

- [ ] **Step 5: Run parser/help tests and verify Task 1 passes as far as metadata**

Run:

```sh
npm run build
node --test tests/core.test.mjs tests/cli.test.mjs
```

Expected: parser/help/completion assertions pass; behavior tests for restructure are not written yet.

- [ ] **Step 6: Commit metadata wiring**

```sh
git add src/cli/args.ts src/core/cli/command-registry.ts src/core/cli/help-topics.ts src/core/cli/completion.ts tests/core.test.mjs tests/cli.test.mjs
git commit -m "feat(clone): expose restructure flag metadata"
```

---

### Task 3: Add Restructure Behavior Tests

**Files:**
- Modify: `tests/cli.test.mjs`

- [ ] **Step 1: Add dry-run preview test**

Add a test after the existing `clone-memory copies active memories between workspace and global` test:

```js
test('clone-memory restructure dry-run previews target save plans without writing', async () => {
  const { cwd, env } = await tempWorkspace('engram-clone-restructure-');
  await runEngram(cwd, env, ['init', '--no-skillset']);
  const saved = await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', 'Workspace restructure source memory'], 'A\n');
  assert.equal(saved.code, 0, saved.stderr);

  const globalFile = path.join(env.ENGRAM_GLOBAL_DIR, 'knowledge', 'workspace-restructure-source-memory.md');
  const preview = await runEngram(cwd, env, ['clone-memory', 'workspace', 'global', '--restructure', '--dry-run']);
  assert.equal(preview.code, 0, preview.stderr);
  assert.match(preview.stdout, /Clone memory restructure dry-run workspace -> global/);
  assert.match(preview.stdout, /Candidate: 1/);
  assert.match(preview.stdout, /Action: Add new memory/);
  assert.match(preview.stdout, /Scope: global/);
  assert.match(preview.stdout, /Workspace restructure source memory/);
  await assert.rejects(readFile(globalFile, 'utf8'));
  await rm(cwd, { recursive: true, force: true });
});
```

- [ ] **Step 2: Add manual approval selection test**

```js
test('clone-memory restructure uses numbered approval and writes selected candidates', async () => {
  const { cwd, env } = await tempWorkspace('engram-clone-restructure-');
  await runEngram(cwd, env, ['init', '--no-skillset']);
  await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', 'Workspace selected clone memory'], 'A\n');
  await runEngram(cwd, env, ['save', 'rule', '--scope', 'workspace', 'Workspace skipped clone memory'], 'A\n');

  const selected = await runEngram(cwd, env, ['clone-memory', 'workspace', 'global', '--restructure'], 'A 1\n');
  assert.equal(selected.code, 0, selected.stderr);
  assert.match(selected.stdout, /Saved ->/);
  assert.match(await readFile(path.join(env.ENGRAM_GLOBAL_DIR, 'knowledge', 'workspace-selected-clone-memory.md'), 'utf8'), /scope: global/);
  await assert.rejects(readFile(path.join(env.ENGRAM_GLOBAL_DIR, 'rules', 'workspace-skipped-clone-memory.md'), 'utf8'));
  await rm(cwd, { recursive: true, force: true });
});
```

- [ ] **Step 3: Add accept-all related-memory pause test**

```js
test('clone-memory restructure accept-all pauses when related memories need agent restructuring', async () => {
  const { cwd, env } = await tempWorkspace('engram-clone-restructure-');
  await runEngram(cwd, env, ['init', '--no-skillset']);
  await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'global', 'Release foundation checklist lives in docs release md'], 'A\n');
  await runEngram(cwd, env, ['save', 'rule', '--scope', 'workspace', 'OAuth rotation must follow the release foundation checklist'], 'A\n');

  const paused = await runEngram(cwd, env, ['clone-memory', 'workspace', 'global', '--restructure', '--accept-all']);
  assert.equal(paused.code, 0, paused.stderr);
  assert.match(paused.stdout, /Accepted all save-session candidates \("--accept-all"\)|Accepted all save-session candidates \(\-\-accept-all\)/);
  assert.match(paused.stdout, /found related memories before writing/);
  assert.match(paused.stdout, /DEPENDS_ON/);
  await assert.rejects(readFile(path.join(env.ENGRAM_GLOBAL_DIR, 'rules', 'oauth-rotation-must-follow-the-release-foundation-checklist.md'), 'utf8'));
  await rm(cwd, { recursive: true, force: true });
});
```

- [ ] **Step 4: Add force incompatibility test**

```js
test('clone-memory rejects force with restructure', async () => {
  const { cwd, env } = await tempWorkspace('engram-clone-restructure-');
  await runEngram(cwd, env, ['init', '--no-skillset']);
  const result = await runEngram(cwd, env, ['clone-memory', 'workspace', 'global', '--restructure', '--force']);
  assert.equal(result.code, 1);
  assert.match(result.stderr, /--force cannot be used with --restructure/);
  await rm(cwd, { recursive: true, force: true });
});
```

- [ ] **Step 5: Run behavior tests and verify they fail**

Run:

```sh
npm run build
node --test tests/cli.test.mjs
```

Expected: failures show `--restructure` currently falls through to mechanical clone or missing behavior.

---

### Task 4: Export Shared Save-Session Candidate Runner

**Files:**
- Modify: `src/commands/write.ts`

- [ ] **Step 1: Add exported input type**

Near the imports in `src/commands/write.ts`, add:

```ts
export type SaveSessionCandidateRunOptions = {
  ctx: Awaited<ReturnType<typeof getContext>>;
  text: string;
  scopes: Scope[];
  flags?: Record<string, any>;
  source?: MemorySourceMeta;
  dryRunLabel?: string;
  acceptAllLabel?: string;
};
```

- [ ] **Step 2: Add exported helper using existing internals**

Below `cmdSaveSession`, add:

```ts
export async function runSaveSessionCandidates(options: SaveSessionCandidateRunOptions): Promise<string> {
  const author = await resolveAuthor();
  const role = rolesFromFlags(options.flags ?? {});
  const acceptAll = options.flags?.['accept-all'] === true;
  const plans = await planSaveSessionCandidates(options.ctx, options.text, options.scopes, author, role, options.source);
  if (!plans.length) return 'No memory candidates detected.';
  if (options.flags?.['dry-run'] === true) {
    return `${options.dryRunLabel ?? 'Save-session dry-run'}\n${previewSavePlans(plans)}`;
  }
  let approval: SelectionApproval | undefined = acceptAll ? { accepted: true } : await requestSelectionApproval(previewSavePlans(plans));
  if (!approval?.accepted) return 'Discarded. No file written.';
  let selectedPlans = plans;
  if (approval.selected?.length) {
    selectedPlans = plans.filter((plan) => plan.candidateIndex === undefined || approval.selected?.includes(plan.candidateIndex));
  }
  if (!selectedPlans.length) return 'Discarded. No selected candidates written.';
  if (acceptAll) {
    const restructure = acceptAllRestructureResponse(selectedPlans);
    if (restructure) return restructure;
  }
  const saved = await writeSavePlans(selectedPlans, approval.edits);
  return acceptAll ? `${options.acceptAllLabel ?? 'Accepted all save-session candidates (--accept-all).'}\n${saved}` : saved;
}
```

- [ ] **Step 3: Refactor `cmdSaveSession` to use helper only if it stays behavior-identical**

Leave `cmdSaveSession` as-is for this feature unless duplication becomes problematic. The new helper may reuse private functions without changing the public save-session command.

- [ ] **Step 4: Run existing save-session tests**

Run:

```sh
npm run build
node --test tests/cli.test.mjs
```

Expected: existing save-session tests still pass; clone restructure behavior still fails until Task 5.

---

### Task 5: Implement Clone Restructure Mode

**Files:**
- Modify: `src/commands/clone.ts`

- [ ] **Step 1: Import parser and helper dependencies**

At the top of `src/commands/clone.ts`, add imports:

```ts
import { parseMemory } from '../core/memory/schema.js';
import { runSaveSessionCandidates } from './write.js';
import { sha256 } from '../core/safety/hash.js';
```

Keep the existing `validateMemoryRaw` import because mechanical clone still uses it.

- [ ] **Step 2: Branch before mechanical writes**

Inside `cmdCloneMemory`, after `sourceRoot` and `targetRoot` validation, add:

```ts
  if (flags.restructure === true) {
    if (flags.force === true) throw new Error('--force cannot be used with --restructure');
    return cloneMemoryRestructured(ctx, source, target, sourceRoot, targetRoot, flags);
  }
```

- [ ] **Step 3: Add candidate result types**

Below existing type aliases:

```ts
type RestructureCandidate = { file: string; line: string; hash: string };
type RestructureSkipped = { file: string; reason: string };
```

- [ ] **Step 4: Add restructured clone helper**

Add below `activeMemoryFiles`:

```ts
async function cloneMemoryRestructured(
  ctx: Awaited<ReturnType<typeof getContext>>,
  source: Scope,
  target: Scope,
  sourceRoot: string,
  targetRoot: string,
  flags: Record<string, any>
): Promise<string> {
  const files = await activeMemoryFiles(sourceRoot);
  const candidates: RestructureCandidate[] = [];
  const skipped: RestructureSkipped[] = [];
  for (const file of files) {
    const result = await cloneCandidateFromMemory(sourceRoot, file);
    if ('line' in result) candidates.push(result);
    else skipped.push(result);
  }
  const header = `${flags['dry-run'] === true ? 'Clone memory restructure dry-run' : 'Clone memory restructure'} ${source} -> ${target}\nSource: ${sourceRoot}\nTarget: ${targetRoot}\nCandidates: ${candidates.length}\nSkipped: ${skipped.length}`;
  const skipLines = skipped.map((item) => `SKIPPED ${item.file} (${item.reason})`).join('\n');
  if (!candidates.length) return [header, skipLines || 'No memory candidates detected.'].filter(Boolean).join('\n');
  const body = candidates.map((candidate) => candidate.line).join('\n');
  const output = await runSaveSessionCandidates({
    ctx,
    text: body,
    scopes: [target],
    flags,
    source: {
      source: 'clone-memory',
      sourceFiles: candidates.map((candidate) => `${source}:${candidate.file}`),
      sourceHashes: candidates.map((candidate) => candidate.hash)
    },
    dryRunLabel: header,
    acceptAllLabel: 'Accepted all clone-memory restructure candidates (--accept-all).'
  });
  return skipLines ? `${output}\n${skipLines}` : output;
}
```

- [ ] **Step 5: Add source memory to candidate conversion**

Add:

```ts
async function cloneCandidateFromMemory(root: string, file: string): Promise<RestructureCandidate | RestructureSkipped> {
  const sourceFile = inside(root, file);
  const raw = await readText(sourceFile);
  const trusted = await verifyMemoryHash(root, file, raw);
  if (!trusted.ok) return { file, reason: trusted.reason };
  try {
    const doc = parseMemory(raw);
    const type = memoryTypeFor(file, doc.frontmatter.type);
    const text = contentText(doc.body);
    if (!text) return { file, reason: 'missing content text' };
    return { file, hash: sourceHash(raw), line: `TYPE: ${type} | TEXT: ${candidateText(text)}` };
  } catch (error: any) {
    return { file, reason: error?.message ?? String(error) };
  }
}
```

Add helper functions:

```ts
function memoryTypeFor(file: string, value: unknown): 'rule' | 'skill' | 'knowledge' {
  if (value === 'rule' || value === 'skill' || value === 'knowledge') return value;
  if (file.startsWith('rules/')) return 'rule';
  if (file.startsWith('skills/')) return 'skill';
  return 'knowledge';
}

function contentText(body: string): string {
  const section = body.match(/\n## Content\r?\n([\s\S]*?)(?=\n## |\s*$)/)?.[1] ?? '';
  return section
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^-\s*/, ''))
    .filter((line) => line && !line.startsWith('### '))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function candidateText(text: string): string {
  return text.replace(/\s*\|\s*/g, ' / ').trim();
}

function sourceHash(raw: string): string {
  return sha256(raw);
}
```

- [ ] **Step 6: Run clone behavior tests**

Run:

```sh
npm run build
node --test tests/cli.test.mjs
```

Expected: new clone restructure tests pass or reveal precise mismatches to fix.

- [ ] **Step 7: Commit behavior implementation**

```sh
git add src/commands/clone.ts src/commands/write.ts tests/cli.test.mjs
git commit -m "feat(clone): add restructure mode"
```

---

### Task 6: Update Agent Integration Docs And Generated Skillset

**Files:**
- Modify: `src/core/integrations/skillset-render.ts`
- Modify: `docs/SKILLSET_CONTRACT.md`
- Modify: `docs/AGENT_INTEGRATIONS.md`
- Modify: `README.md`

- [ ] **Step 1: Update generated skillset protocol text**

In `src/core/integrations/skillset-render.ts`, update clone-memory mentions so agents know:

```md
Use `engram clone-memory workspace global` or `engram clone-memory global workspace` for mechanical approved-memory copies. Use `--restructure` when the human wants clone candidates routed through save-session-style approval; never add `--accept-all` unless the human included it.
```

Add a sentence to the long slash guidance:

```md
If args start with "clone-memory" and include "--restructure --accept-all", run the CLI and, if related memories are reported before writing, generate a restructured candidate set and rerun with DEPENDS_ON or UPDATE exactly like save-session accept-all.
```

- [ ] **Step 2: Update skillset contract**

In `docs/SKILLSET_CONTRACT.md`, update the required behavior and CLI table:

```md
- Treat `engram clone-memory --restructure` as a proposal-first clone flow. It converts verified source memories into save-session candidates for the target scope and uses the same approval and accept-all restructuring rules as save-session.
```

Update the clone-memory CLI row to include `[--restructure] [--accept-all]` and the force incompatibility.

- [ ] **Step 3: Update agent integrations**

In `docs/AGENT_INTEGRATIONS.md`, expand the clone-memory section:

```md
For restructuring, normalize "clone workspace memory to global and restructure" to `engram clone-memory workspace global --restructure`. Do not add `--accept-all` unless the human said it. If accept-all reports related memories before writing, rerun with `DEPENDS_ON` or `UPDATE` candidates.
```

- [ ] **Step 4: Update README clone-memory summary**

In `README.md`, update the clone bullet and command table to include:

```md
Use `--restructure` to route cloned memories through the save-session approval and related-memory hint flow instead of raw file copy.
```

- [ ] **Step 5: Run docs-sensitive tests**

Run:

```sh
npm run build
node --test tests/skillset.test.mjs tests/cli.test.mjs
```

Expected: generated skillset and CLI tests pass.

- [ ] **Step 6: Commit docs and generated guidance**

```sh
git add src/core/integrations/skillset-render.ts docs/SKILLSET_CONTRACT.md docs/AGENT_INTEGRATIONS.md README.md tests/skillset.test.mjs tests/cli.test.mjs
git commit -m "docs(clone): document restructure mode"
```

---

### Task 7: Update Localized Clone-Memory Docs

**Files:**
- Modify: `documentation/en/operations.md`
- Modify: `documentation/es/operations.md`
- Modify: `documentation/fr/operations.md`
- Modify: `documentation/ja/operations.md`
- Modify: `documentation/ko/operations.md`
- Modify: `documentation/ru/operations.md`
- Modify: `documentation/vi/operations.md`
- Modify: `documentation/zh/operations.md`
- Modify matching localized `documentation/*/README.md` files that mention clone-memory.

- [ ] **Step 1: Find all localized clone-memory entries**

Run:

```sh
rg -n "clone-memory|Clone workspace/global|Sao chép|Cloner|Клонировать|克隆|복제" documentation
```

Expected: list of operation and README files that already mention clone-memory.

- [ ] **Step 2: Update English localized docs first**

In `documentation/en/operations.md`, add:

```md
Add `--restructure` when you want cloned memories proposed through the save-session approval flow instead of copied verbatim.
```

In `documentation/en/README.md`, update the clone-memory command cell to include `--restructure`.

- [ ] **Step 3: Update non-English docs conservatively**

For each non-English localized file, append an English parenthetical if no translator is available:

```md
(`--restructure` routes cloned memories through save-session-style approval instead of raw copy.)
```

This avoids incorrect machine translation while preserving feature discoverability.

- [ ] **Step 4: Run docs search verification**

Run:

```sh
rg -n -- "--restructure" README.md docs documentation src/core
```

Expected: clone-memory restructure appears in main README, contract, integrations, help, generated skillset, and localized docs.

- [ ] **Step 5: Commit localized docs**

```sh
git add documentation README.md docs src/core
git commit -m "docs(clone): add localized restructure references"
```

---

### Task 8: Final Verification

**Files:**
- Verify only

- [ ] **Step 1: Run full test suite**

Run:

```sh
npm test
```

Expected: all tests pass.

- [ ] **Step 2: Run package dry-run check**

Run:

```sh
npm run pack:dry
```

Expected: package dry-run succeeds and includes expected files.

- [ ] **Step 3: Inspect final diff**

Run:

```sh
git status --short
git log --oneline -5
```

Expected: clean worktree except intentional uncommitted changes if the user requested no commits; recent commits reflect spec, metadata, behavior, and docs.

- [ ] **Step 4: Save durable memory if useful**

If this feature establishes a durable workflow rule, propose:

```sh
engram save knowledge "clone-memory --restructure routes verified workspace/global memory copies through save-session-style approval and related-memory restructuring."
```

Do not save it without the normal approval flow unless the human explicitly requests accept-all.
