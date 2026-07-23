import React from 'react';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';

import { ConfigTab } from '../../src/core/web/app/tabs/ConfigTab.js';
import { POLICY_FIELD_META } from '../../src/core/web/app/data/policy-fields.js';
import { RuntimeTab } from '../../src/core/web/app/tabs/RuntimeTab.js';
import { CoreTab } from '../../src/core/web/app/tabs/CoreTab.js';
import { MemoriesTab } from '../../src/core/web/app/tabs/MemoriesTab.js';
import { ProfilesTab } from '../../src/core/web/app/tabs/ProfilesTab.js';
import { WorkspacesTab } from '../../src/core/web/app/tabs/WorkspacesTab.js';
import { ConnectionsTab } from '../../src/core/web/app/tabs/ConnectionsTab.js';
import { ReviewTab } from '../../src/core/web/app/tabs/ReviewTab.js';

import * as api from '../../src/core/web/app/api-client.js';

// Mock the API calls
jest.mock('../../src/core/web/app/api-client.js', () => {
  return {
    saveConfigPatch: jest.fn(),
    validateConfigPatch: jest.fn(),
    getJson: jest.fn(),
    postJson: jest.fn(),
    reviewQueue: jest.fn(),
    reviewInspect: jest.fn(),
    reviewPreview: jest.fn(),
    reviewWrite: jest.fn(),
  };
});

describe('ReviewTab', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (api.reviewPreview as jest.Mock).mockResolvedValue({ data: { previews: [] } });
    (api.reviewWrite as jest.Mock).mockResolvedValue({ data: { written: [{ id: 'saved-memory' }], message: 'Memory written' } });
  });

  test('keeps the latest selected finding when inspect responses resolve out of order', async () => {
    let resolveFirst!: (value: unknown) => void;
    const firstInspect = new Promise((resolve) => { resolveFirst = resolve; });
    (api.reviewQueue as jest.Mock).mockResolvedValue({
      data: {
        findings: [
          { id: 'finding-a', kind: 'duplicate', safe_summary: 'Finding A', memory_ids: ['a'] },
          { id: 'finding-b', kind: 'stale', safe_summary: 'Finding B', memory_ids: ['b'] }
        ],
        receipts: []
      }
    });
    (api.reviewInspect as jest.Mock).mockImplementation((id: string) => id === 'finding-a'
      ? firstInspect
      : Promise.resolve({ data: { finding: { id: 'finding-b', kind: 'stale', safe_summary: 'Finding B detail', memory_ids: ['b'] } } }));

    render(<ReviewTab active={true} toast={jest.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: /finding-b/ }));
    expect((await screen.findAllByText('Finding B detail')).length).toBeGreaterThan(0);
    await act(async () => resolveFirst({ data: { finding: { id: 'finding-a', kind: 'duplicate', safe_summary: 'Finding A late detail', memory_ids: ['a'] } } }));
    expect(screen.queryByText('Finding A late detail')).not.toBeInTheDocument();
    expect(screen.getAllByText('Finding B detail').length).toBeGreaterThan(0);
  });

  test('normalizes inbox receipts, builds preview text, and clears relation selections', async () => {
    const toast = jest.fn();
    (api.reviewQueue as jest.Mock).mockResolvedValue({
      data: {
        findings: [],
        receipts: [
          {
            id: 'receipt-a',
            source: 'autosave',
            related_ids: ['dep-1', 'existing-memory'],
            candidate: {
              type: 'workflow',
              text: 'Rotate release signer after build',
              context: 'release runbook',
              triggers: ['release', 'signing'],
              dependsOn: ['dep-1'],
              updateId: 'existing-memory'
            }
          }
        ]
      }
    });
    (api.reviewInspect as jest.Mock).mockResolvedValue({
      data: {
        receipt: {
          id: 'receipt-a',
          source: 'autosave',
          related_ids: ['dep-1', 'existing-memory'],
          candidate: {
            type: 'workflow',
            text: 'Rotate release signer after build',
            context: 'release runbook',
            triggers: ['release', 'signing'],
            dependsOn: ['dep-1'],
            updateId: 'existing-memory'
          }
        }
      }
    });

    render(<ReviewTab active={true} toast={toast} />);

    expect(await screen.findByRole('button', { name: /receipt-a/ })).toBeInTheDocument();
    expect((await screen.findAllByText('autosave: workflow candidate awaiting relation review')).length).toBeGreaterThan(0);
    expect(screen.getByText('TYPE: workflow | TEXT: Rotate release signer after build | ORIGIN: release runbook | TRIGGERS: release, signing | DEPENDS_ON: dep-1 | UPDATE: existing-memory')).toBeInTheDocument();
    expect(screen.getByText('2 related memories')).toBeInTheDocument();
    expect(screen.getByText('No relation selected.')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Mark dependency' })[0]);
    expect(screen.getByText('Depends on')).toBeInTheDocument();
    expect(screen.getAllByText('dep-1').length).toBeGreaterThan(1);

    fireEvent.click(screen.getAllByRole('button', { name: 'Mark replacement' })[0]);
    expect(screen.getByText('Replaces')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Paste AI output'));
    fireEvent.change(screen.getByLabelText('Paste AI output'), { target: { value: 'Draft proposal' } });

    fireEvent.click(screen.getByRole('button', { name: 'Clear preview' }));
    expect(toast).toHaveBeenCalledWith('Review preview cleared');
    expect(screen.getByDisplayValue('')).toBeInTheDocument();
    expect(screen.getByText('No relation selected.')).toBeInTheDocument();
  });

  test('copies an AI review prompt and accepts a pasted response', async () => {
    (api.reviewQueue as jest.Mock).mockResolvedValue({ data: { findings: [{ id: 'finding-a', kind: 'stale', safe_summary: 'Stale memory', memory_ids: ['memory-a'], candidate: { type: 'knowledge', text: 'Generated candidate' } }], receipts: [] } });
    (api.reviewInspect as jest.Mock).mockResolvedValue({ data: { finding: { id: 'finding-a', kind: 'stale', safe_summary: 'Stale memory', memory_ids: ['memory-a'], candidate: { type: 'knowledge', text: 'Generated candidate' } } } });
    (api.reviewPreview as jest.Mock).mockResolvedValue({ data: { previews: [{ id: 'memory-a', kind: 'memory', type: 'knowledge', scope: 'workspace', properties: [], content: 'Current memory' }] } });
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<ReviewTab active={true} toast={jest.fn()} />);

    expect(await screen.findByText('TYPE: knowledge | TEXT: Generated candidate')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Copy review prompt' }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Generated candidate'));

    fireEvent.click(screen.getByText('Paste AI output'));
    fireEvent.change(screen.getByLabelText('Paste AI output'), { target: { value: 'Approved response' } });
    expect(screen.getByText('+ Approved response')).toBeInTheDocument();
  });

  test('requires confirmation before writing the pasted proposal', async () => {
    (api.reviewQueue as jest.Mock).mockResolvedValue({ data: { findings: [{ id: 'finding-a', kind: 'stale', safe_summary: 'Stale memory', memory_ids: ['memory-a'], candidate: { type: 'knowledge', text: 'Generated candidate' } }], receipts: [] } });
    (api.reviewInspect as jest.Mock).mockResolvedValue({ data: { finding: { id: 'finding-a', kind: 'stale', safe_summary: 'Stale memory', memory_ids: ['memory-a'], candidate: { type: 'knowledge', text: 'Generated candidate' } } } });
    (api.reviewPreview as jest.Mock).mockResolvedValue({ data: { previews: [{ id: 'memory-a', kind: 'memory', type: 'knowledge', scope: 'workspace', properties: [], content: 'Current memory' }] } });
    const modal = { open: jest.fn(), close: jest.fn() };

    render(<ReviewTab active={true} toast={jest.fn()} modal={modal} />);
    fireEvent.click(await screen.findByText('Paste AI output'));
    fireEvent.change(screen.getByLabelText('Paste AI output'), { target: { value: 'TYPE: knowledge | TEXT: Approved memory' } });
    fireEvent.click(screen.getByRole('button', { name: 'Write' }));

    expect(modal.open).toHaveBeenCalledWith(expect.objectContaining({ title: 'Write memory?' }));
    const confirmation = modal.open.mock.calls[0][0];
    render(confirmation.actions);
    fireEvent.click(screen.getByRole('button', { name: 'Write memory' }));
    await waitFor(() => expect(api.reviewWrite).toHaveBeenCalledWith(expect.objectContaining({
      proposal: 'TYPE: knowledge | TEXT: Approved memory',
      scope: 'workspace',
      confirmed: true
    })));
  });

  test('loads a memory preview and opens detail modal on Open click', async () => {
    const modalMock = { open: jest.fn(), close: jest.fn() };
    (api.reviewQueue as jest.Mock).mockResolvedValue({ data: { findings: [{ id: 'finding-a', kind: 'stale', safe_summary: 'Stale memory', memory_ids: ['memory-a'] }], receipts: [] } });
    (api.reviewInspect as jest.Mock).mockResolvedValue({ data: { finding: { id: 'finding-a', kind: 'stale', safe_summary: 'Stale memory', memory_ids: ['memory-a'] } } });
    (api.reviewPreview as jest.Mock).mockResolvedValue({ data: { previews: [{ id: 'memory-a', kind: 'memory', type: 'knowledge', scope: 'workspace', file: 'knowledge/memory-a.md', properties: [['type', 'knowledge'], ['updated', '2026-07-14']], content: '## Content\n\nReadable memory body.' }] } });

    render(<ReviewTab active={true} toast={jest.fn()} modal={modalMock} />);

    const openBtn = await screen.findByRole('button', { name: 'Open' });
    expect(openBtn).toBeInTheDocument();
    expect(screen.getAllByText('memory-a').length).toBeGreaterThan(0);

    fireEvent.click(openBtn);
    expect(modalMock.open).toHaveBeenCalledTimes(1);
    expect(modalMock.open).toHaveBeenCalledWith(expect.objectContaining({
      title: 'memory-a',
      copyContent: expect.stringContaining('Readable memory body.')
    }));
  });

  test('shows safe empty states when queue is empty', async () => {
    (api.reviewQueue as jest.Mock).mockResolvedValue({ data: { findings: [], receipts: [] } });

    render(<ReviewTab active={true} toast={jest.fn()} />);

    expect(await screen.findByText('No findings')).toBeInTheDocument();
    expect(screen.getByText('Select an item')).toBeInTheDocument();
    expect(screen.queryByText('(new memory)')).not.toBeInTheDocument();
    expect(screen.queryByText('(empty proposal)')).not.toBeInTheDocument();
  });

  test('renders Compare button when >= 2 memory previews exist and opens CompareModal', async () => {
    (api.reviewQueue as jest.Mock).mockResolvedValue({ data: { findings: [{ id: 'finding-a', kind: 'stale', safe_summary: 'Stale memory', memory_ids: ['mem-1', 'mem-2'] }], receipts: [] } });
    (api.reviewInspect as jest.Mock).mockResolvedValue({ data: { finding: { id: 'finding-a', kind: 'stale', safe_summary: 'Stale memory', memory_ids: ['mem-1', 'mem-2'] } } });
    (api.reviewPreview as jest.Mock).mockResolvedValue({
      data: {
        previews: [
          { id: 'mem-1', kind: 'memory', type: 'rule', scope: 'workspace', file: 'rule-1.md', properties: [['type', 'rule']], content: 'First memory content' },
          { id: 'mem-2', kind: 'memory', type: 'rule', scope: 'global', file: 'rule-2.md', properties: [['type', 'rule']], content: 'Second memory content' }
        ]
      }
    });

    render(<ReviewTab active={true} toast={jest.fn()} />);

    const compareBtn = await screen.findByRole('button', { name: 'Compare' });
    expect(compareBtn).toBeInTheDocument();

    fireEvent.click(compareBtn);
    expect(screen.getByRole('dialog', { name: 'Compare memories' })).toBeInTheDocument();
    expect(screen.getByText('First memory content')).toBeInTheDocument();
    expect(screen.getByText('Second memory content')).toBeInTheDocument();
  });
});

describe('ConfigTab', () => {
  const mockData = {
    config: {
      global_git: { branch: 'main' },
    },
    configFields: [
      { key: 'global_git.branch', group: 'Global Git', label: 'Branch', docsAnchor: 'global-git-branch', input: 'text', risk: 'risky' },
      { key: 'future.flag', group: 'Pattern Mining', label: 'Future Flag', docsAnchor: 'future-flag', input: 'toggle', risk: 'normal' },
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
    const input = container.querySelector('[data-key="global_git.branch"] input') as HTMLInputElement;
    expect(input.value).toBe('main');
    expect(screen.getByRole('link', { name: 'Open Construct docs' })).toHaveAttribute('href', 'https://the-long-ride.github.io/engram/docs/entry/construct');
    expect(screen.getByRole('link', { name: 'Open Branch docs' })).toHaveAttribute('href', 'https://the-long-ride.github.io/engram/docs/entry/field-reference#global-git-branch');
    expect(screen.getByRole('link', { name: 'Open Future Flag docs' })).toHaveAttribute('href', 'https://the-long-ride.github.io/engram/docs/entry/field-reference#future-flag');

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

    const input = container.querySelector('[data-key="global_git.branch"] input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'dev' } });
    fireEvent.blur(input);
    expect(input.value).toBe('dev');

    const resetBtn = container.querySelector('.cfg-reset') as HTMLButtonElement;
    fireEvent.click(resetBtn);
    expect(input.value).toBe('main');
  });
});



test('renders a field-specific documentation link for each config field', () => {
  const data = {
    config: { global_git: { branch: 'main' } },
    configFields: [{
      key: 'global_git.branch',
      group: 'Global Git',
      label: 'Branch',
      docsAnchor: 'global-git-branch',
      input: 'text',
      risk: 'risky',
    }],
  } as any;

  render(<ConfigTab data={data} reload={jest.fn()} toast={jest.fn()} />);

  expect(screen.getByRole('link', { name: 'Open Branch docs' })).toHaveAttribute(
    'href',
    expect.stringContaining('/entry/field-reference#global-git-branch'),
  );
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
    expect(screen.getByRole('link', { name: 'Open Runtime docs' })).toHaveAttribute('href', 'https://the-long-ride.github.io/engram/docs/entry/runtime');
    expect(screen.getByRole('link', { name: 'Open Runtime group docs' })).toHaveAttribute('href', 'https://the-long-ride.github.io/engram/docs/entry/runtime#runtime-report-groups');
    expect(screen.getByRole('link', { name: 'Open runtime group docs' })).toHaveAttribute('href', 'https://the-long-ride.github.io/engram/docs/entry/runtime#runtime-report-groups');

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
    expect(screen.getByRole('link', { name: 'Open Core docs' })).toHaveAttribute('href', 'https://the-long-ride.github.io/engram/docs/entry/core');
    expect(screen.getByRole('link', { name: 'Open Core scope docs' })).toHaveAttribute('href', 'https://the-long-ride.github.io/engram/docs/entry/core#scope-chips-profile-global-workspace');
    expect(screen.getByRole('link', { name: 'Open Core type docs' })).toHaveAttribute('href', 'https://the-long-ride.github.io/engram/docs/entry/core#type-chips-rule-skill-workflow-knowledge');
    expect(screen.getByRole('link', { name: 'Open semantic candidate docs' })).toHaveAttribute('href', 'https://the-long-ride.github.io/engram/docs/entry/core#include-semantic-candidates');
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

    const requestCount = (api.postJson as jest.Mock).mock.calls.length;
    fireEvent.click(screen.getByRole('link', { name: 'Open semantic candidate docs' }));
    expect((api.postJson as jest.Mock).mock.calls.length).toBe(requestCount);

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

  test('opens memory modal with properties separated from content', async () => {
    (api.getJson as jest.Mock)
      .mockResolvedValueOnce(mockCoreData)
      .mockResolvedValueOnce({ content: 'Readable body', properties: [['type', 'knowledge'], ['updated', '2026-07-14']] });
    const modalMock = { open: jest.fn(), close: jest.fn() };
    render(<CoreTab active={true} toast={jest.fn()} modal={modalMock} />);

    await waitFor(() => expect(screen.getByText('Summary A')).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole('button', { name: /mem-a/i })[0]);

    await waitFor(() => expect(modalMock.open).toHaveBeenCalledWith(expect.objectContaining({
      className: 'modal-panel memory-preview-modal'
    })));
    const modal = modalMock.open.mock.calls[0][0];
    render(modal.content);
    expect(screen.getByText('type')).toBeInTheDocument();
    expect(screen.getByText('Readable body')).toBeInTheDocument();
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
    expect(screen.getByRole('link', { name: 'Open Memories docs' })).toHaveAttribute('href', 'https://the-long-ride.github.io/engram/docs/entry/memories');
    expect(screen.getByRole('link', { name: 'Open Memories scope docs' })).toHaveAttribute('href', 'https://the-long-ride.github.io/engram/docs/entry/memories#scope-chips');
    expect(screen.getByRole('link', { name: 'Open Memories type docs' })).toHaveAttribute('href', 'https://the-long-ride.github.io/engram/docs/entry/memories#type-chips');
    expect(screen.getByRole('link', { name: 'Open semantic link docs' })).toHaveAttribute('href', 'https://the-long-ride.github.io/engram/docs/entry/memories#semantic-links-toggle');

    // Toggle semantic links check div
    const semanticDiv = container.querySelector('.core-check') as HTMLDivElement;
    fireEvent.click(semanticDiv);
    await waitFor(() => {
      expect(api.postJson).toHaveBeenCalledWith('/api/memories', expect.objectContaining({
        semantic: false
      }));
    });

    const memoryRequestCount = (api.postJson as jest.Mock).mock.calls.length;
    fireEvent.click(screen.getByRole('link', { name: 'Open semantic link docs' }));
    expect((api.postJson as jest.Mock).mock.calls.length).toBe(memoryRequestCount);

    // Refresh
    const refreshBtn = screen.getByRole('button', { name: 'Refresh' });
    fireEvent.click(refreshBtn);
    await waitFor(() => {
      expect(api.postJson).toHaveBeenCalledWith('/api/memories', expect.objectContaining({
        rebuild: true
      }));
    });
  });

  test('searches memory content with the selected result mode', async () => {
    (api.getJson as jest.Mock).mockResolvedValue(mockMemoriesData);
    (api.postJson as jest.Mock).mockResolvedValue(mockMemoriesData);

    render(<MemoriesTab active={true} toast={jest.fn()} modal={{ open: jest.fn(), close: jest.fn() }} />);
    await waitFor(() => expect(screen.getByText('Summary 1')).toBeInTheDocument());

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search memories' }), { target: { value: 'oauth' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Search mode' }), { target: { value: 'related' } });

    await waitFor(() => {
      expect(api.postJson).toHaveBeenCalledWith('/api/memories', expect.objectContaining({
        search: 'oauth',
        searchMode: 'related'
      }));
    }, { timeout: 1000 });
    expect(screen.getByRole('option', { name: 'Text matches only' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Text matches + related memories' })).toBeInTheDocument();
  });

  test('opens memory modal with properties separated from content', async () => {
    (api.getJson as jest.Mock)
      .mockResolvedValueOnce(mockMemoriesData)
      .mockResolvedValue({ content: 'Readable body', properties: [['type', 'knowledge'], ['updated', '2026-07-14']] });
    const modalMock = { open: jest.fn(), close: jest.fn() };
    render(<MemoriesTab active={true} toast={jest.fn()} modal={modalMock} />);

    await waitFor(() => expect(screen.getByText('Summary 1')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

    await waitFor(() => expect(modalMock.open).toHaveBeenCalledWith(expect.objectContaining({
      className: 'modal-panel memory-preview-modal'
    })));
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
    expect(screen.getByRole('link', { name: 'Open Profiles docs' })).toHaveAttribute('href', 'https://the-long-ride.github.io/engram/docs/entry/profiles');
    expect(screen.getByRole('link', { name: 'Open profile name docs' })).toHaveAttribute('href', 'https://the-long-ride.github.io/engram/docs/entry/profiles#profile-name');
    expect(screen.getByRole('link', { name: 'Open profile path docs' })).toHaveAttribute('href', 'https://the-long-ride.github.io/engram/docs/entry/profiles#global-path');

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
    expect(screen.getByRole('link', { name: 'Open Workspaces docs' })).toHaveAttribute('href', 'https://the-long-ride.github.io/engram/docs/entry/workspaces');
    expect(screen.getByRole('link', { name: 'Open workspace name docs' })).toHaveAttribute('href', 'https://the-long-ride.github.io/engram/docs/entry/workspaces#workspace-name');
    expect(screen.getByRole('link', { name: 'Open workspace path docs' })).toHaveAttribute('href', 'https://the-long-ride.github.io/engram/docs/entry/workspaces#workspace-path');

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
    expect(screen.getByRole('link', { name: 'Open Connections docs' })).toHaveAttribute('href', 'https://the-long-ride.github.io/engram/docs/entry/connections');
    expect(screen.queryByRole('link', { name: 'Open workspace connection documentation' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open global connection documentation' })).not.toBeInTheDocument();
    
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

  test('expands and displays global target file paths when toggle arrow is clicked', async () => {
    (api.getJson as jest.Mock).mockResolvedValue({
      data: [
        {
          id: 'antigravity',
          name: 'Antigravity',
          path: '/home/user/.antigravity',
          detected: true,
          workspaceLinked: false,
          globalLinked: true,
          globalTargets: [
            '/home/user/.antigravity/skills/engram/SKILL.md',
            '/home/user/.antigravity-cli/skills/engram/SKILL.md'
          ]
        }
      ]
    });
    const toastMock = jest.fn();
    const { container } = render(<ConnectionsTab active={true} toast={toastMock} />);
    await waitFor(() => {
      expect(screen.getByText('Antigravity')).toBeInTheDocument();
    });

    const expandBtn = container.querySelector('.conn-expand-btn')!;
    expect(expandBtn).toBeInTheDocument();
    expect(screen.queryByText('/home/user/.antigravity/skills/engram/SKILL.md')).not.toBeInTheDocument();

    // Click down arrow to expand
    fireEvent.click(expandBtn);
    expect(screen.getByText('/home/user/.antigravity/skills/engram/SKILL.md')).toBeInTheDocument();
    expect(screen.getByText('/home/user/.antigravity-cli/skills/engram/SKILL.md')).toBeInTheDocument();

    // Click again to collapse
    fireEvent.click(expandBtn);
    expect(screen.queryByText('/home/user/.antigravity/skills/engram/SKILL.md')).not.toBeInTheDocument();
  });
});



test('policy metadata covers every rendered control with unique anchors', () => {
  const entries = Object.values(POLICY_FIELD_META);
  expect(entries).toHaveLength(13);
  expect(new Set(entries.map((entry) => entry.path)).size).toBe(13);
  expect(new Set(entries.map((entry) => entry.docsAnchor)).size).toBe(13);
});

test('renders exact documentation links for all Auto-save Policy controls', () => {
  render(<ConfigTab data={{ policy: { exists: false } } as any} reload={jest.fn()} toast={jest.fn()} />);

  for (const field of Object.values(POLICY_FIELD_META)) {
    expect(screen.getByRole('link', { name: `Open ${field.label} docs` })).toHaveAttribute(
      'href',
      expect.stringContaining(`/entry/policy#${field.docsAnchor}`),
    );
  }
});

test('renders global ignore patterns and policy allowlists as multi-choice controls', () => {
  const data = {
    config: { ignore: { global_patterns: ['*.private.md', 'vendor/**'] } },
    configFields: [{ key: 'ignore.global_patterns', group: 'Ignore Rules', label: 'Global Ignore Patterns', input: 'textarea' }],
    policy: {
      exists: true,
      policy: {
        version: 1,
        autonomous_writes: {
          enabled: false,
          mode: 'review_only',
          allowed_types: ['knowledge'],
          allowed_scopes: ['workspace'],
          allowed_sources: ['autosave'],
          confidence_threshold: 'high',
          daily_limit: 5,
          rollback_retention_days: 30
        },
        review: { max_rule_lines: 100, benchmark_min_recall_at_k: 0.9, mandatory_metadata: { context: false, triggers: false, role: false } }
      }
    }
  } as any;

  render(<ConfigTab data={data} reload={jest.fn()} toast={jest.fn()} />);

  expect(screen.getByRole('textbox')).toHaveValue('*.private.md\nvendor/**');
  expect(screen.getByRole('group', { name: 'allowed types' })).toBeInTheDocument();
  expect(screen.getByRole('group', { name: 'allowed scopes' })).toBeInTheDocument();
  expect(screen.getByRole('group', { name: 'allowed sources' })).toBeInTheDocument();
});

test('disables Save policy button when policy matches original and enables when changed', () => {
  const data = {
    policy: {
      exists: true,
      policy: {
        version: 1,
        autonomous_writes: {
          enabled: false,
          mode: 'review_only',
          allowed_types: ['knowledge'],
          allowed_scopes: ['workspace'],
          allowed_sources: ['autosave'],
          confidence_threshold: 'high',
          daily_limit: 5,
          rollback_retention_days: 30
        },
        review: { max_rule_lines: 100, benchmark_min_recall_at_k: 0.9, mandatory_metadata: { context: false, triggers: false, role: false } }
      }
    }
  } as any;

  render(<ConfigTab data={data} reload={jest.fn()} toast={jest.fn()} />);

  const saveBtn = screen.getByRole('button', { name: 'Save policy' });
  expect(saveBtn).toBeDisabled();

  const toggleBtn = screen.getByRole('button', { name: 'Allow auto-save' });
  
  // Enable auto-save -> modified from original
  fireEvent.click(toggleBtn);
  expect(saveBtn).toBeEnabled();

  // Toggle back to original
  fireEvent.click(toggleBtn);
  expect(saveBtn).toBeDisabled();
});
