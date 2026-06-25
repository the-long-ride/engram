import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { App } from '../../src/core/web/app/App.js';
import * as api from '../../src/core/web/app/api-client.js';

// Mock the api-client methods
jest.mock('../../src/core/web/app/api-client.js', () => {
  return {
    loadPanelData: jest.fn(),
    initializeWorkspace: jest.fn(),
    shutdownServer: jest.fn(),
    saveConfigPatch: jest.fn(),
  };
});

describe('App Component', () => {
  const mockPanelData = {
    version: '0.0.20',
    latestVersion: '',
    cwd: '/path/to/cwd',
    isInitialized: true,
    sqliteUnavailable: false,
    config: {
      theme: 'dark',
      global_git: { enabled: true, remote: 'origin', remote_url: '', branch: 'main', auto_sync: true, auto_resolve: true },
      rule_variants: { enabled: false, active: 'balanced' },
      load: { limit: 4 },
      graph: { enabled: true, max_related: 4, min_related_score: 0.22 },
    },
    profiles: [
      { name: 'default', globalPath: '/path/to/global', active: true },
    ],
    workspaces: [
      { path: '/path/to/cwd', linked: true, name: 'default' },
    ],
    fields: [
      { key: 'global_git.remote_url', group: 'Global Git', label: 'Remote URL', input: 'text', risk: 'risky' },
    ],
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('renders loading screen initially then loads and renders Sidebar and tabs', async () => {
    (api.loadPanelData as jest.Mock).mockResolvedValue(mockPanelData);

    render(<App />);

    // Verify loading indicator is present initially
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // Wait for the panel data to load
    await waitFor(() => {
      expect(screen.getAllByText('/path/to/cwd')[0]).toBeInTheDocument();
    });

    // Verify sidebar is rendered
    expect(screen.getAllByText('Construct')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Runtime')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Core')[0]).toBeInTheDocument();
  });

  test('renders error state on fetch failure', async () => {
    (api.loadPanelData as jest.Mock).mockRejectedValue(new Error('Connection timeout'));

    render(<App />);

    await waitFor(() => {
      expect(screen.getAllByText('Load failed: Connection timeout').length).toBeGreaterThan(0);
    });

    // Click retry should fetch again
    (api.loadPanelData as jest.Mock).mockResolvedValue(mockPanelData);
    const retryBtn = screen.getByRole('button', { name: 'Retry' });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getAllByText('/path/to/cwd')[0]).toBeInTheDocument();
    });
  });

  test('shows InitBanner when workspace is not initialized', async () => {
    const uninitData = { ...mockPanelData, isInitialized: false };
    (api.loadPanelData as jest.Mock).mockResolvedValue(uninitData);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Workspace Not Initialized')).toBeInTheDocument();
    });

    (api.initializeWorkspace as jest.Mock).mockResolvedValue({ ok: true, message: 'Done' });
    const initBtn = screen.getByRole('button', { name: 'Initialize Workspace' });
    fireEvent.click(initBtn);

    await waitFor(() => {
      expect(api.initializeWorkspace).toHaveBeenCalled();
    });
  });

  test('toggles document light class on theme change', async () => {
    (api.loadPanelData as jest.Mock).mockResolvedValue(mockPanelData);

    render(<App />);

    await waitFor(() => {
      expect(screen.getAllByText('/path/to/cwd')[0]).toBeInTheDocument();
    });

    const darkToggle = screen.getAllByRole('button').find(btn => btn.className.includes('tgl'))!;
    fireEvent.click(darkToggle);

    await waitFor(() => {
      expect(api.saveConfigPatch).toHaveBeenCalledWith({ theme: 'light' });
    });
  });
});
