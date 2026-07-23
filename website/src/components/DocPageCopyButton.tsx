import React, {useState} from 'react';
import {
  copyDocPathnameContent,
  copyDocSourceContent,
  resolveDocPathnameAssetCandidates,
  resolvePublicDocSourceUrl,
} from '../utils/rawDocSource';

type CopyState = 'idle' | 'copied' | 'failed';

function labelForState(state: CopyState): string {
  if (state === 'copied') return 'Copied';
  if (state === 'failed') return 'Copy failed';
  return 'Copy markdown';
}

export function DocPageCopyButton({
  source,
  pathname,
  baseUrl = '/',
  locales = [],
  defaultLocale = 'en',
  currentVersionPath = 'future',
  publishedVersionName = 'version-0.0.28',
  locale = null,
  fetchImpl = fetch,
  writeText = (text: string) => navigator.clipboard.writeText(text),
}: {
  source: string | null;
  pathname?: string;
  baseUrl?: string;
  locales?: string[];
  defaultLocale?: string;
  currentVersionPath?: string;
  publishedVersionName?: string;
  locale?: string | null;
  fetchImpl?: typeof fetch;
  writeText?: (text: string) => Promise<void> | void;
}) {
  const [state, setState] = useState<CopyState>('idle');
  const publicUrl = source
    ? resolvePublicDocSourceUrl(source, baseUrl, {locale, defaultLocale})
    : null;
  const pathnameCandidates = pathname
    ? resolveDocPathnameAssetCandidates(pathname, {
        baseUrl,
        locales,
        defaultLocale,
        currentVersionPath,
        publishedVersionName,
      })
    : [];

  if ((!source || !publicUrl) && !pathnameCandidates.length) return null;

  async function onClick() {
    try {
      if (source && publicUrl) {
        await copyDocSourceContent({
          source,
          baseUrl,
          locale,
          defaultLocale,
          fetchImpl,
          writeText,
        });
      } else if (pathname) {
        await copyDocPathnameContent({
          pathname,
          baseUrl,
          locales,
          defaultLocale,
          currentVersionPath,
          publishedVersionName,
          fetchImpl,
          writeText,
        });
      }
      setState('copied');
      window.setTimeout(() => setState('idle'), 1200);
    } catch {
      setState('failed');
      window.setTimeout(() => setState('idle'), 1600);
    }
  }

  return (
    <button
      type="button"
      className="doc-page-copy-button button button--secondary button--sm"
      onClick={onClick}
      title="Copy Markdown source for this page"
      aria-label="Copy Markdown source for this page">
      <svg
        className="doc-page-copy-button__icon"
        viewBox="0 0 16 16"
        aria-hidden="true">
        <path
          fill="currentColor"
          d="M5 2.5A1.5 1.5 0 0 1 6.5 1h5A1.5 1.5 0 0 1 13 2.5v7A1.5 1.5 0 0 1 11.5 11h-5A1.5 1.5 0 0 1 5 9.5zM6.5 2a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .5.5h5a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.5-.5z"
        />
        <path
          fill="currentColor"
          d="M3.5 4A1.5 1.5 0 0 0 2 5.5v7A1.5 1.5 0 0 0 3.5 14h5A1.5 1.5 0 0 0 10 12.5V12H9v.5a.5.5 0 0 1-.5.5h-5a.5.5 0 0 1-.5-.5v-7a.5.5 0 0 1 .5-.5H4V4z"
        />
      </svg>
      <span className="doc-page-copy-button__label">{labelForState(state)}</span>
    </button>
  );
}

export default DocPageCopyButton;
