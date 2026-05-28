/** Human-visible A/B/C approval UI for every write path. */
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

export type Approval = { accepted: boolean; edits?: string; redacted?: boolean };
type PreviewRenderer = (text: string) => string | Promise<string>;
type GeneratedMemoryOptions = { explicitType?: string; guidance?: string };

/** Ask for generated knowledge, then approve the rendered memory preview. */
export async function requestGeneratedKnowledgeApproval(
  renderPreview: PreviewRenderer
): Promise<{ text: string; approval: Approval } | undefined> {
  return requestGeneratedMemoryApproval(renderPreview, { explicitType: 'knowledge' });
}

/** Ask an agent or human to brainstorm missing memory text, then approve it. */
export async function requestGeneratedMemoryApproval(
  renderPreview: PreviewRenderer,
  options: GeneratedMemoryOptions = {}
): Promise<{ text: string; approval: Approval } | undefined> {
  const title = options.explicitType === 'knowledge' ? 'KNOWLEDGE TEXT NEEDED' : 'MEMORY CANDIDATE NEEDED';
  output.write(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nENGRAM — ${title}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  output.write(options.guidance ?? 'Write one concise memory candidate, or leave blank to cancel.\n');
  output.write('\n');
  if (!input.isTTY) return requestGeneratedKnowledgePipe(renderPreview);
  const rl = createInterface({ input, output });
  const text = (await rl.question('Memory: ')).trim();
  if (!text) {
    rl.close();
    return undefined;
  }
  writeApprovalPreview(await renderPreview(text));
  const approval = await readApproval(rl);
  rl.close();
  return { text, approval };
}

async function requestGeneratedKnowledgePipe(
  renderPreview: PreviewRenderer
): Promise<{ text: string; approval: Approval } | undefined> {
  output.write('Memory: ');
  const { text, approvalLine } = splitPipedGeneratedInput(await readPipe());
  if (!text) return undefined;
  writeApprovalPreview(await renderPreview(text));
  return { text, approval: parseApproval(approvalLine) };
}

/** Show the blueprint-style approval prompt and parse A/B/C. */
export async function requestApproval(preview: string): Promise<Approval> {
  writeApprovalPreview(preview);
  const rl = createInterface({ input, output });
  const approval = await readApproval(rl);
  rl.close();
  return approval;
}

function writeApprovalPreview(preview: string): void {
  output.write(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nENGRAM — MEMORY PROPOSED\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  output.write(`${preview}\n\nA — Accept and save as-is\nB — Accept with note\nC — Reject and discard\n`);
}

async function readApproval(rl: { question(query: string): Promise<string> }): Promise<Approval> {
  const answer = (await rl.question('Reply: A / B <your note> / C: ')).trim();
  return parseApproval(answer);
}

function parseApproval(answer: string): Approval {
  if (/^a$/i.test(answer)) return { accepted: true };
  if (/^b\b/i.test(answer)) return { accepted: true, edits: answer.slice(1).trim() };
  return { accepted: false };
}

async function readPipe(): Promise<string> {
  const chunks = [];
  for await (const chunk of input) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

function splitPipedGeneratedInput(raw: string): { text: string; approvalLine: string } {
  const lines = raw.split(/\r?\n/);
  let approvalIndex = -1;
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (!lines[i].trim()) continue;
    approvalIndex = i;
    break;
  }
  const approvalLine = approvalIndex >= 0 ? lines[approvalIndex].trim() : '';
  const textLines = approvalIndex >= 0 ? lines.slice(0, approvalIndex) : lines;
  return { text: textLines.join('\n').trim(), approvalLine };
}

/** Apply simple human note text as an extra content note. */
export function applyApprovalEdit(content: string, edit?: string): string {
  if (!edit) return content;
  return `${content.trimEnd()}\n\n## Human Note\n\n${edit}\n`;
}
