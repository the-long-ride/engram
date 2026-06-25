import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { MemoryDetail } from '../../src/core/web/app/memories/MemoryDetail.js';
import { MemoryGraph } from '../../src/core/web/app/memories/MemoryGraph.js';
import { layoutMemoryGraph, edgePath } from '../../src/core/web/app/memories/graph-layout.js';
import * as api from '../../src/core/web/app/api-client.js';

// Mock api-client
jest.mock('../../src/core/web/app/api-client.js', () => {
  return {
    getJson: jest.fn(),
    postJson: jest.fn(),
  };
});

describe('MemoryDetail', () => {
  const mockNode = {
    id: 'node-1',
    memoryId: 'mem-1',
    label: 'Label 1',
    profile: 'personal',
    scope: 'global',
    file: 'file1.md',
    summary: 'Summary Text',
    canEdit: true,
    canDelete: true,
  } as any;

  beforeEach(() => {
    (api.getJson as jest.Mock).mockReset();
  });

  test('renders prompt to select a memory when node is null', () => {
    render(
      <MemoryDetail
        node={null}
        view={jest.fn()}
        editMemoryFromGraph={jest.fn()}
        archiveMemoryFromGraph={jest.fn()}
        toast={jest.fn()}
      />
    );
    expect(screen.getByText('Select a memory.')).toBeInTheDocument();
  });

  test('loads content from API and handles copy, edit, delete actions', async () => {
    (api.getJson as jest.Mock).mockResolvedValue({ content: 'Detailed memory content here' });
    const toastMock = jest.fn();
    const editMock = jest.fn();
    const deleteMock = jest.fn();

    const writeTextMock = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    render(
      <MemoryDetail
        node={mockNode}
        view={jest.fn()}
        editMemoryFromGraph={editMock}
        archiveMemoryFromGraph={deleteMock}
        toast={toastMock}
      />
    );

    // Initial loading
    expect(screen.getByText('Loading content...')).toBeInTheDocument();

    // After load
    await waitFor(() => {
      expect(screen.getByText('Detailed memory content here')).toBeInTheDocument();
    });

    expect(api.getJson).toHaveBeenCalledWith(
      '/api/memory?profile=personal&scope=global&file=file1.md'
    );

    // Test Copy
    const copyBtn = screen.getByRole('button', { name: 'Copy' });
    fireEvent.click(copyBtn);
    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith('Detailed memory content here');
      expect(toastMock).toHaveBeenCalledWith('Copied memory');
    });

    // Test Edit
    const editBtn = screen.getByRole('button', { name: 'Edit' });
    fireEvent.click(editBtn);
    expect(editMock).toHaveBeenCalledWith(mockNode);

    // Test Delete
    const deleteBtn = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(deleteBtn);
    expect(deleteMock).toHaveBeenCalledWith(mockNode);
  });

  test('displays API errors nicely', async () => {
    (api.getJson as jest.Mock).mockRejectedValue(new Error('Failed to fetch details'));
    const toastMock = jest.fn();

    render(
      <MemoryDetail
        node={mockNode}
        view={jest.fn()}
        editMemoryFromGraph={jest.fn()}
        archiveMemoryFromGraph={jest.fn()}
        toast={toastMock}
      />
    );

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith('Failed to fetch details', false);
    });
  });
});

describe('MemoryGraph and graph-layout', () => {
  const mockNodes = [
    { id: '1', memoryId: 'mem-1', label: 'Mem 1', profile: 'default', sourceScope: 'global', file: 'file1.md', summary: 'Summary 1', canEdit: true, canDelete: true },
    { id: '2', memoryId: 'mem-2', label: 'Mem 2', profile: 'default', sourceScope: 'workspace', file: 'file2.md', summary: 'Summary 2', canEdit: true, canDelete: true }
  ] as any[];

  const mockLinks = [
    { from: '1', to: '2', kind: 'dependency', thin: false, label: 'depends' }
  ] as any[];

  test('renders empty state when nodes are empty', () => {
    render(<MemoryGraph nodes={[]} links={[]} selectedId="" select={jest.fn()} />);
    expect(screen.getByText('No memories found for this scope.')).toBeInTheDocument();
  });

  test('renders graph nodes, edges and handles zoom, reset, fullscreen controls', () => {
    const selectMock = jest.fn();
    const { container } = render(
      <MemoryGraph nodes={mockNodes} links={mockLinks} selectedId="1" select={selectMock} />
    );

    // Verify nodes are rendered
    expect(screen.getByText('mem-1')).toBeInTheDocument();
    expect(screen.getByText('mem-2')).toBeInTheDocument();

    // Verify zoom controls are rendered
    const zoomInBtn = screen.getByRole('button', { name: 'Zoom in' });
    const zoomOutBtn = screen.getByRole('button', { name: 'Zoom out' });
    const resetBtn = screen.getByRole('button', { name: 'Reset view' });
    const fullscreenBtn = screen.getByRole('button', { name: 'Toggle fullscreen' });

    fireEvent.click(zoomInBtn);
    fireEvent.click(zoomOutBtn);
    fireEvent.click(fullscreenBtn);
    expect(container.querySelector('.memories-graph')).toHaveClass('fullscreen');

    fireEvent.click(fullscreenBtn);
    expect(container.querySelector('.memories-graph')).not.toHaveClass('fullscreen');

    // Click node to select it
    const node1 = container.querySelector('#\\31 ') as HTMLButtonElement; // selector for ID "1"
    fireEvent.click(node1);
    expect(selectMock).toHaveBeenCalledWith('1');

    // Clear highlight button appears
    const clearBtn = screen.getByRole('button', { name: 'Clear highlight' });
    expect(clearBtn).toBeVisible();
    fireEvent.click(clearBtn);
    expect(clearBtn).not.toBeVisible();

    // Reset view
    fireEvent.click(resetBtn);
  });

  test('layoutMemoryGraph generates positions and sizes correctly', () => {
    const result = layoutMemoryGraph(mockNodes, mockLinks);
    expect(result.positions['1']).toBeDefined();
    expect(result.positions['2']).toBeDefined();
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);

    const fromBox = result.positions['1'];
    const toBox = result.positions['2'];
    const pathStr = edgePath(fromBox, toBox);
    expect(pathStr).toContain('M');
    expect(pathStr).toContain('Q');
  });
});
