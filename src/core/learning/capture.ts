/** Session learning capture to gitignored working/ tier and staged inbox receipts. */
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import type { InboxCandidate } from '../runtime/types.js';
import { loadConfig, workspaceRoot } from '../runtime/config.js';
import { exists, readJson } from '../system/fsx.js';
import { today } from '../system/text.js';
import { resolveAuthor } from '../author/resolve.js';
import { getContext } from '../memory/context.js';
import { planMemorySave } from '../memory/save-plan.js';
import { ensureScopeGitignore } from '../memory/scope-gitignore.js';
import { drainSessionQueue, type SessionQueueOutcome } from '../memory/session-queue.js';
import { writeApprovedMemory } from '../memory/storage.js';
import { workingTierMeta } from '../memory/working-tier.js';
import { buildReceipt, listReceipts, writeReceipt } from '../review/inbox.js';
import { sanitizeTraceText } from '../traces/sanitize.js';
import { readTrace, writeTrace } from '../traces/storage.js';
import type { TranscriptIngestOptions } from '../transcripts/types.js';
import { distillSessionLearnings, isLivePromptCorrection } from './distill.js';

export type CaptureLearningSource = 'agent-hook' | 'session-queue' | 'observe' | 'git';

export type CaptureLearningInput = {
  text: string;
  host: string;
  sessionId: string;
  source: CaptureLearningSource;
  touchedPaths?: string[];
  traceId?: string;
  mode?: 'auto' | 'inbox' | 'off';
  now?: Date;
};

export type CaptureLearningResult = {
  workingWritten: string[];
  receiptsWritten: string[];
  skippedDuplicates: number;
  traceId?: string;
};

const DUPLICATE_SCORE_THRESHOLD = 0.75;
const FALLBACK_AUTHOR_NAME = 'Engram Session Learner';

/** Distill and persist session learnings into gitignored working/ memories and staged durable inbox receipts. */
export async function captureSessionLearnings(
  cwd: string,
  input: CaptureLearningInput
): Promise<CaptureLearningResult> {
  const root = workspaceRoot(cwd);
  if (!(await exists(root))) {
    return { workingWritten: [], receiptsWritten: [], skippedDuplicates: 0 };
  }

  const config = await loadConfig(cwd);
  const mode = input.mode ?? config.learning?.mode ?? 'auto';
  if (!config.enabled || mode === 'off') {
    return { workingWritten: [], receiptsWritten: [], skippedDuplicates: 0 };
  }

  const distilled = distillSessionLearnings({
    text: input.text,
    touchedPaths: input.touchedPaths
  });
  if (!distilled.candidates.length) {
    return { workingWritten: [], receiptsWritten: [], skippedDuplicates: 0 };
  }

  await ensureScopeGitignore(root);

  const now = input.now ?? new Date();
  const day = input.now ? now.toISOString().slice(0, 10) : today();
  const sessionId = input.sessionId?.trim() || 'session-learning';
  const traceId = input.traceId?.trim() || (await persistLearningTrace(root, input, distilled.candidates.map((c) => c.text).join('\n'), now));

  const author = await resolveSafeAuthor(cwd);
  const existingReceipts = await listReceipts(root, now);
  const seenReceiptHashes = new Set(existingReceipts.map((item) => item.candidate_hash));

  const workingWritten: string[] = [];
  const receiptsWritten: string[] = [];
  let skippedDuplicates = 0;
  let ctx = await getContext(cwd);

  for (const candidate of distilled.candidates) {
    const plans = await planMemorySave({
      ctx,
      text: candidate.text,
      type: candidate.type,
      scopes: ['workspace'],
      authorName: author.name,
      authorEmail: author.email,
      triggers: candidate.triggers,
      confidence: candidate.confidence,
      directive: candidate.directive,
      appliesTo: candidate.appliesTo,
      source: {
        source: input.source,
        evidenceRefs: [traceId],
        derivedFrom: [sessionId],
        evidenceScope: 'workspace'
      },
      working: workingTierMeta(config, day, `session-learning:${input.source}`)
    });

    const plan = plans[0];
    if (!plan) continue;

    const related = plan.related ?? [];
    const hasHighDuplicate = related.some((hint) => hint.action === 'possible-duplicate' && hint.score >= DUPLICATE_SCORE_THRESHOLD);
    const hasDurableDuplicate = related.some((hint) => !hint.working && hint.action === 'possible-duplicate' && hint.score >= DUPLICATE_SCORE_THRESHOLD);
    const isDuplicate = plan.verdict.kind === 'NOOP' || hasHighDuplicate;

    if (mode === 'auto') {
      if (isDuplicate) {
        skippedDuplicates += 1;
      } else {
        await writeApprovedMemory({
          cwd,
          scope: 'workspace',
          file: plan.file,
          content: plan.content,
          message: plan.message
        });
        workingWritten.push(plan.file);
        ctx = await getContext(cwd);
      }
    }

    const shouldStageReceipt = (mode === 'inbox' || candidate.confidence === 'high') && !hasDurableDuplicate;
    if (shouldStageReceipt) {
      const inboxCandidate: InboxCandidate = {
        type: candidate.type,
        text: candidate.text,
        scope: 'workspace',
        triggers: candidate.triggers,
        ...(candidate.appliesTo?.length ? { appliesTo: candidate.appliesTo } : {}),
        directive: candidate.directive
      };
      const receipt = buildReceipt({
        scope: 'workspace',
        source: 'session-learning',
        candidate: inboxCandidate,
        related_ids: related.map((hint) => hint.id),
        now
      });
      if (!seenReceiptHashes.has(receipt.candidate_hash)) {
        seenReceiptHashes.add(receipt.candidate_hash);
        const receiptId = await writeReceipt(root, receipt);
        receiptsWritten.push(receiptId);
      }
    }
  }

  return { workingWritten, receiptsWritten, skippedDuplicates, traceId };
}

/** Fail-open live prompt correction capture for agent hooks. */
export async function maybeCaptureHookLearning(
  cwd: string,
  input: { host: string; sessionId: string; prompt?: string; touchedPaths?: string[] }
): Promise<void> {
  try {
    const prompt = input.prompt?.trim();
    if (!prompt || !isLivePromptCorrection(prompt)) return;
    await captureSessionLearnings(cwd, {
      text: prompt,
      host: input.host || 'hook',
      sessionId: input.sessionId || 'hook',
      source: 'agent-hook',
      touchedPaths: input.touchedPaths
    });
  } catch {
    // Fail-open: hook learning must never break prompt delivery.
  }
}

export type QueueLearnSummary = { workingCount: number; receiptCount: number };

/** Distill and persist learnings from stored session-queue outcomes. */
export async function learnFromQueueOutcomes(
  cwd: string,
  root: string,
  outcomes: SessionQueueOutcome[]
): Promise<QueueLearnSummary> {
  let workingCount = 0;
  let receiptCount = 0;
  for (const outcome of outcomes) {
    if (outcome.status !== 'stored' || !outcome.trace_id) continue;
    const trace = await readTrace(root, outcome.trace_id);
    if (!trace?.text) continue;
    const learned = await captureSessionLearnings(cwd, {
      text: trace.text,
      host: outcome.host,
      sessionId: outcome.session,
      source: 'session-queue',
      traceId: outcome.trace_id
    });
    workingCount += learned.workingWritten.length;
    receiptCount += learned.receiptsWritten.length;
  }
  return { workingCount, receiptCount };
}

/** Fail-open session-start queue auto-drain when config.learning.auto_drain is true. */
export async function maybeAutoDrainQueueOnStart(cwd: string): Promise<void> {
  try {
    const root = workspaceRoot(cwd);
    if (!(await exists(root))) return;
    const config = await loadConfig(cwd);
    if (config.learning?.auto_drain !== true) return;
    const ingest = await readJson<TranscriptIngestOptions>(path.join(cwd, '.agents', 'engram.transcripts.json'), {});
    const outcomes = await drainSessionQueue(root, { ingest });
    await learnFromQueueOutcomes(cwd, root, outcomes);
  } catch {
    // Fail-open: queue auto-drain must never break SessionStart.
  }
}

/** Format recent Git commit messages and changed files into clean learning text without shell interpolation. */
export async function harvestGitLearnings(cwd: string, range?: string): Promise<string> {
  const trimmedRange = range?.trim() ?? '';
  if (trimmedRange.startsWith('-')) {
    throw new Error(`Invalid git revision range: ${trimmedRange}`);
  }
  const revArgs = trimmedRange ? [trimmedRange] : ['-n', '5'];
  const raw = await new Promise<string>((resolve, reject) => {
    execFile(
      'git',
      ['log', ...revArgs, '--no-merges', '--name-only', '--pretty=format:---COMMIT---%n%s%n%b%n---FILES---'],
      { cwd, encoding: 'utf8' },
      (err: Error | null, stdout: string) => (err ? reject(err) : resolve(String(stdout ?? '')))
    );
  });

  const lines: string[] = [];
  for (const block of raw.split('---COMMIT---')) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    const [messagePart = '', filesPart = ''] = trimmed.split('---FILES---');
    const files = filesPart
      .split(/\r?\n/)
      .map((item: string) => item.trim().replace(/\\/g, '/'))
      .filter(Boolean)
      .slice(0, 5);
    const suffix = files.length ? ` (${files.join(', ')})` : '';
    const msgLines = messagePart
      .split(/\r?\n/)
      .map((item: string) => item.trim())
      .filter(Boolean);
    for (let i = 0; i < msgLines.length; i += 1) {
      const text = msgLines[i];
      lines.push(i === 0 && suffix ? `${text}${suffix}` : text);
    }
  }
  return lines.join('\n').trim();
}

async function persistLearningTrace(
  root: string,
  input: CaptureLearningInput,
  fallbackText: string,
  now: Date
): Promise<string> {
  const sanitized = sanitizeTraceText(input.text);
  const text = sanitized.text || fallbackText;
  const written = await writeTrace(root, {
    traceId: `tr_sl_${randomUUID().replace(/-/g, '')}`,
    sessionId: input.sessionId?.trim() || 'session-learning',
    host: input.host?.trim() || 'cli',
    eventTime: now.toISOString(),
    source: input.source,
    trustLevel: input.source === 'git' ? 'repository' : 'human',
    sensitivity: 'private',
    retention: '30d',
    text,
    redactedFindings: sanitized.redactedFindings,
    removedInjectionLines: sanitized.removedInjectionLines
  });
  return written.trace.traceId;
}

async function resolveSafeAuthor(cwd: string): Promise<{ name: string; email?: string }> {
  try {
    const resolved = await resolveAuthor(cwd);
    if (resolved.complete && resolved.name) {
      return { name: resolved.name, ...(resolved.email ? { email: resolved.email } : {}) };
    }
  } catch {
    // Fall back when git/engram author identity is not configured.
  }
  return { name: FALLBACK_AUTHOR_NAME };
}
