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
      { command: 'engram entry', purpose: 'Show runtime configurations and global Git repository status' },
      { command: 'engram completion [bash|zsh]', purpose: 'Generate shell completion support for Tab suggestions' }
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

/** Return the top-level command names for shell completion. */
export function commandNames(): string[] {
  const names = HELP_DATA.flatMap((section) => section.commands)
    .map((item) => item.command.replace(/^engram\s+/, '').trim().split(/\s+/u)[0]);
  return [...new Set(names)];
}

/** Return a shell completion script for the current command surface. */
export function completionScript(shell: 'bash' | 'zsh' = 'bash'): string {
  const commands = commandNames().join(' ');
  const saveTypes = ['rule', 'skill', 'knowledge'].join(' ');
  const scopes = ['workspace', 'global'].join(' ');
  const formats = ['agents-md', 'claude-md', 'cursorrules'].join(' ');
  const shells = ['bash', 'zsh'].join(' ');
  const ruleVariants = ['off', 'light', 'balanced', 'strict', 'status'].join(' ');
  const ignoreActions = ['status', 'check', 'add'].join(' ');
  const skillsetTargets = [
    'all', 'list', 'agents-md', 'codex', 'copilot', 'claude', 'cursor',
    'gemini', 'cline', 'windsurf', 'antigravity', 'antigravity-cli',
    'opencode', 'open-code', 'mcp', 'slash'
  ].join(' ');
  if (shell === 'zsh') {
    return [
      '#compdef engram',
      '_engram() {',
      '  local -a commands',
      `  commands=(${commands})`,
      '  if (( CURRENT == 2 )); then',
      '    compadd -- "${commands[@]}"',
      '    return',
      '  fi',
      '  case $words[2] in',
      '    init)',
      '      _arguments "--force" "--submodule" "--submodule-remote=[git-url]" "--global-remote=[git-url]" "--global-branch=[branch]"',
      '      ;;',
      '    completion)',
      `      _arguments "1:shell:(${shells})"`,
      '      ;;',
      '    save)',
      `      _arguments "--scope[write scope]:scope:(${scopes})" "1:memory type:(${saveTypes})"`,
      '      ;;',
      '    load|dry-run)',
      '      _arguments "--all" "1:query: "',
      '      ;;',
      '    search|propose)',
      '      _arguments "1:query: "',
      '      ;;',
      '    verify|rebuild-index)',
      `      _arguments "1:scope:(${scopes})"`,
      '      ;;',
      '    export)',
      `      _arguments "--format[output format]:format:(${formats})"`,
      '      ;;',
      '    ignore)',
      `      _arguments "1:action:(${ignoreActions})"`,
      '      ;;',
      '    set-rule-variant)',
      `      _arguments "1:variant:(${ruleVariants})"`,
      '      ;;',
      '    resolve-conflicts)',
      '      _arguments "--dry-run"',
      '      ;;',
      '    install-skillset)',
      `      _arguments "--force" "1:target:(${skillsetTargets})"`,
      '      ;;',
      '  esac',
      '}',
      'compdef _engram engram'
    ].join('\n');
  }
  return [
    '_engram() {',
    '  local cur prev words cword',
    '  if declare -F _init_completion >/dev/null; then',
    '    _init_completion || return',
    '  else',
    '    cur="${COMP_WORDS[COMP_CWORD]}"',
    '    prev="${COMP_WORDS[COMP_CWORD-1]}"',
    '    words=("${COMP_WORDS[@]}")',
    '    cword=$COMP_CWORD',
    '  fi',
    `  local commands="${commands}"`,
    `  local save_types="${saveTypes}"`,
    `  local scopes="${scopes}"`,
    `  local formats="${formats}"`,
    `  local shells="${shells}"`,
    `  local rule_variants="${ruleVariants}"`,
    `  local ignore_actions="${ignoreActions}"`,
    `  local skillset_targets="${skillsetTargets}"`,
    '  case "$prev" in',
    '    --format)',
    '      COMPREPLY=( $(compgen -W "$formats" -- "$cur") )',
    '      return',
    '      ;;',
    '    --scope)',
    '      COMPREPLY=( $(compgen -W "$scopes" -- "$cur") )',
    '      return',
    '      ;;',
    '  esac',
    '  case "${words[1]}" in',
    '    init)',
    '      COMPREPLY=( $(compgen -W "--force --submodule --submodule-remote --global-remote --global-branch" -- "$cur") )',
    '      return',
    '      ;;',
    '    completion)',
    '      if [[ $cword -eq 2 ]]; then COMPREPLY=( $(compgen -W "$shells" -- "$cur") ); return; fi',
    '      COMPREPLY=()',
    '      return',
    '      ;;',
    '    save)',
    '      if [[ $cword -eq 2 ]]; then COMPREPLY=( $(compgen -W "$save_types --scope" -- "$cur") ); return; fi',
    '      COMPREPLY=()',
    '      return',
    '      ;;',
    '    load|dry-run)',
    '      COMPREPLY=( $(compgen -W "--all" -- "$cur") )',
    '      return',
    '      ;;',
    '    verify|rebuild-index)',
    '      if [[ $cword -eq 2 ]]; then COMPREPLY=( $(compgen -W "$scopes" -- "$cur") ); return; fi',
    '      COMPREPLY=()',
    '      return',
    '      ;;',
    '    export)',
    '      COMPREPLY=( $(compgen -W "--format" -- "$cur") )',
    '      return',
    '      ;;',
    '    ignore)',
    '      if [[ $cword -eq 2 ]]; then COMPREPLY=( $(compgen -W "$ignore_actions" -- "$cur") ); return; fi',
    '      COMPREPLY=()',
    '      return',
    '      ;;',
    '    set-rule-variant)',
    '      if [[ $cword -eq 2 ]]; then COMPREPLY=( $(compgen -W "$rule_variants" -- "$cur") ); return; fi',
    '      COMPREPLY=()',
    '      return',
    '      ;;',
    '    resolve-conflicts)',
    '      COMPREPLY=( $(compgen -W "--dry-run" -- "$cur") )',
    '      return',
    '      ;;',
    '    install-skillset)',
    '      if [[ $prev == install-skillset ]]; then COMPREPLY=( $(compgen -W "$skillset_targets --force" -- "$cur") ); return; fi',
    '      COMPREPLY=( $(compgen -W "--force" -- "$cur") )',
    '      return',
    '      ;;',
    '  esac',
    '  COMPREPLY=( $(compgen -W "$commands" -- "$cur") )',
    '}',
    'complete -F _engram engram'
  ].join('\n');
}
