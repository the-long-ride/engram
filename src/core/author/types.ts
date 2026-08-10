/** Define author profile, resolution, sync, and migration contracts. */
export type AuthorProfile = { name: string; email: string };
export type AuthorScope = 'global' | 'workspace';
export type AuthorSource = 'workspace' | 'global' | 'git' | 'unresolved';

export type ResolvedAuthor = {
  name: string;
  email: string;
  source: AuthorSource;
  complete: boolean;
};

export type AuthorState = {
  global: AuthorProfile | null;
  workspace: AuthorProfile | null;
  git: AuthorProfile | null;
  resolved: ResolvedAuthor;
};

export type AuthorMutationResult = {
  scope: AuthorScope;
  previous: AuthorProfile | null;
  current: AuthorProfile | null;
  configFile: string;
};

export type GitAuthorSyncPlan = {
  source: 'global';
  previous: AuthorProfile | null;
  next: AuthorProfile;
  changes: Array<{ key: 'user.name' | 'user.email'; from: string | null; to: string }>;
};

export type GitAuthorSyncResult = GitAuthorSyncPlan & {
  verified: true;
  rollback: 'not-needed' | 'succeeded';
};

export type AuthorMigrationScope = 'workspace' | 'global' | 'both';
export type AuthorMigrationAction = 'migrate' | 'migrated' | 'current' | 'skipped' | 'invalid' | 'failed';
export type AuthorMigrationFile = {
  scope: 'workspace' | 'global';
  file: string;
  action: AuthorMigrationAction;
  backup?: string;
  reason?: string;
  source?: AuthorSource;
};
export type AuthorMigrationPlan = {
  scope: AuthorMigrationScope;
  scanned: number;
  eligible: number;
  current: number;
  skipped: number;
  invalid: number;
  files: AuthorMigrationFile[];
};
export type AuthorMigrationResult = AuthorMigrationPlan & {
  migrated: number;
  failed: 0;
  rollback: 'not-needed';
};
export class AuthorMigrationError extends Error {
  constructor(
    message: string,
    readonly rollback: 'succeeded' | 'failed',
    readonly files: AuthorMigrationFile[]
  ) {
    super(message);
    this.name = 'AuthorMigrationError';
  }
}
