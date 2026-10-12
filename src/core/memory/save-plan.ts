/** Automatic save upsert planning for approved memory writes. */
import type { EngramContext } from './context.js';
import { entryPath } from './context.js';
import { exists, readText } from '../system/fsx.js';
import { draftMemory, updateMemory, type MemorySourceMeta, type WorkingTierMeta } from './memory-template.js';
import { WORKING_DIR, isWorkingPath } from '../runtime/constants.js';
import type { Confidence, MemoryEntry, MemoryType, Scope } from '../runtime/types.js';
import { lexicalScore, slugify, today, words } from '../system/text.js';
import { sha256 } from '../safety/hash.js';
import { routeDetailed, validityFactor } from './routing.js';
import { DEFAULT_LOAD_LIMIT, normalizeLoadLimit } from '../runtime/load-limit.js';
import type { TaskType } from './task-classifier.js';
import { inferTaskIntent, taskIntentQuery, intentIsActionable } from './task-intent.js';
import { canonicalRuleMemory, extractContentSection, extractRuleVariants, ruleVariantsFor } from './rule-variants.js';
import { parseMemory } from './schema.js';
import { frontmatterStringList } from './frontmatter.js';
import { includeAuthorEmail } from '../runtime/config.js';

const RELATED_HINT_LIMIT = 3;
/** E16a: a related score that displays as 1.00 is a duplicate (was write.ts scoreDisplaysAsExactDuplicate). */
export const NOOP_MIN_SCORE = 0.995;
/** E16a: a same-type related memory at or above this score with a different directive is superseded, not added beside. */
export const SUPERSEDE_MIN_SCORE = 0.6;
export type SaveVerdictKind = 'ADD' | 'UPDATE' | 'SUPERSEDE' | 'NOOP';
export type SaveVerdict = { kind: SaveVerdictKind; target?: string };
/** A verdict pinned to a proposal (MCP approval token): engram_commit applies SUPERSEDE only while it still matches. */
export type PinnedVerdict = { candidate: number; scope: Scope; kind: SaveVerdictKind; target?: string };

export type SaveRelatedHint = {
  id: string;
  type: MemoryType;
  scope: Scope;
  file: string;
  summary: string;
  score: number;
  action: 'suggested-dependency' | 'possible-duplicate';
  declaredChild?: boolean;
  /** Verdict inputs copied from the related entry; never rendered (receipts and review output stay id-only). */
  directive?: string;
  appliesTo?: string[];
  tags?: string[];
  working?: boolean;
};

export type SavePlan = {
  action: 'add' | 'update';
  scope: Scope;
  file: string;
  id: string;
  content: string;
  message: string;
  matchScore?: number;
  /** E16: deterministic ADD / UPDATE / SUPERSEDE / NOOP verdict, previewed on its own `Verdict:` line. */
  verdict: SaveVerdict;
  /** Set once at approval time: the human saw this plan's SUPERSEDE verdict (or its pinned verdict still matches) and accepted it. */
  supersedeApproved?: boolean;
  candidateIndex?: number;
  related?: SaveRelatedHint[];
  previousContent?: string;
  /** Shown beside `Scope:` when a candidate's own SCOPE overrode the command scope. */
  scopeNote?: string;
  /** D15 candidate objective; only `task` is shown, durable is the default. */
  objective?: 'task' | 'durable';
  /** D16: expiry of a working-tier plan; previewed as `Tier: working (expires <date>)`. */
  workingUntil?: string;
};

export type SavePreviewOptions = {
  showRuleVariants?: boolean;
};

/** Choose whether each scope should add a new memory or update an existing one. */
export async function planMemorySave(input: {
  ctx: EngramContext; text: string; type: MemoryType; scopes: Scope[]; authorName: string; authorEmail?: string; role?: string[]; context?: string; triggers?: string[]; dependsOn?: string[]; level?: string; updateId?: string; parent?: string[]; source?: MemorySourceMeta; taskType?: TaskType; variants?: Partial<Record<'light' | 'balanced' | 'strict', string>>; confidence?: Confidence;
  directive?: string; appliesTo?: string[];
  /** D16: an `OBJECTIVE: task` candidate; it matches and writes only working-tier memories. */
  working?: WorkingTierMeta;
}): Promise<SavePlan[]> {
  const plans: SavePlan[] = [];
  const options = { ruleVariants: true };
  const working = Boolean(input.working);
  // Single gate: callers pass the author profile email, but it reaches memory frontmatter only on opt-in.
  const authorEmail = includeAuthorEmail(input.ctx.config) ? input.authorEmail : undefined;
  for (const scope of input.scopes) {
    const explicitUpdate = Boolean(input.updateId?.trim());
    let match = explicitUpdate
      ? await explicitMatch(input.ctx, input.updateId, input.type, scope, working)
      : await bestMatch(input.ctx, input.text, input.type, scope, working);
    if (explicitUpdate && !match) throw new Error(`UPDATE target not found for ${input.type} in ${scope}: ${input.updateId}`);
    const parentIds = normalizeParentRefs(input.parent ?? []);
    const draftInput = { text: input.text, type: input.type, scope, authorName: input.authorName, authorEmail, role: input.role, context: input.context, triggers: input.triggers, dependsOn: input.dependsOn, level: input.level, parent: input.parent, source: input.source, taskType: input.taskType, variants: input.variants, confidence: input.confidence, directive: input.directive, appliesTo: input.appliesTo, working: input.working };
    let related = relatedMemoryHints(input.ctx, input.text, input.type, scope, match?.entry, parentIds);
    if (match && !explicitUpdate && input.directive?.trim() && match.entry.directive) {
      // E16a: an implicit upsert must not merge a contradicting directive into the memory it contradicts, so it is a SUPERSEDE instead.
      const all = relatedMemoryHints(input.ctx, input.text, input.type, scope, undefined, parentIds);
      const challenge = candidateVerdict({ type: input.type, directive: input.directive, appliesTo: input.appliesTo, tags: draftMemory(draftInput, options).tags, working }, all, { action: 'add', explicit: false });
      if (challenge.kind === 'SUPERSEDE' && challenge.target === match.entry.id) {
        match = undefined;
        related = all;
      }
    }
    if (match) {
      const content = updateMemory(match.raw, { text: input.text, type: input.type, scope, authorName: input.authorName, authorEmail, role: input.role, context: input.context, triggers: input.triggers, dependsOn: input.dependsOn, level: input.level, parent: input.parent, source: input.source, taskType: input.taskType, variants: input.variants, confidence: input.confidence, directive: input.directive, appliesTo: input.appliesTo }, options);
      const workingUntil = working ? match.entry.validUntil : undefined;
      const unchanged = updateIsUnchanged(match.raw, content, input);
      const verdict = candidateVerdict(
        { type: input.type, directive: input.directive, appliesTo: input.appliesTo, tags: [], working },
        related,
        { action: 'update', explicit: explicitUpdate, matchId: match.entry.id, unchanged }
      );
      plans.push({ action: 'update', scope, file: match.entry.file, id: match.entry.id, content, previousContent: match.raw, matchScore: match.score, verdict, related, message: `update ${tierLabel(working)}${input.type}: ${match.entry.id}`, ...(workingUntil ? { workingUntil } : {}) });
    } else {
      let draft = draftMemory(draftInput, options);
      const verdict = candidateVerdict(
        { type: input.type, directive: input.directive, appliesTo: input.appliesTo, tags: draft.tags, working },
        related,
        { action: 'add', explicit: false }
      );
      // The preview shows the `supersedes:` the approved write will carry.
      if (verdict.kind === 'SUPERSEDE' && verdict.target) draft = draftMemory({ ...draftInput, supersedes: [verdict.target] }, options);
      const unique = await avoidCollision(input.ctx, scope, draft, input.text);
      plans.push({ action: 'add', scope, file: unique.file, id: unique.id, content: unique.content, verdict, related, message: `add ${tierLabel(working)}${input.type}: ${unique.id}`, ...(input.working ? { workingUntil: input.working.validUntil } : {}) });
    }
  }
  return plans;
}

/** Normalize parent/child references the same way depends_on refs are compared. */
function normalizeParentRefs(ids: string[]): string[] {
  return ids.map((ref) => normalizeRef(ref)).filter(Boolean);
}

/** Render the automatically chosen add/update plan for human approval. */
export function previewSavePlans(plans: SavePlan[], options: SavePreviewOptions = {}): string {
  return plans.map((plan) => {
    const score = plan.matchScore === undefined ? '' : `\nMatch score: ${plan.matchScore.toFixed(2)}`;
    const candidate = plan.candidateIndex === undefined ? '' : `Candidate: ${plan.candidateIndex}\n`;
    const isRule = kind(plan.file) === 'rule';
    const custom = isRule && Object.keys(extractRuleVariants(plan.content)).length > 0;
    const rulePreview = isRule && !options.showRuleVariants;
    const content = rulePreview ? canonicalRuleMemory(plan.content) : plan.content;
    const previewNote = rulePreview ? `\nRule variants: ${custom ? 'custom light, balanced, strict will be saved' : 'derived at render time (light, balanced, strict)'}. Preview shows balanced.` : '';
    // Stored custom variants already show in `content`; derived ones are appended as a preview-only block.
    const derivedBlock = isRule && options.showRuleVariants && !custom ? derivedVariantsBlock(plan.content) : '';
    const tier = plan.file.startsWith(`${WORKING_DIR}/`) ? `\nTier: working${plan.workingUntil ? ` (expires ${plan.workingUntil})` : ''}` : '';
    const scope = `${plan.scope}${plan.scopeNote ? ` (${plan.scopeNote})` : ''}${plan.objective === 'task' ? '\nObjective: task' : ''}${tier}`;
    return `${candidate}Action: ${plan.action === 'update' ? 'Update existing memory' : 'Add new memory'}\nType: ${kind(plan.file)}\nScope: ${scope}\nFile: ${plan.file}\n${verdictLine(plan)}${score}${relatedPreview(plan.related)}${previewNote}\n\n${content}${derivedBlock}`;
  }).join('\n\n---\n\n');
}

/** E17: preview-only listing of the three render-time variants; nothing here is written to the file. */
function derivedVariantsBlock(raw: string): string {
  const variants = ruleVariantsFor(raw);
  return `\n\n## Rule Variants (derived, not stored)\n\n### Light\n\n${variants.light}\n\n### Balanced\n\n${variants.balanced}\n\n### Strict\n\n${variants.strict}\n`;
}

/**
 * One `Verdict:` line per plan (E16 writes it lowercase; it is capitalized here to match `Action:` and `Type:`).
 * NOOP says it is skipped unless selected only for numbered candidates, where `A` and `B` really skip it.
 */
function verdictLine(plan: SavePlan): string {
  const { kind: verdictKind, target } = plan.verdict;
  if (verdictKind === 'UPDATE') return `Verdict: UPDATE ${target}`;
  if (verdictKind === 'SUPERSEDE') return `Verdict: SUPERSEDE ${target} (approving marks it superseded)`;
  if (verdictKind === 'NOOP') return `Verdict: NOOP duplicate of ${target}${plan.candidateIndex === undefined ? '' : ' (skipped unless selected)'}`;
  return 'Verdict: ADD';
}

/** True when the score displays as 1.00, the E16a duplicate bar (`NOOP_MIN_SCORE`). */
export function scoreDisplaysAsExactDuplicate(score: number): boolean {
  return score >= NOOP_MIN_SCORE;
}

export function displayExactDuplicateScore(score: number): string {
  return scoreDisplaysAsExactDuplicate(score) ? '1.00' : score.toFixed(2);
}

/** The verdicts of a proposal's plans, in the form an MCP approval token pins. A single proposal is candidate 1. */
export function pinVerdicts(plans: SavePlan[]): PinnedVerdict[] {
  return plans.map((plan) => ({ candidate: plan.candidateIndex ?? 1, scope: plan.scope, kind: plan.verdict.kind, ...(plan.verdict.target ? { target: plan.verdict.target } : {}) }));
}

/**
 * E16a in order: NOOP (duplicate), UPDATE (explicit or implicit upsert), SUPERSEDE, else ADD. Deterministic, no model.
 * An explicit `UPDATE:` is always UPDATE, even with unchanged text: `take-control --refresh` needs that write.
 */
export function candidateVerdict(
  candidate: { type: MemoryType; directive?: string; appliesTo?: string[]; tags: string[]; working: boolean },
  related: SaveRelatedHint[],
  dedupe: { action: 'add' | 'update'; explicit: boolean; matchId?: string; unchanged?: boolean }
): SaveVerdict {
  if (dedupe.action === 'update' && dedupe.explicit) return { kind: 'UPDATE', target: dedupe.matchId };
  const duplicate = related.find((hint) => hint.type === candidate.type && !hint.declaredChild && hint.score >= NOOP_MIN_SCORE);
  if (duplicate) return { kind: 'NOOP', target: duplicate.id };
  if (dedupe.action === 'update' && dedupe.unchanged) return { kind: 'NOOP', target: dedupe.matchId };
  if (dedupe.action === 'update') return { kind: 'UPDATE', target: dedupe.matchId };
  // Only a possible-duplicate hint can be superseded, so the forced and autosave paths (which defer those) never apply it.
  const superseded = related
    .filter((hint) => hint.type === candidate.type && !hint.declaredChild && hint.action === 'possible-duplicate'
      && hint.score >= SUPERSEDE_MIN_SCORE && Boolean(hint.working) === candidate.working && contradicts(candidate, hint))
    .sort((a, b) => b.score - a.score || a.file.localeCompare(b.file))[0];
  return superseded ? { kind: 'SUPERSEDE', target: superseded.id } : { kind: 'ADD' };
}

/** A different directive on overlapping `applies_to` globs or shared (non task_type) tags. */
function contradicts(candidate: { directive?: string; appliesTo?: string[]; tags: string[] }, hint: SaveRelatedHint): boolean {
  if (!candidate.directive?.trim() || !hint.directive?.trim()) return false;
  if (normalizeDirective(candidate.directive) === normalizeDirective(hint.directive)) return false;
  return globsOverlap(candidate.appliesTo ?? [], hint.appliesTo ?? []) || tagsOverlap(candidate.tags, hint.tags ?? []);
}

function normalizeDirective(directive: string): string {
  return directive.toLowerCase().replace(/\s+/g, ' ').trim().replace(/\.$/, '');
}

/** Equal globs, or one glob-free literal head is a path prefix of the other's (`src/api/**` vs `src/api/auth/**`). */
function globsOverlap(a: string[], b: string[]): boolean {
  const head = (glob: string) => glob.trim().replace(/\\/g, '/').replace(/^\.\//, '').split(/[*?[{]/)[0];
  const within = (outer: string, inner: string) => inner === outer || inner.startsWith(outer.endsWith('/') ? outer : `${outer}/`);
  return a.some((left) => b.some((right) => {
    if (left.trim() === right.trim()) return true;
    const [x, y] = [head(left), head(right)];
    return Boolean(x) && Boolean(y) && (within(x, y) || within(y, x));
  }));
}

function tagsOverlap(a: string[], b: string[]): boolean {
  const real = (tags: string[]) => new Set(tags.map((tag) => tag.trim().toLowerCase()).filter((tag) => tag && !tag.startsWith('task_type:')));
  const other = real(b);
  return [...real(a)].some((tag) => other.has(tag));
}

/** The `## Content` is equal after the update and the candidate's directive/applies_to add nothing the memory lacks. */
function updateIsUnchanged(before: string, after: string, input: { directive?: string; appliesTo?: string[] }): boolean {
  const content = (raw: string) => extractContentSection(canonicalRuleMemory(raw)).replace(/\s+/g, ' ').trim();
  if (content(before) !== content(after)) return false;
  const existing = parseMemory(before).frontmatter;
  const directive = input.directive?.trim();
  if (directive && directive !== String(existing.directive ?? '').trim()) return false;
  const known = new Set(frontmatterStringList(existing.applies_to));
  return (input.appliesTo ?? []).every((glob) => known.has(glob));
}

/**
 * An explicit UPDATE never crosses tiers: a task candidate may not rewrite a durable memory (that would silently
 * demote it), and a durable candidate may not quietly extend a working memory; `engram promote` is the bridge.
 */
async function explicitMatch(ctx: EngramContext, updateId: string | undefined, type: MemoryType, scope: Scope, working: boolean): Promise<{ entry: MemoryEntry; raw: string; score: number } | undefined> {
  if (!updateId?.trim()) return undefined;
  const requested = normalizeRef(updateId);
  const matches = ctx.scopeIndexes[scope].entries.filter((item) => item.scope === scope
    && item.type === type
    && !item.ignored
    && [item.id, item.file, item.file.replace(/\.md$/i, '')].some((ref) => normalizeRef(ref) === requested));
  const entry = matches.find((item) => isWorkingEntry(item) === working);
  if (!entry && matches.length) {
    const other = matches[0];
    throw new Error(working
      ? `UPDATE: ${other.id} is a durable memory; an OBJECTIVE: task candidate cannot change it. Drop OBJECTIVE: task to update the durable memory, or drop UPDATE to add a working memory.`
      : `UPDATE: ${other.id} is a working memory; run engram promote ${other.id} first, or mark the candidate OBJECTIVE: task to update it in the working tier.`);
  }
  if (!entry) return undefined;
  if (working && expiredEntry(entry)) {
    throw new Error(`UPDATE: ${entry.id} is a working memory that expired on ${entry.validUntil}; drop UPDATE to add a fresh working memory, or run engram working prune.`);
  }
  return { entry, raw: await readText(entryPath(ctx, scope, entry.file)), score: 1 };
}

async function bestMatch(ctx: EngramContext, text: string, type: MemoryType, scope: Scope, working: boolean): Promise<{ entry: MemoryEntry; raw: string; score: number } | undefined> {
  const queryWords = words(text);
  const index = ctx.scopeIndexes[scope];
  let best: { entry: MemoryEntry; raw: string; score: number; overlap: number } | undefined;
  // Automatic upserts stay inside the candidate's tier and never extend an expired (invisible) working memory.
  const candidates = index.entries.filter((item) => item.scope === scope && item.type === type && !item.ignored
    && isWorkingEntry(item) === working && !(working && expiredEntry(item)));
  for (const entry of candidates) {
    const raw = await readText(entryPath(ctx, scope, entry.file));
    const candidateRaw = type === 'rule' ? canonicalRuleMemory(raw) : raw;
    const candidate = `${entry.id} ${entry.tags.join(' ')} ${entry.summary} ${candidateRaw}`;
    const score = entry.id === slugify(text) ? 1 : lexicalScore(text, candidate);
    const candidateWords = words(candidate);
    const overlap = [...queryWords].filter((word) => candidateWords.has(word)).length;
    if (!best || score > best.score) best = { entry, raw, score, overlap };
  }
  if (!best) return undefined;
  return best.score >= 0.25 && best.overlap >= 2 ? best : undefined;
}

function relatedMemoryHints(ctx: EngramContext, text: string, type: MemoryType, scope: Scope, exclude?: MemoryEntry, parentIds: string[] = []): SaveRelatedHint[] {
  const index = ctx.scopeIndexes[scope];
  if (!index.entries.length) return [];
  const intent = inferTaskIntent(text);
  const routingQuery = intentIsActionable(intent) ? taskIntentQuery(intent) : text;
  const routed = routeDetailed(index, routingQuery, ctx.config, false, {
    ignorePatterns: ctx.ignorePatterns,
    limit: Math.max(DEFAULT_LOAD_LIMIT, normalizeLoadLimit(ctx.config.load?.limit)),
    candidatePool: Math.max(DEFAULT_LOAD_LIMIT, ctx.config.vector?.candidate_pool ?? DEFAULT_LOAD_LIMIT),
    intent,
    semanticRelaxed: true
  }, ctx.graph).entries;
  const queryWords = words(text);
  const declaredChildren = new Set(parentIds);
  return routed
    .filter((entry) => entry.scope === scope && !sameEntry(entry, exclude))
    .map((entry) => {
      const score = lexicalScore(text, relatedText(entry));
      const overlap = [...queryWords].filter((word) => words(relatedText(entry)).has(word)).length;
      return { entry, score, overlap };
    })
    .filter((row) => row.score >= 0.08 && row.overlap >= 1)
    .sort((a, b) => b.score - a.score || a.entry.file.localeCompare(b.entry.file))
    .slice(0, RELATED_HINT_LIMIT)
    .map((row) => {
      // A candidate declaring `PARENT: <child-ids>` intentionally generalizes those
      // children. Overlap is expected by design, so never classify those hints as
      // duplicates — they should remain `suggested-dependency` wiring, letting the
      // parent write cleanly while children get DEPENDS_ON wiring afterwards.
      const isDeclaredChild = declaredChildren.has(normalizeRef(row.entry.id))
        || declaredChildren.has(normalizeRef(row.entry.file))
        || declaredChildren.has(normalizeRef(row.entry.file.replace(/\.md$/i, '')));
      const isPossibleDuplicate = row.entry.type === type && row.score >= 0.18 && row.overlap >= 2 && !isDeclaredChild;
      return {
        id: row.entry.id,
        type: row.entry.type,
        scope: row.entry.scope,
        file: row.entry.file,
        summary: row.entry.summary,
        score: row.score,
        action: isPossibleDuplicate ? 'possible-duplicate' : 'suggested-dependency',
        declaredChild: isDeclaredChild || undefined,
        directive: row.entry.directive,
        appliesTo: row.entry.appliesTo,
        tags: row.entry.tags,
        working: isWorkingEntry(row.entry)
      };
    });
}

function relatedPreview(related: SaveRelatedHint[] = []): string {
  if (!related.length) return '';
  const rows = related.map((hint) => {
    const action = hint.action === 'possible-duplicate'
      ? 'Possible duplicate: consider updating or archiving instead of adding another memory.'
      : `Suggested depends_on: [${hint.id}]`;
    return `- ${hint.scope}:${hint.file} (${hint.type}, score ${hint.score.toFixed(2)})\n  ${action}\n  Summary: ${hint.summary}`;
  });
  return `\nRelated memories found:\n${rows.join('\n')}\nRestructure hint: accept saves as previewed; reject if you want to rerun save after adding dependencies or archive duplicate memories after review.`;
}

function relatedText(entry: MemoryEntry): string {
  return `${entry.id} ${entry.type} ${entry.tags.join(' ')} ${(entry.dependsOn ?? []).join(' ')} ${entry.summary}`;
}

function sameEntry(entry: MemoryEntry, other?: MemoryEntry): boolean {
  return Boolean(other) && entry.scope === other?.scope && entry.file === other.file;
}

function normalizeRef(ref: string): string {
  return ref.trim().replace(/\\/g, '/').replace(/\.md$/i, '').toLowerCase();
}

function kind(file: string): MemoryType {
  const durable = file.startsWith(`${WORKING_DIR}/`) ? file.slice(WORKING_DIR.length + 1) : file;
  if (durable.startsWith('rules/')) return 'rule';
  if (durable.startsWith('skills/')) return 'skill';
  return 'knowledge';
}

function isWorkingEntry(entry: MemoryEntry): boolean {
  return isWorkingPath(entry.file);
}

function expiredEntry(entry: MemoryEntry): boolean {
  return validityFactor(entry, false, today()) === 'exclude';
}

function tierLabel(working: boolean): string {
  return working ? 'working ' : '';
}

function otherTierFile(file: string): string {
  return file.startsWith(`${WORKING_DIR}/`) ? file.slice(WORKING_DIR.length + 1) : `${WORKING_DIR}/${file}`;
}

async function avoidCollision(
  ctx: EngramContext,
  scope: Scope,
  draft: { file: string; id: string; content: string },
  text: string
): Promise<{ file: string; id: string; content: string }> {
  // An id is unique across both tiers, so `engram promote` never lands on an existing durable file.
  const taken = async (file: string) => await exists(entryPath(ctx, scope, file)) || await exists(entryPath(ctx, scope, otherTierFile(file)));
  if (!(await taken(draft.file))) return draft;
  const dir = draft.file.slice(0, draft.file.lastIndexOf('/'));
  const base = draft.id;
  const suffix = sha256(text).slice(0, 8);
  let id = `${base}-${suffix}`;
  let file = `${dir}/${id}.md`;
  let counter = 2;
  while (await taken(file)) {
    id = `${base}-${suffix}-${counter}`;
    file = `${dir}/${id}.md`;
    counter += 1;
  }
  return { file, id, content: draft.content.replace(/^id:\s*.+$/m, `id: ${id}`) };
}


