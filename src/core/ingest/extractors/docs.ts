/** Docs extractor: today's take-control excerpt path (compactExcerpt over the whole document). */
import { isConvertibleDocument } from '../../integrations/markdown-them.js';
import { baseName, extensionOf, normalizeRelPath } from '../text.js';
import type { SourceExtractor } from '../types.js';

const DOC_EXTENSIONS = new Set(['md', 'mdx', 'mdc', 'txt', 'rst', 'adoc', 'json']);
const RULE_FILES = new Set(['.clinerules', '.windsurfrules', '.cursorrules']);

/**
 * Docs keep every line; `digestSource` then applies the same sanitize + compactExcerpt steps take-control
 * has always used, so `--kind docs` stays byte-identical. Convertible documents (docx, pdf, html, ...) match
 * too: callers pass the Markdown that markdown-them produced for them.
 */
export const docsExtractor: SourceExtractor = {
  id: 'docs',
  kind: 'docs',
  matches(relPath) {
    return DOC_EXTENSIONS.has(extensionOf(relPath)) || RULE_FILES.has(baseName(relPath)) || isConvertibleDocument(relPath);
  },
  extract(text, relPath) {
    const lines = text.split(/\r?\n/);
    const symbols = lines.map((line) => /^#{1,6}\s+(.+)$/.exec(line.trim())?.[1].replace(/\s#+$/, '').trim() ?? '').filter(Boolean);
    return { file: normalizeRelPath(relPath), kind: 'docs', lines, symbols };
  }
};
