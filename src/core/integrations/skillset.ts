/** Agent-host adapter files that let Engram behave as a portable skillset. */
import path from 'node:path';
import { homedir, platform } from 'node:os';
import { VERSION } from '../runtime/constants.js';
import { userConfigDir } from '../runtime/config.js';
import { sha256 } from '../safety/hash.js';
import { ensureDir, readJson, readText, writeJson, writeText } from '../system/fsx.js';
import { globalSkillsetMarkdown, isGenerated, renderSkillsetFile } from './skillset-render.js';

export type SkillsetTarget =
  | 'agents-md' | 'copilot' | 'claude' | 'cursor' | 'gemini'
  | 'cline' | 'windsurf' | 'antigravity-cli' | 'opencode' | 'mcp' | 'slash';
export type InstallAction = 'written' | 'updated' | 'skipped' | 'planned';
export type InstallResult = { target: string; file: string; action: InstallAction; mode?: GlobalInstallMode; reason?: string; hash?: string };
export type GlobalInstallMode = 'block' | 'file';

type ResolvedTarget = { name: SkillsetTarget; label: string };
type GlobalInstallPlan = ResolvedTarget & { file: string; mode?: GlobalInstallMode; renderTarget?: SkillsetTarget; reason?: string };
type GlobalSkillsetRegistry = {
  version: 1;
  updated: string;
  engram_version: string;
  installs: Record<string, {
    target: string;
    updated: string;
    engram_version: string;
    files: Array<{ path: string; mode: GlobalInstallMode; hash: string }>;
  }>;
};

const GLOBAL_BEGIN = '<!-- BEGIN ENGRAM GLOBAL SKILLSET -->';
const GLOBAL_END = '<!-- END ENGRAM GLOBAL SKILLSET -->';
const aliases: Record<string, SkillsetTarget[]> = {
  antigravity: ['antigravity-cli'],
  codex: ['agents-md', 'antigravity-cli'],
  'open-code': ['opencode']
};

const targets: Record<SkillsetTarget, string[]> = {
  'agents-md': ['AGENTS.md'],
  copilot: ['.github/copilot-instructions.md'],
  claude: ['CLAUDE.md'],
  cursor: ['.cursor/rules/engram.mdc'],
  gemini: ['GEMINI.md'],
  cline: ['.clinerules'],
  windsurf: ['.windsurfrules'],
  'antigravity-cli': ['.agents/skills/engram/SKILL.md'],
  opencode: ['opencode.json', '.opencode/engram.md'],
  mcp: ['.mcp.json'],
  slash: ['.claude/commands/engram.md', '.claude/skills/engram/SKILL.md', '.cursor/commands/engram.md', '.gemini/commands/engram.toml']
};

/** Return supported skillset adapter names. */
export function skillsetTargets(): SkillsetTarget[] {
  return Object.keys(targets) as SkillsetTarget[];
}

/** Install one or all agent adapter files into a workspace. */
export async function installSkillset(cwd: string, target = 'all', force = false): Promise<InstallResult[]> {
  const names = target === 'all' ? skillsetTargets().map((name) => ({ name, label: name })) : resolveTargets(target);
  const results: InstallResult[] = [];
  for (const { name, label } of names) {
    for (const relativeFile of targets[name]) {
      const file = path.join(cwd, relativeFile);
      const existing = await readText(file);
      if (existing && !force && !isGenerated(existing, relativeFile)) {
        results.push({ target: label, file: relativeFile, action: 'skipped' });
        continue;
      }
      await ensureDir(path.dirname(file));
      await writeText(file, renderSkillsetFile(name, relativeFile));
      results.push({ target: label, file: relativeFile, action: 'written' });
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
  const plans = globalInstallPlans(target, options.home);
  const results: InstallResult[] = [];
  for (const plan of plans) {
    if (plan.reason || !plan.mode || !plan.renderTarget) {
      results.push({ target: plan.label, file: plan.file, action: 'skipped', reason: plan.reason ?? 'global install is not supported for this target yet' });
      continue;
    }
    const content = renderGlobalInstallContent(plan);
    if (options.plan) {
      results.push({ target: plan.label, file: plan.file, action: 'planned', mode: plan.mode, hash: sha256(content) });
      continue;
    }
    const existing = await readText(plan.file);
    if (plan.mode === 'file' && existing && !options.force && !isGenerated(existing, plan.file)) {
      results.push({ target: plan.label, file: plan.file, action: 'skipped', mode: plan.mode, reason: 'human-authored file exists; re-run with --force to replace' });
      continue;
    }
    const next = plan.mode === 'block' ? upsertManagedBlock(existing, content) : { text: content, action: existing ? 'updated' as InstallAction : 'written' as InstallAction };
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
  return names.map((name) => resolveTarget(name, target));
}

function resolveTarget(name: string, label: string): ResolvedTarget {
  if (!targets[name as SkillsetTarget]) throw new Error(`Unknown skillset target: ${label}`);
  return { name: name as SkillsetTarget, label };
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
  const names = target === 'all' ? skillsetTargets().map((name) => ({ name, label: name })) : resolveTargets(target);
  return names.flatMap((item) => globalFilesForTarget(item, home));
}

function globalFilesForTarget(target: ResolvedTarget, home: string): GlobalInstallPlan[] {
  const configHome = globalAgentConfigHome(home);
  const plan = (file: string, mode: GlobalInstallMode, renderTarget = target.name): GlobalInstallPlan => ({ ...target, file, mode, renderTarget });
  const skip = (reason: string): GlobalInstallPlan => ({ ...target, file: '<manual>', reason });
  switch (target.name) {
    case 'agents-md':
      return [plan(path.join(home, '.codex', 'AGENTS.md'), 'block')];
    case 'copilot':
      return [skip('GitHub Copilot personal instructions do not expose a stable local global file path')];
    case 'claude':
      return [plan(path.join(home, '.claude', 'CLAUDE.md'), 'block')];
    case 'cursor':
      return [skip('Cursor user rules are configured in app settings; no stable local global file path is published')];
    case 'gemini':
      return [
        plan(path.join(home, '.gemini', 'GEMINI.md'), 'block'),
        plan(path.join(home, '.gemini', 'skills', 'engram', 'SKILL.md'), 'file', 'antigravity-cli')
      ];
    case 'cline':
      return [plan(path.join(home, 'Documents', 'Cline', 'Rules', 'engram.md'), 'file')];
    case 'windsurf':
      return [skip('Windsurf user-level global rules are managed by app settings; only enterprise system paths are stable')];
    case 'antigravity-cli':
      return [plan(path.join(home, '.agents', 'skills', 'engram', 'SKILL.md'), 'file')];
    case 'opencode':
      return [
        plan(path.join(configHome, 'opencode', 'AGENTS.md'), 'block', 'agents-md'),
        plan(path.join(configHome, 'opencode', 'skills', 'engram', 'SKILL.md'), 'file', 'antigravity-cli')
      ];
    case 'mcp':
      return [skip('MCP is configured per agent host, not as one global Engram rule file')];
    case 'slash':
      return [
        plan(path.join(home, '.claude', 'commands', 'engram.md'), 'file'),
        plan(path.join(home, '.claude', 'skills', 'engram', 'SKILL.md'), 'file'),
        plan(path.join(home, '.gemini', 'commands', 'engram.toml'), 'file')
      ];
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

function renderGlobalInstallContent(plan: GlobalInstallPlan): string {
  if (plan.name === 'slash' || plan.renderTarget === 'slash') return renderSkillsetFile('slash', plan.file);
  if (plan.file.endsWith('SKILL.md')) return renderSkillsetFile(plan.renderTarget ?? 'antigravity-cli', plan.file);
  return globalSkillsetMarkdown();
}

function upsertManagedBlock(existing: string, content: string): { text: string; action: InstallAction } {
  const block = `${GLOBAL_BEGIN}\n${content.trim()}\n${GLOBAL_END}`;
  if (!existing.trim()) return { text: `${block}\n`, action: 'written' };
  const pattern = new RegExp(`${escapeRegExp(GLOBAL_BEGIN)}[\\s\\S]*?${escapeRegExp(GLOBAL_END)}`);
  if (pattern.test(existing)) return { text: existing.replace(pattern, block), action: 'updated' };
  return { text: `${existing.trimEnd()}\n\n${block}\n`, action: 'updated' };
}

function normalizePath(file: string): string {
  return file.replace(/\\/g, '/');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
