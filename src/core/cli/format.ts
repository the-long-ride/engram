/** Terminal text styling helpers with plain output fallback. */
const ANSI_PATTERN = /\x1b\[[0-9;]*m/g;

const color = process.stdout.isTTY
  ? (open: string, text: string) => `${open}${text}\x1b[0m`
  : (_open: string, text: string) => text;

export const style = {
  heading: (text: string) => color('\x1b[1;36m', text),  // bold cyan
  title: (text: string) => color('\x1b[1;33m', text),    // bold yellow
  label: (text: string) => color('\x1b[90m', text),      // gray
  value: (text: string) => color('\x1b[32m', text),      // green
  number: (text: string) => color('\x1b[33m', text),     // yellow
  muted: (text: string) => color('\x1b[2;37m', text),    // dim white
  command: (text: string) => color('\x1b[1;36m', text),  // bold cyan
  success: (text: string) => color('\x1b[1;32m', text),  // bold green
  error: (text: string) => color('\x1b[1;31m', text),    // bold red
};

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
  const styledLabel = style.label(label);
  const valStr = String(value ?? '');
  let styledValue = valStr;
  if (/^\d+(\/\d+)?%?$/.test(valStr)) {
    styledValue = style.number(valStr);
  } else if (valStr === 'not configured' || valStr === '-') {
    styledValue = style.muted(valStr);
  } else if (valStr.startsWith('skipped:')) {
    styledValue = style.muted(valStr);
  } else {
    styledValue = style.value(valStr);
  }
  const prefix = `${indent}${styledLabel}: `;
  const nextIndent = `${indent}${' '.repeat(visibleLength(label) + 2)}`;
  return wrapText(styledValue, nextIndent, prefix);
}

export function formatFields(fields: Field[], indent = '  '): string[] {
  return fields.map(([label, value]) => formatField(label, value, indent));
}

export function formatRecords(title: string, records: RecordBlock[]): string {
  if (!records.length) return title;
  const lines = [style.heading(title)];
  records.forEach((record, index) => {
    if (index) lines.push('');
    let styledTitle = record.title;
    if (styledTitle.startsWith('OK ')) {
      styledTitle = `${style.success('OK')} ${styledTitle.slice(3)}`;
    } else if (styledTitle.startsWith('MISMATCH ')) {
      styledTitle = `${style.error('MISMATCH')} ${styledTitle.slice(9)}`;
    } else if (styledTitle.startsWith('HIT ')) {
      styledTitle = `${style.success('HIT')} ${styledTitle.slice(4)}`;
    } else if (styledTitle.startsWith('MISS ')) {
      styledTitle = `${style.error('MISS')} ${styledTitle.slice(5)}`;
    } else {
      styledTitle = style.title(styledTitle);
    }
    lines.push(`${style.number(String(index + 1))}. ${styledTitle}`);
    if (record.fields?.length) lines.push(...formatFields(record.fields, '   '));
    if (record.lines?.length) lines.push(...record.lines.map((line) => wrapText(line, '   ')));
  });
  return lines.join('\n');
}

export function formatCounts(title: string, counts: Record<string, number>): string[] {
  const rows = Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
  return [
    style.heading(title),
    ...(rows.length ? rows.map(([key, count]) => `  ${style.label(key)}: ${style.number(String(count))}`) : ['  none'])
  ];
}

function visibleLength(text: string): number {
  return text.replace(ANSI_PATTERN, '').length;
}
