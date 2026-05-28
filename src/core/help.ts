/** Cached help generation used by init and the help command. */
import { VERSION } from './constants.js';

interface CommandHelp { command: string; purpose: string; }
interface HelpSection { title: string; commands: CommandHelp[]; }

const HELP_DATA: HelpSection[] = [
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
      { command: 'engram save rule <text>', purpose: 'Draft and save a new rule memory after user approval' },
      { command: 'engram save skill <text>', purpose: 'Draft and save a new skill memory after user approval' },
      { command: 'engram save knowledge [text]', purpose: 'Draft and save a new knowledge memory (agent summary or text)' },
      { command: 'engram load [query]', purpose: 'Route and load relevant memories into the agent context' },
      { command: 'engram dry-run [query]', purpose: 'Preview routed memory file paths without printing their content' },
      { command: 'engram search <query>', purpose: 'Perform a search across all indexed memories' },
      { command: 'engram verify [workspace|global]', purpose: 'Verify memory file integrity and hashes' },
      { command: 'engram audit [--author email] [--stale] [--low-confidence]', purpose: 'Show audit log of memories with optional filters' }
    ]
  },
  {
    title: 'Operations',
    commands: [
      { command: 'engram health', purpose: 'Analyze and report workspace memory health metrics' },
      { command: 'engram quality-check', purpose: 'Evaluate quality score and potential issues for each memory' },
      { command: 'engram stats', purpose: 'Show total count and statistics of indexed memories' },
      { command: 'engram deduplicate [--semantic]', purpose: 'Detect and report similar or duplicate memory entries' },
      { command: 'engram export [--format agents-md|claude-md|cursorrules]', purpose: 'Export memory to a specific format or JSON bundle' },
      { command: 'engram import <bundle.json>', purpose: 'Import a memory bundle through the approval gate' },
      { command: 'engram ignore status|check <path>|add <pattern>', purpose: 'Manage ignore rules and query file match status' },
      { command: 'engram set-role <role...>', purpose: 'Configure active developer roles for context routing' },
      { command: 'engram set-rule-variant off|light|balanced|strict|status', purpose: 'Configure rule variant strictness level' },
      { command: 'engram resolve-conflicts [--dry-run|--auto]', purpose: 'Preview or resolve Git conflicts in memory files' },
      { command: 'engram install-hooks', purpose: 'Install local Git hooks for automatic index and integrity checks' },
      { command: 'engram install-skillset [all|slash|codex|agents-md|copilot|claude|cursor|gemini|cline|windsurf|antigravity-cli|opencode|mcp]', purpose: 'Generate agent skillset instruction files and slash command adapters' },
      { command: 'engram sync', purpose: 'Sync global memory with Git remote and refresh live-sync targets' },
      { command: 'engram propose <memory-file>', purpose: 'Propose changes to a memory file for review' },
      { command: 'engram team-dashboard', purpose: 'Show team activity dashboard and contributor stats' }
    ]
  }
];

const COMMAND_PREFIXES = [
  'engram save rule', 'engram save skill', 'engram save knowledge', 'engram init', 'engram help',
  'engram update-help', 'engram entry', 'engram load', 'engram dry-run', 'engram search',
  'engram verify', 'engram audit', 'engram health', 'engram quality-check', 'engram stats',
  'engram deduplicate', 'engram export', 'engram import', 'engram ignore', 'engram set-role',
  'engram set-rule-variant', 'engram resolve-conflicts', 'engram install-hooks', 'engram install-skillset',
  'engram sync', 'engram propose', 'engram team-dashboard'
];

function highlightUsage(usage: string): string {
  let commandPart = usage;
  let paramPart = '';
  for (const prefix of COMMAND_PREFIXES) {
    if (usage.startsWith(prefix)) {
      commandPart = prefix;
      paramPart = usage.substring(prefix.length).trim();
      break;
    }
  }
  if (paramPart) return `\x1b[1;36m${commandPart}\x1b[0m \x1b[1;33m${paramPart}\x1b[0m`;
  return `\x1b[1;36m${commandPart}\x1b[0m`;
}

/** Render the deterministic HELP.md cache. */
export function renderHelp(): string {
  let md = `# Engram Help v${VERSION}\n\n`;
  for (const sec of HELP_DATA) {
    md += `## ${sec.title}\n`;
    for (const cmd of sec.commands) md += `- ${cmd.command}: ${cmd.purpose}\n`;
    md += `\n`;
  }
  md += `Every write path requires A/B/C approval before files are changed. Save automatically updates the best matching existing memory, or adds a new memory when no match is found.\n`;
  return md;
}

/** Render beautifully colored terminal help menu. */
export function renderHelpTerminal(topic = ''): string {
  let sections = HELP_DATA;
  if (topic) {
    const lower = topic.toLowerCase();
    sections = HELP_DATA.map(sec => {
      if (sec.title.toLowerCase().includes(lower)) return sec;
      const filtered = sec.commands.filter(cmd =>
        cmd.command.toLowerCase().includes(lower) || cmd.purpose.toLowerCase().includes(lower)
      );
      return filtered.length ? { title: sec.title, commands: filtered } : null;
    }).filter((sec): sec is HelpSection => sec !== null);
  }
  if (!sections.length) sections = HELP_DATA;

  const lines = [`\x1b[1m# Engram Help v${VERSION}\x1b[0m`, ''];
  for (const sec of sections) {
    lines.push(`\x1b[1;37m## ${sec.title}\x1b[0m`);
    for (const cmd of sec.commands) {
      lines.push(`- ${highlightUsage(cmd.command)}: \x1b[90m${cmd.purpose}\x1b[0m`);
    }
    lines.push('');
  }
  lines.push('\x1b[2;37mEvery write path requires A/B/C approval before files are changed. Save automatically updates the best matching existing memory, or adds a new memory when no match is found.\x1b[0m');
  return lines.join('\n');
}

/** Render a short human-facing memory README. */
export function renderMemoryReadme(): string {
  return `# .engram Memory

This folder stores portable AI-agent memory as Markdown.

- rules: durable constraints agents must follow
- skills: repeatable workflows
- knowledge: factual project context
- archive: superseded memory, preserved instead of deleted

Do not hand-edit index or hash files. Use the Engram CLI.
`;
}
