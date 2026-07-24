/** Agent-host adapter files that let Engram behave as a portable skillset. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { VERSION } from '../runtime/constants.js';
import { loadConfig, userConfigDir } from '../runtime/config.js';
import { sha256 } from '../safety/hash.js';
import { ensureDir, exists, parseJsonLike, readJson, readText, writeJson, writeText } from '../system/fsx.js';
import {
  globalSkillsetMarkdown,
  hasWorkspaceManagedBlock,
  isGenerated,
  removeWorkspaceManagedBlock,
  renderAgentGuide,
  renderCursorPluginJson,
  renderCursorRule,
  renderMinimalInstructionBlock,
  renderSkillsetFile,
  renderWindsurfGlobalRulesBlock,
  renderGeminiHookConfig,
  renderWindsurfRule,
  upsertWorkspaceManagedBlock,
  mergeMcpJson,
  unmergeMcpJson,
  mergeGeminiHookConfig,
  unmergeGeminiHookConfig
} from './skillset-render.js';
import type { InstructionProfile } from './skillset-render.js';
import { globalAgentHome, globalAgentConfigHome, globalOpenCodeConfigHome } from './agent-paths.js';
import { resolveAllTargets, allSupportedTargets } from './agent-detect.js';
import { unmergeManagedHooks } from './agent-hooks.js';

export type SkillsetTarget =
  | 'agents-md' | 'copilot' | 'claude' | 'cursor' | 'gemini'
  | 'cline' | 'windsurf' | 'agent-skill' | 'antigravity' | 'opencode' | 'mcp' | 'slash';
export type InstallAction = 'written' | 'updated' | 'skipped' | 'planned';
export type InstallResult = { target: string; file: string; action: InstallAction; mode?: GlobalInstallMode; reason?: string; hash?: string };
export type UnlinkResult = { target: string; file: string; action: 'removed' | 'cleaned' | 'skipped'; reason?: string };
export type GlobalInstallMode = 'block' | 'file';

type ResolvedTarget = { name: SkillsetTarget; label: string };
type GlobalInstallPlan = ResolvedTarget & { file: string; mode?: GlobalInstallMode; renderTarget?: SkillsetTarget | 'gemini-hook'; reason?: string };
type GlobalSkillsetRegistry = { version: 1; updated: string; engram_version: string; installs: Record<string, { target: string; updated: string; engram_version: string; files: Array<{ path: string; mode: GlobalInstallMode; hash: string }> }> };

const GLOBAL_BEGIN = '<!-- BEGIN ENGRAM GLOBAL SKILLSET -->';
const GLOBAL_END = '<!-- END ENGRAM GLOBAL SKILLSET -->';
const hiddenTargets = new Set<SkillsetTarget>(['agent-skill', 'antigravity']);
const aliases: Record<string, SkillsetTarget[]> = {
  'antigravity-cli': ['antigravity'],
  codex: ['agents-md', 'agent-skill'],
  'open-code': ['opencode'],
  cascade: ['windsurf']
};
const aliasLabels: Record<string, string> = {
  'antigravity-cli': 'antigravity',
  codex: 'codex',
  cascade: 'windsurf'
};

function normalizeGlobalTarget(target: string): string {
  if (target === 'all') return 'all';
  if (target === 'cascade') return 'windsurf';
  return target;
}

const targets: Record<SkillsetTarget, string[]> = {
  'agents-md': ['AGENTS.md'],
  copilot: ['.github/copilot-instructions.md'],
  claude: ['CLAUDE.md'],
  cursor: ['.cursor/rules/engram.mdc', '.cursor/mcp.json'],
  gemini: ['GEMINI.md'],
  cline: ['.clinerules'],
  windsurf: ['.windsurf/rules/engram.md'],
  'agent-skill': ['.agents/skills/engram/SKILL.md'],
  antigravity: [
    '.antigravity/skills/engram/SKILL.md',
    '.antigravity-cli/skills/engram/SKILL.md',
    '.antigravity-ide/skills/engram/SKILL.md',
    '.gemini/skills/engram/SKILL.md',
    '.antigravityrules'
  ],
  opencode: ['AGENTS.md', '.opencode/skills/engram/SKILL.md', 'opencode.json'],
  mcp: ['.mcp.json'],
  slash: ['.claude/commands/engram.md', '.claude/skills/engram/SKILL.md', '.cursor/commands/engram.md', '.gemini/commands/engram.toml', '.opencode/commands/engram.md']
};

/** Map from workspace target to its companion full Engram guide file path. */
const workspaceGuideFiles: Partial<Record<SkillsetTarget, string>> = {
  'agents-md': '.agents/engram.md',
  claude: '.claude/engram.md',
  cursor: '.cursor/engram.md',
  gemini: '.gemini/engram.md',
  cline: '.agents/engram.md',
  windsurf: '.windsurf/engram.md',
  copilot: '.agents/engram.md',
  opencode: '.opencode/engram.md'
};

/** Return the guide file path for a given workspace target, or undefined if none. */
function workspaceGuideFileForTarget(target: SkillsetTarget): string | undefined {
  return workspaceGuideFiles[target];
}

const OPENCODE_JSON = 'opencode.json';
const OPENCODE_JSONC = 'opencode.jsonc';

/** Instruction files: files that should receive the minimal block instead of full content. */
const instructionFileNames = new Set([
  'AGENTS.md',
  'CLAUDE.md',
  'GEMINI.md',
  '.cursor/rules/engram.mdc',
  '.clinerules',
  '.windsurf/rules/engram.md',
  '.github/copilot-instructions.md'
]);

/** Return true if the given relative file path is a human instruction file (gets minimal block). */
function isInstructionFile(relativeFile: string): boolean {
  const normalized = relativeFile.replace(/\\/g, '/');
  return instructionFileNames.has(normalized);
}

function isOpencodeConfigFile(relativeFile: string): boolean {
  const normalized = normalizePath(relativeFile);
  return normalized === OPENCODE_JSON
    || normalized === OPENCODE_JSONC
    || normalized.endsWith(`/${OPENCODE_JSON}`)
    || normalized.endsWith(`/${OPENCODE_JSONC}`);
}

async function resolveOpencodeConfigPath(file: string): Promise<string> {
  const normalized = normalizePath(file);
  if (!isOpencodeConfigFile(normalized)) return file;
  const baseFile = normalized.endsWith(`/${OPENCODE_JSONC}`) || normalized === OPENCODE_JSONC
    ? file.slice(0, -'.jsonc'.length)
    : normalized.endsWith(`/${OPENCODE_JSON}`) || normalized === OPENCODE_JSON
      ? file.slice(0, -'.json'.length)
      : '';
  if (!baseFile) return file;
  const jsoncFile = `${baseFile}.jsonc`;
  const jsonFile = `${baseFile}.json`;
  if (await exists(jsoncFile)) return jsoncFile;
  if (await exists(jsonFile)) return jsonFile;
  return file;
}

async function resolveWorkspaceRelativeFile(cwd: string, relativeFile: string): Promise<string> {
  if (!isOpencodeConfigFile(relativeFile)) return relativeFile;
  const resolved = await resolveOpencodeConfigPath(path.join(cwd, OPENCODE_JSON));
  return path.relative(cwd, resolved) || OPENCODE_JSON;
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

function renderInstructionBlock(target: SkillsetTarget, relativeFile: string, guidePath: string): string {
  if (target === 'cursor' && relativeFile === '.cursor/rules/engram.mdc') {
    return renderCursorRule(guidePath);
  }
  if (target === 'windsurf' && relativeFile === '.windsurf/rules/engram.md') {
    return renderWindsurfRule(guidePath);
  }
  return renderMinimalInstructionBlock(guidePath);
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
  const preferOpenCodeGuide = names.some((item) => item.name === 'opencode');
  for (const { name, label } of names) {
    const files = target === 'all' ? targets[name] : [...targets[name], ...workspaceMcpFilesForTarget(name)];
    for (const relativeFile of files) {
      const resolvedRelativeFile = await resolveWorkspaceRelativeFile(cwd, relativeFile);
      if (plannedFiles.has(resolvedRelativeFile)) continue;
      plannedFiles.add(resolvedRelativeFile);
      const file = path.join(cwd, resolvedRelativeFile);
      if (isInstructionFile(resolvedRelativeFile)) {
        // Minimal block path: upsert managed block, write companion guide
        const guidePath = resolvedRelativeFile === 'AGENTS.md' && name === 'agents-md' && preferOpenCodeGuide
          ? '.opencode/engram.md'
          : workspaceGuideFileForTarget(name);
        const effectiveGuidePath = guidePath ?? '.agents/engram.md';
        const block = renderInstructionBlock(name, resolvedRelativeFile, effectiveGuidePath);
        // For cursor .mdc and windsurf .md: the block includes frontmatter, so write it directly
        const isFrontmatterFile = (name === 'cursor' && resolvedRelativeFile === '.cursor/rules/engram.mdc') || (name === 'windsurf' && resolvedRelativeFile === '.windsurf/rules/engram.md');
        const existing = await readText(file);
        if (existing && !force && !isGenerated(existing, resolvedRelativeFile)) {
          if (isFrontmatterFile) {
            // Human-authored frontmatter file: ensure required frontmatter and append managed block
            const { text: mergedFrontmatter, changed: frontmatterChanged } = ensureRequiredFrontmatter(existing, name);
            const base = frontmatterChanged ? mergedFrontmatter : existing;
            const { text, action } = upsertWorkspaceManagedBlock(base, renderMinimalInstructionBlock(effectiveGuidePath));
            await ensureDir(path.dirname(file));
            await writeText(file, text);
            results.push({ target: label, file: resolvedRelativeFile, action: frontmatterChanged ? 'updated' : action, reason: frontmatterChanged ? 'merged required frontmatter (alwaysApply/trigger) into human file' : undefined });
          } else {
            const { text, action } = upsertWorkspaceManagedBlock(existing, block);
            await ensureDir(path.dirname(file));
            await writeText(file, text);
            results.push({ target: label, file: resolvedRelativeFile, action });
          }
        } else if (!existing) {
          await ensureDir(path.dirname(file));
          await writeText(file, isFrontmatterFile ? block : `${block}\n`);
          results.push({ target: label, file: resolvedRelativeFile, action: 'written' });
        } else {
          // Existing generated or forced: upsert block (replaces legacy full content)
          const { text, action } = isFrontmatterFile
            ? { text: block, action: 'written' as InstallAction }
            : upsertWorkspaceManagedBlock(existing, block);
          await ensureDir(path.dirname(file));
          await writeText(file, text);
          results.push({ target: label, file: resolvedRelativeFile, action });
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
        // Non-instruction file
        if (isOpencodeConfigFile(resolvedRelativeFile)) {
          const existing = await readText(file);
          const incoming = renderSkillsetFile('opencode', resolvedRelativeFile, config.read, 'compact');
          if (existing) {
            const merged = mergeOpencodeMcp(existing, incoming, { replaceExisting: force });
            if (merged) {
              await ensureDir(path.dirname(file));
              await writeText(file, merged);
              results.push({ target: label, file: resolvedRelativeFile, action: 'updated' });
              continue;
            }
            results.push({
              target: label,
              file: resolvedRelativeFile,
              action: 'skipped',
              reason: force
                ? 'could not merge existing OpenCode config'
                : hasEngramOpenCodeConfig(existing)
                  ? 'engram MCP entry already present'
                  : 'human-authored file exists; use --force to replace'
            });
            continue;
          } else {
            await ensureDir(path.dirname(file));
            await writeText(file, incoming);
            results.push({ target: label, file: resolvedRelativeFile, action: 'written' });
            continue;
          }
        }
        if (isCursorMcpFile(resolvedRelativeFile)) {
          const existing = await readText(file);
          const incoming = renderSkillsetFile('mcp', resolvedRelativeFile, config.read, 'compact');
          if (existing) {
            const merged = mergeMcpJson(existing, incoming, { replaceExisting: force });
            if (merged) {
              await ensureDir(path.dirname(file));
              await writeText(file, merged);
              results.push({ target: label, file: resolvedRelativeFile, action: 'updated' });
            } else {
              results.push({ target: label, file: resolvedRelativeFile, action: 'skipped', reason: force ? 'could not merge existing MCP config' : 'engram MCP entry already present' });
            }
          } else {
            await ensureDir(path.dirname(file));
            await writeText(file, incoming);
            results.push({ target: label, file: resolvedRelativeFile, action: 'written' });
          }
          continue;
        }
        const existing = await readText(file);
        if (existing && !force && !isGenerated(existing, resolvedRelativeFile)) {
          results.push({ target: label, file: resolvedRelativeFile, action: 'skipped' });
          continue;
        }
        await ensureDir(path.dirname(file));
        const renderTarget = renderTargetForFile(name, resolvedRelativeFile);
        const profile = instructionProfileForTarget(renderTarget, label);
        await writeText(file, renderSkillsetFile(renderTarget, resolvedRelativeFile, config.read, profile));
        results.push({ target: label, file: resolvedRelativeFile, action: 'written' });
      }
    }
  }
  return results;
}

/** Refresh only existing Engram-generated workspace adapter files. */
export async function overwriteLinkedWorkspaceSkillsets(cwd: string, options: { plan?: boolean } = {}): Promise<InstallResult[]> {
  const linkedTargets = await detectLinkedWorkspaceTargets(cwd);
  if (!linkedTargets.length) return [];
  if (options.plan) return planLinkedWorkspaceSkillsets(linkedTargets);
  const results: InstallResult[] = [];
  for (const target of linkedTargets) results.push(...await installSkillset(cwd, target, true));
  return dedupeInstallResults(results);
}

export async function detectLinkedWorkspaceTargets(cwd: string): Promise<SkillsetTarget[]> {
  const linked: SkillsetTarget[] = [];
  for (const name of Object.keys(targets) as SkillsetTarget[]) {
    if (await workspaceTargetIsLinked(cwd, name)) linked.push(name);
  }
  return linked;
}

async function workspaceTargetIsLinked(cwd: string, target: SkillsetTarget): Promise<boolean> {
  for (const relativeFile of workspaceDetectionFilesForTarget(target)) {
    const existing = await readText(path.join(cwd, relativeFile));
    if (!existing) continue;
    if (isLinkedWorkspaceArtifact(relativeFile, existing)) return true;
  }
  return false;
}

function planLinkedWorkspaceSkillsets(linkedTargets: SkillsetTarget[]): InstallResult[] {
  const results: InstallResult[] = [];
  const seen = new Set<string>();
  for (const target of linkedTargets) {
    for (const relativeFile of workspaceInstallFilesForTarget(target)) {
      const key = `${target}\u0000${relativeFile}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({ target, file: relativeFile, action: 'planned' });
    }
  }
  return results;
}

function workspaceInstallFilesForTarget(target: SkillsetTarget): string[] {
  const guidePath = workspaceGuideFileForTarget(target);
  return [...targets[target], ...workspaceMcpFilesForTarget(target), ...(guidePath ? [guidePath] : [])];
}

function workspaceDetectionFilesForTarget(target: SkillsetTarget): string[] {
  const files = workspaceInstallFilesForTarget(target);
  if (target === 'opencode') {
    return [...new Set([
      ...files.filter((file) => normalizePath(file) !== 'AGENTS.md' && !isOpencodeConfigFile(file)),
      OPENCODE_JSON,
      OPENCODE_JSONC
    ])];
  }
  return files;
}

function isLinkedWorkspaceArtifact(relativeFile: string, existing: string): boolean {
  const normalized = normalizePath(relativeFile);
  if (normalized === '.mcp.json' || normalized === '.cursor/mcp.json') return hasEngramMcpConfig(existing);
  if (normalized === OPENCODE_JSON || normalized === OPENCODE_JSONC) return hasEngramOpenCodeConfig(existing);
  return isGenerated(existing, relativeFile);
}

function hasEngramMcpConfig(existing: string): boolean {
  try {
    const parsed = parseJsonLike<Record<string, any>>(existing);
    return Boolean(parsed?.mcpServers?.engram);
  } catch {
    return false;
  }
}

function hasEngramOpenCodeConfig(existing: string): boolean {
  try {
    const parsed = parseJsonLike<Record<string, any>>(existing);
    return Boolean(parsed?.mcp?.engram) || (Array.isArray(parsed?.instructions) && parsed.instructions.includes('.opencode/engram.md'));
  } catch {
    return false;
  }
}

function dedupeInstallResults(results: InstallResult[]): InstallResult[] {
  const out: InstallResult[] = [];
  const seen = new Set<string>();
  for (const result of results) {
    const key = `${result.target}\u0000${normalizePath(result.file)}\u0000${result.action}\u0000${result.reason ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(result);
  }
  return out;
}

export async function refreshGeneratedWorkspaceSkillsets(cwd: string, options: { plan?: boolean } = {}): Promise<InstallResult[]> {
  const config = await loadConfig(cwd);
  const results: InstallResult[] = [];
  const handledGuideFiles = new Set<string>();
  for (const name of Object.keys(targets) as SkillsetTarget[]) {
    for (const relativeFile of targets[name]) {
      const resolvedRelativeFile = await resolveWorkspaceRelativeFile(cwd, relativeFile);
      const file = path.join(cwd, resolvedRelativeFile);
      const existing = await readText(file);
      if (!existing) continue;
      if (name === 'opencode' && isOpencodeConfigFile(resolvedRelativeFile)) {
        try {
          const parsed = parseJsonLike<Record<string, any>>(existing);
          const hasLegacyInstruction = Array.isArray(parsed.instructions) && parsed.instructions.includes('.opencode/engram.md');
          if (!parsed.mcp?.engram && !hasLegacyInstruction) continue;
          const next = renderSkillsetFile(name, resolvedRelativeFile, config.read, 'compact');
          const merged = mergeOpencodeMcp(existing, next, { replaceExisting: true });
          if (merged && merged !== existing) {
            if (options.plan) {
              results.push({ target: name, file: resolvedRelativeFile, action: 'planned' });
            } else {
              await writeText(file, merged);
              results.push({ target: name, file: resolvedRelativeFile, action: 'updated' });
            }
          }
        } catch { /* not valid JSON, skip */ }
        continue;
      }
      if (name === 'cursor' && isCursorMcpFile(resolvedRelativeFile)) {
        try {
          const parsed = parseJsonLike<Record<string, any>>(existing);
          if (!parsed.mcpServers?.engram) continue;
          const next = renderSkillsetFile('mcp', resolvedRelativeFile, config.read, 'compact');
          const merged = mergeMcpJson(existing, next, { replaceExisting: true });
          if (merged && merged !== existing) {
            if (options.plan) {
              results.push({ target: name, file: resolvedRelativeFile, action: 'planned' });
            } else {
              await writeText(file, merged);
              results.push({ target: name, file: resolvedRelativeFile, action: 'updated' });
            }
          }
        } catch { /* not valid JSON, skip */ }
        continue;
      }
      if (!isGenerated(existing, resolvedRelativeFile)) continue;

      if (isInstructionFile(resolvedRelativeFile)) {
        // Handle instruction file: migrate to minimal block or refresh block
        const guidePath = workspaceGuideFileForTarget(name);
        const effectiveGuidePath = guidePath ?? '.agents/engram.md';
        const block = renderMinimalInstructionBlock(effectiveGuidePath);
        const { text: nextText, action: blockAction } = upsertWorkspaceManagedBlock(existing, block);
        const normalizedNext = nextText.endsWith('\n') ? nextText : `${nextText}\n`;

        if (existing !== normalizedNext) {
          if (options.plan) {
            results.push({ target: name, file: resolvedRelativeFile, action: 'planned' });
          } else {
            await writeText(file, normalizedNext);
            results.push({ target: name, file: resolvedRelativeFile, action: blockAction === 'written' ? 'updated' : 'updated' });
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
        const profile = await instructionProfileForWorkspaceRefresh(cwd, name, resolvedRelativeFile, existing);
        const next = renderSkillsetFile(name, resolvedRelativeFile, config.read, profile);
        const normalized = next.endsWith('\n') ? next : `${next}\n`;
        if (existing === normalized) continue;
        if (options.plan) {
          results.push({ target: name, file: resolvedRelativeFile, action: 'planned' });
          continue;
        }
        await writeText(file, normalized);
        results.push({ target: name, file: resolvedRelativeFile, action: 'updated' });
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
  for (const rawPlan of plans) {
    const resolvedFile = await resolveOpencodeConfigPath(rawPlan.file);
    const plan = resolvedFile === rawPlan.file ? rawPlan : { ...rawPlan, file: resolvedFile };
    if (plan.reason || !plan.mode) {
      results.push({ target: plan.label, file: plan.file, action: 'skipped', reason: plan.reason ?? 'global install is not supported for this target yet' });
      continue;
    }
    if (!plan.renderTarget && !plan.file.endsWith('plugin.json') && !plan.file.endsWith('hooks.json') && !plan.file.endsWith('global_rules.md')) {
      results.push({ target: plan.label, file: plan.file, action: 'skipped', reason: plan.reason ?? 'global install is not supported for this target yet' });
      continue;
    }
    const rt = plan.renderTarget === 'gemini-hook' ? plan.name : (plan.renderTarget ?? plan.name);
    const profile = instructionProfileForTarget(rt, plan.label);
    let content = renderGlobalInstallContent(plan, config.read, profile);
    const isWindsurfGlobalRules = plan.file.endsWith('global_rules.md');
    if (plan.mode === 'block') {
      content = renderMinimalInstructionBlock(globalGuidePathForPlan(plan));
    }
    if (isWindsurfGlobalRules) {
      content = renderWindsurfGlobalRulesBlock();
    }
    if (options.plan) {
      results.push({ target: plan.label, file: plan.file, action: 'planned', mode: plan.mode, hash: sha256(content) });
      continue;
    }
    const existing = await readText(plan.file);
    if (plan.mode === 'file' && existing && !options.force && !isGenerated(existing, plan.file)) {
      if (plan.renderTarget === 'opencode' && isOpencodeConfigFile(plan.file)) {
        const merged = mergeOpencodeMcp(existing, content);
        if (merged) {
          await writeText(plan.file, merged);
          results.push({ target: plan.label, file: plan.file, action: 'updated', mode: plan.mode, hash: sha256(merged) });
          continue;
        }
      }
      if (plan.renderTarget === 'mcp' && (plan.file.endsWith('mcp.json') || plan.file.endsWith('mcp_config.json'))) {
        const merged = mergeMcpJson(existing, content);
        if (merged) {
          await writeText(plan.file, merged);
          results.push({ target: plan.label, file: plan.file, action: 'updated', mode: plan.mode, hash: sha256(merged) });
          continue;
        }
        results.push({ target: plan.label, file: plan.file, action: 'skipped', mode: plan.mode, reason: 'engram MCP entry already present' });
        continue;
      }
      if (plan.renderTarget === 'gemini-hook' && plan.file.endsWith('hooks.json')) {
        const merged = mergeGeminiHookConfig(existing, content);
        if (merged) {
          await writeText(plan.file, merged);
          results.push({ target: plan.label, file: plan.file, action: 'updated', mode: plan.mode, hash: sha256(merged) });
          continue;
        }
        results.push({ target: plan.label, file: plan.file, action: 'skipped', mode: plan.mode, reason: 'engram hook entry already present' });
        continue;
      }
      if (isWindsurfGlobalRules) {
        const { text, action } = upsertWorkspaceManagedBlock(existing, content);
        await writeText(plan.file, text);
        results.push({ target: plan.label, file: plan.file, action, mode: plan.mode, hash: sha256(text) });
        continue;
      }
      results.push({ target: plan.label, file: plan.file, action: 'skipped', mode: plan.mode, reason: 'human-authored file exists; re-run with --force to replace' });
      continue;
    }
    if (plan.mode === 'file' && existing && plan.renderTarget === 'opencode' && isOpencodeConfigFile(plan.file)) {
      const merged = mergeOpencodeMcp(existing, content, { replaceExisting: true });
      if (merged) {
        await writeText(plan.file, merged);
        results.push({ target: plan.label, file: plan.file, action: 'updated', mode: plan.mode, hash: sha256(merged) });
        continue;
      }
      results.push({ target: plan.label, file: plan.file, action: 'skipped', mode: plan.mode, reason: 'could not merge existing OpenCode config' });
      continue;
    }
    if (plan.mode === 'file' && existing && plan.renderTarget === 'mcp' && (plan.file.endsWith('mcp.json') || plan.file.endsWith('mcp_config.json'))) {
      const merged = mergeMcpJson(existing, content, { replaceExisting: true });
      if (merged) {
        await writeText(plan.file, merged);
        results.push({ target: plan.label, file: plan.file, action: 'updated', mode: plan.mode, hash: sha256(merged) });
        continue;
      }
      results.push({ target: plan.label, file: plan.file, action: 'skipped', mode: plan.mode, reason: 'could not merge existing MCP config' });
      continue;
    }
    if (plan.mode === 'file' && existing && plan.renderTarget === 'gemini-hook' && plan.file.endsWith('hooks.json')) {
      const merged = mergeGeminiHookConfig(existing, content, { replaceExisting: true });
      if (merged) {
        await writeText(plan.file, merged);
        results.push({ target: plan.label, file: plan.file, action: 'updated', mode: plan.mode, hash: sha256(merged) });
        continue;
      }
      results.push({ target: plan.label, file: plan.file, action: 'skipped', mode: plan.mode, reason: 'could not merge existing gemini hooks config' });
      continue;
    }
    const next = plan.mode === 'block' || isWindsurfGlobalRules
      ? upsertWorkspaceManagedBlock(existing.includes(GLOBAL_BEGIN) ? removeManagedBlock(existing) : existing, content)
      : !existing || isGenerated(existing, plan.file) || options.force
        ? { text: content, action: existing ? 'updated' as InstallAction : 'written' as InstallAction }
        : { text: content, action: 'written' as InstallAction };
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

export function globalInstallPlans(target: string, home = globalAgentHome()): GlobalInstallPlan[] {
  const resolvedTargets = resolveLinkTargets(target);
  return resolvedTargets.flatMap((item) => [
    ...globalFilesForTarget(item, home),
    ...(target === 'all' || target === 'all-supported' ? [] : globalConfigFilesForTarget(item, home))
  ]);
}

function globalFilesForTarget(target: ResolvedTarget, home: string): GlobalInstallPlan[] {
  const configHome = globalAgentConfigHome(home);
  const opencodeHome = globalOpenCodeConfigHome(home);
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
      return [
        plan(path.join(home, '.cursor', 'plugins', 'local', 'engram', '.cursor-plugin', 'plugin.json'), 'file'),
        plan(path.join(home, '.cursor', 'plugins', 'local', 'engram', 'rules', 'engram.mdc'), 'file', 'cursor'),
        plan(path.join(home, '.cursor', 'plugins', 'local', 'engram', 'skills', 'engram', 'SKILL.md'), 'file', 'agent-skill'),
        plan(path.join(home, '.cursor', 'plugins', 'local', 'engram', 'commands', 'engram.md'), 'file', 'slash'),
        plan(path.join(home, '.cursor', 'plugins', 'local', 'engram', 'mcp.json'), 'file', 'mcp'),
        plan(path.join(home, '.cursor', 'plugins', 'local', 'engram', 'hooks', 'hooks.json'), 'file')
      ];
    case 'gemini':
      return [
        plan(path.join(home, '.gemini', 'GEMINI.md'), 'block'),
        plan(path.join(home, '.gemini', 'skills', 'engram', 'SKILL.md'), 'file', 'agent-skill'),
        plan(path.join(home, '.agents', 'engram.md'), 'file')
      ];
    case 'cline':
      return [plan(path.join(home, 'Documents', 'Cline', 'Rules', 'engram.md'), 'file')];
    case 'windsurf':
      return [
        plan(path.join(home, '.codeium', 'windsurf', 'memories', 'global_rules.md'), 'file', 'windsurf'),
        plan(path.join(home, '.codeium', 'windsurf', 'mcp_config.json'), 'file', 'mcp'),
        plan(path.join(home, '.codeium', 'windsurf', 'hooks.json'), 'file', 'windsurf')
      ];
    case 'agent-skill':
      return [plan(path.join(home, '.agents', 'skills', 'engram', 'SKILL.md'), 'file')];
    case 'antigravity':
      return [
        plan(path.join(home, '.gemini', 'antigravity', 'skills', 'engram', 'SKILL.md'), 'file'),
        plan(path.join(home, '.gemini', 'skills', 'engram', 'SKILL.md'), 'file', 'agent-skill')
      ];
    case 'opencode':
      return [
        plan(path.join(opencodeHome, 'AGENTS.md'), 'block', 'agents-md'),
        plan(path.join(opencodeHome, 'skills', 'engram', 'SKILL.md'), 'file', 'agent-skill'),
        plan(path.join(opencodeHome, 'engram.md'), 'file', 'agents-md')
      ];
    case 'mcp':
      return [plan(path.join(home, '.claude', 'mcp.json'), 'file', 'mcp'), plan(path.join(configHome, 'gemini', 'mcp.json'), 'file', 'mcp')];
    case 'slash':
      return [
        plan(path.join(home, '.claude', 'commands', 'engram.md'), 'file'),
        plan(path.join(home, '.claude', 'skills', 'engram', 'SKILL.md'), 'file'),
        plan(path.join(home, '.gemini', 'commands', 'engram.toml'), 'file'),
        plan(path.join(opencodeHome, 'commands', 'engram.md'), 'file')
      ];
  }
}

function workspaceMcpFilesForTarget(target: SkillsetTarget): string[] {
  if (target === 'windsurf') return [];
  if (target === 'cursor') return [];
  if (target === 'opencode') return [];
  return target === 'mcp' || target === 'slash' ? [] : targets.mcp;
}

function renderTargetForFile(target: SkillsetTarget, relativeFile: string): SkillsetTarget {
  const normalized = relativeFile.replace(/\\/g, '/');
  if (targets.mcp.includes(normalized)) return 'mcp';
  if (normalized === '.cursor/mcp.json') return 'mcp';
  if (normalized === OPENCODE_JSON || normalized === OPENCODE_JSONC) return 'opencode';
  if (normalized === '.opencode/skills/engram/SKILL.md') return 'agent-skill';
  return target;
}

function isCursorMcpFile(relativeFile: string): boolean { return relativeFile.replace(/\\/g, '/') === '.cursor/mcp.json'; }

function globalConfigFilesForTarget(target: ResolvedTarget, home: string): GlobalInstallPlan[] {
  const configHome = globalAgentConfigHome(home);
  const opencodeHome = globalOpenCodeConfigHome(home);
  const mcpPlan = (file: string): GlobalInstallPlan => ({ ...target, file, mode: 'file', renderTarget: 'mcp' });
  const hookPlan = (file: string): GlobalInstallPlan => ({ ...target, file, mode: 'file', renderTarget: 'gemini-hook' });
  switch (target.name) {
    case 'claude':
      return [mcpPlan(path.join(home, '.claude', 'mcp.json'))];
    case 'cursor':
      return [];
    case 'gemini':
    case 'antigravity':
      return [
        mcpPlan(path.join(home, '.gemini', 'config', 'mcp_config.json')),
        hookPlan(path.join(home, '.gemini', 'config', 'hooks.json'))
      ];
    case 'opencode':
      return [{ ...target, file: path.join(opencodeHome, OPENCODE_JSONC), mode: 'file', renderTarget: 'opencode' }];
    case 'windsurf':
      return [];
    default:
      return [];
  }
}

function renderGlobalInstallContent(plan: GlobalInstallPlan, readMode = 'auto', profile: InstructionProfile = 'compact'): string {
  const normFile = plan.file.replace(/\\/g, '/');
  if (plan.name === 'slash' || plan.renderTarget === 'slash') return renderSkillsetFile('slash', plan.file, readMode);
  if (plan.renderTarget === 'mcp') return renderSkillsetFile('mcp', plan.file, readMode);
  if (plan.renderTarget === 'gemini-hook') return renderGeminiHookConfig();
  if (plan.renderTarget === 'opencode' && /opencode\.jsonc?$/u.test(normFile)) return renderSkillsetFile('opencode', plan.file, readMode);
  if (normFile.endsWith('SKILL.md')) return renderSkillsetFile(plan.renderTarget ?? 'agent-skill', plan.file, readMode);
  if (normFile.endsWith('plugin.json')) return renderCursorPluginJson();
  if (normFile.endsWith('rules/engram.mdc')) return renderCursorRule();
  if (normFile.endsWith('commands/engram.md')) return renderSkillsetFile('slash', plan.file, readMode);
  if (normFile.endsWith('hooks.json')) return '{}\n';
  if (normFile.endsWith('global_rules.md')) return `${renderWindsurfGlobalRulesBlock()}\n`;
  return globalSkillsetMarkdown(readMode, profile);
}

function globalGuidePathForPlan(plan: GlobalInstallPlan): string {
  const normFile = plan.file.replace(/\\/g, '/');
  if (plan.name === 'opencode' && normFile.endsWith('/opencode/AGENTS.md')) {
    return '~/.config/opencode/engram.md';
  }
  return '~/.agents/engram.md';
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
      const resolvedRelativeFile = await resolveWorkspaceRelativeFile(cwd, relativeFile);
      const file = path.join(cwd, resolvedRelativeFile);
      const existing = await readText(file);
      if (!existing) {
        results.push({ target: label, file: resolvedRelativeFile, action: 'skipped', reason: 'file not found' });
        continue;
      }
      if (isInstructionFile(resolvedRelativeFile)) {
        // Minimal block path: remove the block, handle remaining content
        if (hasWorkspaceManagedBlock(existing)) {
          const cleaned = removeWorkspaceManagedBlock(existing).trimEnd();
          if (!cleaned) {
            await fs.rm(file, { force: true });
            results.push({ target: label, file: resolvedRelativeFile, action: 'removed' });
          } else {
            await writeText(file, `${cleaned}\n`);
            results.push({ target: label, file: resolvedRelativeFile, action: 'cleaned' });
          }
        } else if (isGenerated(existing, resolvedRelativeFile) || force) {
          // Legacy generated full content without block, or forced
          await fs.rm(file, { force: true });
          results.push({ target: label, file: resolvedRelativeFile, action: 'removed' });
        } else {
          results.push({ target: label, file: resolvedRelativeFile, action: 'skipped', reason: 'human-authored file; use --force to remove' });
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
        // Non-instruction file: merge-aware unlink
        if (isOpencodeConfigFile(resolvedRelativeFile)) {
          const unmerged = unmergeOpencodeMcp(existing);
          if (unmerged !== null) {
            if (unmerged === '') {
              await fs.rm(file, { force: true });
              results.push({ target: label, file: resolvedRelativeFile, action: 'removed' });
            } else {
              await writeText(file, unmerged);
              results.push({ target: label, file: resolvedRelativeFile, action: 'cleaned' });
            }
            continue;
          }
        }
        if (isCursorMcpFile(resolvedRelativeFile)) {
          const unmerged = unmergeMcpJson(existing);
          if (unmerged !== null) {
            if (unmerged === '') {
              await fs.rm(file, { force: true });
              results.push({ target: label, file: resolvedRelativeFile, action: 'removed' });
            } else {
              await writeText(file, unmerged);
              results.push({ target: label, file: resolvedRelativeFile, action: 'cleaned' });
            }
            continue;
          }
        }
        if (!force && !isGenerated(existing, resolvedRelativeFile)) {
          results.push({ target: label, file: resolvedRelativeFile, action: 'skipped', reason: 'human-authored file; use --force to remove' });
          continue;
        }
        await fs.rm(file, { force: true });
        results.push({ target: label, file: resolvedRelativeFile, action: 'removed' });
      }
    }
  }
  return results;
}

/** Remove one or all global agent adapter files. */
export async function unlinkGlobalSkillset(target = 'all', options: { force?: boolean; home?: string } = {}): Promise<UnlinkResult[]> {
  const registry = await readGlobalSkillsetRegistry();
  const normalizedTarget = normalizeGlobalTarget(target);
  const targetsToRemove = normalizedTarget === 'all' ? Object.keys(registry.installs) : [normalizedTarget];
  const results: UnlinkResult[] = [];
  for (const current of targetsToRemove) {
    const install = registry.installs[current];
    if (!install) {
      results.push({ target: current, file: '<none>', action: 'skipped', reason: 'not registered' });
      continue;
    }
    for (const entry of install.files) {
      const file = await resolveOpencodeConfigPath(entry.path);
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
        if (isOpencodeConfigFile(file)) {
          const unmerged = unmergeOpencodeMcp(existing);
          if (unmerged !== null) {
            if (unmerged === '') {
              await fs.rm(file, { force: true });
              results.push({ target: current, file, action: 'removed' });
            } else {
              await writeText(file, unmerged);
              results.push({ target: current, file, action: 'cleaned' });
            }
            continue;
          }
        }
        if (file.endsWith('global_rules.md')) {
          const cleaned = hasWorkspaceManagedBlock(existing)
            ? removeWorkspaceManagedBlock(existing).trimEnd()
            : existing.trimEnd();
          if (cleaned && cleaned !== existing.trimEnd()) {
            await writeText(file, `${cleaned}\n`);
            results.push({ target: current, file, action: 'cleaned' });
          } else if (!cleaned) {
            await fs.rm(file, { force: true });
            results.push({ target: current, file, action: 'removed' });
          } else {
            results.push({ target: current, file, action: 'skipped', reason: 'no Engram managed block found' });
          }
          continue;
        }
        if (file.endsWith('mcp.json') || file.endsWith('mcp_config.json')) {
          const unmerged = unmergeMcpJson(existing);
          if (unmerged !== null) {
            if (unmerged === '') {
              await fs.rm(file, { force: true });
              results.push({ target: current, file, action: 'removed' });
            } else {
              await writeText(file, unmerged);
              results.push({ target: current, file, action: 'cleaned' });
            }
            continue;
          }
        }
        if (file.endsWith('hooks.json')) {
          try {
            const config = parseJsonLike<Record<string, any>>(existing);
            const host = current === 'cursor' ? 'cursor' as const : current === 'windsurf' ? 'windsurf' as const : undefined;
            const schema = host === 'cursor' ? 'cursor' as const : host === 'windsurf' ? 'windsurf' as const : undefined;
            const events = host === 'cursor' ? ['sessionStart'] : host === 'windsurf' ? ['pre_user_prompt'] : [];
            if (schema && host) {
              const meta = { kind: 'json' as const, host, events, schema, configFile: '', globalFile: () => '', };
              const changed = unmergeManagedHooks(config, meta);
              if (changed) {
                const remaining = Object.keys(config).length;
                if (!remaining) {
                  await fs.rm(file, { force: true });
                  results.push({ target: current, file, action: 'removed' });
                } else {
                  await writeText(file, `${JSON.stringify(config, null, 2)}\n`);
                  results.push({ target: current, file, action: 'cleaned' });
                }
              } else {
                results.push({ target: current, file, action: 'skipped', reason: 'no Engram-managed hook entries found' });
              }
            } else {
              const unmerged = unmergeGeminiHookConfig(existing);
              if (unmerged !== null) {
                if (unmerged === '') {
                  await fs.rm(file, { force: true });
                  results.push({ target: current, file, action: 'removed' });
                } else {
                  await writeText(file, unmerged);
                  results.push({ target: current, file, action: 'cleaned' });
                }
              } else if (isGenerated(existing, file) || options.force) {
                await fs.rm(file, { force: true });
                results.push({ target: current, file, action: 'removed' });
              } else {
                results.push({ target: current, file, action: 'skipped', reason: 'human-authored file; use --force to remove' });
              }
            }
          } catch {
            results.push({ target: current, file, action: 'skipped', reason: 'could not parse hooks.json' });
          }
          continue;
        }
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

function ensureRequiredFrontmatter(content: string, target: SkillsetTarget): { text: string; changed: boolean } {
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) return { text: content, changed: false };
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  let frontmatter = fmMatch[1];
  let changed = false;
  if (target === 'cursor') {
    if (/alwaysApply:\s*true\b/.test(frontmatter)) {
      // already correct
    } else if (/alwaysApply:/.test(frontmatter)) {
      frontmatter = frontmatter.replace(/alwaysApply:\s*\S+/, 'alwaysApply: true');
      changed = true;
    } else {
      frontmatter += `${eol}alwaysApply: true`;
      changed = true;
    }
  }
  if (target === 'windsurf') {
    if (/trigger:\s*always_on\b/.test(frontmatter)) {
      // already correct
    } else if (/trigger:/.test(frontmatter)) {
      frontmatter = frontmatter.replace(/trigger:\s*\S+/, 'trigger: always_on');
      changed = true;
    } else {
      frontmatter += `${eol}trigger: always_on`;
      changed = true;
    }
  }
  if (!changed) return { text: content, changed: false };
  return { text: `---${eol}${frontmatter}${eol}---${content.slice(fmMatch[0].length)}`, changed: true };
}

function normalizePath(file: string): string {
  return file.replace(/\\/g, '/');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function mergeOpencodeMcp(existingJson: string, newJson: string, options: { replaceExisting?: boolean } = {}): string | null {
  try {
    const existing = parseJsonLike<Record<string, any>>(existingJson);
    const incoming = parseJsonLike<Record<string, any>>(newJson);
    if (Array.isArray(existing.instructions)) {
      const nextInstructions = existing.instructions.filter((item: string) => item !== '.opencode/engram.md');
      if (nextInstructions.length) existing.instructions = nextInstructions;
      else delete existing.instructions;
    }
    if (!existing.mcp || typeof existing.mcp !== 'object') {
      existing.mcp = {};
    }
    if (existing.mcp.engram && !options.replaceExisting) return null;
    existing.mcp.engram = incoming.mcp.engram;
    return `${JSON.stringify(existing, null, 2)}\n`;
  } catch {
    return null;
  }
}

function unmergeOpencodeMcp(existingJson: string): string | null {
  try {
    const existing = parseJsonLike<Record<string, any>>(existingJson);
    if (!existing.mcp || !existing.mcp.engram) return null;
    delete existing.mcp.engram;
    if (!Object.keys(existing.mcp).length) delete existing.mcp;
    const instructions = Array.isArray(existing.instructions) ? existing.instructions.filter((i: string) => i !== '.opencode/engram.md') : existing.instructions;
    if (instructions && !instructions.length) delete existing.instructions;
    else if (instructions) existing.instructions = instructions;
    const remaining = Object.keys(existing).filter((k) => k !== '$schema');
    if (!remaining.length) return '';
    return `${JSON.stringify(existing, null, 2)}\n`;
  } catch {
    return null;
  }
}


