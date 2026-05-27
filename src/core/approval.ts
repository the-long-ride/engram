/** Human-visible A/B/C approval UI for every write path. */
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

export type Approval = { accepted: boolean; edits?: string; redacted?: boolean };

/** Show the blueprint-style approval prompt and parse A/B/C. */
export async function requestApproval(preview: string): Promise<Approval> {
  output.write(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nENGRAM — MEMORY PROPOSED\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  output.write(`${preview}\n\nA — Accept and save as-is\nB — Accept with edits\nC — Reject and discard\n`);
  const rl = createInterface({ input, output });
  const answer = (await rl.question('Reply: A / B <your edit> / C: ')).trim();
  rl.close();
  if (/^a$/i.test(answer)) return { accepted: true };
  if (/^b\b/i.test(answer)) return { accepted: true, edits: answer.slice(1).trim() };
  return { accepted: false };
}

/** Apply simple human edit text as an extra content note. */
export function applyApprovalEdit(content: string, edit?: string): string {
  if (!edit) return content;
  return `${content.trimEnd()}\n\n## Human Edit\n${edit}\n`;
}
