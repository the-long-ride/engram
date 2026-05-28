/** Canonical user-facing command metadata shared by help and skillsets. */
export interface CommandHelp { command: string; purpose: string; }
export interface HelpSection { title: string; commands: CommandHelp[]; }

export const HELP_DATA: HelpSection[] = [
  {
    title: 'Meta Commands',
    commands: [
      { command: 'engram init [--force] [--submodule] [--submodule-remote <git-url>] [--global-remote <git-url>] [--global-branch main]', purpose: 'Initialize workspace memory and optional global Git repository remote' },
      { command: 'engram help [topic]', purpose: 'Show this help menu or specific topic details' },
      { command: 'engram update-help', purpose: 'Regenerate workspace HELP.md file' },
      { command: 'engram entry', purpose: 'Show runtime configurations and global Git repository status' }
    ]
  },
  {
    title: 'Memory Commands',
    commands: [
      { command: 'engram save rule <text>', purpose: 'Draft and save a rule memory after user approval' },
      { command: 'engram save skill <text>', purpose: 'Draft and save a skill memory after user approval' },
      { command: 'engram save knowledge [text]', purpose: 'Draft and save a knowledge memory (agent summary or text)' },
      { command: 'engram load [--all] [query]', purpose: 'Route and load relevant memories into the agent context' },
      { command: 'engram dry-run [--all] [query]', purpose: 'Preview routed memory file paths without printing their content' },
      { command: 'engram search <query>', purpose: 'Perform a search across visible indexed memories' },
      { command: 'engram verify [workspace|global]', purpose: 'Verify memory file integrity and hashes' },
      { command: 'engram rebuild-index [workspace|global]', purpose: 'Explicitly rebuild memory indexes from Markdown files' },
      { command: 'engram audit [--author email] [--stale] [--low-confidence]', purpose: 'Show audit rows for visible memories with optional filters' }
    ]
  },
  {
    title: 'Operations',
    commands: [
      { command: 'engram health', purpose: 'Analyze and report visible memory health metrics' },
      { command: 'engram quality-check', purpose: 'Evaluate quality score and potential issues for visible memories' },
      { command: 'engram stats', purpose: 'Show total count and statistics of visible indexed memories' },
      { command: 'engram deduplicate', purpose: 'Detect and report similar or duplicate visible memory entries' },
      { command: 'engram export [--format agents-md|claude-md|cursorrules]', purpose: 'Export visible memory to a specific format or JSON bundle' },
      { command: 'engram import <bundle.json>', purpose: 'Import a memory bundle through the approval gate' },
      { command: 'engram ignore status|check <path>|add <pattern>', purpose: 'Manage ignore rules and query file match status' },
      { command: 'engram set-role <role...>', purpose: 'Configure active developer roles for context routing' },
      { command: 'engram set-rule-variant off|light|balanced|strict|status', purpose: 'Configure rule variant strictness level' },
      { command: 'engram resolve-conflicts [--dry-run]', purpose: 'Preview or resolve Git conflicts in memory files' },
      { command: 'engram install-hooks', purpose: 'Install local Git hooks for Engram integrity checks' },
      { command: 'engram install-skillset [all|list|target] [--force]', purpose: 'Generate agent skillset instruction files and slash adapters' },
      { command: 'engram sync', purpose: 'Sync global memory with Git remote and refresh enabled live-sync targets' },
      { command: 'engram propose <memory-file>', purpose: 'Propose changes to a memory file for review' },
      { command: 'engram team-dashboard', purpose: 'Show team memory ownership, quality, and coverage stats' }
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
