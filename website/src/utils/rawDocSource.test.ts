import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {
  copyDocPathnameContent,
  copyDocSourceContent,
  resolveDocPathnameAssetCandidates,
  resolvePublicDocSourceUrl,
} from './rawDocSource';

describe('resolvePublicDocSourceUrl', () => {
  it('maps current docs files to the built public asset URL', () => {
    assert.equal(
      resolvePublicDocSourceUrl('@site/docs/entry/core.md', '/engram/'),
      '/engram/entry/core.md',
    );
  });

  it('maps versioned docs files to the built public asset URL', () => {
    assert.equal(
      resolvePublicDocSourceUrl(
        '@site/versioned_docs/version-0.0.27/entry/core.md',
        '/engram/',
      ),
      '/engram/version-0.0.27/entry/core.md',
    );
  });

  it('returns null for unsupported sources', () => {
    assert.equal(
      resolvePublicDocSourceUrl('@site/src/pages/index.tsx', '/engram/'),
      null,
    );
  });
});

describe('copyDocSourceContent', () => {
  it('fetches raw doc content and writes it to clipboard', async () => {
    let copied = '';
    const result = await copyDocSourceContent({
      source: '@site/docs/entry/core.md',
      baseUrl: '/engram/',
      fetchImpl: async (input) =>
        new Response('# Heading\n\n```ts\nconst x = 1;\n```\n', {
          status: 200,
          statusText: 'OK',
        }),
      writeText: async (text) => {
        copied = text;
      },
    });

    assert.equal(result, 'copied');
    assert.equal(copied, '# Heading\n\n```ts\nconst x = 1;\n```\n');
  });

  it('uses locale-specific public doc asset when locale is active', async () => {
    let fetchedUrl = '';

    await copyDocSourceContent({
      source: '@site/docs/entry/core.md',
      baseUrl: '/engram/',
      locale: 'es',
      defaultLocale: 'en',
      fetchImpl: async (input: RequestInfo | URL) => {
        fetchedUrl = String(input);
        return new Response('# Encabezado\n', {status: 200});
      },
      writeText: async () => {},
    } as any);

    assert.equal(fetchedUrl, '/engram/es/entry/core.md');
  });

  it('throws for unsupported source paths', async () => {
    await assert.rejects(
      () =>
        copyDocSourceContent({
          source: '@site/src/pages/index.tsx',
          baseUrl: '/engram/',
          fetchImpl: async () => new Response('', {status: 200}),
          writeText: async () => {},
        }),
      /Unsupported doc source/,
    );
  });
});

describe('resolveDocPathnameAssetCandidates', () => {
  it('maps current-version docs routes to built current-doc asset candidates', () => {
    assert.deepEqual(
      resolveDocPathnameAssetCandidates('/engram/docs/future/entry/core', {
        baseUrl: '/engram/',
      }).slice(0, 2),
      [
        '/engram/entry/core.md',
        '/engram/entry/core/index.md',
      ],
    );
  });

  it('maps published docs routes to built versioned-doc asset candidates', () => {
    assert.deepEqual(
      resolveDocPathnameAssetCandidates('/engram/docs/entry/core', {
        baseUrl: '/engram/',
      }).slice(0, 2),
      [
        '/engram/version-0.0.27/entry/core.md',
        '/engram/version-0.0.27/entry/core/index.md',
      ],
    );
  });

  it('keeps locale prefix for current-version docs routes', () => {
    assert.deepEqual(
      resolveDocPathnameAssetCandidates('/engram/es/docs/future/entry/core', {
        baseUrl: '/engram/',
        locales: ['en', 'es', 'vi'],
        defaultLocale: 'en',
      }).slice(0, 2),
      [
        '/engram/es/entry/core.md',
        '/engram/es/entry/core/index.md',
      ],
    );
  });

  it('keeps locale prefix for published docs routes', () => {
    assert.deepEqual(
      resolveDocPathnameAssetCandidates('/engram/es/docs/entry/core', {
        baseUrl: '/engram/',
        locales: ['en', 'es', 'vi'],
        defaultLocale: 'en',
      }).slice(0, 2),
      [
        '/engram/es/version-0.0.27/entry/core.md',
        '/engram/es/version-0.0.27/entry/core/index.md',
      ],
    );
  });
});

describe('copyDocPathnameContent', () => {
  it('tries pathname candidates until it finds a backing doc file', async () => {
    const seen: string[] = [];
    let copied = '';

    const result = await copyDocPathnameContent({
      pathname: '/engram/docs/entry/core',
      baseUrl: '/engram/',
      fetchImpl: async (input) => {
        seen.push(String(input));
        if (String(input).endsWith('/entry/core.md')) {
          return new Response('# Core page\n', {status: 200});
        }
        return new Response('', {status: 404});
      },
      writeText: async (text) => {
        copied = text;
      },
    });

    assert.equal(result, 'copied');
    assert.equal(copied, '# Core page\n');
    assert.equal(seen[0], '/engram/version-0.0.27/entry/core.md');
  });

  it('throws when no pathname candidate exists on built site', async () => {
    await assert.rejects(
      () =>
        copyDocPathnameContent({
          pathname: '/engram/es/docs/entry/missing',
          baseUrl: '/engram/',
          locales: ['en', 'es'],
          defaultLocale: 'en',
          fetchImpl: async () => new Response('', {status: 404}),
          writeText: async () => {},
        }),
      /Failed to fetch doc source for pathname/,
    );
  });
});
