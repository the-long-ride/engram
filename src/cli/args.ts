/** Minimal argument parsing for dependency-free CLI commands. */
export type ParsedArgs = { command: string; rest: string[]; flags: Record<string, string | boolean> };

const booleanFlags = new Set([
  'accept-all', 'all', 'auto', 'dry-run', 'force', 'h', 'help',
  'low-confidence', 'no-skillset', 'no-submodule', 'semantic', 'stale',
  'submodule', 'v', 'version'
]);

/** Parse argv into command, positional args, and --flags. */
export function parseArgs(argv: string[]): ParsedArgs {
  const [command = 'help', ...tokens] = argv;
  const rest: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (!token.startsWith('--')) rest.push(token);
    else if (booleanFlags.has(token.slice(2))) flags[token.slice(2)] = true;
    else if (tokens[i + 1] && !tokens[i + 1].startsWith('--')) flags[token.slice(2)] = tokens[++i];
    else flags[token.slice(2)] = true;
  }
  return { command, rest, flags };
}

/** Return true when a flag was passed. */
export function hasFlag(flags: Record<string, string | boolean>, name: string): boolean {
  return flags[name] === true;
}

/** Read a string flag with fallback. */
export function flag(flags: Record<string, string | boolean>, name: string, fallback = ''): string {
  const value = flags[name];
  return typeof value === 'string' ? value : fallback;
}

/** Join positionals into user text. */
export function textArg(args: string[]): string {
  return args.join(' ').trim();
}
