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
  return `engram entry\n${rows.map(([key, value]) => `${key}=${value}`).join('\n')}`;
}

function flatten(value: any, prefix = ''): Array<[string, string]> {
  if (Array.isArray(value)) return [[prefix, value.join(',') || '<none>']];
  if (!value || typeof value !== 'object') return [[prefix, String(value)]];
  return Object.keys(value).flatMap((key) => flatten(value[key], prefix ? `${prefix}.${key}` : key));
}

function redactRemote(value: string): string {
  return value.replace(/:\/\/[^/@]+@/, '://<credentials>@');
}
