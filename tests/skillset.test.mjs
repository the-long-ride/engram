import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { estimateTokens } from '../dist/core/memory/payload-plan.js';
import { installSkillset, installGlobalSkillset, previewLinkedWorkspaceSkillsets, previewRegisteredGlobalSkillsets, unlinkSkillset, unlinkGlobalSkillset, skillsetTargets, resolveLinkTargets } from '../dist/core/integrations/skillset.js';
import { detectInstalledAgents, resolveAllTargets, allSupportedTargets } from '../dist/core/integrations/agent-detect.js';
import { hookHostsForTarget } from '../dist/core/integrations/agent-hooks.js';
import { parseFrontmatter } from '../dist/core/memory/frontmatter.js';
import { VERSION } from '../dist/core/runtime/version.js';
import { initGit, makeEngramMcpBin, pathWithoutEngramMcp, runEngram, tempWorkspace, withPath } from './helpers.mjs';
import { mcpCommandLine, renderCodexMcpBlock, resolveMcpCommand } from '../dist/core/integrations/mcp-config.js';

// In-process installs resolve the MCP command from this process's PATH; keep it free of a real engram-mcp.
process.env.PATH = pathWithoutEngramMcp();
import {
  renderCursorRule,
  renderWindsurfRule,
  renderWindsurfGlobalRulesBlock,
  renderCursorPluginJson,
  mergeMcpJson,
  unmergeMcpJson,
  renderMinimalInstructionBlock,
  hasWorkspaceManagedBlock,
  removeWorkspaceManagedBlock,
  upsertWorkspaceManagedBlock,
  isGenerated,
  validateSkillFrontmatter,
  validateSkillFile
} from '../dist/core/integrations/skillset-render.js';

function assertSimpleOpenCodeMcp(server) {
  assert.deepEqual(server, {
    type: 'local',
    command: ['engram-mcp'],
    args: [],
    enabled: true
  });
}

/** The npx fallback pins the running Engram version so a host never launches an unreviewed release. */
const PINNED_PACKAGE = `@the-long-ride/engram@${VERSION}`;

test('skillset installer writes all supported agent adapter files (--all-supported)', async () => {
  const { cwd } = await tempWorkspace('engram-skillset-');
  const results = await installSkillset(cwd, 'all-supported');
  const writtenTargets = [...new Set(results.map((result) => result.target))].sort();
  assert.deepEqual(writtenTargets, skillsetTargets().sort());
  assert.ok(!skillsetTargets().includes('antigravity'));
  assert.ok(!skillsetTargets().includes('antigravity-cli'));
  // agents-md now writes minimal block into AGENTS.md + full guide to .agents/engram.md
  const agentsMd = await readFile(path.join(cwd, 'AGENTS.md'), 'utf8');
  assert.match(agentsMd, /<!-- engram:start -->/);
  assert.match(agentsMd, /Full guide:/);
  assert.doesNotMatch(agentsMd, /Default agent mode: compact/);
  assert.doesNotMatch(agentsMd, /Save flow:/);
  assert.doesNotMatch(agentsMd, /Rule memories:/);
  assert.doesNotMatch(agentsMd, /clone-memory/);
  // Full guide should exist with full protocol
  const guide = await readFile(path.join(cwd, '.agents/engram.md'), 'utf8');
  assert.match(guide, /Save flow:/);
  assert.match(guide, /Rule memories:/);
  assert.match(guide, /Default agent mode: compact/);
  assert.match(guide, /Memory value gate/);
  assert.match(guide, /AI-agent chat save protocol/);
assert.match(guide, /engram save-session --force/);
  assert.match(guide, /yes.*audit.*cancel/is);
  const mcpConfig = await readFile(path.join(cwd, '.mcp.json'), 'utf8');
  assert.match(mcpConfig, /engram-mcp/);
  assert.equal(JSON.parse(mcpConfig).mcpServers.engram.command, 'npx');
  await assert.rejects(readFile(path.join(cwd, '.antigravity/skills/engram/SKILL.md'), 'utf8'));
  // D13: slash adapters are thin pointers (command map + guide path); the protocol lives once in the host guide.
  const claudeCommand = await readFile(path.join(cwd, '.claude/commands/engram.md'), 'utf8');
  assert.match(claudeCommand, /Engram Slash Command/);
  assert.match(claudeCommand, /any `engram` CLI arguments/);
  assert.match(claudeCommand, /save-session/);
  assert.match(claudeCommand, /metacognize/);
  assert.match(claudeCommand, /Agent action:/);
  assert.match(claudeCommand, /`\/engram` alone: show a compact menu/);
  assert.match(claudeCommand, /`propose` = `save-session` over the current chat/);
  assert.match(claudeCommand, /Full protocol: `\.claude\/engram\.md`/);
  const claudeSkill = await readFile(path.join(cwd, '.claude/skills/engram/SKILL.md'), 'utf8');
  assert.match(claudeSkill, /any `engram` CLI arguments/);
  assert.match(claudeSkill, /Your knowledge memory manager, synced across every device with Git/);
  assert.match(claudeSkill, /take-control/);
  assert.match(claudeSkill, /Never add `--force`/);
  assert.match(claudeSkill, /compact menu/);
  assert.match(claudeSkill, /Full protocol: `\.claude\/engram\.md`/);
  const claudeGuide = await readFile(path.join(cwd, '.claude/engram.md'), 'utf8');
  assert.match(claudeGuide, /current AI agent chat\/session/);
  assert.match(claudeGuide, /recent accessible human-agent chat sessions/);
  assert.match(claudeGuide, /ss -f` = `save-session --force/);
  assert.match(claudeGuide, /metacognize --workspace/);
  assert.match(claudeGuide, /source pack token-light/);
  assert.match(claudeGuide, /replace earlier Engram context/i);
  assert.match(claudeGuide, /what should we save to engram\?/);
  assert.match(claudeGuide, /Never use `--force`/);
  // Natural-language aliases are normalized by src/cli/args.ts, so adapters no longer teach them.
  assert.doesNotMatch(claudeSkill, /take control` means/);
  assert.match(await readFile(path.join(cwd, '.cursor/commands/engram.md'), 'utf8'), /Full protocol: `\.cursor\/engram\.md`/);
  const geminiCommand = await readFile(path.join(cwd, '.gemini/commands/engram.toml'), 'utf8');
  assert.match(geminiCommand, /\/engram \{\{args\}\}/);
  assert.match(geminiCommand, /Your knowledge memory manager, synced across every device with Git/);
  assert.match(geminiCommand, /take-control/);
  assert.doesNotMatch(geminiCommand, /autosave|auto save|legacy "autosave"/);
  assert.match(geminiCommand, /save-session \(ss\)/);
  assert.match(geminiCommand, /Agent action:/);
  assert.match(geminiCommand, /If there are no args, do not run the CLI/);
  assert.match(geminiCommand, /propose = save-session over the current chat/);
  assert.match(geminiCommand, /Full protocol: \.gemini\/engram\.md/);
  assert.ok(geminiCommand.trimEnd().split(/\r?\n/).length <= 40);
  const opencodeAgentsMd = await readFile(path.join(cwd, 'AGENTS.md'), 'utf8');
  assert.match(opencodeAgentsMd, /<!-- engram:start -->/);
  assert.match(opencodeAgentsMd, /Full guide: `\.opencode\/engram\.md`/);
  const opencodeSkill = await readFile(path.join(cwd, '.opencode', 'skills', 'engram', 'SKILL.md'), 'utf8');
  assert.match(opencodeSkill, /name: engram/);
  assert.match(opencodeSkill, /Engram Memory Management Skill/);
  const opencodeGuide = await readFile(path.join(cwd, '.opencode', 'engram.md'), 'utf8');
  assert.match(opencodeGuide, /Preferred replies/);
  assert.match(opencodeGuide, /Save flow:/);
  const opencodeParsed = JSON.parse(await readFile(path.join(cwd, 'opencode.json'), 'utf8'));
  assert.ok(opencodeParsed.mcp && opencodeParsed.mcp.engram, 'opencode.json should include engram MCP config');
  assertSimpleOpenCodeMcp(opencodeParsed.mcp.engram);
  assert.ok(!opencodeParsed.instructions?.includes('.opencode/engram.md'), 'OpenCode should use AGENTS.md, not opencode.json instructions, for Engram rules');
  await rm(cwd, { recursive: true, force: true });
});

test('skillset installer upserts minimal block when human AGENTS.md exists', async () => {
  const { cwd } = await tempWorkspace('engram-skillset-');
  const file = path.join(cwd, 'AGENTS.md');
  await writeFile(file, '# Human agent instructions\n');
  await installSkillset(cwd, 'agents-md');
  // Now: human file gets block appended (not skipped)
  const content = await readFile(file, 'utf8');
  assert.match(content, /Human agent instructions/);
  assert.match(content, /<!-- engram:start -->/);
  assert.match(content, /Full guide:/);
  // Exact one block marker
  assert.equal((content.match(/<!-- engram:start -->/g) ?? []).length, 1);
  // Guide file should be written
  const guide = await readFile(path.join(cwd, '.agents/engram.md'), 'utf8');
  assert.match(guide, /Save flow:/);
  await rm(cwd, { recursive: true, force: true });
});

test('cli installs a single skillset target', async () => {
  const { cwd, env } = await tempWorkspace('engram-skillset-cli-');
  const result = await runEngram(cwd, env, ['link', 'gemini']);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /WRITTEN gemini: GEMINI.md/);
  assert.match(result.stdout, /WRITTEN gemini: \.gemini[\\\/]settings\.json/);
  assert.match(result.stdout, /gemini also covers current Antigravity 2\.0, Antigravity CLI, and Antigravity IDE/);
  // GEMINI.md gets minimal block
  const geminiMd = await readFile(path.join(cwd, 'GEMINI.md'), 'utf8');
  assert.match(geminiMd, /<!-- engram:start -->/);
  assert.match(geminiMd, /Full guide:/);
  assert.doesNotMatch(geminiMd, /Default agent mode: compact/);
  // Guide file written
  assert.match(await readFile(path.join(cwd, '.gemini/engram.md'), 'utf8'), /Save flow:/);
  assert.equal(JSON.parse(await readFile(path.join(cwd, '.gemini/settings.json'), 'utf8')).mcpServers.engram.command, 'npx');
  await assert.rejects(readFile(path.join(cwd, '.mcp.json'), 'utf8'), 'Gemini CLI does not read .mcp.json');
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
  assert.match(opencode.stdout, /WRITTEN open-code: AGENTS\.md/);
  assert.match(opencode.stdout, /WRITTEN open-code: \.opencode\/skills\/engram\/SKILL\.md/);
  assert.match(opencode.stdout, /WRITTEN open-code: \.opencode\/engram\.md/);
  assert.match(opencode.stdout, /WRITTEN open-code: opencode\.json/);
  const workspaceOpencodeJson = JSON.parse(await readFile(path.join(cwd, 'opencode.json'), 'utf8'));
  assert.ok(workspaceOpencodeJson.mcp && workspaceOpencodeJson.mcp.engram, 'workspace opencode.json should include engram MCP config');
  assertSimpleOpenCodeMcp(workspaceOpencodeJson.mcp.engram);
  await assert.rejects(readFile(path.join(cwd, '.mcp.json'), 'utf8'), 'OpenCode target should not create root .mcp.json');
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
  assert.match(result.stdout, /WRITTEN codex: \.agents\/engram\.md/);
  // AGENTS.md: minimal block only
  const agentsMd = await readFile(path.join(cwd, 'AGENTS.md'), 'utf8');
  assert.match(agentsMd, /<!-- engram:start -->/);
  assert.match(agentsMd, /Full guide:/);
  assert.doesNotMatch(agentsMd, /Runtime Bootstrap/);
  assert.doesNotMatch(agentsMd, /Save flow:/);
  assert.doesNotMatch(agentsMd, /clone-memory/);
  // .agents/engram.md: full guide; the Codex skill points at it (D13)
  assert.match(await readFile(path.join(cwd, '.agents/skills/engram/SKILL.md'), 'utf8'), /Full protocol: `\.agents\/engram\.md`/);
  assert.match(await readFile(path.join(cwd, '.agents/engram.md'), 'utf8'), /Default agent mode: compact/);
  assert.match(await readFile(path.join(cwd, '.agents/engram.md'), 'utf8'), /Save flow:/);
  assert.match(await readFile(path.join(cwd, '.agents/engram.md'), 'utf8'), /Rule memories:/);
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
  assert.match(result.stdout, /WRITTEN slash: \.opencode\/commands\/engram\.md/);
  assert.match(result.stdout, /if \/engram is not visible/);
  await rm(cwd, { recursive: true, force: true });
});

/**
 * Files a Claude session can read: other hosts' slash adapters are never loaded by Claude. `link claude` writes AGENTS.md
 * instead of CLAUDE.md (same size), so AGENTS.md is the auto-loaded bootstrap. `.agents/engram.md`, the AGENTS.md
 * pointer target, is a near-twin of `.claude/engram.md` and Claude reads one guide per session, so only `.claude/**` is counted.
 */
const CLAUDE_SURFACE = /^(?:CLAUDE\.md|AGENTS\.md|\.mcp\.json|\.claude\/)/;
const SESSION_START_LOAD = /session start[^\n]*engram load/i;

async function workspaceFiles(root, dir = '') {
  const out = [];
  for (const entry of await readdir(path.join(root, dir), { withFileTypes: true })) {
    const rel = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...await workspaceFiles(root, rel));
    else out.push(rel);
  }
  return out;
}

/** `link` has no --slash flag (it is ignored), so the slash adapters are linked explicitly. */
async function linkClaudeWithSlash(cwd, env) {
  for (const args of [['link', 'claude', '--slash'], ['link', 'slash']]) {
    const result = await runEngram(cwd, env, args);
    assert.equal(result.code, 0, result.stderr);
  }
}

// Before D13 the Claude surface after `engram link claude --slash` + `engram link slash` was 7,158 tokens:
// CLAUDE.md 147, .claude/engram.md 2,265, .claude/commands/engram.md 2,148, .claude/skills/engram/SKILL.md 2,173,
// .claude/settings.json 378, .mcp.json 47. The budget rose from 2,500 to 2,550 when the SubagentStart hook group landed in settings.json,
// and to 2,600 when the Claude skill gained when_to_use + user-invocable and the command file gained description frontmatter (T13).
test('D13: Claude surface (CLAUDE.md, .claude/**, .mcp.json) after link claude + link slash stays within 2,600 tokens', async () => {
  const { cwd, env } = await tempWorkspace('engram-skillset-budget-');
  try {
    await linkClaudeWithSlash(cwd, env);
    const files = (await workspaceFiles(cwd)).filter((file) => CLAUDE_SURFACE.test(file));
    assert.ok(files.includes('.claude/engram.md') && files.includes('.claude/commands/engram.md') && files.includes('.claude/skills/engram/SKILL.md'), files.join(', '));
    let total = 0;
    for (const file of files) total += estimateTokens(await readFile(path.join(cwd, file), 'utf8'));
    assert.ok(total <= 2600, `Claude surface is ${total} estimated tokens`);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('D13: Claude skill and slash command are thin pointers to the canonical guide', async () => {
  const { cwd, env } = await tempWorkspace('engram-skillset-pointer-');
  try {
    await linkClaudeWithSlash(cwd, env);
    for (const file of ['.claude/skills/engram/SKILL.md', '.claude/commands/engram.md']) {
      const text = await readFile(path.join(cwd, file), 'utf8');
      assert.ok(text.trimEnd().split(/\r?\n/).length <= 40, `${file} must be at most 40 lines`);
      assert.match(text, /Full protocol: `\.claude\/engram\.md`/, file);
      assert.match(text, /save-session/, `${file} keeps the command map`);
      assert.match(text, /take-control/, `${file} keeps the command map`);
      assert.doesNotMatch(text, /AI-agent chat save protocol|Memory value gate/, `${file} must not restate the approval protocol`);
    }
    const guide = await readFile(path.join(cwd, '.claude/engram.md'), 'utf8');
    assert.equal((guide.match(/AI-agent chat save protocol/g) ?? []).length, 1, 'approval protocol is stated once in the guide');
    assert.match(guide, /engram load --id <id>/);
    assert.match(guide, /already loaded:/);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('D13: with hooks installed no managed file tells the agent to load at session start', async () => {
  const { cwd, env } = await tempWorkspace('engram-skillset-hooked-');
  try {
    await linkClaudeWithSlash(cwd, env);
    assert.match(await readFile(path.join(cwd, '.claude/settings.json'), 'utf8'), /engram agent-hook/);
    for (const file of (await workspaceFiles(cwd)).filter((rel) => CLAUDE_SURFACE.test(rel))) {
      assert.doesNotMatch(await readFile(path.join(cwd, file), 'utf8'), SESSION_START_LOAD, file);
    }
    assert.match(await readFile(path.join(cwd, '.claude/engram.md'), 'utf8'), /hooks auto-inject/i);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('D13: without hooks the guide still says to load at session start', async () => {
  const { cwd, env } = await tempWorkspace('engram-skillset-unhooked-');
  const previousConfigDir = process.env.ENGRAM_CONFIG_DIR;
  process.env.ENGRAM_CONFIG_DIR = env.ENGRAM_CONFIG_DIR;
  try {
    await installSkillset(cwd, 'claude');
    const guide = await readFile(path.join(cwd, '.claude/engram.md'), 'utf8');
    assert.match(guide, SESSION_START_LOAD);
    assert.doesNotMatch(guide, /hooks auto-inject/i);
  } finally {
    if (previousConfigDir === undefined) delete process.env.ENGRAM_CONFIG_DIR; else process.env.ENGRAM_CONFIG_DIR = previousConfigDir;
    await rm(cwd, { recursive: true, force: true });
  }
});

test('D13: read mode manual or off renders the unhooked wording even with hooks installed', async () => {
  for (const mode of ['manual', 'off']) {
    const { cwd, env } = await tempWorkspace(`engram-skillset-read-${mode}-`);
    try {
      assert.equal((await runEngram(cwd, env, ['inject', '--no-skillset'])).code, 0);
      assert.equal((await runEngram(cwd, env, ['set-read', mode])).code, 0);
      const linked = await runEngram(cwd, env, ['link', 'claude']);
      assert.equal(linked.code, 0, linked.stderr);
      assert.match(await readFile(path.join(cwd, '.claude/settings.json'), 'utf8'), /engram agent-hook/);
      const guide = await readFile(path.join(cwd, '.claude/engram.md'), 'utf8');
      assert.match(guide, SESSION_START_LOAD, mode);
      assert.doesNotMatch(guide, /hooks auto-inject/i, mode);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  }
});

test('D13: hookHostsForTarget excludes hookless copilot and cline', () => {
  assert.deepEqual(hookHostsForTarget('copilot'), []);
  assert.deepEqual(hookHostsForTarget('cline'), []);
  assert.deepEqual(hookHostsForTarget(''), []);
  const all = hookHostsForTarget('all');
  assert.ok(!all.includes('copilot') && !all.includes('cline'), all.join(', '));
  assert.deepEqual([...all].sort(), ['claude', 'codex', 'cursor', 'gemini', 'opencode', 'windsurf']);
});

test('D13: link claude then upgrade --plan shows no guide diff (no hook wording flip-flop)', async () => {
  const { cwd, env } = await tempWorkspace('engram-skillset-flipflop-');
  const previousConfigDir = process.env.ENGRAM_CONFIG_DIR;
  process.env.ENGRAM_CONFIG_DIR = env.ENGRAM_CONFIG_DIR;
  try {
    assert.equal((await runEngram(cwd, env, ['inject', '--no-skillset'])).code, 0);
    assert.equal((await runEngram(cwd, env, ['link', 'claude'])).code, 0);
    const plan = await runEngram(cwd, env, ['upgrade', '--plan', '--no-version-check']);
    assert.equal(plan.code, 0, plan.stderr);
    assert.doesNotMatch(plan.stdout, /\.claude[\\/]engram\.md/);
    assert.doesNotMatch(plan.stdout, /PLANNED claude: CLAUDE\.md/);
    assert.doesNotMatch(plan.stdout, /AGENTS\.md/, 'a freshly linked AGENTS.md block is already current');
    const previews = await previewLinkedWorkspaceSkillsets(cwd);
    const guide = previews.find((row) => path.normalize(row.file) === path.normalize('.claude/engram.md'));
    assert.ok(guide, 'guide preview should exist');
    assert.equal(guide.current, guide.expected, 'freshly linked guide must equal its upgrade preview');
  } finally {
    if (previousConfigDir === undefined) delete process.env.ENGRAM_CONFIG_DIR; else process.env.ENGRAM_CONFIG_DIR = previousConfigDir;
    await rm(cwd, { recursive: true, force: true });
  }
});

test('D13: shared .agents/engram.md hedges hook wording for hookless readers', async () => {
  const { cwd, env } = await tempWorkspace('engram-skillset-shared-guide-');
  try {
    for (const target of ['codex', 'copilot']) {
      const linked = await runEngram(cwd, env, ['link', target]);
      assert.equal(linked.code, 0, linked.stderr);
    }
    assert.match(await readFile(path.join(cwd, '.github/copilot-instructions.md'), 'utf8'), /Full guide: `\.agents\/engram\.md`/);
    const guide = await readFile(path.join(cwd, '.agents/engram.md'), 'utf8');
    assert.doesNotMatch(guide, /do not load it yourself/i);
    assert.match(guide, /If no Engram context was injected, run `engram load "<current task>"`/);
    assert.doesNotMatch(guide, SESSION_START_LOAD);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
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
  assert.match(agents, /<!-- engram:start -->/);
  assert.match(agents, /Full guide: `~\/\.agents\/engram\.md`/);
  assert.doesNotMatch(agents, /Global Startup/);
  const guide = await readFile(path.join(agentHome, '.agents', 'engram.md'), 'utf8');
  assert.match(guide, /Global Startup/);
assert.match(guide, /engram load "<current task>"/);
  assert.match(guide, /Default agent mode: compact/);
  const skill = await readFile(path.join(agentHome, '.agents', 'skills', 'engram', 'SKILL.md'), 'utf8');
  assert.match(skill, /name: engram/);
  assert.match(skill, /Full protocol: `~\/\.agents\/engram\.md`/);

  const registry = JSON.parse(await readFile(path.join(globalEnv.ENGRAM_CONFIG_DIR, 'global-skillsets.json'), 'utf8'));
  assert.equal(registry.installs.codex.files.length, 4);
  assert.ok(registry.installs.codex.files.some((file) => file.path.endsWith('.codex/config.toml')), 'codex MCP config.toml is registered for unlink/upgrade');
  assert.equal(registry.installs.codex.engram_version, VERSION);

  const updated = await runEngram(cwd, globalEnv, ['link', '--global', 'codex']);
  assert.equal(updated.code, 0, updated.stderr);
  assert.match(updated.stdout, /UPDATED codex: .*AGENTS\.md/);
  assert.match(updated.stdout, /UPDATED codex: .*SKILL\.md/);
  await rm(cwd, { recursive: true, force: true });
});


test('shared global Engram guide stays canonical across codex claude and gemini installs', async () => {
  const { cwd, env } = await tempWorkspace('engram-skillset-global-shared-');
  const agentHome = path.join(cwd, 'agent-home');
  const globalEnv = { ...env, ENGRAM_AGENT_HOME: agentHome, ENGRAM_AGENT_CONFIG_HOME: path.join(cwd, 'agent-config') };
  const guideFile = path.join(agentHome, '.agents', 'engram.md');

  let canonical = '';
  for (const target of ['codex', 'claude', 'gemini']) {
    const result = await runEngram(cwd, globalEnv, ['link', '--global', target]);
    assert.equal(result.code, 0, result.stderr);
    const guide = await readFile(guideFile, 'utf8');
    assert.match(guide, /Global Startup/);
    if (!canonical) canonical = guide;
    else assert.equal(guide, canonical, `${target} must not rewrite the shared guide with host-specific content`);
  }

  await rm(cwd, { recursive: true, force: true });
});

test('global antigravity install writes 2.0, CLI, and IDE skill folders', async () => {
  const { cwd, env } = await tempWorkspace('engram-skillset-global-');
  const agentHome = path.join(cwd, 'agent-home');
  const configHome = path.join(cwd, 'agent-config');
  const globalEnv = { ...env, ENGRAM_AGENT_HOME: agentHome, ENGRAM_AGENT_CONFIG_HOME: configHome };
  const result = await runEngram(cwd, globalEnv, ['link', '--global', 'antigravity']);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /WRITTEN antigravity: .*\.gemini[\\\/]antigravity[\\\/]skills[\\\/]engram[\\\/]SKILL\.md/);
  assert.match(result.stdout, /WRITTEN antigravity: .*\.gemini[\\\/]skills[\\\/]engram[\\\/]SKILL\.md/);
  assert.match(result.stdout, /WRITTEN antigravity: .*\.gemini[\\\/]config[\\\/]mcp_config\.json/);
  assert.match(result.stdout, /WRITTEN antigravity: .*\.gemini[\\\/]config[\\\/]hooks\.json/);
  // Antigravity has no separate global guide, so its own skill carries the full protocol (D13).
  const antigravitySkill = await readFile(path.join(agentHome, '.gemini', 'antigravity', 'skills', 'engram', 'SKILL.md'), 'utf8');
  assert.match(antigravitySkill, /name: engram/);
  assert.match(antigravitySkill, /Default agent mode: compact/);
  assert.match(antigravitySkill, /save-session --force/);
  assert.match(await readFile(path.join(agentHome, '.gemini', 'skills', 'engram', 'SKILL.md'), 'utf8'), /Full protocol: /);
  assert.equal(JSON.parse(await readFile(path.join(agentHome, '.gemini', 'config', 'mcp_config.json'), 'utf8')).mcpServers.engram.command, 'npx');
  assert.match(await readFile(path.join(agentHome, '.gemini', 'config', 'hooks.json'), 'utf8'), /engram-auto-load/);
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
  assert.match(gemini.stdout, /WRITTEN gemini: .*\.gemini[\\\/]GEMINI\.md/);
  assert.match(gemini.stdout, /WRITTEN gemini: .*\.gemini[\\\/]skills[\\\/]engram[\\\/]SKILL\.md/);
  assert.match(gemini.stdout, /WRITTEN gemini: .*\.gemini[\\\/]settings\.json/);
  assert.match(gemini.stdout, /WRITTEN gemini: .*\.gemini[\\\/]config[\\\/]hooks\.json/);
  assert.match(gemini.stdout, /gemini also covers current Antigravity 2\.0, Antigravity CLI, and Antigravity IDE/);
  assert.match(await readFile(path.join(agentHome, '.gemini', 'skills', 'engram', 'SKILL.md'), 'utf8'), /Engram Memory Management Skill/);
  assert.equal(JSON.parse(await readFile(path.join(agentHome, '.gemini', 'settings.json'), 'utf8')).mcpServers.engram.command, 'npx');

  const opencode = await runEngram(cwd, globalEnv, ['link', '--global', 'open-code']);
  assert.equal(opencode.code, 0, opencode.stderr);
  assert.match(opencode.stdout, /WRITTEN open-code: .*opencode[\\\/]AGENTS\.md/);
  assert.match(opencode.stdout, /WRITTEN open-code: .*opencode[\\\/]skills[\\\/]engram[\\\/]SKILL\.md/);
  assert.match(opencode.stdout, /WRITTEN open-code: .*opencode[\\\/]engram\.md/);
  assert.match(opencode.stdout, /WRITTEN open-code: .*opencode[\\\/]opencode\.jsonc/);
  const opencodeHome = path.join(agentHome, '.config', 'opencode');
  const globalAgents = await readFile(path.join(opencodeHome, 'AGENTS.md'), 'utf8');
  assert.match(globalAgents, /Full guide: `~\/\.config\/opencode\/engram\.md`/);
  assert.match(await readFile(path.join(opencodeHome, 'engram.md'), 'utf8'), /Global Startup/);
  assert.match(await readFile(path.join(opencodeHome, 'engram.md'), 'utf8'), /Default agent mode: compact/);
  assert.match(await readFile(path.join(opencodeHome, 'skills', 'engram', 'SKILL.md'), 'utf8'), /Full protocol: `~\/\.config\/opencode\/engram\.md`/);
  const globalOpencodeConfig = JSON.parse(await readFile(path.join(opencodeHome, 'opencode.jsonc'), 'utf8'));
  assert.ok(globalOpencodeConfig.mcp && globalOpencodeConfig.mcp.engram, 'global opencode.jsonc should include engram MCP config');
  assertSimpleOpenCodeMcp(globalOpencodeConfig.mcp.engram);

  const slash = await runEngram(cwd, globalEnv, ['link', '--global', 'slash']);
  assert.equal(slash.code, 0, slash.stderr);
  assert.match(slash.stdout, /WRITTEN slash: .*\.claude[\\\/]commands[\\\/]engram\.md/);
  assert.match(slash.stdout, /WRITTEN slash: .*\.claude[\\\/]skills[\\\/]engram[\\\/]SKILL\.md/);
  assert.match(slash.stdout, /WRITTEN slash: .*\.gemini[\\\/]commands[\\\/]engram\.toml/);
  assert.match(slash.stdout, /WRITTEN slash: .*opencode[\\\/]commands[\\\/]engram\.md/);
  assert.match(await readFile(path.join(agentHome, '.claude', 'skills', 'engram', 'SKILL.md'), 'utf8'), /Engram Slash Skill/);

  await rm(cwd, { recursive: true, force: true });
});

test('global opencode ignores generic config home and writes ~/.config/opencode defaults', async () => {
  const { cwd, env } = await tempWorkspace('engram-opencode-global-config-home-');
  const agentHome = path.join(cwd, 'agent-home');
  const configHome = path.join(cwd, 'agent-config');
  const appDataHome = path.join(cwd, 'appdata');
  const globalEnv = {
    ...env,
    ENGRAM_AGENT_HOME: agentHome,
    ENGRAM_AGENT_CONFIG_HOME: configHome,
    APPDATA: appDataHome
  };
  delete globalEnv.XDG_CONFIG_HOME;

  const result = await runEngram(cwd, globalEnv, ['link', '--global', 'opencode']);
  assert.equal(result.code, 0, result.stderr);
  const opencodeHome = path.join(agentHome, '.config', 'opencode');
  assert.match(await readFile(path.join(opencodeHome, 'AGENTS.md'), 'utf8'), /~\/\.config\/opencode\/engram\.md/);
  assert.match(await readFile(path.join(opencodeHome, 'skills', 'engram', 'SKILL.md'), 'utf8'), /Engram Memory Management Skill/);
  assert.ok(JSON.parse(await readFile(path.join(opencodeHome, 'opencode.jsonc'), 'utf8')).mcp?.engram);
  await assert.rejects(readFile(path.join(configHome, 'opencode', 'opencode.jsonc'), 'utf8'));
  await assert.rejects(readFile(path.join(appDataHome, 'opencode', 'opencode.jsonc'), 'utf8'));
  await rm(cwd, { recursive: true, force: true });
});

test('global opencode MCP merges into existing human-authored opencode.json', async () => {
  const { cwd, env } = await tempWorkspace('engram-skillset-global-');
  const agentHome = path.join(cwd, 'agent-home');
  const globalEnv = { ...env, ENGRAM_AGENT_HOME: agentHome };
  const opencodeDir = path.join(agentHome, '.config', 'opencode');
  await mkdir(opencodeDir, { recursive: true });
  await writeFile(path.join(opencodeDir, 'opencode.json'), JSON.stringify({
    $schema: 'https://opencode.ai/config.json',
    instructions: ['.opencode/custom.md'],
    mcp: { other: { type: 'local', command: ['other-bin'], enabled: true } }
  }, null, 2));

  const result = await runEngram(cwd, globalEnv, ['link', '--global', 'opencode']);
  assert.equal(result.code, 0, result.stderr);
  const merged = JSON.parse(await readFile(path.join(opencodeDir, 'opencode.json'), 'utf8'));
  assert.ok(merged.mcp.other, 'existing MCP entries should be preserved');
  assert.ok(merged.mcp.engram, 'engram MCP entry should be merged in');
  assertSimpleOpenCodeMcp(merged.mcp.engram);
  assert.deepEqual(merged.instructions, ['.opencode/custom.md'], 'human instructions should be preserved');
  await rm(cwd, { recursive: true, force: true });
});

test('workspace opencode link merges into existing opencode.jsonc and preserves user settings', async () => {
  const { cwd, env } = await tempWorkspace('engram-opencode-workspace-jsonc-');
  await writeFile(path.join(cwd, 'opencode.jsonc'), [
    '{',
    '  "$schema": "https://opencode.ai/config.json",',
    '  // keep user settings',
    '  "plugin": ["user-plugin"],',
    '  "theme": "system",',
    '}',
    ''
  ].join('\n'));

  const linked = await runEngram(cwd, env, ['link', 'opencode']);
  assert.equal(linked.code, 0, linked.stderr);
  const merged = JSON.parse(await readFile(path.join(cwd, 'opencode.jsonc'), 'utf8'));
  assert.deepEqual(merged.plugin, ['user-plugin']);
  assert.equal(merged.theme, 'system');
  assert.ok(merged.mcp?.engram, 'engram MCP should be added to opencode.jsonc');
  await assert.rejects(readFile(path.join(cwd, 'opencode.json'), 'utf8'));
  await rm(cwd, { recursive: true, force: true });
});

test('workspace opencode force link preserves unparseable opencode.jsonc', async () => {
  const { cwd, env } = await tempWorkspace('engram-opencode-workspace-invalid-jsonc-');
  const opencodeJsoncPath = path.join(cwd, 'opencode.jsonc');
  const invalidConfig = '{\n  "plugin": ["user-plugin"],\n  "mcp": {\n';
  await writeFile(opencodeJsoncPath, invalidConfig);

  const linked = await runEngram(cwd, env, ['link', 'opencode', '--force']);
  assert.equal(linked.code, 0, linked.stderr);
  assert.equal(await readFile(opencodeJsoncPath, 'utf8'), invalidConfig);
  assert.match(linked.stdout, /SKIPPED opencode: opencode\.jsonc/);
  await rm(cwd, { recursive: true, force: true });
});

test('global opencode MCP merges into existing human-authored opencode.jsonc', async () => {
  const { cwd, env } = await tempWorkspace('engram-opencode-global-jsonc-');
  const agentHome = path.join(cwd, 'agent-home');
  const globalEnv = { ...env, ENGRAM_AGENT_HOME: agentHome };
  const opencodeDir = path.join(agentHome, '.config', 'opencode');
  await mkdir(opencodeDir, { recursive: true });
  await writeFile(path.join(opencodeDir, 'opencode.jsonc'), [
    '{',
    '  "$schema": "https://opencode.ai/config.json",',
    '  // keep user settings',
    '  "plugin": ["user-plugin"],',
    '  "theme": "system",',
    '}',
    ''
  ].join('\n'));

  const result = await runEngram(cwd, globalEnv, ['link', '--global', 'opencode']);
  assert.equal(result.code, 0, result.stderr);
  const merged = JSON.parse(await readFile(path.join(opencodeDir, 'opencode.jsonc'), 'utf8'));
  assert.deepEqual(merged.plugin, ['user-plugin']);
  assert.equal(merged.theme, 'system');
  assert.ok(merged.mcp?.engram, 'engram MCP should be added');
  await assert.rejects(readFile(path.join(opencodeDir, 'opencode.json'), 'utf8'));
  await rm(cwd, { recursive: true, force: true });
});

test('global opencode force link preserves unparseable config', async () => {
  const { cwd, env } = await tempWorkspace('engram-opencode-global-invalid-');
  const agentHome = path.join(cwd, 'agent-home');
  const globalEnv = { ...env, ENGRAM_AGENT_HOME: agentHome };
  const opencodeDir = path.join(agentHome, '.config', 'opencode');
  const opencodeJsonPath = path.join(opencodeDir, 'opencode.json');
  const invalidConfig = '{\n  "plugin": ["user-plugin"],\n  "mcp": {\n';
  await mkdir(opencodeDir, { recursive: true });
  await writeFile(opencodeJsonPath, invalidConfig);

  const result = await runEngram(cwd, globalEnv, ['link', '--global', 'opencode', '--force']);
  assert.equal(result.code, 0, result.stderr);
  assert.equal(await readFile(opencodeJsonPath, 'utf8'), invalidConfig);
  assert.match(result.stdout, /SKIPPED opencode:/);
  await rm(cwd, { recursive: true, force: true });
});

test('global MCP force link preserves unparseable shared config', async () => {
  const { cwd, env } = await tempWorkspace('engram-mcp-global-invalid-');
  const agentHome = path.join(cwd, 'agent-home');
  const globalEnv = { ...env, ENGRAM_AGENT_HOME: agentHome, ENGRAM_AGENT_CONFIG_HOME: path.join(cwd, 'agent-config') };
  const mcpPath = path.join(agentHome, '.claude', 'mcp.json');
  const invalidConfig = '{\n  "mcpServers": {\n';
  await mkdir(path.dirname(mcpPath), { recursive: true });
  await writeFile(mcpPath, invalidConfig);

  const result = await runEngram(cwd, globalEnv, ['link', '--global', 'claude', '--force']);
  assert.equal(result.code, 0, result.stderr);
  assert.equal(await readFile(mcpPath, 'utf8'), invalidConfig);
  assert.match(result.stdout, /SKIPPED claude:/);
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
  assert.match(result.stdout, /UPDATED copilot: .*\.copilot[\\\/]copilot-instructions\.md/);

  const copilot = await readFile(copilotFile, 'utf8');
  assert.match(copilot, /# Copilot human rules/);
  assert.match(copilot, /- Keep this rule\./);
  assert.match(copilot, /<!-- engram:start -->/);
  assert.match(copilot, /Full guide:/);
assert.match(copilot, /engram load "<task>"/);

  const registry = JSON.parse(await readFile(path.join(globalEnv.ENGRAM_CONFIG_DIR, 'global-skillsets.json'), 'utf8'));
  assert.equal(registry.installs.copilot.files.length, 2);
  assert.ok(registry.installs.copilot.files.some((f) => f.path.endsWith('/copilot-instructions.md')));
  assert.ok(registry.installs.copilot.files.some((f) => f.path.endsWith('/engram.md')));
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
  assert.match(agents, /<!-- engram:start -->/);
  assert.doesNotMatch(agents, /# Old Engram block/);
  assert.equal((agents.match(/<!-- engram:start -->/g) ?? []).length, 1);
  assert.ok(agents.indexOf('# Tail human rules') < agents.lastIndexOf('<!-- engram:start -->'), agents);
  assert.ok(agents.trimEnd().endsWith('<!-- engram:end -->'), agents);
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
  assert.match(result.stdout, /WRITTEN claude: .*\.claude[\\\/]skills[\\\/]engram[\\\/]SKILL\.md/);

  const claude = await readFile(claudeFile, 'utf8');
  assert.match(claude, /# Claude human rules/);
  assert.match(claude, /- Keep this at the top\./);
  assert.equal((claude.match(/<!-- engram:start -->/g) ?? []).length, 1);
  assert.ok(claude.trimEnd().endsWith('<!-- engram:end -->'), claude);

  const skill = await readFile(path.join(agentHome, '.claude', 'skills', 'engram', 'SKILL.md'), 'utf8');
  assert.match(skill, /name: engram/);
  assert.match(skill, /Engram Slash Skill/);
  assert.match(skill, /When the human types `\/engram <args>`/);
  assert.match(skill, /Full protocol: `~\/\.agents\/engram\.md`/);
  // Claude Code reads user MCP servers from ~/.claude.json, so Engram prints the `claude mcp add` hint and writes no mcp.json.
  assert.match(result.stdout, /claude mcp add --scope user engram -- /);
  await assert.rejects(readFile(path.join(agentHome, '.claude', 'mcp.json'), 'utf8'));

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
  assert.match(codex, /<!-- engram:start -->/);
  assert.match(codex, /<!-- engram:end -->/);
  assert.equal((codex.match(/# My Codex Rules/g) ?? []).length, 1);
  assert.match(await readFile(skillFile, 'utf8'), /Do not replace me\./);
  await rm(cwd, { recursive: true, force: true });
});

test('unlink removes managed block and guide, skips human files', async () => {
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
  // AGENTS.md removed (was only block content)
  await assert.rejects(readFile(path.join(cwd, 'AGENTS.md'), 'utf8'));
  // guide removed
  await assert.rejects(readFile(path.join(cwd, '.agents/engram.md'), 'utf8'));
  assert.match(await readFile(path.join(skillDir, 'SKILL.md'), 'utf8'), /Human skill file/);
  await rm(cwd, { recursive: true, force: true });
});

test('unlink --force removes human-authored files too', async () => {
  const { cwd } = await tempWorkspace('engram-unlink-');
  const file = path.join(cwd, 'AGENTS.md');
  await writeFile(file, '# Human agent instructions\n');
  const results = await unlinkSkillset(cwd, 'agents-md', true);
  // The instruction file should be removed (guide file may also have a result)
  assert.ok(results.some((r) => r.file === 'AGENTS.md' && r.action === 'removed'), 'AGENTS.md should be removed with --force');
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
  assert.match(await readFile(codexFile, 'utf8'), /<!-- engram:start -->/);

  const unlinkResult = await runEngram(cwd, globalEnv, ['unlink', '--global', 'codex']);
  assert.equal(unlinkResult.code, 0, unlinkResult.stderr);

  const agentsMd = await readFile(codexFile, 'utf8');
  assert.doesNotMatch(agentsMd, /<!-- engram:start -->/);
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
  assert.match(result.stdout, /claude mcp add --scope user engram -- /);
  await assert.rejects(readFile(path.join(agentHome, '.claude', 'mcp.json'), 'utf8'));
  assert.equal(JSON.parse(await readFile(path.join(agentHome, '.gemini', 'settings.json'), 'utf8')).mcpServers.engram.command, 'npx');
  assert.match(await readFile(path.join(agentHome, '.codex', 'config.toml'), 'utf8'), /\[mcp_servers\.engram\]/);
  await rm(cwd, { recursive: true, force: true });
});

const BOOTSTRAP_MAX_CHARS = 1800;
const LEGACY_MIN_CHARS = 2500;

test('codex alias writes minimal AGENTS.md block and pointer SKILL.md', async () => {
  const { cwd, env } = await tempWorkspace('engram-skillset-bootstrap-');
  const result = await runEngram(cwd, env, ['link', 'codex']);
  assert.equal(result.code, 0, result.stderr);
  const agentsMd = await readFile(path.join(cwd, 'AGENTS.md'), 'utf8');
  // Minimal block, not full bootstrap or compact
  assert.match(agentsMd, /<!-- engram:start -->/);
  assert.match(agentsMd, /Full guide:/);
  assert.ok(agentsMd.length <= BOOTSTRAP_MAX_CHARS, `AGENTS.md too large: ${agentsMd.length}`);
  assert.doesNotMatch(agentsMd, /Save flow:/);
  assert.doesNotMatch(agentsMd, /clone-memory/);
  assert.doesNotMatch(agentsMd, /take-control/);
  assert.doesNotMatch(agentsMd, /Rule memories:/);
  assert.doesNotMatch(agentsMd, /Runtime Bootstrap/);
  // SKILL.md is a thin pointer (D13): command map plus the guide path
  const skill = await readFile(path.join(cwd, '.agents/skills/engram/SKILL.md'), 'utf8');
  assert.match(skill, /Full protocol: `\.agents\/engram\.md`/);
  assert.match(skill, /Never add `--force`/i);
  assert.match(skill, /save-session/);
  assert.doesNotMatch(skill, /Save flow:/);
  // Full guide at .agents/engram.md holds the protocol once
  const guide = await readFile(path.join(cwd, '.agents/engram.md'), 'utf8');
  assert.match(guide, /Save flow:/);
  assert.match(guide, /Rule memories:/);
  assert.match(guide, /Never use `--force`/i);
  assert.match(guide, /Default agent mode: compact/);
  await rm(cwd, { recursive: true, force: true });
});

test('agents-md fallback writes minimal block and guide file', async () => {
  const { cwd } = await tempWorkspace('engram-skillset-fallback-');
  await installSkillset(cwd, 'agents-md');
  const agentsMd = await readFile(path.join(cwd, 'AGENTS.md'), 'utf8');
  // Minimal block
  assert.match(agentsMd, /<!-- engram:start -->/);
  assert.match(agentsMd, /Full guide:/);
  assert.doesNotMatch(agentsMd, /Save flow:/);
  assert.doesNotMatch(agentsMd, /Rule memories:/);
  // Full guide in companion file
  const guide = await readFile(path.join(cwd, '.agents/engram.md'), 'utf8');
  assert.ok(guide.length >= LEGACY_MIN_CHARS, `guide unexpectedly short: ${guide.length}`);
  assert.match(guide, /Save flow:/);
  assert.match(guide, /Rule memories:/);
  await rm(cwd, { recursive: true, force: true });
});

test('workspace refresh keeps codex-linked AGENTS.md as minimal block', async () => {
  const { cwd } = await tempWorkspace('engram-skillset-refresh-codex-');
  await installSkillset(cwd, 'codex');
  // Simulate stale minimal block content
  await writeFile(path.join(cwd, 'AGENTS.md'), '<!-- engram:start -->\n# Engram\n\nOld stale block line.\n<!-- engram:end -->\n');

  const { refreshGeneratedWorkspaceSkillsets } = await import('../dist/core/integrations/skillset.js');
  const refreshed = await refreshGeneratedWorkspaceSkillsets(cwd);
  assert.ok(refreshed.some((item) => item.file === 'AGENTS.md'));

  const agentsMd = await readFile(path.join(cwd, 'AGENTS.md'), 'utf8');
  assert.match(agentsMd, /<!-- engram:start -->/);
  assert.match(agentsMd, /Full guide:/);
  assert.doesNotMatch(agentsMd, /Save flow:/);
  await rm(cwd, { recursive: true, force: true });
});


test('agent detect resolves installed agents on the current device', async () => {
  const detected = detectInstalledAgents();
  // At minimum, we should detect at least some agents on a dev machine
  assert.ok(detected instanceof Set);
  // all returns detected agents only
  const allTargets = resolveAllTargets();
  assert.ok(allTargets.length > 0);
  assert.ok(allTargets.includes('mcp'));
  assert.ok(allTargets.includes('slash'));
  // all-supported returns everything
  const allSupported = allSupportedTargets();
  assert.ok(allSupported.length >= allTargets.length);
  // all-supported includes all known agent targets
  assert.ok(allSupported.includes('claude'));
  assert.ok(allSupported.includes('cursor'));
  assert.ok(allSupported.includes('gemini'));
});

test('resolveLinkTargets all auto-detects while all-supported returns everything', () => {
  const detected = resolveLinkTargets('all');
  const full = resolveLinkTargets('all-supported');
  assert.ok(full.length >= detected.length);
  assert.ok(full.some((t) => t.name === 'cursor'));
  assert.ok(full.some((t) => t.name === 'opencode'));
  assert.ok(full.some((t) => t.name === 'windsurf'));
  assert.ok(full.some((t) => t.name === 'cline'));
  // detected should include always-targets
  assert.ok(detected.some((t) => t.name === 'mcp'));
  assert.ok(detected.some((t) => t.name === 'slash'));
});

test('workspace refresh migrates generated full AGENTS.md to minimal block + guide', async () => {
  const { cwd } = await tempWorkspace('engram-skillset-refresh-fallback-');
  // Write a legacy full generated AGENTS.md (old format)
  const legacyContent = '<!-- Generated by Engram skillset installer. Edit with care. -->\n\n# Engram Agent Skillset\n\nEngram = knowledge memory center for project, workspace, team, and personal context. Default agent mode: compact.\n\n## Protocol\n\n- Save flow: use `engram save`.\n- Rule memories: target 50 counted content lines.\n';
  await writeFile(path.join(cwd, 'AGENTS.md'), legacyContent);

  const { refreshGeneratedWorkspaceSkillsets } = await import('../dist/core/integrations/skillset.js');
  const refreshed = await refreshGeneratedWorkspaceSkillsets(cwd);
  assert.ok(refreshed.some((item) => item.file === 'AGENTS.md'), 'AGENTS.md should be reported');
  assert.ok(refreshed.some((item) => item.file === '.agents/engram.md'), '.agents/engram.md should be reported');

  const agentsMd = await readFile(path.join(cwd, 'AGENTS.md'), 'utf8');
  // Minimal block only
  assert.match(agentsMd, /<!-- engram:start -->/);
  assert.match(agentsMd, /Full guide:/);
  assert.doesNotMatch(agentsMd, /Save flow:/);
  assert.doesNotMatch(agentsMd, /Rule memories:/);
  // Full guide written
  const guide = await readFile(path.join(cwd, '.agents/engram.md'), 'utf8');
  assert.match(guide, /Save flow:/);
  assert.match(guide, /Rule memories:/);
  assert.match(guide, /Generated by Engram skillset installer/);
  await rm(cwd, { recursive: true, force: true });
});

test('engram link agents-md writes minimal AGENTS.md and full guide', async () => {
  const { cwd } = await tempWorkspace('engram-skillset-minimal-');
  await installSkillset(cwd, 'agents-md');
  const agentsMd = await readFile(path.join(cwd, 'AGENTS.md'), 'utf8');
  assert.match(agentsMd, /<!-- engram:start -->/);
  assert.match(agentsMd, /Full guide: `\.agents\/engram\.md`/);
  assert.doesNotMatch(agentsMd, /Save flow:/);
  assert.doesNotMatch(agentsMd, /Rule memories:/);
  assert.doesNotMatch(agentsMd, /clone-memory/);
  const guide = await readFile(path.join(cwd, '.agents/engram.md'), 'utf8');
  assert.match(guide, /Save flow:/);
  assert.match(guide, /Rule memories:/);
  assert.match(guide, /clone-memory/);
  assert.match(guide, /Generated by Engram skillset installer/);
  await rm(cwd, { recursive: true, force: true });
});

test('engram link preserves human AGENTS.md and upserts managed block', async () => {
  const { cwd } = await tempWorkspace('engram-skillset-human-');
  const file = path.join(cwd, 'AGENTS.md');
  await writeFile(file, '# My project rules\n\n- Always use TypeScript.\n');
  await installSkillset(cwd, 'agents-md');
  const content = await readFile(file, 'utf8');
  assert.match(content, /# My project rules/);
  assert.match(content, /Always use TypeScript/);
  assert.match(content, /<!-- engram:start -->/);
  assert.equal((content.match(/<!-- engram:start -->/g) ?? []).length, 1);
  assert.ok(await readFile(path.join(cwd, '.agents/engram.md'), 'utf8'));
  await rm(cwd, { recursive: true, force: true });
});

test('engram link refreshes existing managed block', async () => {
  const { cwd } = await tempWorkspace('engram-skillset-refresh-block-');
  const file = path.join(cwd, 'AGENTS.md');
  // Write stale block
  await writeFile(file, '# My rules\n\n<!-- engram:start -->\n# Engram\n\nOld stale block line.\n<!-- engram:end -->\n');
  await installSkillset(cwd, 'agents-md');
  const content = await readFile(file, 'utf8');
  assert.match(content, /# My rules/);
  assert.doesNotMatch(content, /Old stale block line/);
  assert.match(content, /Full guide:/);
  assert.equal((content.match(/<!-- engram:start -->/g) ?? []).length, 1);
  await rm(cwd, { recursive: true, force: true });
});

test('engram unlink removes managed block and generated guide', async () => {
  const { cwd } = await tempWorkspace('engram-unlink-block-');
  await installSkillset(cwd, 'agents-md');
  // Verify link worked
  assert.match(await readFile(path.join(cwd, 'AGENTS.md'), 'utf8'), /<!-- engram:start -->/);
  assert.match(await readFile(path.join(cwd, '.agents/engram.md'), 'utf8'), /Save flow:/);

  await unlinkSkillset(cwd, 'agents-md');
  // AGENTS.md removed (only block content)
  await assert.rejects(readFile(path.join(cwd, 'AGENTS.md'), 'utf8'));
  // Guide removed
  await assert.rejects(readFile(path.join(cwd, '.agents/engram.md'), 'utf8'));
  await rm(cwd, { recursive: true, force: true });
});

test('engram unlink preserves human instruction content after block removal', async () => {
  const { cwd } = await tempWorkspace('engram-unlink-human-');
  const file = path.join(cwd, 'AGENTS.md');
  await writeFile(file, '# My rules\n\n- Keep this rule.\n');
  await installSkillset(cwd, 'agents-md');
  assert.match(await readFile(file, 'utf8'), /<!-- engram:start -->/);

  await unlinkSkillset(cwd, 'agents-md');
  const remaining = await readFile(file, 'utf8');
  assert.match(remaining, /# My rules/);
  assert.match(remaining, /Keep this rule/);
  assert.doesNotMatch(remaining, /<!-- engram:start -->/);
  await rm(cwd, { recursive: true, force: true });
});

test('engram unlink skips human-authored guide file', async () => {
  const { cwd } = await tempWorkspace('engram-unlink-human-guide-');
  await installSkillset(cwd, 'agents-md');
  // Replace generated guide with human content
  const guideFile = path.join(cwd, '.agents/engram.md');
  await writeFile(guideFile, '# My custom Engram guide\n\n- Human authored.\n');

  await unlinkSkillset(cwd, 'agents-md');
  // Guide should remain (human-authored)
  assert.match(await readFile(guideFile, 'utf8'), /My custom Engram guide/);
  await rm(cwd, { recursive: true, force: true });
});

test('workspace refresh --plan reports both files without writing', async () => {
  const { cwd } = await tempWorkspace('engram-refresh-plan-');
  const legacyContent = '<!-- Generated by Engram skillset installer. Edit with care. -->\n\n# Engram Agent Skillset\n\nEngram = knowledge memory center for project, workspace, team, and personal context. Default agent mode: compact.\n\n## Protocol\n\n- Save flow: use `engram save`.\n- Rule memories: target 50 counted content lines.\n';
  await writeFile(path.join(cwd, 'AGENTS.md'), legacyContent);

  const { refreshGeneratedWorkspaceSkillsets } = await import('../dist/core/integrations/skillset.js');
  const refreshed = await refreshGeneratedWorkspaceSkillsets(cwd, { plan: true });

  // Results include both AGENTS.md and .agents/engram.md as planned
  assert.ok(refreshed.some((item) => item.file === 'AGENTS.md' && item.action === 'planned'));
  assert.ok(refreshed.some((item) => item.file === '.agents/engram.md' && item.action === 'planned'));
  // Files unchanged (plan mode)
  const agentsMd = await readFile(path.join(cwd, 'AGENTS.md'), 'utf8');
  assert.match(agentsMd, /Default agent mode: compact/);
  await assert.rejects(readFile(path.join(cwd, '.agents/engram.md'), 'utf8'));
  await rm(cwd, { recursive: true, force: true });
});

test('codex alias keeps SKILL.md plus minimal AGENTS.md and guide', async () => {
  const { cwd, env } = await tempWorkspace('engram-codex-full-');
  await runEngram(cwd, env, ['link', 'codex']);

  const agentsMd = await readFile(path.join(cwd, 'AGENTS.md'), 'utf8');
  assert.match(agentsMd, /<!-- engram:start -->/);
  assert.match(agentsMd, /Full guide:/);
  assert.doesNotMatch(agentsMd, /Save flow:/);
  assert.doesNotMatch(agentsMd, /Rule memories:/);

  const guide = await readFile(path.join(cwd, '.agents/engram.md'), 'utf8');
  assert.match(guide, /Save flow:/);
  assert.match(guide, /Rule memories:/);
  assert.match(guide, /Generated by Engram skillset installer/);

  const skill = await readFile(path.join(cwd, '.agents/skills/engram/SKILL.md'), 'utf8');
  // SKILL.md is a proper agent skill with frontmatter, pointing at the guide
  assert.match(skill, /name: engram/);
  assert.match(skill, /Full protocol: `\.agents\/engram\.md`/);

  assert.match(await readFile(path.join(cwd, '.mcp.json'), 'utf8'), /engram-mcp/);
  await rm(cwd, { recursive: true, force: true });
});

test('workspace unlink opencode removes MCP from opencode.json and preserves other content', async () => {
  const { cwd, env } = await tempWorkspace('engram-unlink-opencode-');
  await runEngram(cwd, env, ['link', 'opencode']);

  const opencodeJsonPath = path.join(cwd, 'opencode.json');
  const linked = JSON.parse(await readFile(opencodeJsonPath, 'utf8'));
  assert.ok(linked.mcp?.engram, 'link should add engram MCP');

  const unlinkResult = await runEngram(cwd, env, ['unlink', 'opencode']);
  assert.equal(unlinkResult.code, 0, unlinkResult.stderr);

  const afterUnlink = await readFile(opencodeJsonPath, 'utf8').catch(() => null);
  if (afterUnlink) {
    const parsed = JSON.parse(afterUnlink);
    assert.ok(!parsed.mcp?.engram, 'unlink should remove engram MCP');
  }
  await rm(cwd, { recursive: true, force: true });
});

test('workspace unlink opencode preserves human MCP entries in opencode.json', async () => {
  const { cwd, env } = await tempWorkspace('engram-unlink-opencode-human-');
  await runEngram(cwd, env, ['link', 'opencode']);
  const opencodeJsonPath = path.join(cwd, 'opencode.json');

  // Add a human MCP entry alongside engram
  const existing = JSON.parse(await readFile(opencodeJsonPath, 'utf8'));
  existing.mcp.other = { type: 'local', command: ['other-bin'], enabled: true };
  await writeFile(opencodeJsonPath, JSON.stringify(existing, null, 2));

  await runEngram(cwd, env, ['unlink', 'opencode']);
  const after = JSON.parse(await readFile(opencodeJsonPath, 'utf8'));
  assert.ok(!after.mcp?.engram, 'engram MCP should be removed');
  assert.ok(after.mcp?.other, 'other MCP entry should be preserved');
  await rm(cwd, { recursive: true, force: true });
});

test('workspace unlink opencode removes MCP from opencode.jsonc and preserves user settings', async () => {
  const { cwd } = await tempWorkspace('engram-unlink-opencode-jsonc-');
  const opencodeJsoncPath = path.join(cwd, 'opencode.jsonc');
  await writeFile(opencodeJsoncPath, [
    '{',
    '  "$schema": "https://opencode.ai/config.json",',
    '  "plugin": ["user-plugin"],',
    '  "mcp": {',
    '    "keep": { "type": "local", "command": ["other-bin"], "enabled": true },',
    '    "engram": { "type": "local", "command": ["npx"], "enabled": true },',
    '  },',
    '}',
    ''
  ].join('\n'));

  const results = await unlinkSkillset(cwd, 'opencode');
  assert.ok(results.some((item) => item.file === 'opencode.jsonc' && item.action === 'cleaned'));
  const after = JSON.parse(await readFile(opencodeJsoncPath, 'utf8'));
  assert.deepEqual(after.plugin, ['user-plugin']);
  assert.ok(after.mcp?.keep, 'other MCP entry should be preserved');
  assert.ok(!after.mcp?.engram, 'engram MCP should be removed');
  await rm(cwd, { recursive: true, force: true });
});

test('workspace refresh migrates opencode.json without MCP to include MCP', async () => {
  const { cwd } = await tempWorkspace('engram-upgrade-opencode-');
  const opencodeJsonPath = path.join(cwd, 'opencode.json');
  await mkdir(path.dirname(opencodeJsonPath), { recursive: true });
  await writeFile(opencodeJsonPath, JSON.stringify({
    $schema: 'https://opencode.ai/config.json',
    instructions: ['.opencode/engram.md']
  }, null, 2));

  const { refreshGeneratedWorkspaceSkillsets } = await import('../dist/core/integrations/skillset.js');
  const refreshed = await refreshGeneratedWorkspaceSkillsets(cwd);
  assert.ok(refreshed.some((item) => item.file === 'opencode.json'), 'opencode.json should be refreshed');

  const updated = JSON.parse(await readFile(opencodeJsonPath, 'utf8'));
  assert.ok(updated.mcp?.engram, 'refresh should merge engram MCP into opencode.json');
  assertSimpleOpenCodeMcp(updated.mcp.engram);
  await rm(cwd, { recursive: true, force: true });
});

test('workspace refresh updates only engram MCP in user opencode.jsonc', async () => {
  const { cwd } = await tempWorkspace('engram-refresh-opencode-user-jsonc-');
  const opencodeJsoncPath = path.join(cwd, 'opencode.jsonc');
  await writeFile(opencodeJsoncPath, [
    '{',
    '  "$schema": "https://opencode.ai/config.json",',
    '  "plugin": ["user-plugin"],',
    '  "mcp": {',
    '    "other": { "type": "local", "command": ["other-bin"], "enabled": true },',
    '    "engram": {',
    '      "type": "local",',
    '      "command": ["old-bin"],',
    '      "enabled": false',
    '    },',
    '  },',
    '}',
    ''
  ].join('\n'));

  const { refreshGeneratedWorkspaceSkillsets } = await import('../dist/core/integrations/skillset.js');
  const refreshed = await refreshGeneratedWorkspaceSkillsets(cwd);
  assert.ok(refreshed.some((item) => item.file === 'opencode.jsonc'), 'opencode.jsonc should be refreshed');

  const updated = JSON.parse(await readFile(opencodeJsoncPath, 'utf8'));
  assert.deepEqual(updated.plugin, ['user-plugin']);
  assert.ok(updated.mcp?.other, 'other MCP entries should be preserved');
  assert.equal(updated.mcp.engram.enabled, true);
  assertSimpleOpenCodeMcp(updated.mcp.engram);
  await rm(cwd, { recursive: true, force: true });
});

test('workspace refresh updates only engram server in user cursor mcp.json', async () => {
  const { cwd } = await tempWorkspace('engram-refresh-cursor-user-mcp-');
  const mcpPath = path.join(cwd, '.cursor', 'mcp.json');
  await mkdir(path.dirname(mcpPath), { recursive: true });
  await writeFile(mcpPath, `${JSON.stringify({
    mcpServers: {
      other: { type: 'stdio', command: 'other-bin', args: [] },
      engram: {
        type: 'stdio',
        command: 'npx',
        args: ['-y', '--package', '@the-long-ride/engram', 'engram-mcp'],
        env: { ENGRAM_READ: 'manual' }
      }
    }
  }, null, 2)}\n`);

  const { refreshGeneratedWorkspaceSkillsets } = await import('../dist/core/integrations/skillset.js');
  const refreshed = await refreshGeneratedWorkspaceSkillsets(cwd);
  assert.ok(refreshed.some((item) => item.file === '.cursor/mcp.json'), 'cursor mcp.json should be refreshed');

  const updated = JSON.parse(await readFile(mcpPath, 'utf8'));
  assert.ok(updated.mcpServers?.other, 'other MCP servers should be preserved');
  assert.deepEqual(updated.mcpServers.engram.args, ['-y', '--package', PINNED_PACKAGE, 'engram-mcp']);
  assert.equal(updated.mcpServers.engram.env, undefined);
  await rm(cwd, { recursive: true, force: true });
});

test('global unlink opencode removes engram MCP from opencode.jsonc', async () => {
  const { cwd, env } = await tempWorkspace('engram-unlink-global-opencode-');
  const agentHome = path.join(cwd, 'agent-home');
  const globalEnv = { ...env, ENGRAM_AGENT_HOME: agentHome, ENGRAM_AGENT_CONFIG_HOME: path.join(cwd, 'agent-config') };

  await runEngram(cwd, globalEnv, ['link', '--global', 'opencode']);
  const opencodeJsonPath = path.join(agentHome, '.config', 'opencode', 'opencode.jsonc');
  const linked = JSON.parse(await readFile(opencodeJsonPath, 'utf8'));
  assert.ok(linked.mcp?.engram, 'global link should add engram MCP');

  const unlinkResult = await runEngram(cwd, globalEnv, ['unlink', '--global', 'opencode']);
  assert.equal(unlinkResult.code, 0, unlinkResult.stderr);

  const afterUnlink = await readFile(opencodeJsonPath, 'utf8').catch(() => null);
  if (afterUnlink) {
    const parsed = JSON.parse(afterUnlink);
    assert.ok(!parsed.mcp?.engram, 'global unlink should remove engram MCP');
  }
  await rm(cwd, { recursive: true, force: true });
});

test('cursor workspace link creates .cursor/rules/engram.mdc, .cursor/engram.md, .cursor/mcp.json, .cursor/hooks.json', async () => {
  const { cwd, env } = await tempWorkspace('engram-cursor-ws-');
  const result = await runEngram(cwd, env, ['link', 'cursor']);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /WRITTEN cursor.*engram\.mdc/);

  const rule = await readFile(path.join(cwd, '.cursor', 'rules', 'engram.mdc'), 'utf8');
  assert.match(rule, /^---\n/);
  assert.match(rule, /alwaysApply:\s*true/);
  assert.match(rule, /<!-- engram:start -->/);
  assert.match(rule, /Full guide:/);

  const guide = await readFile(path.join(cwd, '.cursor', 'engram.md'), 'utf8');
  assert.match(guide, /Save flow:/);

  const mcp = JSON.parse(await readFile(path.join(cwd, '.cursor', 'mcp.json'), 'utf8'));
  assert.equal(mcp.mcpServers.engram.type, 'stdio');
  assert.equal(mcp.mcpServers.engram.command, 'npx');

  const hooks = JSON.parse(await readFile(path.join(cwd, '.cursor', 'hooks.json'), 'utf8'));
  assert.ok(Array.isArray(hooks.sessionStart));
  assert.ok(
    hooks.sessionStart.some((h) => isObject(h) && h.name === 'engram-auto-load'),
    'sessionStart should contain a managed engram hook'
  );
  assert.ok(!hooks.beforeSubmitPrompt, 'cursor hooks should not add beforeSubmitPrompt context injection');

  await rm(cwd, { recursive: true, force: true });
});

test('cursor .mdc has valid frontmatter with description and alwaysApply', async () => {
  const { cwd } = await tempWorkspace('engram-cursor-mdc-');
  await installSkillset(cwd, 'cursor');
  const rule = await readFile(path.join(cwd, '.cursor', 'rules', 'engram.mdc'), 'utf8');
  const frontmatterMatch = rule.match(/^---\n([\s\S]*?)\n---/);
  assert.ok(frontmatterMatch, 'should have frontmatter');
  const frontmatter = frontmatterMatch[1];
  assert.match(frontmatter, /description:/);
  assert.match(frontmatter, /alwaysApply:\s*true/);
  await rm(cwd, { recursive: true, force: true });
});

test('cursor MCP JSON preserves existing mcpServers and inserts type stdio', async () => {
  const { cwd } = await tempWorkspace('engram-cursor-mcp-');
  const cursorDir = path.join(cwd, '.cursor');
  await mkdir(cursorDir, { recursive: true });
  await writeFile(path.join(cursorDir, 'mcp.json'), JSON.stringify({ mcpServers: { other: { command: 'other-bin' } } }, null, 2) + '\n');
  await installSkillset(cwd, 'cursor');
  const mcp = JSON.parse(await readFile(path.join(cursorDir, 'mcp.json'), 'utf8'));
  assert.ok(mcp.mcpServers.other, 'existing servers should be preserved');
  assert.equal(mcp.mcpServers.engram.type, 'stdio');
  assert.equal(mcp.mcpServers.engram.command, 'npx');
  await rm(cwd, { recursive: true, force: true });
});

test('cursor global link creates local plugin bundle', async () => {
  const { cwd, env } = await tempWorkspace('engram-cursor-global-');
  const agentHome = path.join(cwd, 'agent-home');
  const globalEnv = { ...env, ENGRAM_AGENT_HOME: agentHome, ENGRAM_AGENT_CONFIG_HOME: path.join(cwd, 'agent-config') };
  const result = await runEngram(cwd, globalEnv, ['link', '--global', 'cursor']);
  assert.equal(result.code, 0, result.stderr);

  const pluginDir = path.join(agentHome, '.cursor', 'plugins', 'local', 'engram');
  const pluginJson = JSON.parse(await readFile(path.join(pluginDir, '.cursor-plugin', 'plugin.json'), 'utf8'));
  assert.equal(pluginJson.name, 'engram');

  assert.match(await readFile(path.join(pluginDir, 'rules', 'engram.mdc'), 'utf8'), /alwaysApply:\s*true/);
  assert.match(await readFile(path.join(pluginDir, 'skills', 'engram', 'SKILL.md'), 'utf8'), /name: engram/);
  assert.match(await readFile(path.join(pluginDir, 'commands', 'engram.md'), 'utf8'), /Engram/);

  const mcp = JSON.parse(await readFile(path.join(pluginDir, 'mcp.json'), 'utf8'));
  assert.equal(mcp.mcpServers.engram.type, 'stdio');

  const hooks = JSON.parse(await readFile(path.join(pluginDir, 'hooks', 'hooks.json'), 'utf8'));
  assert.ok(Array.isArray(hooks.sessionStart));

  await rm(cwd, { recursive: true, force: true });
});

test('cursor unlink removes only generated entries and preserves user data', async () => {
  const { cwd, env } = await tempWorkspace('engram-cursor-unlink-');
  await runEngram(cwd, env, ['link', 'cursor']);
  const mcpPath = path.join(cwd, '.cursor', 'mcp.json');
  const existing = JSON.parse(await readFile(mcpPath, 'utf8'));
  existing.mcpServers.other = { command: 'other-bin' };
  await writeFile(mcpPath, JSON.stringify(existing, null, 2) + '\n');

  await runEngram(cwd, env, ['unlink', 'cursor']);
  const afterMcp = JSON.parse(await readFile(mcpPath, 'utf8'));
  assert.ok(afterMcp.mcpServers.other, 'user MCP server should be preserved');
  assert.ok(!afterMcp.mcpServers.engram, 'engram MCP entry should be removed');
  await rm(cwd, { recursive: true, force: true });
});

test('windsurf workspace link creates .windsurf/rules/engram.md, .windsurf/engram.md, .windsurf/hooks.json', async () => {
  const { cwd, env } = await tempWorkspace('engram-windsurf-ws-');
  const result = await runEngram(cwd, env, ['link', 'windsurf']);
  assert.equal(result.code, 0, result.stderr);

  const rule = await readFile(path.join(cwd, '.windsurf', 'rules', 'engram.md'), 'utf8');
  assert.match(rule, /trigger:\s*always_on/);
  assert.match(rule, /<!-- engram:start -->/);

  const guide = await readFile(path.join(cwd, '.windsurf', 'engram.md'), 'utf8');
  assert.match(guide, /Save flow:/);

  const hooks = JSON.parse(await readFile(path.join(cwd, '.windsurf', 'hooks.json'), 'utf8'));
  assert.ok(Array.isArray(hooks.pre_user_prompt));

  await rm(cwd, { recursive: true, force: true });
});

test('windsurf workspace link does not create workspace MCP files', async () => {
  const { cwd, env } = await tempWorkspace('engram-windsurf-no-mcp-');
  await runEngram(cwd, env, ['link', 'windsurf']);
  await assert.rejects(readFile(path.join(cwd, '.mcp.json'), 'utf8'));
  await assert.rejects(readFile(path.join(cwd, '.windsurf', 'mcp.json'), 'utf8'));
  await assert.rejects(readFile(path.join(cwd, '.devin', 'mcp.json'), 'utf8'));
  await rm(cwd, { recursive: true, force: true });
});

test('windsurf global link creates global rules, MCP, and hooks', async () => {
  const { cwd, env } = await tempWorkspace('engram-windsurf-global-');
  const agentHome = path.join(cwd, 'agent-home');
  const globalEnv = { ...env, ENGRAM_AGENT_HOME: agentHome, ENGRAM_AGENT_CONFIG_HOME: path.join(cwd, 'agent-config') };
  const result = await runEngram(cwd, globalEnv, ['link', '--global', 'windsurf']);
  assert.equal(result.code, 0, result.stderr);

  const globalRules = await readFile(path.join(agentHome, '.codeium', 'windsurf', 'memories', 'global_rules.md'), 'utf8');
  assert.match(globalRules, /<!-- engram:start -->/);

  const mcp = JSON.parse(await readFile(path.join(agentHome, '.codeium', 'windsurf', 'mcp_config.json'), 'utf8'));
  assert.equal(mcp.mcpServers.engram.command, 'npx');

  const hooks = JSON.parse(await readFile(path.join(agentHome, '.codeium', 'windsurf', 'hooks.json'), 'utf8'));
  assert.ok(Array.isArray(hooks.pre_user_prompt));

  await rm(cwd, { recursive: true, force: true });
});

test('windsurf global rules preserve user text and replace only managed block', async () => {
  const { cwd, env } = await tempWorkspace('engram-windsurf-global-rules-');
  const agentHome = path.join(cwd, 'agent-home');
  const globalEnv = { ...env, ENGRAM_AGENT_HOME: agentHome, ENGRAM_AGENT_CONFIG_HOME: path.join(cwd, 'agent-config') };
  const rulesPath = path.join(agentHome, '.codeium', 'windsurf', 'memories', 'global_rules.md');
  await mkdir(path.dirname(rulesPath), { recursive: true });
  await writeFile(rulesPath, '# User rules\n\n- Always use TypeScript.\n');

  await runEngram(cwd, globalEnv, ['link', '--global', 'windsurf']);
  const afterFirst = await readFile(rulesPath, 'utf8');
  assert.match(afterFirst, /Always use TypeScript/);
  assert.match(afterFirst, /<!-- engram:start -->/);

  await runEngram(cwd, globalEnv, ['link', '--global', 'windsurf']);
  const afterSecond = await readFile(rulesPath, 'utf8');
  assert.equal((afterSecond.match(/<!-- engram:start -->/g) ?? []).length, 1, 'should have exactly one engram block');
  assert.match(afterSecond, /Always use TypeScript/);

  await rm(cwd, { recursive: true, force: true });
});

test('windsurf global rules block stays below 1000 characters', async () => {
  const { cwd, env } = await tempWorkspace('engram-windsurf-compact-');
  const agentHome = path.join(cwd, 'agent-home');
  const globalEnv = { ...env, ENGRAM_AGENT_HOME: agentHome, ENGRAM_AGENT_CONFIG_HOME: path.join(cwd, 'agent-config') };
  await runEngram(cwd, globalEnv, ['link', '--global', 'windsurf']);
  const rulesPath = path.join(agentHome, '.codeium', 'windsurf', 'memories', 'global_rules.md');
  const rules = await readFile(rulesPath, 'utf8');
  const blockMatch = rules.match(/<!-- engram:start -->[\s\S]*?<!-- engram:end -->/);
  assert.ok(blockMatch, 'should have an engram managed block');
  assert.ok(blockMatch[0].length <= 1000, `engram block too large: ${blockMatch[0].length}`);
  await rm(cwd, { recursive: true, force: true });
});

test('cursor global unlink properly unmerges hooks.json entries', async () => {
  const { cwd, env } = await tempWorkspace('engram-cursor-global-unlink-');
  const agentHome = path.join(cwd, 'agent-home');
  const globalEnv = { ...env, ENGRAM_AGENT_HOME: agentHome, ENGRAM_AGENT_CONFIG_HOME: path.join(cwd, 'agent-config') };
  await runEngram(cwd, globalEnv, ['link', '--global', 'cursor']);

  const hooksPath = path.join(agentHome, '.cursor', 'plugins', 'local', 'engram', 'hooks', 'hooks.json');
  const linked = JSON.parse(await readFile(hooksPath, 'utf8'));
  assert.ok(linked.sessionStart?.some((h) => h.name === 'engram-auto-load'), 'hooks.json should have engram entry');

  const unlinkResult = await runEngram(cwd, globalEnv, ['unlink', '--global', 'cursor']);
  assert.equal(unlinkResult.code, 0, unlinkResult.stderr);
  assert.match(unlinkResult.stdout, /windsurf|cursor/);

  await assert.rejects(readFile(hooksPath, 'utf8'));
  await rm(cwd, { recursive: true, force: true });
});

test('windsurf global unlink properly unmerges hooks.json entries', async () => {
  const { cwd, env } = await tempWorkspace('engram-windsurf-global-unlink-');
  const agentHome = path.join(cwd, 'agent-home');
  const globalEnv = { ...env, ENGRAM_AGENT_HOME: agentHome, ENGRAM_AGENT_CONFIG_HOME: path.join(cwd, 'agent-config') };
  await runEngram(cwd, globalEnv, ['link', '--global', 'windsurf']);

  const hooksPath = path.join(agentHome, '.codeium', 'windsurf', 'hooks.json');
  const linked = JSON.parse(await readFile(hooksPath, 'utf8'));
  assert.ok(linked.pre_user_prompt?.length, 'hooks.json should have pre_user_prompt entries');

  const unlinkResult = await runEngram(cwd, globalEnv, ['unlink', '--global', 'windsurf']);
  assert.equal(unlinkResult.code, 0, unlinkResult.stderr);

  const afterHooks = await readFile(hooksPath, 'utf8').catch(() => null);
  if (afterHooks) {
    const parsed = JSON.parse(afterHooks);
    assert.ok(!parsed.pre_user_prompt || !parsed.pre_user_prompt.some((h) =>
      (h.command ?? h.powershell ?? '').includes('engram agent-hook --host windsurf')
    ), 'engram hook entries should be removed');
  }
  await rm(cwd, { recursive: true, force: true });
});

test('cursor workspace link upserts managed block into human-authored .mdc file', async () => {
  const { cwd, env } = await tempWorkspace('engram-cursor-human-mdc-');
  const cursorDir = path.join(cwd, '.cursor', 'rules');
  await mkdir(cursorDir, { recursive: true });
  await writeFile(path.join(cursorDir, 'engram.mdc'), '---\ndescription: My custom rules\nalwaysApply: false\n---\n\n# My custom Cursor rules\n\n- Keep this rule.\n');

  const result = await runEngram(cwd, env, ['link', 'cursor']);
  assert.equal(result.code, 0, result.stderr);

  const mdc = await readFile(path.join(cursorDir, 'engram.mdc'), 'utf8');
  assert.match(mdc, /Keep this rule/);
  assert.match(mdc, /<!-- engram:start -->/);
  assert.equal((mdc.match(/<!-- engram:start -->/g) ?? []).length, 1);

  await rm(cwd, { recursive: true, force: true });
});

test('cursor workspace link is idempotent - second link does not duplicate entries', async () => {
  const { cwd, env } = await tempWorkspace('engram-cursor-idempotent-');
  await runEngram(cwd, env, ['link', 'cursor']);
  const firstMcp = JSON.parse(await readFile(path.join(cwd, '.cursor', 'mcp.json'), 'utf8'));
  const firstHooks = JSON.parse(await readFile(path.join(cwd, '.cursor', 'hooks.json'), 'utf8'));

  await runEngram(cwd, env, ['link', 'cursor']);
  const secondMcp = JSON.parse(await readFile(path.join(cwd, '.cursor', 'mcp.json'), 'utf8'));
  const secondHooks = JSON.parse(await readFile(path.join(cwd, '.cursor', 'hooks.json'), 'utf8'));

  assert.equal(secondMcp.mcpServers.engram && !Array.isArray(secondMcp.mcpServers.engram), true);
  assert.equal(secondHooks.sessionStart.filter((h) => h.name === 'engram-auto-load').length, 1,
    'should have exactly one engram hook after second link');

  const mdc = await readFile(path.join(cwd, '.cursor', 'rules', 'engram.mdc'), 'utf8');
  assert.equal((mdc.match(/<!-- engram:start -->/g) ?? []).length, 1, 'should have exactly one engram block after second link');

  await rm(cwd, { recursive: true, force: true });
});

test('cursor workspace unlink preserves human .mdc content and user MCP entries', async () => {
  const { cwd, env } = await tempWorkspace('engram-cursor-unlink-human-');
  await runEngram(cwd, env, ['link', 'cursor']);

  const mcpPath = path.join(cwd, '.cursor', 'mcp.json');
  const mcp = JSON.parse(await readFile(mcpPath, 'utf8'));
  mcp.mcpServers.userServer = { command: 'user-bin', type: 'stdio' };
  await writeFile(mcpPath, JSON.stringify(mcp, null, 2) + '\n');

  const hooksPath = path.join(cwd, '.cursor', 'hooks.json');
  const hooks = JSON.parse(await readFile(hooksPath, 'utf8'));
  hooks.sessionStart.unshift({ name: 'user-hook', type: 'command', command: 'echo hi' });
  await writeFile(hooksPath, JSON.stringify(hooks, null, 2) + '\n');

  await runEngram(cwd, env, ['unlink', 'cursor']);

  const afterMcp = JSON.parse(await readFile(mcpPath, 'utf8'));
  assert.ok(afterMcp.mcpServers.userServer, 'user MCP server should be preserved');
  assert.ok(!afterMcp.mcpServers.engram, 'engram MCP should be removed');

  const afterHooks = JSON.parse(await readFile(hooksPath, 'utf8'));
  assert.ok(afterHooks.sessionStart.some((h) => h.name === 'user-hook'), 'user hook should be preserved');
  assert.ok(!afterHooks.sessionStart.some((h) => h.name === 'engram-auto-load'), 'engram hook should be removed');

  await rm(cwd, { recursive: true, force: true });
});

test(' Windsurf workspace link upserts managed block into human-authored rules file', async () => {
  const { cwd, env } = await tempWorkspace('engram-windsurf-human-rules-');
  const rulesDir = path.join(cwd, '.windsurf', 'rules');
  await mkdir(rulesDir, { recursive: true });
  await writeFile(path.join(rulesDir, 'engram.md'), '---\ntrigger: always_on\n---\n\n# My custom rules\n\n- Keep this.\n');

  const result = await runEngram(cwd, env, ['link', 'windsurf']);
  assert.equal(result.code, 0, result.stderr);

  const rule = await readFile(path.join(rulesDir, 'engram.md'), 'utf8');
  assert.match(rule, /Keep this/);
  assert.match(rule, /<!-- engram:start -->/);
  assert.equal((rule.match(/<!-- engram:start -->/g) ?? []).length, 1);

  await rm(cwd, { recursive: true, force: true });
});

test('windsurf workspace link is idempotent - second link does not duplicate entries', async () => {
  const { cwd, env } = await tempWorkspace('engram-windsurf-idempotent-');
  await runEngram(cwd, env, ['link', 'windsurf']);
  const firstHooks = JSON.parse(await readFile(path.join(cwd, '.windsurf', 'hooks.json'), 'utf8'));

  await runEngram(cwd, env, ['link', 'windsurf']);
  const secondHooks = JSON.parse(await readFile(path.join(cwd, '.windsurf', 'hooks.json'), 'utf8'));

  const engramCount = secondHooks.pre_user_prompt.filter((h) =>
    (h.command ?? h.powershell ?? '').includes('engram agent-hook --host windsurf')
  ).length;
  assert.equal(engramCount, 1, 'should have exactly one engram hook after second link');

  const rule = await readFile(path.join(cwd, '.windsurf', 'rules', 'engram.md'), 'utf8');
  assert.equal((rule.match(/<!-- engram:start -->/g) ?? []).length, 1, 'should have exactly one engram block after second link');

  await rm(cwd, { recursive: true, force: true });
});

test('windsurf workspace unlink preserves human rules content and user hook entries', async () => {
  const { cwd, env } = await tempWorkspace('engram-windsurf-unlink-human-');
  await runEngram(cwd, env, ['link', 'windsurf']);

  const hooksPath = path.join(cwd, '.windsurf', 'hooks.json');
  const hooks = JSON.parse(await readFile(hooksPath, 'utf8'));
  hooks.pre_user_prompt.unshift({ command: 'echo human', type: 'command' });
  await writeFile(hooksPath, JSON.stringify(hooks, null, 2) + '\n');

  await runEngram(cwd, env, ['unlink', 'windsurf']);

  const afterHooks = JSON.parse(await readFile(hooksPath, 'utf8'));
  assert.ok(afterHooks.pre_user_prompt.some((h) => h.command === 'echo human'), 'user hook should be preserved');
  assert.ok(!afterHooks.pre_user_prompt.some((h) => (h.command ?? h.powershell ?? '').includes('engram agent-hook --host windsurf')), 'engram hook should be removed');

  const rule = await readFile(path.join(cwd, '.windsurf', 'rules', 'engram.md'), 'utf8').catch(() => null);
  if (rule) {
    assert.doesNotMatch(rule, /<!-- engram:start -->/, 'engram block should be removed');
  }

  await rm(cwd, { recursive: true, force: true });
});

test('cascade alias resolves to windsurf for workspace link', async () => {
  const { cwd, env } = await tempWorkspace('engram-cascade-link-');
  const result = await runEngram(cwd, env, ['link', 'cascade']);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /windsurf/);

  const rule = await readFile(path.join(cwd, '.windsurf', 'rules', 'engram.md'), 'utf8');
  assert.match(rule, /trigger:\s*always_on/);

  const hooks = JSON.parse(await readFile(path.join(cwd, '.windsurf', 'hooks.json'), 'utf8'));
  assert.ok(Array.isArray(hooks.pre_user_prompt));

  await rm(cwd, { recursive: true, force: true });
});

test('cursor global link MCP config has type stdio', async () => {
  const { cwd, env } = await tempWorkspace('engram-cursor-global-mcp-');
  const agentHome = path.join(cwd, 'agent-home');
  const globalEnv = { ...env, ENGRAM_AGENT_HOME: agentHome, ENGRAM_AGENT_CONFIG_HOME: path.join(cwd, 'agent-config') };
  await runEngram(cwd, globalEnv, ['link', '--global', 'cursor']);

  const pluginDir = path.join(agentHome, '.cursor', 'plugins', 'local', 'engram');
  const mcp = JSON.parse(await readFile(path.join(pluginDir, 'mcp.json'), 'utf8'));
  assert.equal(mcp.mcpServers.engram.type, 'stdio');
  assert.equal(mcp.mcpServers.engram.command, 'npx');
  assert.deepEqual(mcp.mcpServers.engram.args, ['-y', '--package', PINNED_PACKAGE, 'engram-mcp']);

  await rm(cwd, { recursive: true, force: true });
});

test('windsurf global MCP config has type stdio and correct command', async () => {
  const { cwd, env } = await tempWorkspace('engram-windsurf-global-mcp-');
  const agentHome = path.join(cwd, 'agent-home');
  const globalEnv = { ...env, ENGRAM_AGENT_HOME: agentHome, ENGRAM_AGENT_CONFIG_HOME: path.join(cwd, 'agent-config') };
  await runEngram(cwd, globalEnv, ['link', '--global', 'windsurf']);

  const mcp = JSON.parse(await readFile(path.join(agentHome, '.codeium', 'windsurf', 'mcp_config.json'), 'utf8'));
  assert.equal(mcp.mcpServers.engram.type, 'stdio');
  assert.equal(mcp.mcpServers.engram.command, 'npx');
  assert.deepEqual(mcp.mcpServers.engram.args, ['-y', '--package', PINNED_PACKAGE, 'engram-mcp']);

  await rm(cwd, { recursive: true, force: true });
});

test('windsurf global unlink cleans global_rules.md preserving user text', async () => {
  const { cwd, env } = await tempWorkspace('engram-windsurf-global-unlink-rules-');
  const agentHome = path.join(cwd, 'agent-home');
  const globalEnv = { ...env, ENGRAM_AGENT_HOME: agentHome, ENGRAM_AGENT_CONFIG_HOME: path.join(cwd, 'agent-config') };
  const rulesPath = path.join(agentHome, '.codeium', 'windsurf', 'memories', 'global_rules.md');
  await mkdir(path.dirname(rulesPath), { recursive: true });
  await writeFile(rulesPath, '# User global rules\n\n- Always use TypeScript.\n');

  await runEngram(cwd, globalEnv, ['link', '--global', 'windsurf']);
  const linked = await readFile(rulesPath, 'utf8');
  assert.match(linked, /<!-- engram:start -->/);
  assert.match(linked, /Always use TypeScript/);

  await runEngram(cwd, globalEnv, ['unlink', '--global', 'windsurf']);
  const unlinked = await readFile(rulesPath, 'utf8').catch(() => null);
  if (unlinked) {
    assert.doesNotMatch(unlinked, /<!-- engram:start -->/);
    assert.match(unlinked, /User global rules/);
  }

  await rm(cwd, { recursive: true, force: true });
});

test('windsurf global unlink removes engram MCP from mcp_config.json preserving other servers', async () => {
  const { cwd, env } = await tempWorkspace('engram-windsurf-global-unlink-mcp-');
  const agentHome = path.join(cwd, 'agent-home');
  const globalEnv = { ...env, ENGRAM_AGENT_HOME: agentHome, ENGRAM_AGENT_CONFIG_HOME: path.join(cwd, 'agent-config') };
  await runEngram(cwd, globalEnv, ['link', '--global', 'windsurf']);

  const mcpPath = path.join(agentHome, '.codeium', 'windsurf', 'mcp_config.json');
  const mcp = JSON.parse(await readFile(mcpPath, 'utf8'));
  mcp.mcpServers.other = { command: 'other-bin', type: 'stdio' };
  await writeFile(mcpPath, JSON.stringify(mcp, null, 2) + '\n');

  await runEngram(cwd, globalEnv, ['unlink', '--global', 'windsurf']);
  const afterMcp = JSON.parse(await readFile(mcpPath, 'utf8'));
  assert.ok(afterMcp.mcpServers.other, 'other MCP server should be preserved');
  assert.ok(!afterMcp.mcpServers.engram, 'engram MCP entry should be removed');

  await rm(cwd, { recursive: true, force: true });
});

test('cursor global link SKILL.md contains engram frontmatter', async () => {
  const { cwd, env } = await tempWorkspace('engram-cursor-global-skill-');
  const agentHome = path.join(cwd, 'agent-home');
  const globalEnv = { ...env, ENGRAM_AGENT_HOME: agentHome, ENGRAM_AGENT_CONFIG_HOME: path.join(cwd, 'agent-config') };
  await runEngram(cwd, globalEnv, ['link', '--global', 'cursor']);

  const pluginDir = path.join(agentHome, '.cursor', 'plugins', 'local', 'engram');
  const skill = await readFile(path.join(pluginDir, 'skills', 'engram', 'SKILL.md'), 'utf8');
  assert.match(skill, /name: engram/);
  assert.match(skill, /Default agent mode: compact/);

  const command = await readFile(path.join(pluginDir, 'commands', 'engram.md'), 'utf8');
  assert.match(command, /Engram/);
  assert.match(command, /engram/);

  await rm(cwd, { recursive: true, force: true });
});

test('cursor hooks.json command uses --host cursor', async () => {
  const { cwd, env } = await tempWorkspace('engram-cursor-hook-cmd-');
  await runEngram(cwd, env, ['link', 'cursor']);
  const hooks = JSON.parse(await readFile(path.join(cwd, '.cursor', 'hooks.json'), 'utf8'));
  const engramEntry = hooks.sessionStart.find((h) => h.name === 'engram-auto-load');
  assert.ok(engramEntry, 'should find engram entry');
  assert.match(engramEntry.command, /engram agent-hook --host cursor/);
  assert.equal(engramEntry.type, 'command');
  assert.equal(engramEntry.timeout, 10, 'Cursor reads the hook timeout in seconds');
  await rm(cwd, { recursive: true, force: true });
});

test('windsurf hooks.json command uses --host windsurf', async () => {
  const { cwd, env } = await tempWorkspace('engram-windsurf-hook-cmd-');
  await runEngram(cwd, env, ['link', 'windsurf']);
  const hooks = JSON.parse(await readFile(path.join(cwd, '.windsurf', 'hooks.json'), 'utf8'));
  const engramEntry = hooks.pre_user_prompt.find((h) =>
    (h.command ?? h.powershell ?? '').includes('engram agent-hook --host windsurf')
  );
  assert.ok(engramEntry, 'should find engram entry');
  assert.ok(engramEntry.command === undefined || engramEntry.command.includes('engram agent-hook --host windsurf'),
    'command field should reference windsurf host');
  assert.equal(engramEntry.timeout, 10000);
  await rm(cwd, { recursive: true, force: true });
});

test('cursor workspace refresh migrates generated .mdc to current block format', async () => {
  const { cwd } = await tempWorkspace('engram-cursor-refresh-');
  const stale = '<!-- Generated by Engram skillset installer. Edit with care. -->\n\n---\ndescription: Engram portable memory instructions\nalwaysApply: true\n---\n\n# Engram Agent Skillset\n\nEngram = knowledge memory center. Default agent mode: compact.\n\nSave flow: use `engram save`.\nRule memories: target 70 counted content lines.\n';
  const rulesDir = path.join(cwd, '.cursor', 'rules');
  await mkdir(rulesDir, { recursive: true });
  await writeFile(path.join(rulesDir, 'engram.mdc'), stale);

  const { refreshGeneratedWorkspaceSkillsets } = await import('../dist/core/integrations/skillset.js');
  const refreshed = await refreshGeneratedWorkspaceSkillsets(cwd);
  assert.ok(refreshed.some((item) => item.file === '.cursor/rules/engram.mdc'), 'engram.mdc should be refreshed');

  const mdc = await readFile(path.join(rulesDir, 'engram.mdc'), 'utf8');
  assert.match(mdc, /<!-- engram:start -->/);
  assert.match(mdc, /Full guide:/);

  await rm(cwd, { recursive: true, force: true });
});

test('windsurf workspace refresh migrates generated rules file to current block format', async () => {
  const { cwd } = await tempWorkspace('engram-windsurf-refresh-');
  const stale = '<!-- Generated by Engram skillset installer. Edit with care. -->\n\n---\ntrigger: always_on\n---\n\n# Engram Agent Skillset\n\nEngram = knowledge memory center. Default agent mode: compact.\n\nSave flow: use `engram save`.\nRule memories: target 70 counted content lines.\n';
  const rulesDir = path.join(cwd, '.windsurf', 'rules');
  await mkdir(rulesDir, { recursive: true });
  await writeFile(path.join(rulesDir, 'engram.md'), stale);

  const { refreshGeneratedWorkspaceSkillsets } = await import('../dist/core/integrations/skillset.js');
  const refreshed = await refreshGeneratedWorkspaceSkillsets(cwd);
  assert.ok(refreshed.some((item) => item.file === '.windsurf/rules/engram.md'), 'windsurf rules should be refreshed');

  const rules = await readFile(path.join(rulesDir, 'engram.md'), 'utf8');
  assert.match(rules, /<!-- engram:start -->/);
  assert.match(rules, /Full guide:/);

  await rm(cwd, { recursive: true, force: true });
});

test('cursor global link installs hook entries in plugin hooks.json', async () => {
  const { cwd, env } = await tempWorkspace('engram-cursor-global-hooks-');
  const agentHome = path.join(cwd, 'agent-home');
  const globalEnv = { ...env, ENGRAM_AGENT_HOME: agentHome, ENGRAM_AGENT_CONFIG_HOME: path.join(cwd, 'agent-config') };
  await runEngram(cwd, globalEnv, ['link', '--global', 'cursor']);

  const hooksPath = path.join(agentHome, '.cursor', 'plugins', 'local', 'engram', 'hooks', 'hooks.json');
  const hooks = JSON.parse(await readFile(hooksPath, 'utf8'));
  assert.ok(Array.isArray(hooks.sessionStart), 'plugin hooks.json should have sessionStart');
  assert.ok(hooks.sessionStart.some((h) => h.name === 'engram-auto-load'));
  assert.ok(hooks.sessionStart.some((h) => h.command.includes('engram agent-hook --host cursor')));

  await rm(cwd, { recursive: true, force: true });
});

test('cursor workspace link does not create .mcp.json in workspace root', async () => {
  const { cwd, env } = await tempWorkspace('engram-cursor-no-root-mcp-');
  await runEngram(cwd, env, ['link', 'cursor']);
  await assert.rejects(readFile(path.join(cwd, '.mcp.json'), 'utf8'), 'cursor workspace should not create root .mcp.json');
  await rm(cwd, { recursive: true, force: true });
});

test('windsurf global link hook entry has expected fields', async () => {
  const { cwd, env } = await tempWorkspace('engram-windsurf-global-hooks-detail-');
  const agentHome = path.join(cwd, 'agent-home');
  const globalEnv = { ...env, ENGRAM_AGENT_HOME: agentHome, ENGRAM_AGENT_CONFIG_HOME: path.join(cwd, 'agent-config') };
  await runEngram(cwd, globalEnv, ['link', '--global', 'windsurf']);

  const hooksPath = path.join(agentHome, '.codeium', 'windsurf', 'hooks.json');
  const hooks = JSON.parse(await readFile(hooksPath, 'utf8'));
  const entry = hooks.pre_user_prompt.find((h) =>
    (h.command ?? h.powershell ?? '').includes('engram agent-hook --host windsurf')
  );
  assert.ok(entry, 'should find engram entry');
  assert.equal(entry.timeout, 10000);

  await rm(cwd, { recursive: true, force: true });
});

test('renderCursorRule has frontmatter, managed block, and guide reference', () => {
  const rule = renderCursorRule('.cursor/engram.md');
  assert.match(rule, /^---\n/);
  assert.match(rule, /description:/);
  assert.match(rule, /alwaysApply:\s*true/);
  assert.match(rule, /---\n/);
  assert.match(rule, /<!-- engram:start -->/);
  assert.match(rule, /<!-- engram:end -->/);
  assert.match(rule, /Full guide: `\.cursor\/engram\.md`/);
});

test('renderWindsurfRule has trigger always_on and managed block', () => {
  const rule = renderWindsurfRule('.windsurf/engram.md');
  assert.match(rule, /^---\n/);
  assert.match(rule, /trigger:\s*always_on/);
  assert.match(rule, /---\n/);
  assert.match(rule, /<!-- engram:start -->/);
  assert.match(rule, /<!-- engram:end -->/);
  assert.match(rule, /Full guide: `\.windsurf\/engram\.md`/);
});

test('renderWindsurfGlobalRulesBlock has managed block and stays under 1000 chars', () => {
  const block = renderWindsurfGlobalRulesBlock();
  assert.match(block, /<!-- engram:start -->/);
  assert.match(block, /<!-- engram:end -->/);
  assert.ok(block.length <= 1000, `windsurf global rules block too large: ${block.length}`);
  assert.doesNotMatch(block, /Full guide:/, 'global rules should not reference guide file');
});

test('renderCursorPluginJson produces valid JSON with name and version', () => {
  const json = renderCursorPluginJson();
  const parsed = JSON.parse(json);
  assert.equal(parsed.name, 'engram');
  assert.equal(parsed.version, VERSION);
  assert.equal(parsed.author, 'The Long Ride');
});

test('mergeMcpJson preserves existing servers and adds engram with stdio for cursor paths', () => {
  const existing = [
    '{',
    '  // keep user server',
    '  "mcpServers": {',
    '    "other": { "command": "other-bin" },',
    '  },',
    '}'
  ].join('\n');
  const incoming = JSON.stringify({ mcpServers: { engram: { type: 'stdio', command: 'npx', args: ['-y', '--package', '@the-long-ride/engram', 'engram-mcp'] } } });
  const merged = mergeMcpJson(existing, incoming);
  assert.ok(merged, 'merge should succeed');
  const parsed = JSON.parse(merged);
  assert.ok(parsed.mcpServers.other, 'existing server should be preserved');
  assert.equal(parsed.mcpServers.engram.type, 'stdio');
  assert.equal(parsed.mcpServers.engram.command, 'npx');
});

test('mergeMcpJson returns null when engram already exists', () => {
  const existing = JSON.stringify({ mcpServers: { engram: { command: 'npx' } } });
  const incoming = JSON.stringify({ mcpServers: { engram: { type: 'stdio', command: 'npx' } } });
  const result = mergeMcpJson(existing, incoming);
  assert.equal(result, null, 'should skip when engram already present');
});

test('unmergeMcpJson removes only engram entry', () => {
  const json = JSON.stringify({ mcpServers: { other: { command: 'other-bin' }, engram: { type: 'stdio', command: 'npx' } } });
  const result = unmergeMcpJson(json);
  assert.ok(result, 'unmerge should succeed');
  const parsed = JSON.parse(result);
  assert.ok(parsed.mcpServers.other, 'other server should be preserved');
  assert.ok(!parsed.mcpServers.engram, 'engram should be removed');
});

test('unmergeMcpJson returns null when no engram entry exists', () => {
  const json = JSON.stringify({ mcpServers: { other: { command: 'other-bin' } } });
  const result = unmergeMcpJson(json);
  assert.equal(result, null, 'should return null when no engram entry');
});

test('unmergeMcpJson returns empty string when only engram existed', () => {
  const json = JSON.stringify({ mcpServers: { engram: { command: 'npx' } } });
  const result = unmergeMcpJson(json);
  assert.equal(result, '', 'should return empty string when only engram server existed');
});

test('renderMinimalInstructionBlock contains guide reference and managed block markers', () => {
  const block = renderMinimalInstructionBlock('.agents/engram.md');
  assert.match(block, /<!-- engram:start -->/);
  assert.match(block, /<!-- engram:end -->/);
  assert.match(block, /Full guide: `\.agents\/engram\.md`/);
assert.match(block, /engram load /);
  assert.match(block, /Never save memory silently/);
});

test('upsertWorkspaceManagedBlock appends block to human content', () => {
  const existing = '# Human rules\n\n- Keep this.\n';
  const block = renderMinimalInstructionBlock('.agents/engram.md');
  const { text, action } = upsertWorkspaceManagedBlock(existing, block);
  assert.equal(action, 'updated');
  assert.match(text, /Keep this/);
  assert.match(text, /<!-- engram:start -->/);
});

test('upsertWorkspaceManagedBlock replaces existing engram block on re-upsert', () => {
  const block1 = renderMinimalInstructionBlock('.agents/engram.md');
  const first = upsertWorkspaceManagedBlock('# Human\n', block1);
  const block2 = renderMinimalInstructionBlock('.agents/engram.md');
  const second = upsertWorkspaceManagedBlock(first.text, block2);
  assert.equal((second.text.match(/<!-- engram:start -->/g) ?? []).length, 1, 'should have exactly one block');
});

test('removeWorkspaceManagedBlock removes engram block and preserves human content', () => {
  const block = renderMinimalInstructionBlock('.agents/engram.md');
  const withBlock = upsertWorkspaceManagedBlock('# Human rules\n\n- Keep this.\n', block);
  const cleaned = removeWorkspaceManagedBlock(withBlock.text);
  assert.doesNotMatch(cleaned, /<!-- engram:start -->/);
  assert.match(cleaned, /Keep this/);
});

test('hasWorkspaceManagedBlock detects and rejects non-block content', () => {
  const block = renderMinimalInstructionBlock('.agents/engram.md');
  const withBlock = upsertWorkspaceManagedBlock('# Test\n', block);
  assert.ok(hasWorkspaceManagedBlock(withBlock.text), 'should detect block');
  assert.ok(!hasWorkspaceManagedBlock('# Plain content\n'), 'should not find block in plain content');
});

test('isGenerated detects generated content and managed blocks', () => {
  assert.ok(isGenerated('<!-- Generated by Engram skillset installer. Edit with care. -->\n\n# Engram'), 'should detect generated header');
  assert.ok(isGenerated(`# Human\n\n<!-- engram:start -->\nBlock\n<!-- engram:end -->`), 'should detect managed block');
  assert.ok(!isGenerated('# Plain human content\n'), 'should not flag plain content as generated');
});

test('MCP config for cursor paths uses type stdio while root .mcp.json does not', async () => {
  const { cwd, env } = await tempWorkspace('engram-mcp-stdio-');
  await runEngram(cwd, env, ['link', 'cursor']);
  const cursorMcp = JSON.parse(await readFile(path.join(cwd, '.cursor', 'mcp.json'), 'utf8'));
  assert.equal(cursorMcp.mcpServers.engram.type, 'stdio');

  await rm(cwd, { recursive: true, force: true });
});

test('windsurf global link MCP config uses type stdio for codeium path', async () => {
  const { cwd, env } = await tempWorkspace('engram-windsurf-mcp-stdio-');
  const agentHome = path.join(cwd, 'agent-home');
  const globalEnv = { ...env, ENGRAM_AGENT_HOME: agentHome, ENGRAM_AGENT_CONFIG_HOME: path.join(cwd, 'agent-config') };
  await runEngram(cwd, globalEnv, ['link', '--global', 'windsurf']);

  const mcp = JSON.parse(await readFile(path.join(agentHome, '.codeium', 'windsurf', 'mcp_config.json'), 'utf8'));
  assert.equal(mcp.mcpServers.engram.type, 'stdio');

  await rm(cwd, { recursive: true, force: true });
});

test('cursor global link handles already-existing MCP config preserving user servers', async () => {
  const { cwd, env } = await tempWorkspace('engram-cursor-global-mcp-merge-');
  const agentHome = path.join(cwd, 'agent-home');
  const globalEnv = { ...env, ENGRAM_AGENT_HOME: agentHome, ENGRAM_AGENT_CONFIG_HOME: path.join(cwd, 'agent-config') };
  const pluginDir = path.join(agentHome, '.cursor', 'plugins', 'local', 'engram');
  await mkdir(pluginDir, { recursive: true });
  await writeFile(path.join(pluginDir, 'mcp.json'), JSON.stringify({
    mcpServers: { other: { command: 'other-bin', type: 'stdio' } }
  }, null, 2) + '\n');

  await runEngram(cwd, globalEnv, ['link', '--global', 'cursor']);
  const mcp = JSON.parse(await readFile(path.join(pluginDir, 'mcp.json'), 'utf8'));
  assert.ok(mcp.mcpServers.other, 'existing MCP server should be preserved');
  assert.equal(mcp.mcpServers.engram.type, 'stdio');

  await rm(cwd, { recursive: true, force: true });
});

test('windsurf global link handles already-existing MCP config preserving user servers', async () => {
  const { cwd, env } = await tempWorkspace('engram-windsurf-global-mcp-merge-');
  const agentHome = path.join(cwd, 'agent-home');
  const globalEnv = { ...env, ENGRAM_AGENT_HOME: agentHome, ENGRAM_AGENT_CONFIG_HOME: path.join(cwd, 'agent-config') };
  const mcpDir = path.join(agentHome, '.codeium', 'windsurf');
  await mkdir(mcpDir, { recursive: true });
  await writeFile(path.join(mcpDir, 'mcp_config.json'), JSON.stringify({
    mcpServers: { other: { command: 'other-bin', type: 'stdio' } }
  }, null, 2) + '\n');

  await runEngram(cwd, globalEnv, ['link', '--global', 'windsurf']);
  const mcp = JSON.parse(await readFile(path.join(mcpDir, 'mcp_config.json'), 'utf8'));
  assert.ok(mcp.mcpServers.other, 'existing MCP server should be preserved');
  assert.equal(mcp.mcpServers.engram.type, 'stdio');

  await rm(cwd, { recursive: true, force: true });
});

test('isGenerated detects Engram plugin.json via _managedBy marker', () => {
  const pluginContent = JSON.stringify({ name: 'engram', version: '1.0.0', _managedBy: 'engram' });
  assert.ok(isGenerated(pluginContent, '.cursor/plugins/local/engram/.cursor-plugin/plugin.json'), 'should detect engram plugin.json with _managedBy marker');
  assert.ok(!isGenerated('{"name": "other"}', '.cursor/plugins/local/engram/.cursor-plugin/plugin.json'), 'should not flag non-engram plugin.json');
  assert.ok(!isGenerated('{"name": "engram"}', '.cursor/plugins/local/engram/.cursor-plugin/plugin.json'), 'should not flag engram plugin.json without _managedBy marker');
});

test('cursor global unlink removes plugin.json with _managedBy marker', async () => {
  const { cwd, env } = await tempWorkspace('engram-cursor-plugin-unlink-');
  const agentHome = path.join(cwd, 'agent-home');
  const globalEnv = { ...env, ENGRAM_AGENT_HOME: agentHome, ENGRAM_AGENT_CONFIG_HOME: path.join(cwd, 'agent-config') };
  await runEngram(cwd, globalEnv, ['link', '--global', 'cursor']);

  const pluginDir = path.join(agentHome, '.cursor', 'plugins', 'local', 'engram');
  const pluginJsonPath = path.join(pluginDir, '.cursor-plugin', 'plugin.json');
  const pluginJson = JSON.parse(await readFile(pluginJsonPath, 'utf8'));
  assert.equal(pluginJson._managedBy, 'engram', 'plugin.json should have _managedBy marker');

  await runEngram(cwd, globalEnv, ['unlink', '--global', 'cursor']);
  await assert.rejects(readFile(pluginJsonPath, 'utf8'), 'plugin.json should be removed on unlink');

  await rm(cwd, { recursive: true, force: true });
});

test('cursor link ensures alwaysApply: true in human .mdc frontmatter', async () => {
  const { cwd, env } = await tempWorkspace('engram-cursor-frontmatter-');
  const cursorDir = path.join(cwd, '.cursor', 'rules');
  await mkdir(cursorDir, { recursive: true });
  await writeFile(path.join(cursorDir, 'engram.mdc'), '---\ndescription: My rules\nalwaysApply: false\n---\n\n# My rules\n\n- Keep this.\n');

  await runEngram(cwd, env, ['link', 'cursor']);
  const mdc = await readFile(path.join(cursorDir, 'engram.mdc'), 'utf8');
  assert.match(mdc, /alwaysApply:\s*true/, 'should set alwaysApply to true');
  assert.match(mdc, /Keep this/, 'should preserve human content');
  assert.match(mdc, /<!-- engram:start -->/, 'should append engram block');

  await rm(cwd, { recursive: true, force: true });
});

test('windsurf link ensures trigger: always_on in human .md frontmatter', async () => {
  const { cwd, env } = await tempWorkspace('engram-windsurf-frontmatter-');
  const rulesDir = path.join(cwd, '.windsurf', 'rules');
  await mkdir(rulesDir, { recursive: true });
  await writeFile(path.join(rulesDir, 'engram.md'), '---\ntrigger: on_demand\n---\n\n# My rules\n\n- Keep this.\n');

  await runEngram(cwd, env, ['link', 'windsurf']);
  const rule = await readFile(path.join(rulesDir, 'engram.md'), 'utf8');
  assert.match(rule, /trigger:\s*always_on/, 'should set trigger to always_on');
  assert.match(rule, /Keep this/, 'should preserve human content');
  assert.match(rule, /<!-- engram:start -->/, 'should append engram block');

  await rm(cwd, { recursive: true, force: true });
});

test('cursor link adds alwaysApply when missing from human frontmatter', async () => {
  const { cwd, env } = await tempWorkspace('engram-cursor-add-frontmatter-');
  const cursorDir = path.join(cwd, '.cursor', 'rules');
  await mkdir(cursorDir, { recursive: true });
  await writeFile(path.join(cursorDir, 'engram.mdc'), '---\ndescription: My rules\n---\n\n# My rules\n\n- Keep this.\n');

  await runEngram(cwd, env, ['link', 'cursor']);
  const mdc = await readFile(path.join(cursorDir, 'engram.mdc'), 'utf8');
  assert.match(mdc, /alwaysApply:\s*true/, 'should add alwaysApply: true when missing');

  await rm(cwd, { recursive: true, force: true });
});

test('windsurf link adds trigger when missing from human frontmatter', async () => {
  const { cwd, env } = await tempWorkspace('engram-windsurf-add-frontmatter-');
  const rulesDir = path.join(cwd, '.windsurf', 'rules');
  await mkdir(rulesDir, { recursive: true });
  await writeFile(path.join(rulesDir, 'engram.md'), '---\ndescription: My rules\n---\n\n# My rules\n\n- Keep this.\n');

  await runEngram(cwd, env, ['link', 'windsurf']);
  const rule = await readFile(path.join(rulesDir, 'engram.md'), 'utf8');
  assert.match(rule, /trigger:\s*always_on/, 'should add trigger: always_on when missing');

  await rm(cwd, { recursive: true, force: true });
});

test('cursor link ensures alwaysApply: true in CRLF human .mdc frontmatter', async () => {
  const { cwd, env } = await tempWorkspace('engram-cursor-crlf-frontmatter-');
  const cursorDir = path.join(cwd, '.cursor', 'rules');
  await mkdir(cursorDir, { recursive: true });
  await writeFile(path.join(cursorDir, 'engram.mdc'), '---\r\ndescription: My rules\r\nalwaysApply: false\r\n---\r\n\r\n# My rules\r\n\r\n- Keep this.\r\n');

  await runEngram(cwd, env, ['link', 'cursor']);
  const mdc = await readFile(path.join(cursorDir, 'engram.mdc'), 'utf8');
  assert.match(mdc, /alwaysApply:\s*true/, 'should set alwaysApply to true');
  assert.match(mdc, /Keep this/, 'should preserve human content');
  assert.match(mdc, /<!-- engram:start -->/, 'should append engram block');
  assert.match(mdc, /\r\n/, 'should preserve CRLF line endings');

  await rm(cwd, { recursive: true, force: true });
});

test('windsurf link ensures trigger: always_on in CRLF human .md frontmatter', async () => {
  const { cwd, env } = await tempWorkspace('engram-windsurf-crlf-frontmatter-');
  const rulesDir = path.join(cwd, '.windsurf', 'rules');
  await mkdir(rulesDir, { recursive: true });
  await writeFile(path.join(rulesDir, 'engram.md'), '---\r\ntrigger: on_demand\r\n---\r\n\r\n# My rules\r\n\r\n- Keep this.\r\n');

  await runEngram(cwd, env, ['link', 'windsurf']);
  const rule = await readFile(path.join(rulesDir, 'engram.md'), 'utf8');
  assert.match(rule, /trigger:\s*always_on/, 'should set trigger to always_on');
  assert.match(rule, /Keep this/, 'should preserve human content');
  assert.match(rule, /\r\n/, 'should preserve CRLF line endings');

  await rm(cwd, { recursive: true, force: true });
});

test('cursor link adds alwaysApply when missing from CRLF human frontmatter', async () => {
  const { cwd, env } = await tempWorkspace('engram-cursor-crlf-add-frontmatter-');
  const cursorDir = path.join(cwd, '.cursor', 'rules');
  await mkdir(cursorDir, { recursive: true });
  await writeFile(path.join(cursorDir, 'engram.mdc'), '---\r\ndescription: My rules\r\n---\r\n\r\n# My rules\r\n\r\n- Keep this.\r\n');

  await runEngram(cwd, env, ['link', 'cursor']);
  const mdc = await readFile(path.join(cursorDir, 'engram.mdc'), 'utf8');
  assert.match(mdc, /alwaysApply:\s*true/, 'should add alwaysApply: true when missing in CRLF');
  assert.match(mdc, /\r\n/, 'should preserve CRLF line endings');

  await rm(cwd, { recursive: true, force: true });
});

test('windsurf link adds trigger when missing from CRLF human frontmatter', async () => {
  const { cwd, env } = await tempWorkspace('engram-windsurf-crlf-add-frontmatter-');
  const rulesDir = path.join(cwd, '.windsurf', 'rules');
  await mkdir(rulesDir, { recursive: true });
  await writeFile(path.join(rulesDir, 'engram.md'), '---\r\ndescription: My rules\r\n---\r\n\r\n# My rules\r\n\r\n- Keep this.\r\n');

  await runEngram(cwd, env, ['link', 'windsurf']);
  const rule = await readFile(path.join(rulesDir, 'engram.md'), 'utf8');
  assert.match(rule, /trigger:\s*always_on/, 'should add trigger: always_on when missing in CRLF');
  assert.match(rule, /\r\n/, 'should preserve CRLF line endings');

  await rm(cwd, { recursive: true, force: true });
});

function isObject(v) {
  return Boolean(v) && typeof v === 'object' && !Array.isArray(v);
}



test('global Codex instruction preview uses the same minimal block renderer as install', async () => {
  const { cwd, env } = await tempWorkspace('engram-global-preview-render-');
  const agentHome = path.join(cwd, 'agent-home');
  const previous = {
    configDir: process.env.ENGRAM_CONFIG_DIR,
    agentHome: process.env.ENGRAM_AGENT_HOME,
    cwd: process.cwd()
  };
  process.env.ENGRAM_CONFIG_DIR = env.ENGRAM_CONFIG_DIR;
  process.env.ENGRAM_AGENT_HOME = agentHome;
  process.chdir(cwd);
  try {
    await installGlobalSkillset('codex', { home: agentHome });
    const previews = await previewRegisteredGlobalSkillsets(agentHome, cwd);
    const agents = previews.find((row) => path.normalize(row.file) === path.normalize(path.join(agentHome, '.codex', 'AGENTS.md')));
    const guide = previews.find((row) => path.normalize(row.file) === path.normalize(path.join(agentHome, '.agents', 'engram.md')));
    assert.ok(agents, 'Codex AGENTS.md preview should exist');
    assert.ok(guide, 'global companion guide preview should exist');
    assert.match(agents.latest ?? '', /<!-- engram:start -->/);
    assert.doesNotMatch(agents.latest ?? '', /# Engram Global Agent Skillset/);
    assert.equal(agents.current, agents.expected, 'freshly installed instruction file should already equal its preview');
    assert.match(guide.latest ?? '', /# Engram Global Agent Skillset/);
  } finally {
    process.chdir(previous.cwd);
    if (previous.configDir === undefined) delete process.env.ENGRAM_CONFIG_DIR; else process.env.ENGRAM_CONFIG_DIR = previous.configDir;
    if (previous.agentHome === undefined) delete process.env.ENGRAM_AGENT_HOME; else process.env.ENGRAM_AGENT_HOME = previous.agentHome;
    await rm(cwd, { recursive: true, force: true });
  }
});

test('engram link claude registers InstructionsLoaded and codex PreToolUse, both with PreCompact and SubagentStart hooks', async () => {
  const { cwd, env } = await tempWorkspace('engram-skillset-pretool-');
  try {
    for (const [host, file] of [['claude', path.join('.claude', 'settings.json')], ['codex', path.join('.codex', 'hooks.json')]]) {
      const linked = await runEngram(cwd, env, ['link', host]);
      assert.equal(linked.code, 0, linked.stderr);
      const { hooks } = JSON.parse(await readFile(path.join(cwd, file), 'utf8'));
      const managed = (event) => (hooks[event] ?? []).filter((group) => group.hooks.some((hook) => hook.name === 'engram-auto-load'));
      if (host === 'claude') {
        // E13: native path rules replace Claude's PreToolUse with InstructionsLoaded.
        assert.deepEqual(managed('InstructionsLoaded').map((group) => group.matcher), ['path_glob_match'], host);
        assert.equal(managed('PreToolUse').length, 0, host);
      } else {
        assert.deepEqual(managed('PreToolUse').map((group) => group.matcher), ['Read|Edit|Write|MultiEdit'], host);
        assert.equal(managed('InstructionsLoaded').length, 0, host);
      }
      assert.equal(managed('PreCompact').length, 1, host);
      assert.equal(managed('PreCompact')[0].hooks[0].command, `engram agent-hook --host ${host}`);
      assert.equal(managed('UserPromptSubmit').length, 1, host);
      assert.equal(managed('SubagentStart').length, 1, host);
      assert.equal(managed('SubagentStart')[0].matcher, '*');
    }
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('claude and codex hooks use a timeout in seconds', async () => {
  const { cwd, env } = await tempWorkspace('engram-skillset-hook-timeout-');
  try {
    for (const [host, file] of [['claude', path.join('.claude', 'settings.json')], ['codex', path.join('.codex', 'hooks.json')]]) {
      assert.equal((await runEngram(cwd, env, ['link', host])).code, 0);
      const { hooks } = JSON.parse(await readFile(path.join(cwd, file), 'utf8'));
      const timeouts = Object.values(hooks).flat().flatMap((group) => group.hooks).filter((hook) => hook.name === 'engram-auto-load').map((hook) => hook.timeout);
      assert.ok(timeouts.length >= 4 && timeouts.every((value) => value === 10), `${host}: ${timeouts}`);
    }
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

// B5: each host reads MCP config from a different place (Claude project .mcp.json, Gemini settings.json, Codex config.toml).
const NPX_MCP = { command: 'npx', args: ['-y', '--package', PINNED_PACKAGE, 'engram-mcp'] };

async function globalMcpEnv(prefix) {
  const { cwd, env } = await tempWorkspace(prefix);
  const agentHome = path.join(cwd, 'agent-home');
  return { cwd, agentHome, env: { ...env, ENGRAM_AGENT_HOME: agentHome, ENGRAM_AGENT_CONFIG_HOME: path.join(cwd, 'agent-config') } };
}

async function envWithEngramMcp(cwd, env) {
  const bin = await makeEngramMcpBin(cwd);
  return withPath(env, `${bin}${path.delimiter}${pathWithoutEngramMcp()}`);
}

test('MCP command is engram-mcp when it resolves on PATH, otherwise npx (PATH and platform are injectable)', async () => {
  const { cwd } = await tempWorkspace('engram-mcp-command-');
  try {
    const bin = await makeEngramMcpBin(cwd);
    const platform = process.platform;
    assert.deepEqual(resolveMcpCommand({ pathEnv: bin, platform }), { command: 'engram-mcp', args: [] });
    assert.deepEqual(resolveMcpCommand({ pathEnv: `${path.join(cwd, 'nowhere')}${path.delimiter}${bin}`, platform }), { command: 'engram-mcp', args: [] });
    assert.deepEqual(resolveMcpCommand({ pathEnv: path.join(cwd, 'nowhere'), platform }), NPX_MCP);
    assert.deepEqual(resolveMcpCommand({ pathEnv: '', platform }), NPX_MCP);
    assert.equal(mcpCommandLine({ pathEnv: '', platform }), `npx -y --package ${PINNED_PACKAGE} engram-mcp`);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('resolveMcpCommand appends --always-load only when asked, for both launchers', async () => {
  const { cwd } = await tempWorkspace('engram-mcp-always-load-');
  try {
    const bin = await makeEngramMcpBin(cwd);
    assert.equal(resolveMcpCommand({ pathEnv: '', alwaysLoad: true }).args.at(-1), '--always-load');
    assert.deepEqual(resolveMcpCommand({ pathEnv: '', alwaysLoad: true }).args, [...NPX_MCP.args, '--always-load']);
    assert.deepEqual(resolveMcpCommand({ pathEnv: bin, platform: process.platform, alwaysLoad: true }), { command: 'engram-mcp', args: ['--always-load'] });
    assert.deepEqual(resolveMcpCommand({ pathEnv: '', alwaysLoad: false }), NPX_MCP);
    assert.equal(mcpCommandLine({ pathEnv: '', alwaysLoad: true }), `npx -y --package ${PINNED_PACKAGE} engram-mcp --always-load`);
    // Codex has no alwaysLoad: its managed block never carries the flag.
    assert.doesNotMatch(renderCodexMcpBlock({ pathEnv: '', alwaysLoad: true }), /always-load/);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('workspace link mcp without Claude hooks launches engram-mcp --always-load', async () => {
  const { cwd, env } = await tempWorkspace('engram-t7-link-mcp-');
  try {
    const linked = await runEngram(cwd, env, ['link', 'mcp']);
    assert.equal(linked.code, 0, linked.stderr);
    const config = JSON.parse(await readFile(path.join(cwd, '.mcp.json'), 'utf8'));
    assert.deepEqual(config.mcpServers.engram.args, ['-y', '--package', PINNED_PACKAGE, 'engram-mcp', '--always-load']);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('workspace link claude keeps args without --always-load', async () => {
  const { cwd, env } = await tempWorkspace('engram-t7-link-claude-');
  try {
    const linked = await runEngram(cwd, env, ['link', 'claude']);
    assert.equal(linked.code, 0, linked.stderr);
    const config = JSON.parse(await readFile(path.join(cwd, '.mcp.json'), 'utf8'));
    assert.deepEqual(config.mcpServers.engram.args, NPX_MCP.args);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('cursor and gemini MCP configs never get --always-load', async () => {
  const { cwd, env } = await tempWorkspace('engram-t7-cursor-gemini-');
  try {
    assert.equal((await runEngram(cwd, env, ['link', 'cursor'])).code, 0);
    assert.equal((await runEngram(cwd, env, ['link', 'gemini'])).code, 0);
    const cursor = JSON.parse(await readFile(path.join(cwd, '.cursor', 'mcp.json'), 'utf8'));
    assert.deepEqual(cursor.mcpServers.engram.args, NPX_MCP.args);
    const gemini = JSON.parse(await readFile(path.join(cwd, '.gemini', 'settings.json'), 'utf8'));
    assert.deepEqual(gemini.mcpServers.engram.args, NPX_MCP.args);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('global Claude MCP hint carries --always-load only without Engram Claude hooks', async () => {
  const { cwd, env } = await globalMcpEnv('engram-t7-claude-hint-');
  try {
    const hookless = await runEngram(cwd, env, ['link', '--global', 'mcp']);
    assert.equal(hookless.code, 0, hookless.stderr);
    assert.ok(hookless.stdout.includes(`claude mcp add --scope user engram -- npx -y --package ${PINNED_PACKAGE} engram-mcp --always-load`), hookless.stdout);
    const hooked = await runEngram(cwd, env, ['link', '--global', 'claude']);
    assert.equal(hooked.code, 0, hooked.stderr);
    assert.ok(hooked.stdout.includes(`claude mcp add --scope user engram -- npx -y --package ${PINNED_PACKAGE} engram-mcp`), hooked.stdout);
    assert.doesNotMatch(hooked.stdout, /claude mcp add[^\n]*--always-load/);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('workspace link claude writes .mcp.json mcpServers.engram and keeps other servers', async () => {
  const { cwd, env } = await tempWorkspace('engram-b5-claude-ws-');
  try {
    await writeFile(path.join(cwd, '.mcp.json'), `${JSON.stringify({ mcpServers: { other: { command: 'other-bin' } } }, null, 2)}\n`);
    const linked = await runEngram(cwd, env, ['link', 'claude']);
    assert.equal(linked.code, 0, linked.stderr);
    const config = JSON.parse(await readFile(path.join(cwd, '.mcp.json'), 'utf8'));
    assert.deepEqual(config.mcpServers.other, { command: 'other-bin' });
    assert.deepEqual(config.mcpServers.engram, NPX_MCP);
    await assert.rejects(readFile(path.join(cwd, '.claude', 'mcp.json'), 'utf8'));
    const unlinked = await runEngram(cwd, env, ['unlink', 'claude']);
    assert.equal(unlinked.code, 0, unlinked.stderr);
    assert.deepEqual(JSON.parse(await readFile(path.join(cwd, '.mcp.json'), 'utf8')), { mcpServers: { other: { command: 'other-bin' } } });
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('workspace link claude uses engram-mcp when it is on PATH and removes the file it created on unlink', async () => {
  const { cwd, env } = await tempWorkspace('engram-b5-claude-path-');
  try {
    const pathEnv = await envWithEngramMcp(cwd, env);
    assert.equal((await runEngram(cwd, pathEnv, ['link', 'claude'])).code, 0);
    assert.deepEqual(JSON.parse(await readFile(path.join(cwd, '.mcp.json'), 'utf8')), { mcpServers: { engram: { command: 'engram-mcp', args: [] } } });
    assert.equal((await runEngram(cwd, pathEnv, ['unlink', 'claude'])).code, 0);
    await assert.rejects(readFile(path.join(cwd, '.mcp.json'), 'utf8'));
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('workspace link gemini merges mcpServers.engram into .gemini/settings.json, not .mcp.json', async () => {
  const { cwd, env } = await tempWorkspace('engram-b5-gemini-ws-');
  try {
    await mkdir(path.join(cwd, '.gemini'), { recursive: true });
    await writeFile(path.join(cwd, '.gemini', 'settings.json'), `${JSON.stringify({ theme: 'dark', mcpServers: { other: { command: 'other-bin' } } }, null, 2)}\n`);
    const linked = await runEngram(cwd, env, ['link', 'gemini']);
    assert.equal(linked.code, 0, linked.stderr);
    const settings = JSON.parse(await readFile(path.join(cwd, '.gemini', 'settings.json'), 'utf8'));
    assert.equal(settings.theme, 'dark');
    assert.deepEqual(settings.mcpServers.other, { command: 'other-bin' });
    assert.deepEqual(settings.mcpServers.engram, NPX_MCP);
    await assert.rejects(readFile(path.join(cwd, '.mcp.json'), 'utf8'), 'gemini does not read .mcp.json');
    assert.equal((await runEngram(cwd, env, ['unlink', 'gemini'])).code, 0);
    assert.deepEqual(JSON.parse(await readFile(path.join(cwd, '.gemini', 'settings.json'), 'utf8')), { theme: 'dark', mcpServers: { other: { command: 'other-bin' } } });
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('global link gemini merges mcpServers.engram into ~/.gemini/settings.json and keeps other keys', async () => {
  const { cwd, agentHome, env } = await globalMcpEnv('engram-b5-gemini-global-');
  try {
    const settingsFile = path.join(agentHome, '.gemini', 'settings.json');
    await mkdir(path.dirname(settingsFile), { recursive: true });
    await writeFile(settingsFile, `${JSON.stringify({ theme: 'dark', mcpServers: { other: { command: 'other-bin' } } }, null, 2)}\n`);
    const linked = await runEngram(cwd, env, ['link', '--global', 'gemini']);
    assert.equal(linked.code, 0, linked.stderr);
    const settings = JSON.parse(await readFile(settingsFile, 'utf8'));
    assert.equal(settings.theme, 'dark');
    assert.deepEqual(settings.mcpServers.other, { command: 'other-bin' });
    assert.deepEqual(settings.mcpServers.engram, NPX_MCP);
    const again = await runEngram(cwd, env, ['link', '--global', 'gemini']);
    assert.equal(again.code, 0, again.stderr);
    assert.deepEqual(JSON.parse(await readFile(settingsFile, 'utf8')).mcpServers, settings.mcpServers, 're-link is idempotent');
    const unlinked = await runEngram(cwd, env, ['unlink', '--global', 'gemini']);
    assert.equal(unlinked.code, 0, unlinked.stderr);
    const after = JSON.parse(await readFile(settingsFile, 'utf8'));
    assert.equal(after.theme, 'dark');
    assert.deepEqual(after.mcpServers, { other: { command: 'other-bin' } });
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('global gemini unlink never deletes a shared settings.json that holds no Engram entry, even with --force', async () => {
  const { cwd, agentHome, env } = await globalMcpEnv('engram-b5-gemini-created-');
  try {
    const settingsFile = path.join(agentHome, '.gemini', 'settings.json');
    assert.equal((await runEngram(cwd, env, ['link', '--global', 'gemini'])).code, 0);
    assert.ok(JSON.parse(await readFile(settingsFile, 'utf8')).mcpServers.engram);
    await writeFile(settingsFile, `${JSON.stringify({ theme: 'dark' })}\n`);
    assert.equal((await runEngram(cwd, env, ['unlink', '--global', 'gemini', '--force'])).code, 0);
    assert.deepEqual(JSON.parse(await readFile(settingsFile, 'utf8')), { theme: 'dark' });
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('global link codex writes a managed [mcp_servers.engram] block in ~/.codex/config.toml, idempotently', async () => {
  const { cwd, agentHome, env } = await globalMcpEnv('engram-b5-codex-global-');
  try {
    const tomlFile = path.join(agentHome, '.codex', 'config.toml');
    const human = 'model = "gpt-5"\n\n[mcp_servers.other]\ncommand = "other-bin"\nargs = ["--flag"]\n';
    await mkdir(path.dirname(tomlFile), { recursive: true });
    await writeFile(tomlFile, human);
    const linked = await runEngram(cwd, env, ['link', '--global', 'codex']);
    assert.equal(linked.code, 0, linked.stderr);
    const first = await readFile(tomlFile, 'utf8');
    assert.ok(first.startsWith(human), 'user content stays untouched');
    assert.ok(first.includes(`# BEGIN ENGRAM MANAGED MCP
[mcp_servers.engram]
command = "npx"
args = ["-y", "--package", "${PINNED_PACKAGE}", "engram-mcp"]
[mcp_servers.engram.tools.engram_commit]
approval_mode = "approve"
# END ENGRAM MANAGED MCP
`), first);
    assert.equal((first.match(/\[mcp_servers\.engram\]/g) ?? []).length, 1);
    const again = await runEngram(cwd, env, ['link', '--global', 'codex']);
    assert.equal(again.code, 0, again.stderr);
    assert.equal(await readFile(tomlFile, 'utf8'), first, 're-link is idempotent');
    const unlinked = await runEngram(cwd, env, ['unlink', '--global', 'codex']);
    assert.equal(unlinked.code, 0, unlinked.stderr);
    assert.equal(await readFile(tomlFile, 'utf8'), human, 'unlink removes only the managed block');
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('global codex link creates config.toml when absent, removes it on unlink, and leaves a user-owned engram table alone', async () => {
  const { cwd, agentHome, env } = await globalMcpEnv('engram-b5-codex-created-');
  try {
    const tomlFile = path.join(agentHome, '.codex', 'config.toml');
    const pathEnv = await envWithEngramMcp(cwd, env);
    assert.equal((await runEngram(cwd, pathEnv, ['link', '--global', 'codex'])).code, 0);
    assert.equal(await readFile(tomlFile, 'utf8'), '# BEGIN ENGRAM MANAGED MCP\n[mcp_servers.engram]\ncommand = "engram-mcp"\nargs = []\n[mcp_servers.engram.tools.engram_commit]\napproval_mode = "approve"\n# END ENGRAM MANAGED MCP\n');
    assert.equal((await runEngram(cwd, pathEnv, ['unlink', '--global', 'codex'])).code, 0);
    await assert.rejects(readFile(tomlFile, 'utf8'));

    const owned = '[mcp_servers.engram]\ncommand = "my-own"\n';
    await writeFile(tomlFile, owned);
    const skipped = await runEngram(cwd, env, ['link', '--global', 'codex']);
    assert.equal(skipped.code, 0, skipped.stderr);
    assert.match(skipped.stdout, /SKIPPED codex: .*config\.toml/);
    assert.equal(await readFile(tomlFile, 'utf8'), owned, 'a user-owned [mcp_servers.engram] is never duplicated');
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('global link claude prints the `claude mcp add --scope user` hint instead of writing ~/.claude/mcp.json', async () => {
  const { cwd, agentHome, env } = await globalMcpEnv('engram-b5-claude-global-');
  try {
    const linked = await runEngram(cwd, await envWithEngramMcp(cwd, env), ['link', '--global', 'claude']);
    assert.equal(linked.code, 0, linked.stderr);
    assert.match(linked.stdout, /claude mcp add --scope user engram -- engram-mcp/);
    await assert.rejects(readFile(path.join(agentHome, '.claude', 'mcp.json'), 'utf8'));
    const npx = await runEngram(cwd, env, ['link', '--global', 'claude']);
    assert.ok(npx.stdout.includes(`claude mcp add --scope user engram -- npx -y --package ${PINNED_PACKAGE} engram-mcp`), npx.stdout);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('global codex link refuses every user-owned spelling of mcp_servers.engram instead of writing duplicate-key TOML', async () => {
  const { cwd, agentHome, env } = await globalMcpEnv('engram-b5-codex-spellings-');
  try {
    const tomlFile = path.join(agentHome, '.codex', 'config.toml');
    await mkdir(path.dirname(tomlFile), { recursive: true });
    const spellings = {
      'bare table': '[mcp_servers.engram]\ncommand = "mine"\n',
      'quoted table': '[mcp_servers."engram"]\ncommand = "mine"\n',
      'literal-quoted table': "[mcp_servers.'engram']\ncommand = \"mine\"\n",
      'spaced table': '[ mcp_servers . engram ]\ncommand = "mine"\n',
      'sub-table': 'model = "x"\n\n[mcp_servers.engram.env]\nK = "v"\n',
      'key under [mcp_servers]': '[mcp_servers]\nengram = { command = "mine" }\n',
      'quoted key under [mcp_servers]': '[mcp_servers]\n"engram" = { command = "mine" }\n',
      'dotted key at top level': 'mcp_servers.engram.command = "mine"\n',
      'dotted key under [mcp_servers]': '[mcp_servers]\nengram.command = "mine"\n',
      'inline mcp_servers': 'mcp_servers = { engram = { command = "mine" } }\n'
    };
    for (const [name, content] of Object.entries(spellings)) {
      await writeFile(tomlFile, content);
      const result = await runEngram(cwd, env, ['link', '--global', 'codex']);
      assert.equal(result.code, 0, `${name}: ${result.stderr}`);
      assert.match(result.stdout, /SKIPPED codex: .*config\.toml/, name);
      assert.equal(await readFile(tomlFile, 'utf8'), content, `${name}: file must be left untouched`);
    }
    const lookalike = '[mcp_servers.engramx]\ncommand = "other"\n';
    await writeFile(tomlFile, lookalike);
    assert.equal((await runEngram(cwd, env, ['link', '--global', 'codex'])).code, 0);
    assert.match(await readFile(tomlFile, 'utf8'), /^\[mcp_servers\.engramx\]\ncommand = "other"\n\n# BEGIN ENGRAM MANAGED MCP\n/, 'a different server name does not block the link');
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('unparseable MCP JSON is left untouched and reported as unparseable, not as already present', async () => {
  const { cwd, agentHome, env } = await globalMcpEnv('engram-b5-unparseable-');
  try {
    const broken = '{ "mcpServers": { ';
    await writeFile(path.join(cwd, '.mcp.json'), broken);
    const workspace = await runEngram(cwd, env, ['link', 'claude']);
    assert.equal(workspace.code, 0, workspace.stderr);
    assert.match(workspace.stdout, /SKIPPED claude: \.mcp\.json\s+Reason: could not parse existing file; left untouched/);
    assert.equal(await readFile(path.join(cwd, '.mcp.json'), 'utf8'), broken);

    // `mcp` has no hook installer, so the shared Gemini settings.json is only touched by the MCP merge.
    const settingsFile = path.join(agentHome, '.gemini', 'settings.json');
    await mkdir(path.dirname(settingsFile), { recursive: true });
    await writeFile(settingsFile, broken);
    const global = await runEngram(cwd, env, ['link', '--global', 'mcp']);
    assert.equal(global.code, 0, global.stderr);
    assert.match(global.stdout.replace(/\s+/g, ' '), /SKIPPED mcp: \S*settings\.json Mode: file Reason: could not parse existing file; left untouched/);
    assert.doesNotMatch(global.stdout, /already present/);
    assert.equal(await readFile(settingsFile, 'utf8'), broken);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('upgrade refresh re-pins an unpinned npx launcher in .mcp.json, .gemini/settings.json, and the Codex managed block', async () => {
  const { cwd, agentHome, env } = await globalMcpEnv('engram-mcp-pin-refresh-');
  try {
    const unpinned = { command: 'npx', args: ['-y', '--package', '@the-long-ride/engram', 'engram-mcp'] };
    await writeFile(path.join(cwd, '.mcp.json'), `${JSON.stringify({ mcpServers: { engram: unpinned, other: { command: 'other-bin' } } }, null, 2)}\n`);
    await mkdir(path.join(cwd, '.gemini'), { recursive: true });
    await writeFile(path.join(cwd, '.gemini', 'settings.json'), `${JSON.stringify({ theme: 'dark', mcpServers: { engram: unpinned } }, null, 2)}\n`);
    const { refreshGeneratedWorkspaceSkillsets } = await import('../dist/core/integrations/skillset.js');
    const refreshed = await refreshGeneratedWorkspaceSkillsets(cwd);
    assert.ok(refreshed.some((item) => item.file === '.gemini/settings.json'), JSON.stringify(refreshed));
    const claude = JSON.parse(await readFile(path.join(cwd, '.mcp.json'), 'utf8'));
    // No Engram Claude hook is installed here, so a refresh adds the E5 always-load flag to the Claude-read file only.
    assert.deepEqual(claude.mcpServers.engram.args, [...NPX_MCP.args, '--always-load']);
    assert.ok(claude.mcpServers.other);
    const gemini = JSON.parse(await readFile(path.join(cwd, '.gemini', 'settings.json'), 'utf8'));
    assert.deepEqual(gemini.mcpServers.engram.args, NPX_MCP.args);
    assert.equal(gemini.theme, 'dark');

    const tomlFile = path.join(agentHome, '.codex', 'config.toml');
    await mkdir(path.dirname(tomlFile), { recursive: true });
    await writeFile(tomlFile, 'model = "gpt-5"\n\n# BEGIN ENGRAM MANAGED MCP\n[mcp_servers.engram]\ncommand = "npx"\nargs = ["-y", "--package", "@the-long-ride/engram", "engram-mcp"]\n# END ENGRAM MANAGED MCP\n');
    const linked = await runEngram(cwd, env, ['link', '--global', 'codex']);
    assert.equal(linked.code, 0, linked.stderr);
    const toml = await readFile(tomlFile, 'utf8');
    assert.ok(toml.includes(`"${PINNED_PACKAGE}"`), toml);
    assert.equal((toml.match(/\[mcp_servers\.engram\]/g) ?? []).length, 1);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

// Task 12 (E10): AGENTS.md-first bootstrap for Claude.

const AGENTS_BLOCK_START = /<!-- engram:start -->/g;

function blockCount(text) {
  return (text.match(AGENTS_BLOCK_START) ?? []).length;
}

test('link claude in a repo without CLAUDE.md writes AGENTS.md and creates no CLAUDE.md', async () => {
  const { cwd, env } = await tempWorkspace('engram-t12-no-claude-md-');
  try {
    const linked = await runEngram(cwd, env, ['link', 'claude']);
    assert.equal(linked.code, 0, linked.stderr);
    const agents = await readFile(path.join(cwd, 'AGENTS.md'), 'utf8');
    assert.match(agents, /<!-- engram:start -->/);
    assert.match(agents, /Full guide: `\.agents\/engram\.md`/);
    await assert.rejects(readFile(path.join(cwd, 'CLAUDE.md'), 'utf8'));
    await assert.rejects(readFile(path.join(cwd, '.claude', 'CLAUDE.md'), 'utf8'));
    assert.match(await readFile(path.join(cwd, '.claude', 'engram.md'), 'utf8'), /Save flow:/);
    assert.match(await readFile(path.join(cwd, '.agents', 'engram.md'), 'utf8'), /Save flow:/);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('link claude in a repo with CLAUDE.md writes the block to both files', async () => {
  const { cwd, env } = await tempWorkspace('engram-t12-both-');
  try {
    await writeFile(path.join(cwd, 'CLAUDE.md'), '# Team\n');
    const linked = await runEngram(cwd, env, ['link', 'claude']);
    assert.equal(linked.code, 0, linked.stderr);
    const agents = await readFile(path.join(cwd, 'AGENTS.md'), 'utf8');
    const claude = await readFile(path.join(cwd, 'CLAUDE.md'), 'utf8');
    assert.equal(blockCount(agents), 1);
    assert.equal(blockCount(claude), 1);
    assert.match(claude, /# Team/);
    assert.match(claude, /Full guide: `\.claude\/engram\.md`/);
    assert.match(agents, /Full guide: `\.agents\/engram\.md`/);
    assert.match(linked.stdout, /CLAUDE\.md block kept/);
    const relinked = await runEngram(cwd, env, ['link', 'claude']);
    assert.equal(relinked.code, 0, relinked.stderr);
    assert.equal(blockCount(await readFile(path.join(cwd, 'CLAUDE.md'), 'utf8')), 1, 'relinking never duplicates the block');
    assert.equal(blockCount(await readFile(path.join(cwd, 'AGENTS.md'), 'utf8')), 1);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('link claude refreshes a block in .claude/CLAUDE.md and leaves the root CLAUDE.md absent', async () => {
  const { cwd, env } = await tempWorkspace('engram-t12-dot-claude-md-');
  try {
    await mkdir(path.join(cwd, '.claude'), { recursive: true });
    await writeFile(path.join(cwd, '.claude', 'CLAUDE.md'), '# Dot team\n');
    const linked = await runEngram(cwd, env, ['link', 'claude']);
    assert.equal(linked.code, 0, linked.stderr);
    const dotClaude = await readFile(path.join(cwd, '.claude', 'CLAUDE.md'), 'utf8');
    assert.equal(blockCount(dotClaude), 1);
    assert.match(dotClaude, /# Dot team/);
    await assert.rejects(readFile(path.join(cwd, 'CLAUDE.md'), 'utf8'));
    assert.equal(blockCount(await readFile(path.join(cwd, 'AGENTS.md'), 'utf8')), 1);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('link claude skips a CLAUDE.md that imports AGENTS.md', async () => {
  const { cwd, env } = await tempWorkspace('engram-t12-import-');
  try {
    await writeFile(path.join(cwd, 'CLAUDE.md'), '@AGENTS.md\n');
    const linked = await runEngram(cwd, env, ['link', 'claude']);
    assert.equal(linked.code, 0, linked.stderr);
    assert.equal(await readFile(path.join(cwd, 'CLAUDE.md'), 'utf8'), '@AGENTS.md\n');
    assert.match(linked.stdout, /imports AGENTS\.md/);
    assert.equal(blockCount(await readFile(path.join(cwd, 'AGENTS.md'), 'utf8')), 1);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('link claude hints when only CLAUDE.local.md exists', async () => {
  const { cwd, env } = await tempWorkspace('engram-t12-local-');
  try {
    await writeFile(path.join(cwd, 'CLAUDE.local.md'), '# My notes\n');
    const linked = await runEngram(cwd, env, ['link', 'claude']);
    assert.equal(linked.code, 0, linked.stderr);
    assert.equal(await readFile(path.join(cwd, 'CLAUDE.local.md'), 'utf8'), '# My notes\n');
    assert.match(linked.stdout, /CLAUDE\.local\.md present/);
    assert.match(linked.stdout, /@AGENTS\.md/);
    await assert.rejects(readFile(path.join(cwd, 'CLAUDE.md'), 'utf8'));
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('link claude hints when a CLAUDE.md in a parent directory up to the git root hides AGENTS.md', async () => {
  const { cwd: root, env } = await tempWorkspace('engram-t12-ancestor-');
  try {
    initGit(root);
    await writeFile(path.join(root, 'CLAUDE.md'), '# Monorepo team\n');
    const pkg = path.join(root, 'packages', 'app');
    await mkdir(pkg, { recursive: true });
    const linked = await runEngram(pkg, env, ['link', 'claude']);
    assert.equal(linked.code, 0, linked.stderr);
    assert.match(linked.stdout, /CLAUDE\.md present in a parent directory/);
    assert.equal(await readFile(path.join(root, 'CLAUDE.md'), 'utf8'), '# Monorepo team\n');
    assert.equal(blockCount(await readFile(path.join(pkg, 'AGENTS.md'), 'utf8')), 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('link codex then link claude leaves one identical AGENTS.md block and upgrade --plan reports no conflict', async () => {
  const { cwd, env: baseEnv } = await tempWorkspace('engram-t12-codex-claude-');
  const env = { ...baseEnv, ENGRAM_AGENT_HOME: path.join(cwd, 'agent-home') };
  try {
    assert.equal((await runEngram(cwd, env, ['inject', '--no-skillset'])).code, 0);
    assert.equal((await runEngram(cwd, env, ['link', 'codex'])).code, 0);
    const afterCodex = await readFile(path.join(cwd, 'AGENTS.md'), 'utf8');
    assert.equal((await runEngram(cwd, env, ['link', 'claude'])).code, 0);
    const agents = await readFile(path.join(cwd, 'AGENTS.md'), 'utf8');
    assert.equal(blockCount(agents), 1);
    assert.equal(agents, afterCodex, 'claude writes the byte-identical block codex wrote');
    const plan = await runEngram(cwd, env, ['upgrade', '--latest', '--plan', '--json', '--no-version-check']);
    assert.equal(plan.code, 0, plan.stderr);
    const items = JSON.parse(plan.stdout).items;
    const agentsItems = items.filter((item) => path.basename(item.file) === 'AGENTS.md');
    assert.ok(agentsItems.length >= 1, 'AGENTS.md is inventoried');
    assert.ok(agentsItems.every((item) => item.status !== 'conflict'), JSON.stringify(agentsItems));
    assert.ok(!items.some((item) => path.basename(item.file) === 'CLAUDE.md'), 'upgrade never plans a CLAUDE.md');
    assert.ok(!items.some((item) => item.status === 'conflict'), JSON.stringify(items.filter((item) => item.status === 'conflict')));
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('upgrade keeps an existing CLAUDE.md block and reports it', async () => {
  const { cwd, env: baseEnv } = await tempWorkspace('engram-t12-legacy-claude-');
  const env = { ...baseEnv, ENGRAM_AGENT_HOME: path.join(cwd, 'agent-home') };
  try {
    assert.equal((await runEngram(cwd, env, ['inject', '--no-skillset'])).code, 0);
    await writeFile(path.join(cwd, 'CLAUDE.md'), '# Team\n');
    assert.equal((await runEngram(cwd, env, ['link', 'claude'])).code, 0);
    // Recreate an install made by the old `link claude`: CLAUDE.md block, Claude guide, no AGENTS.md.
    await rm(path.join(cwd, 'AGENTS.md'), { force: true });
    await rm(path.join(cwd, '.agents', 'engram.md'), { force: true });
    const upgraded = await runEngram(cwd, env, ['upgrade', '--latest', '--yes', '--no-version-check']);
    assert.equal(upgraded.code, 0, upgraded.stderr);
    assert.match(upgraded.stdout.replace(/\s+/g, ' '), /CLAUDE\.md block kept/, 'the upgrade output wraps long lines');
    assert.equal(blockCount(await readFile(path.join(cwd, 'CLAUDE.md'), 'utf8')), 1);
    assert.match(await readFile(path.join(cwd, 'CLAUDE.md'), 'utf8'), /# Team/);
    assert.equal(blockCount(await readFile(path.join(cwd, 'AGENTS.md'), 'utf8')), 1);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('plain upgrade keeps the AGENTS.md guide pointer of a linked codex install', async () => {
  const { cwd, env: baseEnv } = await tempWorkspace('engram-t12-refresh-pointer-');
  const env = { ...baseEnv, ENGRAM_AGENT_HOME: path.join(cwd, 'agent-home') };
  try {
    assert.equal((await runEngram(cwd, env, ['inject', '--no-skillset'])).code, 0);
    assert.equal((await runEngram(cwd, env, ['link', 'claude'])).code, 0);
    const before = await readFile(path.join(cwd, 'AGENTS.md'), 'utf8');
    const upgraded = await runEngram(cwd, env, ['upgrade', '--no-version-check']);
    assert.equal(upgraded.code, 0, upgraded.stderr);
    assert.equal(await readFile(path.join(cwd, 'AGENTS.md'), 'utf8'), before, 'a refresh must not repoint the shared block at the OpenCode guide');
    await assert.rejects(readFile(path.join(cwd, '.opencode', 'engram.md'), 'utf8'));
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('unlink claude removes its AGENTS.md block and guides, but keeps AGENTS.md while codex is linked', async () => {
  const solo = await tempWorkspace('engram-t12-unlink-solo-');
  try {
    assert.equal((await runEngram(solo.cwd, solo.env, ['link', 'claude'])).code, 0);
    const unlinked = await runEngram(solo.cwd, solo.env, ['unlink', 'claude']);
    assert.equal(unlinked.code, 0, unlinked.stderr);
    await assert.rejects(readFile(path.join(solo.cwd, 'AGENTS.md'), 'utf8'));
    await assert.rejects(readFile(path.join(solo.cwd, '.agents', 'engram.md'), 'utf8'));
    await assert.rejects(readFile(path.join(solo.cwd, '.claude', 'engram.md'), 'utf8'));
  } finally {
    await rm(solo.cwd, { recursive: true, force: true });
  }
  const shared = await tempWorkspace('engram-t12-unlink-shared-');
  try {
    assert.equal((await runEngram(shared.cwd, shared.env, ['link', 'codex'])).code, 0);
    assert.equal((await runEngram(shared.cwd, shared.env, ['link', 'claude'])).code, 0);
    const unlinked = await runEngram(shared.cwd, shared.env, ['unlink', 'claude']);
    assert.equal(unlinked.code, 0, unlinked.stderr);
    assert.equal(blockCount(await readFile(path.join(shared.cwd, 'AGENTS.md'), 'utf8')), 1, 'codex still needs the block');
    assert.match(await readFile(path.join(shared.cwd, '.agents', 'engram.md'), 'utf8'), /Save flow:/);
    await assert.rejects(readFile(path.join(shared.cwd, '.claude', 'engram.md'), 'utf8'));
  } finally {
    await rm(shared.cwd, { recursive: true, force: true });
  }
});

test('unlink claude keeps a human CLAUDE.md and removes only the block', async () => {
  const { cwd, env } = await tempWorkspace('engram-t12-unlink-human-');
  try {
    await writeFile(path.join(cwd, 'CLAUDE.md'), '# Team\n');
    assert.equal((await runEngram(cwd, env, ['link', 'claude'])).code, 0);
    assert.equal((await runEngram(cwd, env, ['unlink', 'claude'])).code, 0);
    assert.equal((await readFile(path.join(cwd, 'CLAUDE.md'), 'utf8')).trim(), '# Team');
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('global claude install creates ~/.claude/CLAUDE.md when missing (Claude reads no user-level AGENTS.md)', async () => {
  const { cwd, env } = await tempWorkspace('engram-t12-global-claude-');
  try {
    const agentHome = path.join(cwd, 'agent-home');
    const globalEnv = { ...env, ENGRAM_AGENT_HOME: agentHome, ENGRAM_AGENT_CONFIG_HOME: path.join(cwd, 'agent-config') };
    const result = await runEngram(cwd, globalEnv, ['link', '--global', 'claude']);
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /WRITTEN claude: .*CLAUDE\.md/);
    const claude = await readFile(path.join(agentHome, '.claude', 'CLAUDE.md'), 'utf8');
    assert.equal(blockCount(claude), 1);
    assert.match(claude, /Full guide: `~\/\.agents\/engram\.md`/);
    await assert.rejects(readFile(path.join(agentHome, '.claude', 'AGENTS.md'), 'utf8'));
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

// T13: spec-valid SKILL.md (E11).
const SPEC_SKILL_KEYS = new Set(['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools']);
const SLASH_DESCRIPTION_TEXT = 'Your knowledge memory manager, synced across every device with Git.';
const GENERATED_HEADER = '<!-- Generated by Engram skillset installer. Edit with care. -->';

async function skillFilesUnder(root, dir = '') {
  const out = [];
  for (const entry of await readdir(path.join(root, dir), { withFileTypes: true })) {
    const rel = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...await skillFilesUnder(root, rel));
    else if (entry.name === 'SKILL.md') out.push(path.join(root, rel));
  }
  return out;
}

test('every generated SKILL.md passes validateSkillFrontmatter', async () => {
  const { cwd, env } = await tempWorkspace('engram-t13-valid-');
  try {
    const agentHome = path.join(cwd, 'agent-home');
    const globalEnv = { ...env, ENGRAM_AGENT_HOME: agentHome, ENGRAM_AGENT_CONFIG_HOME: path.join(cwd, 'agent-config') };
    await installSkillset(cwd, 'all-supported');
    for (const target of ['claude', 'slash', 'gemini', 'cursor', 'opencode', 'codex', 'antigravity']) {
      const result = await runEngram(cwd, env, ['link', target]);
      assert.equal(result.code, 0, `${target}: ${result.stderr}`);
      const global = await runEngram(cwd, globalEnv, ['link', '--global', target]);
      assert.equal(global.code, 0, `global ${target}: ${global.stderr}`);
    }
    const files = await skillFilesUnder(cwd);
    assert.ok(files.some((file) => file.replace(/\\/g, '/').includes('/agent-home/.claude/skills/engram/')), 'global Claude skill exists');
    assert.ok(files.some((file) => file.replace(/\\/g, '/').includes('/agent-home/.agents/skills/engram/')), 'global codex skill exists');
    assert.ok(files.some((file) => file.replace(/\\/g, '/').endsWith('/.claude/skills/engram/SKILL.md')), 'workspace Claude skill exists');
    for (const file of files) {
      const host = file.replace(/\\/g, '/').includes('/.claude/skills/') ? 'claude' : 'spec';
      assert.deepEqual(validateSkillFile(host, await readFile(file, 'utf8'), file), [], file);
    }
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('invalid SKILL.md fixtures fail naming the exact field', () => {
  const base = { name: 'engram', description: 'A skill.' };
  const first = (host, fm, dir = 'engram') => validateSkillFrontmatter(host, fm, dir)[0]?.field;
  assert.deepEqual(validateSkillFrontmatter('spec', base, 'engram'), []);
  assert.equal(first('spec', { ...base, name: 'Engram' }), 'name');
  assert.equal(first('spec', { ...base, name: 'other' }), 'name');
  assert.equal(first('spec', { ...base, name: '-x-' }, '-x-'), 'name');
  assert.equal(first('spec', { ...base, name: 'a--b' }, 'a--b'), 'name');
  assert.equal(first('spec', { ...base, name: 'x'.repeat(65) }, 'x'.repeat(65)), 'name');
  assert.equal(first('spec', { ...base, description: '' }), 'description');
  assert.equal(first('spec', { ...base, description: 'd'.repeat(1025) }), 'description');
  assert.equal(first('spec', { ...base, when_to_use: 'x' }), 'when_to_use');
  assert.equal(first('spec', { ...base, 'user-invocable': true }), 'user-invocable');
  assert.equal(first('spec', { ...base, compatibility: 'c'.repeat(501) }), 'compatibility');
  assert.equal(first('spec', { ...base, metadata: { a: 1 } }), 'metadata');
  assert.equal(first('spec', { ...base, 'allowed-tools': ['Read'] }), 'allowed-tools');
  assert.equal(first('claude', { ...base, description: 'd'.repeat(1000), when_to_use: 'w'.repeat(600) }), 'when_to_use');
  assert.equal(first('claude', { ...base, 'user-invocable': 'yes' }), 'user-invocable');
  assert.deepEqual(validateSkillFrontmatter('claude', { ...base, when_to_use: 'Use it.', 'user-invocable': true }, 'engram'), []);
  const noFrontmatter = validateSkillFile('spec', `\n---\nname: engram\ndescription: x\n---\nbody\n`, '.agents/skills/engram/SKILL.md');
  assert.equal(noFrontmatter[0]?.field, 'frontmatter');
  const broken = validateSkillFile('spec', '---\nname: engram\n  bad: [\n---\n', '.agents/skills/engram/SKILL.md');
  assert.equal(broken[0]?.field, 'frontmatter');
  assert.equal(validateSkillFile('spec', '---\nname: engram\ndescription: ok\n---\n', 'C:\\x\\skills\\other\\SKILL.md')[0]?.field, 'name');
});

test('Claude pointer skill has when_to_use and user-invocable; non-Claude skills carry only spec fields', async () => {
  const { cwd, env } = await tempWorkspace('engram-t13-pointer-');
  try {
    await linkClaudeWithSlash(cwd, env);
    for (const target of ['codex', 'opencode']) {
      const result = await runEngram(cwd, env, ['link', target]);
      assert.equal(result.code, 0, result.stderr);
    }
    const claude = parseFrontmatter(await readFile(path.join(cwd, '.claude/skills/engram/SKILL.md'), 'utf8')).data;
    assert.equal(claude['user-invocable'], true);
    assert.match(String(claude.when_to_use), /\/engram/);
    assert.equal(claude['disable-model-invocation'], undefined);
    assert.ok(String(claude.description).length + String(claude.when_to_use).length <= 1536);
    for (const file of ['.agents/skills/engram/SKILL.md', '.opencode/skills/engram/SKILL.md']) {
      const keys = Object.keys(parseFrontmatter(await readFile(path.join(cwd, file), 'utf8')).data);
      assert.ok(keys.length >= 2 && keys.every((key) => SPEC_SKILL_KEYS.has(key)), `${file}: ${keys.join(',')}`);
    }
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('.claude/commands/engram.md starts with description frontmatter; Cursor command stays plain', async () => {
  const { cwd, env } = await tempWorkspace('engram-t13-command-');
  try {
    await linkClaudeWithSlash(cwd, env);
    for (const file of ['.claude/commands/engram.md', '.opencode/commands/engram.md']) {
      const text = await readFile(path.join(cwd, file), 'utf8');
      assert.equal(text.split(/\r?\n/)[0], '---', file);
      const parsed = parseFrontmatter(text);
      assert.equal(parsed.data.description, SLASH_DESCRIPTION_TEXT, file);
      assert.deepEqual(Object.keys(parsed.data), ['description'], file);
      assert.ok(text.includes(GENERATED_HEADER), `${file} keeps the generated header`);
      assert.ok(isGenerated(text, file), file);
    }
    const cursor = await readFile(path.join(cwd, '.cursor/commands/engram.md'), 'utf8');
    assert.ok(cursor.startsWith(GENERATED_HEADER), 'Cursor command has no frontmatter');
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
