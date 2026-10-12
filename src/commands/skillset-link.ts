/** Link and unlink agent-host Engram skillset integrations. */
import {
  globalSkillsetRegistryPath,
  installGlobalSkillset,
  installSkillset,
  resolveLinkTargets,
  skillsetTargets,
  unlinkGlobalSkillset,
  unlinkSkillset,
  type InstallResult,
  type SkillsetTarget,
  type UnlinkResult
} from "../core/integrations/skillset.js";
import { claudeUserMcpCommand } from "../core/integrations/mcp-config.js";
import { applyAgentHookAction, detectInstalledHookTargets, hookHostsForTarget } from "../core/integrations/agent-hooks.js";
import { formatRecords, type RecordBlock } from "../core/cli/format.js";
import { loadConfig, workspaceRoot, legacyWorkspaceRoot } from "../core/runtime/config.js";
import { exists } from "../core/system/fsx.js";
import { getContext } from "../core/memory/context.js";
import { globalAgentHome } from "../core/integrations/agent-paths.js";
import {
  missingGlobalRuleCount,
  nativeRuleRecords,
  removeNativeRules,
  syncNativeRules,
  type NativeRuleHost,
  type NativeRuleSyncResult
} from "../core/integrations/native-rules.js";

/** Install agent-host instruction files, MCP config, and agent hooks for Engram integration. */
export async function cmdLink(args: string[], flags: Record<string, any> = {}): Promise<string> {
  if (args[0] === "list") return skillsetList("Currently, engram supports these agents:");
  // Memory parent-link mode: `engram link --parent <id> --children <id1> --children <id2>`.
  // Branches before target parsing so positional memory ids are not misread as skillset targets.
  if (typeof flags.parent === 'string' || Array.isArray(flags.parent) || Array.isArray(flags.children) || typeof flags.children === 'string') {
    return await cmdLinkMemoryParent(flags);
  }
  const target = args[0] ?? "all";
  const global = flags.global === true;
  const allSupported = flags["all-supported"] === true;
  const effectiveTarget = allSupported ? "all-supported" : target;

  if (!global) {
    const cwd = process.cwd();
    const config = await loadConfig(cwd);
    if (config.scope === 'global') {
      return `Skipped workspace link (workspace): config scope is global.`;
    }
  }

  const hookTarget = skillsetHookTarget(target);
  // Hooks are installed right after these files, so the rendered text can already say context is auto-injected.
  const hookHosts = hookTarget && flags.plan !== true ? hookHostsForTarget(hookTarget) : [];
  const results = global
    ? await installGlobalSkillset(effectiveTarget, { force: Boolean(flags.force), hookHosts })
    : await installSkillset(process.cwd(), effectiveTarget, Boolean(flags.force), { hookHosts });

  const hookResult = hookTarget ? await applyAgentHookAction("install", hookTarget, {
    global,
    plan: flags.plan === true,
    force: Boolean(flags.force),
    sessionEnd: flags["session-end"] === true
  }) : "";

  return [
    formatRecords(global ? "Global link install" : "Link install", installResultRecords(results)),
    ...(await skillsetInstallHints(results, global)),
    ...(hookResult ? [hookResult] : []),
    ...(await nativeRuleSection(effectiveTarget, global, flags.plan === true))
  ].join("\n");
}

/** Remove Engram agent-host instruction files, MCP config, managed blocks, and agent hooks. */
export async function cmdUnlink(args: string[], flags: Record<string, any> = {}): Promise<string> {
  const target = args[0] ?? "all";
  const global = flags.global === true;

  if (!global) {
    const cwd = process.cwd();
    const config = await loadConfig(cwd);
    if (config.scope === 'global') {
      return `Skipped workspace unlink (workspace): config scope is global.`;
    }
  }

  const results = global
    ? await unlinkGlobalSkillset(target, { force: Boolean(flags.force) })
    : await unlinkSkillset(process.cwd(), target);

  const hookTarget = skillsetHookTarget(target);
  const hookResult = hookTarget ? await applyAgentHookAction("uninstall", hookTarget, {
    global,
    force: Boolean(flags.force)
  }) : "";

  return [
    formatRecords(global ? "Global unlink" : "Unlink", unlinkResultRecords(results)),
    ...(hookResult ? [hookResult] : []),
    ...(await nativeRuleUnlinkSection(target, global))
  ].join("\n");
}

const NATIVE_RULE_HOSTS: NativeRuleHost[] = ["claude", "cursor"];

/** Claude/Cursor hosts a link or unlink target covers; unlink of `all` sweeps both, since marked rule files are Engram's own. */
function nativeRuleHosts(target: string, unlink = false): NativeRuleHost[] {
  if (unlink && (target === "all" || target === "all-supported")) return [...NATIVE_RULE_HOSTS];
  try {
    const names = resolveLinkTargets(target).map((item) => String(item.name));
    return NATIVE_RULE_HOSTS.filter((host) => names.includes(host));
  } catch {
    return [];
  }
}

/** E12/E13: write or preview the native path rules of the linked Claude/Cursor targets; global link covers Claude only. */
async function nativeRuleSection(target: string, global: boolean, plan: boolean): Promise<string[]> {
  const hosts = nativeRuleHosts(target).filter((host) => !global || host === "claude");
  if (!hosts.length) return [];
  try {
    const cwd = process.cwd();
    const ctx = await getContext(cwd);
    const results: NativeRuleSyncResult[] = [];
    for (const host of hosts) {
      results.push(await syncNativeRules(ctx, host, global
        ? { scope: "global", baseDir: globalAgentHome(), plan }
        : { scope: "workspace", baseDir: cwd, plan }));
    }
    const rows = [formatRecords("Native path rules", nativeRuleRecords(results))];
    const missing = !global && !plan && hosts.includes("claude") ? await missingGlobalRuleCount(ctx) : 0;
    if (missing > 0) rows.push(`Hint: ${missing} global applies_to memories have no native rule; run engram link --global claude or engram config set hooks.path_rules hook`);
    return rows;
  } catch (error) {
    return [`Native path rules skipped: ${error instanceof Error ? error.message : String(error)}`];
  }
}

/** Unlink: delete the marked rule files of the unlinked Claude/Cursor targets. */
async function nativeRuleUnlinkSection(target: string, global: boolean): Promise<string[]> {
  const hosts = nativeRuleHosts(target, true).filter((host) => !global || host === "claude");
  const rows: RecordBlock[] = [];
  for (const host of hosts) {
    try {
      const removed = await removeNativeRules(global ? globalAgentHome() : process.cwd(), host);
      if (removed.length) rows.push({ title: `REMOVED native rules ${host}`, fields: [["Removed", removed.join(", ")]] });
    } catch {
      // Derived files: a failed cleanup must not fail the unlink.
    }
  }
  return rows.length ? [formatRecords("Native path rules", rows)] : [];
}

/** Legacy command name for Engram skillset integration. */
export async function cmdInstallSkillset(args: string[], flags: Record<string, any> = {}): Promise<string> {
  if (args[0] === "list") return skillsetList("Currently, engram do support these agents and also mcp:");
  const target = args[0] ?? "all";
  const global = flags.global === true;

  if (!global) {
    const cwd = process.cwd();
    const config = await loadConfig(cwd);
    if (config.scope === 'global') {
      return `Skipped workspace skillset install (workspace): config scope is global.`;
    }
  }

  const results = global
    ? await installGlobalSkillset(target, { force: Boolean(flags.force) })
    : await installSkillset(process.cwd(), target, Boolean(flags.force));
  return [
    formatRecords(global ? "Global skillset install" : "Skillset install", installResultRecords(results)),
    ...(await skillsetInstallHints(results, global))
  ].join("\n");
}

export function installResultRecords(results: InstallResult[]): RecordBlock[] {
  return results.map((result) => ({
    title: `${result.action.toUpperCase()} ${result.target}: ${result.file}`,
    fields: [
      ...(result.mode ? [["Mode", result.mode] as [string, string]] : []),
      ...(result.reason ? [["Reason", result.reason] as [string, string]] : [])
    ]
  }));
}

function unlinkResultRecords(results: UnlinkResult[]): RecordBlock[] {
  return results.map((result) => ({
    title: `${result.action.toUpperCase()} ${result.target}: ${result.file}`,
    fields: [
      ...(result.reason ? [["Reason", result.reason] as [string, string]] : [])
    ]
  }));
}

function skillsetList(intro: string): string {
  const isTTY = process.stdout.isTTY;
  const cyan = (text: string) => isTTY ? `\x1b[1;36m${text}\x1b[0m` : text;
  const yellow = (text: string) => isTTY ? `\x1b[1;33m${text}\x1b[0m` : text;
  const gray = (text: string) => isTTY ? `\x1b[90m${text}\x1b[0m` : text;
  const listLines = skillsetListTargets().map((target) => {
    const note = skillsetListNotes[target];
    return `  ${cyan("\u2022")} ${yellow(target.padEnd(16))}${note ? ` ${gray(note)}` : ""}`;
  });
  return [intro, ...listLines].join("\n");
}

function skillsetListTargets(): SkillsetTarget[] {
  const targets: SkillsetTarget[] = skillsetTargets().filter((target) => target !== "agents-md");
  const mcpIndex = targets.indexOf("mcp");
  if (mcpIndex >= 0) targets.splice(mcpIndex + 1, 0, "agents-md");
  else targets.push("agents-md");
  return targets;
}

async function skillsetInstallHints(results: InstallResult[], global = false): Promise<string[]> {
  const hints = [];
  if (global) hints.push(`Registry: ${globalSkillsetRegistryPath()}`);
  if (results.some((result) => result.action === "skipped")) hints.push("Skipped targets can be installed manually when the agent exposes a stable user/global rule path.");
  if (results.some((result) => result.file === "<manual>" && result.reason?.includes("claude mcp add"))) {
    // E5: without Engram Claude hooks nothing injects context, so ask Claude Code to load engram_load upfront.
    const alwaysLoad = !(await detectInstalledHookTargets({ global: true, includeStale: true })).includes("claude");
    hints.push(`Claude Code MCP (user scope): ${claudeUserMcpCommand({ alwaysLoad })}`);
  }
  if (results.some((result) => result.target === "gemini")) {
    hints.push("Note: gemini also covers current Antigravity 2.0, Antigravity CLI, and Antigravity IDE Gemini-compatible paths while Google keeps those surfaces in flux.");
  }
  hints.push("Agent hooks are automatically installed for Codex, Claude, Gemini, Cursor, Windsurf, and OpenCode targets.");
  if (results.some((result) => result.target === "windsurf" || result.target === "cascade") && !global) {
    hints.push("Note: workspace MCP is not generated for Windsurf; run `engram link --global windsurf` for MCP.");
  }
  if (!results.some((result) => result.target === "slash")) return hints;
  hints.push(
    "Hint: if /engram is not visible in an already-open chat, restart or reload the agent chat after the new slash files are written.",
    global ? "Global Claude paths: ~/.claude/commands/engram.md and ~/.claude/skills/engram/SKILL.md" : "Claude paths: .claude/commands/engram.md and .claude/skills/engram/SKILL.md"
  );
  return hints;
}

/** Return the agent-hook target for a skillset target, or empty string if no hooks apply. */
function skillsetHookTarget(target: string): string {
  if (target === "all" || target === "all-supported") return "all";
  if (["codex", "claude", "gemini", "opencode", "cursor", "windsurf"].includes(target)) return target;
  if (target === "antigravity" || target === "antigravity-cli") return "gemini";
  if (target === "cascade") return "windsurf";
  if (["copilot", "cline", "open-code"].includes(target)) return target;
  return "";
}

const skillsetListNotes: Partial<Record<SkillsetTarget, string>> = {
  "agents-md": "# Generic AGENTS.md fallback for unlisted AGENTS.md-compatible agents",
  gemini: "# Also covers current Antigravity 2.0, CLI, and IDE Gemini-compatible paths",
  slash: "# Installs IDE/chat slash commands (/engram) for manual requests"
};

/** Memory parent-link mode: add DEPENDS_ON <parentId> to each declared child. */
async function cmdLinkMemoryParent(flags: Record<string, any>): Promise<string> {
  const parentId = typeof flags.parent === 'string' ? flags.parent : '';
  const childIds = Array.isArray(flags.children) ? flags.children
    : Array.isArray(flags.child) ? flags.child
    : typeof flags.children === 'string' ? [flags.children]
    : typeof flags.child === 'string' ? [flags.child]
    : [];
  if (!parentId) return "Error: --parent <id> is required for memory parent-link.";
  if (childIds.length === 0) return "Error: at least one --children <id> is required for memory parent-link.";
  const { getContext } = await import('../core/memory/context.js');
  const { linkMemoryChildren } = await import('../core/memory/link-memory.js');
  const ctx = await getContext(process.cwd());
  const summary = await linkMemoryChildren({ ctx, parentId, childIds, findParent: true });
  const lines: string[] = [];
  lines.push(`Parent: ${summary.parent ?? parentId}${summary.parent ? '' : ' (not found in visible memories)'}`);
  lines.push(`Updated: ${summary.updated} | Skipped: ${summary.skipped} | Missing: ${summary.missing}`);
  if (summary.results.length) {
    lines.push('');
    for (const r of summary.results) {
      const tag = r.status === 'updated' ? '+' : r.status === 'skipped' ? '=' : r.status === 'missing' ? '!' : '?';
      const where = r.file ? `${r.scope}/${r.file}` : r.id;
      lines.push(`  [${tag}] ${where}${r.reason ? ` — ${r.reason}` : ''}`);
    }
  }
  return lines.join('\n');
}