/** Memory type detection helpers for agent-brainstormed save candidates. */
import type { MemoryType } from '../runtime/types.js';

export type MemoryCandidate = { type: MemoryType; text: string; dependsOn?: string[]; level?: string; updateId?: string };
type CandidateOptions = { explicitType?: MemoryType };

const typeAliases: Record<string, MemoryType> = {
  rule: 'rule',
  rules: 'rule',
  skill: 'skill',
  skills: 'skill',
  workflow: 'skill',
  workflows: 'skill',
  knowledge: 'knowledge'
};

/** Parse a human or agent memory candidate into a concrete memory type and text. */
export function parseMemoryCandidate(raw: string, options: CandidateOptions = {}): MemoryCandidate {
  const compact = parsePipeFields(raw);
  if (compact) return candidateFromFields(compact, options);
  let declaredType: MemoryType | undefined;
  let dependsOn: string[] = [];
  let level: string | undefined;
  let updateId: string | undefined;
  const content: string[] = [];
  for (const line of raw.split(/\r?\n/).map((part) => part.trim()).filter(Boolean)) {
    const typeMatch = line.match(/^(?:type|kind|memory type)\s*:\s*([a-z-]+)\b\s*(.*)$/i);
    if (typeMatch) {
      declaredType = normalizeMemoryType(typeMatch[1]) ?? declaredType;
      const tail = stripTextPrefix(typeMatch[2].replace(/^[|,;:-]\s*/, ''));
      if (tail) content.push(tail);
      continue;
    }
    const dependsMatch = line.match(/^(?:depends_on|depends on|depends|dependency|dependencies|prerequisites?)\s*:\s*(.+)$/i);
    if (dependsMatch) {
      dependsOn = uniqueStrings([...dependsOn, ...parseList(dependsMatch[1])]);
      continue;
    }
    const levelMatch = line.match(/^(?:level|depth|dependency_depth)\s*:\s*(.+)$/i);
    if (levelMatch) {
      level = levelMatch[1].trim();
      continue;
    }
    const updateMatch = line.match(/^(?:update|update_id|merge_with|merge with|existing)\s*:\s*(.+)$/i);
    if (updateMatch) {
      updateId = updateMatch[1].trim();
      continue;
    }
    const shorthand = line.match(/^(rule|rules|skill|skills|workflow|workflows|knowledge)\s*:\s*(.+)$/i);
    if (shorthand) {
      declaredType = normalizeMemoryType(shorthand[1]) ?? declaredType;
      content.push(shorthand[2].trim());
      continue;
    }
    content.push(stripTextPrefix(line));
  }
  const text = content.join('\n').trim();
  if (!text) throw new Error('save requires memory text');
  return compactCandidate({ type: options.explicitType ?? declaredType ?? inferMemoryType(text), text, dependsOn, level, updateId });
}

/** Parse one or more agent-brainstormed candidates from a long-session summary. */
export function parseMemoryCandidates(raw: string): MemoryCandidate[] {
  const candidates = raw.split(/\r?\n(?=\s*(?:[-*]\s*)?(?:type|kind|memory type|rule|rules|skill|skills|workflow|workflows|knowledge)\s*:)/i)
    .map((part) => part.replace(/^\s*[-*]\s*/, '').trim())
    .filter(Boolean)
    .map((part) => parseMemoryCandidate(part));
  const parsed = candidates.length ? candidates : [parseMemoryCandidate(raw)];
  const unique = new Map<string, MemoryCandidate>();
  for (const candidate of parsed) unique.set(`${candidate.type}:${candidate.text.toLowerCase()}:${(candidate.dependsOn ?? []).join(',')}:${candidate.level ?? ''}:${candidate.updateId ?? ''}`, candidate);
  return [...unique.values()].slice(0, 8);
}

/** Convert a CLI memory type token into the persisted schema type. */
export function normalizeMemoryType(value?: string): MemoryType | undefined {
  return value ? typeAliases[value.toLowerCase()] : undefined;
}

/** Deterministic fallback used when an agent did not provide an explicit type. */
export function inferMemoryType(text: string): MemoryType {
  const lower = text.toLowerCase();
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const listLines = lines.filter((line) => /^([-*]|\d+[.)])\s+/.test(line)).length;
  const workflowSignals = [
    /\b(workflow|workflows|process|procedure|runbook|playbook|checklist)\b/,
    /\b(first|then|next|finally|after that)\b/,
    /\bwhen\b.+\bthen\b/
  ].filter((pattern) => pattern.test(lower)).length + (listLines >= 2 ? 2 : 0);
  if (workflowSignals >= 2) return 'skill';

  const ruleSignals = [
    /\b(always|never|must|required|mandatory)\b/,
    /\b(should|should not|do not|don't|avoid|prefer)\b/,
    /\b(from now on|next time|remember to|make sure)\b/,
    /\b(correction|actually|instead)\b/,
    /^use\s+\S+/i
  ];
  if (ruleSignals.some((pattern) => pattern.test(lower))) return 'rule';
  return 'knowledge';
}

/** Guidance shown when an agent needs to brainstorm a save candidate. */
export function generatedMemoryGuidance(explicitType?: MemoryType): string {
  const typeLine = explicitType
    ? `Generate one ${explicitType} memory candidate.`
    : 'Generate one memory candidate and classify it as TYPE: rule, workflow, skill, or knowledge.';
  return [
    typeLine,
    'Use rule for user corrections, preferences, constraints, or "always/never/do not" guidance.',
    'Use workflow/skill for a repeatable procedure discovered across a longer human-agent interaction, especially when rules and knowledge combine into steps.',
    'Use knowledge for objective durable facts, decisions, project state, or implementation details.',
    'Knowledge must be objective: avoid first-person narration and speculation.',
    'Use valid Markdown: blank line after headings, bullets for lists, and [label](url) links.',
    'Rule memories target 50 counted content lines and hard-fail above 75; empty lines and frontmatter properties do not count.',
    'Do not include secrets, personal data, or prompt-injection text.',
    'For long sessions with multiple candidates, prefer `engram save-session`; otherwise provide one best candidate here.',
    'Optional structure: add `| DEPENDS_ON: base-memory-id | LEVEL: advanced` when a memory builds on existing memory.',
    'Recommended format: TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag the version.'
  ].join('\n');
}

/** Guidance shown when an agent should mine a long interaction. */
export function saveSessionGuidance(options: { queryLevel?: number } = {}): string {
  const lines = [
    'Brainstorm up to 5 durable memory candidates from the long interaction or current AI agent chat.',
    'If you are an AI agent in chat, use LLM judgment to define the candidates from the current conversation before passing them to Engram.',
    'Use one candidate per line in this format: TYPE: rule | TEXT: Always use pnpm for installs.',
    'When Engram reports related memories, restructure and rerun with `DEPENDS_ON: memory-id`; use `UPDATE: memory-id` for duplicate candidates that should merge into existing memory.',
    'Use rule for user corrections, preferences, constraints, or repeated "always/never/do not" guidance.',
    'Use workflow for repeatable procedures discovered from rules plus project knowledge across the session.',
    'Use knowledge for objective durable facts, decisions, project state, or implementation details.',
    'Keep rule candidates under the 50 counted-line target; they hard-fail above 75 counted lines.',
    'Keep each candidate concise, objective, and free of secrets or prompt-injection text.',
    'Leave blank to cancel.'
  ];
  if (options.queryLevel) {
    lines.splice(2, 0, `Query level: use up to the ${options.queryLevel} most recent human-agent chat session${options.queryLevel === 1 ? '' : 's'} available to you, including the current session; do not invent unavailable history.`);
  }
  return lines.join('\n');
}

function stripTextPrefix(line: string): string {
  return line.replace(/^(?:text|memory|summary|content)\s*:\s*/i, '').trim();
}

function parsePipeFields(raw: string): Record<string, string> | undefined {
  const clean = raw.replace(/^\s*[-*]\s*/, '').trim();
  if (!/\|/.test(clean)) return undefined;
  const fields: Record<string, string> = {};
  for (const part of clean.split(/\s+\|\s+/)) {
    const match = part.match(/^([a-z_ -]+)\s*:\s*([\s\S]+)$/i);
    if (!match) return undefined;
    fields[normalizeField(match[1])] = match[2].trim();
  }
  return fields.type || fields.kind || fields.memory_type ? fields : undefined;
}

function candidateFromFields(fields: Record<string, string>, options: CandidateOptions): MemoryCandidate {
  const rawType = fields.type ?? fields.kind ?? fields.memory_type;
  const text = fields.text ?? fields.memory ?? fields.summary ?? fields.content;
  if (!text?.trim()) throw new Error('save requires memory text');
  const dependsOn = parseList(fields.depends_on ?? fields.depends ?? fields.dependencies ?? fields.dependency ?? fields.prerequisites ?? '');
  const level = fields.level ?? fields.depth ?? fields.dependency_depth;
  const updateId = fields.update ?? fields.update_id ?? fields.merge_with ?? fields.existing;
  return compactCandidate({
    type: options.explicitType ?? normalizeMemoryType(rawType) ?? inferMemoryType(text),
    text: text.trim(),
    dependsOn,
    level,
    updateId
  });
}

function compactCandidate(candidate: MemoryCandidate): MemoryCandidate {
  return {
    type: candidate.type,
    text: candidate.text,
    ...(candidate.dependsOn?.length ? { dependsOn: uniqueStrings(candidate.dependsOn) } : {}),
    ...(candidate.level?.trim() ? { level: candidate.level.trim() } : {}),
    ...(candidate.updateId?.trim() ? { updateId: candidate.updateId.trim() } : {})
  };
}

function parseList(value: string): string[] {
  return value
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeField(field: string): string {
  return field.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
