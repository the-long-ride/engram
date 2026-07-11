// Resolve public URLs for docs source files and copy their raw content.
type PathResolverOptions = {
  baseUrl?: string;
  locales?: string[];
  defaultLocale?: string;
  currentVersionPath?: string;
  publishedVersionName?: string;
  locale?: string | null;
};

function stripSiteAlias(source: string): string {
  return source.replace(/^@site[\\/]/, '').replace(/\\/g, '/');
}

function normalizeBaseUrl(baseUrl: string): string {
  if (!baseUrl) return '/';
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

export function resolvePublicDocSourceUrl(
  source: string,
  baseUrl = '/',
  {
    locale = null,
    defaultLocale = 'en',
  }: Pick<PathResolverOptions, 'locale' | 'defaultLocale'> = {},
): string | null {
  const normalized = stripSiteAlias(source);
  const root = normalizeBaseUrl(baseUrl);
  const localePrefix =
    locale && locale !== defaultLocale ? `${locale.replace(/^\/+|\/+$/g, '')}/` : '';

  if (normalized.startsWith('docs/')) {
    return `${root}${localePrefix}${normalized.slice('docs/'.length)}`;
  }

  if (normalized.startsWith('versioned_docs/')) {
    const relativePath = normalized.slice('versioned_docs/'.length);
    return `${root}${localePrefix}${relativePath}`;
  }

  return null;
}

function trimBasePath(pathname: string, baseUrl: string): string {
  const normalizedBase = normalizeBaseUrl(baseUrl);
  if (pathname.startsWith(normalizedBase)) {
    return pathname.slice(normalizedBase.length - 1);
  }
  return pathname;
}

export function resolveDocPathnameAssetCandidates(
  pathname: string,
  {
    baseUrl = '/',
    locales = [],
    defaultLocale = 'en',
    currentVersionPath = 'future',
    publishedVersionName = 'version-0.0.25',
  }: PathResolverOptions = {},
): string[] {
  const normalizedBase = normalizeBaseUrl(baseUrl);
  const trimmed = trimBasePath(pathname, normalizedBase)
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .filter(Boolean);

  if (!trimmed.length) return [];

  const parts = [...trimmed];
  const localeSegment =
    parts[0] !== 'docs' && locales.includes(parts[0]) && parts[0] !== defaultLocale
      ? parts.shift()
      : null;
  const localePrefix = localeSegment ? `${localeSegment}/` : '';

  if (parts.shift() !== 'docs') {
    return [];
  }

  const isCurrent = parts[0] === currentVersionPath;
  if (isCurrent) parts.shift();

  const docPath = parts.join('/');
  if (!docPath) return [];

  const roots = isCurrent ? [''] : [`${publishedVersionName}/`];
  const extensions = ['.md', '.mdx'];
  const candidates: string[] = [];
  for (const root of roots) {
    for (const extension of extensions) {
      candidates.push(`${normalizedBase}${localePrefix}${root}${docPath}${extension}`);
      candidates.push(`${normalizedBase}${localePrefix}${root}${docPath}/index${extension}`);
    }
  }
  return candidates;
}

export async function copyDocSourceContent({
  source,
  baseUrl = '/',
  locale = null,
  defaultLocale = 'en',
  fetchImpl = fetch,
  writeText,
}: {
  source: string;
  baseUrl?: string;
  locale?: string | null;
  defaultLocale?: string;
  fetchImpl?: typeof fetch;
  writeText: (text: string) => Promise<void> | void;
}): Promise<'copied'> {
  const url = resolvePublicDocSourceUrl(source, baseUrl, {locale, defaultLocale});
  if (!url) {
    throw new Error(`Unsupported doc source: ${source}`);
  }

  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch doc source: ${response.status}`);
  }

  const text = await response.text();
  await writeText(text);
  return 'copied';
}

export async function copyDocPathnameContent({
  pathname,
  writeText,
  fetchImpl = fetch,
  ...options
}: {
  pathname: string;
  writeText: (text: string) => Promise<void> | void;
  fetchImpl?: typeof fetch;
} & PathResolverOptions): Promise<'copied'> {
  const candidates = resolveDocPathnameAssetCandidates(pathname, options);
  if (!candidates.length) {
    throw new Error(`Unsupported doc pathname: ${pathname}`);
  }

  for (const candidate of candidates) {
    const response = await fetchImpl(candidate);
    if (!response.ok) continue;
    const text = await response.text();
    await writeText(text);
    return 'copied';
  }

  throw new Error(`Failed to fetch doc source for pathname: ${pathname}`);
}
