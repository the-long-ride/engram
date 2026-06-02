/** Engram CLI dispatcher. Commands stay thin and delegate to core modules. */
import { parseArgs } from './cli/args.js';
import { VERSION } from './core/runtime/constants.js';
import { canonicalCommand } from './core/cli/command-registry.js';
import { formatRecords } from './core/cli/format.js';
import { cmdCompletion, cmdHelp, cmdInit, cmdSave, cmdSaveSession, cmdTakeControl, cmdUpdateHelp } from './commands/core.js';
import { cmdObserve } from './commands/observe.js';
import { cmdAudit, cmdLoad, cmdRebuildIndex, cmdRepair, cmdVerify } from './commands/read.js';
import { cmdArchive, cmdBenchmark, cmdDeduplicate, cmdEntry, cmdExport, cmdGraph, cmdHealth, cmdImport, cmdQuality, cmdSearch, cmdStats, cmdSync } from './commands/ops.js';
import { cmdIgnore, cmdInstallHooks, cmdInstallSkillset, cmdPropose, cmdResolveConflicts, cmdSetRole, cmdSetRuleVariant, cmdTeamDashboard, cmdUpgrade } from './commands/admin.js';

/** Execute a CLI invocation and return printable output. */
export async function runCli(argv: string[]): Promise<string> {
  const parsed = parseArgs(argv);
  const command = canonicalCommand(parsed.command);
  const { rest, flags } = parsed;
  if (flags.help || flags.h || command === '-h' || command === '--help' || rest.includes('-h') || rest.includes('--help')) {
    const topic = (command !== '-h' && command !== '--help' && command !== 'help') ? command : rest.find((arg) => arg !== '-h' && arg !== '--help');
    return cmdHelp(topic);
  }
  if (flags.version || flags.v || command === '--version' || command === '-v' || command === 'version') return VERSION;
  switch (command) {
    case 'init': return cmdInit(flags);
    case 'help': return cmdHelp(rest[0]);
    case 'update-help': return cmdUpdateHelp();
    case 'completion': return cmdCompletion(rest[0]);
    case 'save': return cmdSave(rest, flags);
    case 'save-session': return cmdSaveSession(rest, flags);
    case 'observe': return cmdObserve(rest, flags);
    case 'take-control': return cmdTakeControl(rest, flags);
    case 'load': return cmdLoad(rest, flags);
    case 'dry-run': return dryRun(rest, flags);
    case 'verify': return cmdVerify(rest[0]);
    case 'rebuild-index': return cmdRebuildIndex(rest[0]);
    case 'repair': return cmdRepair(rest[0]);
    case 'audit': return cmdAudit(flags);
    case 'archive': return cmdArchive(rest, flags);
    case 'benchmark': return cmdBenchmark(rest);
    case 'health': return cmdHealth();
    case 'graph': return cmdGraph(rest, flags);
    case 'entry': return cmdEntry();
    case 'quality-check': return cmdQuality();
    case 'deduplicate': return cmdDeduplicate(flags);
    case 'export': return cmdExport(flags);
    case 'import': return cmdImport(rest, flags);
    case 'search': return cmdSearch(rest, flags);
    case 'stats': return cmdStats();
    case 'ignore': return cmdIgnore(rest);
    case 'set-role': return cmdSetRole(rest);
    case 'set-rule-variant': return cmdSetRuleVariant(rest);
    case 'resolve-conflicts': return cmdResolveConflicts(flags);
    case 'install-hooks': return cmdInstallHooks();
    case 'install-skillset': return cmdInstallSkillset(rest, flags);
    case 'upgrade': return cmdUpgrade(rest, flags);
    case 'sync': return cmdSync();
    case 'propose': return cmdPropose(rest);
    case 'team-dashboard': return cmdTeamDashboard();
    default: return cmdHelp();
  }
}

/** Dry-run routing without printing full memory content. */
async function dryRun(args: string[], flags: Record<string, any>): Promise<string> {
  const { getContext } = await import('./core/memory/context.js');
  const { route } = await import('./core/memory/routing.js');
  const ctx = await getContext();
  const all = flags.all === true;
  const entries = route(ctx.index, args.join(' ') || 'current session', ctx.config, all, { all, ignorePatterns: ctx.ignorePatterns }, ctx.graph);
  if (!entries.length) return 'No routed memories';
  return formatRecords(`Routed memories (${entries.length})`, entries.map((entry) => ({
    title: `${entry.scope}:${entry.file}`,
    fields: [['Type', entry.type], ['Summary', entry.summary]]
  })));
}

/** Main process entrypoint with clear errors. */
export async function main(argv = process.argv.slice(2)): Promise<void> {
  try {
    const output = await runCli(argv);
    if (output) console.log(output);
  } catch (error: any) {
    console.error(`engram: ${error.message}`);
    process.exit(1);
  }
}
