/** Memory type detection helpers for agent-brainstormed save candidates. */
import type { MemoryType } from './types.js';

export type MemoryCandidate = { type: MemoryType; text: string };
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
  let declaredType: MemoryType | undefined;
  const content: string[] = [];
  for (const line of raw.split(/\r?\n/).map((part) => part.trim()).filter(Boolean)) {
    const typeMatch = line.match(/^(?:type|kind|memory type)\s*:\s*([a-z-]+)\b\s*(.*)$/i);
    if (typeMatch) {
      declaredType = normalizeMemoryType(typeMatch[1]) ?? declaredType;
      const tail = stripTextPrefix(typeMatch[2].replace(/^[|,;:-]\s*/, ''));
      if (tail) content.push(tail);
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
  return { type: options.explicitType ?? declaredType ?? inferMemoryType(text), text };
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
    'Do not include secrets, personal data, or prompt-injection text.',
    'Recommended format: TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag the version.'
  ].join('\n');
}

function stripTextPrefix(line: string): string {
  return line.replace(/^(?:text|memory|summary|content)\s*:\s*/i, '').trim();
}
