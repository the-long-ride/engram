import test from 'node:test';
import assert from 'node:assert/strict';
import { rm, writeFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { initGit, runEngram, tempWorkspace } from './helpers.mjs';

test('init, help, save reject, save accept, load, verify, audit', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  assert.equal((await runEngram(cwd, env, ['init'])).code, 0);
  assert.match((await runEngram(cwd, env, ['help'])).stdout, /Memory Commands/);
  assert.match((await runEngram(cwd, env, ['-h'])).stdout, /Memory Commands/);
  assert.match((await runEngram(cwd, env, ['--help'])).stdout, /Memory Commands/);
  assert.match((await runEngram(cwd, env, ['save', '-h'])).stdout, /engram save rule/);
  assert.match((await runEngram(cwd, env, ['save', 'rule', 'Use pnpm for installs'], 'C\n')).stdout, /Discarded/);
  const saved = await runEngram(cwd, env, ['save', 'rule', '--scope', 'workspace', 'Use pnpm for installs'], 'A\n');
  assert.equal(saved.code, 0, saved.stderr);
  assert.match(saved.stdout, /Saved/);
  assert.match((await runEngram(cwd, env, ['load', 'pnpm installs'])).stdout, /Use pnpm/);
  assert.match((await runEngram(cwd, env, ['verify'])).stdout, /OK workspace/);
  assert.match((await runEngram(cwd, env, ['audit'])).stdout, /use-pnpm-for-installs/);
  await rm(cwd, { recursive: true, force: true });
});

test('completion emits shell helper with command suggestions', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  const bash = await runEngram(cwd, env, ['completion']);
  assert.equal(bash.code, 0, bash.stderr);
  assert.match(bash.stdout, /complete -F _engram engram/);
  assert.match(bash.stdout, /compgen -W "\$commands"/);
  assert.match(bash.stdout, /COMP_WORDS/);
  assert.match(bash.stdout, /local commands="[^"]*\bsave\b[^"]*"/);
  assert.doesNotMatch(bash.stdout, /local commands="[^"]*save rule/);
  const zsh = await runEngram(cwd, env, ['completion', 'zsh']);
  assert.equal(zsh.code, 0, zsh.stderr);
  assert.match(zsh.stdout, /#compdef engram/);
  await rm(cwd, { recursive: true, force: true });
});

test('export, health, search, stats, and conflict dry-run work', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['init']);
  await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', 'Frontend uses React and pnpm'], 'A\n');
  assert.match((await runEngram(cwd, env, ['health'])).stdout, /Memory health/);
  assert.match((await runEngram(cwd, env, ['search', 'React'])).stdout, /frontend-uses-react/);
  assert.match((await runEngram(cwd, env, ['stats'])).stdout, /Total: 1/);
  assert.match((await runEngram(cwd, env, ['export', '--format', 'agents-md'])).stdout, /AGENTS.md/);
  const conflictDir = path.join(cwd, '.engram', 'rules');
  await mkdir(conflictDir, { recursive: true });
  await writeFile(path.join(conflictDir, 'conflict.md'), '<<<<<<< ours\nx\n=======\ny\n>>>>>>> theirs\n');
  assert.match((await runEngram(cwd, env, ['resolve-conflicts', '--dry-run'])).stdout, /UNRELATED|CONTRADICT|EXTEND|DUPLICATE/);
  await rm(cwd, { recursive: true, force: true });
});

test('ignored memory stays hidden from search, export, and stats', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['init']);
  await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', 'Visible React memory'], 'A\n');
  await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', 'Hidden leakcheck memory'], 'A\n');
  await writeFile(path.join(cwd, '.engramignore'), 'knowledge/hidden-leakcheck-memory.md\n');
  assert.match((await runEngram(cwd, env, ['search', 'leakcheck'])).stdout, /No matches/);
  assert.doesNotMatch((await runEngram(cwd, env, ['export', '--format', 'agents-md'])).stdout, /Hidden leakcheck/);
  assert.match((await runEngram(cwd, env, ['stats'])).stdout, /Total: 1/);
  await rm(cwd, { recursive: true, force: true });
});

test('live sync respects enabled flag and writes configured target when enabled', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['init']);
  await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', 'Cursor sync memory'], 'A\n');
  const disabled = await runEngram(cwd, env, ['sync']);
  assert.equal(disabled.code, 0, disabled.stderr);
  assert.match(disabled.stdout, /Live sync disabled/);
  await assert.rejects(readFile(path.join(cwd, '.cursor', 'rules', 'engram.mdc'), 'utf8'));

  const configPath = path.join(cwd, '.engram', 'engram.config.json');
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  config.live_sync = { enabled: true, targets: ['cursorrules'] };
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
  const enabled = await runEngram(cwd, env, ['sync']);
  assert.equal(enabled.code, 0, enabled.stderr);
  assert.match(enabled.stdout, /\.cursor\/rules\/engram\.mdc/);
  assert.match(await readFile(path.join(cwd, '.cursor', 'rules', 'engram.mdc'), 'utf8'), /Cursor Rules/);
  await rm(cwd, { recursive: true, force: true });
});

test('unsupported public flags fail instead of silently degrading', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['init']);
  assert.equal((await runEngram(cwd, env, ['export', '--format', 'bogus'])).code, 1);
  assert.equal((await runEngram(cwd, env, ['deduplicate', '--semantic'])).code, 1);
  assert.equal((await runEngram(cwd, env, ['resolve-conflicts', '--auto'])).code, 1);
  await rm(cwd, { recursive: true, force: true });
});

test('install-hooks preserves human-authored hooks', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  assert.equal(initGit(cwd).status, 0);
  const hook = path.join(cwd, '.git', 'hooks', 'post-merge');
  await writeFile(hook, '#!/bin/sh\n# human hook\n');
  const result = await runEngram(cwd, env, ['install-hooks']);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /SKIPPED post-merge/);
  assert.match(result.stdout, /WRITTEN pre-commit/);
  assert.match(await readFile(hook, 'utf8'), /human hook/);
  assert.match(await readFile(path.join(cwd, '.git', 'hooks', 'pre-commit'), 'utf8'), /^#!\/bin\/sh/);
  await rm(cwd, { recursive: true, force: true });
});

test('save knowledge without text asks for generated agent knowledge', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['init']);
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
  await runEngram(cwd, env, ['init']);
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

test('save can parse agent-brainstormed workflow candidates', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['init']);
  const input = 'TYPE: workflow\nTEXT: When deploying, first run tests. Then verify health.\nA\n';
  const saved = await runEngram(cwd, env, ['save', '--scope', 'workspace'], input);
  assert.equal(saved.code, 0, saved.stderr);
  assert.match(saved.stdout, /MEMORY CANDIDATE NEEDED/);
  assert.match(saved.stdout, /Type: skill/);
  assert.match(saved.stdout, /skills\/when-deploying-first-run-tests-then-verify-health\.md/);
  await rm(cwd, { recursive: true, force: true });
});

test('generated memories use standard markdown spacing and links', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['init']);
  const saved = await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', 'Docs live at www.google.com.'], 'A\n');
  assert.equal(saved.code, 0, saved.stderr);
  const content = await readFile(path.join(cwd, '.engram', 'knowledge', 'docs-live-at-www-google-com.md'), 'utf8');
  assert.match(content, /## Context\r?\n\r?\nApproved/);
  assert.match(content, /## Content\r?\n\r?\n- Docs live at \[www\.google\.com\]\(https:\/\/www\.google\.com\)\./);
  assert.match(content, /## Example\r?\n\r?\nUse this memory/);
  await rm(cwd, { recursive: true, force: true });
});

test('save automatically updates matching memory instead of duplicating it', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['init']);
  await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', 'Frontend uses React and pnpm'], 'A\n');
  const updated = await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', 'React frontend uses pnpm workspace scripts'], 'A\n');
  assert.equal(updated.code, 0, updated.stderr);
  assert.match(updated.stdout, /Saved/);
  assert.match((await runEngram(cwd, env, ['stats'])).stdout, /Total: 1/);
  assert.match(await readFile(path.join(cwd, '.engram', 'knowledge', 'frontend-uses-react-and-pnpm.md'), 'utf8'), /workspace scripts/);
  await rm(cwd, { recursive: true, force: true });
});

test('rule variants render the active compact variant', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['init']);
  assert.match((await runEngram(cwd, env, ['set-rule-variant', 'strict'])).stdout, /strict/);
  await runEngram(cwd, env, ['save', 'rule', '--scope', 'workspace', 'Use pnpm for package management'], 'A\n');
  const loaded = await runEngram(cwd, env, ['load', 'pnpm package']);
  assert.equal(loaded.code, 0, loaded.stderr);
  assert.match(loaded.stdout, /mandatory/);
  assert.doesNotMatch(loaded.stdout, /### Light/);
  await rm(cwd, { recursive: true, force: true });
});

test('init prepares global git and entry reports detected branch', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  const init = await runEngram(cwd, env, ['init']);
  assert.equal(init.code, 0, init.stderr);
  const repo = spawnSync('git', ['-C', env.ENGRAM_GLOBAL_DIR, 'rev-parse', '--is-inside-work-tree'], { encoding: 'utf8' });
  assert.equal(repo.stdout.trim(), 'true');
  assert.equal(spawnSync('git', ['-C', env.ENGRAM_GLOBAL_DIR, 'checkout', '-b', 'team'], { encoding: 'utf8' }).status, 0);
  const entry = await runEngram(cwd, env, ['entry']);
  assert.equal(entry.code, 0, entry.stderr);
  const cleanStdout = entry.stdout.replace(/\x1b\[[0-9;]*m/g, '');
  assert.match(cleanStdout, /config\.global_git\.branch:\s*main/);
  assert.match(cleanStdout, /global_git_detected\.branch:\s*team/);
  await rm(cwd, { recursive: true, force: true });
});

test('init can create .engram as a local submodule', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  assert.equal(initGit(cwd).status, 0);
  const init = await runEngram(cwd, env, ['init', '--submodule']);
  assert.equal(init.code, 0, init.stderr);
  assert.match(init.stdout, /workspace submodule: branch main/);
  assert.match(spawnSync('git', ['-C', path.join(cwd, '.engram'), 'log', '--format=%s', '-1'], { encoding: 'utf8' }).stdout, /Initialize engram/);
  assert.match(spawnSync('git', ['-C', cwd, 'ls-files', '-s', '--', '.engram'], { encoding: 'utf8' }).stdout, /^160000 /);
  await rm(cwd, { recursive: true, force: true });
});

test('global remote flag validates URL and save pushes global memory', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  const bad = await runEngram(cwd, env, ['init', '--global-remote', 'not-a-url']);
  assert.equal(bad.code, 1);
  assert.match(bad.stderr, /invalid global remote URL/);
  await rm(cwd, { recursive: true, force: true });

  const fresh = await tempWorkspace('engram-cli-');
  const remote = path.join(fresh.cwd, 'remote.git');
  assert.equal(spawnSync('git', ['init', '--bare', remote], { encoding: 'utf8' }).status, 0);
  const init = await runEngram(fresh.cwd, fresh.env, ['init', '--global-remote', pathToFileURL(remote).href]);
  assert.equal(init.code, 0, init.stderr);
  assert.match(init.stdout, /global git: origin ->/);
  const saved = await runEngram(fresh.cwd, fresh.env, ['save', 'rule', '--scope', 'global', 'Share team memory defaults'], 'A\n');
  assert.equal(saved.code, 0, saved.stderr);
  const log = spawnSync('git', ['--git-dir', remote, 'log', '--oneline', '--all'], { encoding: 'utf8' }).stdout;
  assert.match(log, /add rule: share-team-memory-defaults/);
  await rm(fresh.cwd, { recursive: true, force: true });
});
