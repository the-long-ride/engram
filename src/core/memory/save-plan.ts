/** Automatic save upsert planning for approved memory writes. */
import type { EngramContext } from './context.js';
import { entryPath } from './context.js';
import { exists, readText } from '../system/fsx.js';
import { draftMemory, updateMemory, type MemorySourceMeta } from './memory-template.js';
import type { MemoryEntry, MemoryType, Scope } from '../runtime/types.js';
import { lexicalScore, slugify, words } from '../system/text.js';
import { sha256 } from '../safety/hash.js';
import { routeDetailed } from './routing.js';
import { DEFAULT_LOAD_LIMIT, normalizeLoadLimit } from '../runtime/load-limit.js';
import type { TaskType } from './task-classifier.js';
import { inferTaskIntent, taskIntentQuery, intentIsActionable } from './task-intent.js';
import { canonicalRuleMemory } from './rule-variants.js';

const RELATED_HINT_LIMIT = 3;

export type SaveRelatedHint = {
  id: string;
  type: MemoryType;
  scope: Scope;
  file: string;
  summary: string;
  score: number;
  action: 'suggested-dependency' | 'possible-duplicate';
};

export type SavePlan = {
  action: 'add' | 'update';
  scope: Scope;
  file: string;
  id: string;
  content: string;
  message: string;
  matchScore?: number;
  candidateIndex?: number;
  related?: SaveRelatedHint[];
};

export type SavePreviewOptions = {
  showRuleVariants?: boolean;
};

/** Choose whether each scope should add a new memory or update an existing one. */
export async function planMemorySave(input: {
  ctx: EngramContext; text: string; type: MemoryType; scopes: Scope[]; author: string; role?: string[]; context?: string; triggers?: string[]; dependsOn?: string[]; level?: string; updateId?: string; source?: MemorySourceMeta; taskType?: TaskType; variants?: Partial<Record<'light' | 'balanced' | 'strict', string>>;
}): Promise<SavePlan[]> {
  const plans: SavePlan[] = [];
  const options = { ruleVariants: true };
  for (const scope of input.scopes) {
    const match = await explicitMatch(input.ctx, input.updateId, input.type, scope) ?? await bestMatch(input.ctx, input.text, input.type, scope);
    const related = relatedMemoryHints(input.ctx, input.text, input.type, scope, match?.entry);
    if (match) {
      const content = updateMemory(match.raw, { text: input.text, type: input.type, scope, author: input.author, role: input.role, context: input.context, triggers: input.triggers, dependsOn: input.dependsOn, level: input.level, source: input.source, taskType: input.taskType, variants: input.variants }, options);
      plans.push({ action: 'update', scope, file: match.entry.file, id: match.entry.id, content, matchScore: match.score, related, message: `update ${input.type}: ${match.entry.id}` });
    } else {
      const draft = draftMemory({ text: input.text, type: input.type, scope, author: input.author, role: input.role, context: input.context, triggers: input.triggers, dependsOn: input.dependsOn, level: input.level, source: input.source, taskType: input.taskType, variants: input.variants }, options);
      const unique = await avoidCollision(input.ctx, scope, draft, input.text);
      plans.push({ action: 'add', scope, file: unique.file, id: unique.id, content: unique.content, related, message: `add ${input.type}: ${unique.id}` });
    }
  }
  return plans;
}

/** Render the automatically chosen add/update plan for human approval. */
export function previewSavePlans(plans: SavePlan[], options: SavePreviewOptions = {}): string {
  return plans.map((plan) => {
    const score = plan.matchScore === undefined ? '' : `\nMatch score: ${plan.matchScore.toFixed(2)}`;
    const candidate = plan.candidateIndex === undefined ? '' : `Candidate: ${plan.candidateIndex}\n`;
    const rulePreview = kind(plan.file) === 'rule' && !options.showRuleVariants;
    const content = rulePreview ? canonicalRuleMemory(plan.content) : plan.content;
    const previewNote = rulePreview ? '\nRule variants: light, balanced, strict will be saved. Preview shows balanced.' : '';
    return `${candidate}Action: ${plan.action === 'update' ? 'Update existing memory' : 'Add new memory'}\nType: ${kind(plan.file)}\nScope: ${plan.scope}\nFile: ${plan.file}${score}${relatedPreview(plan.related)}${previewNote}\n\n${content}`;
  }).join('\n\n---\n\n');
}

async function explicitMatch(ctx: EngramContext, updateId: string | undefined, type: MemoryType, scope: Scope): Promise<{ entry: MemoryEntry; raw: string; score: number } | undefined> {
  if (!updateId?.trim()) return undefined;
  const requested = normalizeRef(updateId);
  const entry = ctx.scopeIndexes[scope].entries.find((item) => item.scope === scope
    && item.type === type
    && !item.ignored
    && [item.id, item.file, item.file.replace(/\.md$/i, '')].some((ref) => normalizeRef(ref) === requested));
  if (!entry) return undefined;
  return { entry, raw: await readText(entryPath(ctx, scope, entry.file)), score: 1 };
}

async function bestMatch(ctx: EngramContext, text: string, type: MemoryType, scope: Scope): Promise<{ entry: MemoryEntry; raw: string; score: number } | undefined> {
  const queryWords = words(text);
  const index = ctx.scopeIndexes[scope];
  let best: { entry: MemoryEntry; raw: string; score: number; overlap: number } | undefined;
  for (const entry of index.entries.filter((item) => item.scope === scope && item.type === type && !item.ignored)) {
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

function relatedMemoryHints(ctx: EngramContext, text: string, type: MemoryType, scope: Scope, exclude?: MemoryEntry): SaveRelatedHint[] {
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
    .map((row) => ({
      id: row.entry.id,
      type: row.entry.type,
      scope: row.entry.scope,
      file: row.entry.file,
      summary: row.entry.summary,
      score: row.score,
      action: row.entry.type === type && row.score >= 0.18 && row.overlap >= 2 ? 'possible-duplicate' : 'suggested-dependency'
    }));
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
  if (file.startsWith('rules/')) return 'rule';
  if (file.startsWith('skills/')) return 'skill';
  return 'knowledge';
}

async function avoidCollision(
  ctx: EngramContext,
  scope: Scope,
  draft: { file: string; id: string; content: string },
  text: string
): Promise<{ file: string; id: string; content: string }> {
  if (!(await exists(entryPath(ctx, scope, draft.file)))) return draft;
  const dir = draft.file.split('/')[0];
  const base = draft.id;
  const suffix = sha256(text).slice(0, 8);
  let id = `${base}-${suffix}`;
  let file = `${dir}/${id}.md`;
  let counter = 2;
  while (await exists(entryPath(ctx, scope, file))) {
    id = `${base}-${suffix}-${counter}`;
    file = `${dir}/${id}.md`;
    counter += 1;
  }
  return { file, id, content: draft.content.replace(/^id:\s*.+$/m, `id: ${id}`) };
}


