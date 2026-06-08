/** Cached help generation used by init and the help command. */
import { VERSION } from '../runtime/constants.js';
import { HELP_DATA, commandPrefixes, type HelpSection } from './command-registry.js';
import { detailForTopic, type CommandTopicHelp } from './help-topics.js';
import { terminalWidth, wrapText } from './format.js';

const COMMAND_PREFIXES = commandPrefixes().sort((a, b) => b.length - a.length);
const gray = (text: string): string => `\x1b[90m${text}\x1b[0m`;

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
    for (const cmd of sec.commands) {
      const alias = cmd.alias ? ` (short: \`engram ${cmd.alias}\`)` : '';
      md += `- ${cmd.command}${alias}: ${cmd.purpose}\n`;
    }
    md += `\n`;
  }
  md += `Run \`engram help <topic>\` for command examples and use cases.\n\n`;
  md += `Every write path requires A/B/C approval before files are changed. Save automatically updates the best matching existing memory, or adds a new memory when no match is found. Fresh installs default normal saves to both workspace and global when global memory is configured; use \`engram set-save-target\` or \`--scope\` to choose workspace, global, or both.\n`;
  return md;
}

/** Render beautifully colored terminal help menu. */
export function renderHelpTerminal(topic = ''): string {
  const detail = topic ? detailForTopic(topic) : undefined;
  if (detail) return renderTopicHelpTerminal(detail);
  let sections = HELP_DATA;
  if (topic) {
    const lower = topic.toLowerCase();
    sections = HELP_DATA.map(sec => {
      if (sec.title.toLowerCase().includes(lower)) return sec;
      const filtered = sec.commands.filter(cmd =>
        cmd.command.toLowerCase().includes(lower) || cmd.purpose.toLowerCase().includes(lower) || cmd.alias === lower
      );
      return filtered.length ? { title: sec.title, commands: filtered } : null;
    }).filter((sec): sec is HelpSection => sec !== null);
  }
  if (!sections.length) sections = HELP_DATA;

  const lines = [`\x1b[1m# Engram Help v${VERSION}\x1b[0m`, ''];
  for (const sec of sections) {
    lines.push(`\x1b[1;37m## ${sec.title}\x1b[0m`);
    for (const cmd of sec.commands) {
      lines.push(`- ${highlightUsage(cmd.command)}`);
      lines.push(...colorWrapped(cmd.purpose, '  ', gray));
      if (cmd.alias) lines.push(`  ${gray(`short: engram ${cmd.alias}`)}`);
    }
    lines.push('');
  }
  lines.push(...colorWrapped('Run `engram help <topic>` for command examples and use cases. Every write path requires A/B/C approval before files are changed. Fresh installs default normal saves to both workspace and global when global memory is configured; use `engram set-save-target` or `--scope` to choose workspace, global, or both.', '', (text) => `\x1b[2;37m${text}\x1b[0m`));
  return lines.join('\n');
}

function renderTopicHelpTerminal(detail: CommandTopicHelp): string {
  const lines = [`\x1b[1m# ${detail.title}\x1b[0m`, '', ...colorWrapped(detail.summary, '', gray), ''];
  lines.push('\x1b[1;37m## Use Cases\x1b[0m');
  for (const item of detail.useCases) lines.push(...wrapText(item, '  ', '- ').split('\n'));
  lines.push('', '\x1b[1;37m## Examples\x1b[0m');
  for (const example of detail.examples) lines.push(`- \x1b[1;36m${example}\x1b[0m`);
  if (detail.notes?.length) {
    lines.push('', '\x1b[1;37m## Notes\x1b[0m');
    for (const note of detail.notes) lines.push(...wrapText(note, '  ', '- ').split('\n').map(gray));
  }
  return lines.join('\n');
}

function colorWrapped(text: string, indent: string, color: (line: string) => string): string[] {
  return wrapText(text, indent, indent, terminalWidth()).split('\n').map(color);
}

/** Render a short human-facing memory README. */
export function renderMemoryReadme(): string {
  return `# .agents/.engram Memory

This folder stores portable AI-agent memory as Markdown.

- rules: durable constraints agents must follow
- skills: repeatable workflows
- knowledge: factual project context
- archive: superseded memory, preserved instead of deleted

Do not hand-edit index or hash files. Use the Engram CLI.
`;
}
