/** Shared trace sanitization before any evidence persistence. */
import { redactSensitive, scanInjection, scanSensitive } from '../safety/security.js';

export type SanitizedTraceText = {
  text: string;
  redactedFindings: number;
  removedInjectionLines: number;
};

export function sanitizeTraceText(text: string): SanitizedTraceText {
  const sensitive = scanSensitive(text);
  const redacted = redactSensitive(text);
  const safeLines: string[] = [];
  let removedInjectionLines = 0;
  for (const line of redacted.split(/\r?\n/)) {
    if (scanInjection(line).length) {
      removedInjectionLines += 1;
      continue;
    }
    safeLines.push(line);
  }
  return {
    text: safeLines.join('\n').trim(),
    redactedFindings: sensitive.length,
    removedInjectionLines
  };
}
