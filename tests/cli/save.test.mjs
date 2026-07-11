import test from 'node:test';
import assert from 'node:assert/strict';
import { rm, writeFile, mkdir, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { initGit, runEngram, tempWorkspace, workspaceMemoryRoot } from '../helpers.mjs';
import { testMemory, duplicateFixtureMemory } from './fixtures.mjs';

test('save knowledge without text asks for generated agent knowledge', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['inject']);
  const input = 'Engram supports agent-generated knowledge capture when no text is provided.\nA\n';
  const saved = await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace'], input);
  assert.equal(saved.code, 0, saved.stderr);
  assert.match(saved.stdout, /KNOWLEDGE TEXT NEEDED/);
  assert.match(saved.stdout, /Saved/);
  assert.match((await runEngram(cwd, env, ['search', 'agent-generated'])).stdout, /agent-generated-knowledge/);
  const empty = await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace'], '\n');
  assert.equal(empty.code, 0, empty.stderr);
  assert.match(empty.stdout, /Discarded/);
  await rm(cwd, { recursive: true, force: true });
});

test('save auto-detects rules and workflow candidates', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['inject']);
  const rule = await runEngram(cwd, env, ['save', '--scope', 'workspace', 'Always use pnpm for installs'], 'A\n');
  assert.equal(rule.code, 0, rule.stderr);
  assert.match(rule.stdout, /Type: rule/);
  assert.match(rule.stdout, /rules\/always-use-pnpm-for-installs\.md/);

  const workflow = await runEngram(cwd, env, [
    'save', 'workflow', '--scope', 'workspace',
    'When releasing, first run tests. Then update the changelog. Finally tag the version.'
  ], 'A\n');
  assert.equal(workflow.code, 0, workflow.stderr);
  assert.match(workflow.stdout, /Type: skill/);
  assert.match(workflow.stdout, /skills\/skill-when-releasing-first-run-tests-then-update-the-changelog\.md/);
  await rm(cwd, { recursive: true, force: true });
});

test('save stores task_type tags and prompts when task is unclear', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['inject']);
  const saved = await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', 'Debug auth middleware refreshes tokens before expiry'], 'A\n');
  assert.equal(saved.code, 0, saved.stderr);
  const content = await readFile(path.join(workspaceMemoryRoot(cwd), 'knowledge', 'debug-auth-middleware-refreshes-tokens-before-expiry.md'), 'utf8');
  assert.match(content, /tags: \[task_type:debugging, debug, auth, middleware, refreshes, tokens\]/);

  const prompt = await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', 'Remember this vague preference'], 'planning\nA\n');
  assert.equal(prompt.code, 0, prompt.stderr);
  assert.match(prompt.stdout, /Task type unclear/);
  const promptContent = await readFile(path.join(workspaceMemoryRoot(cwd), 'knowledge', 'remember-this-vague-preference.md'), 'utf8');
  assert.match(promptContent, /tags: \[task_type:planning, remember, vague, preference\]/);
  await rm(cwd, { recursive: true, force: true });
});

test('save can skip unclear task type prompt and still tag unknown', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['inject']);
  const saved = await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', '--skip-task-type-prompt', 'Remember this vague preference'], 'A\n');
  assert.equal(saved.code, 0, saved.stderr);
  assert.doesNotMatch(saved.stdout, /Task type unclear/);
  const content = await readFile(path.join(workspaceMemoryRoot(cwd), 'knowledge', 'remember-this-vague-preference.md'), 'utf8');
  assert.match(content, /tags: \[task_type:unknown, remember, vague, preference\]/);
  await rm(cwd, { recursive: true, force: true });
});

test('save stores role metadata for routing', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['inject']);
  const saved = await runEngram(cwd, env, [
    'save', 'rule', '--scope', 'workspace', '--role', 'frontend',
    'Use design tokens for UI spacing'
  ], 'A\n');
  assert.equal(saved.code, 0, saved.stderr);
  const file = path.join(workspaceMemoryRoot(cwd), 'rules', 'use-design-tokens-for-ui-spacing.md');
  assert.match(await readFile(file, 'utf8'), /role: \[frontend\]/);
  const updated = await runEngram(cwd, env, [
    'save', 'rule', '--scope', 'workspace', '--role', 'backend',
    'Use design tokens for responsive UI spacing'
  ], 'A\n');
  assert.equal(updated.code, 0, updated.stderr);
  assert.match((await runEngram(cwd, env, ['stats'])).stdout, /Total: 1/);
  assert.match(await readFile(file, 'utf8'), /role: \[frontend, backend\]/);
  await rm(cwd, { recursive: true, force: true });
});

test('save can parse agent-brainstormed workflow candidates', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['inject']);
  const input = 'TYPE: workflow\nTEXT: When deploying, first run tests. Then verify health.\nA\n';
  const saved = await runEngram(cwd, env, ['save', '--scope', 'workspace'], input);
  assert.equal(saved.code, 0, saved.stderr);
  assert.match(saved.stdout, /MEMORY CANDIDATE NEEDED/);
  assert.match(saved.stdout, /Type: skill/);
  assert.match(saved.stdout, /skills\/when-deploying-first-run-tests-then-verify-health\.md/);
  await rm(cwd, { recursive: true, force: true });
});

test('save-session proposes multiple agent-brainstormed memories', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['inject']);
  const input = [
    'TYPE: rule | TEXT: Always run tests before release.',
    'TYPE: workflow | TEXT: When releasing, first run tests. Then update changelog.',
    'A',
    ''
  ].join('\n');
  const saved = await runEngram(cwd, env, ['save-session', '--scope', 'workspace'], input);
  assert.equal(saved.code, 0, saved.stderr);
  assert.match(saved.stdout, /MEMORY CANDIDATE NEEDED/);
  assert.match(saved.stdout, /Type: rule/);
  assert.match(saved.stdout, /Type: skill/);
  assert.match((await runEngram(cwd, env, ['stats'])).stdout, /Total: 2/);
  await rm(cwd, { recursive: true, force: true });
});

test('save-session --file - reads transcript from stdin', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['inject']);
  const input = [
    'TYPE: rule | TEXT: Stdin test rule.',
    'TYPE: workflow | TEXT: When stdin releases, first run tests. Then update changelog.',
    ''
  ].join('\n');
const saved = await runEngram(cwd, env, ['save-session', '--scope', 'workspace', '--file', '-', '--force'], input);
  assert.equal(saved.code, 0, saved.stderr);
  assert.match(saved.stdout, /Forced save-session candidates/);
  assert.match((await runEngram(cwd, env, ['stats'])).stdout, /Total: 2/);
  await rm(cwd, { recursive: true, force: true });
});


test('save-session classifies each candidate text independently', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['inject']);
  const input = [
    'TYPE: workflow | TEXT: When releasing, first run tests. Then update changelog.',
    'TYPE: knowledge | TEXT: Auth rotation requires scoped secrets.',
    ''
  ].join('\n');
const saved = await runEngram(cwd, env, ['save-session', '--scope', 'workspace', '--force'], input);
  assert.equal(saved.code, 0, saved.stderr);
  const workflowContent = await readFile(path.join(workspaceMemoryRoot(cwd), 'skills', 'when-releasing-first-run-tests-then-update-changelog.md'), 'utf8');
  assert.match(workflowContent, /tags: \[task_type:release, releasing, first, run, tests, update\]/);
  const knowledgeContent = await readFile(path.join(workspaceMemoryRoot(cwd), 'knowledge', 'auth-rotation-requires-scoped-secrets.md'), 'utf8');
  assert.match(knowledgeContent, /tags: \[task_type:security, auth, rotation, requires, scoped, secrets\]/);
  await rm(cwd, { recursive: true, force: true });
});

test('save-session preserves optional AI-generated context and falls back when omitted', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['inject']);
  const input = [
    'TYPE: rule | TEXT: Always explain why durable memories exist. | CONTEXT: Created after the user clarified that Context should help humans and agents remember why a memory exists.',
    'TYPE: knowledge | TEXT: Simple factual memories may use default context.',
    ''
  ].join('\n');
const saved = await runEngram(cwd, env, ['save-session', '--scope', 'workspace', '--force'], input);
  assert.equal(saved.code, 0, saved.stderr);
  const contextual = await readFile(path.join(workspaceMemoryRoot(cwd), 'rules', 'always-explain-why-durable-memories-exist.md'), 'utf8');
   assert.match(contextual, /## Origin\r?\n\r?\nCreated after the user clarified that Context should help humans and agents remember why a memory exists\./);
  const fallback = await readFile(path.join(workspaceMemoryRoot(cwd), 'knowledge', 'simple-factual-memories-may-use-default-context.md'), 'utf8');
  assert.doesNotMatch(fallback, /## (?:Origin|Context)/, 'v2 knowledge without origin has no context section');
  await rm(cwd, { recursive: true, force: true });
});

test('save-session query-level validates integer and expands agent guidance', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['inject']);
  const input = [
    'TYPE: knowledge | TEXT: Query-level mining can use recent accessible chat sessions.',
    'A',
    ''
  ].join('\n');
  const saved = await runEngram(cwd, env, ['save-session', '--scope', 'workspace', '--query-level', '3'], input);
  assert.equal(saved.code, 0, saved.stderr);
  assert.match(saved.stdout, /Query level: use up to the 3 most recent human-agent chat sessions/);
  assert.match(saved.stdout, /do not invent unavailable history/);
  assert.match((await runEngram(cwd, env, ['stats'])).stdout, /Total: 1/);

  const naturalInput = 'TYPE: knowledge | TEXT: Natural ss last-session shorthand maps to query-level force.\n';
  const natural = await runEngram(cwd, env, ['ss', '-f', 'last', '50', 'session', '--scope', 'workspace'], naturalInput);
  assert.equal(natural.code, 0, natural.stderr);
  assert.match(natural.stdout, /Query level: use up to the 50 most recent human-agent chat sessions/);
assert.match(natural.stdout, /--force skips the final A\/B\/C approval/);
  assert.match(natural.stdout, /Forced save-session candidates/);
  assert.match((await runEngram(cwd, env, ['stats'])).stdout, /Total: 2/);

  const invalid = await runEngram(cwd, env, ['save-session', '--query-level', 'two']);
  assert.notEqual(invalid.code, 0);
  assert.match(invalid.stderr, /--query-level must be a positive integer/);
  const zero = await runEngram(cwd, env, ['save-session', '--query-level', '0']);
  assert.notEqual(zero.code, 0);
  assert.match(zero.stderr, /--query-level must be a positive integer/);
  await rm(cwd, { recursive: true, force: true });
});

test('save-session can read a transcript file and save selected candidates only', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['inject']);
  const transcript = path.join(cwd, 'session.md');
  await writeFile(transcript, [
    'TYPE: rule | TEXT: Always run release tests before tagging.',
    'TYPE: knowledge | TEXT: Release notes live in CHANGELOG.md.',
    ''
  ].join('\n'));
  const saved = await runEngram(cwd, env, [
    'save-session', '--scope', 'workspace', '--file', transcript, '--role', 'release'
  ], 'A 1\n');
  assert.equal(saved.code, 0, saved.stderr);
  assert.match(saved.stdout, /A 1,3/);
  assert.match((await runEngram(cwd, env, ['stats'])).stdout, /Total: 1/);
  const content = await readFile(path.join(workspaceMemoryRoot(cwd), 'rules', 'always-run-release-tests-before-tagging.md'), 'utf8');
  assert.match(content, /role: \[release\]/);
  assert.doesNotMatch((await runEngram(cwd, env, ['search', 'Release notes'])).stdout, /release-notes/);
  await rm(cwd, { recursive: true, force: true });
});

test('save-session force writes every transcript candidate without approval prompt', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['inject']);
  const transcript = path.join(cwd, 'session.md');
  await writeFile(transcript, [
    'TYPE: rule | TEXT: Always run smoke tests before release.',
    'TYPE: knowledge | TEXT: The release dashboard lives in Grafana.',
    ''
  ].join('\n'));
  const saved = await runEngram(cwd, env, [
  'save-session', '--scope', 'workspace', '--file', transcript, '--force'
  ]);
  assert.equal(saved.code, 0, saved.stderr);
  assert.match(saved.stdout, /Forced save-session candidates/);
  assert.doesNotMatch(saved.stdout, /Reply: A/);
  assert.match((await runEngram(cwd, env, ['stats'])).stdout, /Total: 2/);
  await rm(cwd, { recursive: true, force: true });
});

test('save-session force saves generated candidates without final approval line', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['inject']);
  const input = [
    'TYPE: rule | TEXT: Always update Engram skillsets after changing slash behavior.',
    'TYPE: knowledge | TEXT: Slash save-session force is explicit human approval.',
    ''
  ].join('\n');
const saved = await runEngram(cwd, env, ['save-session', '--scope', 'workspace', '--force'], input);
  assert.equal(saved.code, 0, saved.stderr);
  assert.match(saved.stdout, /MEMORY CANDIDATE NEEDED/);
  assert.match(saved.stdout, /Candidates:/);
assert.match(saved.stdout, /--force skips the final A\/B\/C approval/);
  assert.match(saved.stdout, /Forced save-session candidates/);
  assert.doesNotMatch(saved.stdout, /A 1,3/);
  assert.match((await runEngram(cwd, env, ['stats'])).stdout, /Total: 2/);
  await rm(cwd, { recursive: true, force: true });
});


test('save-session force writes approved agent rule variants', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['inject']);
  const input = [
    'TYPE: rule | TEXT: Use pnpm for package installs. | LIGHT: Mention pnpm when dependency tooling matters. | BALANCED: Prefer pnpm for package installs unless the repo specifies another package manager. | STRICT: Block npm and yarn install suggestions unless the human explicitly asks.',
    ''
  ].join('\n');

const saved = await runEngram(cwd, env, ['save-session', '--scope', 'workspace', '--force'], input);
  assert.equal(saved.code, 0, saved.stderr);
  assert.match(saved.stdout, /Forced save-session candidates/);

  const content = await readFile(path.join(workspaceMemoryRoot(cwd), 'rules', 'use-pnpm-for-package-installs.md'), 'utf8');
  assert.match(content, /### Light\r?\n\r?\nMention pnpm when dependency tooling matters\./);
  assert.match(content, /### Balanced\r?\n\r?\nPrefer pnpm for package installs unless the repo specifies another package manager\./);
  assert.match(content, /### Strict\r?\n\r?\nBlock npm and yarn install suggestions unless the human explicitly asks\./);
  await rm(cwd, { recursive: true, force: true });
});

test('save-session force persists triggers from approved candidates', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['inject']);
  const input = 'TYPE: knowledge | TEXT: Webhook retries use exponential backoff. | TRIGGERS: webhook, retry, backoff\n';

const saved = await runEngram(cwd, env, ['save-session', '--scope', 'workspace', '--force'], input);
  assert.equal(saved.code, 0, saved.stderr);

  const content = await readFile(path.join(workspaceMemoryRoot(cwd), 'knowledge', 'webhook-retries-use-exponential-backoff.md'), 'utf8');
  assert.match(content, /triggers: \[webhook, retry, backoff\]/);
  await rm(cwd, { recursive: true, force: true });
});

test('direct CLI save still uses A/B/C approval without force', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['inject']);

  const proposed = await runEngram(cwd, env, [
    'save', 'knowledge', '--scope', 'workspace',
    'CLI approval remains A B C for direct terminal saves.'
  ], 'C\n');

  assert.equal(proposed.code, 0, proposed.stderr);
  assert.match(proposed.stdout, /Reply: A/);
  assert.match(proposed.stdout, /B/);
  assert.match(proposed.stdout, /C/);
  assert.match(proposed.stdout, /Discarded\. No file written\./);
  assert.match((await runEngram(cwd, env, ['stats'])).stdout, /Total: 0/);
  await rm(cwd, { recursive: true, force: true });
});
test('generated memories use standard markdown spacing and links', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['inject']);
  const saved = await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', 'Docs live at www.google.com.'], 'A\n');
  assert.equal(saved.code, 0, saved.stderr);
  const content = await readFile(path.join(workspaceMemoryRoot(cwd), 'knowledge', 'docs-live-at-www-google-com.md'), 'utf8');
  assert.match(content, /## Content\r?\n\r?\n- Docs live at \[www\.google\.com\]\(https:\/\/www\.google\.com\)\./);
  await rm(cwd, { recursive: true, force: true });
});

test('save automatically updates matching memory instead of duplicating it', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['inject']);
  await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', 'Frontend uses React and pnpm'], 'A\n');
  const updated = await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', 'React frontend uses pnpm workspace scripts'], 'A\n');
  assert.equal(updated.code, 0, updated.stderr);
  assert.match(updated.stdout, /Saved/);
  assert.doesNotMatch(updated.stdout, /Related memories found/);
  assert.match((await runEngram(cwd, env, ['stats'])).stdout, /Total: 1/);
  assert.match(await readFile(path.join(workspaceMemoryRoot(cwd), 'knowledge', 'frontend-uses-react-and-pnpm.md'), 'utf8'), /workspace scripts/);
  await rm(cwd, { recursive: true, force: true });
});

test('save preview marks weak same-type overlap as possible duplicate', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['inject']);
  const existing = path.join(workspaceMemoryRoot(cwd), 'knowledge', 'invoice-webhook-retry-baseline.md');
  await mkdir(path.dirname(existing), { recursive: true });
  await writeFile(existing, duplicateFixtureMemory({
    id: 'invoice-webhook-retry-baseline',
    content: 'Invoice webhook retry baseline records retry and backoff guidance for payment failures.'
  }));
  await runEngram(cwd, env, ['rebuild-index', 'workspace']);

  const proposed = await runEngram(cwd, env, [
    'save', 'knowledge', '--scope', 'workspace',
    'Invoice retry backoff policy for webhook failures'
  ], 'C\n');

  assert.equal(proposed.code, 0, proposed.stderr);
  assert.match(proposed.stdout, /Action: Add new memory/);
  assert.match(proposed.stdout, /Related memories found/);
  assert.match(proposed.stdout, /Possible duplicate: consider updating or archiving instead of adding another memory/);
  assert.match(proposed.stdout, /workspace:knowledge\/invoice-webhook-retry-baseline\.md/);
  assert.match(proposed.stdout, /Discarded\. No file written\./);
  await rm(cwd, { recursive: true, force: true });
});

test('save preview reports related memories for dependency restructuring', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['inject']);
  await runEngram(cwd, env, [
    'save', 'knowledge', '--scope', 'workspace',
    'Release foundation checklist lives in docs/release.md'
  ], 'A\n');

  const proposed = await runEngram(cwd, env, [
    'save', 'rule', '--scope', 'workspace',
    'OAuth rotation must follow the release foundation checklist'
  ], 'C\n');

  assert.equal(proposed.code, 0, proposed.stderr);
  assert.match(proposed.stdout, /Related memories found/);
  assert.match(proposed.stdout, /workspace:knowledge\/release-foundation-checklist-lives-in-docs-release-md\.md/);
  assert.match(proposed.stdout, /Suggested depends_on: \[release-foundation-checklist-lives-in-docs-release-md\]/);
  assert.match(proposed.stdout, /reject if you want to rerun save after adding dependencies/i);
  assert.match(proposed.stdout, /Discarded\. No file written\./);
  await assert.rejects(readFile(path.join(workspaceMemoryRoot(cwd), 'rules', 'oauth-rotation-must-follow-the-release-foundation-checklist.md'), 'utf8'));
  await rm(cwd, { recursive: true, force: true });
});

test('save preview related-memory hints stay scoped to the save target', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['inject']);
  await runEngram(cwd, env, [
    'save', 'knowledge', '--scope', 'global',
    'Global launch checklist covers shared release approval'
  ], 'A\n');

  const proposed = await runEngram(cwd, env, [
    'save', 'rule', '--scope', 'workspace',
    'Workspace launch checklist must follow shared release approval'
  ], 'C\n');

  assert.equal(proposed.code, 0, proposed.stderr);
  assert.doesNotMatch(proposed.stdout, /global:knowledge\/global-launch-checklist-covers-shared-release-approval\.md/);
  assert.doesNotMatch(proposed.stdout, /Related memories found/);
  assert.match(proposed.stdout, /Discarded\. No file written\./);
  await rm(cwd, { recursive: true, force: true });
});

test('save-session preview includes related-memory hints per candidate', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['inject']);
  await runEngram(cwd, env, [
    'save', 'knowledge', '--scope', 'workspace',
    'Release foundation checklist lives in docs/release.md'
  ], 'A\n');

  const proposed = await runEngram(cwd, env, [
    'save-session', '--scope', 'workspace',
    'TYPE: rule | TEXT: OAuth rotation must follow the release foundation checklist'
  ], 'C\n');

  assert.equal(proposed.code, 0, proposed.stderr);
  assert.match(proposed.stdout, /Candidate: 1/);
  assert.match(proposed.stdout, /Related memories found/);
  assert.match(proposed.stdout, /Suggested depends_on: \[release-foundation-checklist-lives-in-docs-release-md\]/);
  assert.match(proposed.stdout, /Discarded\. No file written\./);
  await rm(cwd, { recursive: true, force: true });
});

test('save-session force pauses for dependency restructuring and saves rerun structure', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['inject']);
  await runEngram(cwd, env, [
    'save', 'knowledge', '--scope', 'workspace',
    'Release foundation checklist lives in docs/release.md'
  ], 'A\n');

  const paused = await runEngram(cwd, env, [
  'save-session', '--scope', 'workspace', '--force',
    'TYPE: rule | TEXT: OAuth rotation must follow the release foundation checklist'
  ]);

  assert.equal(paused.code, 0, paused.stderr);
  assert.match(paused.stdout, /found related memories before writing/);
  assert.match(paused.stdout, /No file written yet/);
  assert.match(paused.stdout, /Suggested depends_on: \[release-foundation-checklist-lives-in-docs-release-md\]/);
  assert.doesNotMatch(paused.stdout, /Saved ->/);
  await assert.rejects(readFile(path.join(workspaceMemoryRoot(cwd), 'rules', 'oauth-rotation-must-follow-the-release-foundation-checklist.md'), 'utf8'));

  const saved = await runEngram(cwd, env, [
  'save-session', '--scope', 'workspace', '--force',
    'TYPE: rule | TEXT: OAuth rotation must follow the release foundation checklist | DEPENDS_ON: release-foundation-checklist-lives-in-docs-release-md | LEVEL: advanced'
  ]);

  assert.equal(saved.code, 0, saved.stderr);
  assert.match(saved.stdout, /Forced save-session candidates/);
  assert.match(saved.stdout, /Saved ->/);
  assert.doesNotMatch(saved.stdout, /id:\s*undefined/i);
  assert.doesNotMatch(saved.stdout, /undefined\.md/i);
  assert.match(saved.stdout, /rules[\\/]+oauth-rotation-must-follow-the-release-foundation-checklist\.md/i);
  const content = await readFile(path.join(workspaceMemoryRoot(cwd), 'rules', 'oauth-rotation-must-follow-the-release-foundation-checklist.md'), 'utf8');
  assert.match(content, /^id: oauth-rotation-must-follow-the-release-foundation-checklist$/m);
  assert.match(content, /depends_on: \[release-foundation-checklist-lives-in-docs-release-md\]/);
  assert.match(content, /level: advanced/);
  await rm(cwd, { recursive: true, force: true });
});

test('save-session force pauses on possible duplicate and supports explicit update rerun', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['inject']);
  const existing = path.join(workspaceMemoryRoot(cwd), 'knowledge', 'invoice-webhook-retry-baseline.md');
  await mkdir(path.dirname(existing), { recursive: true });
  await writeFile(existing, duplicateFixtureMemory({
    id: 'invoice-webhook-retry-baseline',
    content: 'Invoice webhook retry baseline records retry and backoff guidance for payment failures.'
  }));
  await runEngram(cwd, env, ['rebuild-index', 'workspace']);

  const paused = await runEngram(cwd, env, [
  'save-session', '--scope', 'workspace', '--force',
    'TYPE: knowledge | TEXT: Invoice retry backoff policy for webhook failures'
  ]);

  assert.equal(paused.code, 0, paused.stderr);
  assert.match(paused.stdout, /found related memories before writing/);
  assert.match(paused.stdout, /Possible duplicate: consider updating or archiving instead of adding another memory/);
  assert.match((await runEngram(cwd, env, ['stats'])).stdout, /Total: 1/);

  const updated = await runEngram(cwd, env, [
  'save-session', '--scope', 'workspace', '--force',
    'TYPE: knowledge | TEXT: Invoice retry backoff policy for webhook failures | UPDATE: invoice-webhook-retry-baseline'
  ]);

  assert.equal(updated.code, 0, updated.stderr);
  assert.match(updated.stdout, /Forced save-session candidates/);
  assert.match(updated.stdout, /Saved ->/);
  assert.match((await runEngram(cwd, env, ['stats'])).stdout, /Total: 1/);
  assert.match(await readFile(existing, 'utf8'), /Invoice retry backoff policy for webhook failures/);
  await rm(cwd, { recursive: true, force: true });
});

test('rule variants render the active compact variant', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['inject']);
  await runEngram(cwd, env, ['save', 'rule', '--scope', 'workspace', 'Use pnpm for package management'], 'A\n');
  const raw = await readFile(path.join(workspaceMemoryRoot(cwd), 'rules', 'use-pnpm-for-package-management.md'), 'utf8');
  assert.match(raw, /## Rule Variants/);
  assert.match(raw, /### Light/);
  assert.match(raw, /### Balanced/);
  assert.match(raw, /### Strict/);
  const balanced = await runEngram(cwd, env, ['load', 'pnpm package']);
  assert.equal(balanced.code, 0, balanced.stderr);
  assert.match(balanced.stdout, /Use pnpm for package management/);
  assert.doesNotMatch(balanced.stdout, /mandatory/);
  assert.doesNotMatch(balanced.stdout, /### Light/);
  assert.match((await runEngram(cwd, env, ['set-rule-variant', 'strict'])).stdout, /strict/);
  const loaded = await runEngram(cwd, env, ['load', 'pnpm package']);
  assert.equal(loaded.code, 0, loaded.stderr);
  assert.match(loaded.stdout, /mandatory/);
  assert.doesNotMatch(loaded.stdout, /### Light/);
  await rm(cwd, { recursive: true, force: true });
});

test('save preview hides stored rule variants by default and can show them on demand', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['inject']);

  const hidden = await runEngram(cwd, env, [
    'save', 'rule', '--scope', 'workspace',
    'Use pnpm for package management'
  ], 'C\n');

  assert.equal(hidden.code, 0, hidden.stderr);
  assert.match(hidden.stdout, /Rule variants: light, balanced, strict will be saved\. Preview shows balanced\./);
  assert.doesNotMatch(hidden.stdout, /## Rule Variants/);
  assert.doesNotMatch(hidden.stdout, /### Light/);
  assert.doesNotMatch(hidden.stdout, /### Strict/);

  const shown = await runEngram(cwd, env, [
    'save', 'rule', '--scope', 'workspace', '--show-rule-variants',
    'Use pnpm for package management'
  ], 'C\n');

  assert.equal(shown.code, 0, shown.stderr);
  assert.match(shown.stdout, /## Rule Variants/);
  assert.match(shown.stdout, /### Light/);
  assert.match(shown.stdout, /### Strict/);
  await rm(cwd, { recursive: true, force: true });
});

test('save preserves customized rule variants on update', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['inject']);
  await runEngram(cwd, env, ['save', 'rule', '--scope', 'workspace', 'Use pnpm for package management'], 'A\n');
  const file = path.join(workspaceMemoryRoot(cwd), 'rules', 'use-pnpm-for-package-management.md');
  const raw = await readFile(file, 'utf8');
  const customized = raw
    .replace(/### Light\r?\n\r?\n[\s\S]*?(?=\r?\n### Balanced)/, '### Light\n\n- Mention pnpm only when dependency tooling is part of the task.\n')
    .replace(/### Balanced\r?\n\r?\n[\s\S]*?(?=\r?\n### Strict)/, '### Balanced\n\n- Prefer pnpm unless the repo already enforces another package manager.\n')
    .replace(/### Strict\r?\n\r?\n[\s\S]*?(?=\r?\n## Origin|\s*$)/, '### Strict\n\n- Block npm and yarn suggestions unless the human asks for them.\n');
  await writeFile(file, customized);

  const updated = await runEngram(cwd, env, [
    'save', 'rule', '--scope', 'workspace',
    'Use pnpm for package management in workspace scripts'
  ], 'A\n');

  assert.equal(updated.code, 0, updated.stderr);
  const next = await readFile(file, 'utf8');
  assert.match(next, /- Mention pnpm only when dependency tooling is part of the task\./);
  assert.match(next, /- Prefer pnpm unless the repo already enforces another package manager\./);
  assert.match(next, /- Block npm and yarn suggestions unless the human asks for them\./);
  assert.match(next, /Use pnpm for package management in workspace scripts/);
  await rm(cwd, { recursive: true, force: true });
});

test('weak rule overlap stays a possible duplicate instead of auto-updating from stored variants', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['inject']);
  const existing = path.join(workspaceMemoryRoot(cwd), 'rules', 'use-pnpm-for-installs.md');
  await mkdir(path.dirname(existing), { recursive: true });
  await writeFile(existing, `---
id: use-pnpm-for-installs
type: rule
scope: workspace
tags: [pnpm, installs, package]
created: 2026-06-05
updated: 2026-06-05
author: test@example.com
source: manual
confidence: high
---
# Use pnpm for installs

## Context

CLI test fixture.

## Content

- Use pnpm for installs.

## Rule Variants

### Light

- Consider this rule when the task context matches: Use pnpm for installs.

### Balanced

- Use pnpm for installs.

### Strict

- Treat this rule as mandatory unless the human explicitly overrides it: Use pnpm for installs.

## Example

Use this memory when the task touches package management.
`);
  await runEngram(cwd, env, ['rebuild-index', 'workspace']);

  const proposed = await runEngram(cwd, env, [
    'save', 'rule', '--scope', 'workspace',
    'Use pnpm lockfiles in CI'
  ], 'C\n');

  assert.equal(proposed.code, 0, proposed.stderr);
  assert.match(proposed.stdout, /Action: Add new memory/);
  assert.match(proposed.stdout, /Related memories found/);
  assert.match(proposed.stdout, /Possible duplicate: consider updating or archiving instead of adding another memory/);
  assert.doesNotMatch(proposed.stdout, /Action: Update existing memory/);
  await rm(cwd, { recursive: true, force: true });
});

