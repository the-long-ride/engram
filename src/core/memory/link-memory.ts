/** Bulk-link children to a parent memory by adding DEPENDS_ON entries. */
import type { EngramContext } from './context.js';
import { entryPath } from './context.js';
import { parseMemory } from './schema.js';
import { readText, writeText } from '../system/fsx.js';
import { today } from '../system/text.js';
import type { MemoryEntry, Scope } from '../runtime/types.js';

export type LinkResult = {
  id: string;
  file: string;
  scope: Scope;
  status: 'updated' | 'skipped' | 'missing' | 'unscoped';
  reason?: string;
};

export type LinkSummary = {
  parent: string | undefined;
  updated: number;
  skipped: number;
  missing: number;
  results: LinkResult[];
};

/**
 * Add `DEPENDS_ON: <parentId>` to each child memory's frontmatter.
 *
 * Children are resolved across workspace and global scopes (whichever has a
 * matching id), so callers can pass child IDs without knowing their scope.
 * The update is idempotent: a child already declaring the parent in its
 * `depends_on` list is marked `skipped` and its file is left untouched.
 *
 * Optional `--parent-id-only` validation: when `findParent` is true, the
 * command also verifies the parent id exists in any visible scope and
 * includes it in the returned summary; missing parent is reported but does
 * not block child wiring.
 */
export async function linkMemoryChildren(input: {
  ctx: EngramContext;
  parentId: string;
  childIds: string[];
  findParent?: boolean;
}): Promise<LinkSummary> {
  const normalizedParent = normalizeRef(input.parentId);
  const parentEntry = input.findParent === false ? undefined : findEntry(input.ctx, normalizedParent);
  let updated = 0;
  let skipped = 0;
  let missing = 0;
  const results: LinkResult[] = [];
  for (const rawChildId of input.childIds) {
    const childId = normalizeRef(rawChildId);
    if (!childId) {
      results.push({ id: rawChildId, file: '', scope: 'workspace', status: 'missing', reason: 'empty id' });
      missing += 1;
      continue;
    }
    const childEntry = findEntry(input.ctx, childId);
    if (!childEntry) {
      results.push({ id: rawChildId, file: '', scope: 'workspace', status: 'missing', reason: 'no visible memory matches this id' });
      missing += 1;
      continue;
    }
    const filePath = entryPath(input.ctx, childEntry.scope, childEntry.file);
    const raw = await readText(filePath);
    const doc = parseMemory(raw);
    const existingDependsOn = frontmatterStrings(doc.frontmatter.depends_on).map((ref) => normalizeRef(ref));
    if (existingDependsOn.includes(normalizedParent)) {
      results.push({ id: childEntry.id, file: childEntry.file, scope: childEntry.scope, status: 'skipped', reason: 'already declares DEPENDS_ON parent' });
      skipped += 1;
      continue;
    }
    const next = addDependsOn(raw, normalizedParent);
    await writeText(filePath, next);
    results.push({ id: childEntry.id, file: childEntry.file, scope: childEntry.scope, status: 'updated' });
    updated += 1;
  }
  return {
    parent: parentEntry?.id,
    updated,
    skipped,
    missing,
    results
  };
}

/** Find the first visible memory entry (any scope, any type) matching the id ref. */
export function findEntry(ctx: EngramContext, idRef: string): MemoryEntry | undefined {
  const target = normalizeRef(idRef);
  if (!target) return undefined;
  const all = [...ctx.scopeIndexes.workspace.entries, ...ctx.scopeIndexes.global.entries];
  return all.find((entry) => !entry.ignored
    && [entry.id, entry.file, entry.file.replace(/\.md$/i, '')].some((ref) => normalizeRef(ref) === target));
}

/** Insert/extend a `depends_on:` frontmatter entry on a raw memory file. */
function addDependsOn(raw: string, parentId: string): string {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    // No frontmatter; do not synthesize one — memories always have frontmatter.
    return raw;
  }
  const fmBlock = match[1];
  const dependsLineMatch = fmBlock.match(/^depends_on:\s*(.+)$/m);
  let nextFm: string;
  if (dependsLineMatch) {
    const existing = dependsLineMatch[1].replace(/^\[|\]$/g, '').split(',').map((s) => s.trim()).filter(Boolean);
    if (!existing.some((ref) => normalizeRef(ref) === normalizeRef(parentId))) existing.push(parentId);
    const newList = `[${existing.join(', ')}]`;
    const updatedFm = fmBlock.replace(/^depends_on:\s*.+$/m, `depends_on: ${newList}`);
    nextFm = updatedFm;
  } else {
    nextFm = `${fmBlock.trimEnd()}\ndepends_on: [${parentId}]`;
  }
  // Refresh the `updated:` timestamp so future graph rebuilds pick up the change.
  nextFm = nextFm.replace(/^updated:\s*.+$/m, `updated: ${today()}`);
  return `---\n${nextFm}\n---\n${raw.slice(match[0].length)}`;
}

function normalizeRef(ref: string): string {
  return ref.trim().replace(/\\/g, '/').replace(/\.md$/i, '').toLowerCase();
}

function frontmatterStrings(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()));
  return typeof value === 'string' && value.trim() ? [value] : [];
}
