/** Shared --json output helpers for read-only commands. */
import { ok, serializeResult, type Diagnostic } from '../contracts/result.js';

/** True when --json flag is present. */
export function isJsonMode(flags: Record<string, any>): boolean {
  return flags.json === true;
}

/** Serialize a data payload as a versioned success envelope string. */
export function jsonOk<T>(data: T, diagnostics: Diagnostic[] = []): string {
  return serializeResult(ok(data, diagnostics));
}
