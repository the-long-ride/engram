/** Safe Engram managed-block parsing and byte-preserving replacement helpers. */
export type ManagedBlock = {
  start: number;
  end: number;
  version?: string;
  content: string;
  startMarker: string;
  endMarker: string;
};

export function detectNewline(text: string): '\r\n' | '\n' {
  return text.includes('\r\n') ? '\r\n' : '\n';
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function findManagedBlock(text: string, marker: string): ManagedBlock | null {
  const escaped = escapeRegExp(marker);
  const startRe = new RegExp(`<!--\\s*engram:${escaped}:start(?:\\s+version=([^\\s>]+))?\\s*-->`, 'g');
  const endRe = new RegExp(`<!--\\s*engram:${escaped}:end\\s*-->`, 'g');
  const starts = [...text.matchAll(startRe)];
  const ends = [...text.matchAll(endRe)];
  if (starts.length === 0 && ends.length === 0) return null;
  if (starts.length !== 1 || ends.length !== 1) {
    if (starts.length > 1 || ends.length > 1) throw new Error(`multiple Engram managed blocks found for ${marker}`);
    throw new Error(`invalid Engram managed block markers for ${marker}`);
  }
  const startMatch = starts[0];
  const endMatch = ends[0];
  const start = startMatch.index ?? 0;
  const startMarkerEnd = start + startMatch[0].length;
  const endStart = endMatch.index ?? 0;
  if (endStart < startMarkerEnd) throw new Error(`invalid Engram managed block marker order for ${marker}`);
  const end = endStart + endMatch[0].length;
  const newline = detectNewline(text);
  let contentStart = startMarkerEnd;
  if (text.slice(contentStart, contentStart + newline.length) === newline) contentStart += newline.length;
  let contentEnd = endStart;
  if (text.slice(Math.max(contentStart, contentEnd - newline.length), contentEnd) === newline) contentEnd -= newline.length;
  return {
    start,
    end,
    version: startMatch[1],
    content: text.slice(contentStart, contentEnd),
    startMarker: startMatch[0],
    endMarker: endMatch[0]
  };
}

export function replaceManagedBlock(text: string, marker: string, replacement: string): string {
  const block = findManagedBlock(text, marker);
  if (!block) throw new Error(`Engram managed block not found for ${marker}`);
  const newline = detectNewline(text);
  const normalized = replacement.replace(/\r?\n/g, newline);
  return `${text.slice(0, block.start)}${block.startMarker}${newline}${normalized}${newline}${block.endMarker}${text.slice(block.end)}`;
}

export function replaceDelimitedManagedRegion(text: string, startMarker: string, endMarker: string, replacementSource: string): string {
  const current = findDelimitedRegion(text, startMarker, endMarker);
  const replacement = findDelimitedRegion(replacementSource, startMarker, endMarker);
  if (!current || !replacement) throw new Error('Engram managed region markers are missing or invalid.');
  const newline = detectNewline(text);
  const region = replacementSource.slice(replacement.start, replacement.end).replace(/\r?\n/g, newline);
  return `${text.slice(0, current.start)}${region}${text.slice(current.end)}`;
}

function findDelimitedRegion(text: string, startMarker: string, endMarker: string): { start: number; end: number } | null {
  const starts = text.split(startMarker).length - 1;
  const ends = text.split(endMarker).length - 1;
  if (starts === 0 && ends === 0) return null;
  if (starts !== 1 || ends !== 1) throw new Error('Engram managed region contains duplicate or malformed markers.');
  const start = text.indexOf(startMarker);
  const endStart = text.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || endStart < start) throw new Error('Engram managed region marker order is invalid.');
  return { start, end: endStart + endMarker.length };
}
