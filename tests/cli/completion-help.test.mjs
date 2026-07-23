import test from 'node:test';
import assert from 'node:assert/strict';
import { rm, writeFile, mkdir, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { initGit, runEngram, tempWorkspace, workspaceMemoryRoot } from '../helpers.mjs';
import { testMemory, duplicateFixtureMemory } from './fixtures.mjs';

test('completion emits shell helper with command suggestions', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  const bash = await runEngram(cwd, env, ['completion']);
  assert.equal(bash.code, 0, bash.stderr);
  assert.match(bash.stdout, /complete -F _engram engram/);
  assert.match(bash.stdout, /compgen -W "\$commands"/);
  assert.match(bash.stdout, /COMP_WORDS/);
  assert.match(bash.stdout, /local commands="[^"]*\bsave\b[^"]*"/);
  assert.doesNotMatch(bash.stdout, /local commands="[^"]*save rule/);
  assert.match(bash.stdout, /--file --scope --profile --role --roles/);
  assert.match(bash.stdout, /--query-level/);
  assert.match(bash.stdout, /--all --budget-tokens --dry-run -f --full/);
  assert.match(bash.stdout, /update-global-folder/);
  assert.match(bash.stdout, /\bugf\b/);
  assert.match(bash.stdout, /clone-memory/);
  assert.match(bash.stdout, /clone-memory\|cm/);
  assert.match(bash.stdout, /\$clone_memory_args/);
  assert.match(bash.stdout, /--metacognize/);
  assert.doesNotMatch(bash.stdout, /--restructure/);
  assert.match(bash.stdout, /metacognize\|mc/);
  assert.match(bash.stdout, /\$metacognize_args/);
assert.match(bash.stdout, /--workspace --global --all --force --dry-run/);
  assert.match(bash.stdout, /profile\|pf/);
  assert.match(bash.stdout, /\$profile_actions/);
  assert.match(bash.stdout, /--from-profile --to-profile/);
  assert.match(bash.stdout, /--move-from-path/);
  assert.doesNotMatch(bash.stdout, /\bantigravity\b/);
  assert.doesNotMatch(bash.stdout, /antigravity-cli/);
  assert.doesNotMatch(bash.stdout, /dry-run\|dr|propose\|p|team-dashboard|update-help/);
  assert.match(bash.stdout, /upgrade\|up/);
  assert.match(bash.stdout, /set-proof\|sp/);
  assert.match(bash.stdout, /--no-auto-upgrade/);
  assert.match(bash.stdout, /--global --force/);
  const zsh = await runEngram(cwd, env, ['completion', 'zsh']);
  assert.equal(zsh.code, 0, zsh.stderr);
  assert.match(zsh.stdout, /#compdef engram/);
  assert.match(zsh.stdout, /save-session\|ss/);
  assert.match(zsh.stdout, /save-session\|ss/);
  assert.match(zsh.stdout, /--file\[read session summary file\]/);
assert.match(zsh.stdout, /-f\[load broader legacy memory output\]/);
  assert.match(zsh.stdout, /--budget-tokens\[compact payload cap\]/);
  assert.match(zsh.stdout, /--full\[load broader legacy memory output\]/);
  assert.match(zsh.stdout, /--query-level\[recent chat sessions to mine\]/);
  assert.match(zsh.stdout, /update-global-folder/);
  assert.match(zsh.stdout, /update-global-folder\|ugf/);
  assert.match(zsh.stdout, /clone-memory\|cm/);
  assert.match(zsh.stdout, /--metacognize/);
  assert.doesNotMatch(zsh.stdout, /--restructure/);
  assert.match(zsh.stdout, /metacognize\|mc/);
  assert.match(zsh.stdout, /--workspace\[restructure workspace memory\]/);
  assert.match(zsh.stdout, /profile\|pf/);
  assert.match(zsh.stdout, /--from-profile\[source profile\]/);
  assert.match(zsh.stdout, /set-proof\|sp/);
  const powershell = await runEngram(cwd, env, ['completion', 'powershell']);
  assert.equal(powershell.code, 0, powershell.stderr);
  assert.match(powershell.stdout, /Register-ArgumentCompleter/);
  assert.match(powershell.stdout, /--budget-tokens/);
  const loadHelp = await runEngram(cwd, env, ['help', 'load']);
  assert.equal(loadHelp.code, 0, loadHelp.stderr);
  assert.match(loadHelp.stdout, /--budget-tokens/);
  assert.match(powershell.stdout, /'save-session', 'ss'/);
  assert.match(powershell.stdout, /'autosave'/);
  assert.match(powershell.stdout, /'policy'/);
  assert.doesNotMatch(powershell.stdout, /'dry-run'|'dr'|'propose'|'p'|'team-dashboard'|'td'|'update-help'|'uh'/);
  assert.match(powershell.stdout, /\$engramTakeControlArgs/);
  assert.match(powershell.stdout, /\$engramSaveSessionArgs/);
  assert.match(powershell.stdout, /'--query-level'/);
  assert.match(powershell.stdout, /\$engramUpgradeArgs/);
  assert.match(powershell.stdout, /\$engramGlobalFolderArgs/);
  assert.match(powershell.stdout, /\$engramCloneMemoryArgs/);
  assert.match(powershell.stdout, /'--metacognize'/);
  assert.doesNotMatch(powershell.stdout, /'--restructure'/);
  assert.match(powershell.stdout, /\$engramMetacognizeArgs/);
  assert.match(powershell.stdout, /'--workspace'/);
  assert.match(powershell.stdout, /\$engramProfileActions/);
  assert.match(powershell.stdout, /'ugf'/);
  assert.match(powershell.stdout, /'cm'/);
  assert.match(powershell.stdout, /'mc'/);
  assert.match(powershell.stdout, /'pf'/);
  assert.match(powershell.stdout, /'set-proof'/);
  assert.match(powershell.stdout, /'sp'/);
  assert.match(powershell.stdout, /'load', 'ld'/);
  assert.match(powershell.stdout, /'--all', '--budget-tokens', '--dry-run', '-f', '--full'/);
  await rm(cwd, { recursive: true, force: true });
});

test('help rehash shows topic help with alias', async () => {
  const { cwd, env } = await tempWorkspace('engram-help-rh-');
  const h = await runEngram(cwd, env, ['help', 'rehash']);
  assert.match(h.stdout, /Recompute and store hashes/);
  assert.match(h.stdout, /rh/);
});

test('help set-proof shows topic help with alias', async () => {
  const { cwd, env } = await tempWorkspace('engram-help-sp-');
  const h = await runEngram(cwd, env, ['help', 'set-proof']);
  assert.match(h.stdout, /proof/i);
  assert.match(h.stdout, /sp/);
});

test('help and completions expose OpenCode hook support', async () => {
  const { cwd, env } = await tempWorkspace('engram-opencode-help-');
  const help = await runEngram(cwd, env, ['help', 'agent-hook']);
  assert.equal(help.code, 0, help.stderr);
  assert.match(help.stdout, /OpenCode/);
  assert.match(help.stdout, /--host opencode/);

  for (const shell of ['bash', 'zsh', 'powershell']) {
    const completion = await runEngram(cwd, env, ['completion', shell]);
    assert.equal(completion.code, 0, completion.stderr);
    assert.match(completion.stdout, /opencode/);
  }
  await rm(cwd, { recursive: true, force: true });
});

test('help and completions expose Cursor and Windsurf hook support', async () => {
  const { cwd, env } = await tempWorkspace('engram-cursor-windsurf-help-');
  const help = await runEngram(cwd, env, ['help', 'agent-hook']);
  assert.equal(help.code, 0, help.stderr);
  assert.match(help.stdout, /--host cursor/);
  assert.match(help.stdout, /--host windsurf/);

  for (const shell of ['bash', 'zsh', 'powershell']) {
    const completion = await runEngram(cwd, env, ['completion', shell]);
    assert.equal(completion.code, 0, completion.stderr);
    assert.match(completion.stdout, /cursor/);
    assert.match(completion.stdout, /windsurf/);
  }
  await rm(cwd, { recursive: true, force: true });
});

test('help agent-hook mentions Cursor and Windsurf capabilities', async () => {
  const { cwd, env } = await tempWorkspace('engram-agent-hook-help-');
  const help = await runEngram(cwd, env, ['help', 'agent-hook']);
  assert.equal(help.code, 0, help.stderr);
  assert.match(help.stdout, /Cursor/);
  assert.match(help.stdout, /Windsurf/);
  await rm(cwd, { recursive: true, force: true });
});
