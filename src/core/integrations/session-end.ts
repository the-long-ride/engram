/** SessionEnd hook handler: queue the transcript path for `engram observe --queue`. Never injects, never throws. */
import path from 'node:path';
import { workspaceRoot } from '../runtime/config.js';
import { enqueueSession } from '../memory/session-queue.js';
import type { AgentHookHost } from './agent-hooks.js';

/**
 * Append `{ transcript_path, host, session, at }` to the scope-root `session-queue.json`. Only Claude and Codex register
 * SessionEnd; a payload without a transcript path or session id, a workspace without an Engram folder, and any write
 * failure queue nothing. The caller answers `{}` in every case (hooks fail open).
 */
export async function recordSessionEnd(host: AgentHookHost, payload: Record<string, any>, cwd: string): Promise<boolean> {
  try {
    if (host !== 'claude' && host !== 'codex') return false;
    const transcript = typeof payload.transcript_path === 'string' ? payload.transcript_path.trim() : '';
    const session = String(payload.session_id ?? payload.sessionId ?? '').trim();
    if (!transcript || !session) return false;
    await enqueueSession(workspaceRoot(cwd), {
      transcript_path: path.resolve(cwd, transcript),
      host,
      session,
      at: new Date().toISOString()
    });
    return true;
  } catch {
    return false;
  }
}
