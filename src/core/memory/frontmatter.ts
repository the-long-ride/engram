/** Safe YAML frontmatter parsing and deterministic serialization. */
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

type ParseResult<T> = { value: T; next: number };

type SourceLine = {
  raw: string;
  indent: number;
  text: string;
};

export type ParsedFrontmatter = {
  data: Record<string, unknown>;
  body: string;
  rawBlock: string;
};

/** Parse supported YAML frontmatter without aliases or duplicate keys. */
export function parseFrontmatter(raw: string): ParsedFrontmatter {
  const match = raw.match(FRONTMATTER);
  if (!match) return { data: {}, body: raw, rawBlock: '' };
  const lines = match[1].replace(/\r/g, '').split('\n').map(toSourceLine);
  rejectAliasSyntax(lines);
  const first = nextMeaningful(lines, 0);
  if (first === -1) return { data: {}, body: raw.slice(match[0].length), rawBlock: match[0] };
  if (lines[first].text.startsWith('-')) throw new Error('Memory frontmatter must be a YAML mapping');
  const parsed = parseMap(lines, first, lines[first].indent);
  const trailing = nextMeaningful(lines, parsed.next);
  if (trailing !== -1) throw new Error(`Invalid memory frontmatter indentation near: ${lines[trailing].text}`);
  return { data: parsed.value, body: raw.slice(match[0].length), rawBlock: match[0] };
}

/** Render canonical YAML frontmatter with recursively sorted keys. */
export function renderFrontmatter(data: Record<string, unknown>): string {
  if (!isPlainRecord(data)) throw new Error('Memory frontmatter must be a YAML mapping');
  const lines = renderMap(sortValue(data) as Record<string, unknown>, 0);
  return `---\n${lines.join('\n')}\n---\n`;
}

/** Apply a top-level frontmatter patch while preserving the Markdown body. */
export function updateFrontmatter(raw: string, patch: Record<string, unknown | undefined>): string {
  const parsed = parseFrontmatter(raw);
  const next: Record<string, unknown> = { ...parsed.data };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) delete next[key];
    else next[key] = value;
  }
  return `${renderFrontmatter(next)}${parsed.body}`;
}

/** Normalize a scalar or YAML array into a de-duplicated string list. */
export function frontmatterStringList(value: unknown): string[] {
  const values = Array.isArray(value)
    ? value.map((item) => String(item))
    : typeof value === 'string'
      ? splitInline(value)
      : [];
  return [...new Set(values.map((item) => item.trim()).filter(Boolean))];
}

function toSourceLine(raw: string): SourceLine {
  if (/^\t+/.test(raw)) throw new Error('Invalid memory frontmatter: tabs are not allowed for indentation');
  const indent = raw.match(/^ */)?.[0].length ?? 0;
  return { raw, indent, text: raw.slice(indent) };
}

function rejectAliasSyntax(lines: SourceLine[]): void {
  for (const line of lines) {
    const text = stripQuoted(line.text);
    if (/(^|[\s:[,{])(?:&|\*)[A-Za-z0-9_-]+/.test(text) || /^<<\s*:/.test(text)) {
      throw new Error('Invalid memory frontmatter alias');
    }
  }
}

function stripQuoted(value: string): string {
  let out = '';
  let quote = '';
  let escaped = false;
  for (const char of value) {
    if (escaped) {
      escaped = false;
      if (!quote) out += char;
      continue;
    }
    if (char === '\\' && quote === '"') {
      escaped = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    out += char;
  }
  return out;
}

function parseMap(lines: SourceLine[], start: number, indent: number): ParseResult<Record<string, unknown>> {
  const value: Record<string, unknown> = {};
  let index = start;
  while (index < lines.length) {
    index = nextMeaningful(lines, index);
    if (index === -1) return { value, next: lines.length };
    const line = lines[index];
    if (line.indent < indent) break;
    if (line.indent > indent) throw new Error(`Invalid memory frontmatter indentation near: ${line.text}`);
    if (line.text.startsWith('-')) break;
    const split = splitKeyValue(line.text);
    if (!split.key) throw new Error(`Invalid memory frontmatter key near: ${line.text}`);
    if (Object.hasOwn(value, split.key)) throw new Error(`Duplicate memory frontmatter key: ${split.key}`);

    if (isBlockScalarIndicator(split.rawValue)) {
      const block = parseBlockScalar(lines, index + 1, indent, split.rawValue);
      value[split.key] = block.value;
      index = block.next;
      continue;
    }

    if (!split.rawValue.trim()) {
      const childStart = nextMeaningful(lines, index + 1);
      if (childStart !== -1 && lines[childStart].indent > indent) {
        const childIndent = lines[childStart].indent;
        const child = lines[childStart].text.startsWith('-')
          ? parseList(lines, childStart, childIndent)
          : parseMap(lines, childStart, childIndent);
        value[split.key] = child.value;
        index = child.next;
        continue;
      }
      value[split.key] = null;
      index += 1;
      continue;
    }

    value[split.key] = parseScalar(split.rawValue.trim());
    index += 1;
  }
  return { value, next: index };
}

function parseList(lines: SourceLine[], start: number, indent: number): ParseResult<unknown[]> {
  const value: unknown[] = [];
  let index = start;
  while (index < lines.length) {
    index = nextMeaningful(lines, index);
    if (index === -1) return { value, next: lines.length };
    const line = lines[index];
    if (line.indent < indent) break;
    if (line.indent > indent) throw new Error(`Invalid memory frontmatter list indentation near: ${line.text}`);
    if (!line.text.startsWith('-')) break;
    const rawItem = line.text.slice(1).trimStart();
    if (!rawItem) {
      const childStart = nextMeaningful(lines, index + 1);
      if (childStart === -1 || lines[childStart].indent <= indent) {
        value.push(null);
        index += 1;
        continue;
      }
      const childIndent = lines[childStart].indent;
      const child = lines[childStart].text.startsWith('-')
        ? parseList(lines, childStart, childIndent)
        : parseMap(lines, childStart, childIndent);
      value.push(child.value);
      index = child.next;
      continue;
    }
    const mapping = trySplitKeyValue(rawItem);
    if (mapping) {
      const item: Record<string, unknown> = {};
      item[mapping.key] = mapping.rawValue.trim() ? parseScalar(mapping.rawValue.trim()) : null;
      const childStart = nextMeaningful(lines, index + 1);
      if (childStart !== -1 && lines[childStart].indent > indent) {
        const rest = parseMap(lines, childStart, lines[childStart].indent);
        for (const [key, childValue] of Object.entries(rest.value)) {
          if (Object.hasOwn(item, key)) throw new Error(`Duplicate memory frontmatter key: ${key}`);
          item[key] = childValue;
        }
        index = rest.next;
      } else index += 1;
      value.push(item);
      continue;
    }
    value.push(parseScalar(rawItem));
    index += 1;
  }
  return { value, next: index };
}

function parseBlockScalar(lines: SourceLine[], start: number, parentIndent: number, indicator: string): ParseResult<string> {
  let end = start;
  let minimumIndent = Number.POSITIVE_INFINITY;
  while (end < lines.length) {
    const line = lines[end];
    if (line.text.trim() && line.indent <= parentIndent) break;
    if (line.text.trim()) minimumIndent = Math.min(minimumIndent, line.indent);
    end += 1;
  }
  if (!Number.isFinite(minimumIndent)) minimumIndent = parentIndent + 2;
  const content = lines.slice(start, end).map((line) =>
    line.raw.trim() ? line.raw.slice(Math.min(minimumIndent, line.raw.length)) : ''
  );
  const body = indicator.startsWith('>') ? foldBlock(content) : content.join('\n');
  const withTerminalBreak = content.length ? `${body}\n` : '';
  const chomp = indicator.at(-1);
  const rendered = chomp === '-'
    ? withTerminalBreak.replace(/\n+$/, '')
    : chomp === '+'
      ? withTerminalBreak
      : withTerminalBreak.replace(/\n+$/, '\n');
  return { value: rendered, next: end };
}

function foldBlock(lines: string[]): string {
  let output = '';
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line) {
      output = output.replace(/ $/, '') + '\n';
      continue;
    }
    output += line;
    if (index < lines.length - 1) output += lines[index + 1] ? ' ' : '\n';
  }
  return output;
}

function splitKeyValue(text: string): { key: string; rawValue: string } {
  const result = trySplitKeyValue(text);
  if (!result) throw new Error(`Invalid memory frontmatter mapping near: ${text}`);
  return result;
}

function trySplitKeyValue(text: string): { key: string; rawValue: string } | undefined {
  const index = findTopLevelColon(text);
  if (index < 0) return undefined;
  const rawKey = text.slice(0, index).trim();
  const keyValue = parseKey(rawKey);
  return { key: keyValue, rawValue: text.slice(index + 1) };
}

function findTopLevelColon(text: string): number {
  let quote = '';
  let escaped = false;
  let square = 0;
  let curly = 0;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\' && quote === '"') {
      escaped = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === '[') square += 1;
    else if (char === ']') {
      square -= 1;
      if (square < 0) throw new Error('Invalid memory frontmatter: unbalanced collection');
    }
    else if (char === '{') curly += 1;
    else if (char === '}') {
      curly -= 1;
      if (curly < 0) throw new Error('Invalid memory frontmatter: unbalanced collection');
    }
    else if (char === ':' && square === 0 && curly === 0) return index;
  }
  if (quote) throw new Error('Invalid memory frontmatter: unterminated quote');
  if (square !== 0 || curly !== 0) throw new Error('Invalid memory frontmatter: unbalanced collection');
  return -1;
}

function parseKey(value: string): string {
  if (!value) return '';
  const parsed = parseScalar(value);
  if (typeof parsed !== 'string' || !parsed.trim()) throw new Error('Memory frontmatter keys must be text');
  return parsed;
}

function parseScalar(value: string): unknown {
  const plain = stripInlineComment(value).trim();
  if (!plain) return '';
  if (plain.startsWith('[') || plain.endsWith(']')) {
    if (!(plain.startsWith('[') && plain.endsWith(']'))) throw new Error('Invalid inline YAML array');
    return parseInlineArray(plain.slice(1, -1));
  }
  if (plain.startsWith('{') || plain.endsWith('}')) {
    if (!(plain.startsWith('{') && plain.endsWith('}'))) throw new Error('Invalid inline YAML object');
    return parseInlineObject(plain.slice(1, -1));
  }
  if (plain.startsWith('"')) {
    try {
      const parsed = JSON.parse(plain);
      if (typeof parsed !== 'string') throw new Error('not text');
      return parsed;
    } catch (error) {
      throw new Error(`Invalid double-quoted YAML string: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (plain.startsWith("'")) {
    if (!plain.endsWith("'")) throw new Error('Invalid single-quoted YAML string');
    return plain.slice(1, -1).replace(/''/g, "'");
  }
  if (plain === 'null' || plain === '~') return null;
  if (plain === 'true') return true;
  if (plain === 'false') return false;
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(plain)) return Number(plain);
  return plain;
}

function stripInlineComment(value: string): string {
  let quote = '';
  let escaped = false;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\' && quote === '"') {
      escaped = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === '#' && index > 0 && /\s/.test(value[index - 1])) return value.slice(0, index);
  }
  return value;
}

function parseInlineArray(value: string): unknown[] {
  if (!value.trim()) return [];
  return splitInline(value).map(parseScalar);
}

function parseInlineObject(value: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (!value.trim()) return result;
  for (const item of splitInline(value)) {
    const { key, rawValue } = splitKeyValue(item);
    if (Object.hasOwn(result, key)) throw new Error(`Duplicate memory frontmatter key: ${key}`);
    result[key] = parseScalar(rawValue.trim());
  }
  return result;
}

function splitInline(value: string): string[] {
  const items: string[] = [];
  let start = 0;
  let quote = '';
  let escaped = false;
  let square = 0;
  let curly = 0;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\' && quote === '"') {
      escaped = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === '[') square += 1;
    else if (char === ']') {
      square -= 1;
      if (square < 0) throw new Error('Invalid inline YAML: unbalanced collection');
    }
    else if (char === '{') curly += 1;
    else if (char === '}') {
      curly -= 1;
      if (curly < 0) throw new Error('Invalid inline YAML: unbalanced collection');
    }
    else if (char === ',' && square === 0 && curly === 0) {
      items.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  if (quote) throw new Error('Invalid inline YAML: unterminated quote');
  if (square !== 0 || curly !== 0) throw new Error('Invalid inline YAML: unbalanced collection');
  items.push(value.slice(start).trim());
  return items.filter(Boolean);
}

function renderMap(value: Record<string, unknown>, indent: number): string[] {
  const padding = ' '.repeat(indent);
  return Object.keys(value).sort().map((key) =>
    `${padding}${renderKey(key)}: ${renderScalar(value[key])}`
  );
}

function renderList(value: unknown[], indent: number): string[] {
  const lines: string[] = [];
  const padding = ' '.repeat(indent);
  for (const item of value) {
    if (isPlainRecord(item)) {
      const entries = Object.entries(item).sort(([a], [b]) => a.localeCompare(b));
      if (!entries.length) {
        lines.push(`${padding}- {}`);
        continue;
      }
      const [[firstKey, firstValue], ...rest] = entries;
      if (isPlainRecord(firstValue) || Array.isArray(firstValue)) {
        lines.push(`${padding}- ${renderKey(firstKey)}:`);
        lines.push(...renderNested(firstValue, indent + 4));
      } else lines.push(`${padding}- ${renderKey(firstKey)}: ${renderScalar(firstValue)}`);
      for (const [key, entry] of rest) {
        if (isPlainRecord(entry) || Array.isArray(entry)) {
          lines.push(`${' '.repeat(indent + 2)}${renderKey(key)}:`);
          lines.push(...renderNested(entry, indent + 4));
        } else lines.push(`${' '.repeat(indent + 2)}${renderKey(key)}: ${renderScalar(entry)}`);
      }
      continue;
    }
    if (Array.isArray(item)) {
      lines.push(`${padding}-`);
      lines.push(...renderList(item, indent + 2));
      continue;
    }
    lines.push(`${padding}- ${renderScalar(item)}`);
  }
  return lines;
}

function renderNested(value: unknown, indent: number): string[] {
  return Array.isArray(value) ? renderList(value, indent) : renderMap(value as Record<string, unknown>, indent);
}

function renderKey(value: string): string {
  return /^[A-Za-z_][A-Za-z0-9_-]*$/.test(value) ? value : JSON.stringify(value);
}

function renderScalar(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return `[${value.map(renderScalar).join(', ')}]`;
  if (isPlainRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${renderKey(key)}: ${renderScalar(value[key])}`).join(', ')}}`;
  }
  const text = String(value);
  if (isSafePlainString(text)) return text;
  return JSON.stringify(text);
}

function isSafePlainString(value: string): boolean {
  if (!value || /^(?:null|~|true|false)$/i.test(value)) return false;
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(value)) return false;
  return /^[A-Za-z0-9_./@+:-]+$/.test(value) && !value.startsWith('-') && !value.includes(': ');
}

function isBlockScalarIndicator(value: string): boolean {
  return /^(?:\||>)[+-]?$/.test(value.trim());
}

function nextMeaningful(lines: SourceLine[], start: number): number {
  for (let index = start; index < lines.length; index += 1) {
    const trimmed = lines[index].text.trim();
    if (trimmed && !trimmed.startsWith('#')) return index;
  }
  return -1;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!isPlainRecord(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
}
