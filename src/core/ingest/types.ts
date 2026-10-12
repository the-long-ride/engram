/** Shared types for pluggable take-control source extractors (docs, code, config, manifests). */

export type SourceKind = 'docs' | 'code' | 'config' | 'manifest';

/** Every source kind, in the order `--kind all` should expand to. */
export const SOURCE_KINDS: readonly SourceKind[] = ['docs', 'code', 'config', 'manifest'];

/**
 * A safe, compact view of one source file. `hash` covers the digest text (`lines` joined by newlines);
 * `rawHash` covers the raw source text so freshness checks can re-hash files without re-digesting them.
 * `chars` is the digest text length.
 */
export type SourceDigest = {
  file: string; kind: SourceKind; lines: string[]; symbols: string[]; hash: string; rawHash: string; chars: number;
};

/** What an extractor produces before sanitizing, truncation, and hashing. */
export type ExtractedSource = Omit<SourceDigest, 'hash' | 'rawHash' | 'chars'>;

export interface SourceExtractor {
  id: string;
  kind: SourceKind;
  matches(relPath: string): boolean;
  extract(text: string, relPath: string): ExtractedSource;
}
