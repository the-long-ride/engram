/** Detect which AI agents are installed on the user's device. */
import { existsSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { execSync } from 'node:child_process';
import path from 'node:path';
import type { SkillsetTarget } from './skillset.js';

/** Agent names we can detect, mapped to their corresponding skillset targets. */
const AGENT_TARGET_MAP: Record<string, SkillsetTarget[]> = {
  codex: ['agents-md', 'agent-skill'],
  claude: ['claude'],
  cursor: ['cursor'],
  gemini: ['gemini'],
  copilot: ['copilot'],
  cline: ['cline'],
  windsurf: ['windsurf'],
  opencode: ['opencode'],
  antigravity: ['antigravity'],
};

/** Targets that are always applicable regardless of agent installation. */
const ALWAYS_TARGETS: SkillsetTarget[] = ['mcp', 'slash'];

/** Return the set of detectable agent names that are actually installed on this device. */
export function detectInstalledAgents(home = homedir()): Set<string> {
  const detected = new Set<string>();
  const win = platform() === 'win32';
  const appData = win ? (process.env.APPDATA ?? path.join(home, 'AppData', 'Roaming')) : '';
  const localAppData = win ? (process.env.LOCALAPPDATA ?? path.join(home, 'AppData', 'Local')) : '';
  const xdgConfig = process.env.XDG_CONFIG_HOME ?? path.join(home, '.config');

  // Codex: check ~/.codex directory or codex executable
  if (dirExists(path.join(home, '.codex')) || which('codex')) {
    detected.add('codex');
  }

  // Claude: check ~/.claude directory or Claude Desktop
  if (dirExists(path.join(home, '.claude')) || which('claude')) {
    detected.add('claude');
  }

  // Cursor: check Cursor installation or ~/.cursor
  if (dirExists(path.join(home, '.cursor')) || which('cursor') ||
      (win && dirExists(path.join(localAppData, 'Programs', 'Cursor')))) {
    detected.add('cursor');
  }

  // Gemini: check ~/.gemini directory or gemini CLI
  if (dirExists(path.join(home, '.gemini')) || which('gemini') ||
      dirExists(path.join(xdgConfig, 'gemini'))) {
    detected.add('gemini');
  }

  // Copilot: check ~/.copilot directory
  if (dirExists(path.join(home, '.copilot'))) {
    detected.add('copilot');
  }

  // Cline: check ~/.cline directory
  if (dirExists(path.join(home, '.cline'))) {
    detected.add('cline');
  }

  // Windsurf: check Windsurf installation
  if (which('windsurf') ||
      (win && dirExists(path.join(localAppData, 'Programs', 'Windsurf')))) {
    detected.add('windsurf');
  }

  // OpenCode: check opencode config dir or executable
  if (dirExists(path.join(xdgConfig, 'opencode')) ||
      (win && dirExists(path.join(appData, 'opencode'))) ||
      which('opencode') || which('open-code')) {
    detected.add('opencode');
  }

  // Antigravity: check .antigravity dirs or antigravity CLI
  if (dirExists(path.join(home, '.antigravity')) ||
      dirExists(path.join(home, '.antigravity-cli')) ||
      dirExists(path.join(home, '.antigravity-ide')) ||
      which('antigravity') || which('ag')) {
    detected.add('antigravity');
  }

  return detected;
}

/** Return the filtered list of targets when 'all' is specified, based on auto-detection. */
export function resolveAllTargets(home?: string): SkillsetTarget[] {
  const detected = detectInstalledAgents(home);
  const targets = new Set<SkillsetTarget>(ALWAYS_TARGETS);
  for (const [agentName, agentTargets] of Object.entries(AGENT_TARGET_MAP)) {
    if (detected.has(agentName)) {
      for (const t of agentTargets) targets.add(t);
    }
  }
  return Array.from(targets);
}

/** Return all supported targets (current behavior, used with --all-supported flag). */
export function allSupportedTargets(): SkillsetTarget[] {
  const targets = new Set<SkillsetTarget>(ALWAYS_TARGETS);
  for (const agentTargets of Object.values(AGENT_TARGET_MAP)) {
    for (const t of agentTargets) targets.add(t);
  }
  return Array.from(targets);
}

function dirExists(dir: string): boolean {
  try {
    return existsSync(dir);
  } catch {
    return false;
  }
}

function which(cmd: string): boolean {
  try {
    const result = execSync(
      platform() === 'win32' ? 'where ' + cmd + ' 2>nul' : 'which ' + cmd + ' 2>/dev/null',
      { stdio: 'pipe', timeout: 3000 }
    );
    return result.toString().trim().length > 0;
  } catch {
    return false;
  }
}
