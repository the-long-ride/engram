/** Small terminal formatting helpers for readable CLI reports. */
const ANSI_PATTERN = /\x1b\[[0-9;]*m/g;

export type Field = [label: string, value: unknown];
export type RecordBlock = { title: string; fields?: Field[]; lines?: string[] };

export function terminalWidth(fallback = 96): number {
  const columns = Number(process.stdout.columns || 0);
  return Math.max(64, Math.min(columns || fallback, 120));
}

export function wrapText(text: string, indent = '', firstIndent = indent, width = terminalWidth()): string {
  const normalized = String(text ?? '').trim().replace(/\s+/g, ' ');
  if (!normalized) return firstIndent.trimEnd();
  const words = normalized.split(' ');
  const lines: string[] = [];
  let line = firstIndent;
  let lineLength = visibleLength(firstIndent);
  const nextIndentLength = visibleLength(indent);
  const limit = Math.max(32, width);
  for (const word of words) {
    const wordLength = visibleLength(word);
    const needsSpace = lineLength > visibleLength(firstIndent) && line.trim().length > 0;
    const nextLength = lineLength + (needsSpace ? 1 : 0) + wordLength;
    if (needsSpace && nextLength > limit) {
      lines.push(line);
      line = `${indent}${word}`;
      lineLength = nextIndentLength + wordLength;
      continue;
    }
    line += `${needsSpace ? ' ' : ''}${word}`;
    lineLength = nextLength;
  }
  lines.push(line);
  return lines.join('\n');
}

export function formatField(label: string, value: unknown, indent = '  '): string {
  const prefix = `${indent}${label}: `;
  const nextIndent = `${indent}${' '.repeat(label.length + 2)}`;
  return wrapText(String(value ?? ''), nextIndent, prefix);
}

export function formatFields(fields: Field[], indent = '  '): string[] {
  return fields.map(([label, value]) => formatField(label, value, indent));
}

export function formatRecords(title: string, records: RecordBlock[]): string {
  if (!records.length) return title;
  const lines = [title];
  records.forEach((record, index) => {
    if (index) lines.push('');
    lines.push(`${index + 1}. ${record.title}`);
    if (record.fields?.length) lines.push(...formatFields(record.fields, '   '));
    if (record.lines?.length) lines.push(...record.lines.map((line) => wrapText(line, '   ')));
  });
  return lines.join('\n');
}

export function formatCounts(title: string, counts: Record<string, number>): string[] {
  const rows = Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
  return [title, ...(rows.length ? rows.map(([key, count]) => `  ${key}: ${count}`) : ['  none'])];
}

function visibleLength(text: string): number {
  return text.replace(ANSI_PATTERN, '').length;
}
