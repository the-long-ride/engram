/** Shared Engram domain types used by CLI, MCP, and tests. */
export type MemoryType = 'rule' | 'skill' | 'knowledge';
export type Scope = 'workspace' | 'global';
export type Confidence = 'high' | 'medium' | 'low';
export type RuleVariant = 'light' | 'balanced' | 'strict';
export type ProfileSource = 'env' | 'workspace' | 'user' | 'none';

export type EngramProfile = {
  global_path: string;
  scope?: 'both' | Scope;
  global_git?: Partial<EngramConfig['global_git']>;
};

export type ProfileStore = {
  active_profile?: string;
  profiles: Record<string, EngramProfile>;
};

export type ProfileResolution = {
  active: string;
  source: ProfileSource;
  configured: boolean;
  global_path: string;
  workspace_default: string;
  user_default: string;
  workspace_allowed: boolean;
  profiles_path: string;
};

export type AutoUpgradeState = {
  version: string;
  checked_at: string;
};

export type EngramConfig = {
  version: string;
  enabled: boolean;
  global_path: string;
  default_profile?: string;
  scope: 'both' | Scope;
  update: 'auto' | 'manual' | 'off';
  auto_upgrade?: AutoUpgradeState;
  read: 'startup' | 'auto' | 'manual' | 'off' | 'always';
  proof: 'off' | 'compact';
  ignore: IgnoreConfig;
  roles: string[];
  live_sync: { enabled: boolean; targets: string[] };
  global_git: { enabled: boolean; remote: string; branch: string; auto_sync: boolean; auto_resolve: boolean };
  rule_variants: { enabled: boolean; active: RuleVariant };
  load: { limit: number };
  graph: { enabled: boolean; max_related: number; min_related_score: number };
  vector: { enabled: boolean; provider: 'sqlite-vec'; auto_threshold: number; candidate_pool: number; dimensions: number };
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
  routingTerms?: string[];
  file: string;
  author: string;
  confidence: Confidence;
  ignored: boolean;
  updated: string;
  dependsOn?: string[];
  dependencyDepth?: number;
  role?: string[];
};

export type MemoryIndex = { version: string; last_updated: string; entries: MemoryEntry[] };
export type HashStore = Record<string, string>;
export type ScanFinding = { line: number; reason: string; value: string; kind: string };
export type MemoryDoc = { frontmatter: Record<string, any>; title: string; body: string; raw: string };

export type MemoryGraphNodeKind = 'scope' | 'type' | 'topic' | 'memory';
export type MemoryGraphEdgeKind = 'contains' | 'tagged_as' | 'depends_on' | 'related_to' | 'contradicts';

export type MemoryGraphNode = {
  id: string;
  kind: MemoryGraphNodeKind;
  level: number;
  label: string;
  scope?: Scope;
  memoryId?: string;
  memoryType?: MemoryType;
  file?: string;
  tags?: string[];
  summary?: string;
  dependsOn?: string[];
  dependencyDepth?: number;
  embedding?: number[];
};

export type MemoryGraphEdge = {
  id: string;
  kind: MemoryGraphEdgeKind;
  from: string;
  to: string;
  weight: number;
  reason: string;
};

export type MemoryGraph = {
  version: string;
  last_updated: string;
  nodes: MemoryGraphNode[];
  edges: MemoryGraphEdge[];
};

export type WorkspaceRow = {
  id: number;
  path: string;
  name: string;
  is_linked: boolean;
  created_at: string;
  updated_at: string;
  last_seen: string;
};

export type ProfileRow = {
  name: string;
  global_path: string;
  scope: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
