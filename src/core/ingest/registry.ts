/** Source extractor registry: pick the first allowed extractor for a path and build a safe SourceDigest. */
import { sha256 } from '../safety/hash.js';
import { scanInjection, scanSensitive } from '../safety/security.js';
import { codeExtractor } from './extractors/code.js';
import { configExtractor } from './extractors/config.js';
import { docsExtractor } from './extractors/docs.js';
import { hostMemoryExtractor } from './extractors/host-memory.js';
import { manifestExtractor } from './extractors/manifest.js';
import { compactExcerpt, normalizeRelPath, sanitizeSource } from './text.js';
import type { ExtractedSource, SourceDigest, SourceExtractor, SourceKind } from './types.js';

/** Most specific first: a package.json is a manifest before it is config, a .yml workflow before config. */
const EXTRACTORS: readonly SourceExtractor[] = [manifestExtractor, configExtractor, codeExtractor, docsExtractor];
const MAX_SYMBOL_CHARS = 120;

/** First extractor whose kind is allowed and whose path pattern matches. */
export function extractorFor(relPath: string, kinds: Set<SourceKind>): SourceExtractor | undefined {
  const file = normalizeRelPath(relPath);
  return EXTRACTORS.find((extractor) => kinds.has(extractor.kind) && extractor.matches(file));
}

/**
 * Digest one source: extract, then redact secrets and drop injection lines on the joined text, then keep
 * whole lines within `maxChars` (the same compactExcerpt take-control uses). Undefined when no extractor
 * matches; an extractor failure yields an empty digest instead of throwing.
 */
export function digestSource(relPath: string, text: string, kinds: Set<SourceKind>, maxChars: number): SourceDigest | undefined {
  const file = normalizeRelPath(relPath);
  const extractor = extractorFor(file, kinds);
  return extractor ? digestWith(extractor, file, text, maxChars) : undefined;
}

/**
 * Digest one host-local memory file (`take-control --from`): the body only, through the same extract, redact, drop
 * injection lines, and compact steps. Not reachable from `extractorFor`, so workspace scans are unchanged.
 */
export function digestHostMemory(relPath: string, text: string, maxChars: number): SourceDigest {
  return digestWith(hostMemoryExtractor, normalizeRelPath(relPath), text, maxChars);
}

function digestWith(extractor: SourceExtractor, file: string, text: string, maxChars: number): SourceDigest {
  const extracted = safeExtract(extractor, text, file);
  const digestText = compactExcerpt(sanitizeSource(extracted.lines.join('\n')), maxChars);
  return {
    file,
    kind: extractor.kind,
    lines: digestText ? digestText.split('\n') : [],
    symbols: safeSymbols(extracted.symbols),
    hash: sha256(digestText),
    rawHash: sha256(text),
    chars: digestText.length
  };
}

function safeExtract(extractor: SourceExtractor, text: string, file: string): ExtractedSource {
  try { return extractor.extract(text, file); }
  catch { return { file, kind: extractor.kind, lines: [], symbols: [] }; }
}

/** Symbols are short names, not prose: drop overlong ones and any that look sensitive or carry injection text. */
function safeSymbols(symbols: string[]): string[] {
  return [...new Set(symbols.map((symbol) => symbol.trim()))]
    .filter((symbol) => symbol && symbol.length <= MAX_SYMBOL_CHARS && !scanSensitive(symbol).length && !scanInjection(symbol).length);
}
