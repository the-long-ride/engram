/** Deterministic technical concept clusters for zero-cloud synonym recall. */
import { stem } from '../system/bm25.js';
import { meaningfulWordList } from '../system/text.js';

const RAW_CONCEPT_CLUSTERS: readonly (readonly string[])[] = [
  ['throttle', 'throttling', 'rate-limit', 'ratelimit', 'quota', 'limiter'],
  ['retry', 'retries', 'backoff', 'jitter', 'circuit-breaker', 'resilient'],
  ['auth', 'oauth', 'jwt', 'bearer', 'xác-thực', 'đăng-nhập'],
  ['cache', 'caching', 'memoize', 'ttl', 'invalidate', 'evict'],
  ['db', 'database', 'postgres', 'postgresql', 'sql', 'sqlite'],
  ['secret', 'credential', 'apikey', 'redact', 'sanitize'],
  ['pnpm', 'npm', 'yarn', 'lockfile'],
  ['deploy', 'release', 'rollout', 'publish'],
  ['latency', 'performance', 'bottleneck', 'throughput'],
  ['webhook', 'callback', 'hmac'],
  ['tauri', 'ipc', 'invoke', 'webview', 'webview2'],
  ['tokio', 'mutex', 'deadlock', 'starvation'],
  ['memory-leak', 'heap', 'bloat', 'ngốn'],
  ['angular', 'signals', 'zoneless', 'rxjs'],
  ['ssr', 'hydration', 'prerender'],
  ['a11y', 'accessibility', 'wcag', 'aria', 'focus-trap'],
  ['responsive', 'viewport', 'overflow'],
  ['supabase', 'rls', 'row-level-security', 'postgrest'],
  ['migration', 'ddl', 'alter-table'],
  ['pgvector', 'embedding', 'cosine'],
  ['edge-function', 'deno'],
  ['xss', 'csrf', 'csp', 'sanitize'],
  ['permission', 'rbac', 'quyền'],
  ['crash', 'exception', 'lỗi']
];

const STEM_TO_SYNONYMS = buildSynonymMap(RAW_CONCEPT_CLUSTERS);
const CORPUS_MIN_ENTRIES = 4;
const CORPUS_MIN_COOCCURRENCE = 2;
const CORPUS_MAX_DF_RATIO = 0.35;

function buildSynonymMap(clusters: readonly (readonly string[])[]): Map<string, Set<string>> {
  const index = new Map<string, Set<string>>();
  for (const cluster of clusters) {
    const stems = new Set<string>();
    for (const term of cluster) {
      for (const word of meaningfulWordList(term)) stems.add(stem(word));
    }
    for (const termStem of stems) {
      let peers = index.get(termStem);
      if (!peers) {
        peers = new Set<string>();
        index.set(termStem, peers);
      }
      for (const peer of stems) {
        if (peer !== termStem) peers.add(peer);
      }
    }
  }
  return index;
}

/** Build symmetric concept bridges from co-occurring authored tags and IDs across durable corpus entries. */
export function buildCorpusConceptMap(
  entries: Array<{ id: string; tags?: string[]; autoTags?: boolean; tier?: string }>
): Map<string, Set<string>> {
  const durable = entries.filter((entry) => entry.tier !== 'working');
  if (durable.length < CORPUS_MIN_ENTRIES) return new Map();
  const docSets: Set<string>[] = [];
  const df = new Map<string, number>();
  for (const entry of durable) {
    const stems = new Set<string>();
    const sources = [entry.id, ...(entry.autoTags ? [] : (entry.tags ?? []))];
    for (const text of sources) {
      for (const word of meaningfulWordList(text)) stems.add(stem(word));
    }
    if (!stems.size) continue;
    docSets.push(stems);
    for (const term of stems) df.set(term, (df.get(term) ?? 0) + 1);
  }
  const maxDf = durable.length * CORPUS_MAX_DF_RATIO;
  const pairCounts = new Map<string, number>();
  for (const stems of docSets) {
    const eligible = [...stems].filter((term) => (df.get(term) ?? 0) <= maxDf).sort();
    for (let i = 0; i < eligible.length; i += 1) {
      for (let j = i + 1; j < eligible.length; j += 1) {
        const pair = `${eligible[i]}\0${eligible[j]}`;
        pairCounts.set(pair, (pairCounts.get(pair) ?? 0) + 1);
      }
    }
  }
  const map = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    let peers = map.get(a);
    if (!peers) {
      peers = new Set<string>();
      map.set(a, peers);
    }
    peers.add(b);
  };
  for (const [pair, count] of pairCounts) {
    if (count < CORPUS_MIN_COOCCURRENCE) continue;
    const [a, b] = pair.split('\0');
    if (a && b) {
      link(a, b);
      link(b, a);
    }
  }
  return map;
}

/** Expand stemmed query terms to technical concept synonyms not already present in `stems`. */
export function expandConceptStems(stems: Iterable<string>, corpusMap?: Map<string, Set<string>>): Set<string> {
  const existing = new Set<string>(stems);
  const expanded = new Set<string>();
  for (const term of existing) {
    for (const source of [STEM_TO_SYNONYMS, corpusMap]) {
      const peers = source?.get(term);
      if (!peers) continue;
      for (const peer of peers) {
        if (!existing.has(peer)) expanded.add(peer);
      }
    }
  }
  return expanded;
}

/** Require at least one synonym hit in strong fields; longer queries (4+ stems) also need 2+ total hits. */
export function hasStrongConceptOverlap(
  gateStems: Set<string>,
  strongStems: Set<string>,
  allStems: Set<string>,
  corpusMap?: Map<string, Set<string>>
): boolean {
  const synonyms = expandConceptStems(gateStems, corpusMap);
  if (!synonyms.size) return false;
  let strongSynHits = 0;
  for (const syn of synonyms) {
    if (strongStems.has(syn)) strongSynHits += 1;
  }
  if (!strongSynHits) return false;
  if (gateStems.size < 4) return true;
  let totalHits = 0;
  for (const term of allStems) {
    if (gateStems.has(term) || synonyms.has(term)) totalHits += 1;
  }
  return totalHits >= 2;
}
