/** Per-host hook payload caps (E9): measure rendered hook context in the host's own unit. */
import type { AgentHookHost } from './agent-hooks.js';

export type HookCap = { unit: 'tokens' | 'chars'; max: number };

/** Codex: ~2,500 tokens per hook message (https://learn.chatgpt.com/docs/hooks). Claude: 10,000 chars (https://code.claude.com/docs/en/hooks). */
export const HOST_HOOK_CAPS: Partial<Record<AgentHookHost, HookCap>> = {
  codex: { unit: 'tokens', max: 2400 },
  claude: { unit: 'chars', max: 9500 }
};

/** Most re-plans per hook event before the payload falls back to a shortened or proof-only form. */
export const CAP_REPLANS = 3;
/** Planner tokens kept free between re-plans for the proof line's digit changes. */
export const REPLAN_MARGIN = 16;

/** The cap for a host; hosts without a documented cap use `load.max_tokens` for the whole text. */
export function hookCap(host: AgentHookHost, maxTokens: number): HookCap {
  return HOST_HOOK_CAPS[host] ?? { unit: 'tokens', max: maxTokens };
}

/** Size in the cap's unit; token caps use UTF-8 bytes / 4 rounded up, which is conservative for non-ASCII text. */
export function hookSize(text: string, cap: HookCap): number {
  return cap.unit === 'chars' ? text.length : Math.ceil(Buffer.byteLength(text, 'utf8') / 4);
}

/** Planner tokens (`estimateTokens` = chars / 4) that fit `room` units of this cap. */
export function plannerTokensFor(cap: HookCap, room: number): number {
  return Math.max(0, cap.unit === 'chars' ? Math.floor(room / 4) : room);
}
