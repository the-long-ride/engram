/** Code extractor: exported/public signatures, doc-comment first lines, and one imports line; never bodies. */
import { quotedItems } from '../structured.js';
import { extensionOf, nameList, normalizeRelPath, safeClip } from '../text.js';
import type { SourceExtractor } from '../types.js';

type ImportScan = { specs: string[]; consumed: boolean };
type ScanState = { pendingImport: boolean };
type Language = {
  /** Anchored declaration patterns; the first non-empty capture group is the symbol name. */
  decl: RegExp;
  docs: { block?: boolean; triple?: boolean; slash?: boolean; hash?: boolean };
  commentPrefix: string;
  stopAtEquals: (line: string) => boolean;
  stopAtColon?: boolean;
  /** String delimiters to blank inside signatures (Rust omits `'` because of lifetimes). */
  quotes?: string;
  imports: (trimmed: string, state: ScanState) => ImportScan;
};

// Every pattern is anchored and has no nested quantifier over overlapping classes, so matching stays linear.
const PUBLIC_DECL = /^\s*public\s+(?:(?:static|sealed|abstract|partial|readonly|async|virtual|override|new|unsafe|extern|required|final|synchronized|native|default|delegate)\s+)*(?:(?:class|record|struct|interface|enum|@interface)\s+(?:class\s+|struct\s+)?(\w+)|(?:<[^>]*>\s+)?[\w<>,.?[\]]+\s+(\w+)\s*[(<]|(\w+)\s*\()/;
const DEFAULT_QUOTES = `"'\``;
const NONE: ImportScan = { specs: [], consumed: false };
const never = () => false;

const TYPESCRIPT: Language = {
  decl: /^\s*export\s+(?:default\s+)?(?:declare\s+)?(?:abstract\s+)?(?:async\s+)?(?:function\*?|class|const|let|var|type|interface|enum|namespace)\s*([\w$]*)/,
  docs: { block: true },
  commentPrefix: '//',
  stopAtEquals: (line) => /^\s*export\s+(?:declare\s+)?(?:const|let|var)\b/.test(line),
  imports: scriptImports
};
const CSHARP: Language = {
  decl: PUBLIC_DECL,
  docs: { triple: true },
  commentPrefix: '//',
  stopAtEquals: never,
  imports: (trimmed) => single(/^(?:global\s+)?using\s+(?:static\s+)?([\w.]+)\s*;/.exec(trimmed)?.[1])
};
const JAVA: Language = {
  decl: PUBLIC_DECL,
  docs: { block: true },
  commentPrefix: '//',
  stopAtEquals: never,
  imports: (trimmed) => single(/^import\s+(?:static\s+)?([\w.*]+)/.exec(trimmed)?.[1])
};
const KOTLIN: Language = {
  decl: /^(?:public\s+)?(?:(?:data|sealed|abstract|open|enum|inline|value|annotation|suspend|operator|infix|override)\s+)*(?:class|interface|object|fun|typealias)\s+(?:<[^>]*>\s*)?(?:[\w.]+\.)?(\w+)/,
  docs: { block: true },
  commentPrefix: '//',
  stopAtEquals: () => true,
  imports: JAVA.imports
};
const PYTHON: Language = {
  decl: /^(?:async\s+)?def\s+([A-Za-z]\w*)|^class\s+([A-Za-z]\w*)/,
  docs: { hash: true },
  commentPrefix: '#',
  stopAtEquals: never,
  stopAtColon: true,
  imports: pythonImports
};
const GO: Language = {
  decl: /^func\s+(?:\([^)]*\)\s*)?([A-Z]\w*)|^type\s+([A-Z]\w*)/,
  docs: { slash: true },
  commentPrefix: '//',
  stopAtEquals: never,
  imports: goImports
};
const RUST: Language = {
  decl: /^\s*pub\s+(?:(?:async|const|unsafe|extern)\s+)*(?:fn|struct|enum|trait|type|mod|union)\s+(\w+)/,
  docs: { block: true, triple: true },
  commentPrefix: '//',
  stopAtEquals: never,
  quotes: '"',
  imports: (trimmed) => single(/^(?:pub\s+)?use\s+([\w:]+)/.exec(trimmed)?.[1]?.replace(/:+$/, ''))
};

const LANGUAGES: Record<string, Language> = {
  ts: TYPESCRIPT, tsx: TYPESCRIPT, mts: TYPESCRIPT, cts: TYPESCRIPT,
  js: TYPESCRIPT, jsx: TYPESCRIPT, mjs: TYPESCRIPT, cjs: TYPESCRIPT,
  cs: CSHARP, java: JAVA, kt: KOTLIN, kts: KOTLIN, py: PYTHON, go: GO, rs: RUST
};

export const codeExtractor: SourceExtractor = {
  id: 'code',
  kind: 'code',
  matches(relPath) {
    return Boolean(LANGUAGES[extensionOf(relPath)]);
  },
  extract(text, relPath) {
    const { lines, symbols, imports } = scanCode(text, LANGUAGES[extensionOf(relPath)]);
    const header = imports.length ? [safeClip(`imports: ${nameList(imports)}`)] : [];
    return { file: normalizeRelPath(relPath), kind: 'code', lines: [...header, ...lines], symbols: [...new Set(symbols)].slice(0, 64) };
  }
};

function scanCode(text: string, lang: Language): { lines: string[]; symbols: string[]; imports: string[] } {
  const lines: string[] = [];
  const symbols: string[] = [];
  const imports: string[] = [];
  const state: ScanState = { pendingImport: false };
  let doc: string[] = [];
  let inBlock = false;
  let blockIsDoc = false;
  for (const raw of text.split(/\r?\n/)) {
    const trimmed = raw.trim();
    if (inBlock) {
      if (blockIsDoc) doc.push(trimmed);
      if (trimmed.includes('*/')) inBlock = false;
      continue;
    }
    if (trimmed.startsWith('/*')) {
      blockIsDoc = Boolean(lang.docs.block) && trimmed.startsWith('/**') && !trimmed.startsWith('/**/');
      if (blockIsDoc) doc = [trimmed];
      inBlock = !trimmed.includes('*/', 2);
      continue;
    }
    if (trimmed.startsWith('//')) {
      const isDoc = trimmed.startsWith('///') ? lang.docs.triple || lang.docs.slash : lang.docs.slash;
      if (isDoc) doc.push(trimmed);
      continue;
    }
    if (lang.docs.hash && trimmed.startsWith('#')) {
      doc.push(trimmed);
      continue;
    }
    if (!trimmed) { doc = []; continue; }
    if (/^(?:@|\[|#\[)/.test(trimmed)) continue;
    const found = lang.imports(trimmed, state);
    for (const spec of found.specs) if (spec) imports.push(spec);
    if (found.consumed) { doc = []; continue; }
    const match = lang.decl.exec(raw);
    if (match) {
      const summary = firstDocLine(doc);
      if (summary) lines.push(`${lang.commentPrefix} ${summary}`);
      lines.push(signature(raw, lang.stopAtEquals(raw), Boolean(lang.stopAtColon), lang.quotes ?? DEFAULT_QUOTES));
      const name = match.slice(1).find(Boolean);
      if (name) symbols.push(name);
    }
    doc = [];
  }
  return { lines, symbols, imports };
}

/**
 * Cut a declaration line before its body: the first depth-0 `{`, `;`, `=>` (and `=` / `:` when asked).
 * Inside the kept signature, string literals are emptied (`"…"` -> `""`) and parameter defaults (`= value` at
 * depth >= 1) are dropped, so default-argument secrets never reach the digest. One linear pass.
 */
function signature(line: string, stopAtEquals: boolean, stopAtColon: boolean, quotes: string): string {
  const out: string[] = [];
  let depth = 0;
  let quote = '';
  let skipDepth = -1;
  for (let index = 0; index < line.length; index += 1) {
    const ch = line[index];
    const next = line[index + 1];
    const prev = line[index - 1] ?? '';
    const assigns = ch === '=' && next !== '=' && next !== '>' && !'=!<>'.includes(prev);
    if (quote) {
      if (ch === quote) { quote = ''; if (skipDepth < 0) out.push(ch); }
      continue;
    }
    if (quotes.includes(ch)) { quote = ch; if (skipDepth < 0) out.push(ch); continue; }
    const opens = ch === '(' || ch === '[' || ch === '<' || (ch === '{' && depth > 0);
    const closes = ch === ')' || ch === ']' || (ch === '}' && depth > 0) || (ch === '>' && prev !== '=' && prev !== '-');
    if (skipDepth >= 0) {
      if (opens) depth += 1;
      else if (closes && depth > skipDepth) depth -= 1;
      else if (closes || (ch === ',' && depth === skipDepth)) {
        skipDepth = -1;
        trimTrailing(out);
        out.push(ch);
        if (closes) depth = Math.max(0, depth - 1);
      }
      continue;
    }
    if (opens) depth += 1;
    else if (closes) depth = Math.max(0, depth - 1);
    else if (depth === 0 && (ch === '{' || ch === ';' || (ch === '=' && next === '>') || (stopAtColon && ch === ':') || (stopAtEquals && assigns))) break;
    else if (depth > 0 && assigns) { skipDepth = depth; continue; }
    out.push(ch);
  }
  trimTrailing(out, ' \t=:');
  return safeClip(out.join('').trim());
}

function trimTrailing(out: string[], chars = ' \t'): void {
  while (out.length && chars.includes(out[out.length - 1])) out.pop();
}

function firstDocLine(doc: string[]): string {
  for (const raw of doc) {
    let text = raw.replace(/^\/\*\*+/, '').replace(/^\/\/\/?/, '').replace(/^#+/, '');
    if (text.endsWith('*/')) text = text.slice(0, -2);
    text = text.replace(/^\s*\*+/, '').replace(/<[^<>]*>/g, '').trim();
    if (text && !text.startsWith('@')) return safeClip(text, 200);
  }
  return '';
}

function scriptImports(trimmed: string, state: ScanState): ImportScan {
  const required = [...trimmed.matchAll(/\brequire\(\s*['"]([^'"]+)['"]\s*\)/g)].map((match) => match[1]);
  if (state.pendingImport) {
    if (trimmed.includes('}')) state.pendingImport = false;
    return { specs: [trailingQuoted(trimmed)], consumed: true };
  }
  if (!/^(?:import\b|export\s+(?:type\s+)?(?:\*|\{))/.test(trimmed)) return { specs: required, consumed: false };
  const spec = trailingQuoted(trimmed);
  if (!spec && !/['"]/.test(trimmed) && trimmed.includes('{') && !trimmed.includes('}')) state.pendingImport = true;
  return { specs: [spec, ...required], consumed: true };
}

function pythonImports(trimmed: string): ImportScan {
  const words = trimmed.split(/\s+/);
  if (words[0] === 'from' && words[2] === 'import') return single(words[1]);
  if (words[0] !== 'import') return NONE;
  return { specs: trimmed.slice(6).split(',').map((part) => part.trim().split(/\s+/)[0]), consumed: true };
}

function goImports(trimmed: string, state: ScanState): ImportScan {
  if (state.pendingImport) {
    if (trimmed.startsWith(')')) state.pendingImport = false;
    return { specs: quotedItems(trimmed).slice(0, 1), consumed: true };
  }
  if (!/^import\b/.test(trimmed)) return NONE;
  if (/^import\s*\($/.test(trimmed)) state.pendingImport = true;
  return { specs: quotedItems(trimmed).slice(0, 1), consumed: true };
}

/** Module specifier at the end of an import/export line (`... from 'x';`, `import 'x';`). */
function trailingQuoted(trimmed: string): string {
  const line = trimmed.endsWith(';') ? trimmed.slice(0, -1).trimEnd() : trimmed;
  const quote = line[line.length - 1];
  if (quote !== '"' && quote !== "'") return '';
  const open = line.lastIndexOf(quote, line.length - 2);
  return open >= 0 ? line.slice(open + 1, -1) : '';
}

function single(spec: string | undefined): ImportScan {
  return spec ? { specs: [spec], consumed: true } : NONE;
}
