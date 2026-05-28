/** Write-time sensitive scans and read-time prompt-injection guard. */
import type { ScanFinding } from '../runtime/types.js';

const sensitivePatterns: Array<[string, string, RegExp, string]> = [
  ['api-key', 'API key pattern', /sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}/g, '<api-key>'],
  ['jwt', 'JWT token pattern', /eyJ[A-Za-z0-9+/=_-]{20,}\.[A-Za-z0-9+/=_-]{10,}/g, '<api-key>'],
  ['private-key', 'private key block', /-----BEGIN [A-Z ]*PRIVATE KEY-----/g, '<private-key>'],
  ['password', 'password assignment', /password\s*[:=]\s*\S+/gi, '<password>'],
  ['secret', 'secret environment value', /[A-Z_]*(SECRET|TOKEN|KEY)\s*=\s*\S+/g, '<api-key>'],
  ['email', 'email address', /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '<team-email>'],
  ['card', 'payment card pattern', /\b\d{4}[\s-]\d{4}[\s-]\d{4}[\s-]\d{4}\b/g, '<card-number>'],
  ['internal-ip', 'internal IP address', /\b(10|192\.168)\.\d+\.\d+\.\d+\b/g, '<internal-host>'],
  ['gps', 'GPS coordinate pattern', /\b\d{1,3}\.\d{4,},\s*\d{1,3}\.\d{4,}\b/g, '<location>']
];

const injectionPatterns = [
  /^ignore\b/i, /^forget\b/i, /^disregard\b/i, /^override\b/i,
  /you are now/i, /act as/i, /pretend you are/i,
  /your new instructions/i, /your true purpose/i, /<system>/i, /\[INST\]/i, /<<</
];

/** Scan proposed memory content for values that must not be stored. */
export function scanSensitive(text: string): ScanFinding[] {
  const findings: ScanFinding[] = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (/^author:\s*/i.test(line.trim())) return;
    for (const [kind, reason, pattern] of sensitivePatterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(line);
      if (match) findings.push({ line: index + 1, reason, value: match[0], kind });
    }
  });
  return findings;
}

/** Replace sensitive values with safe placeholders. */
export function redactSensitive(text: string): string {
  let output = text;
  for (const [, , pattern, replacement] of sensitivePatterns) {
    pattern.lastIndex = 0;
    output = output.replace(pattern, replacement);
  }
  return output;
}

/** Detect prompt-injection patterns before loading memory. */
export function scanInjection(text: string): ScanFinding[] {
  const findings: ScanFinding[] = [];
  text.split(/\r?\n/).forEach((line, index) => {
    const normalized = normalizeMarkdownCommandLine(line);
    for (const pattern of injectionPatterns) {
      if (pattern.test(normalized)) {
        findings.push({ line: index + 1, reason: 'prompt injection pattern', value: line.trim(), kind: 'injection' });
        break;
      }
    }
  });
  return findings;
}

function normalizeMarkdownCommandLine(line: string): string {
  let text = line.trim();
  for (;;) {
    const next = text
      .replace(/^>\s*/, '')
      .replace(/^#{1,6}\s+/, '')
      .replace(/^[-*+]\s+(?:\[[ xX]\]\s*)?/, '')
      .replace(/^\d+[.)]\s+/, '')
      .trim();
    if (next === text) return text;
    text = next;
  }
}
