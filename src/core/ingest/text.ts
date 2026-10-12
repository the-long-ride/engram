/** Text helpers shared by source extractors and take-control excerpts: sanitizing, compacting, naming. */
import { redactSensitive, scanInjection } from '../safety/security.js';

/**
 * Redact sensitive values (plus URL passwords and `--secret value` flag values) and drop prompt-injection lines.
 * A `-p<password>` short flag is not recognised.
 */
export function sanitizeSource(text: string): string {
  const blockedLines = new Set(scanInjection(text).map((finding) => finding.line));
  // Per line, so a flag at a line end never swallows the first word of the next line.
  const stripped = text.split(/\r?\n/).map((line) => line.replace(URL_PASSWORD, '//$1:<redacted>@').replace(SECRET_FLAG, '--$1$2<redacted>'));
  return redactSensitive(stripped.join('\n'))
    .split(/\r?\n/)
    .filter((_, index) => !blockedLines.has(index + 1))
    .join('\n');
}

/** Keep whole lines up to `maxChars`, collapse blank runs, and defang code fences. */
export function compactExcerpt(text: string, maxChars: number): string {
  const lines = text.replace(/\r/g, '').replace(/```/g, '~~~').split('\n').map((line) => line.trimEnd());
  const kept: string[] = [];
  let chars = 0;
  for (const line of lines) {
    const next = line.length + 1;
    if (chars + next > maxChars) break;
    if (!line && (!kept.length || !kept[kept.length - 1])) continue;
    kept.push(line);
    chars += next;
  }
  return kept.join('\n').trim();
}

/** Forward-slash relative path. */
export function normalizeRelPath(relPath: string): string {
  return relPath.replace(/\\/g, '/');
}

/** Lower-cased file name of a relative path. */
export function baseName(relPath: string): string {
  const file = normalizeRelPath(relPath);
  return file.slice(file.lastIndexOf('/') + 1).toLowerCase();
}

/** Lower-cased extension without the dot ('' when none). */
export function extensionOf(relPath: string): string {
  const name = baseName(relPath);
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1) : '';
}

/** Join unique non-empty names as `a, b, c`, capping long lists with `(+N more)`. */
export function nameList(names: Iterable<string>, max = 40): string {
  const unique = [...new Set([...names].map((name) => name.trim()).filter(Boolean))];
  const shown = unique.slice(0, max).join(', ');
  return unique.length > max ? `${shown} (+${unique.length - max} more)` : shown;
}

const CLIP_MARGIN = 256;
// Bare and compound (`--client-secret`, `--api-token`) credential flags. `--sort-key <v>` is a known false positive.
const SECRET_FLAG = /--((?:[a-z0-9]+[-_])*(?:token|password|passwd|passphrase|pass|secret|key|api-key|apikey|access-token|auth|otp|credentials?))(=|\s+)\S+/gi;
const URL_USERINFO = /\/\/[^/@\s]+@/g;
// Docs keep the user name of `scheme://user:password@host` (and every password-less URL) but drop the password.
const URL_PASSWORD = /\/\/([^/@\s:]+):[^/@\s]+@/g;

/**
 * Make one emitted line safe, then clip it. Redaction runs BEFORE clipping (on a bounded prefix, so cost stays
 * linear) so a secret straddling the clip boundary cannot leave a partial, no-longer-matching prefix behind.
 * Strips URL userinfo and `--token value`-style flag values on top of the shared sensitive-pattern redaction.
 */
export function safeClip(text: string, max = 240): string {
  const bounded = text.length > max + CLIP_MARGIN ? text.slice(0, max + CLIP_MARGIN) : text;
  const safe = redactSensitive(bounded.replace(URL_USERINFO, '//').replace(SECRET_FLAG, '--$1$2<redacted>'));
  return safe.length > max ? `${safe.slice(0, max - 3).trimEnd()}...` : safe;
}
