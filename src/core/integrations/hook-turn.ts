/** Pure hook-turn planning: which bodies a prompt turn injects and the exact additionalContext. */
import { sha256 } from '../safety/hash.js';
import type { AgentLoad } from '../../commands/read.js';
import type { EngramConfig } from '../runtime/types.js';

export type HookProofMode = EngramConfig['proof'];
export type HookReadMode = EngramConfig['read'];
export type HookDecision = 'loaded' | 'reused' | 'skipped';
export type HookSkipReason = 'manual' | 'off' | 'startup-only' | 'no-context';
export type HookProof = {
  mode: HookProofMode;
  decision: HookDecision;
  readMode: HookReadMode;
  /** Routed selection, including already-delivered and carded rows. */
  selectedCount: number;
  /** Bodies newly injected this turn. */
  bodyCount: number;
  relatedCount: number;
  signature: string;
  reason?: HookSkipReason;
};

export type HookTurn = {
  output: Record<string, any>;
  additionalContext: string;
  /** Body keys this turn newly delivers. */
  fresh: string[];
  reused: boolean;
  empty: boolean;
};

export type HookTurnOptions = {
  proofMode: HookProofMode;
  readMode: HookReadMode;
  proofOnly?: boolean;
  /** Show at most this many `already loaded:` ids (cap fallback); the rest collapse into `(+N more)`. */
  alreadyLoadedLimit?: number;
};

/** Plan one prompt turn from a routed load and the keys the session already holds. No I/O. */
export function planHookTurn(event: string, load: AgentLoad, previous: string[], opts: HookTurnOptions): HookTurn {
  // Nothing selected means nothing to say; the tiered header alone is never injected.
  if (!load.selectedKeys.length || !load.text.trim()) {
    const output = proofOnlyOutput(event, opts.proofMode, skippedProof(opts.readMode, 'no-context'));
    return { output, additionalContext: contextOf(output), fresh: [], reused: false, empty: true };
  }
  const delivered = new Set(previous);
  const fresh = load.bodyKeys.filter((item) => !delivered.has(item));
  const reused = Boolean(opts.proofOnly) || (fresh.length === 0 && (load.alreadyLoaded.length > 0 || load.bodyKeys.length > 0));
  const proof: HookProof = {
    mode: opts.proofMode,
    decision: reused ? 'reused' : 'loaded',
    readMode: opts.readMode,
    selectedCount: load.selectedKeys.length,
    bodyCount: fresh.length,
    relatedCount: load.related,
    signature: setSignature(load.selectedKeys)
  };
  const output = reused
    ? proofOnlyOutput(event, opts.proofMode, proof, load.alreadyLoaded, opts.alreadyLoadedLimit)
    : contextOutput(event, load.text, proof, load.alreadyLoaded, opts.alreadyLoadedLimit);
  return { output, additionalContext: contextOf(output), fresh, reused, empty: false };
}

function contextOf(output: Record<string, any>): string {
  return String(output?.hookSpecificOutput?.additionalContext ?? '');
}

export function contextOutput(event: string, context: string, proof: HookProof, alreadyLoaded: string[], alreadyLoadedLimit?: number): Record<string, any> {
  const proofText = proofBlock(proof);
  const body = [`Engram auto-loaded context:\n\n${context}`, alreadyLoadedLine(alreadyLoaded, alreadyLoadedLimit)].filter(Boolean).join('\n\n');
  const additionalContext = proofText ? `${proofText}\n\n${body}` : body;
  return {
    hookSpecificOutput: {
      hookEventName: event,
      additionalContext
    },
    suppressOutput: true
  };
}

/** Proof plus the D7 `already loaded:` line; the line is context, so it survives `proof off`. */
export function proofOnlyOutput(event: string, proofMode: HookProofMode, proof: HookProof, alreadyLoaded: string[] = [], alreadyLoadedLimit?: number): Record<string, any> {
  const proofText = proofMode === 'off' ? '' : proofBlock(proof);
  const additionalContext = [proofText, alreadyLoadedLine(alreadyLoaded, alreadyLoadedLimit)].filter(Boolean).join('\n');
  if (!additionalContext) return {};
  return {
    hookSpecificOutput: {
      hookEventName: event,
      additionalContext
    },
    suppressOutput: true
  };
}

export function skippedProof(readMode: HookReadMode, reason: HookSkipReason): HookProof {
  return {
    mode: 'compact',
    decision: 'skipped',
    readMode,
    selectedCount: 0,
    bodyCount: 0,
    relatedCount: 0,
    signature: '-',
    reason
  };
}

function proofBlock(proof: HookProof): string {
  if (proof.mode === 'off') return '';
  return proofLine(proof);
}

function proofLine(proof: HookProof): string {
  if (proof.decision === 'loaded') {
    return `Engram proof: loaded ${proof.selectedCount}/${proof.relatedCount} routed (${proof.bodyCount} new bodies) via hook ${proof.readMode} (sig ${proof.signature}).`;
  }
  if (proof.decision === 'reused') {
    return `Engram proof: reused prior Engram context; ${proof.selectedCount}/${proof.relatedCount} routed, no new memory bodies (sig ${proof.signature}).`;
  }
  switch (proof.reason) {
    case 'manual':
      return 'Engram proof: no Engram load this turn (read mode manual).';
    case 'off':
      return 'Engram proof: no Engram load this turn (read mode off).';
    case 'startup-only':
      return 'Engram proof: no Engram load this turn (startup mode only injects on SessionStart).';
    default:
      return 'Engram proof: no Engram load this turn (0/0 routed memories).';
  }
}

/** The D7 line, ids sorted so the bytes do not depend on rank order; `limit` shortens it to `<first N> (+M more)`. */
function alreadyLoadedLine(ids: string[], limit = Infinity): string {
  if (!ids.length) return '';
  const sorted = [...ids].sort();
  if (sorted.length <= limit) return `already loaded: ${sorted.join(',')}`;
  const keep = Math.max(0, limit);
  return `already loaded: ${[sorted.slice(0, keep).join(','), `(+${sorted.length - keep} more)`].filter(Boolean).join(' ')}`;
}

/** Proof sig for a routed set: a hash of the sorted keys, so the same set always prints the same bytes. */
export function setSignature(keys: string[]): string {
  return shortSignature(sha256([...new Set(keys)].sort().join('\n')));
}

export function shortSignature(value: string): string {
  return value.slice(0, 8);
}
