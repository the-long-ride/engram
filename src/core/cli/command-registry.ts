/** Canonical user-facing command metadata shared by help and skillsets. */
export interface CommandHelp { command: string; purpose: string; alias?: string; }
export interface HelpSection { title: string; commands: CommandHelp[]; }

export const HELP_DATA: HelpSection[] = [
  {
    title: 'Meta Commands',
    commands: [
      { command: 'engram --version', alias: '-v', purpose: 'Show the installed Engram version' },
      { command: 'engram init [--force] [--global-only] [--no-skillset] [--skillset target] [--submodule] [--submodule-remote <git-url>] [--no-global] [--global-path path] [--global-remote <git-url>] [--global-branch main]', alias: 'i', purpose: 'Initialize or reconcile memory and install compact agent skillset instructions by default' },
      { command: 'engram help [topic]', alias: 'h', purpose: 'Show this help menu or specific topic details & example use-cases' },
      { command: 'engram update-help', alias: 'uh', purpose: 'Regenerate workspace HELP.md file' },
      { command: 'engram entry', alias: 'e', purpose: 'Show runtime configurations and global Git repository status' },
      { command: 'engram completion [bash|zsh|powershell]', alias: 'c', purpose: 'Generate shell completion support for Tab suggestions' }
    ]
  },
  {
    title: 'Memory Commands',
    commands: [
      { command: 'engram save rule [--role role] <text>', alias: 's', purpose: 'Draft and save a rule memory after user approval' },
      { command: 'engram save skill [--role role] <text>', alias: 's', purpose: 'Draft and save a skill memory after user approval' },
      { command: 'engram save workflow [--role role] <text>', alias: 's', purpose: 'Draft and save a repeatable workflow as a skill memory' },
      { command: 'engram save knowledge [--role role] [text]', alias: 's', purpose: 'Draft and save a knowledge memory (agent summary or text)' },
      { command: 'engram save [--role role] [text]', alias: 's', purpose: 'Auto-detect rule, workflow, skill, or knowledge memory from text' },
      { command: 'engram save-session [--file transcript.md] [--role role] [--accept-all] [session-summary]', alias: 'ss', purpose: 'Propose multiple memories from a long session before approval or explicit accept-all' },
      { command: 'engram observe [--file session.md] [--propose] [note]', alias: 'o', purpose: 'Capture sanitized raw notes in inbox, then optionally propose memories through save-session' },
      { command: 'engram take-control [--plan] [--file path] [--dir path] [--include glob] [--exclude glob] [--max-sources n] [--max-chars n] [--all] [--accept-all]', alias: 'tc', purpose: 'Explore existing workspace guidance with agent help, token-light accept-all, and Engram memory writes' },
      { command: 'engram load [--all] [query]', alias: 'l', purpose: 'Route and load relevant memories into the agent context' },
      { command: 'engram dry-run [--all] [query]', alias: 'dr', purpose: 'Preview routed memory file paths without printing their content' },
      { command: 'engram search [--semantic] <query>', alias: 'f', purpose: 'Search visible indexed memories with lexical or local semantic scoring' },
      { command: 'engram graph [--rebuild] [query]', alias: 'g', purpose: 'Inspect the derived layered JSON memory graph and contradiction candidates' },
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
      { command: 'engram set-rule-variant off|light|balanced|strict|status', alias: 'rv', purpose: 'Tune rule strictness: strict helps lower-tier models stay controlled, while top-tier models often work better with light or balanced so strict wording does not limit their reasoning' },
      { command: 'engram resolve-conflicts [--dry-run]', alias: 'rc', purpose: 'Preview or resolve Git conflicts in memory files' },
      { command: 'engram install-hooks', alias: 'ih', purpose: 'Install local Git hooks for Engram integrity checks' },
      { command: 'engram install-skillset [all|list|target] [--force]', alias: 'is', purpose: 'Generate agent skillset instruction files and slash adapters' },
      { command: 'engram sync', alias: 'sy', purpose: 'Sync global memory with Git remote and refresh enabled live-sync targets' },
      { command: 'engram propose <memory-file>', alias: 'p', purpose: 'Propose changes to a memory file for review' },
      { command: 'engram team-dashboard', alias: 'td', purpose: 'Show team memory ownership, quality, and coverage stats' }
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

/** Return a shell completion script for the current command surface. */
export function completionScript(shell: 'bash' | 'zsh' | 'powershell' = 'bash'): string {
  const commands = commandNames().join(' ');
  const saveTypes = ['rule', 'skill', 'workflow', 'knowledge'].join(' ');
  const scopes = ['workspace', 'global'].join(' ');
  const formats = ['agents-md', 'claude-md', 'cursorrules'].join(' ');
  const shells = ['bash', 'zsh', 'powershell'].join(' ');
  const ruleVariants = ['off', 'light', 'balanced', 'strict', 'status'].join(' ');
  const ignoreActions = ['status', 'check', 'add'].join(' ');
  const observeArgs = ['--file', '--scope', '--role', '--roles', '--propose', '--accept-all'].join(' ');
  const takeControlArgs = ['--file', '--dir', '--include', '--exclude', '--max-sources', '--max-chars', '--scope', '--role', '--roles', '--all', '--accept-all', '--dry-run', '--plan'].join(' ');
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
      '    init|i)',
      '      _arguments "--force" "--global-only" "--no-skillset" "--skillset=[target]" "--submodule" "--submodule-remote=[git-url]" "--no-global" "--global-path=[path]" "--global-remote=[git-url]" "--global-branch=[branch]"',
      '      ;;',
      '    completion|c)',
      `      _arguments "1:shell:(${shells})"`,
      '      ;;',
      '    save|s)',
      `      _arguments "--scope[write scope]:scope:(${scopes})" "--role[role tag]:role:" "--roles[comma-separated roles]:roles:" "1:memory type:(${saveTypes})"`,
      '      ;;',
      '    save-session|ss)',
      '      _arguments "--file[read session summary file]:file:_files" "--scope[write scope]:scope:(workspace global)" "--role[role tag]:role:" "--roles[comma-separated roles]:roles:" "--accept-all[accept every save-session candidate]" "1:session summary: "',
      '      ;;',
      '    observe|o)',
      '      _arguments "--file[read raw note file]:file:_files" "--scope[write scope]:scope:(workspace global)" "--role[role tag]:role:" "--roles[comma-separated roles]:roles:" "--propose[mine inbox note through save-session]" "--accept-all[accept every proposed candidate]" "1:note: "',
      '      ;;',
      '    take-control|tc)',
      '      _arguments "--file[read one source file]:file:_files" "--dir[scan one source directory]:dir:_files -/" "--include[include matching glob]:glob:" "--exclude[exclude matching glob]:glob:" "--max-sources[maximum source count]:number:" "--max-chars[maximum chars per source]:number:" "--scope[write scope]:scope:(workspace global)" "--role[role tag]:role:" "--roles[comma-separated roles]:roles:" "--all[include README docs and library docs]" "--accept-all[accept every generated candidate]" "--dry-run[show source pack only]" "--plan[preview source plan only]"',
      '      ;;',
      '    load|l|dry-run|dr)',
      '      _arguments "--all" "1:query: "',
      '      ;;',
      '    graph|g)',
      '      _arguments "--rebuild" "1:query: "',
      '      ;;',
      '    archive|ar)',
      '      _arguments "--reason[archive reason]:reason:" "1:memory: "',
      '      ;;',
      '    benchmark|bm)',
      '      _arguments "1:cases file:_files"',
      '      ;;',
      '    search|f|propose|p)',
      '      _arguments "1:query: "',
      '      ;;',
      '    verify|vf|rebuild-index|ri|repair|rp)',
      `      _arguments "1:scope:(${scopes})"`,
      '      ;;',
      '    export|x)',
      `      _arguments "--format[output format]:format:(${formats})"`,
      '      ;;',
      '    ignore|ig)',
      `      _arguments "1:action:(${ignoreActions})"`,
      '      ;;',
      '    set-rule-variant|rv)',
      `      _arguments "1:variant:(${ruleVariants})"`,
      '      ;;',
      '    resolve-conflicts|rc)',
      '      _arguments "--dry-run"',
      '      ;;',
      '    install-skillset|is)',
      `      _arguments "--force" "1:target:(${skillsetTargets})"`,
      '      ;;',
      '  esac',
      '}',
      'compdef _engram engram'
    ].join('\n');
  }
  if (shell === 'powershell') {
    return [
      '$engramCommands = @(',
      commandNames().map((command) => `  '${command}'`).join(',\n'),
      ')',
      '$engramInitArgs = @(\'--force\', \'--global-only\', \'--no-skillset\', \'--skillset\', \'--submodule\', \'--submodule-remote\', \'--no-global\', \'--global-path\', \'--global-remote\', \'--global-branch\')',
      '$engramSaveTypes = @(\'rule\', \'skill\', \'workflow\', \'knowledge\', \'--scope\', \'--role\', \'--roles\')',
      '$engramSaveSessionArgs = @(\'--file\', \'--scope\', \'--role\', \'--roles\', \'--accept-all\')',
      `$engramObserveArgs = @(${observeArgs.split(' ').map((arg) => `'${arg}'`).join(', ')})`,
      `$engramTakeControlArgs = @(${takeControlArgs.split(' ').map((arg) => `'${arg}'`).join(', ')})`,
      `$engramSkillsetTargets = @(${skillsetTargets.split(' ').map((target) => `'${target}'`).join(', ')})`,
      '$engramScopes = @(\'workspace\', \'global\')',
      '$engramRuleVariants = @(\'off\', \'light\', \'balanced\', \'strict\', \'status\')',
      'Register-ArgumentCompleter -Native -CommandName engram -ScriptBlock {',
      '  param($wordToComplete, $commandAst, $cursorPosition)',
      '  $words = @($commandAst.CommandElements | ForEach-Object { $_.ToString() })',
      '  $command = if ($words.Count -ge 2) { $words[1] } else { "" }',
      '  $previous = if ($words.Count -ge 2) { $words[$words.Count - 2] } else { "" }',
      '  $choices = switch ($previous) {',
      '    "--scope" { $engramScopes; break }',
      '    "--skillset" { $engramSkillsetTargets; break }',
      '    "--format" { @(\'agents-md\', \'claude-md\', \'cursorrules\'); break }',
      '    "--file" { break }',
      '    "--role" { break }',
      '    "--roles" { break }',
      '    default {',
      '      switch ($command) {',
      '        { $_ -in @(\'init\', \'i\') } { $engramInitArgs; break }',
      '        { $_ -in @(\'save\', \'s\') } { $engramSaveTypes; break }',
      '        { $_ -in @(\'save-session\', \'ss\') } { $engramSaveSessionArgs; break }',
      '        { $_ -in @(\'observe\', \'o\') } { $engramObserveArgs; break }',
      '        { $_ -in @(\'take-control\', \'tc\') } { $engramTakeControlArgs; break }',
      '        { $_ -in @(\'install-skillset\', \'is\') } { $engramSkillsetTargets + \'--force\'; break }',
      '        { $_ -in @(\'set-rule-variant\', \'rv\') } { $engramRuleVariants; break }',
      '        { $_ -in @(\'verify\', \'vf\', \'rebuild-index\', \'ri\', \'repair\', \'rp\') } { $engramScopes; break }',
      '        default { $engramCommands }',
      '      }',
      '    }',
      '  }',
      '  $choices | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {',
      '    [System.Management.Automation.CompletionResult]::new($_, $_, "ParameterValue", $_)',
      '  }',
      '}'
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
    '    --skillset)',
    '      COMPREPLY=( $(compgen -W "$skillset_targets" -- "$cur") )',
    '      return',
    '      ;;',
    '    --file|--dir)',
    '      COMPREPLY=( $(compgen -f -- "$cur") )',
    '      return',
    '      ;;',
    '    --role|--roles)',
    '      COMPREPLY=()',
    '      return',
    '      ;;',
    '  esac',
    '  case "${words[1]}" in',
    '    init|i)',
    '      COMPREPLY=( $(compgen -W "--force --global-only --no-skillset --skillset --submodule --submodule-remote --no-global --global-path --global-remote --global-branch" -- "$cur") )',
    '      return',
    '      ;;',
    '    completion|c)',
    '      if [[ $cword -eq 2 ]]; then COMPREPLY=( $(compgen -W "$shells" -- "$cur") ); return; fi',
    '      COMPREPLY=()',
    '      return',
    '      ;;',
    '    save|s)',
    '      if [[ $cword -eq 2 ]]; then COMPREPLY=( $(compgen -W "$save_types --scope --role --roles" -- "$cur") ); return; fi',
    '      COMPREPLY=( $(compgen -W "--scope --role --roles" -- "$cur") )',
    '      return',
    '      ;;',
      '    save-session|ss)',
      '      COMPREPLY=( $(compgen -W "--file --scope --role --roles --accept-all" -- "$cur") )',
      '      return',
      '      ;;',
      '    observe|o)',
      '      COMPREPLY=( $(compgen -W "--file --scope --role --roles --propose --accept-all" -- "$cur") )',
      '      return',
      '      ;;',
    '    take-control|tc)',
    '      COMPREPLY=( $(compgen -W "--file --dir --include --exclude --max-sources --max-chars --scope --role --roles --all --accept-all --dry-run --plan" -- "$cur") )',
    '      return',
    '      ;;',
      '    load|l|dry-run|dr)',
      '      COMPREPLY=( $(compgen -W "--all" -- "$cur") )',
      '      return',
      '      ;;',
      '    graph|g)',
      '      COMPREPLY=( $(compgen -W "--rebuild" -- "$cur") )',
      '      return',
      '      ;;',
      '    archive|ar)',
      '      COMPREPLY=( $(compgen -W "--reason" -- "$cur") )',
      '      return',
      '      ;;',
    '    verify|vf|rebuild-index|ri|repair|rp)',
    '      if [[ $cword -eq 2 ]]; then COMPREPLY=( $(compgen -W "$scopes" -- "$cur") ); return; fi',
    '      COMPREPLY=()',
    '      return',
    '      ;;',
    '    export|x)',
    '      COMPREPLY=( $(compgen -W "--format" -- "$cur") )',
    '      return',
    '      ;;',
    '    ignore|ig)',
    '      if [[ $cword -eq 2 ]]; then COMPREPLY=( $(compgen -W "$ignore_actions" -- "$cur") ); return; fi',
    '      COMPREPLY=()',
    '      return',
    '      ;;',
    '    set-rule-variant|rv)',
    '      if [[ $cword -eq 2 ]]; then COMPREPLY=( $(compgen -W "$rule_variants" -- "$cur") ); return; fi',
    '      COMPREPLY=()',
    '      return',
    '      ;;',
    '    resolve-conflicts|rc)',
    '      COMPREPLY=( $(compgen -W "--dry-run" -- "$cur") )',
    '      return',
    '      ;;',
    '    install-skillset|is)',
    '      if [[ $prev == install-skillset || $prev == is ]]; then COMPREPLY=( $(compgen -W "$skillset_targets --force" -- "$cur") ); return; fi',
    '      COMPREPLY=( $(compgen -W "--force" -- "$cur") )',
    '      return',
    '      ;;',
    '  esac',
    '  COMPREPLY=( $(compgen -W "$commands" -- "$cur") )',
    '}',
    'complete -F _engram engram'
  ].join('\n');
}
