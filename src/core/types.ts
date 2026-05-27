/** Shared Engram domain types used by CLI, MCP, and tests. */
export type MemoryType = 'rule' | 'skill' | 'knowledge';
export type Scope = 'workspace' | 'global';
export type Confidence = 'high' | 'medium' | 'low';

export type EngramConfig = {
  version: string;
  enabled: boolean;
  scope: 'both' | Scope;
  update: 'auto' | 'manual';
  read: 'auto' | 'manual' | 'off';
  ignore: IgnoreConfig;
  roles: string[];
  live_sync: { enabled: boolean; targets: string[] };
  pattern_mining: { enabled: boolean; threshold: number; lookback_sessions: number };
  pr_workflow: { enabled: boolean; provider?: string; repo?: string; target_branch: string };
  encryption: { enabled: boolean; scope: Scope; key_source: string };
};

export type IgnoreConfig = {
  source: 'engramignore' | 'gitignore' | 'both' | 'off';
  gitignore_path: string;
  engramignore_path: string;
  global_engramignore: boolean;
  also_ignore: string[];
};

export type MemoryEntry = {
  id: string;
  type: MemoryType;
  scope: Scope;
  tags: string[];
  summary: string;
  file: string;
  author: string;
  confidence: Confidence;
  ignored: boolean;
  updated: string;
  role?: string[];
};

export type MemoryIndex = { version: string; last_updated: string; entries: MemoryEntry[] };
export type HashStore = Record<string, string>;
export type ScanFinding = { line: number; reason: string; value: string; kind: string };
export type MemoryDoc = { frontmatter: Record<string, any>; title: string; body: string; raw: string };
