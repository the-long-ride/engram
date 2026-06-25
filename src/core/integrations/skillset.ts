/** Agent-host adapter files that let Engram behave as a portable skillset. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { homedir, platform } from 'node:os';
import { VERSION } from '../runtime/constants.js';
import { loadConfig, userConfigDir } from '../runtime/config.js';
import { sha256 } from '../safety/hash.js';
import { ensureDir, readJson, readText, writeJson, writeText } from '../system/fsx.js';
import {
  globalSkillsetMarkdown,
  hasWorkspaceManagedBlock,
  isGenerated,
  removeWorkspaceManagedBlock,
  renderAgentGuide,
  renderMinimalInstructionBlock,
  renderSkillsetFile,
  upsertWorkspaceManagedBlock
} from './skillset-render.js';
import type { InstructionProfile } from './skillset-render.js';
import { resolveAllTargets, allSupportedTargets } from './agent-detect.js';

export type SkillsetTarget =
  | 'agents-md' | 'copilot' | 'claude' | 'cursor' | 'gemini'
  | 'cline' | 'windsurf' | 'agent-skill' | 'antigravity' | 'opencode' | 'mcp' | 'slash';
export type InstallAction = 'written' | 'updated' | 'skipped' | 'planned';
export type InstallResult = { target: string; file: string; action: InstallAction; mode?: GlobalInstallMode; reason?: string; hash?: string };
export type UnlinkResult = { target: string; file: string; action: 'removed' | 'cleaned' | 'skipped'; reason?: string };
export type GlobalInstallMode = 'block' | 'file';

type ResolvedTarget = { name: SkillsetTarget; label: string };
type GlobalInstallPlan = ResolvedTarget & { file: string; mode?: GlobalInstallMode; renderTarget?: SkillsetTarget; reason?: string };
type GlobalSkillsetRegistry = { version: 1; updated: string; engram_version: string; installs: Record<string, { target: string; updated: string; engram_version: string; files: Array<{ path: string; mode: GlobalInstallMode; hash: string }> }> };

const GLOBAL_BEGIN = '<!-- BEGIN ENGRAM GLOBAL SKILLSET -->';
const GLOBAL_END = '<!-- END ENGRAM GLOBAL SKILLSET -->';
const hiddenTargets = new Set<SkillsetTarget>(['agent-skill', 'antigravity']);
const aliases: Record<string, SkillsetTarget[]> = {
  'antigravity-cli': ['antigravity'],
  codex: ['agents-md', 'agent-skill'],
  'open-code': ['opencode']
};
const aliasLabels: Record<string, string> = {
  'antigravity-cli': 'antigravity',
  codex: 'codex'
};

const targets: Record<SkillsetTarget, string[]> = {
  'agents-md': ['AGENTS.md'],
  copilot: ['.github/copilot-instructions.md'],
  claude: ['CLAUDE.md'],
  cursor: ['.cursor/rules/engram.mdc'],
  gemini: ['GEMINI.md'],
  cline: ['.clinerules'],
  windsurf: ['.windsurfrules'],
  'agent-skill': ['.agents/skills/engram/SKILL.md'],
  antigravity: [
    '.antigravity/skills/engram/SKILL.md',
    '.antigravity-cli/skills/engram/SKILL.md',
    '.antigravity-ide/skills/engram/SKILL.md',
    '.antigravityrules'
  ],
  opencode: ['opencode.json', '.opencode/engram.md'],
  mcp: ['.mcp.json'],
  slash: ['.claude/commands/engram.md', '.claude/skills/engram/SKILL.md', '.cursor/commands/engram.md', '.gemini/commands/engram.toml']
};

/** Map from workspace target to its companion full Engram guide file path. */
const workspaceGuideFiles: Partial<Record<SkillsetTarget, string>> = {
  'agents-md': '.agents/engram.md',
  claude: '.claude/engram.md',
  cursor: '.cursor/engram.md',
  gemini: '.gemini/engram.md',
  cline: '.agents/engram.md',
  windsurf: '.agents/engram.md',
  copilot: '.agents/engram.md'
};

/** Return the guide file path for a given workspace target, or undefined if none. */
function workspaceGuideFileForTarget(target: SkillsetTarget): string | undefined {
  return workspaceGuideFiles[target];
}

/** Instruction files: files that should receive the minimal block instead of full content. */
const instructionFileNames = new Set([
  'AGENTS.md',
  'CLAUDE.md',
  'GEMINI.md',
  '.cursor/rules/engram.mdc',
  '.clinerules',
  '.windsurfrules',
  '.github/copilot-instructions.md'
]);

/** Return true if the given relative file path is a human instruction file (gets minimal block). */
function isInstructionFile(relativeFile: string): boolean {
  const normalized = relativeFile.replace(/\\/g, '/');
  return instructionFileNames.has(normalized);
}

function instructionProfileForTarget(target: SkillsetTarget, label: string): InstructionProfile {
  if (label === 'codex') return 'bootstrap';
  if (target === 'claude' || target === 'cursor' || target === 'gemini') return 'bootstrap';
  return 'compact';
}

async function instructionProfileForWorkspaceRefresh(cwd: string, target: SkillsetTarget, relativeFile: string, content: string): Promise<InstructionProfile> {
  if (target === 'agents-md' && relativeFile === 'AGENTS.md' && await hasGeneratedCodexSkill(cwd) && wasBootstrap(content)) {
    return 'bootstrap';
  }
  return instructionProfileForTarget(target, target);
}

function wasBootstrap(content: string): boolean {
  return content.includes('Runtime Bootstrap');
}

async function hasGeneratedCodexSkill(cwd: string): Promise<boolean> {
  const skillFile = path.join(cwd, '.agents', 'skills', 'engram', 'SKILL.md');
  const existing = await readText(skillFile);
  return Boolean(existing && isGenerated(existing, '.agents/skills/engram/SKILL.md'));
}

/** Return supported skillset adapter names. */
export function skillsetTargets(): SkillsetTarget[] {
  return (Object.keys(targets) as SkillsetTarget[]).filter((target) => !hiddenTargets.has(target));
}

/** Install one or all agent adapter files into a workspace. */
export async function installSkillset(cwd: string, target = 'all', force = false): Promise<InstallResult[]> {
  const config = await loadConfig(cwd);
  const names = resolveLinkTargets(target);
  const results: InstallResult[] = [];
  const plannedFiles = new Set<string>();
  const plannedGuideFiles = new Set<string>();
  for (const { name, label } of names) {
    const files = target === 'all' ? targets[name] : [...targets[name], ...workspaceMcpFilesForTarget(name)];
    for (const relativeFile of files) {
      if (plannedFiles.has(relativeFile)) continue;
      plannedFiles.add(relativeFile);
      const file = path.join(cwd, relativeFile);
      if (isInstructionFile(relativeFile)) {
        // Minimal block path: upsert managed block, write companion guide
        const guidePath = workspaceGuideFileForTarget(name);
        const block = renderMinimalInstructionBlock(guidePath ?? '.agents/engram.md');
        const existing = await readText(file);
        if (existing && !force && !isGenerated(existing, relativeFile)) {
          // Human-authored without Engram block: append block
          const { text, action } = upsertWorkspaceManagedBlock(existing, block);
          await ensureDir(path.dirname(file));
          await writeText(file, text);
          results.push({ target: label, file: relativeFile, action });
        } else if (!existing) {
          await ensureDir(path.dirname(file));
          await writeText(file, `${block}\n`);
          results.push({ target: label, file: relativeFile, action: 'written' });
        } else {
          // Existing generated or forced: upsert block (replaces legacy full content)
          const { text, action } = upsertWorkspaceManagedBlock(existing, block);
          await ensureDir(path.dirname(file));
          await writeText(file, text);
          results.push({ target: label, file: relativeFile, action });
        }
        // Write companion guide file
        if (guidePath && !plannedGuideFiles.has(guidePath)) {
          plannedGuideFiles.add(guidePath);
          const guideFile = path.join(cwd, guidePath);
          const existingGuide = await readText(guideFile);
          if (!existingGuide || isGenerated(existingGuide, guidePath) || force) {
            await ensureDir(path.dirname(guideFile));
            await writeText(guideFile, renderAgentGuide(config.read));
            results.push({ target: label, file: guidePath, action: existingGuide ? 'updated' : 'written' });
          } else {
            results.push({ target: label, file: guidePath, action: 'skipped', reason: 'human-authored file; use --force to replace' });
          }
        }
      } else {
        // Non-instruction file: original behavior
        const existing = await readText(file);
        if (existing && !force && !isGenerated(existing, relativeFile)) {
          results.push({ target: label, file: relativeFile, action: 'skipped' });
          continue;
        }
        await ensureDir(path.dirname(file));
        const renderTarget = renderTargetForFile(name, relativeFile);
        const profile = instructionProfileForTarget(renderTarget, label);
        await writeText(file, renderSkillsetFile(renderTarget, relativeFile, config.read, profile));
        results.push({ target: label, file: relativeFile, action: 'written' });
      }
    }
  }
  return results;
}

/** Refresh only existing Engram-generated workspace adapter files. */
export async function refreshGeneratedWorkspaceSkillsets(cwd: string, options: { plan?: boolean } = {}): Promise<InstallResult[]> {
  const config = await loadConfig(cwd);
  const results: InstallResult[] = [];
  const handledGuideFiles = new Set<string>();
  for (const name of Object.keys(targets) as SkillsetTarget[]) {
    for (const relativeFile of targets[name]) {
      const file = path.join(cwd, relativeFile);
      const existing = await readText(file);
      if (!existing || !isGenerated(existing, relativeFile)) continue;

      if (isInstructionFile(relativeFile)) {
        // Handle instruction file: migrate to minimal block or refresh block
        const guidePath = workspaceGuideFileForTarget(name);
        const effectiveGuidePath = guidePath ?? '.agents/engram.md';
        const block = renderMinimalInstructionBlock(effectiveGuidePath);
        const { text: nextText, action: blockAction } = upsertWorkspaceManagedBlock(existing, block);
        const normalizedNext = nextText.endsWith('\n') ? nextText : `${nextText}\n`;

        if (existing !== normalizedNext) {
          if (options.plan) {
            results.push({ target: name, file: relativeFile, action: 'planned' });
          } else {
            await writeText(file, normalizedNext);
            results.push({ target: name, file: relativeFile, action: blockAction === 'written' ? 'updated' : 'updated' });
          }
        }

        // Handle companion guide file
        if (guidePath && !handledGuideFiles.has(guidePath)) {
          handledGuideFiles.add(guidePath);
          const guideFile = path.join(cwd, guidePath);
          const existingGuide = await readText(guideFile);
          const nextGuide = renderAgentGuide(config.read);
          const normalizedGuide = nextGuide.endsWith('\n') ? nextGuide : `${nextGuide}\n`;
          if (!existingGuide || isGenerated(existingGuide, guidePath)) {
            if (existingGuide !== normalizedGuide) {
              if (options.plan) {
                results.push({ target: name, file: guidePath, action: 'planned' });
              } else {
                await ensureDir(path.dirname(guideFile));
                await writeText(guideFile, normalizedGuide);
                results.push({ target: name, file: guidePath, action: existingGuide ? 'updated' : 'written' });
              }
            }
          }
          // else: human-authored guide, skip
        }
      } else {
        // Non-instruction generated file: original refresh behavior
        const profile = await instructionProfileForWorkspaceRefresh(cwd, name, relativeFile, existing);
        const next = renderSkillsetFile(name, relativeFile, config.read, profile);
        const normalized = next.endsWith('\n') ? next : `${next}\n`;
        if (existing === normalized) continue;
        if (options.plan) {
          results.push({ target: name, file: relativeFile, action: 'planned' });
          continue;
        }
        await writeText(file, normalized);
        results.push({ target: name, file: relativeFile, action: 'updated' });
      }
    }
  }
  return results;
}

/** Return the registry file used to remember global skillset installs for upgrades. */
export function globalSkillsetRegistryPath(): string {
  return path.join(userConfigDir(), 'global-skillsets.json');
}

/** Read global skillset install registry. */
export async function readGlobalSkillsetRegistry(): Promise<GlobalSkillsetRegistry> {
  return readJson<GlobalSkillsetRegistry>(globalSkillsetRegistryPath(), emptyGlobalRegistry());
}

/** Install one or all agent adapter files into user/global agent locations. */
export async function installGlobalSkillset(target = 'all', options: { force?: boolean; plan?: boolean; home?: string } = {}): Promise<InstallResult[]> {
  const config = await loadConfig(process.cwd());
  const plans = globalInstallPlans(target, options.home);
  const results: InstallResult[] = [];
  for (const plan of plans) {
    if (plan.reason || !plan.mode || !plan.renderTarget) {
      results.push({ target: plan.label, file: plan.file, action: 'skipped', reason: plan.reason ?? 'global install is not supported for this target yet' });
      continue;
    }
    const profile = instructionProfileForTarget(plan.renderTarget ?? plan.name, plan.label);
    let content = renderGlobalInstallContent(plan, config.read, profile);
    if (plan.mode === 'block') {
      content = renderMinimalInstructionBlock('~/.agents/engram.md');
    }
    if (options.plan) {
      results.push({ target: plan.label, file: plan.file, action: 'planned', mode: plan.mode, hash: sha256(content) });
      continue;
    }
    const existing = await readText(plan.file);
    if (plan.mode === 'file' && existing && !options.force && !isGenerated(existing, plan.file)) {
      results.push({ target: plan.label, file: plan.file, action: 'skipped', mode: plan.mode, reason: 'human-authored file exists; re-run with --force to replace' });
      continue;
    }
    const next = plan.mode === 'block'
      ? upsertWorkspaceManagedBlock(existing.includes(GLOBAL_BEGIN) ? removeManagedBlock(existing) : existing, content)
      : { text: content, action: existing ? 'updated' as InstallAction : 'written' as InstallAction };
    await writeText(plan.file, next.text);
    results.push({ target: plan.label, file: plan.file, action: next.action, mode: plan.mode, hash: sha256(next.text) });
  }
  if (!options.plan) await writeGlobalSkillsetRegistry(results);
  return results;
}

/** Re-render all registered global skillset targets, or one explicit target. */
export async function refreshGlobalSkillsets(target = '', options: { force?: boolean; plan?: boolean; home?: string } = {}): Promise<InstallResult[]> {
  const registry = await readGlobalSkillsetRegistry();
  const targetsToRefresh = target ? [target] : Object.keys(registry.installs);
  const results: InstallResult[] = [];
  for (const current of targetsToRefresh) results.push(...await installGlobalSkillset(current, options));
  return results;
}

function resolveTargets(target: string): ResolvedTarget[] {
  const names = aliases[target] ?? [target as SkillsetTarget];
  const label = aliasLabels[target] ?? target;
  return names.map((name) => resolveTarget(name, label));
}

function resolveTarget(name: string, label: string): ResolvedTarget {
  if (!targets[name as SkillsetTarget]) throw new Error(`Unknown skillset target: ${label}`);
  return { name: name as SkillsetTarget, label };
}

/** Resolve target names for link installs. When target is 'all', auto-detect installed agents. */
export function resolveLinkTargets(target: string): ResolvedTarget[] {
  if (target === 'all') {
    const detected = resolveAllTargets();
    return detected.map((name) => ({ name, label: name }));
  }
  if (target === 'all-supported') {
    return allSupportedTargets().filter((name) => !hiddenTargets.has(name)).map((name) => ({ name, label: name }));
  }
  return resolveTargets(target);
}

function emptyGlobalRegistry(): GlobalSkillsetRegistry {
  return { version: 1, updated: new Date(0).toISOString(), engram_version: VERSION, installs: {} };
}

async function writeGlobalSkillsetRegistry(results: InstallResult[]): Promise<void> {
  const writable = results.filter((result) => result.action !== 'skipped' && result.action !== 'planned' && result.hash && result.mode);
  if (!writable.length) return;
  const registry = await readGlobalSkillsetRegistry();
  const updated = new Date().toISOString();
  registry.updated = updated;
  registry.engram_version = VERSION;
  for (const [target, entries] of groupedResults(writable)) {
    registry.installs[target] = {
      target,
      updated,
      engram_version: VERSION,
      files: entries.map((entry) => ({ path: normalizePath(entry.file), mode: entry.mode as GlobalInstallMode, hash: entry.hash as string }))
    };
  }
  await writeJson(globalSkillsetRegistryPath(), registry);
}

function groupedResults(results: InstallResult[]): Map<string, InstallResult[]> {
  const grouped = new Map<string, InstallResult[]>();
  for (const result of results) grouped.set(result.target, [...(grouped.get(result.target) ?? []), result]);
  return grouped;
}

function globalInstallPlans(target: string, home = globalAgentHome()): GlobalInstallPlan[] {
  const resolvedTargets = resolveLinkTargets(target);
  return resolvedTargets.flatMap((item) => [
    ...globalFilesForTarget(item, home),
    ...(target === 'all' || target === 'all-supported' ? [] : globalMcpFilesForTarget(item, home))
  ]);
}

function globalFilesForTarget(target: ResolvedTarget, home: string): GlobalInstallPlan[] {
  const configHome = globalAgentConfigHome(home);
  const plan = (file: string, mode: GlobalInstallMode, renderTarget = target.name): GlobalInstallPlan => ({ ...target, file, mode, renderTarget });
  const skip = (reason: string): GlobalInstallPlan => ({ ...target, file: '<manual>', reason });
  switch (target.name) {
    case 'agents-md':
      return [
        plan(path.join(home, '.codex', 'AGENTS.md'), 'block'),
        plan(path.join(home, '.agents', 'engram.md'), 'file')
      ];
    case 'copilot':
      return [
        plan(path.join(home, '.copilot', 'copilot-instructions.md'), 'block'),
        plan(path.join(home, '.agents', 'engram.md'), 'file')
      ];
    case 'claude':
      return [
        plan(path.join(home, '.claude', 'CLAUDE.md'), 'block'),
        plan(path.join(home, '.claude', 'skills', 'engram', 'SKILL.md'), 'file', 'slash'),
        plan(path.join(home, '.agents', 'engram.md'), 'file')
      ];
    case 'cursor':
      return [skip('Cursor user rules are configured in app settings; no stable local global file path is published')];
    case 'gemini':
      return [
        plan(path.join(home, '.gemini', 'GEMINI.md'), 'block'),
        plan(path.join(home, '.gemini', 'skills', 'engram', 'SKILL.md'), 'file', 'agent-skill'),
        plan(path.join(home, '.agents', 'engram.md'), 'file')
      ];
    case 'cline':
      return [plan(path.join(home, 'Documents', 'Cline', 'Rules', 'engram.md'), 'file')];
    case 'windsurf':
      return [skip('Windsurf user-level global rules are managed by app settings; only enterprise system paths are stable')];
    case 'agent-skill':
      return [plan(path.join(home, '.agents', 'skills', 'engram', 'SKILL.md'), 'file')];
    case 'antigravity':
      return [
        plan(path.join(home, '.antigravity', 'skills', 'engram', 'SKILL.md'), 'file'),
        plan(path.join(home, '.antigravity-cli', 'skills', 'engram', 'SKILL.md'), 'file'),
        plan(path.join(home, '.antigravity-ide', 'skills', 'engram', 'SKILL.md'), 'file')
      ];
    case 'opencode':
      return [
        plan(path.join(configHome, 'opencode', 'AGENTS.md'), 'block', 'agents-md'),
        plan(path.join(configHome, 'opencode', 'skills', 'engram', 'SKILL.md'), 'file', 'agent-skill'),
        plan(path.join(home, '.agents', 'engram.md'), 'file')
      ];
    case 'mcp':
      return [plan(path.join(home, '.claude', 'mcp.json'), 'file', 'mcp'), plan(path.join(configHome, 'gemini', 'mcp.json'), 'file', 'mcp')];
    case 'slash':
      return [
        plan(path.join(home, '.claude', 'commands', 'engram.md'), 'file'),
        plan(path.join(home, '.claude', 'skills', 'engram', 'SKILL.md'), 'file'),
        plan(path.join(home, '.gemini', 'commands', 'engram.toml'), 'file')
      ];
  }
}

function workspaceMcpFilesForTarget(target: SkillsetTarget): string[] {
  return target === 'mcp' || target === 'slash' ? [] : targets.mcp;
}

function renderTargetForFile(target: SkillsetTarget, relativeFile: string): SkillsetTarget {
  return targets.mcp.includes(relativeFile) ? 'mcp' : target;
}

function globalMcpFilesForTarget(target: ResolvedTarget, home: string): GlobalInstallPlan[] {
  const configHome = globalAgentConfigHome(home);
  const plan = (file: string): GlobalInstallPlan => ({ ...target, file, mode: 'file', renderTarget: 'mcp' });
  switch (target.name) {
    case 'claude':
      return [plan(path.join(home, '.claude', 'mcp.json'))];
    case 'gemini':
    case 'antigravity':
      return [plan(path.join(configHome, 'gemini', 'mcp.json'))];
    default:
      return [];
  }
}

function globalAgentHome(): string {
  const configured = process.env.ENGRAM_AGENT_HOME?.trim();
  return configured ? path.resolve(configured) : homedir();
}

function globalAgentConfigHome(home: string): string {
  const configured = process.env.ENGRAM_AGENT_CONFIG_HOME?.trim() || process.env.XDG_CONFIG_HOME?.trim();
  if (configured) return path.resolve(configured);
  if (!process.env.ENGRAM_AGENT_HOME?.trim() && platform() === 'win32' && process.env.APPDATA?.trim()) return path.resolve(process.env.APPDATA);
  return path.join(home, '.config');
}

function renderGlobalInstallContent(plan: GlobalInstallPlan, readMode = 'auto', profile: InstructionProfile = 'compact'): string {
  if (plan.name === 'slash' || plan.renderTarget === 'slash') return renderSkillsetFile('slash', plan.file, readMode);
  if (plan.renderTarget === 'mcp') return renderSkillsetFile('mcp', plan.file, readMode);
  if (plan.file.endsWith('SKILL.md')) return renderSkillsetFile(plan.renderTarget ?? 'agent-skill', plan.file, readMode);
  return globalSkillsetMarkdown(readMode, profile);
}

function upsertManagedBlock(existing: string, content: string): { text: string; action: InstallAction } {
  const block = `${GLOBAL_BEGIN}\n${content.trim()}\n${GLOBAL_END}`;
  if (!existing.trim()) return { text: `${block}\n`, action: 'written' };
  const pattern = new RegExp(`${escapeRegExp(GLOBAL_BEGIN)}[\\s\\S]*?${escapeRegExp(GLOBAL_END)}`, 'g');
  const humanContent = existing.replace(pattern, '').trimEnd();
  return { text: `${humanContent ? `${humanContent}\n\n` : ''}${block}\n`, action: 'updated' };
}

/** Remove one or all agent adapter files from a workspace. */
export async function unlinkSkillset(cwd: string, target = 'all', force = false): Promise<UnlinkResult[]> {
  const names = target === 'all' ? skillsetTargets().map((name) => ({ name, label: name })) : resolveTargets(target);
  const results: UnlinkResult[] = [];
  const handledGuideFiles = new Set<string>();
  for (const { name, label } of names) {
    for (const relativeFile of targets[name]) {
      const file = path.join(cwd, relativeFile);
      const existing = await readText(file);
      if (!existing) {
        results.push({ target: label, file: relativeFile, action: 'skipped', reason: 'file not found' });
        continue;
      }
      if (isInstructionFile(relativeFile)) {
        // Minimal block path: remove the block, handle remaining content
        if (hasWorkspaceManagedBlock(existing)) {
          const cleaned = removeWorkspaceManagedBlock(existing).trimEnd();
          if (!cleaned) {
            await fs.rm(file, { force: true });
            results.push({ target: label, file: relativeFile, action: 'removed' });
          } else {
            await writeText(file, `${cleaned}\n`);
            results.push({ target: label, file: relativeFile, action: 'cleaned' });
          }
        } else if (isGenerated(existing, relativeFile) || force) {
          // Legacy generated full content without block, or forced
          await fs.rm(file, { force: true });
          results.push({ target: label, file: relativeFile, action: 'removed' });
        } else {
          results.push({ target: label, file: relativeFile, action: 'skipped', reason: 'human-authored file; use --force to remove' });
        }
        // Handle guide file cleanup
        const guidePath = workspaceGuideFileForTarget(name);
        if (guidePath && !handledGuideFiles.has(guidePath)) {
          handledGuideFiles.add(guidePath);
          const guideFile = path.join(cwd, guidePath);
          const existingGuide = await readText(guideFile);
          if (!existingGuide) {
            results.push({ target: label, file: guidePath, action: 'skipped', reason: 'file not found' });
          } else if (isGenerated(existingGuide, guidePath) || force) {
            await fs.rm(guideFile, { force: true });
            results.push({ target: label, file: guidePath, action: 'removed' });
          } else {
            results.push({ target: label, file: guidePath, action: 'skipped', reason: 'human-authored file; use --force to remove' });
          }
        }
      } else {
        // Non-instruction file: original behavior
        if (!force && !isGenerated(existing, relativeFile)) {
          results.push({ target: label, file: relativeFile, action: 'skipped', reason: 'human-authored file; use --force to remove' });
          continue;
        }
        await fs.rm(file, { force: true });
        results.push({ target: label, file: relativeFile, action: 'removed' });
      }
    }
  }
  return results;
}

/** Remove one or all global agent adapter files. */
export async function unlinkGlobalSkillset(target = 'all', options: { force?: boolean; home?: string } = {}): Promise<UnlinkResult[]> {
  const registry = await readGlobalSkillsetRegistry();
  const targetsToRemove = target === 'all' ? Object.keys(registry.installs) : [target];
  const results: UnlinkResult[] = [];
  for (const current of targetsToRemove) {
    const install = registry.installs[current];
    if (!install) {
      results.push({ target: current, file: '<none>', action: 'skipped', reason: 'not registered' });
      continue;
    }
    for (const entry of install.files) {
      const file = entry.path;
      const existing = await readText(file);
      if (!existing) {
        results.push({ target: current, file, action: 'skipped', reason: 'file not found' });
        continue;
      }
      if (entry.mode === 'block') {
        const cleaned = hasWorkspaceManagedBlock(existing)
          ? removeWorkspaceManagedBlock(existing)
          : removeManagedBlock(existing);
        if (cleaned === existing) {
          results.push({ target: current, file, action: 'skipped', reason: 'no Engram managed block found' });
          continue;
        }
        const trimmed = cleaned.trimEnd();
        if (!trimmed) {
          await fs.rm(file, { force: true });
          results.push({ target: current, file, action: 'removed' });
        } else {
          await writeText(file, `${trimmed}\n`);
          results.push({ target: current, file, action: 'cleaned' });
        }
      } else {
        if (!options.force && !isGenerated(existing, file)) {
          results.push({ target: current, file, action: 'skipped', reason: 'human-authored file; use --force to remove' });
          continue;
        }
        await fs.rm(file, { force: true });
        results.push({ target: current, file, action: 'removed' });
      }
    }
    delete registry.installs[current];
  }
  registry.updated = new Date().toISOString();
  registry.engram_version = VERSION;
  await writeJson(globalSkillsetRegistryPath(), registry);
  return results;
}

function removeManagedBlock(content: string): string {
  const pattern = new RegExp(`${escapeRegExp(GLOBAL_BEGIN)}[\\s\\S]*?${escapeRegExp(GLOBAL_END)}`, 'g');
  return content.replace(pattern, '').replace(/\n{3,}/g, '\n\n');
}

function normalizePath(file: string): string {
  return file.replace(/\\/g, '/');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}