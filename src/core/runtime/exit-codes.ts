/** Stable numeric exit codes and typed domain errors for scripts and CI branching. */
export const ExitCode = {
  Ok: 0,
  GeneralError: 1,
  UsageError: 2,
  ConfigError: 3,
  IntegrityError: 4,
  PolicyError: 5,
  RegressionError: 6,
  NotFound: 7,
} as const;

export type ExitCodeValue = (typeof ExitCode)[keyof typeof ExitCode];

/** Typed domain error carrying a stable code string and numeric exit code. */
export class EngramError extends Error {
  readonly code: string;
  readonly exitCode: number;
  /** Pre-rendered output (text or JSON) to print instead of the generic error line. */
  readonly output?: string;
  constructor(code: string, message: string, exitCode: number, output?: string) {
    super(message);
    this.name = 'EngramError';
    this.code = code;
    this.exitCode = exitCode;
    this.output = output;
  }
}

/** Map a thrown error to a stable exit code. EngramError uses its declared code; generic errors stay 1. */
export function exitCodeFor(error: unknown): number {
  if (!error) return ExitCode.Ok;
  if (error instanceof EngramError) return error.exitCode;
  return ExitCode.GeneralError;
}

/** Stable error code string paired with an error, for contract envelopes. */
export function errorCodeFor(error: unknown): string {
  if (error instanceof EngramError) return error.code;
  return 'ENG_ERROR';
}
