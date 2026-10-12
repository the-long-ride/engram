/** take-control discovery guards: `--kind` selection, secret and generated file names, size and binary checks. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { baseName, normalizeRelPath } from '../ingest/text.js';
import { ENGRAM_DIR, LEGACY_ENGRAM_DIR } from '../runtime/constants.js';
import { SOURCE_KINDS, type SourceKind } from '../ingest/types.js';

const MAX_SOURCE_BYTES = 256 * 1024;
const BINARY_SNIFF_BYTES = 8 * 1024;
/** `code` also reads build manifests (package.json, *.csproj, go.mod, ...) so a code scan knows the stack. */
const KIND_VALUES = new Map<string, readonly SourceKind[]>([
  ['docs', ['docs']],
  ['code', ['code', 'manifest']],
  ['config', ['config']],
  ['all', SOURCE_KINDS]
]);
/** Lower-case names: matching runs on the lower-cased base name, so `KEY.PEM` and `.ENV` are caught too. */
const SECRET_NAMES = new Set([
  '.npmrc', '.pypirc', '.netrc', '.pgpass', '.git-credentials', '.htpasswd', '.dockercfg', 'credentials', 'kubeconfig',
  'id_rsa', 'id_dsa', 'id_ecdsa', 'id_ed25519', 'secrets.json', 'secrets.yaml', 'secrets.yml', 'secrets.toml'
]);
const SECRET_EXTENSIONS = /\.(pem|key|pfx|p12|jks|keystore|ppk|tfvars|tfvars\.json)$/;
/** `credentials.json`, `gcp-credentials-dev.json`, ... */
const CREDENTIALS_JSON = /credentials.*\.json$/;
/** Credential stores named by their directory: kubectl and Docker client config. */
const SECRET_PATHS = /(^|\/)(\.kube\/config|\.docker\/config\.json)$/;
const VCS_DIRS = new Set(['.git', '.hg', '.svn']);
const GENERATED_NAMES =new Set(['package-lock.json', 'npm-shrinkwrap.json', 'pnpm-lock.yaml']);
const MINIFIED = /\.min\.(js|mjs|cjs)$/;

/** Parse `--kind docs|code|config|all` (comma lists allowed). Default `docs` is the original take-control scan. */
export function parseSourceKinds(value: unknown): Set<SourceKind> {
  if (value === undefined || value === false) return new Set(['docs']);
  const raw = Array.isArray(value) ? value.join(',') : typeof value === 'string' ? value : '';
  const names = raw.split(',').map((name) => name.trim().toLowerCase()).filter(Boolean);
  if (!names.length || names.some((name) => !KIND_VALUES.has(name))) {
    throw new Error('--kind expects docs, code, config, or all (comma-separated)');
  }
  const selected = new Set(names.flatMap((name) => KIND_VALUES.get(name) ?? []));
  return new Set(SOURCE_KINDS.filter((kind) => selected.has(kind)));
}

/** `.env*` and well-known credential files are never read, in any kind, even when targeted with --file. */
export function isSecretFile(rel: string): boolean {
  const name = baseName(rel);
  return name.startsWith('.env') || SECRET_NAMES.has(name) || SECRET_EXTENSIONS.test(name) || CREDENTIALS_JSON.test(name)
    || SECRET_PATHS.test(normalizeRelPath(rel).toLowerCase());
}

/**
 * Why a workspace-relative path must never be read as a source, or undefined. Secret names, VCS metadata at any depth,
 * and Engram's own data. Callers check both the requested path and the path it really resolves to.
 */
export function protectedSourceReason(rel: string): string | undefined {
  const file = normalizeRelPath(rel).toLowerCase();
  if (isSecretFile(file)) return 'secret file';
  if (file.split('/').some((part) => VCS_DIRS.has(part))) return 'VCS metadata';
  if ([ENGRAM_DIR, LEGACY_ENGRAM_DIR].some((dir) => file === dir || file.startsWith(`${dir}/`))) return 'Engram data';
  return undefined;
}

/**
 * Skip reason for a source whose real path, after following links, leaves the workspace or is protected (a link named
 * `notes/x.md` pointing at `../secrets.json` or `.git/config`). Undefined when it is safe or cannot be resolved.
 */
export async function resolvedSourceGuard(cwd: string, file: string): Promise<string | undefined> {
  const real = await fs.realpath(file).catch(() => undefined);
  if (!real) return undefined;
  const root = await fs.realpath(cwd).catch(() => path.resolve(cwd));
  const rel = path.relative(root, real);
  if (!rel || rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) return 'path outside the workspace';
  return protectedSourceReason(rel);
}

/** Lockfiles and minified bundles are machine output; code/config discovery leaves them out. */
export function isGeneratedArtifact(rel: string): boolean {
  const name = baseName(rel);
  return GENERATED_NAMES.has(name) || MINIFIED.test(name);
}

/** Skip reason for a walked file that is too large or looks binary (NUL byte in the first 8 KB). */
export async function sourceFileGuard(file: string): Promise<string | undefined> {
  const handle = await fs.open(file, 'r').catch(() => undefined);
  if (!handle) return undefined;
  try {
    const { size } = await handle.stat();
    if (size > MAX_SOURCE_BYTES) return 'larger than 256 KB';
    const head = Buffer.alloc(Math.min(size, BINARY_SNIFF_BYTES));
    const { bytesRead } = await handle.read(head, 0, head.length, 0);
    return head.subarray(0, bytesRead).includes(0) ? 'binary file' : undefined;
  } catch {
    return undefined;
  } finally {
    await handle.close().catch(() => undefined);
  }
}
