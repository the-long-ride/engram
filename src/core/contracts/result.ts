/** Versioned wire contract for CLI JSON output, MCP tool results, and Entry API. */
export const CONTRACT_VERSION = '1';

export type DiagnosticSeverity = 'info' | 'warning' | 'error';

export type Diagnostic = {
  id: string;
  severity: DiagnosticSeverity;
  message: string;
  remediation?: string;
};

export type EngramResult<T> = {
  contract_version: typeof CONTRACT_VERSION;
  ok: true;
  data: T;
  diagnostics: Diagnostic[];
};

export type EngramFailure = {
  contract_version: typeof CONTRACT_VERSION;
  ok: false;
  error: { code: string; message: string };
  diagnostics: Diagnostic[];
};

export type EngramEnvelope<T> = EngramResult<T> | EngramFailure;

/** Build a success envelope. */
export function ok<T>(data: T, diagnostics: Diagnostic[] = []): EngramResult<T> {
  return { contract_version: CONTRACT_VERSION, ok: true, data, diagnostics };
}

/** Build a failure envelope. */
export function fail(code: string, message: string, diagnostics: Diagnostic[] = []): EngramFailure {
  return { contract_version: CONTRACT_VERSION, ok: false, error: { code, message }, diagnostics };
}

/** Serialize any envelope to stable JSON (no ANSI, 2-space indent). */
export function serializeResult<T>(envelope: EngramEnvelope<T>): string {
  return JSON.stringify(stripAnsi(envelope), null, 2);
}

/** True when a value looks like a contract envelope. */
export function isEngramEnvelope(value: unknown): value is EngramEnvelope<unknown> {
  return typeof value === 'object' && value !== null
    && (value as any).contract_version === CONTRACT_VERSION
    && typeof (value as any).ok === 'boolean';
}

function stripAnsi(value: unknown): unknown {
  if (typeof value === 'string') return value.replace(/\x1b\[[0-9;]*m/g, '');
  if (Array.isArray(value)) return value.map(stripAnsi);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) out[key] = stripAnsi(item);
    return out;
  }
  return value;
}
