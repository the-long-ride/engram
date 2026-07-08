function applyTrailingSlash(
  path: string,
  options: {trailingSlash: boolean | undefined; baseUrl: string},
): string {
  const {trailingSlash, baseUrl} = options;
  if (typeof trailingSlash === 'undefined') return path;
  const [pathname] = path.split(/[#?]/) as [string, ...string[]];
  const shouldNotApply = pathname === '/' || pathname === baseUrl;
  if (shouldNotApply) return path;
  const newPathname = trailingSlash
    ? pathname.endsWith('/')
      ? pathname
      : `${pathname}/`
    : pathname.endsWith('/')
      ? pathname.slice(0, -1)
      : pathname;
  return path.replace(pathname, newPathname);
}

export function stripBasePath(pathname: string, basePath: string): string {
  if (pathname.startsWith(basePath)) {
    return pathname.slice(basePath.length);
  }
  const basePathNoSlash = basePath.replace(/\/$/, '');
  if (pathname === basePathNoSlash) {
    return '';
  }
  if (pathname.startsWith(basePathNoSlash + '/')) {
    return pathname.slice(basePathNoSlash.length + 1);
  }
  return pathname;
}

export function inferCurrentLocaleBaseUrl(options: {
  pathname: string;
  localeConfigs: Record<string, { baseUrl: string }>;
  currentLocale: string;
}): string {
  const { pathname, localeConfigs, currentLocale } = options;
  const sorted = Object.values(localeConfigs).sort(
    (a, b) => b.baseUrl.length - a.baseUrl.length,
  );
  for (const cfg of sorted) {
    if (
      pathname === cfg.baseUrl ||
      pathname === cfg.baseUrl.replace(/\/$/, '') ||
      pathname.startsWith(cfg.baseUrl) ||
      pathname.startsWith(cfg.baseUrl.replace(/\/$/, '') + '/')
    ) {
      return cfg.baseUrl;
    }
  }
  return localeConfigs[currentLocale]?.baseUrl || '/';
}

export type LocaleUrlParams = {
  pathname: string;
  trailingSlash: boolean | undefined;
  siteBaseUrl: string;
  currentLocaleBaseUrl: string;
  targetLocaleBaseUrl: string;
  targetLocaleUrl: string;
  siteUrl: string;
};

export function createLocaleUrl(params: LocaleUrlParams): string {
  const canonicalPathname = applyTrailingSlash(params.pathname, {
    trailingSlash: params.trailingSlash,
    baseUrl: params.siteBaseUrl,
  });

  const pathnameSuffix = stripBasePath(
    canonicalPathname,
    params.currentLocaleBaseUrl,
  );

  const isSameDomain = params.targetLocaleUrl === params.siteUrl;
  if (isSameDomain) {
    return `pathname://${params.targetLocaleBaseUrl}${pathnameSuffix}`;
  }
  return `${params.targetLocaleUrl}${params.targetLocaleBaseUrl}${pathnameSuffix}`;
}
