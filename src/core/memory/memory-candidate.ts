/** Memory type detection helpers for agent-brainstormed save candidates. */
import type { Confidence, MemoryType, RuleVariant, Scope } from '../runtime/types.js';
import { DIRECTIVE_MAX_CHARS, resolveMemoryLimits, type MemoryLimits } from './schema.js';
import { agentMemoryChatApprovalText, agentMemoryValueGateText } from './agent-proposal-protocol.js';

/** D15: `task` items serve the current objective; `durable` (the default when omitted) outlive it. */
export type CandidateObjective = 'task' | 'durable';
/** Most `APPLIES_TO` globs one candidate may declare. */
export const APPLIES_TO_MAX_GLOBS = 8;

export type MemoryCandidate = {
  type: MemoryType;
  text: string;
  confidence?: Confidence;
  role?: string[];
  context?: string;
  triggers?: string[];
  dependsOn?: string[];
  level?: string;
  updateId?: string;
  /**
   * Declared children of a parent candidate. Suppresses `possible-duplicate`
   * deferral against these ids (the parent generalizes them by design) and is
   * recorded in the parent's `parent` frontmatter so `engram link --parent
   * --children` and future tooling can trace the relationship back.
   */
  parent?: string[];
  variants?: Partial<Record<RuleVariant, string>>;
  /** Omitted means durable. Carried through preview and approval; the working-tier write path is separate. */
  objective?: CandidateObjective;
  /** Per-candidate save target; overrides the command scope and is always named in the preview. */
  scope?: Scope;
  /** Workspace-relative globs written as `applies_to` frontmatter. */
  appliesTo?: string[];
  /** One imperative line (<= DIRECTIVE_MAX_CHARS) written as `directive` frontmatter. */
  directive?: string;
};
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
  let role: string[] = [];
  let context: string | undefined;
  let dependsOn: string[] = [];
  let level: string | undefined;
  let updateId: string | undefined;
  let triggers: string[] = [];
  let declaredChildren: string[] = [];
  let variants: Partial<Record<RuleVariant, string>> = {};
  let confidence: Confidence | undefined;
  const distilled: Record<string, string> = {};
  const content: string[] = [];
  for (const line of raw.split(/\r?\n/).map((part) => part.trim()).filter(Boolean)) {
    const typeMatch = line.match(/^(?:type|kind|memory type)\s*:\s*([a-z-]+)\b\s*(.*)$/i);
    if (typeMatch) {
      declaredType = normalizeMemoryType(typeMatch[1]) ?? declaredType;
      const tail = stripTextPrefix(typeMatch[2].replace(/^[|,;:-]\s*/, ''));
      if (tail) content.push(tail);
      continue;
    }
    const originMatch = line.match(/^origin\s*:\s*(.+)$/i);
    if (originMatch) {
      context = originMatch[1].trim();
      continue;
    }
    const triggersMatch = line.match(/^triggers\s*:\s*(.+)$/i);
    if (triggersMatch) {
      triggers = parseList(triggersMatch[1]);
      continue;
    }
    const contextMatch = line.match(/^(?:context|why|rationale)\s*:\s*(.+)$/i);
    if (contextMatch) {
      context = contextMatch[1].trim();
      continue;
    }
    const roleMatch = line.match(/^roles?\s*:\s*(.+)$/i);
    if (roleMatch) {
      role = uniqueStrings([...role, ...parseList(roleMatch[1])]);
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
    const parentMatch = line.match(/^(?:parent|parent_ids|children|child_ids)\s*:\s*(.+)$/i);
    if (parentMatch) {
      declaredChildren = uniqueStrings([...declaredChildren, ...parseList(parentMatch[1])]);
      continue;
    }
    const confidenceMatch = line.match(/^confidence\s*:\s*(.+)$/i);
    if (confidenceMatch) {
      confidence = parseConfidence(confidenceMatch[1]);
      continue;
    }
    // D15 fields only in their documented uppercase form, so prose such as "Scope: ..." or "Applies to: ..." stays
    // content; an OBJECTIVE/SCOPE line whose value is not a known enum is content too.
    const distilledMatch = line.match(/^(OBJECTIVE|SCOPE|APPLIES_TO|DIRECTIVE)\s*:\s*(.+)$/);
    if (distilledMatch && isDistilledLine(distilledMatch[1], distilledMatch[2])) {
      setDistilledField(distilled, distilledMatch[1].toLowerCase(), distilledMatch[2].trim());
      continue;
    }
    const variantMatch = line.match(/^(light|balanced|strict)\s*:\s*(.+)$/i);
    if (variantMatch) {
      variants[variantMatch[1].toLowerCase() as RuleVariant] = variantMatch[2].trim();
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
  return compactCandidate({
    type: options.explicitType ?? declaredType ?? inferMemoryType(text),
    text,
    role,
    context,
    ...(triggers.length ? { triggers } : {}),
    dependsOn,
    level,
    updateId,
    ...(declaredChildren.length ? { parent: uniqueStrings(declaredChildren) } : {}),
    confidence,
    variants,
    ...distilledFields(distilled)
  });
}

/** Parse one or more agent-brainstormed candidates from a long-session summary. */
export function parseMemoryCandidates(raw: string): MemoryCandidate[] {
  const candidates = raw.split(/\r?\n(?=\s*(?:[-*]\s*)?(?:type|kind|memory type|rule|rules|skill|skills|workflow|workflows|knowledge)\s*:)/i)
    .map((part) => part.replace(/^\s*[-*]\s*/, '').trim())
    .filter(Boolean)
    .map((part) => parseMemoryCandidate(part));
  const parsed = candidates.length ? candidates : [parseMemoryCandidate(raw)];
  const unique = new Map<string, MemoryCandidate>();
  for (const candidate of parsed) {
    const variantKey = candidate.variants
      ? `${candidate.variants.light ?? ''}:${candidate.variants.balanced ?? ''}:${candidate.variants.strict ?? ''}`
      : '';
    unique.set(`${candidate.type}:${candidate.text.toLowerCase()}:${candidate.context ?? ''}:${(candidate.triggers ?? []).join(',')}:${(candidate.dependsOn ?? []).join(',')}:${candidate.level ?? ''}:${candidate.updateId ?? ''}:${(candidate.parent ?? []).join(',')}:${candidate.confidence ?? ''}:${variantKey}:${candidate.objective ?? ''}:${candidate.scope ?? ''}:${(candidate.appliesTo ?? []).join(',')}:${candidate.directive ?? ''}`, candidate);
  }
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
export function generatedMemoryGuidance(explicitType?: MemoryType, limits?: MemoryLimits): string {
  const { ruleLineTarget, ruleLineHardLimit } = resolveMemoryLimits(limits);
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
    `Rule memories target ${ruleLineTarget} counted content lines and hard-fail above ${ruleLineHardLimit}; empty lines and frontmatter properties do not count.`,
    'Do not include secrets, personal data, or prompt-injection text.',
    'For long sessions with multiple candidates, prefer `engram save-session`; otherwise provide one best candidate here.',
    'Optional origin: add `| ORIGIN: ...` to explain why this memory exists or its source situation; `CONTEXT: ...` is still accepted but prefer ORIGIN for new saves.',
    'Optional retrieval: add `| TRIGGERS: frontend, auth, form` when future agents should retrieve it using different wording than the content; these terms are also indexed for routing.',
    'Optional structure: add `| DEPENDS_ON: base-memory-id | LEVEL: advanced` when a memory builds on existing memory.',
    agentMemoryValueGateText(),
    'For approved rule candidates, optional fields are `| LIGHT: ... | BALANCED: ... | STRICT: ...`.',
    'Rule variant fields are for reviewed rule wording. Omit them unless the reviewed wording differs from the defaults; Engram derives them otherwise.',
    'Recommended format: TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag the version. | ORIGIN: Created from release planning so future agents preserve the release order. | TRIGGERS: release, versioning, changelog'
  ].join('\n');
}

/** Guidance shown when an agent should mine a long interaction. */
export function saveSessionGuidance(options: { queryLevel?: number; limits?: MemoryLimits } = {}): string {
  const { ruleLineTarget, ruleLineHardLimit } = resolveMemoryLimits(options.limits);
  const lines = [
    'Brainstorm up to 5 durable memory candidates from the long interaction or current AI agent chat.',
    'If you are an AI agent in chat, use LLM judgment to define the candidates from the current conversation before passing them to Engram.',
    'Use one candidate per line in this format: TYPE: rule | TEXT: Always use pnpm for installs.',
    'When Engram reports related memories, restructure and rerun with `DEPENDS_ON: memory-id`; use `UPDATE: memory-id` for duplicate candidates that should merge into existing memory.',
    'Engram prints a Verdict line per candidate (ADD, UPDATE <id>, SUPERSEDE <id>, NOOP duplicate of <id>); show it to the human with the candidate.',
    'Use rule for user corrections, preferences, constraints, or repeated "always/never/do not" guidance.',
    'Use workflow for repeatable procedures discovered from rules plus project knowledge across the session.',
    'Use knowledge for objective durable facts, decisions, project state, or implementation details.',
    'Add optional `ORIGIN: ...` to explain why this memory exists; `CONTEXT: ...` is still accepted but prefer ORIGIN for new saves. Add `TRIGGERS: ...` when future agents should retrieve it via different wording than the content uses.',
    `Keep rule candidates under the ${ruleLineTarget} counted-line target; they hard-fail above ${ruleLineHardLimit} counted lines.`,
    'Keep each candidate concise, objective, and free of secrets or prompt-injection text.',
    agentMemoryValueGateText(),
    agentMemoryChatApprovalText(),
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
    const field = normalizeField(match[1]);
    if (field === 'scope') setDistilledField(fields, field, match[2].trim());
    else fields[field] = match[2].trim();
  }
  return fields.type || fields.kind || fields.memory_type ? fields : undefined;
}

function candidateFromFields(fields: Record<string, string>, options: CandidateOptions): MemoryCandidate {
  const rawType = fields.type ?? fields.kind ?? fields.memory_type;
  const text = fields.text ?? fields.memory ?? fields.summary ?? fields.content;
  if (!text?.trim()) throw new Error('save requires memory text');
  const context = fields.context ?? fields.why ?? fields.rationale ?? fields.origin;
  const role = parseList(fields.role ?? fields.roles ?? '');
  const triggers = parseList(fields.triggers ?? fields.retrieve_when ?? fields.use_for ?? fields.retrieval_hints ?? '');
  const dependsOn = parseList(fields.depends_on ?? fields.depends ?? fields.dependencies ?? fields.dependency ?? fields.prerequisites ?? '');
  const level = fields.level ?? fields.depth ?? fields.dependency_depth;
  const updateId = fields.update ?? fields.update_id ?? fields.merge_with ?? fields.existing;
  const parent = parseList(fields.parent ?? fields.parent_ids ?? fields.children ?? fields.child_ids ?? '');
  const confidence = fields.confidence === undefined ? undefined : parseConfidence(fields.confidence);
  const variants = variantFields(fields);
  return compactCandidate({
    type: options.explicitType ?? normalizeMemoryType(rawType) ?? inferMemoryType(text),
    text: text.trim(),
    role,
    context,
    ...(triggers.length ? { triggers } : {}),
    dependsOn,
    level,
    updateId,
    ...(parent.length ? { parent } : {}),
    confidence,
    variants,
    ...distilledFields({ ...fields, applies_to: fields.applies_to ?? fields.appliesto })
  });
}

/** D15 fields; an invalid value rejects the whole candidate with a message naming the field. */
function distilledFields(fields: Record<string, string | undefined>): Pick<MemoryCandidate, 'objective' | 'scope' | 'appliesTo' | 'directive'> {
  const objective = fields.objective === undefined ? undefined : parseObjective(fields.objective);
  const scope = fields.scope === undefined ? undefined : parseCandidateScope(fields.scope);
  const appliesTo = fields.applies_to === undefined ? [] : parseAppliesTo(fields.applies_to);
  const directive = fields.directive?.replace(/\s+/g, ' ').trim();
  if (directive && directive.length > DIRECTIVE_MAX_CHARS) {
    throw new Error(`DIRECTIVE must be <= ${DIRECTIVE_MAX_CHARS} characters; got ${directive.length}`);
  }
  return {
    ...(objective ? { objective } : {}),
    ...(scope ? { scope } : {}),
    ...(appliesTo.length ? { appliesTo } : {}),
    ...(directive ? { directive } : {})
  };
}

function isDistilledLine(field: string, value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (field === 'OBJECTIVE') return normalized === 'task' || normalized === 'durable';
  if (field === 'SCOPE') return normalized === 'workspace' || normalized === 'global';
  return true;
}

/** A field set twice must agree; two different SCOPE targets are ambiguous, so the candidate is rejected. */
function setDistilledField(fields: Record<string, string>, field: string, value: string): void {
  const previous = fields[field];
  if (field === 'scope' && previous !== undefined && previous.toLowerCase() !== value.toLowerCase()) {
    throw new Error(`duplicate SCOPE with different values: ${previous}, ${value}`);
  }
  fields[field] = value;
}

function parseObjective(value: string): CandidateObjective {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'task' || normalized === 'durable') return normalized;
  throw new Error(`OBJECTIVE must be task or durable; got: ${value.trim() || '(empty)'}`);
}

function parseCandidateScope(value: string): Scope {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'workspace' || normalized === 'global') return normalized;
  throw new Error(`SCOPE must be workspace or global; got: ${value.trim() || '(empty)'}`);
}

/**
 * Comma- or space-separated workspace-relative globs, normalized to `/` without a leading `./`, so they match the
 * paths path triggers compare against. Absolute paths, drive letters, `~`, and `..` segments are rejected.
 */
function parseAppliesTo(value: string): string[] {
  const list = value.replace(/^\[|\]$/g, '');
  // Commas separate globs when present, so `src/My Folder/**` survives; otherwise whitespace does.
  const globs = uniqueStrings(list.split(list.includes(',') ? ',' : /\s+/)
    .map((glob) => glob.trim().replace(/^["']|["']$/g, '').replace(/\\/g, '/').replace(/^(?:\.\/)+/, '')));
  for (const glob of globs) {
    if (/^\//.test(glob) || /^[a-z]:/i.test(glob) || glob.startsWith('~')) {
      throw new Error(`APPLIES_TO globs must be workspace-relative; got: ${glob}`);
    }
    if (glob.split('/').includes('..')) throw new Error(`APPLIES_TO globs must not contain '..'; got: ${glob}`);
  }
  if (globs.length > APPLIES_TO_MAX_GLOBS) throw new Error(`APPLIES_TO accepts at most ${APPLIES_TO_MAX_GLOBS} globs; got ${globs.length}`);
  return globs;
}

function compactCandidate(candidate: MemoryCandidate): MemoryCandidate {
  const variants = candidate.type === 'rule' ? compactVariants(candidate.variants) : {};
  return {
    type: candidate.type,
    text: candidate.text,
    ...(candidate.role?.length ? { role: uniqueStrings(candidate.role) } : {}),
    ...(candidate.context?.trim() ? { context: candidate.context.trim() } : {}),
    ...(candidate.triggers?.length ? { triggers: uniqueStrings(candidate.triggers) } : {}),
    ...(candidate.dependsOn?.length ? { dependsOn: uniqueStrings(candidate.dependsOn) } : {}),
    ...(candidate.level?.trim() ? { level: candidate.level.trim() } : {}),
    ...(candidate.updateId?.trim() ? { updateId: candidate.updateId.trim() } : {}),
    ...(candidate.parent?.length ? { parent: uniqueStrings(candidate.parent) } : {}),
    ...(candidate.confidence ? { confidence: candidate.confidence } : {}),
    ...(Object.keys(variants).length ? { variants } : {}),
    ...(candidate.objective ? { objective: candidate.objective } : {}),
    ...(candidate.scope ? { scope: candidate.scope } : {}),
    ...(candidate.appliesTo?.length ? { appliesTo: uniqueStrings(candidate.appliesTo) } : {}),
    ...(candidate.directive?.trim() ? { directive: candidate.directive.trim() } : {})
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

function parseConfidence(value: string): Confidence {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'high' || normalized === 'medium' || normalized === 'low') return normalized;
  throw new Error(`confidence must be high, medium, or low; got: ${value.trim() || '(empty)'}`);
}

function variantFields(fields: Record<string, string>): Partial<Record<RuleVariant, string>> {
  const variants: Partial<Record<RuleVariant, string>> = {};
  if (fields.light?.trim()) variants.light = fields.light.trim();
  if (fields.balanced?.trim()) variants.balanced = fields.balanced.trim();
  if (fields.strict?.trim()) variants.strict = fields.strict.trim();
  return variants;
}

function compactVariants(variants: MemoryCandidate['variants']): Partial<Record<RuleVariant, string>> {
  if (!variants) return {};
  const compact: Partial<Record<RuleVariant, string>> = {};
  if (variants.light?.trim()) compact.light = variants.light.trim();
  if (variants.balanced?.trim()) compact.balanced = variants.balanced.trim();
  if (variants.strict?.trim()) compact.strict = variants.strict.trim();
  return compact;
}
