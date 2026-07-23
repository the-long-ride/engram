/** Payload planning, token estimation, and projections for load optimization. */
import type { MemoryEntry } from '../runtime/types.js';

export type ProjectionSection =
  | 'identity'
  | 'tags'
  | 'active-variant'
  | 'critical-exception'
  | 'dependencies'
  | 'prerequisites'
  | 'steps'
  | 'failure-recovery'
  | 'content'
  | 'applicability'
  | 'evidence'
  | 'activation'
  | 'constraints';

/** Estimate token count for a text string (~4 characters per token). */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/** Estimate tokens for a memory entry (content or metadata fallback). */
export function estimateEntryTokens(entry: MemoryEntry, content?: string): number {
  if (content) return estimateTokens(content);
  const repr = `${entry.id} ${entry.type} ${entry.summary} ${entry.tags.join(' ')}`;
  return estimateTokens(repr);
}

type PayloadRow = { entry: Pick<MemoryEntry, 'scope' | 'file'>; content: string; flagged?: string };

type PayloadPackOptions<T extends PayloadRow> = {
  render?: (rows: T[]) => string;
};

/** Keep safe rendered rows that fit a compact token budget in route order. */
export function packPayload<T extends PayloadRow>(rows: T[], maxTokens: number, options: PayloadPackOptions<T> = {}): { rows: T[]; used: number; omitted: string[] } {
  let used = 0;
  const packed: T[] = [];
  const omitted: string[] = [];
  const render = options.render ?? ((items: T[]) => items.map((row) => row.content).join('\n---\n'));
  for (const row of rows) {
    const candidate = [...packed, row];
    const tokens = estimateTokens(render(candidate));
    if (tokens <= maxTokens) {
      packed.push(row);
      used = tokens;
    } else {
      omitted.push(`${row.entry.scope}:${row.entry.file}`);
    }
  }
  return { rows: packed, used, omitted };
}
