import test from 'node:test';
import assert from 'node:assert/strict';
import { rm, writeFile, mkdir, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { initGit, runEngram, tempWorkspace, workspaceMemoryRoot } from '../helpers.mjs';
import { testMemory, duplicateFixtureMemory } from './fixtures.mjs';
import { writeObservation } from '../../dist/core/memory/observe.js';
import { renderFrontmatter } from '../../dist/core/memory/frontmatter.js';
import { writeTrace } from '../../dist/core/traces/storage.js';
import { parseMemoryCandidate, parseMemoryCandidates } from '../../dist/core/memory/memory-candidate.js';

test('save writes no author_email by default and writes it when memory.include_author_email is true', async () => {
  const { cwd, env } = await tempWorkspace('engram-save-author-email-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', 'Author privacy default check'], 'A\n');
  const file = path.join(workspaceMemoryRoot(cwd), 'knowledge', 'author-privacy-default-check.md');
  assert.match(await readFile(file, 'utf8'), /^author_name:/m);
  assert.doesNotMatch(await readFile(file, 'utf8'), /^author_email:/m);
  const configFile = path.join(workspaceMemoryRoot(cwd), 'engram.config.json');
  const config = JSON.parse(await readFile(configFile, 'utf8'));
  await writeFile(configFile, JSON.stringify({ ...config, memory: { ...config.memory, include_author_email: true } }, null, 2));
  await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', 'Author opt in email check'], 'A\n');
  assert.match(await readFile(path.join(workspaceMemoryRoot(cwd), 'knowledge', 'author-opt-in-email-check.md'), 'utf8'), /^author_email:\s*engram-test@example\.com$/m);
  await rm(cwd, { recursive: true, force: true });
});

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

test('save-session force saves ready candidates and defers dependency restructuring by id', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['inject']);
  await runEngram(cwd, env, [
    'save', 'knowledge', '--scope', 'workspace',
    'Release foundation checklist lives in docs/release.md'
  ], 'A\n');

  const deferred = await runEngram(cwd, env, [
  'save-session', '--scope', 'workspace', '--force',
    [
      'TYPE: knowledge | TEXT: Smoke test dashboard URL is https://grafana.example.test',
      'TYPE: rule | TEXT: DeferredOnlyNeedleXYZ must follow the release foundation checklist'
    ].join('\n')
  ]);

  assert.equal(deferred.code, 0, deferred.stderr);
  assert.match(deferred.stdout, /Forced save-session candidates/);
  assert.match(deferred.stdout, /Saved ->/);
  assert.match(deferred.stdout, /Deferred candidates not written/);
  assert.match(deferred.stdout, /Candidate 2: not written/);
  assert.match(deferred.stdout, /Type: rule/);
  assert.match(deferred.stdout, /Scope: workspace/);
  assert.match(deferred.stdout, /Related IDs: release-foundation-checklist-lives-in-docs-release-md/);
  assert.match(deferred.stdout, /Inspect: engram load --id release-foundation-checklist-lives-in-docs-release-md/);
  assert.match(deferred.stdout, /Action: rerun with DEPENDS_ON: release-foundation-checklist-lives-in-docs-release-md/);
  assert.doesNotMatch(deferred.stdout, /knowledge\/release-foundation-checklist-lives-in-docs-release-md\.md/);
  assert.doesNotMatch(deferred.stdout, /Release foundation checklist lives in docs\/release\.md/);
  assert.doesNotMatch(deferred.stdout, /score/i);
  assert.doesNotMatch(deferred.stdout, /author:/i);
  assert.doesNotMatch(deferred.stdout, /^---$/m);
  assert.match(await readFile(path.join(workspaceMemoryRoot(cwd), 'knowledge', 'smoke-test-dashboard-url-is-https-grafana-example-test.md'), 'utf8'), /grafana\.example\.test/);
  await assert.rejects(readFile(path.join(workspaceMemoryRoot(cwd), 'rules', 'oauth-rotation-must-follow-the-release-foundation-checklist.md'), 'utf8'));
  const loaded = await runEngram(cwd, env, ['load', '--id', 'release-foundation-checklist-lives-in-docs-release-md']);
  assert.equal(loaded.code, 0, loaded.stderr);
  assert.match(loaded.stdout, /Release foundation checklist lives in docs\/release\.md/);
  const unloadedDeferred = await runEngram(cwd, env, ['load', 'DeferredOnlyNeedleXYZ']);
  assert.equal(unloadedDeferred.code, 0, unloadedDeferred.stderr);
  assert.match(unloadedDeferred.stdout, /loaded 0 memory files \/ 0 total related memories/);

  const saved = await runEngram(cwd, env, [
  'save-session', '--scope', 'workspace', '--force',
    'TYPE: rule | TEXT: DeferredOnlyNeedleXYZ must follow the release foundation checklist | DEPENDS_ON: release-foundation-checklist-lives-in-docs-release-md | LEVEL: advanced'
  ]);

  assert.equal(saved.code, 0, saved.stderr);
  assert.match(saved.stdout, /Forced save-session candidates/);
  assert.match(saved.stdout, /Saved ->/);
  assert.doesNotMatch(saved.stdout, /id:\s*undefined/i);
  assert.doesNotMatch(saved.stdout, /undefined\.md/i);
  assert.match(saved.stdout, /rules[\\/]+deferredonlyneedlexyz-must-follow-the-release-foundation-checklist\.md/i);
  const content = await readFile(path.join(workspaceMemoryRoot(cwd), 'rules', 'deferredonlyneedlexyz-must-follow-the-release-foundation-checklist.md'), 'utf8');
  assert.match(content, /^id: deferredonlyneedlexyz-must-follow-the-release-foundation-checklist$/m);
  assert.match(content, /depends_on: \[release-foundation-checklist-lives-in-docs-release-md\]/);
  assert.match(content, /level: advanced/);
  await rm(cwd, { recursive: true, force: true });
});

test('save-session force writes a PARENT candidate cleanly and stores parent frontmatter', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-parent-');
  await runEngram(cwd, env, ['inject']);
  // Two child memories.
  await runEngram(cwd, env, [
    'save-session', '--scope', 'workspace', '--force',
    [
      'TYPE: knowledge | TEXT: Auth rotation refreshes tokens before expiry.',
      'TYPE: knowledge | TEXT: Deploy gate forces a clean test run before release.'
    ].join('\n')
  ]);
  // Resolve child ids from index by matching content (mirrors how a parent would declare its children).
  const list = await runEngram(cwd, env, ['search', 'release OR auth OR deploy']);
  assert.equal(list.code, 0, list.stderr);
  const authRegex = /auth-rotation-refreshes-tokens-before-expiry/;
  const deployRegex = /deploy-gate-forces-a-clean-test-run-before-release/;
  assert.match(list.stdout, authRegex, `expected auth id in: ${list.stdout}`);
  assert.match(list.stdout, deployRegex, `expected deploy id in: ${list.stdout}`);
  const authId = 'auth-rotation-refreshes-tokens-before-expiry';
  const deployId = 'deploy-gate-forces-a-clean-test-run-before-release';

  // Now save a parent that declares those children via PARENT field.
  const parent = await runEngram(cwd, env, [
    'save-session', '--scope', 'workspace', '--force',
    `TYPE: knowledge | TEXT: Release foundation sets the gates every follow-up relies on. | PARENT: ${authId},${deployId}`
  ]);
  assert.equal(parent.code, 0, parent.stderr);
  assert.match(parent.stdout, /Saved ->/);
  // The parent should be written (not deferred as a duplicate of the children).
  assert.doesNotMatch(parent.stdout, /Deferred candidates not written/);
  assert.doesNotMatch(parent.stdout, /Action: rerun with DEPENDS_ON/);
  const parentFile = path.join(workspaceMemoryRoot(cwd), 'knowledge', 'release-foundation-sets-the-gates-every-follow-up-relies-on.md');
  const raw = await readFile(parentFile, 'utf8');
  assert.match(raw, new RegExp(`parent: \\[${authId}, ${deployId}\\]`));
  await rm(cwd, { recursive: true, force: true });
});

test('save-session force saves ready candidates and defers duplicate updates by id', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['inject']);
  const existing = path.join(workspaceMemoryRoot(cwd), 'knowledge', 'invoice-webhook-retry-baseline.md');
  await mkdir(path.dirname(existing), { recursive: true });
  await writeFile(existing, duplicateFixtureMemory({
    id: 'invoice-webhook-retry-baseline',
    content: 'Invoice webhook retry baseline records retry and backoff guidance for payment failures.'
  }));
  await runEngram(cwd, env, ['rebuild-index', 'workspace']);

  const deferred = await runEngram(cwd, env, [
  'save-session', '--scope', 'workspace', '--force',
    [
      'TYPE: knowledge | TEXT: Billing dashboards use nightly rollups.',
      'TYPE: knowledge | TEXT: Invoice retry backoff policy for webhook failures'
    ].join('\n')
  ]);

  assert.equal(deferred.code, 0, deferred.stderr);
  assert.match(deferred.stdout, /Forced save-session candidates/);
  assert.match(deferred.stdout, /Saved ->/);
  assert.match(deferred.stdout, /Candidate 2: not written/);
  assert.match(deferred.stdout, /Related IDs: invoice-webhook-retry-baseline/);
  assert.match(deferred.stdout, /Inspect: engram load --id invoice-webhook-retry-baseline/);
  assert.match(deferred.stdout, /Action: rerun with UPDATE: invoice-webhook-retry-baseline/);
  assert.doesNotMatch(deferred.stdout, /knowledge\/invoice-webhook-retry-baseline\.md/);
  assert.doesNotMatch(deferred.stdout, /Invoice webhook retry baseline records retry and backoff guidance/);
  assert.doesNotMatch(deferred.stdout, /score/i);
  assert.match(await readFile(path.join(workspaceMemoryRoot(cwd), 'knowledge', 'billing-dashboards-use-nightly-rollups.md'), 'utf8'), /Billing dashboards/);
  assert.doesNotMatch(await readFile(existing, 'utf8'), /Invoice retry backoff policy for webhook failures/);
  assert.match((await runEngram(cwd, env, ['stats'])).stdout, /Total: 2/);

  const updated = await runEngram(cwd, env, [
  'save-session', '--scope', 'workspace', '--force',
    'TYPE: knowledge | TEXT: Invoice retry backoff policy for webhook failures | UPDATE: invoice-webhook-retry-baseline'
  ]);

  assert.equal(updated.code, 0, updated.stderr);
  assert.match(updated.stdout, /Forced save-session candidates/);
  assert.match(updated.stdout, /Saved ->/);
  assert.match((await runEngram(cwd, env, ['stats'])).stdout, /Total: 2/);
  assert.match(await readFile(existing, 'utf8'), /Invoice retry backoff policy for webhook failures/);
  await rm(cwd, { recursive: true, force: true });
});

test('save-session force writes nothing when every candidate is deferred', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['inject']);
  await runEngram(cwd, env, [
    'save', 'knowledge', '--scope', 'workspace',
    'Release foundation checklist lives in docs/release.md'
  ], 'A\n');

  const deferred = await runEngram(cwd, env, [
    'save-session', '--scope', 'workspace', '--force',
    'TYPE: rule | TEXT: OAuth rotation must follow the release foundation checklist'
  ]);

  assert.equal(deferred.code, 0, deferred.stderr);
  assert.match(deferred.stdout, /No candidates written\. All candidates require related-memory review\./);
  assert.match(deferred.stdout, /Candidate 1: not written/);
  assert.doesNotMatch(deferred.stdout, /Saved ->/);
  assert.match((await runEngram(cwd, env, ['stats'])).stdout, /Total: 1/);
  await assert.rejects(readFile(path.join(workspaceMemoryRoot(cwd), 'rules', 'oauth-rotation-must-follow-the-release-foundation-checklist.md'), 'utf8'));
  await rm(cwd, { recursive: true, force: true });
});

test('rule variants render the active compact variant', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['inject']);
  await runEngram(cwd, env, ['save', 'rule', '--scope', 'workspace', 'Use pnpm for package management'], 'A\n');
  const raw = await readFile(path.join(workspaceMemoryRoot(cwd), 'rules', 'use-pnpm-for-package-management.md'), 'utf8');
  assert.doesNotMatch(raw, /## Rule Variants/);
  assert.doesNotMatch(raw, /### Light/);
  assert.doesNotMatch(raw, /### Balanced/);
  assert.doesNotMatch(raw, /### Strict/);
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

test('save preview shows derived rule variants on demand', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['inject']);

  const hidden = await runEngram(cwd, env, [
    'save', 'rule', '--scope', 'workspace',
    'Use pnpm for package management'
  ], 'C\n');

  assert.equal(hidden.code, 0, hidden.stderr);
  assert.match(hidden.stdout, /Rule variants: derived at render time \(light, balanced, strict\)\. Preview shows balanced\./);
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
  // New saves derive variants at render time, so the custom section is added by hand.
  assert.doesNotMatch(raw, /## Rule Variants/);
  const customized = `${raw.trimEnd()}\n\n## Rule Variants\n\n### Light\n\n- Mention pnpm only when dependency tooling is part of the task.\n\n### Balanced\n\n- Prefer pnpm unless the repo already enforces another package manager.\n\n### Strict\n\n- Block npm and yarn suggestions unless the human asks for them.\n`;
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

test('updating a rule with default stored variants drops the section and keeps rendering all three', async () => {
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

  const updated = await runEngram(cwd, env, [
    'save-session', '--scope', 'workspace', '--force',
    'TYPE: rule | TEXT: Use pnpm for installs in CI scripts | UPDATE: use-pnpm-for-installs'
  ]);
  assert.equal(updated.code, 0, updated.stderr);
  assert.match(updated.stdout, /Saved ->/);
  const next = await readFile(existing, 'utf8');
  assert.match(next, /Use pnpm for installs in CI scripts/);
  assert.doesNotMatch(next, /## Rule Variants/);
  assert.doesNotMatch(next, /### (Light|Balanced|Strict)/);

  assert.match((await runEngram(cwd, env, ['set-rule-variant', 'light'])).stdout, /light/);
  const light = await runEngram(cwd, env, ['load', 'pnpm installs']);
  assert.equal(light.code, 0, light.stderr);
  assert.match(light.stdout, /Consider this rule when the task context matches/);
  assert.match((await runEngram(cwd, env, ['set-rule-variant', 'strict'])).stdout, /strict/);
  const strict = await runEngram(cwd, env, ['load', 'pnpm installs']);
  assert.match(strict.stdout, /Treat this rule as mandatory/);
  assert.match((await runEngram(cwd, env, ['set-rule-variant', 'off'])).stdout, /off/);
  const off = await runEngram(cwd, env, ['load', 'pnpm installs']);
  assert.equal(off.code, 0, off.stderr);
  assert.match(off.stdout, /- Use pnpm for installs/);
  assert.doesNotMatch(off.stdout, /mandatory|Consider this rule/);
  await rm(cwd, { recursive: true, force: true });
});

test('a saved rule with custom variants keeps its stored section and a default-equal candidate stores none', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['inject']);
  const input = 'TYPE: rule | TEXT: Use pnpm for package installs. | LIGHT: Mention pnpm when dependency tooling matters. | BALANCED: Prefer pnpm for package installs unless the repo specifies another package manager. | STRICT: Block npm and yarn install suggestions unless the human explicitly asks.\n';
  const saved = await runEngram(cwd, env, ['save-session', '--scope', 'workspace', '--force'], input);
  assert.equal(saved.code, 0, saved.stderr);
  const custom = await readFile(path.join(workspaceMemoryRoot(cwd), 'rules', 'use-pnpm-for-package-installs.md'), 'utf8');
  assert.match(custom, /## Rule Variants/);

  const sameAsDefaults = 'TYPE: rule | TEXT: Run lint before every commit. | LIGHT: Consider this rule when the task context matches: Run lint before every commit. | BALANCED: Run lint before every commit. | STRICT: Treat this rule as mandatory unless the human explicitly overrides it: Run lint before every commit.\n';
  const second = await runEngram(cwd, env, ['save-session', '--scope', 'workspace', '--force'], sameAsDefaults);
  assert.equal(second.code, 0, second.stderr);
  const derived = await readFile(path.join(workspaceMemoryRoot(cwd), 'rules', 'run-lint-before-every-commit.md'), 'utf8');
  assert.doesNotMatch(derived, /## Rule Variants/);
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


test('new memories emit vNext authority revision and validity metadata', async () => {
  const { cwd, env } = await tempWorkspace('engram-save-vnext-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  const saved = await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', '--force', 'Node 24 is required']);
  assert.equal(saved.code, 0, saved.stderr);
  const body = await readFile(path.join(workspaceMemoryRoot(cwd), 'knowledge', 'node-24-is-required.md'), 'utf8');
  assert.match(body, /schema_version:\s*3/);
  assert.match(body, /authority:\s*reference/);
  assert.match(body, /revision:\s*1/);
  assert.match(body, /valid_from:\s*\d{4}-\d{2}-\d{2}/);
  assert.match(body, /last_confirmed:\s*\d{4}-\d{2}-\d{2}/);
  await rm(cwd, { recursive: true, force: true });
});

test('save-session from a trace wrapper attaches evidence and session provenance', async () => {
  const { cwd, env } = await tempWorkspace('engram-save-provenance-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  const root = workspaceMemoryRoot(cwd);
  const observed = await writeObservation(root, 'TYPE: knowledge | TEXT: Durable release fact.', '', {
    host: 'test', sessionId: 'session-7', eventTime: '2026-08-05T12:00:00.000Z'
  });
  const result = await runEngram(cwd, env, ['save-session', '--scope', 'workspace', '--force', '--file', observed.fullPath]);
  assert.equal(result.code, 0, result.stderr);
  const saved = await readFile(path.join(root, 'knowledge', 'durable-release-fact.md'), 'utf8');
  assert.match(saved, new RegExp(`evidence_refs:[\\s\\S]*${observed.traceId}`));
  assert.match(saved, /derived_from:[\s\S]*session-7/);
  await rm(cwd, { recursive: true, force: true });
});

test('memory update merges evidence refs and increments revision', async () => {
  const { cwd, env } = await tempWorkspace('engram-save-revision-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', '--force', 'Release gate requires tests']);
  await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', '--force', 'Release gate requires tests and health checks']);
  const body = await readFile(path.join(workspaceMemoryRoot(cwd), 'knowledge', 'release-gate-requires-tests.md'), 'utf8');
  assert.match(body, /revision:\s*2/);
  await rm(cwd, { recursive: true, force: true });
});

test('save-session trusts immutable trace text instead of editable wrapper text', async () => {
  const { cwd, env } = await tempWorkspace('engram-save-immutable-wrapper-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  const root = workspaceMemoryRoot(cwd);
  const observed = await writeObservation(root, 'TYPE: knowledge | TEXT: Immutable source fact.', '', {
    host: 'test', sessionId: 'session-source', eventTime: '2026-08-05T12:00:00.000Z'
  });
  const wrapper = await readFile(observed.fullPath, 'utf8');
  await writeFile(observed.fullPath, wrapper.replace('TYPE: knowledge | TEXT: Immutable source fact.', 'TYPE: knowledge | TEXT: Editable wrapper lie.'));

  const result = await runEngram(cwd, env, ['save-session', '--scope', 'workspace', '--force', '--file', observed.fullPath]);
  assert.equal(result.code, 0, result.stderr);
  assert.match(await readFile(path.join(root, 'knowledge', 'immutable-source-fact.md'), 'utf8'), /Immutable source fact/);
  await assert.rejects(() => readFile(path.join(root, 'knowledge', 'editable-wrapper-lie.md'), 'utf8'));
  await rm(cwd, { recursive: true, force: true });
});


test('save-session binds colliding trace ids to the wrapper scope', async () => {
  const { cwd, env } = await tempWorkspace('engram-save-scope-collision-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  const workspaceRoot = workspaceMemoryRoot(cwd);
  const globalRoot = env.ENGRAM_GLOBAL_DIR;
  const common = {
    traceId: 'tr_same_id', host: 'test', eventTime: '2026-08-05T12:00:00.000Z', source: 'observe',
    trustLevel: 'human', sensitivity: 'private', retention: '30d', redactedFindings: 0, removedInjectionLines: 0
  };
  await writeTrace(workspaceRoot, { ...common, sessionId: 'workspace-session', text: 'TYPE: knowledge | TEXT: Workspace collision fact.' });
  const globalTrace = (await writeTrace(globalRoot, { ...common, sessionId: 'global-session', text: 'TYPE: knowledge | TEXT: Global collision fact.' })).trace;
  const wrapper = path.join(globalRoot, 'inbox', 'global-collision.md');
  await mkdir(path.dirname(wrapper), { recursive: true });
  await writeFile(wrapper, `${renderFrontmatter({ authority: 'evidence', trace_id: globalTrace.traceId, source_hash: globalTrace.sourceHash })}\n# Observation\n\n## Raw Note\n\nTYPE: knowledge | TEXT: Editable lie.\n`);

  const result = await runEngram(cwd, env, ['save-session', '--force', '--file', wrapper]);
  assert.equal(result.code, 0, result.stderr);
  assert.match(await readFile(path.join(globalRoot, 'knowledge', 'global-collision-fact.md'), 'utf8'), /Global collision fact/);
  await assert.rejects(() => readFile(path.join(workspaceRoot, 'knowledge', 'workspace-collision-fact.md'), 'utf8'));
  await assert.rejects(() => readFile(path.join(workspaceRoot, 'knowledge', 'global-collision-fact.md'), 'utf8'));
  await rm(cwd, { recursive: true, force: true });
});

const MEDIATR_CANDIDATE = 'TYPE: knowledge | TEXT: API layer uses MediatR | DIRECTIVE: Route commands through MediatR | APPLIES_TO: src/Api/** | OBJECTIVE: durable | SCOPE: workspace';

test('candidate grammar parses OBJECTIVE, SCOPE, APPLIES_TO, and DIRECTIVE', () => {
  const candidate = parseMemoryCandidate(MEDIATR_CANDIDATE);
  assert.equal(candidate.type, 'knowledge');
  assert.equal(candidate.text, 'API layer uses MediatR');
  assert.equal(candidate.directive, 'Route commands through MediatR');
  assert.deepEqual(candidate.appliesTo, ['src/Api/**']);
  assert.equal(candidate.objective, 'durable');
  assert.equal(candidate.scope, 'workspace');
  // Pipe field names are case-insensitive, globs split on commas (whitespace only when there is no comma), and `./`
  // and `\` are normalized.
  const mixed = parseMemoryCandidate('type: knowledge | text: Web uses signals | applies to: ./src/web/**, src\\app/**, src/My Folder/** | objective: TASK | scope: Global');
  assert.deepEqual(mixed.appliesTo, ['src/web/**', 'src/app/**', 'src/My Folder/**']);
  assert.deepEqual(parseMemoryCandidate('TYPE: knowledge | TEXT: Web uses signals | APPLIES_TO: src/web/** src/lib/*.ts').appliesTo, ['src/web/**', 'src/lib/*.ts']);
  assert.equal(mixed.objective, 'task');
  assert.equal(mixed.scope, 'global');
  // Omitted fields stay absent: objective defaults to durable and scope to the command scope.
  const plain = parseMemoryCandidate('TYPE: knowledge | TEXT: API layer uses MediatR');
  for (const field of ['objective', 'scope', 'appliesTo', 'directive']) assert.equal(field in plain, false, field);
  // The multi-line grammar accepts the same fields.
  const [lined] = parseMemoryCandidates(['TYPE: knowledge', 'TEXT: API layer uses MediatR', 'DIRECTIVE: Route commands through MediatR', 'APPLIES_TO: src/Api/**', 'SCOPE: global', 'OBJECTIVE: task'].join('\n'));
  assert.equal(lined.text, 'API layer uses MediatR');
  assert.equal(lined.directive, 'Route commands through MediatR');
  assert.deepEqual(lined.appliesTo, ['src/Api/**']);
  assert.equal(lined.scope, 'global');
  assert.equal(lined.objective, 'task');
});

test('candidate grammar rejects long directives, unsafe globs, and unknown field values', () => {
  const long = 'Route every command through MediatR '.repeat(5);
  assert.ok(long.trim().length > 160);
  assert.throws(() => parseMemoryCandidate(`TYPE: knowledge | TEXT: API layer uses MediatR | DIRECTIVE: ${long}`), /DIRECTIVE must be <= 160 characters/);
  for (const glob of ['../secrets/**', 'src/../../etc/*', '/etc/**', 'C:/Users/**', '\\\\server\\share\\**', '~/notes/**']) {
    assert.throws(() => parseMemoryCandidate(`TYPE: knowledge | TEXT: API layer uses MediatR | APPLIES_TO: ${glob}`), /APPLIES_TO/, glob);
  }
  const many = Array.from({ length: 9 }, (_, index) => `src/m${index}/**`).join(', ');
  assert.throws(() => parseMemoryCandidate(`TYPE: knowledge | TEXT: API layer uses MediatR | APPLIES_TO: ${many}`), /APPLIES_TO accepts at most 8 globs/);
  assert.throws(() => parseMemoryCandidate('TYPE: knowledge | TEXT: API layer uses MediatR | OBJECTIVE: someday'), /OBJECTIVE must be task or durable; got: someday/);
  assert.throws(() => parseMemoryCandidate('TYPE: knowledge | TEXT: API layer uses MediatR | SCOPE: both'), /SCOPE must be workspace or global; got: both/);
});

test('save-session writes directive and applies_to frontmatter and rejects an over-long DIRECTIVE', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['inject']);
  const saved = await runEngram(cwd, env, ['save-session', '--scope', 'workspace'], `${MEDIATR_CANDIDATE}\nA\n`);
  assert.equal(saved.code, 0, saved.stderr);
  assert.match(saved.stdout, /Scope: workspace\n/);
  const raw = await readFile(path.join(workspaceMemoryRoot(cwd), 'knowledge', 'api-layer-uses-mediatr.md'), 'utf8');
  assert.match(raw, /^directive: "Route commands through MediatR"$/m);
  assert.match(raw, /^applies_to: \["src\/Api\/\*\*"\]$/m);
  assert.doesNotMatch(raw, /^objective:/m);
  assert.doesNotMatch(raw, /^tier:/m);

  const long = `TYPE: knowledge | TEXT: Billing export uses CSV | DIRECTIVE: ${'Always stream billing exports as CSV rows '.repeat(5)}`;
  const rejected = await runEngram(cwd, env, ['save-session', '--scope', 'workspace'], `${long}\nA\n`);
  assert.notEqual(rejected.code, 0);
  assert.match(rejected.stderr, /DIRECTIVE must be <= 160 characters/);
  await assert.rejects(readFile(path.join(workspaceMemoryRoot(cwd), 'knowledge', 'billing-export-uses-csv.md'), 'utf8'));
  await rm(cwd, { recursive: true, force: true });
});

test('a SCOPE: global candidate saves to global under a workspace command scope and the preview shows it', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['inject']);
  const globalRoot = env.ENGRAM_GLOBAL_DIR;
  const input = [
    'TYPE: knowledge | TEXT: Shared design tokens live in the brand package | SCOPE: global',
    'TYPE: knowledge | TEXT: Billing export lives in src/billing | OBJECTIVE: task',
    'TYPE: knowledge | TEXT: Workspace builds use turbo | SCOPE: workspace'
  ].join('\n');

  const discarded = await runEngram(cwd, env, ['save-session', '--scope', 'workspace'], `${input}\nC\n`);
  assert.equal(discarded.code, 0, discarded.stderr);
  assert.match(discarded.stdout, /Candidate: 1\nAction: Add new memory\nType: knowledge\nScope: global \(candidate SCOPE: global overrides command scope workspace\)\n/);
  assert.match(discarded.stdout, /Candidate: 2\nAction: Add new memory\nType: knowledge\nScope: workspace\nObjective: task\n/);
  assert.match(discarded.stdout, /Candidate: 3\nAction: Add new memory\nType: knowledge\nScope: workspace\n/);
  await assert.rejects(readFile(path.join(globalRoot, 'knowledge', 'shared-design-tokens-live-in-the-brand-package.md'), 'utf8'));

  const saved = await runEngram(cwd, env, ['save-session', '--scope', 'workspace'], `${input}\nA\n`);
  assert.equal(saved.code, 0, saved.stderr);
  assert.match(await readFile(path.join(globalRoot, 'knowledge', 'shared-design-tokens-live-in-the-brand-package.md'), 'utf8'), /scope: global/);
  await assert.rejects(readFile(path.join(workspaceMemoryRoot(cwd), 'knowledge', 'shared-design-tokens-live-in-the-brand-package.md'), 'utf8'));
  assert.match(await readFile(path.join(workspaceMemoryRoot(cwd), 'knowledge', 'workspace-builds-use-turbo.md'), 'utf8'), /scope: workspace/);
  await assert.rejects(readFile(path.join(globalRoot, 'knowledge', 'workspace-builds-use-turbo.md'), 'utf8'));

  // Single saves honour the candidate scope too, and global writes keep the sensitive-data guard.
  const single = await runEngram(cwd, env, ['save', '--scope', 'workspace', 'TYPE: knowledge | TEXT: Lint rules ship from the tooling repository | SCOPE: global'], 'A\n');
  assert.equal(single.code, 0, single.stderr);
  assert.match(single.stdout, /Scope: global \(candidate SCOPE: global overrides command scope workspace\)/);
  const globalFiles = await readdir(path.join(globalRoot, 'knowledge'));
  const globalBodies = await Promise.all(globalFiles.map((name) => readFile(path.join(globalRoot, 'knowledge', name), 'utf8')));
  assert.ok(globalBodies.some((body) => /Lint rules ship from the tooling repository/.test(body)));
  const secret = await runEngram(cwd, env, ['save-session', '--scope', 'global', '--force'], 'TYPE: knowledge | TEXT: Shared deploys read DEPLOY_TOKEN=abc123fixture | SCOPE: global\n');
  assert.notEqual(secret.code, 0);
  assert.match(secret.stderr, /Sensitive data blocked/);
  await rm(cwd, { recursive: true, force: true });
});

test('multi-line prose named like D15 fields stays content; only the uppercase field form parses', () => {
  const applies = parseMemoryCandidates('Type: rule\nAlways validate inputs.\nApplies to: all backend services');
  assert.equal(applies.length, 1);
  assert.equal('appliesTo' in applies[0], false);
  assert.match(applies[0].text, /Always validate inputs\.\nApplies to: all backend services/);
  const objective = parseMemoryCandidate('Objective: the billing module reduces invoice latency', { explicitType: 'knowledge' });
  assert.equal(objective.text, 'Objective: the billing module reduces invoice latency');
  assert.equal('objective' in objective, false);
  const workflow = parseMemoryCandidate(['TYPE: workflow', 'Scope: the release train only', 'Objective: ship weekly', 'Directive: prose, not a field', 'First run tests, then tag the release.'].join('\n'));
  assert.equal(workflow.type, 'skill');
  for (const field of ['scope', 'objective', 'directive']) assert.equal(field in workflow, false, field);
  assert.match(workflow.text, /Scope: the release train only\nObjective: ship weekly\nDirective: prose, not a field/);
  // Uppercase OBJECTIVE/SCOPE lines with a non-enum value are content too, not an error.
  const loose = parseMemoryCandidate('TYPE: knowledge\nOBJECTIVE: ship weekly\nSCOPE: the billing team\nRelease notes go to the billing channel.');
  assert.equal('objective' in loose, false);
  assert.equal('scope' in loose, false);
  assert.match(loose.text, /^OBJECTIVE: ship weekly\nSCOPE: the billing team\n/);
  // An agent echoing the guidance header does not break the batch.
  const echoed = parseMemoryCandidates('Current objective: add billing export\nTYPE: knowledge | TEXT: Billing export uses CSV | OBJECTIVE: task');
  assert.ok(echoed.some((candidate) => candidate.text === 'Billing export uses CSV' && candidate.objective === 'task'));
  // Two different SCOPE values are ambiguous; the same value twice is fine.
  assert.throws(() => parseMemoryCandidate('TYPE: knowledge | TEXT: x fact | SCOPE: global | SCOPE: workspace'), /duplicate SCOPE with different values: global, workspace/);
  assert.throws(() => parseMemoryCandidate('TYPE: knowledge\nSCOPE: global\nSCOPE: workspace\nx fact'), /duplicate SCOPE/);
  assert.equal(parseMemoryCandidate('TYPE: knowledge | TEXT: x fact | SCOPE: global | SCOPE: GLOBAL').scope, 'GLOBAL'.toLowerCase());
});

test('save keeps prose that starts with Objective: as memory text', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['inject']);
  const saved = await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', 'Objective: the billing module reduces invoice latency'], 'A\n');
  assert.equal(saved.code, 0, saved.stderr);
  const files = await readdir(path.join(workspaceMemoryRoot(cwd), 'knowledge'));
  const file = files.find((name) => name.includes('billing-module-reduces-invoice-latency'));
  assert.ok(file, files.join(', '));
  assert.match(await readFile(path.join(workspaceMemoryRoot(cwd), 'knowledge', file), 'utf8'), /Objective: the billing module reduces invoice latency/);
  await rm(cwd, { recursive: true, force: true });
});

test('--force never writes a candidate SCOPE outside the command scope', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['inject']);
  const globalRoot = env.ENGRAM_GLOBAL_DIR;
  const globalFile = (id) => path.join(globalRoot, 'knowledge', `${id}.md`);
  const input = 'TYPE: knowledge | TEXT: Shared design tokens live in the brand package | SCOPE: global\nTYPE: knowledge | TEXT: Workspace builds use turbo\n';

  const session = await runEngram(cwd, env, ['save-session', '--scope', 'workspace', '--force'], input);
  assert.equal(session.code, 0, session.stderr);
  assert.match(session.stdout, /Candidate 1 requests SCOPE: global outside command scope workspace; not written\. Rerun without --force to review it, or with --scope global\|both\./);
  await assert.rejects(readFile(globalFile('shared-design-tokens-live-in-the-brand-package'), 'utf8'));
  await assert.rejects(readFile(path.join(workspaceMemoryRoot(cwd), 'knowledge', 'shared-design-tokens-live-in-the-brand-package.md'), 'utf8'));
  assert.match(await readFile(path.join(workspaceMemoryRoot(cwd), 'knowledge', 'workspace-builds-use-turbo.md'), 'utf8'), /scope: workspace/);

  const single = await runEngram(cwd, env, ['save', '--force', '--scope', 'workspace', 'TYPE: knowledge | TEXT: Shared lint config lives in the brand package | SCOPE: global']);
  assert.equal(single.code, 0, single.stderr);
  assert.match(single.stdout, /No file written\.[\s\S]*Candidate 1 requests SCOPE: global outside command scope workspace/);
  await assert.rejects(readFile(globalFile('shared-lint-config-lives-in-the-brand-package'), 'utf8'));

  const meta = await runEngram(cwd, env, ['metacognize', '--workspace', '--force', 'TYPE: knowledge | TEXT: Shared icon set lives in the brand package | SCOPE: global']);
  assert.equal(meta.code, 0, meta.stderr);
  assert.match(meta.stdout, /Candidate 1 requests SCOPE: global outside command scope workspace; not written/);
  await assert.rejects(readFile(globalFile('shared-icon-set-lives-in-the-brand-package'), 'utf8'));

  // Inside the command scope, force still honours the candidate scope.
  const both = await runEngram(cwd, env, ['save-session', '--scope', 'both', '--force'], 'TYPE: knowledge | TEXT: Shared fonts live in the brand package | SCOPE: global\n');
  assert.equal(both.code, 0, both.stderr);
  assert.doesNotMatch(both.stdout, /requests SCOPE/);
  assert.match(await readFile(globalFile('shared-fonts-live-in-the-brand-package'), 'utf8'), /scope: global/);
  await assert.rejects(readFile(path.join(workspaceMemoryRoot(cwd), 'knowledge', 'shared-fonts-live-in-the-brand-package.md'), 'utf8'));
  const global = await runEngram(cwd, env, ['save-session', '--scope', 'global', '--force'], 'TYPE: knowledge | TEXT: Kubernetes manifests are rendered with kustomize overlays | SCOPE: global\n');
  assert.equal(global.code, 0, global.stderr);
  assert.match(await readFile(globalFile('kubernetes-manifests-are-rendered-with-kustomize-overlays'), 'utf8'), /scope: global/, global.stdout);
  await rm(cwd, { recursive: true, force: true });
});

// E16 save verdicts: ADD / UPDATE / SUPERSEDE / NOOP lines in previews, NOOP skipping, and the fail-closed SUPERSEDE paths.
const PNPM_RULE_ID = 'use-pnpm-for-package-installs';
const SUPERSEDE_CANDIDATE = 'TYPE: rule | TEXT: Use npm for package installs. | DIRECTIVE: Use npm for package installs | APPLIES_TO: package.json';

async function writePnpmRule(cwd, env) {
  const file = path.join(workspaceMemoryRoot(cwd), 'rules', `${PNPM_RULE_ID}.md`);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `---
id: ${PNPM_RULE_ID}
type: rule
scope: workspace
tags: [pnpm, package, installs]
created: 2026-06-05
updated: 2026-06-05
author: test@example.com
source: manual
confidence: high
directive: Use pnpm for package installs
applies_to: [package.json]
---

# Use pnpm for package installs

## Content

- Use pnpm for package installs.
`);
  await runEngram(cwd, env, ['rebuild-index', 'workspace']);
  await runEngram(cwd, env, ['rehash', 'workspace']);
  return file;
}

test('save preview prints Verdict: ADD when no related memory exists', async () => {
  const { cwd, env } = await tempWorkspace('engram-verdict-add-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  const proposed = await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', 'Quarterly audit exports land in the finance bucket'], 'C\n');
  assert.equal(proposed.code, 0, proposed.stderr);
  assert.match(proposed.stdout, /File: knowledge\/.+\nVerdict: ADD\n/);
  assert.equal((proposed.stdout.match(/^Verdict:/gm) ?? []).length, 1);
  assert.match((await runEngram(cwd, env, ['stats'])).stdout, /Total: 0/);
  await rm(cwd, { recursive: true, force: true });
});

test('save preview prints Verdict: UPDATE for an automatic upsert', async () => {
  const { cwd, env } = await tempWorkspace('engram-verdict-update-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', 'Frontend uses React and pnpm'], 'A\n');
  const proposed = await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', 'React frontend uses pnpm workspace scripts'], 'C\n');
  assert.equal(proposed.code, 0, proposed.stderr);
  assert.match(proposed.stdout, /Action: Update existing memory/);
  assert.match(proposed.stdout, /File: knowledge\/frontend-uses-react-and-pnpm\.md\nVerdict: UPDATE frontend-uses-react-and-pnpm\n/);
  await rm(cwd, { recursive: true, force: true });
});

test('save-session NOOP duplicate is skipped on A and written when selected by number', async () => {
  const { cwd, env } = await tempWorkspace('engram-verdict-noop-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  // The id, tags and Content summary are exactly the candidate words, so the related score is 1.00; the long Example
  // section only dilutes the automatic-upsert match, so the candidate stays an ADD beside a duplicate.
  const filler = Array.from({ length: 200 }, (_, index) => `unrelated-${index}`).join(' ');
  const existing = path.join(workspaceMemoryRoot(cwd), 'knowledge', 'invoice-retry-policy.md');
  await mkdir(path.dirname(existing), { recursive: true });
  await writeFile(existing, `---
id: invoice-retry-policy
type: knowledge
scope: workspace
tags: [retry, backoff]
created: 2026-06-05
updated: 2026-06-05
author: test@example.com
source: manual
confidence: high
---

# Invoice retry policy

## Content

- retry backoff

## Example

${filler}
`);
  await runEngram(cwd, env, ['rebuild-index', 'workspace']);
  await runEngram(cwd, env, ['rehash', 'workspace']);
  const candidate = 'TYPE: knowledge | TEXT: knowledge invoice-retry-policy retry backoff';

  const skipped = await runEngram(cwd, env, ['save-session', '--scope', 'workspace', candidate], 'A\n');
  assert.equal(skipped.code, 0, skipped.stderr);
  assert.match(skipped.stdout, /Verdict: NOOP duplicate of invoice-retry-policy \(skipped unless selected\)/);
  assert.match(skipped.stdout, /Skipped candidate 1: NOOP duplicate of invoice-retry-policy/);
  assert.doesNotMatch(skipped.stdout, /Saved ->/);
  assert.match((await runEngram(cwd, env, ['stats'])).stdout, /Total: 1/);

  const selected = await runEngram(cwd, env, ['save-session', '--scope', 'workspace', candidate], 'A 1\n');
  assert.equal(selected.code, 0, selected.stderr);
  assert.match(selected.stdout, /Saved ->/);
  assert.match((await runEngram(cwd, env, ['stats'])).stdout, /Total: 2/);
  await rm(cwd, { recursive: true, force: true });
});

test('approving a SUPERSEDE marks the old memory superseded and load drops it', async () => {
  const { cwd, env } = await tempWorkspace('engram-verdict-supersede-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  const oldFile = await writePnpmRule(cwd, env);

  const approved = await runEngram(cwd, env, ['save-session', '--scope', 'workspace', SUPERSEDE_CANDIDATE], 'A\n');
  assert.equal(approved.code, 0, approved.stderr);
  assert.match(approved.stdout, new RegExp(`Verdict: SUPERSEDE ${PNPM_RULE_ID} \\(approving marks it superseded\\)`));
  assert.match(approved.stdout, /Superseded use-pnpm-for-package-installs -> use-npm-for-package-installs/);
  const newRaw = await readFile(path.join(workspaceMemoryRoot(cwd), 'rules', 'use-npm-for-package-installs.md'), 'utf8');
  assert.match(newRaw, /^supersedes: \[use-pnpm-for-package-installs\]$/m);
  const oldRaw = await readFile(oldFile, 'utf8');
  assert.match(oldRaw, /^lifecycle: superseded$/m);
  assert.match(oldRaw, /^superseded_by: use-npm-for-package-installs$/m);
  const verified = await runEngram(cwd, env, ['verify', 'workspace']);
  assert.equal(verified.code, 0, verified.stdout + verified.stderr);
  const loaded = await runEngram(cwd, env, ['load', 'package installs']);
  assert.doesNotMatch(loaded.stdout, /use-pnpm-for-package-installs/);
  assert.match(loaded.stdout, /use-npm-for-package-installs/);
  await rm(cwd, { recursive: true, force: true });
});

test('a declined SUPERSEDE leaves both memories untouched', async () => {
  const { cwd, env } = await tempWorkspace('engram-verdict-supersede-decline-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  const oldFile = await writePnpmRule(cwd, env);
  const before = await readFile(oldFile, 'utf8');
  const declined = await runEngram(cwd, env, ['save-session', '--scope', 'workspace', SUPERSEDE_CANDIDATE], 'C\n');
  assert.equal(declined.code, 0, declined.stderr);
  assert.match(declined.stdout, /Verdict: SUPERSEDE/);
  assert.equal(await readFile(oldFile, 'utf8'), before);
  await assert.rejects(readFile(path.join(workspaceMemoryRoot(cwd), 'rules', 'use-npm-for-package-installs.md'), 'utf8'));
  await rm(cwd, { recursive: true, force: true });
});

test('save-session --force never applies SUPERSEDE without a preview', async () => {
  const { cwd, env } = await tempWorkspace('engram-verdict-supersede-force-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  const oldFile = await writePnpmRule(cwd, env);
  const before = await readFile(oldFile);
  const forced = await runEngram(cwd, env, ['save-session', '--scope', 'workspace', '--force', SUPERSEDE_CANDIDATE]);
  assert.equal(forced.code, 0, forced.stderr);
  assert.match(forced.stdout, /Candidate 1: not written/);
  assert.match(forced.stdout, /Action: rerun without --force to review SUPERSEDE use-pnpm-for-package-installs/);
  assert.deepEqual(await readFile(oldFile), before);
  await assert.rejects(readFile(path.join(workspaceMemoryRoot(cwd), 'rules', 'use-npm-for-package-installs.md'), 'utf8'));

  const single = await runEngram(cwd, env, ['save', '--scope', 'workspace', '--force', SUPERSEDE_CANDIDATE]);
  assert.equal(single.code, 0, single.stderr);
  assert.match(single.stdout, /No file written\./);
  assert.match(single.stdout, /Action: rerun without --force to review SUPERSEDE use-pnpm-for-package-installs/);
  assert.deepEqual(await readFile(oldFile), before);
  await assert.rejects(readFile(path.join(workspaceMemoryRoot(cwd), 'rules', 'use-npm-for-package-installs.md'), 'utf8'));
  await rm(cwd, { recursive: true, force: true });
});
