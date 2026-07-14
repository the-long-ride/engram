/** Runtime entry report for resolved Engram flags and paths. */
import { VERSION } from './constants.js';
import { loadConfig, profileResolutionForConfig, scopeRootsForConfig } from './config.js';
import { globalGitInfo } from '../vcs/git.js';

/** Print all resolved options currently applied by Engram. */
export async function renderEntry(cwd = process.cwd()): Promise<string> {
  const config = await loadConfig(cwd);
  const profile = profileResolutionForConfig(config);
  const resolvedRoots = scopeRootsForConfig(cwd, config);
  const roots = {
    ...resolvedRoots,
    workspace: profile.workspace_allowed ? resolvedRoots.workspace : '<disabled for active profile>'
  };
  const info = roots.global
    ? await globalGitInfo(roots.global, config.global_git)
    : { repo: false, branch: config.global_git.branch, remote: config.global_git.remote, remoteUrl: '', dirty: false };
  const rows = flatten({
    version: VERSION,
    profile,
    roots,
    config,
    global_git_detected: {
      repo: info.repo,
      branch: info.branch,
      remote: info.remote,
      remote_url: redactRemote(info.remoteUrl) || '<none>',
      dirty: info.dirty
    }
  }).filter(([key]) => !hiddenConfigRow(key));

  const outputLines: string[] = [];
  let currentGroup = '';
  for (const [key, value] of rows) {
    const group = entryGroup(key);
    if (group !== currentGroup) {
      if (currentGroup) outputLines.push('');
      outputLines.push(highlightGroup(group));
      currentGroup = group;
    }
    outputLines.push(`- ${highlightName(key)}: ${highlightValue(value)}`);
  }
  return outputLines.join('\n').trimEnd();
}

function entryGroup(key: string): string {
  if (key === 'version') return 'Runtime';
  if (key.startsWith('profile.')) return 'Profile';
  if (key.startsWith('roots.')) return 'Memory roots';
  if (key.startsWith('config.ignore.')) return 'Ignore rules';
  if (key === 'config.roles') return 'Routing roles';
  if (key.startsWith('config.load.')) return 'Load routing';
  if (key.startsWith('config.live_sync.')) return 'Live sync';
  if (key.startsWith('config.global_git.')) return 'Global Git config';
  if (key.startsWith('config.rule_variants.')) return 'Rule variants';
  if (key.startsWith('config.graph.')) return 'Graph routing';
  if (key.startsWith('global_git_detected.')) return 'Detected global Git';
  if (key.startsWith('config.')) return 'Core config';
  return 'Other';
}

function highlightGroup(name: string): string {
  return process.stdout.isTTY ? `\x1b[1;37m## ${name}\x1b[0m` : `## ${name}`;
}

function highlightName(name: string): string {
  return process.stdout.isTTY ? `\x1b[1;36m${name}\x1b[0m` : name;
}

function highlightValue(val: string): string {
  if (!process.stdout.isTTY) return val;
  const lower = val.toLowerCase();
  if (lower === 'true' || lower === 'enabled' || lower === 'auto' || lower === 'active') return `\x1b[1;32m${val}\x1b[0m`;
  if (lower === 'false' || lower === 'disabled' || lower === '<none>') return `\x1b[1;31m${val}\x1b[0m`;
  return `\x1b[1;33m${val}\x1b[0m`;
}

function flatten(value: any, prefix = ''): Array<[string, string]> {
  if (Array.isArray(value)) return [[prefix, value.join(',') || '<none>']];
  if (value === '') return [[prefix, '<none>']];
  if (!value || typeof value !== 'object') return [[prefix, String(value)]];
  return Object.keys(value).flatMap((key) => flatten(value[key], prefix ? `${prefix}.${key}` : key));
}

function redactRemote(value: string): string {
  return value.replace(/:\/\/[^/@]+@/, '://<credentials>@');
}

function hiddenConfigRow(key: string): boolean {
  return ['config.auto_upgrade', 'config.pattern_mining', 'config.pr_workflow', 'config.encryption'].some((prefix) => key.startsWith(prefix));
}
