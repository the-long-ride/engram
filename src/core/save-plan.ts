/** Automatic save upsert planning for approved memory writes. */
import type { EngramContext } from './context.js';
import { entryPath } from './context.js';
import { readText } from './fsx.js';
import { draftMemory, updateMemory } from './memory-template.js';
import type { MemoryEntry, MemoryType, Scope } from './types.js';
import { lexicalScore, slugify, words } from './text.js';

export type SavePlan = {
  action: 'add' | 'update';
  scope: Scope;
  file: string;
  id: string;
  content: string;
  message: string;
  matchScore?: number;
};

/** Choose whether each scope should add a new memory or update an existing one. */
export async function planMemorySave(input: {
  ctx: EngramContext; text: string; type: MemoryType; scopes: Scope[]; author: string;
}): Promise<SavePlan[]> {
  const plans: SavePlan[] = [];
  const options = { ruleVariants: input.ctx.config.rule_variants.enabled };
  for (const scope of input.scopes) {
    const match = await bestMatch(input.ctx, input.text, input.type, scope);
    if (match) {
      const content = updateMemory(match.raw, { text: input.text, type: input.type, scope, author: input.author }, options);
      plans.push({ action: 'update', scope, file: match.entry.file, id: match.entry.id, content, matchScore: match.score, message: `update ${input.type}: ${match.entry.id}` });
    } else {
      const draft = draftMemory({ text: input.text, type: input.type, scope, author: input.author }, options);
      plans.push({ action: 'add', scope, file: draft.file, id: draft.id, content: draft.content, message: `add ${input.type}: ${draft.id}` });
    }
  }
  return plans;
}

/** Render the automatically chosen add/update plan for human approval. */
export function previewSavePlans(plans: SavePlan[]): string {
  return plans.map((plan) => {
    const score = plan.matchScore === undefined ? '' : `\nMatch score: ${plan.matchScore.toFixed(2)}`;
    return `Action: ${plan.action === 'update' ? 'Update existing memory' : 'Add new memory'}\nType: ${kind(plan.file)}\nScope: ${plan.scope}\nFile: ${plan.file}${score}\n\n${plan.content}`;
  }).join('\n\n---\n\n');
}

async function bestMatch(ctx: EngramContext, text: string, type: MemoryType, scope: Scope): Promise<{ entry: MemoryEntry; raw: string; score: number } | undefined> {
  const queryWords = words(text);
  let best: { entry: MemoryEntry; raw: string; score: number; overlap: number } | undefined;
  for (const entry of ctx.index.entries.filter((item) => item.scope === scope && item.type === type && !item.ignored)) {
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
