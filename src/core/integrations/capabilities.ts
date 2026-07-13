/** Explicit host integration capabilities used by conformance and transcript gating. */
export type AdapterCapabilities = {
  host: string; instruction: boolean; skillset: boolean; mcp: boolean; startup_injection: boolean;
  prompt_turn_injection: boolean; proof: boolean; transcript_events: boolean; unlink_cleanup: boolean;
};

const CAPABILITIES: AdapterCapabilities[] = [
  { host: 'codex', instruction: true, skillset: true, mcp: true, startup_injection: true, prompt_turn_injection: false, proof: true, transcript_events: false, unlink_cleanup: true },
  { host: 'claude', instruction: true, skillset: true, mcp: true, startup_injection: true, prompt_turn_injection: true, proof: true, transcript_events: true, unlink_cleanup: true },
  { host: 'gemini', instruction: true, skillset: true, mcp: true, startup_injection: true, prompt_turn_injection: true, proof: true, transcript_events: true, unlink_cleanup: true },
  { host: 'cursor', instruction: true, skillset: true, mcp: true, startup_injection: true, prompt_turn_injection: false, proof: true, transcript_events: false, unlink_cleanup: true },
  { host: 'windsurf', instruction: true, skillset: true, mcp: false, startup_injection: false, prompt_turn_injection: true, proof: true, transcript_events: true, unlink_cleanup: true },
  { host: 'copilot', instruction: true, skillset: false, mcp: true, startup_injection: false, prompt_turn_injection: false, proof: false, transcript_events: false, unlink_cleanup: true },
  { host: 'cline', instruction: true, skillset: false, mcp: true, startup_injection: false, prompt_turn_injection: false, proof: false, transcript_events: false, unlink_cleanup: true },
  { host: 'opencode', instruction: true, skillset: true, mcp: true, startup_injection: true, prompt_turn_injection: true, proof: true, transcript_events: true, unlink_cleanup: true }
];

export function adapterCapabilities(host?: string): AdapterCapabilities[] { return CAPABILITIES.filter((item) => !host || item.host === host).map((item) => ({ ...item })); }
