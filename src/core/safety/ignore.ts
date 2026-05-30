/** Ignore-rule loading and glob matching for .engramignore/.gitignore. */
import path from 'node:path';
import type { EngramConfig } from '../runtime/types.js';
import { scopeRootsForConfig } from '../runtime/config.js';
import { readText } from '../system/fsx.js';

export type IgnoreSet = { patterns: string[]; hiddenCount: number };

/** Load active ignore patterns for a workspace. */
export async function loadIgnore(cwd: string, config: EngramConfig): Promise<IgnoreSet> {
  const patterns = [...config.ignore.also_ignore];
  const source = config.ignore.source;
  if (source === 'engramignore' || source === 'both') {
    patterns.push(...parseIgnore(await readText(path.join(cwd, config.ignore.engramignore_path))));
  }
  if (source === 'gitignore' || source === 'both') {
    patterns.push(...parseIgnore(await readText(path.join(cwd, config.ignore.gitignore_path))));
  }
  const globalRoot = scopeRootsForConfig(cwd, config).global;
  if (config.ignore.global_engramignore && globalRoot) {
    patterns.push(...parseIgnore(await readText(path.join(globalRoot, '.engramignore'))));
  }
  return { patterns: [...new Set(patterns)], hiddenCount: 0 };
}

/** Convert ignore file text into usable patterns. */
export function parseIgnore(text: string): string[] {
  return text.split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && !line.startsWith('!'));
}

/** Return true when a relative path matches any pattern. */
export function isIgnored(relPath: string, patterns: string[]): boolean {
  const normalized = relPath.replace(/\\/g, '/').replace(/^\.\//, '');
  return patterns.some((pattern) => matchPattern(normalized, pattern));
}

/** Small glob subset: *, **, directory prefixes, and exact names. */
export function matchPattern(file: string, pattern: string): boolean {
  const normalized = file.replace(/\\/g, '/').replace(/^\.\//, '');
  const p = pattern.replace(/\\/g, '/').replace(/^\.\//, '');
  if (p.endsWith('/')) return normalized.startsWith(p) || normalized.includes(`/${p}`);
  if (p.endsWith('/**')) return normalized.startsWith(p.slice(0, -3));
  if (!/[?*]/.test(p)) return normalized === p || normalized.endsWith(`/${p}`) || normalized.startsWith(`${p}/`);
  const source = globSource(p);
  return new RegExp(`^${source}$`).test(normalized) || new RegExp(`(^|/)${source}$`).test(normalized);
}

function globSource(pattern: string): string {
  let out = '';
  for (let i = 0; i < pattern.length; i += 1) {
    const char = pattern[i];
    if (pattern.slice(i, i + 3) === '**/') {
      out += '(?:.*/)?';
      i += 2;
    } else if (pattern.slice(i, i + 2) === '**') {
      out += '.*';
      i += 1;
    } else if (char === '*') {
      out += '[^/]*';
    } else if (char === '?') {
      out += '[^/]';
    } else {
      out += escapeRegex(char);
    }
  }
  return out;
}

function escapeRegex(text: string): string {
  return text.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
}
