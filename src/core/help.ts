/** Cached help generation used by init and the help command. */
import { VERSION } from './constants.js';

/** Render the deterministic HELP.md cache. */
export function renderHelp(): string {
  return `# Engram Help v${VERSION}

## Meta Commands
- engram init [--force]
- engram help [topic]
- engram update-help

## Memory Commands
- engram save rule <text>
- engram save skill <text>
- engram save knowledge [text]
- engram load [query]
- engram dry-run [query]
- engram search <query>
- engram verify [workspace|global]
- engram audit [--author email] [--stale] [--low-confidence]

## Operations
- engram health
- engram quality-check
- engram deduplicate [--semantic]
- engram export [--format agents-md|claude-md|cursorrules]
- engram import <bundle.json>
- engram ignore status|check <path>|add <pattern>
- engram set-role <role...>
- engram resolve-conflicts [--dry-run|--auto]
- engram install-hooks
- engram sync
- engram propose <memory-file>
- engram team-dashboard

Every write path requires A/B/C approval before files are changed.
`;
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
