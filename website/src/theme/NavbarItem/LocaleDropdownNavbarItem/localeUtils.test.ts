import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {stripBasePath, createLocaleUrl, inferCurrentLocaleBaseUrl} from './localeUtils';

describe('stripBasePath', () => {
  it('strips basePath with trailing slash from matching pathname', () => {
    assert.equal(stripBasePath('/engram/ja/docs/intro', '/engram/ja/'), 'docs/intro');
  });

  it('returns empty string when pathname equals basePath', () => {
    assert.equal(stripBasePath('/engram/ja/', '/engram/ja/'), '');
  });

  it('handles pathname without trailing slash matching basePath without trailing slash', () => {
    assert.equal(stripBasePath('/engram/ja', '/engram/ja/'), '');
  });

  it('strips default locale basePath', () => {
    assert.equal(stripBasePath('/engram/docs/intro', '/engram/'), 'docs/intro');
  });

  it('returns empty string for default locale homepage', () => {
    assert.equal(stripBasePath('/engram/', '/engram/'), '');
  });

  it('handles default locale homepage without trailing slash', () => {
    assert.equal(stripBasePath('/engram', '/engram/'), '');
  });

  it('returns pathname as-is when basePath does not match', () => {
    assert.equal(stripBasePath('/other/path', '/engram/'), '/other/path');
  });
});

describe('createLocaleUrl', () => {
  const baseParams = {
    trailingSlash: false as const,
    siteBaseUrl: '/engram/',
    siteUrl: 'https://the-long-ride.github.io',
  };

  it('switches from en to ja on docs page', () => {
    const url = createLocaleUrl({
      ...baseParams,
      pathname: '/engram/docs/intro',
      currentLocaleBaseUrl: '/engram/',
      targetLocaleBaseUrl: '/engram/ja/',
      targetLocaleUrl: 'https://the-long-ride.github.io',
    });
    assert.equal(url, 'pathname:///engram/ja/docs/intro');
  });

  it('switches from ja to zh on docs page (no stacking)', () => {
    const url = createLocaleUrl({
      ...baseParams,
      pathname: '/engram/ja/docs/intro',
      currentLocaleBaseUrl: '/engram/ja/',
      targetLocaleBaseUrl: '/engram/zh/',
      targetLocaleUrl: 'https://the-long-ride.github.io',
    });
    assert.equal(url, 'pathname:///engram/zh/docs/intro');
  });

  it('switches from ja to en on docs page', () => {
    const url = createLocaleUrl({
      ...baseParams,
      pathname: '/engram/ja/docs/intro',
      currentLocaleBaseUrl: '/engram/ja/',
      targetLocaleBaseUrl: '/engram/',
      targetLocaleUrl: 'https://the-long-ride.github.io',
    });
    assert.equal(url, 'pathname:///engram/docs/intro');
  });

  it('switches from en to ja on homepage', () => {
    const url = createLocaleUrl({
      ...baseParams,
      pathname: '/engram/',
      currentLocaleBaseUrl: '/engram/',
      targetLocaleBaseUrl: '/engram/ja/',
      targetLocaleUrl: 'https://the-long-ride.github.io',
    });
    assert.equal(url, 'pathname:///engram/ja/');
  });

  it('switches from ja to en on homepage', () => {
    const url = createLocaleUrl({
      ...baseParams,
      pathname: '/engram/ja/',
      currentLocaleBaseUrl: '/engram/ja/',
      targetLocaleBaseUrl: '/engram/',
      targetLocaleUrl: 'https://the-long-ride.github.io',
    });
    assert.equal(url, 'pathname:///engram/');
  });

  it('switches from ja to zh on homepage (no stacking)', () => {
    const url = createLocaleUrl({
      ...baseParams,
      pathname: '/engram/ja/',
      currentLocaleBaseUrl: '/engram/ja/',
      targetLocaleBaseUrl: '/engram/zh/',
      targetLocaleUrl: 'https://the-long-ride.github.io',
    });
    assert.equal(url, 'pathname:///engram/zh/');
  });

  it('handles deep docs path switching from ja to ko', () => {
    const url = createLocaleUrl({
      ...baseParams,
      pathname: '/engram/ja/docs/concepts/scopes',
      currentLocaleBaseUrl: '/engram/ja/',
      targetLocaleBaseUrl: '/engram/ko/',
      targetLocaleUrl: 'https://the-long-ride.github.io',
    });
    assert.equal(url, 'pathname:///engram/ko/docs/concepts/scopes');
  });

  it('handles consecutive switches: ja -> zh -> ru (simulated)', () => {
    let url = createLocaleUrl({
      ...baseParams,
      pathname: '/engram/ja/docs/intro',
      currentLocaleBaseUrl: '/engram/ja/',
      targetLocaleBaseUrl: '/engram/zh/',
      targetLocaleUrl: 'https://the-long-ride.github.io',
    });
    assert.equal(url, 'pathname:///engram/zh/docs/intro');

    url = createLocaleUrl({
      ...baseParams,
      pathname: '/engram/zh/docs/intro',
      currentLocaleBaseUrl: '/engram/zh/',
      targetLocaleBaseUrl: '/engram/ru/',
      targetLocaleUrl: 'https://the-long-ride.github.io',
    });
    assert.equal(url, 'pathname:///engram/ru/docs/intro');
  });
});

describe('inferCurrentLocaleBaseUrl', () => {
  const localeConfigs = {
    en: { baseUrl: '/engram/' },
    vi: { baseUrl: '/engram/vi/' },
    es: { baseUrl: '/engram/es/' },
    fr: { baseUrl: '/engram/fr/' },
    zh: { baseUrl: '/engram/zh/' },
    ko: { baseUrl: '/engram/ko/' },
    ja: { baseUrl: '/engram/ja/' },
    ru: { baseUrl: '/engram/ru/' },
  };

  it('infers default locale from root path', () => {
    assert.equal(
      inferCurrentLocaleBaseUrl({
        pathname: '/engram/',
        localeConfigs,
        currentLocale: 'en',
      }),
      '/engram/',
    );
  });

  it('infers default locale from root path without trailing slash', () => {
    assert.equal(
      inferCurrentLocaleBaseUrl({
        pathname: '/engram',
        localeConfigs,
        currentLocale: 'en',
      }),
      '/engram/',
    );
  });

  it('infers non-default locale from path prefix', () => {
    assert.equal(
      inferCurrentLocaleBaseUrl({
        pathname: '/engram/ja/docs/intro',
        localeConfigs,
        currentLocale: 'en',
      }),
      '/engram/ja/',
    );
  });

  it('infers non-default locale from root locale path', () => {
    assert.equal(
      inferCurrentLocaleBaseUrl({
        pathname: '/engram/vi/',
        localeConfigs,
        currentLocale: 'en',
      }),
      '/engram/vi/',
    );
  });

  it('infers non-default locale from root locale path without trailing slash', () => {
    assert.equal(
      inferCurrentLocaleBaseUrl({
        pathname: '/engram/vi',
        localeConfigs,
        currentLocale: 'en',
      }),
      '/engram/vi/',
    );
  });

  it('falls back to currentLocale if pathname has no matching prefix', () => {
    assert.equal(
      inferCurrentLocaleBaseUrl({
        pathname: '/other/prefix/docs',
        localeConfigs,
        currentLocale: 'en',
      }),
      '/engram/',
    );
  });
});

