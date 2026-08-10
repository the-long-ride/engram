/** Implement the CLI command family for Engram author profiles and migrations. */
import type {
  AuthorMigrationPlan,
  AuthorMigrationResult,
  AuthorMigrationScope,
  AuthorMutationResult,
  AuthorScope,
  AuthorState,
  GitAuthorSyncPlan,
  GitAuthorSyncResult
} from '../core/author/types.js';
import { getAuthorState } from '../core/author/resolve.js';
import { setAuthorProfile, unsetAuthorProfile } from '../core/author/config.js';
import { planGlobalGitAuthorSync, syncGlobalGitAuthor } from '../core/author/git-sync.js';
import { migrateMemoryAuthors, planAuthorMemoryMigration } from '../core/author/migrate-memories.js';
import { ok, serializeResult } from '../core/contracts/result.js';
import { formatRecords } from '../core/cli/format.js';

export async function cmdAuthor(args: string[], flags: Record<string, any>, cwd = process.cwd()): Promise<string> {
  const [action = 'show'] = args;
  if (action === 'show') return renderAuthorState(await getAuthorState(cwd), flags.json === true, optionalScope(flags.scope));
  if (action === 'set') {
    const result = await setAuthorProfile(cwd, authorScope(flags.scope ?? 'global'), {
      name: stringFlag(flags.name, 'name'),
      email: stringFlag(flags.email, 'email')
    });
    return renderMutation(result, flags.json === true);
  }
  if (action === 'unset') return renderMutation(await unsetAuthorProfile(cwd, requiredAuthorScope(flags.scope)), flags.json === true);
  if (action === 'sync-git-global') {
    const plan = await planGlobalGitAuthorSync(cwd);
    if (flags.plan === true) return renderPlan(plan, flags.json === true);
    return renderSync(await syncGlobalGitAuthor(cwd, { confirmed: flags.confirm === true }), flags.json === true);
  }
  if (action === 'migrate-memories') {
    const scope = migrationScope(flags.scope ?? 'both');
    if (flags.plan === true) return renderMigration(await planAuthorMemoryMigration(cwd, scope), flags.json === true);
    return renderMigration(await migrateMemoryAuthors(cwd, scope, { confirmed: flags.confirm === true }), flags.json === true);
  }
  throw new Error('author expects show, set, unset, sync-git-global, or migrate-memories');
}

function stringFlag(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`author ${label} is required`);
  return value;
}
function authorScope(value: unknown): AuthorScope {
  if (value === 'global' || value === 'workspace') return value;
  throw new Error('author scope must be global or workspace');
}
function requiredAuthorScope(value: unknown): AuthorScope {
  if (value === undefined) throw new Error('author unset requires --scope global|workspace');
  return authorScope(value);
}
function optionalScope(value: unknown): AuthorScope | undefined {
  return value === undefined ? undefined : authorScope(value);
}
function migrationScope(value: unknown): AuthorMigrationScope {
  if (value === 'global' || value === 'workspace' || value === 'both') return value;
  throw new Error('author migration scope must be workspace, global, or both');
}
function renderJsonOrText<T>(data: T, json: boolean, text: string): string {
  return json ? serializeResult(ok(data)) : text;
}
function displayProfile(profile: { name: string; email: string } | null): string {
  return profile ? `${profile.name} <${profile.email}>` : 'not configured';
}
function renderAuthorState(state: AuthorState, json: boolean, scope?: AuthorScope): string {
  const data = scope ? { [scope]: state[scope], resolved: state.resolved } : state;
  const rows: Array<[string, string]> = [
    ['Global', displayProfile(state.global)],
    ['Workspace', displayProfile(state.workspace)],
    ['Git fallback', displayProfile(state.git)],
    ['Resolved', state.resolved.complete ? `${state.resolved.name} <${state.resolved.email}>` : 'unresolved'],
    ['Source', state.resolved.source]
  ];
  return renderJsonOrText(data, json, formatRecords('Engram author', [{ title: 'Author identity', fields: rows }]));
}
function renderMutation(result: AuthorMutationResult, json: boolean): string {
  const text = `${result.scope === 'global' ? 'Global' : 'Workspace'} Engram author ${result.current ? 'saved' : 'removed'} -> ${result.configFile}`;
  return renderJsonOrText(result, json, text);
}
function renderPlan(plan: GitAuthorSyncPlan, json: boolean): string {
  const text = plan.changes.map((change) => `${change.key}: ${change.from ?? '<unset>'} -> ${change.to}`).join('\n');
  return renderJsonOrText(plan, json, text);
}
function renderSync(result: GitAuthorSyncResult, json: boolean): string {
  return renderJsonOrText(result, json, `Global Git author synchronized and verified: ${result.next.name} <${result.next.email}>`);
}
function renderMigration(result: AuthorMigrationPlan | AuthorMigrationResult, json: boolean): string {
  const text = [
    `Scanned: ${result.scanned}`,
    `Eligible: ${result.eligible}`,
    `Current: ${result.current}`,
    `Skipped: ${result.skipped}`,
    `Invalid: ${result.invalid}`,
    ...('migrated' in result ? [`Migrated: ${result.migrated}`, `Rollback: ${result.rollback}`] : []),
    ...result.files.map((file) => `${file.scope}:${file.file} ${file.action}${file.reason ? ` (${file.reason})` : ''}`)
  ].join('\n');
  return renderJsonOrText(result, json, text);
}
