/** Normalize and validate memory load limit values. */
export const DEFAULT_LOAD_LIMIT = 8;
export const MIN_LOAD_LIMIT = 1;
export const MAX_LOAD_LIMIT = 32;

export const DEFAULT_MAX_TOKENS = 1600;
export const MIN_MAX_TOKENS = 200;
export const MAX_MAX_TOKENS = 16000;

export function normalizeLoadLimit(value: unknown, fallback = DEFAULT_LOAD_LIMIT): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(MAX_LOAD_LIMIT, Math.max(MIN_LOAD_LIMIT, parsed));
}

export function parseLoadLimit(value: unknown, label = 'load limit'): number {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').trim());
  if (!Number.isInteger(parsed) || parsed < MIN_LOAD_LIMIT || parsed > MAX_LOAD_LIMIT) {
    throw new Error(`${label} must be an integer from ${MIN_LOAD_LIMIT} to ${MAX_LOAD_LIMIT}`);
  }
  return parsed;
}

export function normalizeMaxTokens(value: unknown, fallback = DEFAULT_MAX_TOKENS): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(MAX_MAX_TOKENS, Math.max(MIN_MAX_TOKENS, parsed));
}

export function parseMaxTokens(value: unknown, label = 'max tokens'): number {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').trim());
  if (!Number.isInteger(parsed) || parsed < MIN_MAX_TOKENS || parsed > MAX_MAX_TOKENS) {
    throw new Error(`${label} must be an integer from ${MIN_MAX_TOKENS} to ${MAX_MAX_TOKENS}`);
  }
  return parsed;
}
