import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { installSkillset, unlinkSkillset, unlinkGlobalSkillset, skillsetTargets } from '../dist/core/integrations/skillset.js';
import { VERSION } from '../dist/core/runtime/version.js';
import { runEngram, tempWorkspace } from './helpers.mjs';

test('skillset installer writes all supported agent adapter files', async () => {
  const { cwd } = await tempWorkspace('engram-skillset-');
  const results = await installSkillset(cwd, 'all');
  const writtenTargets = [...new Set(results.map((result) => result.target))].sort();
  assert.deepEqual(writtenTargets, skillsetTargets().sort());
  assert.ok(!skillsetTargets().includes('antigravity'));
  assert.ok(!skillsetTargets().includes('antigravity-cli'));
  assert.ok(results.every((result) => result.action === 'written'));
  assert.match(await readFile(path.join(cwd, 'AGENTS.md'), 'utf8'), /Default agent mode: compact/);
  assert.match(await readFile(path.join(cwd, 'AGENTS.md'), 'utf8'), /knowledge memory center/);
  assert.match(await readFile(path.join(cwd, 'AGENTS.md'), 'utf8'), /Keep token usage low/);
  assert.match(await readFile(path.join(cwd, 'AGENTS.md'), 'utf8'), /Engram loaded: X memories \/ Y total related memories\./);
  assert.doesNotMatch(await readFile(path.join(cwd, 'AGENTS.md'), 'utf8'), /summarize only the relevant memory IDs\/rules/);
  const mcpConfig = await readFile(path.join(cwd, '.mcp.json'), 'utf8');
  assert.match(mcpConfig, /engram-mcp/);
  assert.equal(JSON.parse(mcpConfig).mcpServers.engram.command, 'npx');
  await assert.rejects(readFile(path.join(cwd, '.antigravity/skills/engram/SKILL.md'), 'utf8'));
  assert.match(await readFile(path.join(cwd, '.claude/commands/engram.md'), 'utf8'), /Engram Slash Command/);
  assert.match(await readFile(path.join(cwd, '.claude/commands/engram.md'), 'utf8'), /any `engram` CLI arguments/);
  assert.match(await readFile(path.join(cwd, '.claude/commands/engram.md'), 'utf8'), /current AI agent chat\/session/);
  assert.match(await readFile(path.join(cwd, '.claude/commands/engram.md'), 'utf8'), /recent accessible human-agent chat sessions/);
  assert.match(await readFile(path.join(cwd, '.claude/commands/engram.md'), 'utf8'), /save-session --query-level 50 --accept-all/);
  assert.match(await readFile(path.join(cwd, '.claude/commands/engram.md'), 'utf8'), /metacognize --workspace/);
  assert.match(await readFile(path.join(cwd, '.claude/commands/engram.md'), 'utf8'), /restructure workspace memory/);
  assert.match(await readFile(path.join(cwd, '.claude/skills/engram/SKILL.md'), 'utf8'), /any `engram` CLI arguments/);
  assert.match(await readFile(path.join(cwd, '.claude/skills/engram/SKILL.md'), 'utf8'), /Your knowledge memory manager, synced across every device with Git/);
  assert.match(await readFile(path.join(cwd, '.claude/skills/engram/SKILL.md'), 'utf8'), /take-control/);
  assert.match(await readFile(path.join(cwd, '.claude/skills/engram/SKILL.md'), 'utf8'), /take control` means `take-control/);
  assert.match(await readFile(path.join(cwd, '.claude/skills/engram/SKILL.md'), 'utf8'), /source pack token-light/);
  assert.match(await readFile(path.join(cwd, '.claude/skills/engram/SKILL.md'), 'utf8'), /ss -a/);
  assert.match(await readFile(path.join(cwd, '.claude/skills/engram/SKILL.md'), 'utf8'), /Never add `--accept-all` yourself/);
  assert.match(await readFile(path.join(cwd, '.cursor/commands/engram.md'), 'utf8'), /Engram Slash Command/);
  assert.match(await readFile(path.join(cwd, '.gemini/commands/engram.toml'), 'utf8'), /\/engram \{\{args\}\}/);
  assert.match(await readFile(path.join(cwd, '.gemini/commands/engram.toml'), 'utf8'), /Your knowledge memory manager, synced across every device with Git/);
  assert.match(await readFile(path.join(cwd, '.gemini/commands/engram.toml'), 'utf8'), /take-control/);
  assert.match(await readFile(path.join(cwd, '.gemini/commands/engram.toml'), 'utf8'), /"take control" to "take-control"/);
  assert.match(await readFile(path.join(cwd, '.gemini/commands/engram.toml'), 'utf8'), /"restructure workspace memory" to "metacognize --workspace"/);
  assert.doesNotMatch(await readFile(path.join(cwd, '.gemini/commands/engram.toml'), 'utf8'), /autosave|auto save|legacy "autosave"/);
  assert.match(await readFile(path.join(cwd, '.gemini/commands/engram.toml'), 'utf8'), /current AI agent chat\/session/);
  assert.match(await readFile(path.join(cwd, '.gemini/commands/engram.toml'), 'utf8'), /recent accessible human-agent chat sessions/);
  assert.match(await readFile(path.join(cwd, '.gemini/commands/engram.toml'), 'utf8'), /source pack token-light/);
  assert.match(await readFile(path.join(cwd, '.gemini/commands/engram.toml'), 'utf8'), /ss -a/);
  assert.match(await readFile(path.join(cwd, '.gemini/commands/engram.toml'), 'utf8'), /ss -a last 50 sessions/);
  assert.match(await readFile(path.join(cwd, '.gemini/commands/engram.toml'), 'utf8'), /save-session --accept-all/);
  assert.match(await readFile(path.join(cwd, '.gemini/commands/engram.toml'), 'utf8'), /metacognize accept-all/);
  const opencodeConfig = await readFile(path.join(cwd, 'opencode.json'), 'utf8');
  assert.match(opencodeConfig, /\.opencode\/engram\.md/);
  assert.deepEqual(JSON.parse(opencodeConfig).instructions, ['.opencode/engram.md']);
  assert.match(await readFile(path.join(cwd, '.opencode/engram.md'), 'utf8'), /Preferred replies/);
  await rm(cwd, { recursive: true, force: true });
});

test('skillset installer skips human-authored files unless forced', async () => {
  const { cwd } = await tempWorkspace('engram-skillset-');
  const file = path.join(cwd, 'AGENTS.md');
  await writeFile(file, '# Human agent instructions\n');
  const skipped = await installSkillset(cwd, 'agents-md');
  assert.equal(skipped[0].action, 'skipped');
  assert.match(await readFile(file, 'utf8'), /Human agent instructions/);
  const forced = await installSkillset(cwd, 'agents-md', true);
  assert.equal(forced[0].action, 'written');
  assert.match(await readFile(file, 'utf8'), /Engram Agent Skillset/);
  await rm(cwd, { recursive: true, force: true });
});

test('cli installs a single skillset target', async () => {
  const { cwd, env } = await tempWorkspace('engram-skillset-cli-');
  const result = await runEngram(cwd, env, ['link', 'gemini']);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /WRITTEN gemini: GEMINI.md/);
  assert.match(result.stdout, /WRITTEN gemini: \.mcp\.json/);
  assert.match(result.stdout, /gemini also covers current Antigravity 2\.0, Antigravity CLI, and Antigravity IDE/);
  assert.match(await readFile(path.join(cwd, 'GEMINI.md'), 'utf8'), /Engram Agent Skillset/);
  assert.equal(JSON.parse(await readFile(path.join(cwd, '.mcp.json'), 'utf8')).mcpServers.engram.command, 'npx');
  await rm(cwd, { recursive: true, force: true });
});

test('cli lists agents-md as fallback after mcp', async () => {
  const { cwd, env } = await tempWorkspace('engram-skillset-cli-');
  const result = await runEngram(cwd, env, ['l', 'list']);
  assert.equal(result.code, 0, result.stderr);
  const lines = result.stdout.split(/\r?\n/);
  const mcpIndex = lines.findIndex((line) => line.includes(' mcp'));
  const agentsMdIndex = lines.findIndex((line) => line.includes(' agents-md'));
  assert.ok(mcpIndex >= 0, result.stdout);
  assert.ok(agentsMdIndex > mcpIndex, result.stdout);
  assert.doesNotMatch(result.stdout, /antigravity/);
  assert.match(result.stdout, /gemini\s+# Also covers current Antigravity 2\.0, CLI, and IDE Gemini-compatible paths/);
  assert.match(result.stdout, /agents-md\s+# Generic AGENTS\.md fallback for unlisted AGENTS\.md-compatible agents/);
  await rm(cwd, { recursive: true, force: true });
});

test('cli installs open-code alias and hidden antigravity compatibility files', async () => {
  const { cwd, env } = await tempWorkspace('engram-skillset-cli-');
  const opencode = await runEngram(cwd, env, ['link', 'open-code']);
  assert.equal(opencode.code, 0, opencode.stderr);
  assert.match(opencode.stdout, /WRITTEN open-code: opencode\.json/);
  assert.match(opencode.stdout, /WRITTEN open-code: \.opencode\/engram\.md/);
  const antigravity = await runEngram(cwd, env, ['link', 'antigravity']);
  assert.equal(antigravity.code, 0, antigravity.stderr);
  assert.match(antigravity.stdout, /WRITTEN antigravity: \.antigravity\/skills\/engram\/SKILL\.md/);
  assert.match(antigravity.stdout, /WRITTEN antigravity: \.antigravity-cli\/skills\/engram\/SKILL\.md/);
  assert.match(antigravity.stdout, /WRITTEN antigravity: \.antigravity-ide\/skills\/engram\/SKILL\.md/);
  assert.match(antigravity.stdout, /WRITTEN antigravity: \.antigravityrules/);
  assert.match(await readFile(path.join(cwd, '.antigravityrules'), 'utf8'), /Engram Antigravity Rules/);

  const alias = await runEngram(cwd, env, ['link', 'antigravity-cli']);
  assert.equal(alias.code, 0, alias.stderr);
  assert.match(alias.stdout, /WRITTEN antigravity: \.antigravity\/skills\/engram\/SKILL\.md/);
  assert.doesNotMatch(alias.stdout, /WRITTEN antigravity-cli:/);
  await rm(cwd, { recursive: true, force: true });
});

test('cli installs codex alias as AGENTS.md skillset file', async () => {
  const { cwd, env } = await tempWorkspace('engram-skillset-cli-');
  const result = await runEngram(cwd, env, ['link', 'codex']);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /WRITTEN codex: AGENTS\.md/);
  assert.match(result.stdout, /WRITTEN codex: \.agents\/skills\/engram\/SKILL\.md/);
  assert.match(await readFile(path.join(cwd, 'AGENTS.md'), 'utf8'), /Speak only for confirmation/);
  assert.match(await readFile(path.join(cwd, '.agents/skills/engram/SKILL.md'), 'utf8'), /Default agent mode: compact/);
  await rm(cwd, { recursive: true, force: true });
});

test('cli installs slash command adapters', async () => {
  const { cwd, env } = await tempWorkspace('engram-skillset-cli-');
  const result = await runEngram(cwd, env, ['link', 'slash']);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /WRITTEN slash: \.claude\/commands\/engram\.md/);
  assert.match(result.stdout, /WRITTEN slash: \.claude\/skills\/engram\/SKILL\.md/);
  assert.match(result.stdout, /WRITTEN slash: \.cursor\/commands\/engram\.md/);
  assert.match(result.stdout, /WRITTEN slash: \.gemini\/commands\/engram\.toml/);
  assert.match(result.stdout, /if \/engram is not visible/);
  await rm(cwd, { recursive: true, force: true });
});

test('global skillset installer writes managed rules, skills, and registry', async () => {
  const { cwd, env } = await tempWorkspace('engram-skillset-global-');
  const agentHome = path.join(cwd, 'agent-home');
  const globalEnv = { ...env, ENGRAM_AGENT_HOME: agentHome, ENGRAM_AGENT_CONFIG_HOME: path.join(cwd, 'agent-config') };
  const result = await runEngram(cwd, globalEnv, ['link', '--global', 'codex']);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /Global link install/);
  assert.match(result.stdout, /WRITTEN codex: .*AGENTS\.md/);
  assert.match(result.stdout, /WRITTEN codex: .*SKILL\.md/);
  assert.match(result.stdout, /Registry:/);

  const agents = await readFile(path.join(agentHome, '.codex', 'AGENTS.md'), 'utf8');
  assert.match(agents, /BEGIN ENGRAM GLOBAL SKILLSET/);
  assert.match(agents, /Global Startup/);
  assert.match(agents, /engram load "<current task>"/);
  const skill = await readFile(path.join(agentHome, '.agents', 'skills', 'engram', 'SKILL.md'), 'utf8');
  assert.match(skill, /name: engram/);
  assert.match(skill, /Default agent mode: compact/);

  const registry = JSON.parse(await readFile(path.join(globalEnv.ENGRAM_CONFIG_DIR, 'global-skillsets.json'), 'utf8'));
  assert.equal(registry.installs.codex.files.length, 2);
  assert.equal(registry.installs.codex.engram_version, VERSION);

  const updated = await runEngram(cwd, globalEnv, ['link', '--global', 'codex']);
  assert.equal(updated.code, 0, updated.stderr);
  assert.match(updated.stdout, /UPDATED codex: .*AGENTS\.md/);
  assert.match(updated.stdout, /UPDATED codex: .*SKILL\.md/);
  await rm(cwd, { recursive: true, force: true });
});

test('global antigravity install writes 2.0, CLI, and IDE skill folders', async () => {
  const { cwd, env } = await tempWorkspace('engram-skillset-global-');
  const agentHome = path.join(cwd, 'agent-home');
  const configHome = path.join(cwd, 'agent-config');
  const globalEnv = { ...env, ENGRAM_AGENT_HOME: agentHome, ENGRAM_AGENT_CONFIG_HOME: configHome };
  const result = await runEngram(cwd, globalEnv, ['link', '--global', 'antigravity']);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /WRITTEN antigravity: .*\.antigravity[\\/]skills[\\/]engram[\\/]SKILL\.md/);
  assert.match(result.stdout, /WRITTEN antigravity: .*\.antigravity-cli[\\/]skills[\\/]engram[\\/]SKILL\.md/);
  assert.match(result.stdout, /WRITTEN antigravity: .*\.antigravity-ide[\\/]skills[\\/]engram[\\/]SKILL\.md/);
  assert.match(result.stdout, /WRITTEN antigravity: .*gemini[\\/]mcp\.json/);
  assert.match(await readFile(path.join(agentHome, '.antigravity', 'skills', 'engram', 'SKILL.md'), 'utf8'), /name: engram/);
  assert.match(await readFile(path.join(agentHome, '.antigravity-cli', 'skills', 'engram', 'SKILL.md'), 'utf8'), /Default agent mode: compact/);
  assert.match(await readFile(path.join(agentHome, '.antigravity-ide', 'skills', 'engram', 'SKILL.md'), 'utf8'), /save-session --accept-all/);
  assert.equal(JSON.parse(await readFile(path.join(configHome, 'gemini', 'mcp.json'), 'utf8')).mcpServers.engram.command, 'npx');
  const registry = JSON.parse(await readFile(path.join(globalEnv.ENGRAM_CONFIG_DIR, 'global-skillsets.json'), 'utf8'));
  assert.equal(registry.installs.antigravity.files.length, 4);
  await rm(cwd, { recursive: true, force: true });
});

test('global skill-capable targets write host skill folders', async () => {
  const { cwd, env } = await tempWorkspace('engram-skillset-global-');
  const agentHome = path.join(cwd, 'agent-home');
  const configHome = path.join(cwd, 'agent-config');
  const globalEnv = { ...env, ENGRAM_AGENT_HOME: agentHome, ENGRAM_AGENT_CONFIG_HOME: configHome };

  const gemini = await runEngram(cwd, globalEnv, ['link', '--global', 'gemini']);
  assert.equal(gemini.code, 0, gemini.stderr);
  assert.match(gemini.stdout, /WRITTEN gemini: .*\.gemini[\\/]GEMINI\.md/);
  assert.match(gemini.stdout, /WRITTEN gemini: .*\.gemini[\\/]skills[\\/]engram[\\/]SKILL\.md/);
  assert.match(gemini.stdout, /WRITTEN gemini: .*gemini[\\/]mcp\.json/);
  assert.match(gemini.stdout, /gemini also covers current Antigravity 2\.0, Antigravity CLI, and Antigravity IDE/);
  assert.match(await readFile(path.join(agentHome, '.gemini', 'skills', 'engram', 'SKILL.md'), 'utf8'), /Engram Memory Management Skill/);
  assert.equal(JSON.parse(await readFile(path.join(configHome, 'gemini', 'mcp.json'), 'utf8')).mcpServers.engram.command, 'npx');

  const opencode = await runEngram(cwd, globalEnv, ['link', '--global', 'open-code']);
  assert.equal(opencode.code, 0, opencode.stderr);
  assert.match(opencode.stdout, /WRITTEN open-code: .*opencode[\\/]AGENTS\.md/);
  assert.match(opencode.stdout, /WRITTEN open-code: .*opencode[\\/]skills[\\/]engram[\\/]SKILL\.md/);
  assert.match(await readFile(path.join(configHome, 'opencode', 'skills', 'engram', 'SKILL.md'), 'utf8'), /Default agent mode: compact/);

  const slash = await runEngram(cwd, globalEnv, ['link', '--global', 'slash']);
  assert.equal(slash.code, 0, slash.stderr);
  assert.match(slash.stdout, /WRITTEN slash: .*\.claude[\\/]commands[\\/]engram\.md/);
  assert.match(slash.stdout, /WRITTEN slash: .*\.claude[\\/]skills[\\/]engram[\\/]SKILL\.md/);
  assert.match(slash.stdout, /WRITTEN slash: .*\.gemini[\\/]commands[\\/]engram\.toml/);
  assert.match(await readFile(path.join(agentHome, '.claude', 'skills', 'engram', 'SKILL.md'), 'utf8'), /Engram Slash Skill/);

  await rm(cwd, { recursive: true, force: true });
});

test('global copilot install appends user instruction file', async () => {
  const { cwd, env } = await tempWorkspace('engram-skillset-global-');
  const agentHome = path.join(cwd, 'agent-home');
  const globalEnv = { ...env, ENGRAM_AGENT_HOME: agentHome, ENGRAM_AGENT_CONFIG_HOME: path.join(cwd, 'agent-config') };
  const copilotFile = path.join(agentHome, '.copilot', 'copilot-instructions.md');
  await mkdir(path.dirname(copilotFile), { recursive: true });
  await writeFile(copilotFile, '# Copilot human rules\n\n- Keep this rule.\n');

  const result = await runEngram(cwd, globalEnv, ['link', '--global', 'copilot']);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /UPDATED copilot: .*\.copilot[\\/]copilot-instructions\.md/);

  const copilot = await readFile(copilotFile, 'utf8');
  assert.match(copilot, /# Copilot human rules/);
  assert.match(copilot, /- Keep this rule\./);
  assert.match(copilot, /BEGIN ENGRAM GLOBAL SKILLSET/);
  assert.match(copilot, /engram load "<current task>"/);

  const registry = JSON.parse(await readFile(path.join(globalEnv.ENGRAM_CONFIG_DIR, 'global-skillsets.json'), 'utf8'));
  assert.equal(registry.installs.copilot.files.length, 1);
  assert.equal(registry.installs.copilot.files[0].path, path.join(agentHome, '.copilot', 'copilot-instructions.md').replace(/\\/g, '/'));
  await rm(cwd, { recursive: true, force: true });
});

test('global skillset installer preserves human-authored shared files with a managed block', async () => {
  const { cwd, env } = await tempWorkspace('engram-skillset-global-');
  const agentHome = path.join(cwd, 'agent-home');
  const globalEnv = { ...env, ENGRAM_AGENT_HOME: agentHome, ENGRAM_AGENT_CONFIG_HOME: path.join(cwd, 'agent-config') };
  const codexDir = path.join(agentHome, '.codex');
  await mkdir(codexDir, { recursive: true });
  await writeFile(path.join(codexDir, 'AGENTS.md'), [
    '# Human global rules',
    '',
    '<!-- BEGIN ENGRAM GLOBAL SKILLSET -->',
    '# Old Engram block',
    '<!-- END ENGRAM GLOBAL SKILLSET -->',
    '',
    '# Tail human rules',
    ''
  ].join('\n'));

  const result = await runEngram(cwd, globalEnv, ['link', '--global', 'agents-md']);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /UPDATED agents-md: .*AGENTS\.md/);
  const agents = await readFile(path.join(codexDir, 'AGENTS.md'), 'utf8');
  assert.match(agents, /# Human global rules/);
  assert.match(agents, /# Tail human rules/);
  assert.match(agents, /BEGIN ENGRAM GLOBAL SKILLSET/);
  assert.doesNotMatch(agents, /# Old Engram block/);
  assert.equal((agents.match(/BEGIN ENGRAM GLOBAL SKILLSET/g) ?? []).length, 1);
  assert.ok(agents.indexOf('# Tail human rules') < agents.lastIndexOf('BEGIN ENGRAM GLOBAL SKILLSET'), agents);
  assert.ok(agents.trimEnd().endsWith('<!-- END ENGRAM GLOBAL SKILLSET -->'), agents);
  await rm(cwd, { recursive: true, force: true });
});

test('global claude install appends CLAUDE.md and writes Claude skill path', async () => {
  const { cwd, env } = await tempWorkspace('engram-skillset-global-');
  const agentHome = path.join(cwd, 'agent-home');
  const globalEnv = { ...env, ENGRAM_AGENT_HOME: agentHome, ENGRAM_AGENT_CONFIG_HOME: path.join(cwd, 'agent-config') };
  const claudeFile = path.join(agentHome, '.claude', 'CLAUDE.md');
  await mkdir(path.dirname(claudeFile), { recursive: true });
  await writeFile(claudeFile, '# Claude human rules\n\n- Keep this at the top.\n');

  const result = await runEngram(cwd, globalEnv, ['install-skill', 'set', '--global', 'claude']);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /UPDATED claude: .*CLAUDE\.md/);
  assert.match(result.stdout, /WRITTEN claude: .*\.claude[\\/]skills[\\/]engram[\\/]SKILL\.md/);

  const claude = await readFile(claudeFile, 'utf8');
  assert.match(claude, /# Claude human rules/);
  assert.match(claude, /- Keep this at the top\./);
  assert.equal((claude.match(/BEGIN ENGRAM GLOBAL SKILLSET/g) ?? []).length, 1);
  assert.ok(claude.trimEnd().endsWith('<!-- END ENGRAM GLOBAL SKILLSET -->'), claude);

  const skill = await readFile(path.join(agentHome, '.claude', 'skills', 'engram', 'SKILL.md'), 'utf8');
  assert.match(skill, /name: engram/);
  assert.match(skill, /Engram Slash Skill/);
  assert.match(skill, /When the human types `\/engram <args>`/);
  const mcp = JSON.parse(await readFile(path.join(agentHome, '.claude', 'mcp.json'), 'utf8'));
  assert.equal(mcp.mcpServers.engram.command, 'npx');

  const registry = JSON.parse(await readFile(path.join(globalEnv.ENGRAM_CONFIG_DIR, 'global-skillsets.json'), 'utf8'));
  assert.equal(registry.installs.claude.files.length, 3);
  await rm(cwd, { recursive: true, force: true });
});

test('global codex install appends rules and skips human-authored skill files', async () => {
  const { cwd, env } = await tempWorkspace('engram-skillset-global-');
  const agentHome = path.join(cwd, 'agent-home');
  const globalEnv = { ...env, ENGRAM_AGENT_HOME: agentHome, ENGRAM_AGENT_CONFIG_HOME: path.join(cwd, 'agent-config') };
  const codexFile = path.join(agentHome, '.codex', 'AGENTS.md');
  const skillFile = path.join(agentHome, '.agents', 'skills', 'engram', 'SKILL.md');
  await mkdir(path.dirname(codexFile), { recursive: true });
  await mkdir(path.dirname(skillFile), { recursive: true });
  await writeFile(codexFile, '# My Codex Rules\n\n- Keep this rule.\n');
  await writeFile(skillFile, '# Human Engram-like Skill\n\nDo not replace me.\n');

  const result = await runEngram(cwd, globalEnv, ['link', '--global', 'codex']);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /UPDATED codex: .*AGENTS\.md/);
  assert.match(result.stdout, /SKIPPED codex: .*SKILL\.md/);

  const codex = await readFile(codexFile, 'utf8');
  assert.match(codex, /# My Codex Rules/);
  assert.match(codex, /- Keep this rule\./);
  assert.match(codex, /BEGIN ENGRAM GLOBAL SKILLSET/);
  assert.match(codex, /END ENGRAM GLOBAL SKILLSET/);
  assert.equal((codex.match(/# My Codex Rules/g) ?? []).length, 1);
  assert.match(await readFile(skillFile, 'utf8'), /Do not replace me\./);
  await rm(cwd, { recursive: true, force: true });
});

test('unlink removes generated files and skips human-authored ones', async () => {
  const { cwd } = await tempWorkspace('engram-unlink-');
  await installSkillset(cwd, 'agents-md');
  const skillDir = path.join(cwd, '.agents', 'skills', 'engram');
  await mkdir(skillDir, { recursive: true });
  await writeFile(path.join(skillDir, 'SKILL.md'), '# Human skill file\n');

  const results = await unlinkSkillset(cwd, 'all');
  const removed = results.filter((r) => r.action === 'removed');
  const skipped = results.filter((r) => r.action === 'skipped');
  assert.ok(removed.length > 0, 'should remove generated files');
  assert.ok(skipped.length > 0, 'should skip human-authored files');
  await assert.rejects(readFile(path.join(cwd, 'AGENTS.md'), 'utf8'));
  assert.match(await readFile(path.join(skillDir, 'SKILL.md'), 'utf8'), /Human skill file/);
  await rm(cwd, { recursive: true, force: true });
});

test('unlink --force removes human-authored files too', async () => {
  const { cwd } = await tempWorkspace('engram-unlink-');
  const file = path.join(cwd, 'AGENTS.md');
  await writeFile(file, '# Human agent instructions\n');
  const results = await unlinkSkillset(cwd, 'agents-md', true);
  assert.ok(results.every((r) => r.action === 'removed'), 'all removed with --force');
  await assert.rejects(readFile(file, 'utf8'));
  await rm(cwd, { recursive: true, force: true });
});

test('unlink global cleans managed blocks and removes file-type entries', async () => {
  const { cwd, env } = await tempWorkspace('engram-unlink-global-');
  const agentHome = path.join(cwd, 'agent-home');
  const globalEnv = { ...env, ENGRAM_AGENT_HOME: agentHome, ENGRAM_AGENT_CONFIG_HOME: path.join(cwd, 'agent-config') };
  await runEngram(cwd, globalEnv, ['link', '--global', 'codex']);

  const unlinkResult = await runEngram(cwd, globalEnv, ['unlink', '--global', 'codex']);
  assert.equal(unlinkResult.code, 0, unlinkResult.stderr);
  assert.match(unlinkResult.stdout, /Global unlink/);

  const registry = JSON.parse(await readFile(path.join(globalEnv.ENGRAM_CONFIG_DIR, 'global-skillsets.json'), 'utf8'));
  assert.ok(!registry.installs.codex, 'codex should be removed from registry');
  await rm(cwd, { recursive: true, force: true });
});

test('unlink global cleans managed block from shared file without deleting it', async () => {
  const { cwd, env } = await tempWorkspace('engram-unlink-global-');
  const agentHome = path.join(cwd, 'agent-home');
  const globalEnv = { ...env, ENGRAM_AGENT_HOME: agentHome, ENGRAM_AGENT_CONFIG_HOME: path.join(cwd, 'agent-config') };
  const codexFile = path.join(agentHome, '.codex', 'AGENTS.md');
  await mkdir(path.dirname(codexFile), { recursive: true });
  await writeFile(codexFile, '# Human rules\n\n- Keep this.\n');
  await runEngram(cwd, globalEnv, ['link', '--global', 'codex']);
  assert.match(await readFile(codexFile, 'utf8'), /BEGIN ENGRAM GLOBAL SKILLSET/);

  const unlinkResult = await runEngram(cwd, globalEnv, ['unlink', '--global', 'codex']);
  assert.equal(unlinkResult.code, 0, unlinkResult.stderr);

  const agentsMd = await readFile(codexFile, 'utf8');
  assert.doesNotMatch(agentsMd, /BEGIN ENGRAM GLOBAL SKILLSET/);
  assert.match(agentsMd, /Human rules/);
  await rm(cwd, { recursive: true, force: true });
});

test('cli unlink removes generated files and reports results', async () => {
  const { cwd, env } = await tempWorkspace('engram-unlink-cli-');
  await runEngram(cwd, env, ['link', 'agents-md']);
  const unlinkResult = await runEngram(cwd, env, ['unlink', 'agents-md']);
  assert.equal(unlinkResult.code, 0, unlinkResult.stderr);
  assert.match(unlinkResult.stdout, /Unlink/);
  await rm(cwd, { recursive: true, force: true });
});

test('cli global unlink removes registered files', async () => {
  const { cwd, env } = await tempWorkspace('engram-unlink-cli-');
  const agentHome = path.join(cwd, 'agent-home');
  const globalEnv = { ...env, ENGRAM_AGENT_HOME: agentHome, ENGRAM_AGENT_CONFIG_HOME: path.join(cwd, 'agent-config') };
  await runEngram(cwd, globalEnv, ['link', '--global', 'codex']);
  const unlinkResult = await runEngram(cwd, globalEnv, ['unlink', '--global', 'codex']);
  assert.equal(unlinkResult.code, 0, unlinkResult.stderr);
  assert.match(unlinkResult.stdout, /Global unlink/);
  await rm(cwd, { recursive: true, force: true });
});

test('global link installs MCP config for supported targets', async () => {
  const { cwd, env } = await tempWorkspace('engram-skillset-global-');
  const agentHome = path.join(cwd, 'agent-home');
  const globalEnv = { ...env, ENGRAM_AGENT_HOME: agentHome, ENGRAM_AGENT_CONFIG_HOME: path.join(cwd, 'agent-config') };
  const result = await runEngram(cwd, globalEnv, ['link', '--global', 'mcp']);
  assert.equal(result.code, 0, result.stderr);
  const claudeMcp = await readFile(path.join(agentHome, '.claude', 'mcp.json'), 'utf8');
  assert.match(claudeMcp, /engram-mcp/);
  assert.equal(JSON.parse(claudeMcp).mcpServers.engram.command, 'npx');
  await rm(cwd, { recursive: true, force: true });
});
