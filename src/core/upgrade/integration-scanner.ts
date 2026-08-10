/** Convert known connected-agent managed artifacts into shared upgrade inventory items. */
import path from 'node:path';
import { globalAgentHome } from '../integrations/agent-paths.js';
import { previewLinkedWorkspaceSkillsets, previewRegisteredGlobalSkillsets, type SkillsetUpgradePreview } from '../integrations/skillset.js';
import { previewInstalledAgentHooks } from '../integrations/agent-hooks.js';
import { isGenerated, WORKSPACE_BEGIN, WORKSPACE_END } from '../integrations/skillset-render.js';
import { sha256 } from '../safety/hash.js';
import type { Scope } from '../runtime/types.js';
import { upgradeItemId } from './fingerprint.js';
import type { UpgradeArtifactKind, UpgradeForceMode, UpgradeInventoryItem, UpgradeOwnership, UpgradeStrategy } from './types.js';

const GLOBAL_BEGIN = '<!-- BEGIN ENGRAM GLOBAL SKILLSET -->';
const GLOBAL_END = '<!-- END ENGRAM GLOBAL SKILLSET -->';

function artifactKind(file: string): UpgradeArtifactKind {
  const normalized = file.replace(/\\/g, '/').toLowerCase();
  const base = path.basename(normalized);
  if (normalized.includes('/hooks/') || base.includes('hook')) return 'hook';
  if (base === 'plugin.json' || normalized.includes('/plugins/')) return 'plugin';
  if (base === 'agents.md' || base === 'claude.md' || base === 'gemini.md' || base === '.clinerules' || normalized.endsWith('engram.mdc') || normalized.endsWith('/rules/engram.md') || normalized.endsWith('/copilot-instructions.md')) return 'instruction';
  if (base.endsWith('.json') || base.endsWith('.jsonc') || normalized.includes('mcp')) return 'config';
  return 'skillset';
}

function strategyFor(kind: UpgradeArtifactKind, current: string, safe: boolean, preserve: boolean): UpgradeStrategy {
  if (!safe) return 'manual-review';
  if (!current) return 'install-generated';
  if (kind === 'instruction' || preserve) return 'update-managed-block';
  return 'replace-generated';
}

export function canonicalPhysicalFile(scope: Scope, cwd: string, file: string): string {
  return path.resolve(scope === 'workspace' && !path.isAbsolute(file) ? path.join(cwd, file) : file);
}

function markerCount(text: string, marker: string): number {
  if (!text || !marker) return 0;
  return text.split(marker).length - 1;
}

function ownershipFor(scope: Scope, kind: UpgradeArtifactKind, preview: SkillsetUpgradePreview, file: string): { ownership: UpgradeOwnership; forceMode: UpgradeForceMode } {
  if (kind !== 'instruction' && kind !== 'skillset') return { ownership: 'unknown', forceMode: 'none' };
  const current = preview.current ?? '';
  const workspaceManaged = markerCount(current, WORKSPACE_BEGIN) === 1 && markerCount(current, WORKSPACE_END) === 1;
  const globalManaged = markerCount(current, GLOBAL_BEGIN) === 1 && markerCount(current, GLOBAL_END) === 1;
  if (kind === 'instruction' && (workspaceManaged || globalManaged)) {
    return { ownership: 'managed-region', forceMode: 'replace-managed-region' };
  }
  const normalized = file.replace(/\\/g, '/').toLowerCase();
  const registeredGeneratedFile = scope === 'global' && preview.mode === 'file';
  const recognizableWorkspaceFile = scope === 'workspace' && preview.mode === 'file' && isGenerated(current, file);
  if (kind === 'skillset' && (registeredGeneratedFile || recognizableWorkspaceFile)) {
    return { ownership: 'generated-file', forceMode: 'replace-file' };
  }
  return { ownership: 'unknown', forceMode: 'none' };
}

export function canonicalizeSkillsetUpgradePreviews(cwd: string, scope: Scope, targetVersion: string, previews: SkillsetUpgradePreview[]): UpgradeInventoryItem[] {
  const grouped = new Map<string, SkillsetUpgradePreview[]>();
  for (const preview of previews) {
    const file = canonicalPhysicalFile(scope, cwd, preview.file);
    grouped.set(file, [...(grouped.get(file) ?? []), preview]);
  }
  const items: UpgradeInventoryItem[] = [];
  for (const [file, rows] of grouped) {
    const first = rows[0];
    const kind = artifactKind(file);
    const agents = [...new Set(rows.map((row) => row.target))].sort();
    const expectedRows = [...new Set(rows.map((row) => row.expected))];
    const compatible = expectedRows.length === 1;
    const expected = compatible ? expectedRows[0] : first.expected;
    const safe = compatible && rows.every((row) => row.safe);
    const status = !compatible || !safe ? 'conflict' : first.current === expected ? 'current' : 'outdated';
    const owner = ownershipFor(scope, kind, first, file);
    const base: Omit<UpgradeInventoryItem, 'id'> = {
      scope,
      kind,
      agent: agents[0],
      agents,
      file,
      installedVersion: rows.map((row) => row.installedVersion).filter(Boolean).sort().at(-1),
      targetVersion,
      status,
      strategy: strategyFor(kind, first.current, safe, rows.some((row) => row.userEditsPreserved)),
      userEditsPreserved: rows.some((row) => row.userEditsPreserved),
      reason: !compatible
        ? `multiple Engram registrations disagree on the canonical content for this physical file (${agents.join(', ')})`
        : first.reason ?? (status === 'current' ? 'managed artifact matches current Engram template' : status === 'outdated' ? 'managed artifact differs from current Engram template' : 'artifact contains ambiguous user-authored content'),
      currentHash: first.current ? sha256(first.current) : undefined,
      expectedManagedHash: expected ? sha256(expected) : undefined,
      ownership: compatible ? owner.ownership : 'unknown',
      forceMode: compatible ? owner.forceMode : 'none',
      transactionGroup: `${scope}:artifact:${sha256(file).slice(0, 16)}`
    };
    items.push({ ...base, id: upgradeItemId(base) });
  }
  return items;
}

export async function scanIntegrationUpgrades(cwd: string, scope: Scope, targetVersion: string): Promise<UpgradeInventoryItem[]> {
  const previews = scope === 'workspace'
    ? await previewLinkedWorkspaceSkillsets(cwd)
    : await previewRegisteredGlobalSkillsets(globalAgentHome(), cwd);
  const skillsetItems = canonicalizeSkillsetUpgradePreviews(cwd, scope, targetVersion, previews);
  const hookPreviews = await previewInstalledAgentHooks({ global: scope === 'global', cwd });
  const hookItems = hookPreviews.map((preview) => {
    const status = !preview.safe ? 'conflict' : preview.current === preview.expected ? 'current' : 'outdated';
    const kind: UpgradeArtifactKind = preview.file.endsWith('.js') ? 'plugin' : 'hook';
    const file = path.resolve(preview.file);
    const base: Omit<UpgradeInventoryItem, 'id'> = {
      scope,
      kind,
      agent: preview.host,
      agents: [preview.host],
      file,
      targetVersion,
      status,
      strategy: !preview.safe ? 'manual-review' : 'replace-generated',
      userEditsPreserved: false,
      reason: preview.reason ?? (status === 'current' ? 'managed hook matches current Engram hook' : 'managed hook is stale'),
      currentHash: preview.current ? sha256(preview.current) : undefined,
      expectedManagedHash: preview.expected ? sha256(preview.expected) : undefined,
      ownership: 'unknown',
      forceMode: 'none',
      transactionGroup: `${scope}:artifact:${sha256(file).slice(0, 16)}`
    };
    return { ...base, id: upgradeItemId(base) };
  });
  const hookOwned = new Set(hookItems.map((item) => path.resolve(item.file)));
  return [...skillsetItems.filter((item) => !hookOwned.has(path.resolve(item.file))), ...hookItems];
}
