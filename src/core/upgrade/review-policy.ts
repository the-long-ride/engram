/** Define which upgrade conflict kinds can use generated replacement content. */
import type { UpgradeArtifactKind } from './types.js';

const REPLACEABLE_CONFLICT_KINDS = new Set<UpgradeArtifactKind>(['config', 'instruction', 'skillset']);

export function isReplaceableConflictKind(kind: UpgradeArtifactKind): boolean {
  return REPLACEABLE_CONFLICT_KINDS.has(kind);
}
