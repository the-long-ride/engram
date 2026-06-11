/** Canonical user-facing command metadata shared by help and skillsets. */
export interface CommandHelp { command: string; purpose: string; alias?: string; }
export interface HelpSection { title: string; commands: CommandHelp[]; }

export const HELP_DATA: HelpSection[] = [
  {
    title: 'Meta Commands',
    commands: [
      { command: 'engram --version', alias: '-v', purpose: 'Show the installed Engram version' },
      { command: 'engram init [--force] [--global-only] [--scope workspace|global|both] [--no-skillset] [--skillset target] [--submodule] [--submodule-remote <git-url>] [--no-global] [--global-path path] [--global-remote <git-url>] [--global-branch main]', alias: 'i', purpose: 'Initialize or reconcile memory and install compact agent skillset instructions by default' },
      { command: 'engram help [topic]', alias: 'h', purpose: 'Show this help menu or specific topic details & example use-cases' },
      { command: 'engram entry', alias: 'e', purpose: 'Show runtime configurations and global Git repository status' },
      { command: 'engram profile status|list|create|use|merge', alias: 'pf', purpose: 'Manage isolated global memory profiles for company, personal, or team contexts' },
      { command: 'engram update-global-folder <new-path> [--move-from-path path]', alias: 'ugf', purpose: 'Update the configured global memory folder and optionally move an old global root' },
      { command: 'engram completion [bash|zsh|powershell]', alias: 'c', purpose: 'Generate shell completion support for Tab suggestions' },
      { command: 'engram upgrade [--plan] [--latest] [--self] [--memory-only|--global-skillsets-only] [--target agent]', alias: 'up', purpose: 'Recommend package update and refresh generated help, workspace skillsets, global memory, and registered global agent skillsets' }
    ]
  },
  {
    title: 'Memory Commands',
    commands: [
      { command: 'engram save rule [--scope workspace|global|both] [--role role] <text>', alias: 's', purpose: 'Draft and save a rule memory after user approval' },
      { command: 'engram save skill [--scope workspace|global|both] [--role role] <text>', alias: 's', purpose: 'Draft and save a skill memory after user approval' },
      { command: 'engram save workflow [--scope workspace|global|both] [--role role] <text>', alias: 's', purpose: 'Draft and save a repeatable workflow as a skill memory' },
      { command: 'engram save knowledge [--scope workspace|global|both] [--role role] [text]', alias: 's', purpose: 'Draft and save a knowledge memory (agent summary or text)' },
      { command: 'engram save [--scope workspace|global|both] [--role role] [text]', alias: 's', purpose: 'Auto-detect rule, workflow, skill, or knowledge memory from text' },
      { command: 'engram save-session [--file transcript.md] [--scope workspace|global|both] [--role role] [--query-level n] [--accept-all] [session-summary]', alias: 'ss', purpose: 'Propose multiple memories from one or more recent sessions before approval or explicit accept-all' },
      { command: 'engram observe [--file session.md] [--propose] [note]', alias: 'o', purpose: 'Capture sanitized raw notes in inbox, then optionally propose memories through save-session' },
      { command: 'engram take-control [--plan] [--file path] [--dir path] [--include glob] [--exclude glob] [--max-sources n] [--max-chars n] [--all] [--accept-all]', alias: 'tc', purpose: 'Explore existing workspace guidance with agent help, token-light accept-all, and Engram memory writes' },
      { command: 'engram load [--all] [--dry-run] [query]', alias: 'l', purpose: 'Route, refine, and load the configured compact memory pack, or preview routed file paths with --dry-run' },
      { command: 'engram search [--semantic] <query>', alias: 'f', purpose: 'Search visible indexed memories with lexical or local semantic scoring' },
      { command: 'engram graph [--rebuild] [query]', alias: 'g', purpose: 'Inspect the derived layered JSON memory graph, dependency layers, and contradiction candidates' },
      { command: 'engram verify [workspace|global]', alias: 'vf', purpose: 'Verify memory file integrity and hashes' },
      { command: 'engram rebuild-index [workspace|global]', alias: 'ri', purpose: 'Explicitly rebuild memory indexes from Markdown files' },
      { command: 'engram repair [workspace|global]', alias: 'rp', purpose: 'Report invalid memory files that index rebuild would skip' },
      { command: 'engram audit [--author email] [--stale] [--low-confidence]', alias: 'a', purpose: 'Show audit rows for visible memories with optional filters' }
    ]
  },
  {
    title: 'Operations',
    commands: [
      { command: 'engram health', alias: 'he', purpose: 'Analyze and report visible memory health metrics' },
      { command: 'engram quality-check', alias: 'qc', purpose: 'Evaluate quality score and potential issues for visible memories' },
      { command: 'engram stats', alias: 'st', purpose: 'Show total count and statistics of visible indexed memories' },
      { command: 'engram deduplicate', alias: 'dd', purpose: 'Detect and report similar or duplicate visible memory entries' },
      { command: 'engram export [--format agents-md|claude-md|cursorrules]', alias: 'x', purpose: 'Export visible memory to a specific format or JSON bundle' },
      { command: 'engram import [--source agentmemory] [--max n] <bundle.json>', alias: 'im', purpose: 'Import Engram or agentmemory JSON through the approval gate' },
      { command: 'engram archive [--reason text] <memory-id|file>', alias: 'ar', purpose: 'Move wrong or superseded memory out of active routing after approval' },
      { command: 'engram benchmark <cases.json>', alias: 'bm', purpose: 'Measure graph-aware retrieval hit rate for query/expected-memory cases' },
      { command: 'engram ignore status|check <path>|add <pattern>', alias: 'ig', purpose: 'Manage ignore rules and query file match status' },
      { command: 'engram set-role <role...>', alias: 'sr', purpose: 'Configure active developer roles for context routing' },
      { command: 'engram set-save-target workspace|global|both|status', purpose: 'Configure where normal save writes by default' },
      { command: 'engram set-load-limit 1..32|status|reset', alias: 'll', purpose: 'Configure how many related memories normal load returns before --all is needed' },
      { command: 'engram set-rule-variant off|light|balanced|strict|status', alias: 'rv', purpose: 'Tune rule strictness: strict helps lower-tier models stay controlled, while top-tier models often work better with light or balanced so strict wording does not limit their reasoning' },
      { command: 'engram resolve-conflicts [--dry-run]', alias: 'rc', purpose: 'Preview or resolve Git conflicts in memory files' },
      { command: 'engram install-hooks', alias: 'ih', purpose: 'Install local Git hooks for Engram integrity checks' },
      { command: 'engram install-skillset [all|list|target] [--global] [--force]', alias: 'is', purpose: 'Generate workspace or global agent skillset instruction files and slash adapters' },
      { command: 'engram clone-memory workspace global [--force] [--dry-run] [--restructure] [--accept-all]', alias: 'cm', purpose: 'Clone active memory Markdown between workspace and global scopes; --restructure uses save-session-style approval instead of raw file copy' },
      { command: 'engram sync', alias: 'sy', purpose: 'Sync global memory with Git remote and refresh enabled live-sync targets' },
    ]
  }
];

/** Return command prefixes used for terminal highlighting. */
export function commandPrefixes(): string[] {
  return HELP_DATA.flatMap((section) => section.commands.map((item) => item.command.replace(/\s+\[.*$|\s+<.*$/u, '')));
}

/** Render the slash adapter command surface from the canonical registry. */
export function slashCommandSurface(): string {
  return HELP_DATA.flatMap((section) => section.commands)
    .map((item) => item.command.replace(/^engram\s+/, ''))
    .map((command) => `- \`/engram ${command}\` -> \`engram ${command}\``)
    .join('\n');
}

/** Map short user-facing command aliases to canonical top-level commands. */
export function commandAliases(): Record<string, string> {
  const aliases: Record<string, string> = {};
  for (const item of HELP_DATA.flatMap((section) => section.commands)) {
    if (!item.alias) continue;
    const command = item.command.replace(/^engram\s+/, '').trim().split(/\s+/u)[0];
    aliases[item.alias] = command;
  }
  return aliases;
}

/** Normalize short aliases before command dispatch. */
export function canonicalCommand(command: string): string {
  return commandAliases()[command] ?? command;
}

/** Return the top-level command names for shell completion. */
export function commandNames(): string[] {
  const names = HELP_DATA.flatMap((section) => section.commands)
    .map((item) => item.command.replace(/^engram\s+/, '').trim().split(/\s+/u)[0]);
  const aliases = HELP_DATA.flatMap((section) => section.commands)
    .map((item) => item.alias)
    .filter((alias): alias is string => Boolean(alias));
  return [...new Set([...names, ...aliases])];
}
