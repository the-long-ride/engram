import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { runEngram, tempWorkspace, workspaceMemoryRoot } from '../helpers.mjs';
import { testMemory } from './fixtures.mjs';
import { braceExpansionCount, expandBraces, hostGlobs, parseNativeRuleMarker } from '../../dist/core/integrations/native-rules.js';
import { entriesForPath } from '../../dist/core/memory/path-triggers.js';

const CLAUDE_DIR = path.join('.claude', 'rules', 'engram');
const CURSOR_DIR = path.join('.cursor', 'rules', 'engram');

function pathMemory(id, appliesTo, content, extra = '') {
  return testMemory({ id, tags: ['pathscope'], content }).replace('confidence: high\n', `confidence: high\napplies_to: [${appliesTo.join(', ')}]\n${extra}`);
}

/** rebuild-index, rehash, rebuild-index: the second index pass sees the fresh hashes, so rule files can be emitted. */
async function reindex(cwd, env) {
  await runEngram(cwd, env, ['rebuild-index']);
  await runEngram(cwd, env, ['rehash', 'workspace']);
  await runEngram(cwd, env, ['rehash', 'global']);
  return runEngram(cwd, env, ['rebuild-index']);
}

async function pathWorkspace(prefix, count = 1) {
  const { cwd, env: base } = await tempWorkspace(prefix);
  const agentHome = path.join(cwd, 'agent-home');
  const env = { ...base, ENGRAM_AGENT_HOME: agentHome, ENGRAM_AGENT_CONFIG_HOME: path.join(cwd, 'agent-config') };
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  const dir = path.join(workspaceMemoryRoot(cwd), 'knowledge');
  await mkdir(dir, { recursive: true });
  for (let i = 0; i < count; i += 1) {
    await writeFile(path.join(dir, `api-path-rule-${i}.md`), pathMemory(`api-path-rule-${i}`, ['src/api/**'], `Path body ${i}: validate request DTOs at the API edge.`));
  }
  await writeFile(path.join(dir, 'unscoped-rule.md'), testMemory({ id: 'unscoped-rule', tags: ['unscoped'], content: 'Unscoped body: no path trigger.' }));
  await reindex(cwd, env);
  await runEngram(cwd, env, ['set-read', 'auto']);
  await runEngram(cwd, env, ['set-proof', 'compact']);
  return { cwd, env, agentHome };
}

const ruleDir = (cwd, host = 'claude') => path.join(cwd, host === 'claude' ? CLAUDE_DIR : CURSOR_DIR);
const ruleFiles = async (dir) => (await readdir(dir).catch(() => [])).sort();
const readSettings = async (cwd) => JSON.parse(await readFile(path.join(cwd, '.claude', 'settings.json'), 'utf8'));
const managedIn = (settings, event) => (settings.hooks?.[event] ?? []).filter((group) => group.hooks.some((hook) => hook.name === 'engram-auto-load'));

async function hookJson(cwd, env, payload) {
  const result = await runEngram(cwd, env, ['agent-hook', '--host', 'claude'], `${JSON.stringify(payload)}\n`);
  assert.equal(result.code, 0, result.stderr);
  return result.stdout.trim() ? JSON.parse(result.stdout) : {};
}

const additionalContext = (output) => output?.hookSpecificOutput?.additionalContext ?? '';
const readUsage = async (cwd) => JSON.parse(await readFile(path.join(workspaceMemoryRoot(cwd), 'usage.json'), 'utf8').catch(() => '{}'));

test('hostGlobs translates Engram applies_to semantics', () => {
  assert.deepEqual(hostGlobs(['*.md']), ['**/*.md']);
  assert.deepEqual(hostGlobs(['src/api/**']), ['src/api/**']);
  assert.deepEqual(hostGlobs(['docs/']), ['**/docs/**']);
  assert.deepEqual(hostGlobs(['package.json']), ['**/package.json', 'package.json/**']);
  assert.deepEqual(hostGlobs(['.\\src\\*.ts']), ['**/src/*.ts']);
  assert.deepEqual(hostGlobs(['**/*.sql', '/src/web/**', '**']), ['**/*.sql', 'src/web/**', '**']);
  assert.deepEqual(hostGlobs(['*.md', '*.md']), ['**/*.md'], 'duplicates collapse');
  assert.deepEqual(expandBraces('src/*.{ts,tsx}', 1000), ['src/*.ts', 'src/*.tsx']);
  assert.equal(braceExpansionCount('{a,b}/{c,d}/*.{ts,tsx}'), 8);
  assert.equal(braceExpansionCount('src/**'), 1);
  assert.equal(expandBraces('{a,b}/{c,d}/*.{ts,tsx}', 4), undefined, 'over the limit');
  assert.equal(expandBraces('src/{a,{b,c}}', 1000), undefined, 'nested braces are not expressible');
  assert.equal(expandBraces('src/{a,b', 1000), undefined, 'unbalanced braces');
  assert.deepEqual(expandBraces('src/**', 1000), ['src/**']);
});

test('parseNativeRuleMarker reads the first line after the frontmatter only', () => {
  const marker = '<!-- engram:workspace:knowledge/a b.md sha:1a2b3c4d -->';
  assert.deepEqual(parseNativeRuleMarker(`---\r\npaths:\r\n  - "x"\r\n---\r\n${marker}\r\nbody\r\n`), { key: 'workspace:knowledge/a b.md', sha: '1a2b3c4d' });
  assert.equal(parseNativeRuleMarker(`# human rule\n${marker}\n`), undefined);
  assert.equal(parseNativeRuleMarker('---\npaths: []\n---\nno marker\n'), undefined);
});

test('link claude writes paths-only frontmatter and a marker per applies_to memory', async () => {
  const { cwd, env } = await pathWorkspace('engram-native-claude-');
  const linked = await runEngram(cwd, env, ['link', 'claude']);
  assert.equal(linked.code, 0, linked.stderr);
  assert.match(linked.stdout, /native rules claude: \.claude\/rules\/engram/);
  assert.deepEqual(await ruleFiles(ruleDir(cwd)), ['api-path-rule-0.md']);
  const text = await readFile(path.join(ruleDir(cwd), 'api-path-rule-0.md'), 'utf8');
  assert.match(text, /^---\npaths:\n  - "src\/api\/\*\*"\n---\n<!-- engram:workspace:knowledge\/api-path-rule-0\.md sha:[0-9a-f]{8} -->\n### api-path-rule-0 \[/);
  assert.equal(text.split('---\n').length, 3, 'paths is the only frontmatter block');
  assert.doesNotMatch(text, /\r/);
  assert.match(text, /Path body 0/);
  assert.ok(text.endsWith('\n') && !text.endsWith('\n\n'));
  assert.deepEqual(parseNativeRuleMarker(text)?.key, 'workspace:knowledge/api-path-rule-0.md');
  await rm(cwd, { recursive: true, force: true });
});

test('link cursor writes .mdc rules with description, globs, alwaysApply false', async () => {
  const { cwd, env } = await pathWorkspace('engram-native-cursor-');
  await writeFile(path.join(workspaceMemoryRoot(cwd), 'knowledge', 'brace-rule.md'), pathMemory('brace-rule', ['"src/*.{ts,tsx}"'], 'Brace body: keep exports named.'));
  await reindex(cwd, env);
  const linked = await runEngram(cwd, env, ['link', 'cursor']);
  assert.equal(linked.code, 0, linked.stderr);
  assert.deepEqual(await ruleFiles(ruleDir(cwd, 'cursor')), ['api-path-rule-0.mdc', 'brace-rule.mdc']);
  const text = await readFile(path.join(ruleDir(cwd, 'cursor'), 'api-path-rule-0.mdc'), 'utf8');
  assert.match(text, /^---\ndescription: "Engram memory api-path-rule-0: /);
  assert.match(text, /\nglobs: src\/api\/\*\*\nalwaysApply: false\n---\n<!-- engram:workspace:knowledge\/api-path-rule-0\.md sha:[0-9a-f]{8} -->\n### api-path-rule-0 \[/);
  const braces = await readFile(path.join(ruleDir(cwd, 'cursor'), 'brace-rule.mdc'), 'utf8');
  assert.match(braces, /\nglobs: \*\*\/src\/\*\.ts,\*\*\/src\/\*\.tsx\n/, 'braces are expanded into comma-separated globs');
  const bootstrap = await readFile(path.join(cwd, '.cursor', 'rules', 'engram.mdc'), 'utf8');
  assert.match(bootstrap, /alwaysApply: true/, 'the bootstrap rule is untouched');
  await rm(cwd, { recursive: true, force: true });
});

test('regeneration is idempotent', async () => {
  const { cwd, env } = await pathWorkspace('engram-native-idempotent-');
  assert.equal((await runEngram(cwd, env, ['link', 'claude'])).code, 0);
  const file = path.join(ruleDir(cwd), 'api-path-rule-0.md');
  const before = (await stat(file)).mtimeMs;
  await new Promise((resolve) => setTimeout(resolve, 30));
  const again = await runEngram(cwd, env, ['link', 'claude']);
  assert.match(again.stdout, /Written: 0/);
  assert.match(again.stdout, /Updated: 0/);
  const sync = await runEngram(cwd, env, ['sync']);
  assert.equal(sync.code, 0, sync.stderr);
  assert.match(sync.stdout, /Native rules: claude 0 written, 0 removed, 1 unchanged/);
  const rebuilt = await runEngram(cwd, env, ['rebuild-index']);
  assert.match(rebuilt.stdout, /Unchanged: 1/);
  assert.equal((await stat(file)).mtimeMs, before, 'no rewrite when nothing changed');
  await rm(cwd, { recursive: true, force: true });
});

test('stale marked files are removed and unmarked files are preserved', async () => {
  const { cwd, env } = await pathWorkspace('engram-native-stale-');
  assert.equal((await runEngram(cwd, env, ['link', 'claude'])).code, 0);
  const dir = ruleDir(cwd);
  const human = '# Human rule\nKeep me.\n';
  await writeFile(path.join(dir, 'human.md'), human);
  await writeFile(path.join(dir, 'ghost.md'), '---\npaths:\n  - "x/**"\n---\n<!-- engram:workspace:knowledge/ghost.md sha:00000000 -->\nGhost.\n');
  await rm(path.join(workspaceMemoryRoot(cwd), 'knowledge', 'api-path-rule-0.md'));
  await runEngram(cwd, env, ['rebuild-index']);
  await runEngram(cwd, env, ['rehash', 'workspace']);
  const rebuilt = await runEngram(cwd, env, ['rebuild-index']);
  assert.equal(rebuilt.code, 0, rebuilt.stderr);
  assert.deepEqual(await ruleFiles(dir), ['human.md']);
  assert.equal(await readFile(path.join(dir, 'human.md'), 'utf8'), human);

  // A memory whose slug is `human` never overwrites the unmarked file.
  await writeFile(path.join(workspaceMemoryRoot(cwd), 'knowledge', 'human.md'), pathMemory('human', ['src/human/**'], 'Human memory body.'));
  const collided = await reindex(cwd, env);
  assert.match(collided.stdout, /unmarked file exists/);
  assert.equal(await readFile(path.join(dir, 'human.md'), 'utf8'), human);
  await rm(cwd, { recursive: true, force: true });
});

test('working-tier and global memories never reach the committed rule folders', async () => {
  const { cwd, env, agentHome } = await pathWorkspace('engram-native-scope-');
  const workingDir = path.join(workspaceMemoryRoot(cwd), 'working', 'knowledge');
  await mkdir(workingDir, { recursive: true });
  await writeFile(path.join(workingDir, 'task-x.md'), pathMemory('task-x', ['src/**'], 'Working body task-x.', 'tier: working\nvalid_until: 2099-01-01\n'));
  const globalDir = path.join(env.ENGRAM_GLOBAL_DIR, 'knowledge');
  await mkdir(globalDir, { recursive: true });
  await writeFile(path.join(globalDir, 'global-path-rule.md'), pathMemory('global-path-rule', ['src/global/**'], 'Global body: personal rule.').replace('scope: workspace', 'scope: global'));
  await reindex(cwd, env);

  assert.equal((await runEngram(cwd, env, ['link', 'claude'])).code, 0);
  const linkedCursor = await runEngram(cwd, env, ['link', 'cursor']);
  assert.equal(linkedCursor.code, 0, linkedCursor.stderr);
  for (const dir of [ruleDir(cwd), ruleDir(cwd, 'cursor')]) {
    for (const name of await ruleFiles(dir)) {
      assert.doesNotMatch(name, /task-x|global-path-rule/);
      const text = await readFile(path.join(dir, name), 'utf8');
      assert.doesNotMatch(text, /task-x|global-path-rule|Working body|Global body/);
    }
  }
  const linked = await runEngram(cwd, env, ['link', 'claude']);
  assert.match(linked.stdout, /1 global applies_to memories have no native rule/);

  const global = await runEngram(cwd, env, ['link', '--global', 'claude']);
  assert.equal(global.code, 0, global.stderr);
  const globalRules = path.join(agentHome, CLAUDE_DIR);
  assert.deepEqual(await ruleFiles(globalRules), ['global-path-rule.md']);
  assert.match(await readFile(path.join(globalRules, 'global-path-rule.md'), 'utf8'), /<!-- engram:global:knowledge\/global-path-rule\.md sha:[0-9a-f]{8} -->/);
  const after = await runEngram(cwd, env, ['link', 'claude']);
  assert.doesNotMatch(after.stdout, /have no native rule/);
  await rm(cwd, { recursive: true, force: true });
});

test('path triggers expand applies_to braces the way native rules do', () => {
  const entries = [
    { id: 'ts', appliesTo: ['src/**/*.{ts,tsx}'] },
    { id: 'docs', appliesTo: ['docs/*.md'] },
    { id: 'nested', appliesTo: ['lib/{a,{b,c}}.js'] }
  ];
  const ids = (file) => entriesForPath(entries, file).map((entry) => entry.id);
  assert.deepEqual(ids('src/app/view.tsx'), ['ts']);
  assert.deepEqual(ids('src/app/view.ts'), ['ts']);
  assert.deepEqual(ids('src/app/view.js'), []);
  assert.deepEqual(ids('docs/guide.md'), ['docs']);
  // Nested braces cannot be expanded for Cursor either, so they stay literal.
  assert.deepEqual(ids('lib/a.js'), []);
});

test('read off removes native rules and auto restores them', async () => {
  const { cwd, env } = await pathWorkspace('engram-native-read-');
  assert.equal((await runEngram(cwd, env, ['link', 'claude'])).code, 0);
  assert.deepEqual(await ruleFiles(ruleDir(cwd)), ['api-path-rule-0.md']);
  const off = await runEngram(cwd, env, ['set-read', 'off']);
  assert.match(off.stdout, /Read behavior: off/);
  assert.deepEqual(await ruleFiles(ruleDir(cwd)), []);
  await assert.rejects(stat(ruleDir(cwd)), 'the empty folder is removed too');
  await runEngram(cwd, env, ['set-read', 'auto']);
  assert.deepEqual(await ruleFiles(ruleDir(cwd)), ['api-path-rule-0.md']);
  await rm(cwd, { recursive: true, force: true });
});

test('hooks.path_rules switches the Claude hook table', async () => {
  const { cwd, env } = await pathWorkspace('engram-native-hooktable-');
  const file = path.join(cwd, '.claude', 'settings.json');
  await mkdir(path.dirname(file), { recursive: true });
  const human = { matcher: 'Bash', hooks: [{ name: 'human-guard', type: 'command', command: 'echo guard' }] };
  await writeFile(file, `${JSON.stringify({ hooks: { PreToolUse: [human] } }, null, 2)}\n`);

  assert.equal((await runEngram(cwd, env, ['link', 'claude'])).code, 0);
  let settings = await readSettings(cwd);
  assert.deepEqual(managedIn(settings, 'InstructionsLoaded').map((group) => group.matcher), ['path_glob_match']);
  assert.equal(managedIn(settings, 'PreToolUse').length, 0);
  assert.deepEqual(settings.hooks.PreToolUse, [human], 'the human PreToolUse group survives');
  assert.equal(Object.keys(settings.hooks).at(-1), 'SubagentStart', 'SubagentStart stays last');
  assert.equal(managedIn(settings, 'SubagentStart').length, 1);
  assert.deepEqual(await ruleFiles(ruleDir(cwd)), ['api-path-rule-0.md']);

  const set = await runEngram(cwd, env, ['config', 'set', 'hooks.path_rules', 'hook']);
  assert.equal(set.code, 0, set.stderr);
  assert.equal((await runEngram(cwd, env, ['link', 'claude'])).code, 0);
  settings = await readSettings(cwd);
  assert.deepEqual(managedIn(settings, 'PreToolUse').map((group) => group.matcher), ['Read|Edit|Write|MultiEdit']);
  assert.equal(managedIn(settings, 'InstructionsLoaded').length, 0);
  assert.equal(settings.hooks.PreToolUse.length, 2);
  assert.deepEqual(await ruleFiles(ruleDir(cwd)), [], 'hook mode removes the Claude rule files, so nothing is injected twice');

  assert.equal((await runEngram(cwd, env, ['link', 'codex'])).code, 0);
  const codex = JSON.parse(await readFile(path.join(cwd, '.codex', 'hooks.json'), 'utf8'));
  assert.equal(managedIn(codex, 'PreToolUse').length, 1);
  assert.equal(managedIn(codex, 'InstructionsLoaded').length, 0);

  assert.equal((await runEngram(cwd, env, ['config', 'set', 'hooks.path_rules', 'native'])).code, 0);
  assert.equal((await runEngram(cwd, env, ['link', 'codex'])).code, 0);
  assert.equal(managedIn(JSON.parse(await readFile(path.join(cwd, '.codex', 'hooks.json'), 'utf8')), 'PreToolUse').length, 1, 'Codex keeps PreToolUse under native');
  assert.equal((await runEngram(cwd, env, ['link', 'claude'])).code, 0);
  assert.deepEqual(await ruleFiles(ruleDir(cwd)), ['api-path-rule-0.md'], 'native mode restores the rules');

  const unlinked = await runEngram(cwd, env, ['unlink', 'claude']);
  assert.equal(unlinked.code, 0, unlinked.stderr);
  settings = await readSettings(cwd);
  assert.equal(managedIn(settings, 'InstructionsLoaded').length, 0);
  assert.equal(managedIn(settings, 'PreToolUse').length, 0);
  assert.deepEqual(settings.hooks.PreToolUse, [human]);
  assert.deepEqual(await ruleFiles(ruleDir(cwd)), [], 'unlink removes the marked rule files');
  await rm(cwd, { recursive: true, force: true });
});

test('uninstall removes a legacy managed PreToolUse even under native mode', async () => {
  const { cwd, env } = await pathWorkspace('engram-native-legacy-');
  await runEngram(cwd, env, ['config', 'set', 'hooks.path_rules', 'hook']);
  assert.equal((await runEngram(cwd, env, ['link', 'claude'])).code, 0);
  assert.equal(managedIn(await readSettings(cwd), 'PreToolUse').length, 1);
  await runEngram(cwd, env, ['config', 'set', 'hooks.path_rules', 'native']);
  assert.equal((await runEngram(cwd, env, ['uninstall-agent-hooks', 'claude'])).code, 0);
  const settings = await readSettings(cwd).catch(() => ({}));
  assert.equal(managedIn(settings, 'PreToolUse').length, 0);
  await rm(cwd, { recursive: true, force: true });
});

test('InstructionsLoaded marks the rule delivered and counts usage', async () => {
  const { cwd, env } = await pathWorkspace('engram-native-loaded-');
  assert.equal((await runEngram(cwd, env, ['link', 'claude'])).code, 0);
  const rule = path.join(ruleDir(cwd), 'api-path-rule-0.md');
  const loaded = { hook_event_name: 'InstructionsLoaded', session_id: 'n1', cwd, file_path: rule, load_reason: 'path_glob_match', memory_type: 'Project' };
  const key = 'workspace:knowledge/api-path-rule-0.md';

  assert.deepEqual(await hookJson(cwd, env, loaded), {});
  assert.equal((await readUsage(cwd))[key].injected, 1);
  assert.deepEqual(await hookJson(cwd, env, loaded), {});
  assert.equal((await readUsage(cwd))[key].injected, 1, 'a repeat is not counted again');

  const prompt = await hookJson(cwd, env, { hook_event_name: 'UserPromptSubmit', session_id: 'n1', cwd, prompt: 'pathscope' });
  assert.match(additionalContext(prompt), /already loaded: .*api-path-rule-0/);
  assert.doesNotMatch(additionalContext(prompt), /Path body 0/);

  const human = path.join(ruleDir(cwd), 'human.md');
  await writeFile(human, '# human rule\n');
  const outside = path.join(cwd, 'notes.md');
  await writeFile(outside, `<!-- engram:workspace:knowledge/unscoped-rule.md sha:00000000 -->\nbody\n`);
  const before = JSON.stringify(await readUsage(cwd));
  for (const noop of [
    { ...loaded, session_id: 'n2', load_reason: 'session_start' },
    { ...loaded, session_id: 'n2', file_path: outside },
    { ...loaded, session_id: 'n2', file_path: human },
    { ...loaded, session_id: 'n2', file_path: undefined }
  ]) {
    assert.deepEqual(await hookJson(cwd, env, noop), {});
  }
  assert.equal(JSON.stringify(await readUsage(cwd)), before, 'no usage change');
  await rm(cwd, { recursive: true, force: true });
});

test('InstructionsLoaded is ignored for other hosts', async () => {
  const { cwd, env } = await pathWorkspace('engram-native-loaded-host-');
  assert.equal((await runEngram(cwd, env, ['link', 'claude'])).code, 0);
  const rule = path.join(ruleDir(cwd), 'api-path-rule-0.md');
  const result = await runEngram(cwd, env, ['agent-hook', '--host', 'codex'], `${JSON.stringify({ hook_event_name: 'InstructionsLoaded', session_id: 'o1', cwd, file_path: rule, load_reason: 'path_glob_match' })}\n`);
  assert.equal(result.stdout.trim(), '{}');
  assert.equal((await readUsage(cwd))['workspace:knowledge/api-path-rule-0.md'], undefined);
  await rm(cwd, { recursive: true, force: true });
});

test('PreToolUse skips keys already delivered as native rules', async () => {
  const { cwd, env } = await pathWorkspace('engram-native-guard-');
  assert.equal((await runEngram(cwd, env, ['link', 'claude'])).code, 0);
  // An old global or hand-added hook still registers PreToolUse next to the new rule files.
  const file = path.join(cwd, '.claude', 'settings.json');
  const settings = await readSettings(cwd);
  settings.hooks.PreToolUse = [{ matcher: 'Read|Edit|Write|MultiEdit', hooks: [{ name: 'engram-auto-load', type: 'command', command: 'engram agent-hook --host claude', timeout: 10 }] }];
  await writeFile(file, `${JSON.stringify(settings, null, 2)}\n`);
  const output = await hookJson(cwd, env, { hook_event_name: 'PreToolUse', session_id: 'g1', cwd, tool_name: 'Edit', tool_input: { file_path: `${cwd}/src/api/users.ts` } });
  assert.deepEqual(output, {});
  await rm(cwd, { recursive: true, force: true });
});
