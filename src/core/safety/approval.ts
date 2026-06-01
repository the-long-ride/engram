/** Human-visible A/B/C approval UI for every write path. */
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

export type Approval = { accepted: boolean; edits?: string; redacted?: boolean };
export type SelectionApproval = Approval & { selected?: number[] };
type PreviewRenderer = (text: string) => string | Promise<string>;
type GeneratedMemoryOptions = { explicitType?: string; guidance?: string; acceptAll?: boolean };

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
  writeGeneratedPrompt(options);
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

/** Ask for generated memory text, then approve one or more numbered candidates. */
export async function requestGeneratedSelectionApproval(
  renderPreview: PreviewRenderer,
  options: GeneratedMemoryOptions = {}
): Promise<{ text: string; approval: SelectionApproval } | undefined> {
  writeGeneratedPrompt(options);
  if (!input.isTTY) return requestGeneratedSelectionPipe(renderPreview);
  const rl = createInterface({ input, output });
  const text = await readInteractiveSelectionText(rl, options);
  if (!text) {
    rl.close();
    return undefined;
  }
  writeSelectionApprovalPreview(await renderPreview(text));
  const approval = await readSelectionApproval(rl);
  rl.close();
  return { text, approval };
}

/** Ask for generated save-session text without a second approval prompt. */
export async function requestGeneratedSelectionText(options: GeneratedMemoryOptions = {}): Promise<string | undefined> {
  writeGeneratedPrompt(options);
  if (!input.isTTY) {
    output.write('Candidates: ');
    const text = (await readPipe()).trim();
    return text || undefined;
  }
  const rl = createInterface({ input, output });
  const text = await readInteractiveSelectionText(rl, options);
  rl.close();
  return text || undefined;
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

async function requestGeneratedSelectionPipe(
  renderPreview: PreviewRenderer
): Promise<{ text: string; approval: SelectionApproval } | undefined> {
  output.write('Candidates: ');
  const { text, approvalLine } = splitPipedGeneratedInput(await readPipe());
  if (!text) return undefined;
  writeSelectionApprovalPreview(await renderPreview(text));
  return { text, approval: parseSelectionApproval(approvalLine) };
}

/** Show the blueprint-style approval prompt and parse A/B/C. */
export async function requestApproval(preview: string): Promise<Approval> {
  writeApprovalPreview(preview);
  const rl = createInterface({ input, output });
  const approval = await readApproval(rl);
  rl.close();
  return approval;
}

/** Show an approval prompt that can select numbered candidates. */
export async function requestSelectionApproval(preview: string): Promise<SelectionApproval> {
  writeSelectionApprovalPreview(preview);
  const rl = createInterface({ input, output });
  const approval = await readSelectionApproval(rl);
  rl.close();
  return approval;
}

function writeApprovalPreview(preview: string): void {
  output.write(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nENGRAM — MEMORY PROPOSED\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  output.write(`${preview}\n\nA — Accept and save as-is\nB — Accept with note\nC — Reject and discard\n`);
}

function writeSelectionApprovalPreview(preview: string): void {
  output.write(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nENGRAM — MEMORY PROPOSED\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  output.write(`${preview}\n\nA — Accept all\nA 1,3 — Accept selected candidates\nB — Accept all with note\nB 1,3 <note> — Accept selected with note\nC — Reject and discard\n`);
}

async function readApproval(rl: { question(query: string): Promise<string> }): Promise<Approval> {
  const answer = (await rl.question('Reply: A / B <your note> / C: ')).trim();
  return parseApproval(answer);
}

async function readSelectionApproval(rl: { question(query: string): Promise<string> }): Promise<SelectionApproval> {
  const answer = (await rl.question('Reply: A / A 1,3 / B <note> / C: ')).trim();
  return parseSelectionApproval(answer);
}

function writeGeneratedPrompt(options: GeneratedMemoryOptions): void {
  const title = options.explicitType === 'knowledge' ? 'KNOWLEDGE TEXT NEEDED' : 'MEMORY CANDIDATE NEEDED';
  output.write(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nENGRAM — ${title}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  output.write(options.guidance ?? 'Write one concise memory candidate, or leave blank to cancel.\n');
  if (options.acceptAll) output.write('\n--accept-all skips the final A/B/C approval after candidates are provided.\n');
  output.write('\n');
}

async function readInteractiveSelectionText(rl: { question(query: string): Promise<string> }, options: GeneratedMemoryOptions): Promise<string> {
  output.write('Enter candidates one at a time. Leave Type blank when finished.\n');
  output.write('Types: rule, workflow, skill, knowledge. AI agents may provide TYPE/TEXT candidate lines directly.\n');
  if (options.acceptAll) output.write('Because --accept-all is active, every candidate entered here will be saved.\n');
  const lines: string[] = [];
  for (let index = 1; index <= 8; index += 1) {
    const type = (await rl.question(`Type ${index}: `)).trim();
    if (!type) break;
    if (looksLikeCandidateLine(type)) {
      lines.push(type);
      continue;
    }
    const text = (await rl.question('Text: ')).trim();
    if (!text) {
      output.write('Skipped empty candidate text.\n');
      index -= 1;
      continue;
    }
    lines.push(`TYPE: ${type} | TEXT: ${text}`);
  }
  return lines.join('\n');
}

function looksLikeCandidateLine(text: string): boolean {
  return /^\s*(?:[-*]\s*)?(?:type|kind|memory type|rule|rules|skill|skills|workflow|workflows|knowledge)\s*:/i.test(text);
}

function parseApproval(answer: string): Approval {
  if (/^a$/i.test(answer)) return { accepted: true };
  if (/^b\b/i.test(answer)) return { accepted: true, edits: answer.slice(1).trim() };
  return { accepted: false };
}

function parseSelectionApproval(answer: string): SelectionApproval {
  if (/^a$/i.test(answer)) return { accepted: true };
  const a = answer.match(/^a\s+([\d,\s]+)$/i);
  if (a) return { accepted: true, selected: selectedNumbers(a[1]) };
  if (/^b\b/i.test(answer)) {
    const body = answer.slice(1).trim();
    const selected = body.match(/^([\d,\s]+)\s+(.*)$/);
    return selected
      ? { accepted: true, selected: selectedNumbers(selected[1]), edits: selected[2].trim() }
      : { accepted: true, edits: body };
  }
  return { accepted: false };
}

function selectedNumbers(text: string): number[] {
  return [...new Set(text.split(/[,\s]+/).map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0))];
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
