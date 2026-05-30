/** Inbox observations: raw notes captured explicitly, then mined into memories. */
import { scanInjection, scanSensitive, redactSensitive } from '../safety/security.js';
import { inside, writeText } from '../system/fsx.js';
import { slugify, summarize } from '../system/text.js';

export type ObservationWrite = {
  file: string;
  fullPath: string;
  text: string;
  redacted: number;
  removedInjectionLines: number;
};

/** Write sanitized observation text to a non-indexed inbox file. */
export async function writeObservation(root: string, text: string, sourceFile = ''): Promise<ObservationWrite> {
  const sanitized = sanitizeObservation(text);
  if (!sanitized.text.trim()) throw new Error('observe requires non-empty text after safety filtering');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const title = summarize(sanitized.text, 70) || 'Observation';
  const file = `inbox/${stamp}-${slugify(title)}.md`;
  const fullPath = inside(root, file);
  await writeText(fullPath, renderObservation(sanitized.text, file, sourceFile, sanitized));
  return { file, fullPath, text: sanitized.text, redacted: sanitized.redacted, removedInjectionLines: sanitized.removedInjectionLines };
}

function sanitizeObservation(text: string): { text: string; redacted: number; removedInjectionLines: number } {
  const sensitive = scanSensitive(text);
  const redacted = redactSensitive(text);
  const safeLines = [];
  let removedInjectionLines = 0;
  for (const line of redacted.split(/\r?\n/)) {
    if (scanInjection(line).length) {
      removedInjectionLines += 1;
      continue;
    }
    safeLines.push(line);
  }
  return { text: safeLines.join('\n').trim(), redacted: sensitive.length, removedInjectionLines };
}

function renderObservation(text: string, file: string, sourceFile: string, meta: { redacted: number; removedInjectionLines: number }): string {
  const source = sourceFile ? `source_file: ${sourceFile.replace(/\\/g, '/')}\n` : '';
  return `---
source: observe
created: ${new Date().toISOString()}
${source}redacted_findings: ${meta.redacted}
removed_injection_lines: ${meta.removedInjectionLines}
---

# Observation: ${summarize(text, 60) || 'Session note'}

## Raw Note

${text}

## Next

Run \`engram autosave --file .agents/.engram/${file}\` only after reviewing the observation.
`;
}
