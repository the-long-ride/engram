/** Ignore-rule loading and glob matching for .engramignore/.gitignore. */
import path from 'node:path';
import type { EngramConfig } from './types.js';
import { scopeRoots } from './config.js';
import { readText } from './fsx.js';

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
  if (config.ignore.global_engramignore) {
    patterns.push(...parseIgnore(await readText(path.join(scopeRoots(cwd).global, '.engramignore'))));
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
  const p = pattern.replace(/\\/g, '/').replace(/^\.\//, '');
  if (p.endsWith('/')) return file.startsWith(p) || file.includes(`/${p}`);
  if (p.endsWith('/**')) return file.startsWith(p.slice(0, -3));
  if (!p.includes('*')) return file === p || file.endsWith(`/${p}`) || file.startsWith(`${p}/`);
  const escaped = p.split('*').map(escapeRegex).join('[^/]*').replace(/\[\^\/\]\*\[\^\/\]\*/g, '.*');
  return new RegExp(`^${escaped}$`).test(file) || new RegExp(`(^|/)${escaped}$`).test(file);
}

function escapeRegex(text: string): string {
  return text.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
}
