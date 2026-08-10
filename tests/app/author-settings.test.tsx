import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AuthorTab } from '../../src/core/web/app/tabs/AuthorTab.js';
import { Sidebar } from '../../src/core/web/app/layout/Sidebar.js';
import * as api from '../../src/core/web/app/api-client.js';

jest.mock('../../src/core/web/app/api-client.js', () => ({
  setAuthorProfile: jest.fn(),
  unsetAuthorProfile: jest.fn(),
  planGlobalGitAuthorSync: jest.fn(),
  syncGlobalGitAuthor: jest.fn(),
  planAuthorMemoryMigration: jest.fn(),
  migrateMemoryAuthors: jest.fn(),
  validateConfigPatch: jest.fn(),
  saveConfigPatch: jest.fn()
}));

const data: any = {
  config: { global_git: { enabled: true, remote: 'origin', remote_url: '', branch: 'main', auto_sync: true, auto_resolve: true } },
  configFields: [
    { key: 'global_git.enabled', group: 'Global Git', label: 'Enabled', docsAnchor: 'global-git-enabled', input: 'toggle', risk: 'risky' },
    { key: 'global_git.remote', group: 'Global Git', label: 'Remote', docsAnchor: 'global-git-remote', input: 'text', risk: 'risky' },
    { key: 'global_git.branch', group: 'Global Git', label: 'Branch', docsAnchor: 'global-git-branch', input: 'text', risk: 'risky' }
  ],
  author: {
    global: { name: 'Jane Global', email: 'jane@example.com' },
    workspace: { name: 'Jane Work', email: 'jane@work.com' },
    git: { name: 'Git Jane', email: 'git@example.com' },
    resolved: { name: 'Jane Work', email: 'jane@work.com', source: 'workspace', complete: true }
  }
};

function setup() {
  const modal = { open: jest.fn(), close: jest.fn() };
  const reload = jest.fn().mockResolvedValue(undefined);
  const toast = jest.fn();
  render(<AuthorTab data={data} reload={reload} toast={toast} modal={modal} />);
  return { modal, reload, toast };
}

describe('Git settings', () => {
  beforeEach(() => jest.resetAllMocks());

  test('sidebar has a non-clickable Settings heading and Git item', () => {
    const setActive = jest.fn();
    render(<Sidebar data={data} active="config" setActive={setActive} dark toggleTheme={jest.fn()} shutdown={jest.fn()} toast={jest.fn()} />);
    expect(screen.getByText('Settings')).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(screen.getByText('Git'));
    expect(setActive).toHaveBeenCalledWith('author');
  });



  test('global scope renders Global Git configuration and workspace scope hides it', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Git' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Global Git configuration' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('main')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Workspace author' }));
    expect(screen.queryByRole('heading', { name: 'Global Git configuration' })).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('main')).not.toBeInTheDocument();
  });

  test('global Git configuration reuses config validation and risky confirmation save flow', async () => {
    const { modal, reload, toast } = setup();
    (api.validateConfigPatch as jest.Mock).mockResolvedValue({ ok: true, riskyKeys: ['global_git.branch'] });
    (api.saveConfigPatch as jest.Mock).mockResolvedValue({ ok: true, message: 'Git configuration saved' });
    const branch = screen.getByDisplayValue('main');
    fireEvent.change(branch, { target: { value: 'dev' } });
    fireEvent.blur(branch);
    fireEvent.click(screen.getByRole('button', { name: 'Save Git configuration' }));
    await waitFor(() => expect(api.validateConfigPatch).toHaveBeenCalledWith({ 'global_git.branch': 'dev' }));
    expect(api.saveConfigPatch).not.toHaveBeenCalled();
    render(modal.open.mock.calls.at(-1)[0].content);
    const save = screen.getByRole('button', { name: 'Confirm Git configuration' });
    expect(save).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(save);
    await waitFor(() => expect(api.saveConfigPatch).toHaveBeenCalledWith({ 'global_git.branch': 'dev' }));
    expect(toast).toHaveBeenCalledWith('Git configuration saved');
    expect(reload).toHaveBeenCalled();
  });

  test('renders global/workspace values, source badge, docs links, and CLI help', () => {
    setup();
    expect(screen.getByLabelText('Author name')).toHaveValue('Jane Global');
    expect(screen.getByLabelText('Author email')).toHaveValue('jane@example.com');
    expect(screen.getAllByText('Workspace').length).toBeGreaterThan(0);
    const resolvedBadge = document.querySelector('.author-source-badge');
    expect(resolvedBadge).not.toBeNull();
    expect(resolvedBadge).toHaveTextContent('Workspace');
    expect(resolvedBadge).toHaveClass('source-workspace');
    const link = screen.getByRole('link', { name: 'Open global author documentation' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link.getAttribute('href')).toContain('/operations/git-author-settings#global-author');
    expect(screen.getAllByText('engram author set --help').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Workspace author' }));
    expect(screen.getByLabelText('Author name')).toHaveValue('Jane Work');
    expect(screen.queryByRole('button', { name: 'Sync to global Git' })).not.toBeInTheDocument();
  });

  test('resolved identity badge renders the compact Global source state', () => {
    const modal = { open: jest.fn(), close: jest.fn() };
    const globalResolved = {
      ...data,
      author: {
        ...data.author,
        resolved: { name: 'Jane Global', email: 'jane@example.com', source: 'global', complete: true }
      }
    };
    render(<AuthorTab data={globalResolved} reload={jest.fn()} toast={jest.fn()} modal={modal} />);
    const badge = document.querySelector('.author-source-badge');
    expect(badge).toHaveTextContent('Global');
    expect(badge).toHaveClass('source-global');
  });

  test('save calls API only after modal confirmation and preserves fields on error', async () => {
    const { modal } = setup();
    fireEvent.change(screen.getByLabelText('Author name'), { target: { value: 'New Jane' } });
    fireEvent.change(screen.getByLabelText('Author email'), { target: { value: 'new@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save author' }));
    expect(api.setAuthorProfile).not.toHaveBeenCalled();
    expect(modal.open).toHaveBeenCalledWith(expect.objectContaining({ title: 'Review global author' }));
    render(modal.open.mock.calls[0][0].content);
    (api.setAuthorProfile as jest.Mock).mockRejectedValue(new Error('backend failure'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm save' }));
    expect(await screen.findByText('backend failure')).toBeInTheDocument();
    expect(screen.getByDisplayValue('New Jane')).toBeInTheDocument();
  });

  test('previews sync and migration before confirmed mutation', async () => {
    const { modal } = setup();
    (api.planGlobalGitAuthorSync as jest.Mock).mockResolvedValue({ data: { previous: { name: 'Old', email: 'old@example.com' }, next: { name: 'Jane Global', email: 'jane@example.com' }, changes: [] } });
    fireEvent.click(screen.getByRole('button', { name: 'Sync to global Git' }));
    await waitFor(() => expect(modal.open).toHaveBeenCalled());
    expect(api.syncGlobalGitAuthor).not.toHaveBeenCalled();
    modal.open.mockClear();
    (api.planAuthorMemoryMigration as jest.Mock).mockResolvedValue({ data: { scope: 'both', scanned: 2, eligible: 1, current: 1, skipped: 0, invalid: 0, files: [{ scope: 'workspace', file: 'knowledge/old.md', action: 'migrate' }] } });
    fireEvent.click(screen.getByRole('button', { name: 'Preview memory migration' }));
    await waitFor(() => expect(modal.open).toHaveBeenCalled());
    const content = modal.open.mock.calls[0][0].content;
    render(content);
    expect(screen.getByText('knowledge/old.md')).toBeInTheDocument();
    expect(api.migrateMemoryAuthors).not.toHaveBeenCalled();
  });

  test('workspace removal calls unset only after confirmation', async () => {
    const { modal } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Workspace author' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove profile' }));
    expect(api.unsetAuthorProfile).not.toHaveBeenCalled();
    render(modal.open.mock.calls[0][0].content);
    (api.unsetAuthorProfile as jest.Mock).mockResolvedValue({ ok: true });
    fireEvent.click(screen.getByRole('button', { name: 'Remove author' }));
    await waitFor(() => expect(api.unsetAuthorProfile).toHaveBeenCalledWith({ scope: 'workspace', confirmed: true }));
  });

  test('global Git sync shows old and new values and requires explicit checkbox', async () => {
    const { modal } = setup();
    (api.planGlobalGitAuthorSync as jest.Mock).mockResolvedValue({
      data: {
        previous: { name: 'Old', email: 'old@example.com' },
        next: { name: 'Jane Global', email: 'jane@example.com' },
        changes: []
      }
    });
    (api.syncGlobalGitAuthor as jest.Mock).mockResolvedValue({ ok: true });
    fireEvent.click(screen.getByRole('button', { name: 'Sync to global Git' }));
    await waitFor(() => expect(modal.open).toHaveBeenCalled());
    render(modal.open.mock.calls[0][0].content);
    expect(screen.getByText('Old <old@example.com>')).toBeInTheDocument();
    expect(screen.getByText('Jane Global <jane@example.com>')).toBeInTheDocument();
    const confirm = screen.getByRole('button', { name: 'Sync global Git' });
    expect(confirm).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(confirm);
    await waitFor(() => expect(api.syncGlobalGitAuthor).toHaveBeenCalledWith(true));
  });

  test('all visible information controls open localized docs safely and show CLI help', () => {
    setup();
    for (const link of screen.getAllByRole('link')) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(link).toHaveAttribute('aria-label');
      expect(link.getAttribute('href')).toContain('/operations/git-author-settings#');
    }
    for (const command of [
      'engram author set --help',
      'engram author show --help',
      'engram author unset --help',
      'engram author sync-git-global --help',
      'engram author migrate-memories --help'
    ]) expect(screen.getAllByText(command).length).toBeGreaterThan(0);
  });

});
