import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import EntryFieldTable from './EntryFieldTable';
import {ENTRY_FIELDS, entryFieldsByGroup} from '../data/entryFields';

describe('EntryFieldTable', () => {
  it('renders all 48 entry fields when no group is specified', () => {
    const markup = renderToStaticMarkup(<EntryFieldTable />);
    const tbodyMatch = markup.match(/<tbody>([\s\S]*?)<\/tbody>/);

    assert.ok(tbodyMatch, 'expected table body to render');
    const rowCount = (tbodyMatch[1].match(/<tr>/g) ?? []).length;
    assert.equal(ENTRY_FIELDS.length, 48);
    assert.equal(rowCount, 48);
    assert.match(markup, /<code>enabled<\/code>/);
    assert.match(markup, /<code>load\.working_ttl_days<\/code>/);
  });

  it('renders only fields belonging to the requested group', () => {
    const markup = renderToStaticMarkup(<EntryFieldTable group="Core" />);
    const tbodyMatch = markup.match(/<tbody>([\s\S]*?)<\/tbody>/);

    assert.ok(tbodyMatch, 'expected table body to render');
    const rowCount = (tbodyMatch[1].match(/<tr>/g) ?? []).length;
    assert.equal(rowCount, entryFieldsByGroup('Core').length);
    assert.match(markup, /<code>enabled<\/code>/);
    assert.doesNotMatch(markup, /<code>load\.working_ttl_days<\/code>/);
  });
});
