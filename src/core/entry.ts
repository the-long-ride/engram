/** Runtime entry report for resolved Engram flags and paths. */
import { VERSION } from './constants.js';
import { loadConfig, scopeRoots } from './config.js';
import { globalGitInfo } from './git.js';

/** Print all resolved options currently applied by Engram. */
export async function renderEntry(cwd = process.cwd()): Promise<string> {
  const config = await loadConfig(cwd);
  const roots = scopeRoots(cwd);
  const info = await globalGitInfo(roots.global, config.global_git);
  const rows = flatten({
    version: VERSION,
    roots,
    config,
    global_git_detected: {
      repo: info.repo,
      branch: info.branch,
      remote: info.remote,
      remote_url: redactRemote(info.remoteUrl) || '<none>',
      dirty: info.dirty
    }
  });

  const METADATA: Record<string, { note: string; command?: string }> = {
    version: {
      note: "Current Engram CLI version",
    },
    'roots.workspace': {
      note: "Local directory containing workspace memory, config, and index",
    },
    'roots.global': {
      note: "Shared directory containing global user memories across projects",
    },
    'config.version': {
      note: "Configuration schema version, matches Engram CLI version",
      command: "Edit manually in engram.config.json",
    },
    'config.enabled': {
      note: "Enables or disables Engram memory load routing",
      command: "Edit manually in engram.config.json",
    },
    'config.scope': {
      note: "Destination scope for saving new memories (workspace, global, both)",
      command: "Edit manually in engram.config.json",
    },
    'config.update': {
      note: "Controls whether memory indexes are updated automatically",
      command: "Edit manually in engram.config.json",
    },
    'config.read': {
      note: "Determines read routing behavior for loading memories",
      command: "Edit manually in engram.config.json",
    },
    'config.ignore.source': {
      note: "Source rules file used for ignoring directories/files",
      command: "Edit manually in engram.config.json",
    },
    'config.ignore.gitignore_path': {
      note: "Relative path to project's gitignore file",
      command: "Edit manually in engram.config.json",
    },
    'config.ignore.engramignore_path': {
      note: "Relative path to project's engramignore file",
      command: "Edit manually in engram.config.json",
    },
    'config.ignore.global_engramignore': {
      note: "Whether to also apply global engramignore patterns",
      command: "Edit manually in engram.config.json",
    },
    'config.ignore.also_ignore': {
      note: "Glob patterns that Engram should always ignore",
      command: "engram ignore add <pattern> (or edit engram.config.json)",
    },
    'config.roles': {
      note: "Array of developer roles used to filter memory routing",
      command: "engram set-role <role...>",
    },
    'config.live_sync.enabled': {
      note: "Enables or disables auto-export to downstream targets",
      command: "Edit manually in engram.config.json",
    },
    'config.live_sync.targets': {
      note: "Target documentation/config formats to sync with memory",
      command: "Edit manually in engram.config.json",
    },
    'config.global_git.enabled': {
      note: "Toggles git commits/pushes on global memory repository",
      command: "Edit manually in engram.config.json",
    },
    'config.global_git.remote': {
      note: "The default Git remote name to sync global memory against",
      command: "Edit manually in engram.config.json",
    },
    'config.global_git.branch': {
      note: "The default Git branch to push/pull global memory on",
      command: "Edit manually in engram.config.json",
    },
    'config.global_git.auto_sync': {
      note: "Toggles auto-push/pull operations for global Git sync",
      command: "Edit manually in engram.config.json",
    },
    'config.global_git.auto_resolve': {
      note: "Toggles auto conflict resolution for global Git sync",
      command: "Edit manually in engram.config.json",
    },
    'config.rule_variants.enabled': {
      note: "Toggles rendering varying memory rule strictness levels",
      command: "engram set-rule-variant <variant>",
    },
    'config.rule_variants.active': {
      note: "The active rule variant style (light, balanced, strict)",
      command: "engram set-rule-variant <variant>",
    },
    'config.pattern_mining.enabled': {
      note: "Enables local rule suggestions based on past activities",
      command: "Edit manually in engram.config.json",
    },
    'config.pattern_mining.threshold': {
      note: "Minimum frequency of pattern hits to recommend a rule",
      command: "Edit manually in engram.config.json",
    },
    'config.pattern_mining.lookback_sessions': {
      note: "Number of past sessions evaluated for pattern mining",
      command: "Edit manually in engram.config.json",
    },
    'config.pr_workflow.enabled': {
      note: "Toggles context checks/comments built for PR reviews",
      command: "Edit manually in engram.config.json",
    },
    'config.pr_workflow.target_branch': {
      note: "Base target branch used for comparing PR changes",
      command: "Edit manually in engram.config.json",
    },
    'config.encryption.enabled': {
      note: "Toggles AES-256-GCM encryption on stored memory records",
      command: "Edit manually in engram.config.json",
    },
    'config.encryption.scope': {
      note: "Target scope for database encryption (workspace, global, both)",
      command: "Edit manually in engram.config.json",
    },
    'config.encryption.key_source': {
      note: "Resolves encryption key source mechanism (e.g. portable-file)",
      command: "Edit manually in engram.config.json",
    },
    'global_git_detected.repo': {
      note: "Determined global repository root status",
    },
    'global_git_detected.branch': {
      note: "Determined current branch of the global repository",
    },
    'global_git_detected.remote': {
      note: "Determined default remote of the global repository",
    },
    'global_git_detected.remote_url': {
      note: "Determined remote Git URL for global repository tracking",
    },
    'global_git_detected.dirty': {
      note: "Whether the local global repository has uncommitted changes",
    },
  };

  const outputLines: string[] = ['engram entry'];
  for (const [key, value] of rows) {
    const meta = METADATA[key] || { note: '-' };
    const nameStr = highlightName(key);
    const valStr = highlightValue(value);
    outputLines.push(`\x1b[90m●\x1b[0m ${nameStr}: ${valStr}`);
    outputLines.push(`  \x1b[90mUse for:\x1b[0m ${meta.note}`);
    if (meta.command && meta.command !== '-') {
      outputLines.push(`  \x1b[90mEdit:\x1b[0m ${meta.command}`);
    }
    outputLines.push('');
  }

  return outputLines.join('\n').trim();
}

function highlightName(name: string): string {
  return `\x1b[1;36m${name}\x1b[0m`; // Bold Cyan
}

function highlightValue(val: string): string {
  const lower = val.toLowerCase();
  if (lower === 'true' || lower === 'enabled' || lower === 'auto' || lower === 'active') {
    return `\x1b[1;32m${val}\x1b[0m`; // Bold Green
  }
  if (lower === 'false' || lower === 'disabled' || lower === '<none>') {
    return `\x1b[1;31m${val}\x1b[0m`; // Bold Red
  }
  return `\x1b[1;33m${val}\x1b[0m`; // Bold Yellow
}


function flatten(value: any, prefix = ''): Array<[string, string]> {
  if (Array.isArray(value)) return [[prefix, value.join(',') || '<none>']];
  if (!value || typeof value !== 'object') return [[prefix, String(value)]];
  return Object.keys(value).flatMap((key) => flatten(value[key], prefix ? `${prefix}.${key}` : key));
}

function redactRemote(value: string): string {
  return value.replace(/:\/\/[^/@]+@/, '://<credentials>@');
}
