/** Engram CLI dispatcher. Commands stay thin and delegate to core modules. */
import { parseArgs } from './cli/args.js';
import { VERSION } from './core/runtime/constants.js';
import { canonicalCommand } from './core/cli/command-registry.js';
import { cmdCompletion, cmdHelp, cmdInit } from './commands/core.js';
import { cmdObserve } from './commands/observe.js';
import { cmdAudit, cmdLoad, cmdRebuildIndex, cmdRepair, cmdVerify } from './commands/read.js';
import { cmdSave, cmdSaveSession, cmdTakeControl } from './commands/write.js';
import { cmdArchive, cmdBenchmark, cmdDeduplicate, cmdEntry, cmdExport, cmdGraph, cmdHealth, cmdImport, cmdQuality, cmdSearch, cmdStats, cmdSync } from './commands/ops.js';
import { cmdIgnore, cmdInstallHooks, cmdInstallSkillset, cmdResolveConflicts, cmdSetRole, cmdSetRuleVariant, cmdSetSaveTarget, cmdUpdateGlobalFolder, cmdUpgrade } from './commands/admin.js';

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
    case 'completion': return cmdCompletion(rest[0]);
    case 'save': return cmdSave(rest, flags);
    case 'save-session': return cmdSaveSession(rest, flags);
    case 'observe': return cmdObserve(rest, flags);
    case 'take-control': return cmdTakeControl(rest, flags);
    case 'load': return cmdLoad(rest, flags);
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
    case 'set-save-target': return cmdSetSaveTarget(rest);
    case 'set-rule-variant': return cmdSetRuleVariant(rest);
    case 'update-global-folder': return cmdUpdateGlobalFolder(rest, flags);
    case 'resolve-conflicts': return cmdResolveConflicts(flags);
    case 'install-hooks': return cmdInstallHooks();
    case 'install-skillset': return cmdInstallSkillset(rest, flags);
    case 'upgrade': return cmdUpgrade(rest, flags);
    case 'sync': return cmdSync();
    default: return cmdHelp();
  }
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
