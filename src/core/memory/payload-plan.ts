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

type PayloadRow = { entry: Pick<MemoryEntry, 'scope' | 'file'> & { id?: string; dependsOn?: string[] }; content: string; flagged?: string };

export type TieredPackOptions<T extends PayloadRow> = {
  maxTokens: number;
  expandTop: number;
  reserveRatio: number;
  isDependency: (row: T) => boolean;
  card: (row: T) => string;
  render: (expanded: T[], cards: string[]) => string;
  /** Rows that routing ranked but did not select; they can only become cards. */
  isCandidate?: (row: T) => boolean;
};

/** Most omitted candidates that tiered disclosure lists as cards (D2). */
export const CANDIDATE_CARD_LIMIT = 5;

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

/**
 * Tiered disclosure under a hard cap on the complete render: expand the top primary rows as
 * bodies within the budget minus the dependency reserve, expand their prerequisites into the
 * reserve, and card everything else. Every fit check prices in the cards still owed to the
 * remaining selected rows, so an oversized body is downgraded to a card instead of overflowing.
 * Selected cards are only dropped (to `omitted`) when the cards alone overflow; the top-ranked
 * row always survives as at least a card.
 */
export function packTiered<T extends PayloadRow>(rows: T[], opts: TieredPackOptions<T>): { expanded: T[]; cards: T[]; omitted: string[]; used: number } {
  const isCandidate = opts.isCandidate ?? (() => false);
  const reserve = Math.round(opts.maxTokens * opts.reserveRatio);
  const selected = rows.filter((row) => !isCandidate(row));
  const expanded = new Set<T>();
  const cost = (bodies: Set<T>) => estimateTokens(opts.render(
    rows.filter((row) => bodies.has(row)),
    selected.filter((row) => !bodies.has(row)).map(opts.card)
  ));
  const fits = (row: T, limit: number) => cost(new Set([...expanded, row])) <= limit;
  let primaries = 0;
  for (const row of selected) {
    if (opts.isDependency(row) || primaries >= opts.expandTop || !fits(row, opts.maxTokens - reserve)) continue;
    expanded.add(row);
    primaries += 1;
  }
  // Prerequisites of expanded rows (dependency additions or lower-ranked direct hits) use the
  // reserve; repeat so a prerequisite of an expanded dependency can follow it.
  for (let grew = true; grew;) {
    grew = false;
    for (const row of selected) {
      if (expanded.has(row) || !isRequired(row, [...expanded]) || !fits(row, opts.maxTokens)) continue;
      expanded.add(row);
      grew = true;
    }
  }
  const bodies = rows.filter((row) => expanded.has(row));
  const total = (cards: T[]) => estimateTokens(opts.render(bodies, cards.map(opts.card)));
  const cards: T[] = [];
  const omitted: string[] = [];
  const omit = (row: T) => omitted.push(`${row.entry.scope}:${row.entry.file}`);
  for (const row of selected.filter((item) => !expanded.has(item))) {
    // Last resort: shed the lowest-ranked selected cards, but never leave the pack empty.
    const keep = total([...cards, row]) <= opts.maxTokens || (!bodies.length && !cards.length);
    if (keep && !omitted.length) cards.push(row);
    else omit(row);
  }
  let candidateCards = 0;
  for (const row of rows.filter(isCandidate)) {
    if (candidateCards < CANDIDATE_CARD_LIMIT && total([...cards, row]) <= opts.maxTokens) {
      cards.push(row);
      candidateCards += 1;
    } else {
      omit(row);
    }
  }
  // Like packPayload, an empty pack reports zero rather than the frame's own cost.
  const used = bodies.length || cards.length ? total(cards) : 0;
  return { expanded: bodies, cards, omitted, used };
}

function isRequired(row: PayloadRow, by: PayloadRow[]): boolean {
  return Boolean(row.entry.id) && by.some((other) => other.entry.dependsOn?.includes(row.entry.id!));
}
