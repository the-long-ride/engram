/** Minimal argument parsing for dependency-free CLI commands. */
export type FlagValue = string | boolean | string[];
export type ParsedArgs = { command: string; rest: string[]; flags: Record<string, FlagValue> };

const booleanFlags = new Set([
  'accept-all', 'all', 'auto', 'dry-run', 'force', 'h', 'help',
  'global-only', 'low-confidence', 'no-global', 'no-skillset', 'no-submodule', 'plan', 'propose', 'rebuild', 'semantic', 'stale',
  'submodule', 'v', 'version'
]);
const autosaveCommands = new Set(['autosave', 'as', 'at']);
const takeControlCommands = new Set(['take-control', 'tc']);
const acceptAllCommands = new Set([...autosaveCommands, ...takeControlCommands]);
const repeatableFlags = new Set(['dir', 'exclude', 'file', 'include']);

/** Parse argv into command, positional args, and --flags. */
export function parseArgs(argv: string[]): ParsedArgs {
  const [command = 'help', ...tokens] = normalizeNaturalArgs(argv);
  const rest: string[] = [];
  const flags: Record<string, FlagValue> = {};
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === '-a' && autosaveCommands.has(command)) flags['accept-all'] = true;
    else if (!token.startsWith('--')) rest.push(token);
    else if (booleanFlags.has(token.slice(2))) flags[token.slice(2)] = true;
    else if (tokens[i + 1] && !tokens[i + 1].startsWith('--')) setFlag(flags, token.slice(2), tokens[++i]);
    else flags[token.slice(2)] = true;
  }
  return { command, rest, flags };
}

/** Return true when a flag was passed. */
export function hasFlag(flags: Record<string, FlagValue>, name: string): boolean {
  return flags[name] === true;
}

/** Read a string flag with fallback. */
export function flag(flags: Record<string, FlagValue>, name: string, fallback = ''): string {
  const value = flags[name];
  return typeof value === 'string' ? value : fallback;
}

/** Read one or more values for repeatable flags. */
export function flagValues(flags: Record<string, FlagValue>, name: string): string[] {
  const value = flags[name];
  if (Array.isArray(value)) return value;
  return typeof value === 'string' ? [value] : [];
}

/** Join positionals into user text. */
export function textArg(args: string[]): string {
  return args.join(' ').trim();
}

function setFlag(flags: Record<string, FlagValue>, name: string, value: string): void {
  if (!repeatableFlags.has(name)) {
    flags[name] = value;
    return;
  }
  const current = flags[name];
  flags[name] = Array.isArray(current) ? [...current, value] : typeof current === 'string' ? [current, value] : [value];
}

function normalizeNaturalArgs(argv: string[]): string[] {
  if (argv[0]?.toLowerCase() === 'auto' && argv[1]?.toLowerCase() === 'save') return normalizeAcceptAll(['autosave', ...argv.slice(2)]);
  if (argv[0]?.toLowerCase() === 'auto-save') return normalizeAcceptAll(['autosave', ...argv.slice(1)]);
  if (argv[0]?.toLowerCase() === 'take' && argv[1]?.toLowerCase() === 'control') return normalizeAcceptAll(['take-control', ...argv.slice(2)]);
  return normalizeAcceptAll(argv);
}

function normalizeAcceptAll(argv: string[]): string[] {
  const [command = 'help', ...tokens] = argv;
  if (!acceptAllCommands.has(command)) return argv;
  if (tokens[0]?.toLowerCase() === 'accept-all') return [command, '--accept-all', ...tokens.slice(1)];
  if (tokens[0]?.toLowerCase() === 'accept' && tokens[1]?.toLowerCase() === 'all') return [command, '--accept-all', ...tokens.slice(2)];
  return argv;
}
