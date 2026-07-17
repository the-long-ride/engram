export type EntryFieldDoc = {
  key: string;
  label: string;
  group: string;
  control: 'toggle' | 'select' | 'number' | 'text' | 'textarea' | 'list' | 'roles' | 'scope-chips' | 'type-chips' | 'action-toggle';
  defaultValue?: string;
  allowedValues?: string[];
  min?: number;
  max?: number;
  step?: number;
  risk: 'normal' | 'caution' | 'risky';
  shortDescription: string;
  useCases: string[];
  guidelines: string[];
  avoidWhen?: string[];
  sideEffects?: string[];
  cliEquivalent?: string[];
  examples?: string[];
  troubleshooting?: string[];
  relatedPages?: string[];
};

export const ENTRY_FIELDS: EntryFieldDoc[] = [
  {
    key: 'enabled', label: 'Enabled', group: 'Core', control: 'toggle',
    defaultValue: 'true', risk: 'risky',
    shortDescription: 'Master switch. Disabling stops Engram behavior entirely.',
    useCases: ['Temporary shutdown during testing.', 'Debugging agent behavior without Engram context.'],
    guidelines: ['Keep enabled for normal use.', 'Disable only for short test windows.'],
    avoidWhen: ['Normal daily work.', 'Team sync workflows.'],
    sideEffects: ['Agents stop receiving Engram context.', 'Hooks and MCP tools become unavailable.'],
    troubleshooting: ['Re-enable: engram config set enabled true.', 'Check engram config view if memory still does not load.'],
  },
  {
    key: 'scope', label: 'Save Target', group: 'Core', control: 'select',
    defaultValue: 'both', allowedValues: ['workspace', 'global', 'both'], risk: 'risky',
    shortDescription: 'Default scope for save commands. Controls where new approved memories are saved.',
    useCases: ['workspace: repo-specific rules and decisions.', 'global: personal preferences that follow you across repos.', 'both: fresh installs that want both scopes.'],
    guidelines: ['Use workspace for repo-specific memory.', 'Use global for personal/team memory.', 'Use both for new installations.'],
    cliEquivalent: ['engram set-save-target workspace|global|both'],
    troubleshooting: ['engram set-save-target status to see the current target.'],
  },
  {
    key: 'update', label: 'Update Mode', group: 'Core', control: 'select',
    defaultValue: 'auto', allowedValues: ['auto', 'manual', 'off'], risk: 'normal',
    shortDescription: 'Controls Engram’s quiet one-time package upgrade check during normal commands.',
    useCases: ['auto: receive compatibility updates automatically.', 'manual: upgrade only when you choose.', 'off: disable automatic checks in controlled environments.'],
    guidelines: ['Keep auto for normal installations.', 'Use manual or off only when release management is handled externally.'],
    cliEquivalent: ['engram config set update auto|manual|off'],
  },
  {
    key: 'read', label: 'Read Mode', group: 'Core', control: 'select',
    defaultValue: 'auto', allowedValues: ['auto', 'startup', 'always', 'manual', 'off'], risk: 'normal',
    shortDescription: 'Controls when agent hooks inject memory context.',
    useCases: ['auto: session start + reinject on context change.', 'startup: load only at session start.', 'manual: human controls when memory loads.', 'off: no automatic injection.'],
    guidelines: ['auto is the best default for most users.', 'Use manual or off for zero-automation workflows.'],
    cliEquivalent: ['engram set-read auto|startup|always|manual|off'],
    troubleshooting: ['If hooks are not injecting, check that read is not off or manual.'],
  },
  {
    key: 'proof', label: 'Proof Mode', group: 'Core', control: 'select',
    defaultValue: 'off', allowedValues: ['off', 'compact'], risk: 'normal',
    shortDescription: 'Whether hooks append an Engram proof line on eligible turns.',
    useCases: ['compact: debug hook injection behavior.', 'off: clean agent context without proof lines.'],
    guidelines: ['Enable compact for debugging.', 'Keep off for production use.'],
    cliEquivalent: ['engram set-proof off|compact'],
  },
  {
    key: 'global_path', label: 'Global Memory Path', group: 'Core', control: 'text',
    defaultValue: undefined, risk: 'risky',
    shortDescription: 'Filesystem path to the global memory folder.',
    useCases: ['Keep personal memory outside a single repo.', 'Share global memory across multiple agent tools.', 'Point a profile to a client-specific memory folder.'],
    guidelines: ['Use a stable, user-owned folder such as ~/Documents/engram.', 'Avoid temp folders, synced public folders, and directories you cannot write to.', 'Prefer absolute paths.'],
    avoidWhen: ['Cloud-synced public folders can leak private memory.'],
    cliEquivalent: ['engram update-global-folder <path>', 'engram ugf <path>'],
    examples: ['~/Documents/engram', '/home/user/engram-global'],
    troubleshooting: ['Ensure write permission on the path.', 'Validate the folder exists or can be created.', 'Run engram entry and open the Construct tab, or run engram config view, to see the resolved global path.'],
  },
  {
    key: 'default_profile', label: 'Default Profile', group: 'Core', control: 'select',
    defaultValue: undefined, risk: 'risky',
    shortDescription: 'Profile used when none is explicitly set.',
    useCases: ['Set a user default for all workspaces.', 'Leave empty when workspace defaults handle it.'],
    guidelines: ['Profile name must use letters, numbers, dot, underscore, or hyphen.', 'Confirm the profile exists before setting it as default.'],
    cliEquivalent: ['engram profile use <name>'],
    relatedPages: ['../concepts/profiles'],
    troubleshooting: ['Check currently loaded profile with: engram profile status.', 'Switch profile with: engram profile use <name>.'],
  },
  {
    key: 'roles', label: 'Active Roles', group: 'Core', control: 'roles',
    defaultValue: undefined, risk: 'normal',
    shortDescription: 'Comma-separated role names for memory context routing.',
    useCases: ['frontend: route frontend rules.', 'backend security: route backend + security rules.'],
    guidelines: ['Role names must match ^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$.', 'Clear roles with engram set-role.'],
    cliEquivalent: ['engram set-role frontend', 'engram set-role backend security', 'engram set-role'],
    troubleshooting: ['Empty roles = no role filtering.'],
  },
  {
    key: 'ignore.source', label: 'Ignore Source', group: 'Ignore Rules', control: 'select',
    defaultValue: 'engramignore', allowedValues: ['engramignore', 'gitignore', 'both', 'off'], risk: 'normal',
    shortDescription: 'Selects which ignore-file sources are applied while Engram scans files.',
    useCases: ['engramignore: use Engram-specific rules.', 'both: honor project Git and Engram patterns.', 'off: scan without ignore-file rules.'],
    guidelines: ['Use both when project and memory privacy rules should apply together.'],
  },
  {
    key: 'ignore.gitignore_path', label: 'Gitignore Path', group: 'Ignore Rules', control: 'text',
    defaultValue: '.gitignore', risk: 'normal',
    shortDescription: 'Path to the Git ignore file read when Git ignore rules are enabled.',
    useCases: ['Use a custom path in a nested workspace.'],
    guidelines: ['Keep the default unless the workspace uses a nonstandard layout.'],
  },
  {
    key: 'ignore.engramignore_path', label: 'Engramignore Path', group: 'Ignore Rules', control: 'text',
    defaultValue: '.engramignore', risk: 'normal',
    shortDescription: 'Path to the Engram-specific ignore file.',
    useCases: ['Use a workspace-local privacy and exclusion policy.'],
    guidelines: ['Keep the default path for portable workspace configuration.'],
  },
  {
    key: 'ignore.global_engramignore', label: 'Global Engramignore', group: 'Ignore Rules', control: 'toggle',
    defaultValue: 'true', risk: 'normal',
    shortDescription: 'Applies global ignore rules when global memory is configured.',
    useCases: ['Share a personal exclusion baseline across workspaces.'],
    guidelines: ['Keep enabled unless a workspace must be isolated from global rules.'],
  },
  {
    key: 'ignore.also_ignore', label: 'Additional Patterns', group: 'Ignore Rules', control: 'list',
    defaultValue: '*.secret, private/**', risk: 'normal',
    shortDescription: 'Additional glob patterns excluded from scans.',
    useCases: ['Exclude secrets, private folders, or generated artifacts.'],
    guidelines: ['Add only patterns you intend to hide from Engram operations.', 'Use comma-separated glob patterns in the panel.'],
  },
  {
    key: 'ignore.global_patterns', label: 'Global Ignore Patterns', group: 'Ignore Rules', control: 'textarea',
    defaultValue: undefined, risk: 'normal',
    shortDescription: 'Global glob patterns synchronized into a managed block in each workspace .engramignore during inject.',
    useCases: ['Apply personal privacy exclusions to every workspace.'],
    guidelines: ['Enter one glob per line.', 'Human-authored lines outside the managed block are preserved.'],
    sideEffects: ['Each engram inject updates only the managed global-pattern block.'],
  },
  {
    key: 'load.limit', label: 'Load Limit', group: 'Load Routing', control: 'number',
    defaultValue: '8', min: 1, max: 32, risk: 'normal',
    shortDescription: 'Max memories returned by normal load.',
    useCases: ['Smaller values for low-context models.', 'Higher values for deep architecture tasks.'],
    guidelines: ['Default 8 works for most models.', 'Raising too high increases context bloat.'],
    cliEquivalent: ['engram set-load-limit <n>', 'engram set-load-limit reset'],
  },
  {
    key: 'memory.rule_line_target', label: 'Rule Line Target', group: 'Memory Limits', control: 'number',
    defaultValue: '70', min: 50, max: 200, step: 10, risk: 'normal',
    shortDescription: 'Recommended line count target for rule memories.',
    useCases: ['Keep rules concise for better routing.'],
    guidelines: ['70 lines fits most models.', 'Larger rules may not route well.'],
    cliEquivalent: ['engram config set memory.rule_line_target <n>'],
  },
  {
    key: 'memory.rule_line_hard_limit', label: 'Rule Line Hard Limit', group: 'Memory Limits', control: 'number',
    defaultValue: '100', min: 50, max: 200, step: 10, risk: 'risky',
    shortDescription: 'Maximum allowed line count for rule memories.',
    useCases: ['Cap rule memory size to prevent context bloat.'],
    guidelines: ['Higher limits increase context bloat and reduce quality.', 'Keep close to the target value.'],
    troubleshooting: ['Raising this can increase context bloat and reduce routing quality. Keep rules concise.'],
  },
  {
    key: 'graph.enabled', label: 'graph.enabled', group: 'Graph', control: 'toggle',
    defaultValue: 'true', risk: 'normal',
    shortDescription: 'Enables dependency/relationship routing.',
    useCases: ['Enable depends_on prerequisites.', 'Enable graph view in Memories tab.'],
    guidelines: ['Keep enabled for dependency routing.'],
    cliEquivalent: ['engram config set graph.enabled true|false'],
  },
  {
    key: 'graph.max_related', label: 'Max Related', group: 'Graph', control: 'number',
    defaultValue: '4', min: 1, max: 20, risk: 'normal',
    shortDescription: 'Limits related memories pulled through graph signals.',
    useCases: ['Lower for cleaner context.', 'Higher for deeper cross-referencing.'],
    guidelines: ['Default 4 balances context size and signal.'],
    cliEquivalent: ['engram config set graph.max_related <n>'],
  },
  {
    key: 'graph.min_related_score', label: 'Min Score', group: 'Graph', control: 'number',
    defaultValue: '0.22', min: 0, max: 1, step: 0.01, risk: 'normal',
    shortDescription: 'Minimum similarity score for graph edges.',
    useCases: ['Raise for precision.', 'Lower for recall.'],
    guidelines: ['0.22 is a balanced default.', 'Higher values reduce noise.'],
    cliEquivalent: ['engram config set graph.min_related_score <n>'],
  },
  {
    key: 'vector.enabled', label: 'vector.enabled', group: 'Vector Search', control: 'toggle',
    defaultValue: 'true', risk: 'normal',
    shortDescription: 'Enables optional local vector routing.',
    useCases: ['Enable for local vector search fallback.', 'Disable if vector latency is unwanted.'],
    guidelines: ['No cloud dependency.', 'Requires sqlite-vec peer dependency.'],
    cliEquivalent: ['engram config set vector.enabled true|false'],
  },
  {
    key: 'vector.provider', label: 'Provider', group: 'Vector Search', control: 'select',
    defaultValue: 'sqlite-vec', allowedValues: ['sqlite-vec'], risk: 'normal',
    shortDescription: 'Local vector-search provider used by the optional vector sidecar.',
    useCases: ['Keep the supported local provider selected for vector routing.'],
    guidelines: ['sqlite-vec is the only currently supported provider.', 'Disable vector search instead of entering an unsupported provider.'],
  },
  {
    key: 'vector.auto_threshold', label: 'Auto Threshold', group: 'Vector Search', control: 'number',
    defaultValue: '100', min: 10, max: 1000, risk: 'normal',
    shortDescription: 'Memory count at which vector search activates.',
    useCases: ['Small vaults may not need vector search.'],
    guidelines: ['100 is reasonable for most vaults.', 'Set lower to activate sooner.'],
    cliEquivalent: ['engram config set vector.auto_threshold <n>'],
  },
  {
    key: 'vector.candidate_pool', label: 'Candidate Pool', group: 'Vector Search', control: 'number',
    defaultValue: '24', min: 8, max: 100, risk: 'normal',
    shortDescription: 'How many candidates vector search considers before reranking.',
    useCases: ['Higher improves recall.', 'Lower reduces latency.'],
    guidelines: ['24 balances recall and latency.'],
  },
  {
    key: 'vector.dimensions', label: 'Dimensions', group: 'Vector Search', control: 'number',
    defaultValue: '64', min: 16, max: 512, risk: 'normal',
    shortDescription: 'Embedding dimensions for the local vector sidecar.',
    useCases: ['Higher may improve precision.', 'Changing requires a rebuild.'],
    guidelines: ['64 is a reasonable default.', 'Requires rebuild after change.'],
  },
  {
    key: 'rule_variants.enabled', label: 'rule_variants.enabled', group: 'Rule Variants', control: 'toggle',
    defaultValue: 'false', risk: 'normal',
    shortDescription: 'Enables role/strictness variants.',
    useCases: ['Enable when teams need light/balanced/strict routing.'],
    guidelines: ['Keep disabled unless variants are needed.'],
  },
  {
    key: 'rule_variants.active', label: 'Active Variant', group: 'Rule Variants', control: 'select',
    defaultValue: 'balanced', allowedValues: ['light', 'balanced', 'strict'], risk: 'normal',
    shortDescription: 'Controls strictness of loaded rules.',
    useCases: ['strict: lower-tier models.', 'light/balanced: stronger models.'],
    guidelines: ['balanced is the safe default.', 'strict helps weaker models stay controlled.'],
    cliEquivalent: ['engram set-rule-variant strict|balanced|light'],
  },
  {
    key: 'live_sync.enabled', label: 'live_sync.enabled', group: 'Live Sync', control: 'toggle',
    defaultValue: 'false', risk: 'normal',
    shortDescription: 'Sync generated agent context files on save.',
    useCases: ['Keep linked instruction files up to date.'],
    guidelines: ['Enable for automatic sync.', 'Disable for manual control.'],
  },
  {
    key: 'live_sync.targets', label: 'Targets', group: 'Live Sync', control: 'list',
    defaultValue: 'agents-md, claude-md, cursorrules', risk: 'normal',
    shortDescription: 'Generated agent-context targets refreshed when live sync runs.',
    useCases: ['Sync instruction files for selected agent hosts.'],
    guidelines: ['Use the supported target names required by linked agents.', 'Use comma-separated values in the panel.'],
  },
  {
    key: 'global_git.enabled', label: 'global_git.enabled', group: 'Global Git', control: 'toggle',
    defaultValue: 'true', risk: 'risky',
    shortDescription: 'Enables Git behavior for global memory.',
    useCases: ['Enable for audit history and team sync.', 'Disable for solo use without Git.'],
    guidelines: ['Keep enabled if sharing global memory through Git.'],
    troubleshooting: ['Disable if you do not want Git tracking global memory.'],
  },
  {
    key: 'global_git.remote', label: 'Remote', group: 'Global Git', control: 'text',
    defaultValue: 'origin', risk: 'risky',
    shortDescription: 'Git remote name.',
    useCases: ['origin is standard.', 'Use a different name for a separate remote.'],
    guidelines: ['Cannot contain whitespace.', 'origin is the standard name.'],
    troubleshooting: ['Check whitespace; remotes cannot contain spaces.'],
  },
  {
    key: 'global_git.remote_url', label: 'Remote URL', group: 'Global Git', control: 'text',
    defaultValue: undefined, risk: 'risky',
    shortDescription: 'Git remote URL for shared global memory.',
    useCases: ['Share global memory with a team.', 'Back up global memory to a private repo.'],
    guidelines: ['Use HTTPS or SSH.', 'Keep the URL private if memory is private.'],
    examples: ['https://github.com/user/engram-global.git', 'git@github.com:user/engram-global.git'],
    troubleshooting: ['Must be a valid Git remote URL.'],
  },
  {
    key: 'global_git.branch', label: 'Branch', group: 'Global Git', control: 'text',
    defaultValue: 'main', risk: 'risky',
    shortDescription: 'Target branch for sync.',
    useCases: ['main for standard workflow.', 'Custom branch for team naming conventions.'],
    guidelines: ['main is standard.', 'Cannot contain whitespace.'],
    troubleshooting: ['Check your repository branch name if git actions fail.', 'Verify branch exists in your remote.'],
  },
  {
    key: 'global_git.auto_sync', label: 'Auto Sync', group: 'Global Git', control: 'toggle',
    defaultValue: 'true', risk: 'risky',
    shortDescription: 'Auto pull/push behavior.',
    useCases: ['Enable for solo use.', 'Disable for manual team sync review.'],
    guidelines: ['Review memory diffs before pushing in teams.', 'Solo users can keep auto sync enabled.'],
    troubleshooting: ['Check git output logs in CLI if sync hangs.', 'Verify remote ssh key or https auth.'],
  },
  {
    key: 'global_git.auto_resolve', label: 'Auto Resolve', group: 'Global Git', control: 'toggle',
    defaultValue: 'true', risk: 'risky',
    shortDescription: 'Auto conflict handling.',
    useCases: ['Enable for solo use.', 'Disable for team use where manual review is needed.'],
    guidelines: ['Auto resolving may mask memory diffs.', 'Teams should review conflicts manually.'],
    troubleshooting: ['Disable if conflicts are being resolved incorrectly.'],
  },
  {
    key: 'pattern_mining.enabled', label: 'pattern_mining.enabled', group: 'Pattern Mining', control: 'toggle',
    defaultValue: 'false', risk: 'normal',
    shortDescription: 'Experimental recurring-pattern extraction.',
    useCases: ['Experimental feature.', 'Disable for stable workflows.'],
    guidelines: ['Disabled by default.', 'Enable only when experimenting with pattern mining.'],
  },
  {
    key: 'pattern_mining.threshold', label: 'Threshold', group: 'Pattern Mining', control: 'number',
    defaultValue: '3', min: 1, max: 20, risk: 'normal',
    shortDescription: 'Number of repetitions before a pattern candidate matters.',
    useCases: ['Lower for aggressive pattern detection.', 'Higher for conservative detection.'],
    guidelines: ['3 is a reasonable default.'],
  },
  {
    key: 'pattern_mining.lookback_sessions', label: 'Lookback Sessions', group: 'Pattern Mining', control: 'number',
    defaultValue: '20', min: 1, max: 100, risk: 'normal',
    shortDescription: 'How many recent sessions to inspect.',
    useCases: ['Higher for broader pattern detection.', 'Lower for faster detection.'],
    guidelines: ['20 sessions balances breadth and latency.'],
  },
  {
    key: 'pr_workflow.enabled', label: 'pr_workflow.enabled', group: 'PR Workflow', control: 'toggle',
    defaultValue: 'false', risk: 'risky',
    shortDescription: 'Experimental team PR workflow for memory changes.',
    useCases: ['Document as experimental unless complete.'],
    guidelines: ['Disabled by default.', 'Enable only when the PR workflow is complete.'],
    troubleshooting: ['PR workflows are experimental; disable if you experience unintended branching or merge halts.'],
  },
  {
    key: 'pr_workflow.provider', label: 'Provider', group: 'PR Workflow', control: 'text',
    defaultValue: undefined, risk: 'risky',
    shortDescription: 'Provider identifier for the experimental memory pull-request workflow.',
    useCases: ['Configure the team provider used by an existing PR workflow.'],
    guidelines: ['Leave empty unless the workflow integration is configured for your team.'],
    troubleshooting: ['Disable PR workflow if provider configuration is incomplete.'],
  },
  {
    key: 'pr_workflow.repo', label: 'Repository', group: 'PR Workflow', control: 'text',
    defaultValue: undefined, risk: 'risky',
    shortDescription: 'Repository identifier used by the experimental memory pull-request workflow.',
    useCases: ['Target the repository that receives memory review changes.'],
    guidelines: ['Leave empty unless the team workflow requires it.'],
    troubleshooting: ['Verify repository access and provider configuration before enabling workflow.'],
  },
  {
    key: 'pr_workflow.target_branch', label: 'Target Branch', group: 'PR Workflow', control: 'text',
    defaultValue: 'main', risk: 'risky',
    shortDescription: 'Branch receiving memory PRs.',
    useCases: ['main for standard workflow.'],
    guidelines: ['Relate to global Git branch.', 'Cannot contain whitespace.'],
    troubleshooting: ['Ensure the target branch exists on the remote repository.'],
  },
  {
    key: 'encryption.enabled', label: 'encryption.enabled', group: 'Encryption', control: 'toggle',
    defaultValue: 'false', risk: 'risky',
    shortDescription: 'Future or advanced encryption mode.',
    useCases: ['Document current limitations clearly.'],
    guidelines: ['Encrypted storage is not implemented yet.', 'Do not enable unless code supports it.'],
    troubleshooting: ['Encryption config exists, but encrypted storage is not implemented yet.'],
  },
  {
    key: 'encryption.scope', label: 'Scope', group: 'Encryption', control: 'select',
    defaultValue: 'global', allowedValues: ['workspace', 'global'], risk: 'risky',
    shortDescription: 'Which scope encryption applies to.',
    useCases: ['global: encrypt global memory.', 'workspace: encrypt workspace memory.'],
    guidelines: ['Encrypted storage is not implemented yet.'],
    troubleshooting: ['Encryption scope defines the target, but encrypted storage is not implemented yet.'],
  },
  {
    key: 'encryption.key_source', label: 'Key Source', group: 'Encryption', control: 'select',
    defaultValue: 'portable-file', allowedValues: ['portable-file'], risk: 'risky',
    shortDescription: 'Key source strategy.',
    useCases: ['portable-file: key stored in a portable file.'],
    guidelines: ['Backup the key file.', 'Key loss = memory loss.'],
    troubleshooting: ['Backup/loss risk: if the key file is lost, encrypted memory is unrecoverable.'],
  },
];

const FIELDS_BY_KEY = new Map(ENTRY_FIELDS.map((f) => [f.key, f]));

const FIELDS_BY_GROUP: Record<string, EntryFieldDoc[]> = {};
for (const f of ENTRY_FIELDS) {
  (FIELDS_BY_GROUP[f.group] ??= []).push(f);
}

export function getFieldDoc(key: string): EntryFieldDoc | undefined {
  return FIELDS_BY_KEY.get(key);
}

export function entryFieldsByGroup(group?: string): EntryFieldDoc[] {
  if (group) return FIELDS_BY_GROUP[group] ?? [];
  return ENTRY_FIELDS;
}

export function allEntryFieldDocs(): EntryFieldDoc[] {
  return ENTRY_FIELDS;
}
