import React, {type ReactNode} from 'react';
import DocPageCopyButton from './DocPageCopyButton';
import {resolveDocPathnameAssetCandidates} from '../utils/rawDocSource';

type SharedProps = {
  pathname: string;
  baseUrl: string;
  locales?: string[];
  defaultLocale?: string;
  currentVersionPath?: string;
  publishedVersionName?: string;
  hasActiveDoc?: boolean;
  mobile?: boolean;
};

function resolveLocaleFromPath(
  pathname: string,
  baseUrl: string,
  locales: string[],
  defaultLocale: string,
): string | null {
  return (
    pathname
      .replace(new RegExp(`^${baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), '/')
      .split('/')
      .filter(Boolean)
      .find((part) => locales.includes(part) && part !== defaultLocale) ?? null
  );
}

export function DocPageCopyNavbarItemView({
  pathname,
  baseUrl,
  locales = [],
  defaultLocale = 'en',
  currentVersionPath = 'future',
  publishedVersionName = 'version-0.0.25',
  hasActiveDoc = true,
  mobile = false,
}: SharedProps): ReactNode {
  if (!hasActiveDoc) return null;

  const candidates = resolveDocPathnameAssetCandidates(pathname, {
    baseUrl,
    locales,
    defaultLocale,
    currentVersionPath,
    publishedVersionName,
  });

  if (!candidates.length) return null;

  const button = (
    <DocPageCopyButton
      source={null}
      pathname={pathname}
      baseUrl={baseUrl}
      locales={locales}
      defaultLocale={defaultLocale}
      currentVersionPath={currentVersionPath}
      publishedVersionName={publishedVersionName}
      locale={resolveLocaleFromPath(pathname, baseUrl, locales, defaultLocale)}
    />
  );

  if (mobile) {
    return <li className="menu__list-item doc-page-copy-navbar-item">{button}</li>;
  }

  return <div className="navbar__item doc-page-copy-navbar-item">{button}</div>;
}
