/** Light stemming and an in-memory BM25 index for deterministic lexical ranking. */
const K1 = 1.2;
const B = 0.75;
const MIN_STEM = 3;

// Ordered suffix rules; the first one that fits (stem stays >= MIN_STEM) wins, nothing else is stripped.
const SUFFIX_RULES: Array<{ suffix: string; replace: string; skipAfter?: string }> = [
  { suffix: 'ies', replace: 'y' },
  { suffix: 'sses', replace: 'ss' },
  { suffix: 'ing', replace: '' },
  { suffix: 'ed', replace: '' },
  { suffix: 'es', replace: '' },
  { suffix: 's', replace: '', skipAfter: 's' },
  { suffix: 'ly', replace: '' },
  { suffix: 'ment', replace: '' }
];

/** Strip at most one inflectional suffix so `routing`/`routes` and `memory`/`memories` meet. */
export function stem(word: string): string {
  for (const rule of SUFFIX_RULES) {
    if (!word.endsWith(rule.suffix)) continue;
    const base = word.slice(0, word.length - rule.suffix.length);
    if (base.length < MIN_STEM) continue;
    if (rule.skipAfter && base.endsWith(rule.skipAfter)) continue;
    return base + rule.replace;
  }
  return word;
}

export type Bm25Index = { score(query: string[]): Map<string, number> };

/** Build a BM25 (k1=1.2, b=0.75) index; `score` returns only documents with a positive score. */
export function buildBm25(docs: Array<{ key: string; terms: string[] }>): Bm25Index {
  const frequencies = docs.map((doc) => {
    const tf = new Map<string, number>();
    for (const term of doc.terms) tf.set(term, (tf.get(term) ?? 0) + 1);
    return { key: doc.key, tf, length: doc.terms.length };
  });
  const documentFrequency = new Map<string, number>();
  for (const doc of frequencies) for (const term of doc.tf.keys()) documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
  const count = frequencies.length;
  const averageLength = count ? frequencies.reduce((sum, doc) => sum + doc.length, 0) / count : 0;
  // Lucene-style IDF stays positive even for terms present in most documents.
  const idf = (term: string) => {
    const n = documentFrequency.get(term) ?? 0;
    return Math.log(1 + (count - n + 0.5) / (n + 0.5));
  };
  return {
    score(query: string[]): Map<string, number> {
      const out = new Map<string, number>();
      const terms = [...new Set(query)].filter((term) => documentFrequency.has(term));
      for (const doc of frequencies) {
        let total = 0;
        for (const term of terms) {
          const tf = doc.tf.get(term);
          if (!tf) continue;
          const norm = averageLength ? doc.length / averageLength : 1;
          total += idf(term) * (tf * (K1 + 1)) / (tf + K1 * (1 - B + B * norm));
        }
        if (total > 0) out.set(doc.key, total);
      }
      return out;
    }
  };
}

export type Bm25FieldSpec = { name: string; weight: number; b: number };

/** Build a field-weighted BM25F (Robertson/Zaragoza, k1=1.2) index; `score` returns only positive-score documents. */
export function buildBm25F(
  docs: Array<{ key: string; fields: Record<string, string[]> }>,
  specs: Bm25FieldSpec[]
): Bm25Index {
  const fieldTotals = specs.map(() => 0);
  const documentFrequency = new Map<string, number>();
  const indexed = docs.map((doc) => {
    const docTerms = new Set<string>();
    const fields = specs.map((spec, idx) => {
      const terms = doc.fields[spec.name] ?? [];
      const tf = new Map<string, number>();
      for (const term of terms) {
        tf.set(term, (tf.get(term) ?? 0) + 1);
        docTerms.add(term);
      }
      fieldTotals[idx] = (fieldTotals[idx] ?? 0) + terms.length;
      return { tf, length: terms.length };
    });
    for (const term of docTerms) documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
    return { key: doc.key, fields };
  });
  const count = indexed.length;
  const avgLengths = fieldTotals.map((total) => (count ? total / count : 0));
  const idf = (term: string) => {
    const n = documentFrequency.get(term) ?? 0;
    return Math.log(1 + (count - n + 0.5) / (n + 0.5));
  };
  return {
    score(query: string[]): Map<string, number> {
      const out = new Map<string, number>();
      const terms = [...new Set(query)].filter((term) => documentFrequency.has(term));
      for (const doc of indexed) {
        let total = 0;
        for (const term of terms) {
          let pseudoTf = 0;
          for (let i = 0; i < specs.length; i += 1) {
            const spec = specs[i];
            const field = doc.fields[i];
            if (!spec || !field) continue;
            const tf = field.tf.get(term);
            if (!tf) continue;
            const avgLen = avgLengths[i] ?? 0;
            const norm = avgLen ? field.length / avgLen : 1;
            pseudoTf += (spec.weight * tf) / (1 - spec.b + spec.b * norm);
          }
          if (pseudoTf > 0) total += idf(term) * ((pseudoTf * (K1 + 1)) / (pseudoTf + K1));
        }
        if (total > 0) out.set(doc.key, total);
      }
      return out;
    }
  };
}
