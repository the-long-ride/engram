/** Engram CLI dispatcher. Commands stay thin and delegate to core modules. */
import { parseArgs } from './cli/args.js';
import { VERSION } from './core/runtime/constants.js';
import { canonicalCommand } from './core/cli/command-registry.js';
import { cmdCompletion, cmdHelp, cmdInit } from './commands/core.js';
import { cmdObserve } from './commands/observe.js';
import { cmdAudit, cmdLoad, cmdRebuildIndex, cmdRepair, cmdVerify } from './commands/read.js';
import { cmdSave, cmdSaveSession, cmdTakeControl } from './commands/write.js';
import { cmdArchive, cmdBenchmark, cmdDeduplicate, cmdEntry, cmdExport, cmdGraph, cmdHealth, cmdImport, cmdQuality, cmdSearch, cmdStats, cmdSync } from './commands/ops.js';
import { cmdCloneMemory } from './commands/clone.js';
import { cmdProfile } from './commands/profile.js';
import { cmdIgnore, cmdInstallHooks, cmdInstallSkillset, cmdResolveConflicts, cmdSetRole, cmdSetRuleVariant, cmdSetSaveTarget, cmdUpdateGlobalFolder, cmdUpgrade } from './commands/admin.js';

/** Execute a CLI invocation and return printable output. */
export async function runCli(argv: string[]): Promise<string> {
  const parsed = parseArgs(argv);
  const command = canonicalCommand(parsed.command);
  const { rest, flags } = parsed;
  const previousProfile = process.env.ENGRAM_PROFILE;
  if (typeof flags.profile === 'string' && flags.profile.trim()) process.env.ENGRAM_PROFILE = flags.profile.trim();
  try {
    if (flags.help || flags.h || command === '-h' || command === '--help' || rest.includes('-h') || rest.includes('--help')) {
      const topic = (command !== '-h' && command !== '--help' && command !== 'help') ? command : rest.find((arg) => arg !== '-h' && arg !== '--help');
      return await cmdHelp(topic);
    }
    if (flags.version || flags.v || command === '--version' || command === '-v' || command === 'version') return VERSION;
    switch (command) {
      case 'init': return await cmdInit(flags);
      case 'help': return await cmdHelp(rest[0]);
      case 'completion': return await cmdCompletion(rest[0]);
      case 'profile': return await cmdProfile(rest, flags);
      case 'save': return await cmdSave(rest, flags);
      case 'save-session': return await cmdSaveSession(rest, flags);
      case 'observe': return await cmdObserve(rest, flags);
      case 'take-control': return await cmdTakeControl(rest, flags);
      case 'load': return await cmdLoad(rest, flags);
      case 'verify': return await cmdVerify(rest[0]);
      case 'rebuild-index': return await cmdRebuildIndex(rest[0]);
      case 'repair': return await cmdRepair(rest[0]);
      case 'audit': return await cmdAudit(flags);
      case 'archive': return await cmdArchive(rest, flags);
      case 'benchmark': return await cmdBenchmark(rest);
      case 'health': return await cmdHealth();
      case 'graph': return await cmdGraph(rest, flags);
      case 'entry': return await cmdEntry();
      case 'quality-check': return await cmdQuality();
      case 'deduplicate': return await cmdDeduplicate(flags);
      case 'export': return await cmdExport(flags);
      case 'import': return await cmdImport(rest, flags);
      case 'search': return await cmdSearch(rest, flags);
      case 'stats': return await cmdStats();
      case 'ignore': return await cmdIgnore(rest);
      case 'set-role': return await cmdSetRole(rest);
      case 'set-save-target': return await cmdSetSaveTarget(rest);
      case 'set-rule-variant': return await cmdSetRuleVariant(rest);
      case 'update-global-folder': return await cmdUpdateGlobalFolder(rest, flags);
      case 'resolve-conflicts': return await cmdResolveConflicts(flags);
      case 'install-hooks': return await cmdInstallHooks();
      case 'install-skillset': return await cmdInstallSkillset(rest, flags);
      case 'upgrade': return await cmdUpgrade(rest, flags);
      case 'clone-memory': return await cmdCloneMemory(rest, flags);
      case 'sync': return await cmdSync();
      default: return await cmdHelp();
    }
  } finally {
    if (previousProfile === undefined) delete process.env.ENGRAM_PROFILE;
    else process.env.ENGRAM_PROFILE = previousProfile;
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
