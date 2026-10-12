/** Config extractor: keys to depth two as `a.b`; values only for the D14 allowlist, never secrets. */
import { jsonEntries, parseJsonLoose, tomlEntries, yamlEntries, type KeyEntry } from '../structured.js';
import { extensionOf, normalizeRelPath, safeClip } from '../text.js';
import type { SourceExtractor } from '../types.js';
import { manifestExtractor } from './manifest.js';

const CONFIG_EXTENSIONS = new Set(['json', 'jsonc', 'yaml', 'yml', 'toml']);
const VALUE_SECTIONS = new Set(['scripts', 'engines']);
const NAME_PARENTS = new Set(['project', 'package']);
const MAX_DEPTH = 2;

export const configExtractor: SourceExtractor = {
  id: 'config',
  kind: 'config',
  matches(relPath) {
    return CONFIG_EXTENSIONS.has(extensionOf(relPath));
  },
  extract(text, relPath) {
    const entries = configEntries(text, extensionOf(relPath));
    // A build manifest read as config (package.json under `--kind config`) keeps the manifest rule: script names only.
    const scriptValues = !manifestExtractor.matches(relPath);
    return { file: normalizeRelPath(relPath), kind: 'config', lines: projectKeys(entries, scriptValues), symbols: topLevelKeys(entries) };
  }
};

/** Parse a config file into key entries; malformed input yields no entries rather than throwing. */
export function configEntries(text: string, extension: string): KeyEntry[] {
  if (extension === 'toml') return tomlEntries(text);
  if (extension === 'yaml' || extension === 'yml') return yamlEntries(text);
  const parsed = parseJsonLoose(text);
  return parsed === undefined ? [] : jsonEntries(parsed, MAX_DEPTH);
}

/**
 * True when D14 allows emitting this key's value: scripts, engines, TargetFramework, and package names.
 * `scriptValues: false` withholds `scripts.*` values (manifests, whose scripts may carry `--otp=...`-style secrets).
 */
export function isAllowlistedValue(path: string[], scriptValues = true): boolean {
  const leaf = path[path.length - 1] ?? '';
  if (/^TargetFrameworks?$/i.test(leaf)) return true;
  if (path.length === 2 && VALUE_SECTIONS.has(path[0])) return scriptValues || path[0] !== 'scripts';
  return leaf === 'name' && (path.length === 1 || NAME_PARENTS.has(path[0]));
}

function projectKeys(entries: KeyEntry[], scriptValues: boolean): string[] {
  const keys = new Map<string, { top: string; value?: string }>();
  const parents = new Set<string>();
  for (const entry of entries) {
    const path = entry.path.slice(0, MAX_DEPTH);
    const key = path.join('.');
    if (path.length > 1) parents.add(path[0]);
    const exact = entry.path.length === path.length;
    const value = exact && entry.value !== undefined && isAllowlistedValue(path, scriptValues) ? safeClip(entry.value.trim(), 120) : undefined;
    const top = path.length === 1 ? path[0] : '';
    if (!keys.has(key) || (value && !keys.get(key)?.value)) keys.set(key, { top, value });
  }
  return [...keys]
    .filter(([, item]) => !item.top || !parents.has(item.top))
    .map(([key, item]) => safeClip(item.value ? `${key}: ${item.value}` : key));
}

function topLevelKeys(entries: KeyEntry[]): string[] {
  return [...new Set(entries.map((entry) => entry.path[0]).filter(Boolean))];
}
