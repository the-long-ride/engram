/** Host-memory extractor: topic files from Claude auto memory or Codex memories, body only, with the host type as a hint. */
import { parseFrontmatter } from '../../memory/frontmatter.js';
import { normalizeRelPath } from '../text.js';
import type { SourceExtractor } from '../types.js';

/** Host memory `type:` values that import; `user` (personal profile data) is deliberately absent. */
export const HOST_TYPE_MAP: ReadonlyMap<string, 'rule' | 'knowledge'> = new Map([
  ['feedback', 'rule'],
  ['project', 'knowledge'],
  ['reference', 'knowledge']
]);

/** Lower-cased `type:` of a host memory file's frontmatter, or '' when absent or unparseable. */
export function hostMemoryType(text: string): string {
  try {
    const type = parseFrontmatter(text).data.type;
    return typeof type === 'string' ? type.trim().toLowerCase() : '';
  } catch {
    return '';
  }
}

/**
 * Not part of `EXTRACTORS`, so workspace scans never use it. It keeps only the body: `name`, `description`, and
 * `modified` frontmatter are dropped, and the mapped host type becomes one hint line for the agent.
 */
export const hostMemoryExtractor: SourceExtractor = {
  id: 'host-memory',
  kind: 'docs',
  matches: (relPath) => /\.md$/i.test(relPath),
  extract(text, relPath) {
    let body = text;
    try { body = parseFrontmatter(text).body; } catch { /* malformed frontmatter: keep the text; redaction still applies */ }
    const hint = HOST_TYPE_MAP.get(hostMemoryType(text));
    return {
      file: normalizeRelPath(relPath),
      kind: 'docs',
      lines: [...(hint ? [`host type: ${hostMemoryType(text)} -> propose TYPE: ${hint}`] : []), ...body.split(/\r?\n/)],
      symbols: []
    };
  }
};
