import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {DocPageCopyNavbarItemView} from './DocPageCopyNavbarItemView';

describe('DocPageCopyNavbarItemView', () => {
  const sharedProps = {
    pathname: '/engram/docs/future/entry/core',
    baseUrl: '/engram/',
    locales: ['en', 'es'],
    defaultLocale: 'en',
    currentVersionPath: 'future',
    publishedVersionName: 'version-0.0.28',
  };

  it('does not render outside docs routes', () => {
    const markup = renderToStaticMarkup(
      <DocPageCopyNavbarItemView
        {...sharedProps}
        pathname="/engram/blog/intro"
      />,
    );

    assert.equal(markup, '');
  });

  it('renders as navbar item on desktop docs routes', () => {
    const markup = renderToStaticMarkup(
      <DocPageCopyNavbarItemView {...sharedProps} hasActiveDoc />,
    );

    assert.match(markup, /navbar__item/);
    assert.match(markup, /Copy markdown/);
    assert.match(markup, /doc-page-copy-button__icon/);
  });

  it('renders as menu item on mobile docs routes', () => {
    const markup = renderToStaticMarkup(
      <DocPageCopyNavbarItemView {...sharedProps} hasActiveDoc mobile />,
    );

    assert.match(markup, /menu__list-item/);
    assert.match(markup, /Copy markdown/);
  });

  it('does not render on docs-route misses without active doc metadata', () => {
    const markup = renderToStaticMarkup(
      <DocPageCopyNavbarItemView
        {...sharedProps}
        pathname="/engram/docs/future/missing-page"
        hasActiveDoc={false}
      />,
    );

    assert.equal(markup, '');
  });
});
