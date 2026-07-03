/** Shared user-level paths for AI-agent integrations. */
import path from 'node:path';
import { homedir, platform } from 'node:os';

export function globalAgentHome(): string {
  const configured = process.env.ENGRAM_AGENT_HOME?.trim();
  return configured ? path.resolve(configured) : homedir();
}

export function globalAgentConfigHome(home = globalAgentHome()): string {
  const configured = process.env.ENGRAM_AGENT_CONFIG_HOME?.trim()
    || process.env.XDG_CONFIG_HOME?.trim();
  if (configured) return path.resolve(configured);
  if (!process.env.ENGRAM_AGENT_HOME?.trim()
    && platform() === 'win32'
    && process.env.APPDATA?.trim()) {
    return path.resolve(process.env.APPDATA);
  }
  return path.join(home, '.config');
}

export function globalOpenCodeConfigHome(home = globalAgentHome()): string {
  return path.join(home, '.config', 'opencode');
}
