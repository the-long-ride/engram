// Types for the memories graph renderer.
export interface MemoryNode { id: string; memoryId: string; file: string; profile: string; scope?: string; sourceScope: string; workspaceName?: string; summary?: string; canEdit?: boolean; canDelete?: boolean; }
export interface MemoryLink { from: string; to: string; kind: string; label?: string; thin?: boolean; }
export interface NodeBox { x: number; y: number; w: number; h: number; }
