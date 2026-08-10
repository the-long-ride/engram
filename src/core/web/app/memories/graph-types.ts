// Types for the memories graph renderer.
export interface MemoryNode {
  id: string;
  memoryId: string;
  file: string;
  profile: string;
  scope?: string;
  sourceScope: string;
  workspaceName?: string;
  summary?: string;
  type?: string;
  authority?: 'instruction' | 'reference';
  evidenceRefs?: string[];
  derivedFrom?: string[];
  revision?: number;
  supersedes?: string[];
  supersededBy?: string;
  validFrom?: string;
  validUntil?: string;
  lastConfirmed?: string;
  canEdit?: boolean;
  canDelete?: boolean;
}
export interface MemoryLink { from: string; to: string; kind: string; label?: string; thin?: boolean; }
export interface NodeBox { x: number; y: number; w: number; h: number; }
