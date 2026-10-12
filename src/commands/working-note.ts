/** `engram working note`: propose one task note, ask yes/cancel, and write it to the gitignored working tier only on yes. */
import { requireResolvedAuthor } from '../core/author/resolve.js';
import { getContext } from '../core/memory/context.js';
import { describeNote, noteCandidate, noteScopes, planNote, prepareNote, renderNotePreview, writeNote } from '../core/memory/working-note.js';
import { requestNoteApproval } from '../core/safety/approval.js';

/** `engram working note "<text>" [--objective <text>] [--type knowledge|rule] [--scope workspace|global]`. */
export async function cmdWorkingNote(args: string[], flags: Record<string, any> = {}): Promise<string> {
  const note = prepareNote({ text: args.join(' '), type: flags.type, objective: flags.objective }, 'working note');
  const ctx = await getContext();
  const { scopes } = noteScopes(ctx, flags.scope, 'working note --scope');
  const author = await requireResolvedAuthor(process.cwd());
  const plan = await planNote(ctx, noteCandidate(note), scopes, author);
  // The same note already exists in the working tier: nothing to approve, nothing to write.
  if (plan.verdict.kind === 'NOOP') return describeNote(await writeNote(process.cwd(), plan));
  const approval = await requestNoteApproval(renderNotePreview(plan, note.redacted));
  if (!approval.accepted) return 'Cancelled. No note written.';
  return describeNote(await writeNote(process.cwd(), plan));
}
