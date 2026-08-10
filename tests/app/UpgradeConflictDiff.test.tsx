import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { UpgradeConflictDiff } from '../../src/core/web/app/components/UpgradeConflictDiff.js';

test('defaults to inline and marks removed, added, and unchanged lines', () => {
  render(<UpgradeConflictDiff current={'keep\nold'} proposed={'keep\nnew'} />);

  expect(screen.getByRole('tablist', { name: 'Diff layout' })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Inline' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('tab', { name: 'Parallel' })).toHaveAttribute('aria-selected', 'false');
  expect(screen.getByText('- old')).toHaveClass('upgrade-diff-line--removed');
  expect(screen.getByText('+ new')).toHaveClass('upgrade-diff-line--added');
  expect(screen.getByText('keep')).toHaveClass('upgrade-diff-line--unchanged');
});

test('parallel mode aligns current and proposed replacement cells', () => {
  render(<UpgradeConflictDiff current={'keep\nold\ntail'} proposed={'keep\nnew\ntail'} />);
  fireEvent.click(screen.getByRole('tab', { name: 'Parallel' }));

  expect(screen.getByRole('tab', { name: 'Parallel' })).toHaveAttribute('aria-selected', 'true');
  const parallel = screen.getByLabelText('Parallel conflict diff');
  expect(within(parallel).getByText('old')).toHaveClass('upgrade-diff-cell--removed');
  expect(within(parallel).getByText('new')).toHaveClass('upgrade-diff-cell--added');
  expect(within(parallel).getAllByText('keep')).toHaveLength(2);
  expect(within(parallel).getByText('Current')).toBeInTheDocument();
  expect(within(parallel).getByText('Proposed')).toBeInTheDocument();
});

test('shows an explicit no-change state for normalized-equal content', () => {
  render(<UpgradeConflictDiff current={'a\r\nb'} proposed={'a\nb'} />);
  expect(screen.getByText('(no changes)')).toBeInTheDocument();
});

test('switching diff layouts does not mutate source content', () => {
  const current = 'one\ntwo';
  const proposed = 'one\nthree';
  const { rerender } = render(<UpgradeConflictDiff current={current} proposed={proposed} />);
  fireEvent.click(screen.getByRole('tab', { name: 'Parallel' }));
  rerender(<UpgradeConflictDiff current={current} proposed={'one\nfour'} />);
  expect(screen.getByRole('tab', { name: 'Parallel' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByText('four')).toHaveClass('upgrade-diff-cell--added');
});
