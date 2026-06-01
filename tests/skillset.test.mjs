import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { installSkillset, skillsetTargets } from '../dist/core/integrations/skillset.js';
import { runEngram, tempWorkspace } from './helpers.mjs';

test('skillset installer writes all supported agent adapter files', async () => {
  const { cwd } = await tempWorkspace('engram-skillset-');
  const results = await installSkillset(cwd, 'all');
  const writtenTargets = [...new Set(results.map((result) => result.target))].sort();
  assert.deepEqual(writtenTargets, skillsetTargets().sort());
  assert.ok(results.every((result) => result.action === 'written'));
  assert.match(await readFile(path.join(cwd, 'AGENTS.md'), 'utf8'), /Default agent mode: compact/);
  assert.match(await readFile(path.join(cwd, 'AGENTS.md'), 'utf8'), /knowledge memory center/);
  assert.match(await readFile(path.join(cwd, 'AGENTS.md'), 'utf8'), /Keep token usage low/);
  const mcpConfig = await readFile(path.join(cwd, '.mcp.json'), 'utf8');
  assert.match(mcpConfig, /engram-mcp/);
  assert.equal(JSON.parse(mcpConfig).mcpServers.engram.command, 'npx');
  assert.match(await readFile(path.join(cwd, '.agents/skills/engram/SKILL.md'), 'utf8'), /Default agent mode: compact/);
  assert.match(await readFile(path.join(cwd, '.agents/skills/engram/SKILL.md'), 'utf8'), /description: "Your portable memory layer for AI agents: searchable, reviewable, and synced with Git\."/);
  assert.match(await readFile(path.join(cwd, '.agents/skills/engram/SKILL.md'), 'utf8'), /Session end/);
  assert.match(await readFile(path.join(cwd, '.agents/skills/engram/SKILL.md'), 'utf8'), /save-session --accept-all/);
  assert.match(await readFile(path.join(cwd, '.claude/commands/engram.md'), 'utf8'), /Engram Slash Command/);
  assert.match(await readFile(path.join(cwd, '.claude/commands/engram.md'), 'utf8'), /any `engram` CLI arguments/);
  assert.match(await readFile(path.join(cwd, '.claude/commands/engram.md'), 'utf8'), /current AI agent chat\/session/);
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
  assert.doesNotMatch(await readFile(path.join(cwd, '.gemini/commands/engram.toml'), 'utf8'), /autosave|auto save|legacy "autosave"/);
  assert.match(await readFile(path.join(cwd, '.gemini/commands/engram.toml'), 'utf8'), /current AI agent chat\/session/);
  assert.match(await readFile(path.join(cwd, '.gemini/commands/engram.toml'), 'utf8'), /source pack token-light/);
  assert.match(await readFile(path.join(cwd, '.gemini/commands/engram.toml'), 'utf8'), /ss -a/);
  assert.match(await readFile(path.join(cwd, '.gemini/commands/engram.toml'), 'utf8'), /save-session --accept-all/);
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
  const result = await runEngram(cwd, env, ['install-skillset', 'gemini']);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /WRITTEN gemini: GEMINI.md/);
  assert.match(await readFile(path.join(cwd, 'GEMINI.md'), 'utf8'), /Engram Agent Skillset/);
  await rm(cwd, { recursive: true, force: true });
});

test('cli installs open-code alias and antigravity skill files', async () => {
  const { cwd, env } = await tempWorkspace('engram-skillset-cli-');
  const opencode = await runEngram(cwd, env, ['install-skillset', 'open-code']);
  assert.equal(opencode.code, 0, opencode.stderr);
  assert.match(opencode.stdout, /WRITTEN open-code: opencode\.json/);
  assert.match(opencode.stdout, /WRITTEN open-code: \.opencode\/engram\.md/);
  const antigravity = await runEngram(cwd, env, ['install-skillset', 'antigravity-cli']);
  assert.equal(antigravity.code, 0, antigravity.stderr);
  assert.match(antigravity.stdout, /WRITTEN antigravity-cli: \.agents\/skills\/engram\/SKILL\.md/);
  await rm(cwd, { recursive: true, force: true });
});

test('cli installs codex alias as AGENTS.md skillset file', async () => {
  const { cwd, env } = await tempWorkspace('engram-skillset-cli-');
  const result = await runEngram(cwd, env, ['install-skillset', 'codex']);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /WRITTEN codex: AGENTS\.md/);
  assert.match(result.stdout, /WRITTEN codex: \.agents\/skills\/engram\/SKILL\.md/);
  assert.match(await readFile(path.join(cwd, 'AGENTS.md'), 'utf8'), /Speak only for confirmation/);
  assert.match(await readFile(path.join(cwd, '.agents/skills/engram/SKILL.md'), 'utf8'), /Default agent mode: compact/);
  await rm(cwd, { recursive: true, force: true });
});

test('cli installs slash command adapters', async () => {
  const { cwd, env } = await tempWorkspace('engram-skillset-cli-');
  const result = await runEngram(cwd, env, ['install-skillset', 'slash']);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /WRITTEN slash: \.claude\/commands\/engram\.md/);
  assert.match(result.stdout, /WRITTEN slash: \.claude\/skills\/engram\/SKILL\.md/);
  assert.match(result.stdout, /WRITTEN slash: \.cursor\/commands\/engram\.md/);
  assert.match(result.stdout, /WRITTEN slash: \.gemini\/commands\/engram\.toml/);
  assert.match(result.stdout, /if \/engram is not visible/);
  await rm(cwd, { recursive: true, force: true });
});
