export const DEFAULT_LOAD_LIMIT = 8;
export const MIN_LOAD_LIMIT = 1;
export const MAX_LOAD_LIMIT = 32;

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
