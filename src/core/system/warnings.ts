/** Suppress known-harmless Node runtime warnings that leak into CLI output. */

let sqliteExperimentalWarningSuppressed = false;

export function suppressSqliteExperimentalWarning(): void {
  if (sqliteExperimentalWarningSuppressed || typeof process === 'undefined') return;
  const processAny = process as any;
  const originalEmitWarning = processAny.emitWarning;
  if (typeof originalEmitWarning !== 'function') return;
  processAny.emitWarning = function patchedEmitWarning(this: any, warning: any, ...args: any[]): boolean {
    const message = typeof warning === 'string' ? warning : warning?.message ?? '';
    const option = args[0];
    const type = typeof option === 'string' ? option : option?.type ?? warning?.name ?? '';
    if (type === 'ExperimentalWarning' && message.includes('SQLite')) return false;
    return originalEmitWarning.call(this, warning, ...args);
  };
  sqliteExperimentalWarningSuppressed = true;
}