import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {DocPageCopyButton} from './DocPageCopyButton';

describe('DocPageCopyButton', () => {
  it('does not render when source is missing', () => {
    assert.equal(renderToStaticMarkup(<DocPageCopyButton source={null} />), '');
  });

  it('renders a markdown copy button with icon for supported doc sources', () => {
    const markup = renderToStaticMarkup(
      <DocPageCopyButton source="@site/docs/entry/core.md" />,
    );

    assert.match(markup, /Copy markdown/);
    assert.match(markup, /button/);
    assert.match(markup, /doc-page-copy-button__icon/);
  });

  it('renders a markdown copy button for supported doc pathnames', () => {
    const markup = renderToStaticMarkup(
      <DocPageCopyButton
        source={null}
        pathname="/engram/es/docs/future/entry/core"
        baseUrl="/engram/"
        locales={['en', 'es']}
        defaultLocale="en"
        currentVersionPath="future"
        publishedVersionName="version-0.0.28"
      />,
    );

    assert.match(markup, /Copy markdown/);
    assert.match(markup, /button/);
  });
});
