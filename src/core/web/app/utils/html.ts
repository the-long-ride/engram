// Text helpers for rendering unknown values in the web UI.
export function safeText(value: unknown): string { return value == null ? '' : String(value); }
