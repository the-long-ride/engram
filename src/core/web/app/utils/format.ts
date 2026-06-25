// Formatting helpers for dates and relative times in the web UI.
export function fmtDate(value: unknown): string {
  if (!value) return '-';
  try {
    const date = new Date(String(value));
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return String(value); }
}

export function relTime(value: unknown): string {
  if (!value) return '-';
  const diff = Date.now() - new Date(String(value)).getTime();
  if (!Number.isFinite(diff)) return String(value);
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
  return Math.floor(diff / 86400000) + 'd ago';
}
