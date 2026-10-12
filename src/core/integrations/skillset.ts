/** Agent-host adapter files that let Engram behave as a portable skillset. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { VERSION } from '../runtime/constants.js';
import { loadConfig, userConfigDir } from '../runtime/config.js';
import { sha256 } from '../safety/hash.js';
import { ensureDir, exists, parseJsonLike, readJson, readText, writeJson, writeText } from '../system/fsx.js';
import {
  globalSkillsetMarkdown,
  WORKSPACE_BEGIN,
  WORKSPACE_END,
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
import type { InstructionProfile, RenderOptions } from './skillset-render.js';
import { globalAgentHome, globalAgentConfigHome, globalOpenCodeConfigHome } from './agent-paths.js';
import { resolveAllTargets, allSupportedTargets } from './agent-detect.js';
import { detectInstalledHookTargets, unmergeManagedHooks, type AgentHookHost } from './agent-hooks.js';
import { claudeUserMcpHint, hasCodexMcpBlock, hasUnmanagedCodexEngramTable, removeCodexMcpBlock, renderCodexMcpBlock, upsertCodexMcpBlock } from './mcp-config.js';
import { CLAUDE_BLOCK_KEPT, CLAUDE_GUIDE, CLAUDE_PROJECT_FILES, CLAUDE_UPGRADE_DETECTION_FILES, claudeBootstrapFiles } from './claude-bootstrap.js';

export type SkillsetTarget =
  | 'agents-md' | 'copilot' | 'claude' | 'cursor' | 'gemini'
  | 'cline' | 'windsurf' | 'agent-skill' | 'antigravity' | 'opencode' | 'mcp' | 'slash';
export type InstallAction = 'written' | 'updated' | 'skipped' | 'planned';
export type InstallResult = { target: string; file: string; action: InstallAction; mode?: GlobalInstallMode; reason?: string; hash?: string };
export type SkillsetUpgradePreview = { target: string; file: string; mode?: GlobalInstallMode; renderTarget?: RenderTargetName; current: string; expected: string; latest?: string; safe: boolean; userEditsPreserved: boolean; reason?: string; installedVersion?: string };
export type UnlinkResult = { target: string; file: string; action: 'removed' | 'cleaned' | 'skipped'; reason?: string };
export type GlobalInstallMode = 'block' | 'file';

type RenderTargetName = SkillsetTarget | 'gemini-hook' | 'codex-mcp';
type ResolvedTarget = { name: SkillsetTarget; label: string };
type GlobalInstallPlan = ResolvedTarget & { file: string; mode?: GlobalInstallMode; renderTarget?: RenderTargetName; reason?: string };
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

/** Hook hosts whose installed hooks inject context for readers of a full workspace guide file. */
const guideHookHosts: Record<string, AgentHookHost[]> = {
  '.agents/engram.md': ['codex', 'claude'],
  '.claude/engram.md': ['claude'],
  '.cursor/engram.md': ['cursor'],
  '.gemini/engram.md': ['gemini'],
  '.windsurf/engram.md': ['windsurf'],
  '.opencode/engram.md': ['opencode'],
  '.antigravityrules': ['gemini']
};

/** Options for link installs; `hookHosts` names hosts whose hooks the caller installs alongside these files. */
export type SkillsetInstallOptions = { hookHosts?: AgentHookHost[] };

/** Hosts whose Engram hooks inject context (installed or about to be); manual/off read modes disable hook injection. */
async function activeHookHosts(readMode: string, options: { cwd?: string; global?: boolean }, pending: AgentHookHost[] = []): Promise<Set<AgentHookHost>> {
  if (readMode === 'manual' || readMode === 'off') return new Set();
  return new Set([...pending, ...await detectInstalledHookTargets({ ...options, includeStale: true })]);
}

function guideHasHooks(file: string, hookHosts: Set<AgentHookHost>): boolean {
  return Boolean(guideHookHosts[normalizePath(file)]?.some((host) => hookHosts.has(host)));
}

/** `.agents/engram.md` is shared with hookless readers (Copilot, Cline, generic AGENTS.md), so its hook wording hedges. */
const SHARED_WORKSPACE_GUIDE = '.agents/engram.md';

function guideRenderOptions(file: string, hookHosts: Set<AgentHookHost>): RenderOptions {
  return { hooks: guideHasHooks(file, hookHosts), sharedGuide: normalizePath(file) === SHARED_WORKSPACE_GUIDE };
}

/** Guide referenced by an instruction block; AGENTS.md is shared, so every target renders the same block (upgrade compares them). */
function instructionGuidePath(target: SkillsetTarget, relativeFile: string, preferOpenCode: boolean): string {
  if (normalizePath(relativeFile) === 'AGENTS.md') return preferOpenCode || target === 'opencode' ? '.opencode/engram.md' : SHARED_WORKSPACE_GUIDE;
  return workspaceGuideFileForTarget(target) ?? SHARED_WORKSPACE_GUIDE;
}

const OPENCODE_POINTER = 'Full guide: `.opencode/engram.md`';

/** True when an AGENTS.md managed block already points at the OpenCode guide (OpenCode owns that pointer). */
function textUsesOpenCodeGuide(agentsMd: string): boolean {
  return hasWorkspaceManagedBlock(agentsMd) && agentsMd.includes(OPENCODE_POINTER);
}

/** Guide files a target's install writes or upgrade previews; Claude also writes the shared guide its AGENTS.md pointer needs. */
function workspaceGuideFilesForTarget(target: SkillsetTarget): string[] {
  if (target === 'claude') return [CLAUDE_GUIDE, SHARED_WORKSPACE_GUIDE];
  const guide = workspaceGuideFileForTarget(target);
  return guide ? [guide] : [];
}

/** MCP configs read by Claude Code; only these benefit from anthropic/alwaysLoad (other hosts ignore the key). */
const CLAUDE_MCP_FILES = new Set(['.mcp.json']);

/** E5: hookless Claude installs ask the host to load engram_load upfront; hooks already inject context. */
function mcpRenderOptions(relativeFile: string, hookHosts: Set<AgentHookHost>): RenderOptions {
  return { alwaysLoad: CLAUDE_MCP_FILES.has(normalizePath(relativeFile)) && !hookHosts.has('claude') };
}

/** Skills point at their install's canonical guide; full instruction files get hook-aware load wording. */
function workspaceRenderOptions(target: SkillsetTarget, relativeFile: string, hookHosts: Set<AgentHookHost>): RenderOptions {
  const normalized = normalizePath(relativeFile);
  if (target === 'mcp') return mcpRenderOptions(normalized, hookHosts);
  if (target === 'agent-skill' && normalized === '.agents/skills/engram/SKILL.md') return { guidePath: '.agents/engram.md' };
  if (target === 'agent-skill' && normalized === '.opencode/skills/engram/SKILL.md') return { guidePath: '.opencode/engram.md' };
  if (target === 'antigravity' && normalized.endsWith('SKILL.md')) return { guidePath: '.antigravityrules' };
  return { hooks: guideHasHooks(normalized, hookHosts) };
}

const OPENCODE_JSON = 'opencode.json';
const OPENCODE_JSONC = 'opencode.jsonc';

/** Instruction files: files that should receive the minimal block instead of full content. */
const instructionFileNames = new Set([
  'AGENTS.md',
  'CLAUDE.md',
  '.claude/CLAUDE.md',
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
export async function installSkillset(cwd: string, target = 'all', force = false, options: SkillsetInstallOptions = {}): Promise<InstallResult[]> {
  const config = await loadConfig(cwd);
  const hookHosts = await activeHookHosts(config.read, { cwd }, options.hookHosts);
  const names = resolveLinkTargets(target);
  const results: InstallResult[] = [];
  const plannedFiles = new Set<string>();
  const plannedGuideFiles = new Set<string>();
  const preferOpenCodeGuide = names.some((item) => item.name === 'opencode')
    || (names.some((item) => item.name === 'claude') && textUsesOpenCodeGuide(await readText(path.join(cwd, 'AGENTS.md'))));
  const writeCompanionGuide = async (label: string, guidePath: string): Promise<void> => {
    if (plannedGuideFiles.has(guidePath)) return;
    plannedGuideFiles.add(guidePath);
    const guideFile = path.join(cwd, guidePath);
    const existingGuide = await readText(guideFile);
    if (!existingGuide || isGenerated(existingGuide, guidePath) || force) {
      await ensureDir(path.dirname(guideFile));
      await writeText(guideFile, renderAgentGuide(config.read, guideRenderOptions(guidePath, hookHosts)));
      results.push({ target: label, file: guidePath, action: existingGuide ? 'updated' : 'written' });
    } else {
      results.push({ target: label, file: guidePath, action: 'skipped', reason: 'human-authored file; use --force to replace' });
    }
  };
  for (const { name, label } of names) {
    const { files, notes } = await workspaceFilesToInstall(cwd, name, target === 'all');
    results.push(...notes.map((note) => ({ target: label, file: note.file, action: 'skipped' as InstallAction, reason: note.reason })));
    for (const relativeFile of files) {
      const resolvedRelativeFile = await resolveWorkspaceRelativeFile(cwd, relativeFile);
      if (plannedFiles.has(resolvedRelativeFile)) continue;
      plannedFiles.add(resolvedRelativeFile);
      const file = path.join(cwd, resolvedRelativeFile);
      if (isInstructionFile(resolvedRelativeFile)) {
        // Minimal block path: upsert managed block, write companion guide
        const guidePath = instructionGuidePath(name, resolvedRelativeFile, preferOpenCodeGuide);
        const effectiveGuidePath = guidePath;
        const keptReason = name === 'claude' && CLAUDE_PROJECT_FILES.includes(normalizePath(resolvedRelativeFile)) ? CLAUDE_BLOCK_KEPT : undefined;
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
            results.push({ target: label, file: resolvedRelativeFile, action, reason: keptReason });
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
          results.push({ target: label, file: resolvedRelativeFile, action, reason: keptReason });
        }
        // Write companion guide file
        await writeCompanionGuide(label, guidePath);
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
        if (isMergedMcpFile(resolvedRelativeFile)) {
          const existing = await readText(file);
          const incoming = renderSkillsetFile('mcp', resolvedRelativeFile, config.read, 'compact', mcpRenderOptions(resolvedRelativeFile, hookHosts));
          if (existing) {
            const merged = mergeMcpJson(existing, incoming, { replaceExisting: force });
            if (merged) {
              await ensureDir(path.dirname(file));
              await writeText(file, merged);
              results.push({ target: label, file: resolvedRelativeFile, action: 'updated' });
            } else {
              results.push({ target: label, file: resolvedRelativeFile, action: 'skipped', reason: mcpMergeSkipReason(existing, force) });
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
        await writeText(file, renderSkillsetFile(renderTarget, resolvedRelativeFile, config.read, profile, workspaceRenderOptions(renderTarget, resolvedRelativeFile, hookHosts)));
        results.push({ target: label, file: resolvedRelativeFile, action: 'written' });
      }
    }
    // Claude's own guide is its detection file and the slash skill's guide, so it is written even without a CLAUDE.md.
    if (name === 'claude') await writeCompanionGuide(label, CLAUDE_GUIDE);
  }
  return results;
}

/** Refresh only existing Engram-generated workspace adapter files. */
export async function overwriteLinkedWorkspaceSkillsets(cwd: string, options: { plan?: boolean } = {}): Promise<InstallResult[]> {
  const linkedTargets = await detectLinkedWorkspaceTargets(cwd);
  if (!linkedTargets.length) return [];
  if (options.plan) return planLinkedWorkspaceSkillsets(cwd, linkedTargets);
  const results: InstallResult[] = [];
  for (const target of linkedTargets) results.push(...await installSkillset(cwd, target, true));
  return dedupeInstallResults(results);
}

/** Preview exact workspace skillset rewrites without touching durable files. */
export async function previewLinkedWorkspaceSkillsets(cwd: string): Promise<SkillsetUpgradePreview[]> {
  const config = await loadConfig(cwd);
  const hookHosts = await activeHookHosts(config.read, { cwd });
  const linkedTargets = await detectUpgradeWorkspaceTargets(cwd);
  const previews: SkillsetUpgradePreview[] = [];
  const seen = new Set<string>();
  for (const target of linkedTargets) {
    for (const requestedFile of await workspaceInstallFilesForTarget(cwd, target)) {
      const relativeFile = await resolveWorkspaceRelativeFile(cwd, requestedFile);
      const key = `${target} ${normalizePath(relativeFile)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const file = path.join(cwd, relativeFile);
      const current = await readText(file);
      if (isInstructionFile(relativeFile)) {
        const guidePath = instructionGuidePath(target, relativeFile, target === 'claude' && textUsesOpenCodeGuide(await readText(path.join(cwd, 'AGENTS.md'))));
        const block = renderInstructionBlock(target, relativeFile, guidePath);
        const isFrontmatterFile = (target === 'cursor' && relativeFile === '.cursor/rules/engram.mdc')
          || (target === 'windsurf' && relativeFile === '.windsurf/rules/engram.md');
        let expected = '';
        if (!current) {
          expected = isFrontmatterFile ? block : `${block}
`;
        } else if (isFrontmatterFile && hasWorkspaceManagedBlock(current)) {
          const merged = ensureRequiredFrontmatter(current, target);
          expected = replaceWorkspaceManagedBlockInPlace(merged.text, renderMinimalInstructionBlock(guidePath));
        } else if (!isGenerated(current, relativeFile) && !hasWorkspaceManagedBlock(current)) {
          if (isFrontmatterFile) {
            const merged = ensureRequiredFrontmatter(current, target);
            expected = upsertWorkspaceManagedBlock(merged.text, renderMinimalInstructionBlock(guidePath)).text;
          } else {
            expected = upsertWorkspaceManagedBlock(current, block).text;
          }
        } else if (isFrontmatterFile && isGenerated(current, relativeFile)) {
          expected = block;
        } else if (hasWorkspaceManagedBlock(current)) {
          expected = replaceWorkspaceManagedBlockInPlace(current, block);
        } else {
          expected = upsertWorkspaceManagedBlock(current, block).text;
        }
        const keptReason = target === 'claude' && CLAUDE_PROJECT_FILES.includes(normalizePath(relativeFile)) ? CLAUDE_BLOCK_KEPT : undefined;
        previews.push({ target, file: relativeFile, current, expected, latest: expected, safe: true, userEditsPreserved: Boolean(current && !isGenerated(current, relativeFile)), reason: keptReason });
        continue;
      }
      const guideForFile = workspaceGuideFilesForTarget(target).find((guide) => normalizePath(guide) === normalizePath(relativeFile));
      if (guideForFile) {
        const expected = renderAgentGuide(config.read, guideRenderOptions(guideForFile, hookHosts));
        const safe = !current || isGenerated(current, relativeFile);
        previews.push({ target, file: relativeFile, mode: 'file', current, expected, latest: expected, safe, userEditsPreserved: false, reason: safe ? undefined : 'human-authored guide file' });
        continue;
      }
      const renderTarget = renderTargetForFile(target, relativeFile);
      const incoming = renderSkillsetFile(renderTarget, relativeFile, config.read, instructionProfileForTarget(renderTarget, target), workspaceRenderOptions(renderTarget, relativeFile, hookHosts));
      if (isOpencodeConfigFile(relativeFile)) {
        const merged = current ? mergeOpencodeMcp(current, incoming, { replaceExisting: true }) : incoming;
        previews.push({ target, file: relativeFile, current, expected: merged ?? current, latest: incoming, safe: Boolean(merged), userEditsPreserved: Boolean(current), reason: merged ? undefined : 'could not merge existing OpenCode config' });
        continue;
      }
      if (isMergedMcpFile(relativeFile)) {
        const merged = current ? mergeMcpJson(current, incoming, { replaceExisting: true }) : incoming;
        previews.push({ target, file: relativeFile, current, expected: merged ?? current, latest: incoming, safe: Boolean(merged), userEditsPreserved: Boolean(current), reason: merged ? undefined : 'could not merge existing MCP config' });
        continue;
      }
      const safe = !current || isGenerated(current, relativeFile);
      previews.push({ target, file: relativeFile, mode: 'file', current, expected: incoming, latest: incoming, safe, userEditsPreserved: false, reason: safe ? undefined : 'human-authored file' });
    }
  }
  return previews;
}

async function detectUpgradeWorkspaceTargets(cwd: string): Promise<SkillsetTarget[]> {
  const linked: SkillsetTarget[] = [];
  for (const target of Object.keys(targets) as SkillsetTarget[]) {
    const candidates = target === 'opencode'
      ? targets[target].filter((file) => normalizePath(file) !== 'AGENTS.md')
      : target === 'claude' ? [...targets.claude, ...CLAUDE_UPGRADE_DETECTION_FILES] : targets[target];
    for (const requested of candidates) {
      const relativeFile = await resolveWorkspaceRelativeFile(cwd, requested);
      const existing = await readText(path.join(cwd, relativeFile));
      if (!existing) continue;
      if (isUpgradeLinkedWorkspaceArtifact(target, relativeFile, existing)) { linked.push(target); break; }
    }
  }
  return linked;
}

function replaceWorkspaceManagedBlockInPlace(existing: string, block: string): string {
  const start = existing.indexOf(WORKSPACE_BEGIN);
  const endStart = existing.indexOf(WORKSPACE_END, start + WORKSPACE_BEGIN.length);
  if (start < 0 || endStart < 0) return upsertWorkspaceManagedBlock(existing, block).text;
  const end = endStart + WORKSPACE_END.length;
  const newline = existing.includes('\r\n') ? '\r\n' : '\n';
  const normalized = block.replace(/\r?\n/g, newline);
  return `${existing.slice(0, start)}${normalized}${existing.slice(end)}`;
}

/** Install skillsets for every agent detected on this device, installing any not already linked. */
export async function installDetectedWorkspaceSkillsets(cwd: string, options: { plan?: boolean } = { }): Promise<InstallResult[]> {
  const detected = resolveAllTargets();
  const linked = await detectLinkedWorkspaceTargets(cwd);
  const missing = detected.filter((target) => !linked.includes(target));
  if (!missing.length) return [];
  if (options.plan) return planLinkedWorkspaceSkillsets(cwd, missing);
  const results: InstallResult[] = [];
  for (const target of missing) results.push(...await installSkillset(cwd, target, true));
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

async function planLinkedWorkspaceSkillsets(cwd: string, linkedTargets: SkillsetTarget[]): Promise<InstallResult[]> {
  const results: InstallResult[] = [];
  const seen = new Set<string>();
  for (const target of linkedTargets) {
    for (const relativeFile of await workspaceInstallFilesForTarget(cwd, target)) {
      const key = `${target}\u0000${relativeFile}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({ target, file: relativeFile, action: 'planned' });
    }
  }
  return results;
}

/** Static file list per target; `targets.claude` stays `['CLAUDE.md']` so detection still recognises legacy installs. */
function staticWorkspaceInstallFiles(target: SkillsetTarget): string[] {
  const guidePath = workspaceGuideFileForTarget(target);
  return [...targets[target], ...workspaceMcpFilesForTarget(target), ...(guidePath ? [guidePath] : [])];
}

/** Files an install or upgrade manages for a target. Claude's bootstrap depends on which CLAUDE.md the workspace already holds (E10). */
async function workspaceInstallFilesForTarget(cwd: string, target: SkillsetTarget): Promise<string[]> {
  if (target !== 'claude') return staticWorkspaceInstallFiles(target);
  const { files } = await claudeBootstrapFiles(cwd);
  const sharedGuide = textUsesOpenCodeGuide(await readText(path.join(cwd, 'AGENTS.md'))) ? [] : [SHARED_WORKSPACE_GUIDE];
  return [...files, ...workspaceMcpFilesForTarget(target), CLAUDE_GUIDE, ...sharedGuide];
}

/** Install file list with the notes Claude's bootstrap resolution produced (an importing CLAUDE.md, a hiding CLAUDE.local.md). */
async function workspaceFilesToInstall(cwd: string, target: SkillsetTarget, all: boolean): Promise<{ files: string[]; notes: Array<{ file: string; reason: string }> }> {
  if (target === 'claude') {
    const { files, notes } = await claudeBootstrapFiles(cwd);
    return { files: all ? files : [...files, ...workspaceMcpFilesForTarget(target)], notes };
  }
  return { files: all ? targets[target] : [...targets[target], ...workspaceMcpFilesForTarget(target)], notes: [] };
}

function workspaceDetectionFilesForTarget(target: SkillsetTarget): string[] {
  const files = staticWorkspaceInstallFiles(target);
  if (target === 'opencode') {
    return [...new Set([
      ...files.filter((file) => normalizePath(file) !== 'AGENTS.md' && !isOpencodeConfigFile(file)),
      OPENCODE_JSON,
      OPENCODE_JSONC
    ])];
  }
  return files;
}

function isUpgradeLinkedWorkspaceArtifact(target: SkillsetTarget, relativeFile: string, existing: string): boolean {
  if (target === 'agents-md'
      && normalizePath(relativeFile) === 'AGENTS.md'
      && textUsesOpenCodeGuide(existing)) {
    return false;
  }
  return isLinkedWorkspaceArtifact(relativeFile, existing);
}

function isLinkedWorkspaceArtifact(relativeFile: string, existing: string): boolean {
  const normalized = normalizePath(relativeFile);
  if (isMergedMcpFile(normalized)) return hasEngramMcpConfig(existing);
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
  const hookHosts = await activeHookHosts(config.read, { cwd });
  const results: InstallResult[] = [];
  const handledGuideFiles = new Set<string>();
  for (const name of Object.keys(targets) as SkillsetTarget[]) {
    // Gemini keeps its MCP entry in `.gemini/settings.json`, outside its instruction targets; refresh it too.
    for (const relativeFile of name === 'gemini' ? [...targets[name], ...workspaceMcpFilesForTarget(name)] : targets[name]) {
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
      if (isMergedMcpFile(resolvedRelativeFile)) {
        try {
          const parsed = parseJsonLike<Record<string, any>>(existing);
          if (!parsed.mcpServers?.engram) continue;
          const next = renderSkillsetFile('mcp', resolvedRelativeFile, config.read, 'compact', mcpRenderOptions(resolvedRelativeFile, hookHosts));
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
        // AGENTS.md is shared by agents-md, opencode and claude: keep whichever guide its block already points at, so a refresh never flips it.
        const guidePath = normalizePath(resolvedRelativeFile) === 'AGENTS.md'
          ? (textUsesOpenCodeGuide(existing) || (name === 'opencode' && !hasWorkspaceManagedBlock(existing)) ? '.opencode/engram.md' : SHARED_WORKSPACE_GUIDE)
          : workspaceGuideFileForTarget(name);
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
          const nextGuide = renderAgentGuide(config.read, guideRenderOptions(guidePath, hookHosts));
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
        const renderTarget = renderTargetForFile(name, resolvedRelativeFile);
        const next = renderSkillsetFile(renderTarget, resolvedRelativeFile, config.read, profile, workspaceRenderOptions(renderTarget, resolvedRelativeFile, hookHosts));
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
  // Claude's own guide is written even without a CLAUDE.md, so refresh it here when no CLAUDE.md pass handled it.
  if (!handledGuideFiles.has(CLAUDE_GUIDE)) {
    const guideFile = path.join(cwd, CLAUDE_GUIDE);
    const existingGuide = await readText(guideFile);
    if (existingGuide && isGenerated(existingGuide, CLAUDE_GUIDE)) {
      const nextGuide = persistedText(renderAgentGuide(config.read, guideRenderOptions(CLAUDE_GUIDE, hookHosts)));
      if (existingGuide !== nextGuide) {
        if (options.plan) {
          results.push({ target: 'claude', file: CLAUDE_GUIDE, action: 'planned' });
        } else {
          await writeText(guideFile, nextGuide);
          results.push({ target: 'claude', file: CLAUDE_GUIDE, action: 'updated' });
        }
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

function persistedText(text: string): string {
  return text.endsWith('\n') ? text : `${text}\n`;
}

/** Install one or all agent adapter files into user/global agent locations. */
export async function installGlobalSkillset(target = 'all', options: { force?: boolean; plan?: boolean; home?: string } & SkillsetInstallOptions = {}): Promise<InstallResult[]> {
  const config = await loadConfig(process.cwd());
  const hookHosts = await globalHookHosts(config.read, options.home, options.hookHosts);
  const plans = globalInstallPlans(target, options.home, !hookHosts.has('claude'));
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
    const rt = plan.renderTarget === 'gemini-hook' || plan.renderTarget === 'codex-mcp' ? plan.name : (plan.renderTarget ?? plan.name);
    const profile = instructionProfileForTarget(rt, plan.label);
    const content = renderGlobalPlanIncomingContent(plan, plan.file, config.read, profile, hookHosts);
    const isWindsurfGlobalRules = plan.file.endsWith('global_rules.md');
    if (options.plan) {
      results.push({ target: plan.label, file: plan.file, action: 'planned', mode: plan.mode, hash: sha256(content) });
      continue;
    }
    const existing = await readText(plan.file);
    if (plan.renderTarget === 'codex-mcp') {
      if (hasUnmanagedCodexEngramTable(existing)) {
        results.push({ target: plan.label, file: plan.file, action: 'skipped', mode: plan.mode, reason: 'config.toml already defines [mcp_servers.engram]; left untouched' });
        continue;
      }
      const persisted = upsertCodexMcpBlock(existing, content);
      await ensureDir(path.dirname(plan.file));
      await writeText(plan.file, persisted);
      results.push({ target: plan.label, file: plan.file, action: existing ? 'updated' : 'written', mode: plan.mode, hash: sha256(persisted) });
      continue;
    }
    if (plan.mode === 'file' && existing && !options.force && !isGenerated(existing, plan.file)) {
      if (plan.renderTarget === 'opencode' && isOpencodeConfigFile(plan.file)) {
        const merged = mergeOpencodeMcp(existing, content);
        if (merged) {
          const persisted = persistedText(merged);
          await writeText(plan.file, persisted);
          results.push({ target: plan.label, file: plan.file, action: 'updated', mode: plan.mode, hash: sha256(persisted) });
          continue;
        }
      }
      if (plan.renderTarget === 'mcp' && isMcpJsonFile(plan.file)) {
        const merged = mergeMcpJson(existing, content);
        if (merged) {
          const persisted = persistedText(merged);
          await writeText(plan.file, persisted);
          results.push({ target: plan.label, file: plan.file, action: 'updated', mode: plan.mode, hash: sha256(persisted) });
          continue;
        }
        results.push({ target: plan.label, file: plan.file, action: 'skipped', mode: plan.mode, reason: mcpMergeSkipReason(existing, false) });
        continue;
      }
      if (plan.renderTarget === 'gemini-hook' && plan.file.endsWith('hooks.json')) {
        const merged = mergeGeminiHookConfig(existing, content);
        if (merged) {
          const persisted = persistedText(merged);
          await writeText(plan.file, persisted);
          results.push({ target: plan.label, file: plan.file, action: 'updated', mode: plan.mode, hash: sha256(persisted) });
          continue;
        }
        results.push({ target: plan.label, file: plan.file, action: 'skipped', mode: plan.mode, reason: 'engram hook entry already present' });
        continue;
      }
      if (isWindsurfGlobalRules) {
        const { text, action } = upsertWorkspaceManagedBlock(existing, content);
        const persisted = persistedText(text);
        await writeText(plan.file, persisted);
        results.push({ target: plan.label, file: plan.file, action, mode: plan.mode, hash: sha256(persisted) });
        continue;
      }
      results.push({ target: plan.label, file: plan.file, action: 'skipped', mode: plan.mode, reason: 'human-authored file exists; re-run with --force to replace' });
      continue;
    }
    if (plan.mode === 'file' && existing && plan.renderTarget === 'opencode' && isOpencodeConfigFile(plan.file)) {
      const merged = mergeOpencodeMcp(existing, content, { replaceExisting: true });
      if (merged) {
        const persisted = persistedText(merged);
        await writeText(plan.file, persisted);
        results.push({ target: plan.label, file: plan.file, action: 'updated', mode: plan.mode, hash: sha256(persisted) });
        continue;
      }
      results.push({ target: plan.label, file: plan.file, action: 'skipped', mode: plan.mode, reason: 'could not merge existing OpenCode config' });
      continue;
    }
    if (plan.mode === 'file' && existing && plan.renderTarget === 'mcp' && isMcpJsonFile(plan.file)) {
      const merged = mergeMcpJson(existing, content, { replaceExisting: true });
      if (merged) {
        const persisted = persistedText(merged);
        await writeText(plan.file, persisted);
        results.push({ target: plan.label, file: plan.file, action: 'updated', mode: plan.mode, hash: sha256(persisted) });
        continue;
      }
      results.push({ target: plan.label, file: plan.file, action: 'skipped', mode: plan.mode, reason: mcpMergeSkipReason(existing, true) });
      continue;
    }
    if (plan.mode === 'file' && existing && plan.renderTarget === 'gemini-hook' && plan.file.endsWith('hooks.json')) {
      const merged = mergeGeminiHookConfig(existing, content, { replaceExisting: true });
      if (merged) {
        const persisted = persistedText(merged);
        await writeText(plan.file, persisted);
        results.push({ target: plan.label, file: plan.file, action: 'updated', mode: plan.mode, hash: sha256(persisted) });
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
    const persisted = persistedText(next.text);
    await writeText(plan.file, persisted);
    results.push({ target: plan.label, file: plan.file, action: next.action, mode: plan.mode, hash: sha256(persisted) });
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

/** Preview registered global skillset rewrites without changing agent files. */
export async function previewRegisteredGlobalSkillsets(home = globalAgentHome(), cwd = process.cwd()): Promise<SkillsetUpgradePreview[]> {
  const config = await loadConfig(cwd);
  const hookHosts = await globalHookHosts(config.read, home);
  const registry = await readGlobalSkillsetRegistry();
  const previews: SkillsetUpgradePreview[] = [];
  for (const [target, install] of Object.entries(registry.installs)) {
    let plans = globalInstallPlans(target, home, !hookHosts.has('claude')).filter((plan) => !plan.reason && plan.file !== '<manual>');
    if (target === 'opencode') {
      const opencodeHome = globalOpenCodeConfigHome(home);
      const jsonc = path.join(opencodeHome, OPENCODE_JSONC);
      const json = path.join(opencodeHome, 'opencode.json');
      if (await exists(json) && !(await exists(jsonc))) plans = plans.map((plan) => path.resolve(plan.file) === path.resolve(jsonc) ? { ...plan, file: json } : plan);
    }
    const registeredFiles = new Map(install.files.map((entry) => [path.resolve(entry.path), entry]));
    const plannedFiles = new Set(plans.map((plan) => path.resolve(plan.file)));
    for (const plan of plans) {
      const file = path.resolve(plan.file);
      const current = await readText(file);
      const registered = registeredFiles.get(file);
      const renderTarget = plan.renderTarget === 'gemini-hook' || plan.renderTarget === 'codex-mcp' ? plan.name : (plan.renderTarget ?? plan.name);
      const profile = instructionProfileForTarget(renderTarget, plan.label);
      previews.push(await previewGlobalInstallPlan(target, plan, file, current, config.read, profile, hookHosts, registered?.hash, install.engram_version));
    }
    for (const registered of install.files) {
      const file = path.resolve(registered.path);
      if (plannedFiles.has(file) || !(await exists(file))) continue;
      const current = await readText(file);
      previews.push({ target, file, mode: registered.mode, current, expected: current, safe: false, userEditsPreserved: true, reason: 'registered legacy artifact no longer maps to the current Engram target; review required' });
    }
  }
  return previews;
}

async function previewGlobalInstallPlan(
  target: string,
  plan: GlobalInstallPlan,
  file: string,
  current: string,
  readMode: string,
  profile: InstructionProfile,
  hookHosts: Set<AgentHookHost>,
  registeredHash?: string,
  installedVersion?: string
): Promise<SkillsetUpgradePreview> {
  const content = renderGlobalPlanIncomingContent(plan, file, readMode, profile, hookHosts);
  let expected = content;
  let safe = true;
  let userEditsPreserved = false;
  let reason: string | undefined;
  if (plan.mode === 'block') {
    expected = upsertWorkspaceManagedBlock(current.includes(GLOBAL_BEGIN) ? removeManagedBlock(current) : current, content).text;
    userEditsPreserved = Boolean(current);
  } else if (plan.renderTarget === 'opencode' && isOpencodeConfigFile(plan.file)) {
    const merged = current ? mergeOpencodeMcp(current, content, { replaceExisting: true }) : content;
    safe = Boolean(merged);
    expected = merged ?? current;
    userEditsPreserved = Boolean(current);
    reason = safe ? undefined : 'could not merge existing OpenCode config';
  } else if (plan.renderTarget === 'mcp' && isMcpJsonFile(plan.file)) {
    const merged = current ? mergeMcpJson(current, content, { replaceExisting: true }) : content;
    safe = Boolean(merged);
    expected = merged ?? current;
    userEditsPreserved = Boolean(current);
    reason = safe ? undefined : 'could not merge existing MCP config';
  } else if (plan.renderTarget === 'codex-mcp') {
    safe = !hasUnmanagedCodexEngramTable(current);
    expected = safe ? upsertCodexMcpBlock(current, content) : current;
    userEditsPreserved = Boolean(current);
    reason = safe ? undefined : 'config.toml already defines [mcp_servers.engram] outside the managed block';
  } else if (plan.renderTarget === 'gemini-hook' && plan.file.endsWith('hooks.json')) {
    const merged = current ? mergeGeminiHookConfig(current, content, { replaceExisting: true }) : content;
    safe = Boolean(merged);
    expected = merged ?? current;
    userEditsPreserved = Boolean(current);
    reason = safe ? undefined : 'could not merge existing Gemini hook config';
  } else {
    expected = persistedText(expected);
    const registryHashMatches = Boolean(current && registeredHash && sha256(current) === registeredHash);
    safe = !current || current === expected || registryHashMatches;
    userEditsPreserved = Boolean(current && !safe);
    reason = safe ? undefined : registeredHash
      ? 'registered whole-file artifact was modified after installation; manual review required'
      : 'whole-file ownership cannot be proven from registry metadata; manual review required';
  }
  return { target, file, mode: plan.mode ?? 'file', renderTarget: plan.renderTarget, current, expected: persistedText(expected), latest: content, safe, userEditsPreserved, reason, installedVersion };
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

/** `alwaysLoad` (no Engram Claude hook) puts `--always-load` into the printed `claude mcp add` hint. */
export function globalInstallPlans(target: string, home = globalAgentHome(), alwaysLoad = false): GlobalInstallPlan[] {
  const resolvedTargets = resolveLinkTargets(target);
  return resolvedTargets.flatMap((item) => [
    ...globalFilesForTarget(item, home, alwaysLoad),
    ...(target === 'all' || target === 'all-supported' ? [] : globalConfigFilesForTarget(item, home, alwaysLoad))
  ]);
}

/** Every SKILL.md path Engram can generate: `workspace` entries are relative to a workspace root, `global` entries are absolute under `home`. */
export function generatedSkillPaths(home = globalAgentHome()): { workspace: string[]; global: string[] } {
  const names = Object.keys(targets) as SkillsetTarget[];
  const workspace = names.flatMap((name) => targets[name]).filter((file) => file.endsWith('SKILL.md'));
  const global = names
    .flatMap((name) => globalFilesForTarget(resolveTarget(name, name), home, false))
    .filter((plan) => !plan.reason && plan.file.endsWith('SKILL.md'))
    .map((plan) => plan.file);
  return { workspace: [...new Set(workspace)], global: [...new Set(global)] };
}

function globalFilesForTarget(target: ResolvedTarget, home: string, alwaysLoad: boolean): GlobalInstallPlan[] {
  const configHome = globalAgentConfigHome(home);
  const opencodeHome = globalOpenCodeConfigHome(home);
  const plan = (file: string, mode: GlobalInstallMode, renderTarget: RenderTargetName = target.name): GlobalInstallPlan => ({ ...target, file, mode, renderTarget });
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
      return [
        { ...target, file: '<manual>', reason: claudeUserMcpHint({ alwaysLoad }) },
        plan(path.join(home, '.gemini', 'settings.json'), 'file', 'mcp'),
        plan(path.join(home, '.codex', 'config.toml'), 'file', 'codex-mcp')
      ];
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
  if (target === 'gemini') return ['.gemini/settings.json'];
  return target === 'mcp' || target === 'slash' ? [] : targets.mcp;
}

function renderTargetForFile(target: SkillsetTarget, relativeFile: string): SkillsetTarget {
  const normalized = relativeFile.replace(/\\/g, '/');
  if (targets.mcp.includes(normalized)) return 'mcp';
  if (normalized === '.cursor/mcp.json' || normalized === '.gemini/settings.json') return 'mcp';
  if (normalized === OPENCODE_JSON || normalized === OPENCODE_JSONC) return 'opencode';
  if (normalized === '.opencode/skills/engram/SKILL.md') return 'agent-skill';
  return target;
}

/** Workspace JSON configs shared with user content: Engram merges only its own `mcpServers.engram` entry. */
const MERGED_MCP_FILES = new Set(['.cursor/mcp.json', '.mcp.json', '.gemini/settings.json']);
function isMergedMcpFile(relativeFile: string): boolean { return MERGED_MCP_FILES.has(normalizePath(relativeFile)); }

/** Accurate skip reason when mergeMcpJson refused an existing config. */
function mcpMergeSkipReason(existing: string, force: boolean): string {
  try {
    parseJsonLike<Record<string, any>>(existing);
  } catch {
    return 'could not parse existing file; left untouched';
  }
  return force ? 'could not merge existing MCP config' : 'engram MCP entry already present';
}

/** Global JSON configs that hold an Engram `mcpServers.engram` entry among user content. */
function isMcpJsonFile(file: string): boolean {
  const normalized = normalizePath(file);
  return normalized.endsWith('mcp.json') || normalized.endsWith('mcp_config.json') || normalized.endsWith('/.gemini/settings.json');
}

function globalConfigFilesForTarget(target: ResolvedTarget, home: string, alwaysLoad: boolean): GlobalInstallPlan[] {
  const configHome = globalAgentConfigHome(home);
  const opencodeHome = globalOpenCodeConfigHome(home);
  const mcpPlan = (file: string): GlobalInstallPlan => ({ ...target, file, mode: 'file', renderTarget: 'mcp' });
  const hookPlan = (file: string): GlobalInstallPlan => ({ ...target, file, mode: 'file', renderTarget: 'gemini-hook' });
  switch (target.name) {
    case 'claude':
      // Claude Code keeps user-scope MCP servers in ~/.claude.json, which only `claude mcp add` should edit.
      return [{ ...target, file: '<manual>', reason: claudeUserMcpHint({ alwaysLoad }) }];
    case 'agents-md':
      return [{ ...target, file: path.join(home, '.codex', 'config.toml'), mode: 'file', renderTarget: 'codex-mcp' }];
    case 'cursor':
      return [];
    case 'gemini':
      return [
        mcpPlan(path.join(home, '.gemini', 'settings.json')),
        hookPlan(path.join(home, '.gemini', 'config', 'hooks.json'))
      ];
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

function renderGlobalInstallContent(plan: GlobalInstallPlan, readMode = 'auto', profile: InstructionProfile = 'compact', hookHosts = new Set<AgentHookHost>()): string {
  const normFile = plan.file.replace(/\\/g, '/');
  const pointer: RenderOptions = { guidePath: globalPointerGuidePath(plan) };
  if (plan.name === 'slash' || plan.renderTarget === 'slash') return renderSkillsetFile('slash', plan.file, readMode, 'compact', pointer);
  if (plan.renderTarget === 'mcp') return renderSkillsetFile('mcp', plan.file, readMode);
  if (plan.renderTarget === 'codex-mcp') return renderCodexMcpBlock();
  if (plan.renderTarget === 'gemini-hook') return renderGeminiHookConfig();
  if (plan.renderTarget === 'opencode' && /opencode\.jsonc?$/u.test(normFile)) return renderSkillsetFile('opencode', plan.file, readMode);
  if (normFile.endsWith('SKILL.md')) return renderSkillsetFile(plan.renderTarget ?? 'agent-skill', plan.file, readMode, 'compact', globalSkillRenderOptions(plan, hookHosts));
  if (normFile.endsWith('plugin.json')) return renderCursorPluginJson();
  if (normFile.endsWith('rules/engram.mdc')) return renderCursorRule(CURSOR_PLUGIN_GUIDE);
  if (normFile.endsWith('commands/engram.md')) return renderSkillsetFile('slash', plan.file, readMode, 'compact', pointer);
  if (normFile.endsWith('hooks.json')) return '{}\n';
  if (normFile.endsWith('global_rules.md')) return `${renderWindsurfGlobalRulesBlock()}\n`;
  return globalSkillsetMarkdown(readMode, profile, globalGuideRenderOptions(plan, hookHosts));
}

function renderCanonicalGlobalInstallContent(plan: GlobalInstallPlan, file: string, readMode = 'auto', profile: InstructionProfile = 'compact', hookHosts = new Set<AgentHookHost>()): string {
  return isCanonicalFullGuideFile(file)
    ? globalSkillsetMarkdown(readMode, 'compact', globalGuideRenderOptions(plan, hookHosts))
    : renderGlobalInstallContent(plan, readMode, profile, hookHosts);
}

function renderGlobalPlanIncomingContent(plan: GlobalInstallPlan, file: string, readMode = 'auto', profile: InstructionProfile = 'compact', hookHosts = new Set<AgentHookHost>()): string {
  const content = plan.mode === 'block'
    ? renderMinimalInstructionBlock(globalGuidePathForPlan(plan))
    : file.endsWith('global_rules.md')
      ? renderWindsurfGlobalRulesBlock()
      : renderCanonicalGlobalInstallContent(plan, file, readMode, profile, hookHosts);
  return persistedText(content);
}

/** The global Cursor plugin has no separate guide: its skill holds the full protocol. */
const CURSOR_PLUGIN_GUIDE = '~/.cursor/plugins/local/engram/skills/engram/SKILL.md';

/** Hosts sharing `~/.agents/engram.md`; the shared guide stays canonical across them. */
const SHARED_GLOBAL_GUIDE_HOOK_HOSTS: AgentHookHost[] = ['codex', 'claude', 'gemini'];

/** Global hook detection follows ENGRAM_AGENT_HOME; for an explicit other home only the caller's pending hooks count. */
async function globalHookHosts(readMode: string, home?: string, pending: AgentHookHost[] = []): Promise<Set<AgentHookHost>> {
  const readsHooks = readMode !== 'manual' && readMode !== 'off';
  if (home && path.resolve(home) !== path.resolve(globalAgentHome())) return new Set(readsHooks ? pending : []);
  return activeHookHosts(readMode, { global: true }, pending);
}

/** `~/.agents/engram.md` is also read by Copilot (no hooks), so it gets the hedged hook wording. */
function globalGuideRenderOptions(plan: GlobalInstallPlan, hookHosts: Set<AgentHookHost>): RenderOptions {
  if (plan.name === 'opencode') return { hooks: hookHosts.has('opencode') };
  if (plan.name === 'cline') return { hooks: false };
  return { hooks: SHARED_GLOBAL_GUIDE_HOOK_HOSTS.some((host) => hookHosts.has(host)), sharedGuide: true };
}

function globalPointerGuidePath(plan: GlobalInstallPlan): string {
  if (normalizePath(plan.file).includes('/.cursor/plugins/local/engram/')) return CURSOR_PLUGIN_GUIDE;
  if (plan.name === 'opencode') return '~/.config/opencode/engram.md';
  return '~/.agents/engram.md';
}

/** Global skills are pointers, except where the install has no other guide (Cursor plugin, Antigravity). */
function globalSkillRenderOptions(plan: GlobalInstallPlan, hookHosts: Set<AgentHookHost>): RenderOptions {
  if (normalizePath(plan.file).includes('/.cursor/plugins/local/engram/')) return { hooks: hookHosts.has('cursor') };
  if (plan.renderTarget === 'antigravity') return { hooks: hookHosts.has('gemini') };
  return { guidePath: globalPointerGuidePath(plan) };
}

function isCanonicalFullGuideFile(file: string): boolean {
  const normalized = normalizePath(file).toLowerCase();
  return normalized.endsWith('/engram.md') && !normalized.includes('/commands/');
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
  const handledMcpFiles = new Set<string>();
  for (const { name, label } of names) {
    // Claude and Gemini link a shared workspace MCP file (.mcp.json, .gemini/settings.json); unlink drops only the engram entry.
    const mcpFiles = name === 'claude' || name === 'gemini' ? workspaceMcpFilesForTarget(name) : [];
    // A project .claude/CLAUDE.md block (E10) is cleaned like CLAUDE.md; it is only listed when it exists.
    const claudeExtra = name === 'claude' && await exists(path.join(cwd, '.claude/CLAUDE.md')) ? ['.claude/CLAUDE.md'] : [];
    for (const relativeFile of [...new Set([...targets[name], ...claudeExtra, ...mcpFiles])]) {
      if (isMergedMcpFile(relativeFile)) {
        if (handledMcpFiles.has(relativeFile)) continue;
        handledMcpFiles.add(relativeFile);
      }
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
        if (isMergedMcpFile(resolvedRelativeFile)) {
          const unmerged = unmergeMcpJson(existing);
          if (unmerged === null) {
            results.push({ target: label, file: resolvedRelativeFile, action: 'skipped', reason: 'no Engram MCP entry found' });
          } else if (unmerged === '') {
            await fs.rm(file, { force: true });
            results.push({ target: label, file: resolvedRelativeFile, action: 'removed' });
          } else {
            await writeText(file, unmerged);
            results.push({ target: label, file: resolvedRelativeFile, action: 'cleaned' });
          }
          continue;
        }
        if (!force && !isGenerated(existing, resolvedRelativeFile)) {
          results.push({ target: label, file: resolvedRelativeFile, action: 'skipped', reason: 'human-authored file; use --force to remove' });
          continue;
        }
        await fs.rm(file, { force: true });
        results.push({ target: label, file: resolvedRelativeFile, action: 'removed' });
      }
    }
    if (name === 'claude') results.push(...await unlinkClaudeSharedFiles(cwd, label, force, names, handledGuideFiles));
  }
  return results;
}

/** Remove a generated (or forced) file; undefined when it does not exist. */
async function removeGeneratedFile(cwd: string, label: string, relativeFile: string, force: boolean): Promise<UnlinkResult | undefined> {
  const existing = await readText(path.join(cwd, relativeFile));
  if (!existing) return undefined;
  if (!force && !isGenerated(existing, relativeFile)) return { target: label, file: relativeFile, action: 'skipped', reason: 'human-authored file; use --force to remove' };
  await fs.rm(path.join(cwd, relativeFile), { force: true });
  return { target: label, file: relativeFile, action: 'removed' };
}

/** True when a non-Claude target left files that still read the AGENTS.md block or the shared guide. */
async function otherTargetUsesAgentsMd(cwd: string): Promise<boolean> {
  for (const file of ['.agents/skills/engram/SKILL.md', '.opencode/engram.md', '.opencode/skills/engram/SKILL.md']) {
    const text = await readText(path.join(cwd, file));
    if (text && isGenerated(text, file)) return true;
  }
  return (await detectInstalledHookTargets({ cwd, includeStale: true })).some((host) => host === 'codex' || host === 'opencode');
}

/** True when another generated file still points at the shared `.agents/engram.md` guide. */
async function sharedGuideStillReferenced(cwd: string): Promise<boolean> {
  for (const file of ['.agents/skills/engram/SKILL.md', '.github/copilot-instructions.md', '.clinerules', 'AGENTS.md']) {
    const text = await readText(path.join(cwd, file));
    if (text && text.includes(SHARED_WORKSPACE_GUIDE) && isGenerated(text, file)) return true;
  }
  return false;
}

/** `link claude` also writes the AGENTS.md block and Claude's guides; remove them unless another linked target still reads them. */
async function unlinkClaudeSharedFiles(cwd: string, label: string, force: boolean, names: ResolvedTarget[], handledGuideFiles: Set<string>): Promise<UnlinkResult[]> {
  const results: UnlinkResult[] = [];
  if (!handledGuideFiles.has(CLAUDE_GUIDE)) {
    handledGuideFiles.add(CLAUDE_GUIDE);
    const guide = await removeGeneratedFile(cwd, label, CLAUDE_GUIDE, force);
    if (guide) results.push(guide);
  }
  // `agents-md` and `opencode` own AGENTS.md themselves; when they are part of this unlink they clean it.
  if (names.some((item) => item.name === 'agents-md' || item.name === 'opencode')) return results;
  if (await otherTargetUsesAgentsMd(cwd)) {
    results.push({ target: label, file: 'AGENTS.md', action: 'skipped', reason: 'AGENTS.md block still used by another linked target' });
    return results;
  }
  const agentsFile = path.join(cwd, 'AGENTS.md');
  const agents = await readText(agentsFile);
  if (agents && hasWorkspaceManagedBlock(agents)) {
    const cleaned = removeWorkspaceManagedBlock(agents).trimEnd();
    if (cleaned) {
      await writeText(agentsFile, `${cleaned}\n`);
      results.push({ target: label, file: 'AGENTS.md', action: 'cleaned' });
    } else {
      await fs.rm(agentsFile, { force: true });
      results.push({ target: label, file: 'AGENTS.md', action: 'removed' });
    }
  }
  if (!handledGuideFiles.has(SHARED_WORKSPACE_GUIDE) && !(await sharedGuideStillReferenced(cwd))) {
    handledGuideFiles.add(SHARED_WORKSPACE_GUIDE);
    const guide = await removeGeneratedFile(cwd, label, SHARED_WORKSPACE_GUIDE, force);
    if (guide) results.push(guide);
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
        if (isMcpJsonFile(file)) {
          const unmerged = unmergeMcpJson(existing);
          if (unmerged === null) {
            // Never delete a shared config (e.g. ~/.gemini/settings.json) that holds no Engram entry, even with --force.
            results.push({ target: current, file, action: 'skipped', reason: 'no Engram MCP entry found' });
          } else if (unmerged === '') {
            await fs.rm(file, { force: true });
            results.push({ target: current, file, action: 'removed' });
          } else {
            await writeText(file, unmerged);
            results.push({ target: current, file, action: 'cleaned' });
          }
          continue;
        }
        if (normalizePath(file).endsWith('/.codex/config.toml')) {
          if (!hasCodexMcpBlock(existing)) {
            results.push({ target: current, file, action: 'skipped', reason: 'no Engram managed block found' });
            continue;
          }
          const remaining = removeCodexMcpBlock(existing);
          if (!remaining) {
            await fs.rm(file, { force: true });
            results.push({ target: current, file, action: 'removed' });
          } else {
            await writeText(file, remaining);
            results.push({ target: current, file, action: 'cleaned' });
          }
          continue;
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
