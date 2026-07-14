import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryDiff } from '../../src/core/web/app/components/MemoryDiff.js';

test('highlights removed and added lines between current and proposed memory', () => {
  render(<MemoryDiff current={'Keep this\nRemove this'} proposed={'Keep this\nAdd this'} />);

  expect(screen.getByText('- Remove this')).toHaveClass('memory-diff-line-removed');
  expect(screen.getByText('+ Add this')).toHaveClass('memory-diff-line-added');
  expect(screen.getAllByText(/Keep this/)[0]).toHaveClass('memory-diff-line-unchanged');
});
