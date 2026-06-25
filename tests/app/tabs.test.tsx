import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { ConfigTab } from '../../src/core/web/app/tabs/ConfigTab.js';
import { RuntimeTab } from '../../src/core/web/app/tabs/RuntimeTab.js';
import { CoreTab } from '../../src/core/web/app/tabs/CoreTab.js';
import { MemoriesTab } from '../../src/core/web/app/tabs/MemoriesTab.js';
import { ProfilesTab } from '../../src/core/web/app/tabs/ProfilesTab.js';
import { WorkspacesTab } from '../../src/core/web/app/tabs/WorkspacesTab.js';
import { ConnectionsTab } from '../../src/core/web/app/tabs/ConnectionsTab.js';

import * as api from '../../src/core/web/app/api-client.js';

// Mock the API calls
jest.mock('../../src/core/web/app/api-client.js', () => {
  return {
    saveConfigPatch: jest.fn(),
    validateConfigPatch: jest.fn(),
    getJson: jest.fn(),
    postJson: jest.fn(),
  };
});

describe('ConfigTab', () => {
  const mockData = {
    config: {
      global_git: { branch: 'main' },
    },
    configFields: [
      { key: 'global_git.branch', group: 'Global Git', label: 'Branch', input: 'text', risk: 'risky' },
    ],
  } as any;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('handles config change, review, and save flow', async () => {
    const reloadMock = jest.fn().mockResolvedValue(undefined);
    const toastMock = jest.fn();
    (api.validateConfigPatch as jest.Mock).mockResolvedValue({ ok: true, riskyKeys: [] });
    (api.saveConfigPatch as jest.Mock).mockResolvedValue({ ok: true, message: 'Saved successfully' });

    const { container } = render(<ConfigTab data={mockData} reload={reloadMock} toast={toastMock} />);

    // Check input displays default value
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('main');

    // Change input value and blur to trigger dirty state change
    fireEvent.change(input, { target: { value: 'dev' } });
    fireEvent.blur(input);
    expect(input.value).toBe('dev');

    // Check review button (named 'Save changes') is present and clickable
    const reviewBtn = screen.getByRole('button', { name: 'Save changes' });
    fireEvent.click(reviewBtn);

    await waitFor(() => {
      expect(api.validateConfigPatch).toHaveBeenCalled();
    });

    // Save button inside modal is also named 'Save changes'
    let saveBtn: HTMLButtonElement;
    await waitFor(() => {
      const saveBtns = screen.getAllByRole('button', { name: 'Save changes' });
      expect(saveBtns.length).toBe(2);
      saveBtn = saveBtns[1] as HTMLButtonElement;
    });
    fireEvent.click(saveBtn!);


    await waitFor(() => {
      expect(api.saveConfigPatch).toHaveBeenCalledWith({ 'global_git.branch': 'dev' });
      expect(toastMock).toHaveBeenCalledWith('Saved successfully');
      expect(reloadMock).toHaveBeenCalled();
    });
  });

  test('allows resetting a dirty field', () => {
    const { container } = render(<ConfigTab data={mockData} reload={jest.fn()} toast={jest.fn()} />);

    const input = container.querySelector('input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'dev' } });
    fireEvent.blur(input);
    expect(input.value).toBe('dev');

    const resetBtn = container.querySelector('.cfg-reset') as HTMLButtonElement;
    fireEvent.click(resetBtn);
    expect(input.value).toBe('main');
  });
});

describe('RuntimeTab', () => {
  const mockData = {
    sqliteUnavailable: false,
    runtime: [
      {
        group: 'Load',
        rows: [
          ['load.limit', 12]
        ]
      }
    ]
  } as any;

  test('displays theme and configuration values and handles copying', async () => {
    const toastMock = jest.fn();
    const writeTextMock = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    render(<RuntimeTab data={mockData} toast={toastMock} />);
    expect(screen.getByText('12')).toBeInTheDocument();

    const valBtn = screen.getByRole('button', { name: '12' });
    fireEvent.click(valBtn);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith('12');
      expect(screen.getByText('Copied')).toBeInTheDocument();
    });
  });
});

describe('CoreTab', () => {
  const mockCoreData = {
    warning: 'Some warning',
    scope: { activeProfile: 'my-profile' },
    relationship: { links: [{ kind: 'duplicate' }] },
    duplicates: [
      {
        score: 0.95,
        method: 'hash',
        a: { id: 'mem-a', profile: 'default', scope: 'global', file: 'rule1.md', summary: 'Summary A' },
        b: { id: 'mem-b', profile: 'default', scope: 'workspace', file: 'rule2.md', summary: 'Summary B' },
      }
    ],
    prompts: {
      resolveDuplicates: 'resolve prompt text',
      metacognize: 'metacognize prompt text',
    }
  };

  beforeEach(() => {
    (api.getJson as jest.Mock).mockReset();
    (api.postJson as jest.Mock).mockReset();
  });

  test('renders Core Tab title, warning, duplicate candidates and handles actions', async () => {
    (api.getJson as jest.Mock).mockResolvedValue(mockCoreData);
    (api.postJson as jest.Mock).mockResolvedValue(mockCoreData);

    const toastMock = jest.fn();
    const modalMock = {
      open: jest.fn(),
      close: jest.fn(),
    };

    const { container } = render(<CoreTab active={true} toast={toastMock} modal={modalMock} />);

    // Wait for core data load and render
    await waitFor(() => {
      expect(screen.getByText('Some warning')).toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { level: 1, name: 'Core' })).toBeInTheDocument();
    expect(screen.getByText('Active profile: my-profile')).toBeInTheDocument();
    expect(screen.getByText('95%')).toBeInTheDocument();

    // Toggle chip
    const profileChip = screen.getAllByText('Profile')[0];
    fireEvent.click(profileChip);
    await waitFor(() => {
      expect(api.postJson).toHaveBeenCalledWith('/api/core', expect.objectContaining({
        scopes: ['global', 'workspace']
      }));
    });

    // Toggle semantic candidates div (core-check)
    const checkDiv = container.querySelector('.core-check') as HTMLDivElement;
    fireEvent.click(checkDiv);
    await waitFor(() => {
      expect(api.postJson).toHaveBeenCalledWith('/api/core', expect.objectContaining({
        semantic: true
      }));
    });

    // Refresh button
    const refreshBtn = screen.getByRole('button', { name: 'Refresh' });
    fireEvent.click(refreshBtn);
    await waitFor(() => {
      expect(api.postJson).toHaveBeenCalledWith('/api/core', expect.objectContaining({
        rebuild: true
      }));
    });

    // Preview prompt modal click
    const previewBtn = screen.getAllByRole('button', { name: 'Preview' })[0];
    fireEvent.click(previewBtn);
    expect(modalMock.open).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Resolve duplicate memories'
    }));
  });
});

describe('MemoriesTab', () => {
  const mockMemoriesData = {
    stats: { total: 1 },
    nodes: [
      { id: '1', memoryId: 'mem-1', label: 'Mem 1', profile: 'default', scope: 'global', file: 'file1.md', summary: 'Summary 1' }
    ],
    links: []
  };

  beforeEach(() => {
    (api.getJson as jest.Mock).mockReset();
    (api.postJson as jest.Mock).mockReset();
  });

  test('renders Memories Tab and handles toggles and reload', async () => {
    (api.getJson as jest.Mock).mockResolvedValue(mockMemoriesData);
    (api.postJson as jest.Mock).mockResolvedValue(mockMemoriesData);

    const toastMock = jest.fn();
    const modalMock = {
      open: jest.fn(),
      close: jest.fn(),
    };

    const { container } = render(<MemoriesTab active={true} toast={toastMock} modal={modalMock} />);

    await waitFor(() => {
      expect(screen.getByText('Summary 1')).toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { level: 1, name: 'Memories' })).toBeInTheDocument();

    // Toggle semantic links check div
    const semanticDiv = container.querySelector('.core-check') as HTMLDivElement;
    fireEvent.click(semanticDiv);
    await waitFor(() => {
      expect(api.postJson).toHaveBeenCalledWith('/api/memories', expect.objectContaining({
        semantic: false
      }));
    });

    // Refresh
    const refreshBtn = screen.getByRole('button', { name: 'Refresh' });
    fireEvent.click(refreshBtn);
    await waitFor(() => {
      expect(api.postJson).toHaveBeenCalledWith('/api/memories', expect.objectContaining({
        rebuild: true
      }));
    });
  });
});

describe('ProfilesTab', () => {
  const mockData = {
    profiles: [
      { name: 'personal', globalPath: '/path/personal', active: true },
      { name: 'work', globalPath: '/path/work', active: false },
    ],
  } as any;

  beforeEach(() => {
    (api.postJson as jest.Mock).mockReset();
  });

  test('renders profiles and allows adding, activating, and deleting', async () => {
    (api.postJson as jest.Mock).mockResolvedValue({ message: 'Success' });
    const reloadMock = jest.fn().mockResolvedValue(undefined);
    const toastMock = jest.fn();

    const { container } = render(<ProfilesTab data={mockData} reload={reloadMock} toast={toastMock} />);
    expect(screen.getByText('personal')).toBeInTheDocument();
    expect(screen.getByText('work')).toBeInTheDocument();

    // Toggle add form
    const addBtn = screen.getByRole('button', { name: 'Add Profile' });
    fireEvent.click(addBtn);
    expect(container.querySelector('.add-form-row')).toHaveClass('open');

    // Type name and path
    const nameInput = container.querySelectorAll('input')[0];
    const pathInput = container.querySelectorAll('input')[1];
    fireEvent.change(nameInput, { target: { value: 'school' } });
    fireEvent.change(pathInput, { target: { value: '/path/school' } });

    // Save profile
    const saveBtn = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveBtn);
    await waitFor(() => {
      expect(api.postJson).toHaveBeenCalledWith('/api/profile/add', { name: 'school', globalPath: '/path/school', scope: 'global' });
      expect(toastMock).toHaveBeenCalledWith('Success');
      expect(reloadMock).toHaveBeenCalled();
    });

    // Activate profile
    const activateBtn = screen.getAllByRole('button', { name: 'Activate' })[1];
    fireEvent.click(activateBtn);
    await waitFor(() => {
      expect(api.postJson).toHaveBeenCalledWith('/api/profile/activate', { name: 'work' });
    });

    // Delete profile
    const deleteBtn = screen.getAllByRole('button', { name: 'Delete' })[1];
    fireEvent.click(deleteBtn);
    await waitFor(() => {
      expect(api.postJson).toHaveBeenCalledWith('/api/profile/remove', { name: 'work' });
    });
  });
});

describe('WorkspacesTab', () => {
  const mockData = {
    workspaces: [
      { path: '/path/cwd', linked: true, name: 'personal' },
    ],
  } as any;

  beforeEach(() => {
    (api.postJson as jest.Mock).mockReset();
  });

  test('renders workspaces and allows adding, linking/unlinking, and deleting', async () => {
    (api.postJson as jest.Mock).mockResolvedValue({ message: 'Done' });
    const reloadMock = jest.fn().mockResolvedValue(undefined);
    const toastMock = jest.fn();
    window.confirm = jest.fn().mockReturnValue(true);

    const { container } = render(<WorkspacesTab data={mockData} reload={reloadMock} toast={toastMock} />);
    expect(screen.getByText('/path/cwd')).toBeInTheDocument();

    // Toggle add form
    const addBtn = screen.getByRole('button', { name: 'Add Workspace' });
    fireEvent.click(addBtn);
    expect(container.querySelector('.add-form-row')).toHaveClass('open');

    // Type in fields
    const nameInput = container.querySelectorAll('input')[0];
    const pathInput = container.querySelectorAll('input')[1];
    fireEvent.change(nameInput, { target: { value: 'college' } });
    fireEvent.change(pathInput, { target: { value: '/path/college' } });

    // Save workspace
    const saveBtn = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveBtn);
    await waitFor(() => {
      expect(api.postJson).toHaveBeenCalledWith('/api/workspace/add', { name: 'college', path: '/path/college' });
    });

    // Unlink workspace
    const unlinkBtn = screen.getByRole('button', { name: 'Unlink' });
    fireEvent.click(unlinkBtn);
    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith('Unlink workspace?');
      expect(api.postJson).toHaveBeenCalledWith('/api/workspace/link', { path: '/path/cwd', linked: false });
    });

    // Delete workspace
    const deleteBtn = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(deleteBtn);
    await waitFor(() => {
      expect(api.postJson).toHaveBeenCalledWith('/api/workspace/remove', { path: '/path/cwd' });
    });
  });
});

describe('ConnectionsTab', () => {
  beforeEach(() => {
    (api.getJson as jest.Mock).mockReset();
    (api.postJson as jest.Mock).mockReset();
  });

  test('displays connections, link, and unlink agents', async () => {
    (api.getJson as jest.Mock).mockResolvedValue({
      data: [
        { id: 'agent-1', name: 'Agent One', detected: true, description: 'Cool agent', workspaceLinked: false, globalLinked: true }
      ]
    });
    
    const toastMock = jest.fn();
    const { container } = render(<ConnectionsTab active={true} toast={toastMock} />);
    
    // Wait for agents list to load
    await waitFor(() => {
      expect(screen.getByText('Agent One')).toBeInTheDocument();
    });
    
    // Link Workspace agent
    (api.postJson as jest.Mock).mockResolvedValueOnce({ message: 'Connected' });
    const toggles = container.querySelectorAll('.tgl');
    // The first toggle is Workspace (currently false/off)
    // The second toggle is Global (currently true/on)
    
    fireEvent.click(toggles[0]);
    await waitFor(() => {
      expect(api.postJson).toHaveBeenCalledWith('/api/agents/link', { agentId: 'agent-1', global: false });
      expect(toastMock).toHaveBeenCalledWith('Connected');
    });
    
    // Unlink Global agent
    (api.postJson as jest.Mock).mockResolvedValueOnce({ message: 'Disconnected' });
    window.confirm = jest.fn().mockReturnValue(true);
    fireEvent.click(toggles[1]);
    await waitFor(() => {
      expect(api.postJson).toHaveBeenCalledWith('/api/agents/unlink', { agentId: 'agent-1', global: true });
      expect(toastMock).toHaveBeenCalledWith('Disconnected');
    });
  });
});
