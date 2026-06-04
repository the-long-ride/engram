/** Automatic save upsert planning for approved memory writes. */
import type { EngramContext } from './context.js';
import { entryPath } from './context.js';
import { exists, readText } from '../system/fsx.js';
import { draftMemory, updateMemory, type MemorySourceMeta } from './memory-template.js';
import type { MemoryEntry, MemoryType, Scope } from '../runtime/types.js';
import { lexicalScore, slugify, words } from '../system/text.js';
import { sha256 } from '../safety/hash.js';

export type SavePlan = {
  action: 'add' | 'update';
  scope: Scope;
  file: string;
  id: string;
  content: string;
  message: string;
  matchScore?: number;
  candidateIndex?: number;
};

/** Add a global twin for workspace save plans when global memory is configured. */
export function withGlobalSaveCopy(ctx: EngramContext, scopes: Scope[]): Scope[] {
  if (!ctx.roots.global || !scopes.includes('workspace') || scopes.includes('global')) return scopes;
  return [...scopes, 'global'];
}

/** Choose whether each scope should add a new memory or update an existing one. */
export async function planMemorySave(input: {
  ctx: EngramContext; text: string; type: MemoryType; scopes: Scope[]; author: string; role?: string[]; source?: MemorySourceMeta;
}): Promise<SavePlan[]> {
  const plans: SavePlan[] = [];
  const options = { ruleVariants: true };
  for (const scope of input.scopes) {
    const match = await bestMatch(input.ctx, input.text, input.type, scope);
    if (match) {
      const content = updateMemory(match.raw, { text: input.text, type: input.type, scope, author: input.author, role: input.role, source: input.source }, options);
      plans.push({ action: 'update', scope, file: match.entry.file, id: match.entry.id, content, matchScore: match.score, message: `update ${input.type}: ${match.entry.id}` });
    } else {
      const draft = draftMemory({ text: input.text, type: input.type, scope, author: input.author, role: input.role, source: input.source }, options);
      const unique = await avoidCollision(input.ctx, scope, draft, input.text);
      plans.push({ action: 'add', scope, file: unique.file, id: unique.id, content: unique.content, message: `add ${input.type}: ${unique.id}` });
    }
  }
  return plans;
}

/** Render the automatically chosen add/update plan for human approval. */
export function previewSavePlans(plans: SavePlan[]): string {
  return plans.map((plan) => {
    const score = plan.matchScore === undefined ? '' : `\nMatch score: ${plan.matchScore.toFixed(2)}`;
    const candidate = plan.candidateIndex === undefined ? '' : `Candidate: ${plan.candidateIndex}\n`;
    return `${candidate}Action: ${plan.action === 'update' ? 'Update existing memory' : 'Add new memory'}\nType: ${kind(plan.file)}\nScope: ${plan.scope}\nFile: ${plan.file}${score}\n\n${plan.content}`;
  }).join('\n\n---\n\n');
}

async function bestMatch(ctx: EngramContext, text: string, type: MemoryType, scope: Scope): Promise<{ entry: MemoryEntry; raw: string; score: number } | undefined> {
  const queryWords = words(text);
  const index = ctx.scopeIndexes[scope];
  let best: { entry: MemoryEntry; raw: string; score: number; overlap: number } | undefined;
  for (const entry of index.entries.filter((item) => item.scope === scope && item.type === type && !item.ignored)) {
    const raw = await readText(entryPath(ctx, scope, entry.file));
    const candidate = `${entry.id} ${entry.tags.join(' ')} ${entry.summary} ${raw}`;
    const score = entry.id === slugify(text) ? 1 : lexicalScore(text, candidate);
    const candidateWords = words(candidate);
    const overlap = [...queryWords].filter((word) => candidateWords.has(word)).length;
    if (!best || score > best.score) best = { entry, raw, score, overlap };
  }
  if (!best) return undefined;
  return best.score >= 0.25 && best.overlap >= 2 ? best : undefined;
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
