/** Human-visible A/B/C approval UI for every write path. */
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

export type Approval = { accepted: boolean; edits?: string; redacted?: boolean };

/** Ask for generated knowledge, then approve the rendered memory preview. */
export async function requestGeneratedKnowledgeApproval(
  renderPreview: (text: string) => string
): Promise<{ text: string; approval: Approval } | undefined> {
  output.write(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nENGRAM — KNOWLEDGE TEXT NEEDED\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  output.write('No knowledge text was provided. If you are an AI agent, summarize durable knowledge from the work you just completed.\n');
  output.write('Write one concise memory candidate, or leave blank to cancel.\n');
  if (!input.isTTY) return requestGeneratedKnowledgePipe(renderPreview);
  const rl = createInterface({ input, output });
  const text = (await rl.question('Knowledge: ')).trim();
  if (!text) {
    rl.close();
    return undefined;
  }
  writeApprovalPreview(renderPreview(text));
  const approval = await readApproval(rl);
  rl.close();
  return { text, approval };
}

async function requestGeneratedKnowledgePipe(
  renderPreview: (text: string) => string
): Promise<{ text: string; approval: Approval } | undefined> {
  output.write('Knowledge: ');
  const lines = (await readPipe()).split(/\r?\n/);
  const text = (lines.shift() ?? '').trim();
  if (!text) return undefined;
  writeApprovalPreview(renderPreview(text));
  return { text, approval: parseApproval(lines.find((line) => line.trim()) ?? '') };
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
  output.write(`${preview}\n\nA — Accept and save as-is\nB — Accept with edits\nC — Reject and discard\n`);
}

async function readApproval(rl: { question(query: string): Promise<string> }): Promise<Approval> {
  const answer = (await rl.question('Reply: A / B <your edit> / C: ')).trim();
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

/** Apply simple human edit text as an extra content note. */
export function applyApprovalEdit(content: string, edit?: string): string {
  if (!edit) return content;
  return `${content.trimEnd()}\n\n## Human Edit\n${edit}\n`;
}
