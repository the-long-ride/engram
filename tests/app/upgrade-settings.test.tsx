import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { UpgradeTab } from '../../src/core/web/app/tabs/UpgradeTab.js';
import { UpgradeConflictReviewModal } from '../../src/core/web/app/components/UpgradeConflictReviewModal.js';
import { Sidebar } from '../../src/core/web/app/layout/Sidebar.js';
import * as api from '../../src/core/web/app/api-client.js';

jest.mock('../../src/core/web/app/api-client.js', () => ({
  loadUpgradePlan: jest.fn(),
  applyUpgradePlan: jest.fn(),
  loadUpgradeReview: jest.fn(),
  saveUpgradeReview: jest.fn(),
  saveUpgradeReviewsBatch: jest.fn(),
  openUpgradeFile: jest.fn()
}));

const zero = { current: 0, outdated: 0, conflict: 0, invalid: 0 };
const plan: any = {
  currentVersion: '0.0.29',
  targetVersion: '0.0.30',
  scannedAt: '2026-08-09T00:00:00.000Z',
  fingerprint: 'preview-1',
  workspaceRoot: '/repo/.engram',
  globalRoot: '/home/user/.engram',
  summary: {
    workspace: { ...zero, current: 1, outdated: 2 },
    global: { ...zero, conflict: 1 }
  },
  items: [
    { id: 'config', scope: 'workspace', kind: 'config', file: '.agents/config.json', targetVersion: '0.0.30', status: 'outdated', strategy: 'update-managed-block', userEditsPreserved: true, reason: 'old config', transactionGroup: 'workspace:config' },
    { id: 'memory', scope: 'workspace', kind: 'memory', file: 'knowledge/legacy.md', targetVersion: '0.0.30', status: 'outdated', strategy: 'migrate-schema', userEditsPreserved: true, reason: 'schema v2', transactionGroup: 'workspace:memory' },
    { id: 'hook', scope: 'global', kind: 'hook', agent: 'claude', file: '.claude/hook.js', targetVersion: '0.0.30', status: 'conflict', strategy: 'manual-review', userEditsPreserved: true, reason: 'user edited', transactionGroup: 'global:hooks' },
    { id: 'plugin', scope: 'workspace', kind: 'plugin', file: '.agents/plugin.js', targetVersion: '0.0.30', status: 'current', strategy: 'replace-generated', userEditsPreserved: true, reason: 'current', transactionGroup: 'workspace:hooks' }
  ],
  warnings: []
};

function renderUpgrade() {
  const modal = { open: jest.fn(), close: jest.fn() };
  render(<UpgradeTab data={{ upgradePlan: plan } as any} reload={jest.fn()} toast={jest.fn()} modal={modal} />);
  return modal;
}

describe('configuration upgrade presentation', () => {
  beforeEach(() => jest.resetAllMocks());

  test('current configuration renders a success banner and three summary cards', () => {
    const currentPlan: any = {
      ...plan,
      summary: { workspace: { ...zero }, global: { ...zero } },
      items: [],
      review: undefined
    };
    const modal = { open: jest.fn(), close: jest.fn() };
    render(<UpgradeTab data={{ upgradePlan: currentPlan } as any} reload={jest.fn()} toast={jest.fn()} modal={modal} />);

    const banner = screen.getByRole('status');
    expect(banner).toHaveTextContent('Configuration is current');
    expect(screen.getByTestId('upgrade-summary-workspace')).toHaveTextContent('Workspace');
    expect(screen.getByTestId('upgrade-summary-global')).toHaveTextContent('Global');
    expect(screen.getByTestId('upgrade-summary-conflicts')).toHaveTextContent('Conflicts');
  });

  test('actionable configuration renders warning and conflict banner states with card counts', () => {
    const modal = { open: jest.fn(), close: jest.fn() };
    const { rerender } = render(<UpgradeTab data={{ upgradePlan: { ...plan, summary: { workspace: { ...zero, outdated: 2 }, global: { ...zero } }, items: plan.items.filter((item: any) => item.status === 'outdated') } } as any} reload={jest.fn()} toast={jest.fn()} modal={modal} />);
    expect(screen.getByRole('status')).toHaveTextContent('Configuration update available');
    expect(screen.getByTestId('upgrade-summary-workspace')).toHaveTextContent('2');
    expect(screen.getByTestId('upgrade-summary-conflicts')).toHaveTextContent('0');

    rerender(<UpgradeTab data={{ upgradePlan: plan } as any} reload={jest.fn()} toast={jest.fn()} modal={modal} />);
    expect(screen.getByRole('status')).toHaveTextContent('Configuration review required');
    expect(screen.getByTestId('upgrade-summary-workspace')).toHaveTextContent('2');
    expect(screen.getByTestId('upgrade-summary-global')).toHaveTextContent('1');
    expect(screen.getByTestId('upgrade-summary-conflicts')).toHaveTextContent('1');
  });

  test('preview renders actionable artifacts in a semantic table', async () => {
    (api.loadUpgradePlan as jest.Mock).mockResolvedValue(plan);
    renderUpgrade();
    fireEvent.click(screen.getByRole('button', { name: 'Preview changes' }));

    const table = await screen.findByRole('table', { name: 'Actionable upgrade artifacts' });
    for (const header of ['Artifact', 'Scope', 'Agent(s)', 'Status', 'Review', 'Actions']) {
      expect(within(table).getByRole('columnheader', { name: header })).toBeInTheDocument();
    }
    expect(within(table).getAllByText('Automatic')).toHaveLength(2);
    expect(within(table).getByText('Pending review')).toBeInTheDocument();
    expect(within(table).getAllByText('Workspace').length).toBeGreaterThan(0);
    expect(within(table).getByText('Global')).toBeInTheDocument();
    expect(within(table).getByText('Conflict')).toBeInTheDocument();
  });

  test('preview exposes All plus actionable kind tabs and filters rows by kind', async () => {
    (api.loadUpgradePlan as jest.Mock).mockResolvedValue(plan);
    renderUpgrade();
    fireEvent.click(screen.getByRole('button', { name: 'Preview changes' }));

    expect(await screen.findByRole('tab', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Config' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Memories' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Hooks' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Instructions' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Skillsets' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Plugins' })).not.toBeInTheDocument();

    expect(screen.getByText('.agents/config.json')).toBeInTheDocument();
    expect(screen.getByText('knowledge/legacy.md')).toBeInTheDocument();
    expect(screen.getByText('.claude/hook.js')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Memories' }));
    expect(screen.getByText('knowledge/legacy.md')).toBeInTheDocument();
    expect(screen.queryByText('.agents/config.json')).not.toBeInTheDocument();
    expect(screen.queryByText('.claude/hook.js')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'All' }));
    expect(screen.getByText('.agents/config.json')).toBeInTheDocument();
    expect(screen.getByText('.claude/hook.js')).toBeInTheDocument();
  });

  test('sidebar copy action copies plan command without navigating to Updates', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const setActive = jest.fn();
    const toast = jest.fn();
    render(<Sidebar data={{ upgradePlan: plan } as any} active="config" setActive={setActive} dark toggleTheme={jest.fn()} shutdown={jest.fn()} toast={toast} />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy upgrade preview command' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('engram upgrade --latest --plan'));
    expect(setActive).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith('Copied upgrade preview command');
  });

  test('conflict review modal gates final upgrade until every file is explicitly confirmed', async () => {
    const reviewPlan = {
      ...plan,
      review: {
        reviewableCount: 1, reviewedCount: 0, pendingReviewCount: 1, staleCount: 0,
        items: [{ itemId: 'hook', state: 'pending', stale: false, sourceHash: 'abc' }]
      }
    };
    (api.loadUpgradePlan as jest.Mock).mockResolvedValue(reviewPlan);
    (api.loadUpgradeReview as jest.Mock).mockResolvedValue({
      plan: reviewPlan,
      proposal: { itemId: 'hook', kind: 'hook', file: '.claude/hook.js', sourceHash: 'abc', current: 'custom hook', proposed: 'custom hook', latest: 'custom hook', diff: '--- current\n+++ proposed\n(no changes)\n', replaceable: false, reason: 'user edited' },
      review: reviewPlan.review,
      saved: reviewPlan.review.items[0]
    });
    (api.saveUpgradeReview as jest.Mock).mockResolvedValue({
      review: { reviewableCount: 1, reviewedCount: 1, pendingReviewCount: 0, staleCount: 0, items: [{ itemId: 'hook', state: 'keep-current', stale: false, sourceHash: 'abc' }] }
    });
    const modal = renderUpgrade();
    fireEvent.click(screen.getByRole('button', { name: 'Preview changes' }));
    expect(await screen.findByText('Conflicts reviewed: 0 / 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upgrade' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Review .claude/hook.js' }));
    const opened = modal.open.mock.calls.at(-1)?.[0];
    expect(opened.title).toMatch(/Review Hooks conflict/);
    render(opened.content);
    expect(await screen.findByRole('tab', { name: 'Current' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Proposed' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Diff' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Diff' }));
    expect(screen.getByRole('tab', { name: 'Inline' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Parallel' })).toHaveAttribute('aria-selected', 'false');
    fireEvent.click(screen.getByRole('tab', { name: 'Parallel' }));
    expect(screen.getByRole('tab', { name: 'Parallel' })).toHaveAttribute('aria-selected', 'true');
    expect(api.saveUpgradeReview).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Keep current' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm change' }));
    await waitFor(() => expect(api.saveUpgradeReview).toHaveBeenCalledWith(expect.objectContaining({ itemId: 'hook', state: 'keep-current' })));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Upgrade' })).not.toBeDisabled());
  });


  test('ownership-gated conflict exposes explicit Force upgrade while normal latest remains disabled', async () => {
    const forceItem: any = {
      id: 'force-skill', scope: 'global', kind: 'skillset', agents: ['claude', 'codex', 'gemini'],
      file: '/home/user/.agents/engram.md', targetVersion: '0.0.30', status: 'conflict',
      strategy: 'manual-review', ownership: 'generated-file', forceMode: 'replace-file',
      userEditsPreserved: false, reason: 'manual edit', transactionGroup: 'global:artifact:shared'
    };
    const review = {
      reviewableCount: 1, reviewedCount: 0, pendingReviewCount: 1, staleCount: 0,
      items: [{ itemId: forceItem.id, state: 'pending', stale: false, sourceHash: 'abc' }]
    };
    (api.loadUpgradeReview as jest.Mock).mockResolvedValue({
      plan: { ...plan, items: [forceItem], review },
      proposal: {
        itemId: forceItem.id, kind: 'skillset', file: forceItem.file, sourceHash: 'abc',
        current: '# user edited', proposed: '# generated', latest: '# generated', diff: '--- current\n+++ proposed\n',
        replaceable: false, ownership: 'generated-file', forceMode: 'replace-file',
        forceWarning: 'Overwrite this Engram-owned generated file, including manual edits inside it.', reason: 'manual edit'
      },
      review,
      saved: review.items[0]
    });
    (api.saveUpgradeReview as jest.Mock).mockResolvedValue({
      review: { ...review, reviewedCount: 1, pendingReviewCount: 0, items: [{ ...review.items[0], state: 'force-latest', ownership: 'generated-file', forceMode: 'replace-file' }] }
    });
    const close = jest.fn();
    const onSaved = jest.fn();
    render(<UpgradeConflictReviewModal fingerprint="preview-1" item={forceItem} close={close} onSaved={onSaved} />);

    expect(await screen.findByRole('button', { name: 'Use latest' })).toBeDisabled();
    expect(screen.getByText(/Engram-owned generated file/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Force upgrade' }));
    expect(screen.getByText('Confirmed · Force latest')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm change' }));
    await waitFor(() => expect(api.saveUpgradeReview).toHaveBeenCalledWith(expect.objectContaining({ itemId: forceItem.id, state: 'force-latest' })));
    expect(onSaved).toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
  });


  test('conflict review can open the server-resolved current artifact without changing decision state', async () => {
    const item: any = {
      id: 'open-file', scope: 'global', kind: 'instruction', agent: 'codex', file: '/home/user/.codex/AGENTS.md',
      targetVersion: '0.0.30', status: 'conflict', strategy: 'manual-review', ownership: 'managed-region', forceMode: 'replace-managed-region',
      userEditsPreserved: true, reason: 'edited', transactionGroup: 'global:agents'
    };
    const review = { reviewableCount: 1, reviewedCount: 0, pendingReviewCount: 1, staleCount: 0, items: [{ itemId: item.id, state: 'pending', stale: false, sourceHash: 'abc' }] };
    (api.loadUpgradeReview as jest.Mock).mockResolvedValue({
      plan: { ...plan, items: [item], review },
      proposal: { itemId: item.id, kind: 'instruction', file: item.file, sourceHash: 'abc', current: 'old', proposed: 'new', latest: 'new', diff: '--- current\n+++ proposed\n', replaceable: false, ownership: 'managed-region', forceMode: 'replace-managed-region', reason: 'edited' },
      review,
      saved: review.items[0]
    });
    (api.openUpgradeFile as jest.Mock).mockResolvedValue({ file: item.file });
    const toast = jest.fn();
    render(<UpgradeConflictReviewModal fingerprint="preview-1" item={item} close={jest.fn()} onSaved={jest.fn()} toast={toast} />);
    const button = await screen.findByRole('button', { name: 'Open in editor' });
    fireEvent.click(button);
    await waitFor(() => expect(api.openUpgradeFile).toHaveBeenCalledWith('preview-1', item.id));
    expect(toast).toHaveBeenCalledWith('Opened current file in editor.');
    expect(screen.getByText('Pending review')).toBeInTheDocument();
  });


  test('open current file surfaces editor launch errors without changing review decision', async () => {
    const item: any = {
      id: 'open-file-error', scope: 'global', kind: 'instruction', agent: 'codex', file: '/home/user/.codex/AGENTS.md',
      targetVersion: '0.0.30', status: 'conflict', strategy: 'manual-review', ownership: 'managed-region', forceMode: 'replace-managed-region',
      userEditsPreserved: true, reason: 'edited', transactionGroup: 'global:agents'
    };
    const review = { reviewableCount: 1, reviewedCount: 0, pendingReviewCount: 1, staleCount: 0, items: [{ itemId: item.id, state: 'pending', stale: false, sourceHash: 'abc' }] };
    (api.loadUpgradeReview as jest.Mock).mockResolvedValue({
      plan: { ...plan, items: [item], review },
      proposal: { itemId: item.id, kind: 'instruction', file: item.file, sourceHash: 'abc', current: 'old', proposed: 'new', latest: 'new', diff: '--- current\n+++ proposed\n', replaceable: false, ownership: 'managed-region', forceMode: 'replace-managed-region', reason: 'edited' },
      review,
      saved: review.items[0]
    });
    (api.openUpgradeFile as jest.Mock).mockRejectedValue(new Error('Editor failed to launch'));
    const toast = jest.fn();
    render(<UpgradeConflictReviewModal fingerprint="preview-1" item={item} close={jest.fn()} onSaved={jest.fn()} toast={toast} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Open in editor' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Editor failed to launch');
    expect(toast).toHaveBeenCalledWith('Editor failed to launch', false);
    expect(screen.getByText('Pending review')).toBeInTheDocument();
  });

  test('bulk review selection confirms selected and all eligible conflicts as latest', async () => {
    const batchPlan: any = {
      ...plan,
      summary: { workspace: { ...zero, conflict: 3 }, global: { ...zero, conflict: 2 } },
      items: [
        { id: 'config-conflict', scope: 'workspace', kind: 'config', file: '.cursor/mcp.json', targetVersion: '0.0.30', status: 'conflict', strategy: 'update-managed-block', ownership: 'unknown', forceMode: 'none', userEditsPreserved: true, reason: 'edited', transactionGroup: 'workspace:cursor' },
        { id: 'skill-conflict', scope: 'workspace', kind: 'skillset', file: '.agents/engram.md', targetVersion: '0.0.30', status: 'conflict', strategy: 'replace-generated', ownership: 'unknown', forceMode: 'none', userEditsPreserved: true, reason: 'edited', transactionGroup: 'workspace:agents' },
        { id: 'hook-conflict', scope: 'workspace', kind: 'hook', file: '.cursor/hooks.json', targetVersion: '0.0.30', status: 'conflict', strategy: 'manual-review', ownership: 'unknown', forceMode: 'none', userEditsPreserved: false, reason: 'edited', transactionGroup: 'workspace:hooks' },
        { id: 'stale-instruction', scope: 'global', kind: 'instruction', file: 'AGENTS.md', targetVersion: '0.0.30', status: 'conflict', strategy: 'update-managed-block', ownership: 'unknown', forceMode: 'none', userEditsPreserved: true, reason: 'stale', transactionGroup: 'global:agents' },
        { id: 'reviewed-config', scope: 'global', kind: 'config', file: '.mcp.json', targetVersion: '0.0.30', status: 'conflict', strategy: 'replace-generated', ownership: 'unknown', forceMode: 'none', userEditsPreserved: true, reason: 'reviewed', transactionGroup: 'global:config' }
      ],
      review: {
        reviewableCount: 5, reviewedCount: 1, pendingReviewCount: 4, staleCount: 1,
        items: [
          { itemId: 'config-conflict', state: 'pending', stale: false, sourceHash: 'c1' },
          { itemId: 'skill-conflict', state: 'pending', stale: false, sourceHash: 's1' },
          { itemId: 'hook-conflict', state: 'pending', stale: false, sourceHash: 'h1' },
          { itemId: 'stale-instruction', state: 'pending', stale: true, sourceHash: 'i1' },
          { itemId: 'reviewed-config', state: 'edited', stale: false, sourceHash: 'r1', proposedContent: '{}' }
        ]
      }
    };
    (api.loadUpgradePlan as jest.Mock).mockResolvedValue(batchPlan);
    (api.saveUpgradeReviewsBatch as jest.Mock).mockImplementation(async (_fingerprint, ids) => ({
      saved: ids.map((itemId: string) => ({ itemId, state: 'accept-latest', stale: false, sourceHash: itemId })),
      review: {
        ...batchPlan.review,
        reviewedCount: 1 + ids.length,
        pendingReviewCount: 4 - ids.length,
        items: batchPlan.review.items.map((row: any) => ids.includes(row.itemId) ? { ...row, state: 'accept-latest' } : row)
      }
    }));
    renderUpgrade();
    fireEvent.click(screen.getByRole('button', { name: 'Preview changes' }));

    const selectedButton = await screen.findByRole('button', { name: 'Confirm selected changes (0)' });
    expect(selectedButton).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Select .cursor/hooks.json for latest confirmation' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Select AGENTS.md for latest confirmation' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Select .mcp.json for latest confirmation' })).toBeDisabled();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select .cursor/mcp.json for latest confirmation' }));
    expect(screen.getByRole('button', { name: 'Confirm selected changes (1)' })).toBeEnabled();
    fireEvent.click(screen.getByRole('tab', { name: 'Skillsets' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all visible eligible conflicts' }));
    expect(screen.getByRole('button', { name: 'Confirm selected changes (2)' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm selected changes (2)' }));
    await waitFor(() => expect(api.saveUpgradeReviewsBatch).toHaveBeenCalledWith('preview-1', ['config-conflict', 'skill-conflict']));

    (api.saveUpgradeReviewsBatch as jest.Mock).mockClear();
    (api.loadUpgradePlan as jest.Mock).mockResolvedValue(batchPlan);
    fireEvent.click(screen.getByRole('button', { name: 'Preview changes' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm all changes' }));
    await waitFor(() => expect(api.saveUpgradeReviewsBatch).toHaveBeenCalledWith('preview-1', ['config-conflict', 'skill-conflict']));
  });

});
