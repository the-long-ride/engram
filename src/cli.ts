/** Engram CLI dispatcher. Commands stay thin and delegate to core modules. */
import { parseArgs } from './cli/args.js';
import { VERSION } from './core/constants.js';
import { cmdAudit, cmdHelp, cmdInit, cmdLoad, cmdSave, cmdUpdateHelp, cmdVerify } from './commands/core.js';
import { cmdDeduplicate, cmdEntry, cmdExport, cmdHealth, cmdImport, cmdQuality, cmdSearch, cmdStats, cmdSync } from './commands/ops.js';
import { cmdIgnore, cmdInstallHooks, cmdInstallSkillset, cmdPropose, cmdResolveConflicts, cmdSetRole, cmdSetRuleVariant, cmdTeamDashboard } from './commands/admin.js';

/** Execute a CLI invocation and return printable output. */
export async function runCli(argv: string[]): Promise<string> {
  const parsed = parseArgs(argv);
  const { command, rest, flags } = parsed;
  if (flags.help || flags.h || command === '-h' || command === '--help' || rest.includes('-h') || rest.includes('--help')) {
    const topic = (command !== '-h' && command !== '--help' && command !== 'help') ? command : rest.find((arg) => arg !== '-h' && arg !== '--help');
    return cmdHelp(topic);
  }
  if (flags.version || command === '--version' || command === 'version') return VERSION;
  switch (command) {
    case 'init': return cmdInit(flags);
    case 'help': return cmdHelp(rest[0]);
    case 'update-help': return cmdUpdateHelp();
    case 'save': return cmdSave(rest, flags);
    case 'load': return cmdLoad(rest, true);
    case 'dry-run': return dryRun(rest);
    case 'verify': return cmdVerify(rest[0]);
    case 'audit': return cmdAudit(flags);
    case 'health': return cmdHealth();
    case 'entry': return cmdEntry();
    case 'quality-check': return cmdQuality();
    case 'deduplicate': return cmdDeduplicate();
    case 'export': return cmdExport(flags);
    case 'import': return cmdImport(rest);
    case 'search': return cmdSearch(rest);
    case 'stats': return cmdStats();
    case 'ignore': return cmdIgnore(rest);
    case 'set-role': return cmdSetRole(rest);
    case 'set-rule-variant': return cmdSetRuleVariant(rest);
    case 'resolve-conflicts': return cmdResolveConflicts(flags);
    case 'install-hooks': return cmdInstallHooks();
    case 'install-skillset': return cmdInstallSkillset(rest, flags);
    case 'sync': return cmdSync();
    case 'propose': return cmdPropose(rest);
    case 'team-dashboard': return cmdTeamDashboard();
    default: return cmdHelp();
  }
}

/** Dry-run routing without printing full memory content. */
async function dryRun(args: string[]): Promise<string> {
  const { getContext } = await import('./core/context.js');
  const { route } = await import('./core/routing.js');
  const ctx = await getContext();
  const entries = route(ctx.index, args.join(' ') || 'current session', ctx.config, true);
  return entries.map((entry) => `${entry.scope}:${entry.file}`).join('\n') || 'No routed memories';
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
