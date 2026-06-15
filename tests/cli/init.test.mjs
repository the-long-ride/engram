import test from 'node:test';
import assert from 'node:assert/strict';
import { rm, writeFile, mkdir, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { initGit, runEngram, tempWorkspace, workspaceMemoryRoot } from '../helpers.mjs';
import { machineProfileName } from './fixtures.mjs';

test('init, help, save reject, save accept, load, verify, audit', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  const init = await runEngram(cwd, env, ['init']);
  assert.equal(init.code, 0, init.stderr);
  assert.match(init.stdout, /█████████╗███╗   ██╗/);
  assert.match(init.stdout, /SYNTHETIC MEMORY \/\/ NEURAL ARCHIVE :: @the-long-ride with <3/);
  assert.match(init.stdout, /skillset: written AGENTS\.md, \.mcp\.json, \.agents\/skills\/engram\/SKILL\.md/);
  assert.match(init.stdout, /More help: run engram -h for all commands, or engram help <command> for deeper examples\./);
  assert.match(init.stdout, /Completion: run engram completion (bash|zsh|powershell) and add it to your shell profile\./);
  assert.match((await runEngram(cwd, env, ['help'])).stdout, /Memory Commands/);
  assert.match((await runEngram(cwd, env, ['-h'])).stdout, /Memory Commands/);
  assert.match((await runEngram(cwd, env, ['--help'])).stdout, /Memory Commands/);
  assert.equal((await runEngram(cwd, env, ['-v'])).stdout.trim(), (await runEngram(cwd, env, ['--version'])).stdout.trim());
  assert.match((await runEngram(cwd, env, ['-h'])).stdout, /engram --version/);
  assert.match((await runEngram(cwd, env, ['-h'])).stdout, /short: engram -v/);
  assert.match((await runEngram(cwd, env, ['help', 'set-rule-variant'])).stdout, /lower-tier models/);
  assert.match((await runEngram(cwd, env, ['help', 'set-save-target'])).stdout, /workspace\|global\|both/);
  assert.match((await runEngram(cwd, env, ['help', 'set-load-limit'])).stdout, /1 to 32/);
  assert.match((await runEngram(cwd, env, ['help', 'set-role'])).stdout, /frontend-only memory/);
  assert.match((await runEngram(cwd, env, ['help', 'save-session'])).stdout, /--accept-all/);
  assert.match((await runEngram(cwd, env, ['help', 'save-session'])).stdout, /--query-level <n>/);
  assert.match((await runEngram(cwd, env, ['help', 'save-session'])).stdout, /engram ss -a/);
  assert.match((await runEngram(cwd, env, ['help', 'search'])).stdout, /--semantic/);
  assert.match((await runEngram(cwd, env, ['help', 'take-control'])).stdout, /workspace guidance/);
  assert.match((await runEngram(cwd, env, ['help', 'load'])).stdout, /--dry-run/);
  assert.match((await runEngram(cwd, env, ['help', 'update-global-folder'])).stdout, /--move-from-path/);
  assert.match((await runEngram(cwd, env, ['help', 'update-global-folder'])).stdout, /set global memory path/);
  assert.match((await runEngram(cwd, env, ['help', 'ugf'])).stdout, /whole old root/);
  assert.match((await runEngram(cwd, env, ['help', 'clone-memory'])).stdout, /Clone active memory Markdown/);
  assert.match((await runEngram(cwd, env, ['help', 'clone-memory'])).stdout, /--metacognize/);
  assert.doesNotMatch((await runEngram(cwd, env, ['help', 'clone-memory'])).stdout, /--restructure/);
  assert.match((await runEngram(cwd, env, ['help', 'clone-memory'])).stdout, /proposal-first/);
  assert.match((await runEngram(cwd, env, ['help', 'metacognize'])).stdout, /restructure an existing Engram memory folder/);
  assert.match((await runEngram(cwd, env, ['help', 'metacognize'])).stdout, /--workspace/);
  assert.match((await runEngram(cwd, env, ['help', 'metacognize'])).stdout, /Natural wording/);
  assert.match((await runEngram(cwd, env, ['help', 'profile'])).stdout, /isolated global memory profiles/);
  assert.match((await runEngram(cwd, env, ['help', 'upgrade'])).stdout, /generated workspace skillsets/);
  assert.doesNotMatch((await runEngram(cwd, env, ['help'])).stdout, /update-help|team-dashboard|engram dry-run|engram propose/);
  assert.match((await runEngram(cwd, env, ['-h', 'roles'])).stdout, /role: \[\.\.\.\]/);
  assert.match((await runEngram(cwd, env, ['save-session', '-h'])).stdout, /one candidate per line/);
  assert.match((await runEngram(cwd, env, ['save-session', '-h'])).stdout, /positive integer/);
  assert.doesNotMatch((await runEngram(cwd, env, ['autosave', '-h'])).stdout, /one candidate per line/);
  assert.match((await runEngram(cwd, env, ['h', 'save'])).stdout, /engram save/);
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

test('init can skip or retarget default skillset install', async () => {
  const skipped = await tempWorkspace('engram-cli-');
  const noSkillset = await runEngram(skipped.cwd, skipped.env, ['init', '--no-skillset']);
  assert.equal(noSkillset.code, 0, noSkillset.stderr);
  assert.match(noSkillset.stdout, /skillset: skipped/);
  await assert.rejects(readFile(path.join(skipped.cwd, 'AGENTS.md'), 'utf8'));
  await rm(skipped.cwd, { recursive: true, force: true });

  const targeted = await tempWorkspace('engram-cli-');
  const slash = await runEngram(targeted.cwd, targeted.env, ['init', '--skillset', 'slash']);
  assert.equal(slash.code, 0, slash.stderr);
  assert.match(slash.stdout, /skillset: written .*\.claude\/commands\/engram\.md/);
  assert.match(slash.stdout, /skillset: written .*\.claude\/skills\/engram\/SKILL\.md/);
  assert.match(await readFile(path.join(targeted.cwd, '.claude/commands/engram.md'), 'utf8'), /Engram Slash Command/);
  assert.match(await readFile(path.join(targeted.cwd, '.cursor/commands/engram.md'), 'utf8'), /Keep replies compact/);
  await assert.rejects(readFile(path.join(targeted.cwd, 'AGENTS.md'), 'utf8'));
  await rm(targeted.cwd, { recursive: true, force: true });
});

test('init skips human-authored skillset files', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await writeFile(path.join(cwd, 'AGENTS.md'), '# Human agent instructions\n');
  const result = await runEngram(cwd, env, ['init']);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /skillset: written \.mcp\.json, \.agents\/skills\/engram\/SKILL\.md; skipped AGENTS\.md/);
  assert.match(await readFile(path.join(cwd, 'AGENTS.md'), 'utf8'), /Human agent instructions/);
  await rm(cwd, { recursive: true, force: true });
});

test('init prepares global git and entry reports detected branch', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  const init = await runEngram(cwd, env, ['init']);
  assert.equal(init.code, 0, init.stderr);
  assert.match(init.stdout, /default profile created/);
  const expectedProfile = machineProfileName();
  const profiles = JSON.parse(await readFile(path.join(env.ENGRAM_CONFIG_DIR, 'profiles.json'), 'utf8'));
  assert.equal(profiles.active_profile, expectedProfile);
  assert.equal(profiles.profiles[expectedProfile].global_path, env.ENGRAM_GLOBAL_DIR);
  assert.equal(profiles.profiles[expectedProfile].scope, 'both');
  const repo = spawnSync('git', ['-C', env.ENGRAM_GLOBAL_DIR, 'rev-parse', '--is-inside-work-tree'], { encoding: 'utf8' });
  assert.equal(repo.stdout.trim(), 'true');
  assert.equal(spawnSync('git', ['-C', env.ENGRAM_GLOBAL_DIR, 'checkout', '-b', 'team'], { encoding: 'utf8' }).status, 0);
  const entry = await runEngram(cwd, env, ['entry']);
  assert.equal(entry.code, 0, entry.stderr);
  const cleanStdout = entry.stdout.replace(/\x1b\[[0-9;]*m/g, '');
  assert.match(cleanStdout, /SYNTHETIC MEMORY/);
  assert.doesNotMatch(cleanStdout, /^engram entry/m);
  assert.doesNotMatch(cleanStdout, /Use for:|Edit:/);
  assert.match(cleanStdout, /## Runtime/);
  assert.match(cleanStdout, /## Memory roots/);
  assert.match(cleanStdout, /## Core config/);
  assert.match(cleanStdout, /## Global Git config/);
  assert.match(cleanStdout, /## Detected global Git/);
  assert.match(cleanStdout, /config\.global_git\.branch:\s*main/);
  assert.match(cleanStdout, /global_git_detected\.branch:\s*team/);
  assert.doesNotMatch(cleanStdout, /pattern_mining|pr_workflow|encryption/);
  await rm(cwd, { recursive: true, force: true });
});

test('init can persist a custom global memory path', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  const customEnv = { ...env };
  delete customEnv.ENGRAM_GLOBAL_DIR;
  const globalPath = path.join(cwd, 'shared-engram');
  const init = await runEngram(cwd, customEnv, ['init', '--global-path', globalPath, '--no-skillset']);
  assert.equal(init.code, 0, init.stderr);
  assert.match(init.stdout, new RegExp(globalPath.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')));
  const config = JSON.parse(await readFile(path.join(workspaceMemoryRoot(cwd), 'engram.config.json'), 'utf8'));
  assert.equal(config.global_path, globalPath);
  const entry = await runEngram(cwd, customEnv, ['entry']);
  assert.match(entry.stdout.replace(/\x1b\[[0-9;]*m/g, ''), new RegExp(`roots\\.global:\\s*${globalPath.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')}`));
  await rm(cwd, { recursive: true, force: true });
});

test('global-only init skips workspace install and saves to global by default', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  const customEnv = { ...env };
  delete customEnv.ENGRAM_GLOBAL_DIR;
  const globalPath = path.join(cwd, 'portable-engram');
  const init = await runEngram(cwd, customEnv, ['init', '--global-only', '--global-path', globalPath]);
  assert.equal(init.code, 0, init.stderr);
  assert.match(init.stdout, /engram global-only initialized/);
  assert.match(init.stdout, /default profile created/);
  assert.match(init.stdout, /Rule strict level/);
  assert.match(init.stdout, /Save session/);
  assert.match(init.stdout, /Take control/);
  assert.match(init.stdout, /Global-only saves/);
  await assert.rejects(readFile(path.join(workspaceMemoryRoot(cwd), 'engram.config.json'), 'utf8'));
  await assert.rejects(readFile(path.join(cwd, 'AGENTS.md'), 'utf8'));

  const userConfig = JSON.parse(await readFile(path.join(customEnv.ENGRAM_CONFIG_DIR, 'engram.config.json'), 'utf8'));
  assert.equal(userConfig.global_path, globalPath);
  assert.equal(userConfig.scope, 'global');
  const globalConfig = JSON.parse(await readFile(path.join(globalPath, 'engram.config.json'), 'utf8'));
  assert.equal(globalConfig.global_path, globalPath);
  assert.equal(globalConfig.scope, 'global');
  const expectedProfile = machineProfileName();
  const profiles = JSON.parse(await readFile(path.join(customEnv.ENGRAM_CONFIG_DIR, 'profiles.json'), 'utf8'));
  assert.equal(profiles.active_profile, expectedProfile);
  assert.equal(profiles.profiles[expectedProfile].global_path, globalPath);
  assert.equal(profiles.profiles[expectedProfile].scope, 'global');

  const strict = await runEngram(cwd, customEnv, ['set-rule-variant', 'strict']);
  assert.equal(strict.code, 0, strict.stderr);
  assert.match(strict.stdout, /strict/);
  await assert.rejects(readFile(path.join(workspaceMemoryRoot(cwd), 'engram.config.json'), 'utf8'));

  const saved = await runEngram(cwd, customEnv, ['save', 'rule', 'Use global-only defaults'], 'A\n');
  assert.equal(saved.code, 0, saved.stderr);
  assert.match(saved.stdout, /Saved/);
  await readFile(path.join(globalPath, 'rules', 'use-global-only-defaults.md'), 'utf8');
  await assert.rejects(readFile(path.join(workspaceMemoryRoot(cwd), 'rules', 'use-global-only-defaults.md'), 'utf8'));
  const loaded = await runEngram(cwd, customEnv, ['load', 'global-only defaults']);
  assert.equal(loaded.code, 0, loaded.stderr);
  assert.match(loaded.stdout, /global: 1/);
  assert.match(loaded.stdout, /mandatory/);
  await rm(cwd, { recursive: true, force: true });
});

test('normal saves default to both and explicit workspace stays local', async () => {
  const { cwd, env } = await tempWorkspace('engram-save-target-');
  const saved = await runEngram(cwd, env, [
    'save', 'knowledge',
    'Default target keeps uninitialized workspace saves portable'
  ], 'A\n');
  assert.equal(saved.code, 0, saved.stderr);
  assert.match(saved.stdout, /Scope: workspace/);
  assert.match(saved.stdout, /Scope: global/);

  const file = 'default-target-keeps-uninitialized-workspace-saves-portable.md';
  const workspaceFile = path.join(workspaceMemoryRoot(cwd), 'knowledge', file);
  const globalFile = path.join(env.ENGRAM_GLOBAL_DIR, 'knowledge', file);
  assert.match(await readFile(workspaceFile, 'utf8'), /scope: workspace/);
  assert.match(await readFile(globalFile, 'utf8'), /scope: global/);

  const workspaceOnly = await runEngram(cwd, env, [
    'save', 'knowledge', '--scope', 'workspace',
    'Workspace only save target'
  ], 'A\n');
  assert.equal(workspaceOnly.code, 0, workspaceOnly.stderr);
  assert.match(workspaceOnly.stdout, /Scope: workspace/);
  assert.doesNotMatch(workspaceOnly.stdout, /Scope: global/);
  await readFile(path.join(workspaceMemoryRoot(cwd), 'knowledge', 'workspace-only-save-target.md'), 'utf8');
  await assert.rejects(readFile(path.join(env.ENGRAM_GLOBAL_DIR, 'knowledge', 'workspace-only-save-target.md'), 'utf8'));

  const target = await runEngram(cwd, env, ['set-save-target', 'global']);
  assert.equal(target.code, 0, target.stderr);
  assert.match(target.stdout, /Save target: global/);
  const globalOnly = await runEngram(cwd, env, ['save', 'knowledge', 'Configured global target only'], 'A\n');
  assert.equal(globalOnly.code, 0, globalOnly.stderr);
  assert.match(globalOnly.stdout, /Scope: global/);
  assert.doesNotMatch(globalOnly.stdout, /Scope: workspace/);
  await readFile(path.join(env.ENGRAM_GLOBAL_DIR, 'knowledge', 'configured-global-target-only.md'), 'utf8');
  await assert.rejects(readFile(path.join(workspaceMemoryRoot(cwd), 'knowledge', 'configured-global-target-only.md'), 'utf8'));
  assert.deepEqual((await readdir(path.join(env.ENGRAM_GLOBAL_DIR, 'knowledge'))).filter((name) => name.startsWith('default-target-keeps')), [file]);
  assert.match((await runEngram(cwd, env, ['stats'])).stdout, /Total: 3/);
  await rm(cwd, { recursive: true, force: true });
});

test('init does not require a global memory directory', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  const localOnlyEnv = { ...env };
  delete localOnlyEnv.ENGRAM_GLOBAL_DIR;
  const badGlobal = await runEngram(cwd, localOnlyEnv, ['init', '--scope', 'global', '--no-skillset']);
  assert.equal(badGlobal.code, 1);
  assert.match(badGlobal.stderr, /--scope global requires global memory/);
  const init = await runEngram(cwd, localOnlyEnv, ['init', '--no-skillset']);
  assert.equal(init.code, 0, init.stderr);
  assert.match(init.stdout, /engram global skipped/);
  const config = JSON.parse(await readFile(path.join(workspaceMemoryRoot(cwd), 'engram.config.json'), 'utf8'));
  assert.equal(config.global_path, '');
  assert.equal(config.scope, 'both');
  assert.match((await runEngram(cwd, localOnlyEnv, ['set-save-target', 'status'])).stdout, /workspace only until configured/);
  const entry = await runEngram(cwd, localOnlyEnv, ['entry']);
  assert.match(entry.stdout.replace(/\x1b\[[0-9;]*m/g, ''), /roots\.global:\s*<none>/);
  await rm(cwd, { recursive: true, force: true });
});

test('init can create .agents/.engram as a local submodule', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  assert.equal(initGit(cwd).status, 0);
  const init = await runEngram(cwd, env, ['init', '--submodule']);
  assert.equal(init.code, 0, init.stderr);
  assert.match(init.stdout, /workspace submodule: branch main/);
  assert.match(spawnSync('git', ['-C', workspaceMemoryRoot(cwd), 'log', '--format=%s', '-1'], { encoding: 'utf8' }).stdout, /Initialize engram/);
  assert.match(spawnSync('git', ['-C', cwd, 'ls-files', '-s', '--', '.agents/.engram'], { encoding: 'utf8' }).stdout, /^160000 /);
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
