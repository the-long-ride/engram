/** Resolve Entry help-link URLs against the installed Engram version and published docs versions. */
import { DOCS_SITE_BASE_URL, DOCS_SITE_LATEST_VERSION, DOCS_SITE_VERSIONS } from '../../../runtime/docs-site.js';
import { VERSION } from '../../../runtime/version.js';

function numericParts(version: string): number[] {
  const normalized = version.trim().replace(/^v/i, '');
  const core = normalized.split(/[+-]/, 1)[0] ?? normalized;
  return core.split('.').map((part) => Number.parseInt(part, 10) || 0);
}

function compareVersions(a: string, b: string): number {
  const aParts = numericParts(a);
  const bParts = numericParts(b);
  const max = Math.max(aParts.length, bParts.length);
  for (let index = 0; index < max; index += 1) {
    const diff = (aParts[index] ?? 0) - (bParts[index] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function normalizeVersion(version: string): string {
  return version.trim().replace(/^v/i, '').split(/[+-]/, 1)[0] ?? version.trim().replace(/^v/i, '');
}

export function latestDocsVersion(versions: readonly string[] = DOCS_SITE_VERSIONS): string {
  return [...versions].sort(compareVersions).at(-1) ?? DOCS_SITE_LATEST_VERSION;
}

export function resolveDocsVersion(version: string = VERSION, versions: readonly string[] = DOCS_SITE_VERSIONS): string {
  const normalized = normalizeVersion(version);
  const exact = versions.find((candidate) => normalizeVersion(candidate) === normalized);
  return exact ?? latestDocsVersion(versions);
}

function docsPathPrefix(version: string = VERSION, versions: readonly string[] = DOCS_SITE_VERSIONS): string {
  const resolved = resolveDocsVersion(version, versions);
  return normalizeVersion(resolved) === normalizeVersion(latestDocsVersion(versions))
    ? DOCS_SITE_BASE_URL
    : `${DOCS_SITE_BASE_URL}/version-${resolved}`;
}

function docSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function entryDoc(
  path: string,
  anchor?: string,
  version: string = VERSION,
  versions: readonly string[] = DOCS_SITE_VERSIONS
): string {
  return `${docsPathPrefix(version, versions)}/entry/${path}${anchor ? `#${anchor}` : ''}`;
}

export function entryFieldGroupDoc(
  group: string,
  version: string = VERSION,
  versions: readonly string[] = DOCS_SITE_VERSIONS
): string {
  return entryDoc('field-reference', docSlug(group), version, versions);
}


export function entryConfigFieldDoc(
  anchor: string,
  version: string = VERSION,
  versions: readonly string[] = DOCS_SITE_VERSIONS
): string {
  return entryDoc('field-reference', anchor, version, versions);
}


const SUPPORTED_DOC_LOCALES = new Set(['en', 'vi', 'es', 'fr', 'zh', 'ko', 'ja', 'ru']);

export function detectDocsLocale(): string {
  // Entry's HTML shell is always lang="en"; prefer the user's browser locale
  // so information links open the matching translated docs site.
  if (typeof navigator !== 'undefined') {
    const lang = navigator.language.split('-')[0].toLowerCase();
    if (SUPPORTED_DOC_LOCALES.has(lang)) return lang;
  }
  if (typeof document !== 'undefined') {
    const lang = document.documentElement.lang.split('-')[0].toLowerCase();
    if (SUPPORTED_DOC_LOCALES.has(lang)) return lang;
  }
  return 'en';
}

export function operationDoc(
  path: string,
  anchor?: string,
  locale: string = detectDocsLocale(),
  version: string = VERSION,
  versions: readonly string[] = DOCS_SITE_VERSIONS
): string {
  const prefix = docsPathPrefix(version, versions);
  const resolvedLocale = SUPPORTED_DOC_LOCALES.has(locale) ? locale : 'en';
  const localized = resolvedLocale === 'en' ? prefix : prefix.replace('/engram/docs', `/engram/${resolvedLocale}/docs`);
  return `${localized}/operations/${path}${anchor ? `#${anchor}` : ''}`;
}
