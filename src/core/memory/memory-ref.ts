/** Canonical memory identity helpers: scope-qualified keys, id/file reference matching, and `valid_until` expiry. */
import type { MemoryEntry } from '../runtime/types.js';

/** Scope-qualified memory key, e.g. `workspace:knowledge/foo.md`. */
export function memoryKey(entry: { scope: string; file: string }): string {
  return `${entry.scope}:${entry.file}`;
}

/** Normalize an id or file reference: trimmed, forward slashes, no `.md`, lowercase. */
export function normalizeRef(ref: string): string {
  return ref.trim().replace(/\\/g, '/').replace(/\.md$/i, '').toLowerCase();
}

/** True when `ref` names the entry by id or by scope-relative file path (with or without `.md`). */
export function matchesMemoryRef(entry: Pick<MemoryEntry, 'id' | 'file'>, ref: string): boolean {
  const target = normalizeRef(ref);
  return [entry.id, entry.file, entry.file.replace(/\.md$/i, '')].some((value) => normalizeRef(value) === target);
}

/** A memory is expired the day after its `valid_until`; a missing or unparseable date never expires. */
export function isExpired(validUntil: unknown, day: string): boolean {
  const until = typeof validUntil === 'string' ? Date.parse(validUntil) : NaN;
  const now = Date.parse(day);
  return Number.isFinite(until) && Number.isFinite(now) && until < now;
}
