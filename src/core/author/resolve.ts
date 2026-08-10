/** Resolve Engram author identity from workspace, global, and Git layers. */
import type { AuthorProfile, AuthorState, ResolvedAuthor } from './types.js';
import { readConfiguredAuthorLayers } from './config.js';
import { tryNormalizeAuthorProfile } from './validate.js';
import { gitConfigValue } from '../vcs/git.js';

export async function readEffectiveGitAuthor(cwd: string): Promise<AuthorProfile | null> {
  const [name, email] = await Promise.all([
    gitConfigValue('user.name', { cwd }),
    gitConfigValue('user.email', { cwd })
  ]);
  return tryNormalizeAuthorProfile({ name, email });
}

type ResolveAuthorDeps = {
  layerReader?: (cwd: string) => Promise<{ global: AuthorProfile | null; workspace: AuthorProfile | null }>;
  gitReader?: (cwd: string) => Promise<AuthorProfile | null>;
};

export async function getAuthorState(cwd: string, deps: ResolveAuthorDeps = {}): Promise<AuthorState> {
  const layers = await (deps.layerReader ?? readConfiguredAuthorLayers)(cwd);
  const git = await (deps.gitReader ?? readEffectiveGitAuthor)(cwd);
  const winner = layers.workspace
    ? { ...layers.workspace, source: 'workspace' as const }
    : layers.global
      ? { ...layers.global, source: 'global' as const }
      : git
        ? { ...git, source: 'git' as const }
        : { name: '', email: '', source: 'unresolved' as const };
  return {
    ...layers,
    git,
    resolved: { ...winner, complete: winner.source !== 'unresolved' }
  };
}

export async function resolveAuthor(cwd: string, deps: ResolveAuthorDeps = {}): Promise<ResolvedAuthor> {
  return (await getAuthorState(cwd, deps)).resolved;
}

export async function requireResolvedAuthor(cwd: string, deps: ResolveAuthorDeps = {}): Promise<ResolvedAuthor> {
  const author = await resolveAuthor(cwd, deps);
  if (author.complete) return author;
  throw new Error([
    'No complete Engram author identity is configured.',
    'Set a global profile: engram author set --name "Jane Doe" --email "jane@example.com"',
    'Set a workspace profile: engram author set --scope workspace --name "Jane Doe" --email "jane@work.com"',
    'Or configure Git: git config --global user.name "Jane Doe" && git config --global user.email "jane@example.com"'
  ].join('\n'));
}
