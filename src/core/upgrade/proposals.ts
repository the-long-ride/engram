/** Type-aware current/proposed content for upgrade conflict review. */
import path from 'node:path';
import type { EngramConfig } from '../runtime/types.js';
import { globalAgentHome } from '../integrations/agent-paths.js';
import { previewLinkedWorkspaceSkillsets, previewRegisteredGlobalSkillsets, type SkillsetUpgradePreview } from '../integrations/skillset.js';
import { parseJsonLike, readText } from '../system/fsx.js';
import { sha256 } from '../safety/hash.js';
import type { UpgradeConflictProposal, UpgradeInventoryItem, UpgradePlan } from './types.js';
import { isReplaceableConflictKind } from './review-policy.js';

export async function getConflictProposal(cwd: string, config: EngramConfig, plan: UpgradePlan, itemId: string): Promise<UpgradeConflictProposal> {
  const item = plan.items.find((row) => row.id === itemId);
  if (!item) throw new Error(`Upgrade item not found: ${itemId}`);
  const current = await readText(item.file);
  const sourceHash = sha256(current);
  if (item.currentHash && sourceHash !== item.currentHash) throw new Error('Upgrade preview is stale; refresh the preview before reviewing this file.');
  if (!isReplaceableConflictKind(item.kind)) {
    return { itemId: item.id, kind: item.kind, file: item.file, sourceHash, current, proposed: current, latest: current, diff: renderUnifiedDiff(current, current), replaceable: false, ownership: item.ownership, forceMode: 'none', reason: item.reason };
  }
  const preview = await findPreview(cwd, item);
  if (!preview) throw new Error(`No generated Engram proposal is available for ${item.file}`);
  const merged = preview.expected && preview.expected !== preview.current ? preview.expected : '';
  const latest = preview.latest ?? preview.expected ?? '';
  const proposed = merged || latest;
  if (!proposed) throw new Error(`No replacement content is available for ${item.file}`);
  return {
    itemId: item.id,
    kind: item.kind,
    file: item.file,
    sourceHash,
    current,
    proposed,
    latest,
    diff: renderUnifiedDiff(current, proposed),
    replaceable: Boolean(proposed) && preview.safe && item.strategy !== 'manual-review',
    ownership: item.ownership,
    forceMode: item.forceMode,
    forceWarning: item.forceMode === 'replace-managed-region'
      ? 'Overwrite only the Engram-managed block; surrounding user content is preserved.'
      : item.forceMode === 'replace-file'
        ? 'Overwrite this Engram-owned generated file, including manual edits inside it.'
        : undefined,
    reason: item.reason
  };
}

async function findPreview(cwd: string, item: UpgradeInventoryItem): Promise<SkillsetUpgradePreview | undefined> {
  const rows = item.scope === 'workspace'
    ? await previewLinkedWorkspaceSkillsets(cwd)
    : await previewRegisteredGlobalSkillsets(globalAgentHome(), cwd);
  return selectConflictPreview(cwd, item, rows);
}

export function selectConflictPreview(cwd: string, item: UpgradeInventoryItem, rows: SkillsetUpgradePreview[]): SkillsetUpgradePreview | undefined {
  const targets = new Set((item.agents?.length ? item.agents : item.agent ? [item.agent] : []).filter(Boolean));
  const candidates = rows.filter((row) => {
    const file = path.resolve(item.scope === 'workspace' && !path.isAbsolute(row.file) ? path.join(cwd, row.file) : row.file);
    if (file !== path.resolve(item.file)) return false;
    if (targets.size && !targets.has(row.target)) return false;
    if (item.kind === 'instruction' && row.mode && row.mode !== 'block') return false;
    if (item.kind === 'skillset' && row.mode && row.mode !== 'file') return false;
    return true;
  });
  return candidates[0];
}

export function validateConflictProposal(proposal: Pick<UpgradeConflictProposal, 'kind'>, content: string): { valid: boolean; error?: string } {
  if (!content.trim()) return { valid: false, error: 'Proposed content cannot be empty.' };
  if (proposal.kind === 'config') {
    try {
      const parsed = parseJsonLike<unknown>(content);
      if (!parsed || typeof parsed !== 'object') return { valid: false, error: 'Config proposal must contain a JSON object.' };
    } catch (error) {
      return { valid: false, error: `Config proposal is invalid JSON/JSONC: ${messageOf(error)}` };
    }
  }
  return { valid: true };
}

export function renderUnifiedDiff(current: string, proposed: string): string {
  const a = lines(current);
  const b = lines(proposed);
  const table = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
  }
  const out = ['--- current', '+++ proposed'];
  let i = 0; let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) { out.push(` ${a[i]}`); i++; j++; continue; }
    if (j < b.length && (i >= a.length || table[i][j + 1] >= table[i + 1][j])) { out.push(`+${b[j]}`); j++; continue; }
    if (i < a.length) { out.push(`-${a[i]}`); i++; }
  }
  return `${out.join('\n')}\n`;
}

function lines(text: string): string[] {
  const normalized = text.replace(/\r\n/g, '\n');
  const split = normalized.split('\n');
  if (split.at(-1) === '') split.pop();
  return split;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
