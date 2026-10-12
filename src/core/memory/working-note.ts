/** Working-tier task notes (`engram working note`, MCP `engram_note`): redacted, gitignored, expiring, written only after a yes/cancel approval. */
import type { ResolvedAuthor } from '../author/types.js';
import { parseSaveTarget, writeScopes } from '../runtime/config.js';
import type { MemoryType, Scope } from '../runtime/types.js';
import { today } from '../system/text.js';
import { sanitizeTraceText } from '../traces/sanitize.js';
import type { EngramContext } from './context.js';
import type { MemoryCandidate } from './memory-candidate.js';
import { planMemorySave, previewSavePlans, type SavePlan } from './save-plan.js';
import { OBJECTIVE_MAX_CHARS } from './schema.js';
import { writeApprovedMemory } from './storage.js';
import { classifyTaskType, type TaskType } from './task-classifier.js';
import { workingTierMeta } from './working-tier.js';

/** `source:` frontmatter value of every note; the index marks such working files so routing can treat them as notes. */
export const NOTE_SOURCE = 'note';
/** A note is a scratch line, not a document: longer text belongs in a proposed memory. */
export const NOTE_MAX_CHARS = 2000;
export type NoteScope = 'workspace' | 'global';

/** Carried on a pending candidate so `engram_commit` rebuilds the same working-tier note (never a durable memory). */
export type NoteMarker = { objective?: string };
export type NoteCandidate = MemoryCandidate & { taskType?: TaskType; note: NoteMarker };
export type PreparedNote = { text: string; type: MemoryType; objective?: string; redacted: number };
export type NoteWritten = { id: string; file: string; scope: Scope; valid_until: string; written: boolean };

/**
 * Validate and sanitize a note request. The text is redacted before anything is planned, previewed, or parked behind a
 * token; text carrying instruction-like lines is refused outright instead of being silently trimmed.
 */
export function prepareNote(request: { text?: unknown; objective?: unknown; type?: unknown }, label: string): PreparedNote {
  const raw = typeof request.text === 'string' ? request.text.trim() : '';
  if (!raw) throw new Error(`${label} requires non-empty text`);
  if (raw.length > NOTE_MAX_CHARS) throw new Error(`${label} text must be <= ${NOTE_MAX_CHARS} characters; save longer guidance as a proposed memory`);
  const clean = sanitizeTraceText(raw);
  if (clean.removedInjectionLines) throw new Error(`${label} refused: the text contains instruction-like lines; nothing was saved`);
  if (!clean.text) throw new Error(`${label} requires non-empty text`);
  const type = noteType(request.type, label);
  const objective = noteObjective(request.objective, label);
  return { text: clean.text, type, ...(objective ? { objective } : {}), redacted: clean.redactedFindings };
}

function noteType(value: unknown, label: string): MemoryType {
  if (value === undefined) return 'knowledge';
  const type = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (type === 'knowledge' || type === 'rule') return type;
  throw new Error(`${label} type must be knowledge or rule`);
}

function noteObjective(value: unknown, label: string): string | undefined {
  if (value === undefined) return undefined;
  const raw = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
  if (!raw) throw new Error(`${label} objective expects text, e.g. "add billing export"`);
  if (raw.length > OBJECTIVE_MAX_CHARS) throw new Error(`${label} objective must be <= ${OBJECTIVE_MAX_CHARS} characters`);
  const clean = sanitizeTraceText(raw);
  if (clean.removedInjectionLines || !clean.text) throw new Error(`${label} objective refused: it contains instruction-like text`);
  return clean.text;
}

/** `workspace` (default, `global` when the config's save target is global) or `global`; a note never targets both. */
export function noteScopes(ctx: EngramContext, rawScope: unknown, label: string): { target: NoteScope; scopes: Scope[] } {
  const target = rawScope === undefined ? (ctx.config.scope === 'global' ? 'global' : 'workspace') : parseSaveTarget(rawScope, label);
  if (target === 'both') throw new Error(`${label} must be workspace or global`);
  if (target === 'global' && !ctx.roots.global) {
    throw new Error(`${label} global requires global memory; set ENGRAM_GLOBAL_DIR or run engram inject --global-path <path>`);
  }
  const scopes = writeScopes(target, ctx.config).filter((scope) => Boolean(ctx.roots[scope]));
  if (!scopes.length) throw new Error(`${label} ${target} is not available for active profile ${ctx.profile.active || '<none>'}`);
  return { target, scopes };
}

/** The candidate stored behind an approval token: `objective: task` keeps it in the working tier wherever it is planned. */
export function noteCandidate(note: PreparedNote): NoteCandidate {
  return { type: note.type, text: note.text, objective: 'task', taskType: classifyTaskType(note.text).taskType, note: { ...(note.objective ? { objective: note.objective } : {}) } };
}

/** Plan one working-tier note. Matching and dedupe stay inside the working tier, so a durable memory is never updated. */
export async function planNote(ctx: EngramContext, candidate: Pick<NoteCandidate, 'text' | 'type' | 'taskType' | 'note'>, scopes: Scope[], author: ResolvedAuthor): Promise<SavePlan> {
  // Defense in depth: a token store edited on disk must not smuggle unredacted text past the gate.
  const prepared = prepareNote({ text: candidate.text, type: candidate.type, objective: candidate.note.objective }, 'note');
  const [plan] = await planMemorySave({
    ctx,
    text: prepared.text,
    type: prepared.type,
    scopes: scopes.slice(0, 1),
    authorName: author.name,
    authorEmail: author.email,
    source: { source: NOTE_SOURCE },
    taskType: candidate.taskType ?? classifyTaskType(prepared.text).taskType,
    working: workingTierMeta(ctx.config, today(), prepared.objective)
  });
  return { ...plan, objective: 'task' };
}

/** The approval text for one note: the planned working-tier file plus what the human is agreeing to. */
export function renderNotePreview(plan: SavePlan, redacted = 0): string {
  return [
    previewSavePlans([plan]),
    '',
    ...(redacted ? [`Redacted ${redacted} sensitive value${redacted === 1 ? '' : 's'} before this preview.`] : []),
    `A note is gitignored and expires${plan.workingUntil ? ` on ${plan.workingUntil}` : ''}; only engram promote makes it durable.`
  ].join('\n');
}

/** Write an approved note. A NOOP (the same note already exists in the working tier) writes nothing. */
export async function writeNote(cwd: string, plan: SavePlan): Promise<NoteWritten> {
  const info = { id: plan.id, file: plan.file, scope: plan.scope, valid_until: plan.workingUntil ?? '' };
  if (plan.verdict.kind === 'NOOP') return { ...info, written: false };
  await writeApprovedMemory({ cwd, scope: plan.scope, file: plan.file, content: plan.content, message: plan.message });
  return { ...info, written: true };
}

/** One summary line for CLI and MCP text output. */
export function describeNote(note: NoteWritten): string {
  return note.written
    ? `Saved working note -> ${note.scope}:${note.file} (expires ${note.valid_until}). Keep it with engram promote ${note.id}.`
    : `Already noted as ${note.scope}:${note.file}; nothing written.`;
}
