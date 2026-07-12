/** Minimal argument parsing for dependency-free CLI commands. */
export type FlagValue = string | boolean | string[];
export type ParsedArgs = { command: string; rest: string[]; flags: Record<string, FlagValue> };

const booleanFlags = new Set([
  'all', 'auto', 'dry-run', 'explain', 'force', 'full', 'h', 'help',
  'global', 'global-only', 'global-skillsets-only', 'json', 'latest', 'low-confidence', 'memory-only', 'no-auto-upgrade', 'no-global', 'no-skillset',
  'no-submodule', 'no-version-check', 'plan', 'propose', 'rebuild', 'metacognize', 'restructure', 'self', 'semantic', 'show-rule-variants', 'skip-task-type-prompt', 'stale', 'strict',
  'submodule', 'use', 'user', 'v', 'version', 'workspace', 'host-only'
]);
const saveSessionCommands = new Set(['save-session', 'ss']);
const takeControlCommands = new Set(['take-control', 'tc']);
const metacognizeCommands = new Set(['metacognize', 'mc']);
const cloneMemoryCommands = new Set(['clone-memory', 'cm']);
const resolveConflictCommands = new Set(['resolve-conflicts', 'rc']);
const forceCommands = new Set([...saveSessionCommands, ...takeControlCommands, ...metacognizeCommands, ...resolveConflictCommands]);
const fullLoadCommands = new Set(['load', 'ld']);
const repeatableFlags = new Set(['dir', 'exclude', 'file', 'include', 'id']);
const recentSessionWords = new Set(['session', 'sessions', 'chat', 'chats', 'conversation', 'conversations']);
const recentSessionPrefixes = new Set(['last', 'latest', 'past', 'previous', 'recent']);
const cloneMemoryVerbs = new Set(['clone', 'copy']);
const configVerbs = new Set(['config', 'configuration', 'setting', 'settings']);
const configViewVerbs = new Set(['show', 'view', 'display', 'get', 'inspect']);
const configSetVerbs = new Set(['set', 'change', 'update']);
const workspaceVerbs = new Set(['workspace', 'workspaces', 'repo', 'repos', 'project', 'projects']);
const workspaceViewVerbs = new Set(['list', 'show', 'view', 'display']);
const workspaceActionFillers = new Set(['the', 'my', 'this', 'current']);
const metacognizeVerbs = new Set(['metacognize', 'metacognition', 'restructure', 'reorganize', 'organize']);
const metacognizeOptionCommands = new Set([...cloneMemoryCommands, ...takeControlCommands, ...resolveConflictCommands]);
const metacognizeOptionWords = new Set(['metacognize', 'metacognition', 'restructure', 'reorganize', 'organize']);
const naturalOptionFillers = new Set(['and', 'then', 'with', 'using', 'use', 'agent', 'ai']);
const metacognizeFillers = new Set(['engram', 'memory', 'memories', 'folder', 'folders', 'bank', 'store', 'root', 'the', 'my']);
const globalFolderVerbs = new Set(['change', 'move', 'rename', 'set', 'update']);
const globalFolderNouns = new Set(['dir', 'directory', 'folder', 'path', 'root']);
const globalFolderFillers = new Set(['engram', 'my', 'the']);

/** Parse argv into command, positional args, and --flags. */
export function parseArgs(argv: string[]): ParsedArgs {
  const [command = 'entry', ...tokens] = normalizeNaturalArgs(normalizeLeadingGlobalFlags(argv));
  const rest: string[] = [];
  const flags: Record<string, FlagValue> = {};
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    assertSupportedFlag(command, token);
    if (token === '-f' && fullLoadCommands.has(command)) flags.full = true;
    else if (token === '-f' && forceCommands.has(command)) flags.force = true;
    else if (!token.startsWith('--')) rest.push(token);
    else if (token.includes('=')) {
      const [name, ...valueParts] = token.slice(2).split('=');
      setFlag(flags, name, valueParts.join('='));
    }
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

function normalizeLeadingGlobalFlags(argv: string[]): string[] {
  const leading: string[] = [];
  let index = 0;
  while (index < argv.length) {
    const token = argv[index];
    if (token === '--profile' && argv[index + 1] && !argv[index + 1].startsWith('--')) {
      leading.push('--profile', argv[index + 1]);
      index += 2;
      continue;
    }
    if (token.startsWith('--profile=')) {
      leading.push('--profile', token.slice('--profile='.length));
      index += 1;
      continue;
    }
    break;
  }
  if (!leading.length) return argv;
  const [command = 'help', ...rest] = argv.slice(index);
  return [command, ...rest, ...leading];
}

function normalizeNaturalArgs(argv: string[]): string[] {
  const rehashArgs = normalizeNaturalRehash(argv);
  const metacognizeArgs = normalizeNaturalMetacognize(rehashArgs);
  const cloneMemoryArgs = normalizeNaturalCloneMemory(metacognizeArgs);
  const globalFolderArgs = normalizeNaturalGlobalFolder(cloneMemoryArgs);
  const resolveConflictArgs = normalizeNaturalResolveConflicts(globalFolderArgs);
  const takeControlArgs = normalizeNaturalTakeControl(resolveConflictArgs);
  const optionArgs = normalizeNaturalCommandOptions(takeControlArgs);
  const configArgs = normalizeNaturalConfig(optionArgs);
  const workspaceArgs = normalizeNaturalWorkspace(configArgs);
  return normalizeSaveSessionQueryLevel(normalizeForce(normalizeInstallSkillset(workspaceArgs)));
}

function normalizeInstallSkillset(argv: string[]): string[] {
  const [command = 'help', ...tokens] = argv;
  if (command.toLowerCase() !== 'install-skill' || tokens[0]?.toLowerCase() !== 'set') return argv;
  return ['install-skillset', ...tokens.slice(1)];
}

const rehashVerbs = new Set(['rehash', 'refresh', 'recalculate', 'recompute']);
function normalizeNaturalRehash(argv: string[]): string[] {
  const [verb = '', ...tokens] = argv;
  const lower = verb.toLowerCase();
  if (rehashVerbs.has(lower)) {
    const scopes = tokens.filter((t) => !t.startsWith('-'));
    if (scopes.length === 0 || scopes.every((s) => ['memory', 'hash', 'hashes', 'all'].includes(s.toLowerCase()))) {
      const flags = tokens.filter((t) => t.startsWith('-'));
      return ['rehash', ...flags];
    }
  }
  if (lower === 'refresh' && tokens[0]?.toLowerCase() === 'hashes') {
    const rest = tokens.slice(1).filter((t) => t.startsWith('-'));
    return ['rehash', ...rest];
  }
  return argv;
}

function normalizeNaturalCloneMemory(argv: string[]): string[] {
  const [verb = '', ...tokens] = argv;
  if (!cloneMemoryVerbs.has(verb.toLowerCase())) return argv;
  const flags = naturalOptionTokens(tokens);
  const scopes = tokens
    .filter((token) => !token.startsWith('-'))
    .map((token) => token.toLowerCase())
    .filter((token) => token === 'workspace' || token === 'global');
  if (scopes.length < 2 || scopes[0] === scopes[1]) return argv;
  return ['clone-memory', scopes[0], scopes[1], ...flags];
}

function normalizeNaturalResolveConflicts(argv: string[]): string[] {
  const [verb = '', first = '', ...tokens] = argv;
  if (verb.toLowerCase() !== 'resolve' || !['conflict', 'conflicts'].includes(first.toLowerCase())) return argv;
  return ['resolve-conflicts', ...tokens.filter((token) => token.toLowerCase() !== 'and')];
}

function normalizeNaturalTakeControl(argv: string[]): string[] {
  const [verb = '', noun = '', ...tokens] = argv;
  return verb.toLowerCase() === 'take' && noun.toLowerCase() === 'control'
    ? ['take-control', ...tokens]
    : argv;
}

function normalizeNaturalMetacognize(argv: string[]): string[] {
  const [verb = '', ...tokens] = argv;
  const lowerVerb = verb.toLowerCase();
  if (lowerVerb === 'meta' && tokens[0]?.toLowerCase() === 'cognize') return normalizeMetacognizeTokens(tokens.slice(1));
  if (metacognizeCommands.has(lowerVerb) || metacognizeVerbs.has(lowerVerb)) return normalizeMetacognizeTokens(tokens);
  return argv;
}

function normalizeMetacognizeTokens(tokens: string[]): string[] {
  const normalized = ['metacognize'];
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    const lower = token.toLowerCase();
    if (looksLikeCandidateToken(token)) {
      normalized.push(...tokens.slice(i));
      break;
    }
    if (lower === 'force') normalized.push('--force');
    else if (lower === 'accept-all' || (lower === 'accept' && tokens[i + 1]?.toLowerCase() === 'all')) {
      throw new Error('`--accept-all` was removed. Use `--force`.');
    }
    else if (lower === 'force-all') {
      normalized.push('--force');
    }
    else if (lower === 'accept' && tokens[i + 1]?.toLowerCase() === 'all') {
      i += 1;
    }
    else if (lower === 'workspace' || lower === 'global' || lower === 'all') normalized.push(`--${lower}`);
    else if (token.startsWith('-') || !metacognizeFillers.has(lower)) normalized.push(token);
  }
  return normalized;
}

function normalizeNaturalCommandOptions(argv: string[]): string[] {
  const [command = 'help', ...tokens] = argv;
  if (!metacognizeOptionCommands.has(command)) return argv;
  const normalized = [command];
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    const lower = token.toLowerCase();
    if (looksLikeCandidateToken(token)) {
      normalized.push(...tokens.slice(i));
      break;
    }
    if (lower === 'force') normalized.push('--force');
    else if (lower === 'accept-all' || (lower === 'accept' && tokens[i + 1]?.toLowerCase() === 'all')) {
      throw new Error('`--accept-all` was removed. Use `--force`.');
    }
    else if (lower === 'accept' && tokens[i + 1]?.toLowerCase() === 'all') {
      i += 1;
    }
    else if (metacognizeOptionWords.has(lower)) normalized.push('--metacognize');
    else if (token.startsWith('-') || !naturalOptionFillers.has(lower)) normalized.push(token);
  }
  return normalized;
}

function naturalOptionTokens(tokens: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    const lower = token.toLowerCase();
    if (token.startsWith('-')) out.push(token);
    else if (lower === 'force') out.push('--force');
    else if (lower === 'accept-all' || (lower === 'accept' && tokens[i + 1]?.toLowerCase() === 'all')) {
      throw new Error('`--accept-all` was removed. Use `--force`.');
    }
    else if (lower === 'accept' && tokens[i + 1]?.toLowerCase() === 'all') {
      i += 1;
    }
    else if (metacognizeOptionWords.has(lower)) out.push('--metacognize');
  }
  return out;
}

function looksLikeCandidateToken(token: string): boolean {
  return /^\s*(?:[-*]\s*)?(?:type|kind|memory type|rule|rules|skill|skills|workflow|workflows|knowledge)\s*:/i.test(token);
}

function normalizeNaturalGlobalFolder(argv: string[]): string[] {
  const [verb = '', ...rawTokens] = argv;
  if (!globalFolderVerbs.has(verb.toLowerCase())) return argv;
  const tokens = dropGlobalFolderFillers(rawTokens);
  const nounEnd = globalFolderNounEnd(tokens);
  if (nounEnd < 0) return argv;
  const rest = tokens.slice(nounEnd);
  const move = normalizeNaturalGlobalFolderMove(rest);
  if (move) return move;
  const target = trimPathWords(dropWords(rest, ['to', 'as', 'at']));
  return target ? ['update-global-folder', target] : argv;
}

function normalizeNaturalGlobalFolderMove(tokens: string[]): string[] | undefined {
  const fromIndex = tokens.findIndex((token) => token.toLowerCase() === 'from');
  if (fromIndex < 0) return undefined;
  const toIndex = tokens.findIndex((token, index) => index > fromIndex && token.toLowerCase() === 'to');
  if (toIndex <= fromIndex + 1 || toIndex >= tokens.length - 1) return undefined;
  const source = trimPathWords(tokens.slice(fromIndex + 1, toIndex));
  const target = trimPathWords(tokens.slice(toIndex + 1));
  return source && target ? ['update-global-folder', target, '--move-from-path', source] : undefined;
}

function normalizeNaturalWorkspace(argv: string[]): string[] {
  const [verb = '', ...tokens] = argv;
  if (!workspaceVerbs.has(verb.toLowerCase())) return argv;
  const actionTokens = tokens.filter((t) => !t.startsWith('-')).filter((t) => !workspaceActionFillers.has(t.toLowerCase()));
  const flags = tokens.filter((t) => t.startsWith('-'));
  if (actionTokens.length === 0) return ['workspace', 'list', ...flags];
  const first = actionTokens[0]?.toLowerCase();
  if (workspaceViewVerbs.has(first)) return ['workspace', 'list', ...flags];
  if (first === 'info' || first === 'details') return ['workspace', 'info', ...actionTokens.slice(1), ...flags];
  if (['set', 'change', 'update', 'configure'].includes(first) && actionTokens[1] && actionTokens[2]) return ['workspace', 'set', actionTokens[1], actionTokens[2], ...flags];
  if (['unregister', 'remove', 'delete', 'forget'].includes(first)) return ['workspace', 'unregister', ...actionTokens.slice(1), ...flags];
  if (first === 'link') return ['workspace', 'link', ...actionTokens.slice(1), ...flags];
  if (first === 'unlink') return ['workspace', 'unlink', ...actionTokens.slice(1), ...flags];
  return argv;
}

function normalizeNaturalConfig(argv: string[]): string[] {
  const [verb = '', ...tokens] = argv;
  if (!configVerbs.has(verb.toLowerCase())) return argv;
  const actionTokens = tokens.filter((t) => !t.startsWith('-'));
  const flags = tokens.filter((t) => t.startsWith('-'));
  if (actionTokens.length === 0) return ['config', 'view', ...flags];
  const first = actionTokens[0]?.toLowerCase();
  if (configViewVerbs.has(first)) return ['config', 'view', ...flags];
  if (configSetVerbs.has(first) && actionTokens[1] && actionTokens[2]) return ['config', 'set', actionTokens[1], actionTokens[2], ...flags];
  return argv;
}

function globalFolderNounEnd(tokens: string[]): number {
  if (tokens[0]?.toLowerCase() !== 'global') return -1;
  let index = 1;
  if (['engram', 'memory'].includes(tokens[index]?.toLowerCase())) index += 1;
  const firstNoun = index;
  while (globalFolderNouns.has(tokens[index]?.toLowerCase())) index += 1;
  return index > firstNoun ? index : -1;
}

function dropGlobalFolderFillers(tokens: string[]): string[] {
  let index = 0;
  while (globalFolderFillers.has(tokens[index]?.toLowerCase())) index += 1;
  return tokens.slice(index);
}

function dropWords(tokens: string[], words: string[]): string[] {
  const lower = new Set(words);
  let index = 0;
  while (lower.has(tokens[index]?.toLowerCase())) index += 1;
  return tokens.slice(index);
}

function trimPathWords(tokens: string[]): string {
  return tokens.join(' ').trim();
}

function normalizeForce(argv: string[]): string[] {
  const [command = 'help', ...tokens] = argv;
  if (!forceCommands.has(command)) return argv;
  if (tokens[0]?.toLowerCase() === 'force') return [command, '--force', ...tokens.slice(1)];
  if (tokens[0]?.toLowerCase() === 'accept-all') throw new Error('`--accept-all` was removed. Use `--force`.');
  if (tokens[0]?.toLowerCase() === 'accept' && tokens[1]?.toLowerCase() === 'all') throw new Error('`--accept-all` was removed. Use `--force`.');
  return argv;
}

function assertSupportedFlag(command: string, token: string): void {
  const normalized = token.startsWith('--') ? token.split('=')[0] : token;
  if (normalized === '-a') throw new Error('`-a` was removed. Use `-f` or `--force`.');
  if (normalized === '--accept-all') throw new Error('`--accept-all` was removed. Use `--force`.');
  if (normalized === '--for-agents' || normalized === '--for_agents') throw new Error('`--for-agents` was removed. Use `engram load "<task>"` or `engram load --full "<task>"`.');
}

function normalizeSaveSessionQueryLevel(argv: string[]): string[] {
  const [command = 'help', ...tokens] = argv;
  if (!saveSessionCommands.has(command) || tokens.some((token) => token === '--query-level')) return argv;
  const normalized: string[] = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const current = tokens[i];
    const lower = current.toLowerCase();
    const next = tokens[i + 1];
    const afterNext = tokens[i + 2];
    if (recentSessionPrefixes.has(lower) && isPositiveIntegerToken(next) && isRecentSessionWord(afterNext)) {
      normalized.push('--query-level', next);
      i += 2;
      continue;
    }
    if (isPositiveIntegerToken(current) && isRecentSessionWord(next)) {
      normalized.push('--query-level', current);
      i += 1;
      continue;
    }
    normalized.push(current);
  }
  return [command, ...normalized];
}

function isPositiveIntegerToken(value: string | undefined): value is string {
  return typeof value === 'string' && /^[1-9]\d*$/.test(value);
}

function isRecentSessionWord(value: string | undefined): boolean {
  return typeof value === 'string' && recentSessionWords.has(value.toLowerCase());
}
