/** Detect the most likely completion target for the current shell. */
export type CompletionTarget = 'bash' | 'zsh' | 'powershell';

export function detectCompletionTarget(
  env: Record<string, string | undefined> = process.env,
  platform = platformFromEnv(env)
): CompletionTarget {
  const shellHint = [
    env.SHELL,
    env.npm_config_script_shell,
    env.ComSpec,
    env.TERM_PROGRAM
  ].filter(Boolean).join(' ').toLowerCase();
  if (/\bzsh(?:\.exe)?\b|[/\\]zsh(?:\.exe)?$/u.test(shellHint)) return 'zsh';
  if (/\bpwsh(?:\.exe)?\b|\bpowershell(?:\.exe)?\b/u.test(shellHint)) return 'powershell';
  if (/\bbash(?:\.exe)?\b|[/\\]bash(?:\.exe)?$/u.test(shellHint)) return 'bash';
  if (platform === 'win32' || env.PSModulePath) return 'powershell';
  if (platform === 'darwin') return 'zsh';
  return 'bash';
}

function platformFromEnv(env: Record<string, string | undefined>): string {
  const hint = `${env.OS ?? ''} ${env.OSTYPE ?? ''}`.toLowerCase();
  if (hint.includes('windows')) return 'win32';
  if (hint.includes('darwin')) return 'darwin';
  return '';
}
