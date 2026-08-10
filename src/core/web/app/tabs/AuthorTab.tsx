import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import type { AuthorMigrationDto, ModalController, PanelData, ShowToast } from '../types.js';
import { Button } from '../components/Button.js';
import { CommandHelp } from '../components/CommandHelp.js';
import { ConfigFieldGroupEditor } from '../components/ConfigFieldGroupEditor.js';
import { operationDoc } from '../utils/docs.js';
import {
  migrateMemoryAuthors,
  planAuthorMemoryMigration,
  planGlobalGitAuthorSync,
  setAuthorProfile,
  syncGlobalGitAuthor,
  unsetAuthorProfile
} from '../api-client.js';

type AuthorScope = 'global' | 'workspace';
type AsyncConfirmProps = {
  children: ReactNode;
  confirmLabel: string;
  close: () => void;
  run: () => Promise<void>;
  requireCheck?: string;
  danger?: boolean;
};

function AsyncConfirm({ children, confirmLabel, close, run, requireCheck, danger }: AsyncConfirmProps) {
  const [checked, setChecked] = useState(!requireCheck);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function confirm() {
    setBusy(true); setError('');
    try { await run(); close(); }
    catch (e: any) { setError(e.message || String(e)); }
    finally { setBusy(false); }
  }
  return <div className="author-confirm">
    {children}
    {requireCheck ? <label className="confirm-line"><input type="checkbox" checked={checked} onChange={(event: ChangeEvent<HTMLInputElement>) => setChecked(event.target.checked)} /> {requireCheck}</label> : null}
    {error ? <div className="author-error" role="alert">{error}</div> : null}
    <div className="author-modal-actions"><Button onClick={close}>Cancel</Button><Button variant={danger ? 'danger-solid' : 'primary'} disabled={!checked || busy} onClick={() => void confirm()}>{busy ? 'Working…' : confirmLabel}</Button></div>
  </div>;
}

function ReviewRows({ rows }: { rows: Array<[string, string]> }) {
  return <table className="review-table"><tbody>{rows.map(([key, value]) => <tr key={key}><th>{key}</th><td>{value}</td></tr>)}</tbody></table>;
}

function sourceLabel(source: string): string {
  if (source === 'git') return 'Git fallback';
  if (source === 'workspace') return 'Workspace';
  if (source === 'global') return 'Global';
  return 'Unresolved';
}

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function AuthorTab({ data, reload, toast, modal }: { data: PanelData; reload: () => Promise<void>; toast: ShowToast; modal: ModalController }) {
  const [scope, setScope] = useState<AuthorScope>('global');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState('');
  const state = data.author;
  const profile = state?.[scope] ?? null;
  const globalGitFields = useMemo(() => (data.configFields || []).filter((field) => field.key.startsWith('global_git.')), [data.configFields]);

  useEffect(() => {
    setName(profile?.name ?? '');
    setEmail(profile?.email ?? '');
    setFieldError('');
  }, [scope, profile?.name, profile?.email]);

  function openSaveReview() {
    if (!name.trim()) { setFieldError('Author name is required'); return; }
    if (!validEmail(email)) { setFieldError('Enter a valid email address'); return; }
    setFieldError('');
    const selected = scope;
    const next = { name: name.trim(), email: email.trim() };
    modal.open({
      title: `Review ${selected} author`,
      className: 'modal-panel confirm-panel',
      content: <AsyncConfirm confirmLabel="Confirm save" close={modal.close} run={async () => {
        await setAuthorProfile({ scope: selected, ...next, confirmed: true });
        toast(`${sourceLabel(selected)} author saved`); await reload();
      }}><ReviewRows rows={[['Scope', selected], ['Name', next.name], ['Email', next.email]]} /></AsyncConfirm>
    });
  }

  function openRemoveReview() {
    const selected = scope;
    modal.open({
      title: `Remove ${selected} author?`,
      className: 'modal-panel confirm-panel',
      content: <AsyncConfirm danger confirmLabel="Remove author" close={modal.close} run={async () => {
        await unsetAuthorProfile({ scope: selected, confirmed: true });
        toast(`${sourceLabel(selected)} author removed`); await reload();
      }}><p className="confirm-copy">Future memories will use the next identity in the resolution order.</p></AsyncConfirm>
    });
  }

  async function openSyncReview() {
    try {
      const response: any = await planGlobalGitAuthorSync();
      const plan = response.data;
      modal.open({
        title: 'Sync Engram author to global Git',
        className: 'modal-panel confirm-panel',
        content: <AsyncConfirm confirmLabel="Sync global Git" close={modal.close} requireCheck="I understand this changes global Git user.name and user.email." run={async () => {
          await syncGlobalGitAuthor(true); toast('Global Git author synchronized'); await reload();
        }}><ReviewRows rows={[
          ['Previous', plan.previous ? `${plan.previous.name} <${plan.previous.email}>` : '<unset>'],
          ['Next', `${plan.next.name} <${plan.next.email}>`]
        ]} /></AsyncConfirm>
      });
    } catch (e: any) { toast(e.message, false); }
  }

  async function openMigrationReview() {
    try {
      const response: any = await planAuthorMemoryMigration('both');
      const plan = response.data as AuthorMigrationDto;
      modal.open({
        title: 'Migrate existing memory authors',
        className: 'modal-panel author-migration-modal',
        content: <AsyncConfirm confirmLabel="Migrate memories" close={modal.close} requireCheck="I reviewed the eligible files and backup behavior." run={async () => {
          await migrateMemoryAuthors('both', true); toast('Memory author migration complete'); await reload();
        }}><ReviewRows rows={[
          ['Scanned', String(plan.scanned)], ['Eligible', String(plan.eligible)], ['Current', String(plan.current)], ['Skipped', String(plan.skipped)], ['Invalid', String(plan.invalid)]
        ]} /><div className="author-file-list">{plan.files.map((file) => <div key={`${file.scope}:${file.file}`}><code>{file.file}</code><span>{file.scope} · {file.action}</span></div>)}</div></AsyncConfirm>
      });
    } catch (e: any) { toast(e.message, false); }
  }

  const resolved = state?.resolved;
  const currentHelp = scope === 'global'
    ? <CommandHelp href={operationDoc('git-author-settings', 'global-author')} label="Open global author documentation" command="engram author set --help" />
    : <CommandHelp href={operationDoc('git-author-settings', 'workspace-override')} label="Open workspace author documentation" command="engram author set --help" />;

  return <section className="author-page" aria-labelledby="author-title">
    <div className="section-header"><div><h2 id="author-title">Git</h2><p>Control Engram Git identity and global Git-backed memory configuration.</p></div></div>
    <div className="author-scope-tabs" role="tablist" aria-label="Author scope">
      <button role="tab" aria-selected={scope === 'global'} aria-label="Global author" className={scope === 'global' ? 'active' : ''} onClick={() => setScope('global')}>Global</button>
      <button role="tab" aria-selected={scope === 'workspace'} aria-label="Workspace author" className={scope === 'workspace' ? 'active' : ''} onClick={() => setScope('workspace')}>Workspace</button>
    </div>
    <div className="author-grid">
      <div className="author-card">
        <div className="author-card-head"><div><h3>{scope === 'global' ? 'Global author' : 'Workspace override'}</h3><p>{scope === 'global' ? 'Default identity for all workspaces.' : 'Identity used only in this workspace.'}</p></div>{currentHelp}</div>
        <label className="author-field"><span>Author name</span><input className="form-input" aria-label="Author name" value={name} onChange={(event: ChangeEvent<HTMLInputElement>) => setName(event.target.value)} autoComplete="name" /></label>
        <label className="author-field"><span>Author email</span><input className="form-input" aria-label="Author email" type="email" value={email} onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)} autoComplete="email" /></label>
        {fieldError ? <div className="author-error" role="alert">{fieldError}</div> : null}
        <div className="author-actions"><Button variant="primary" aria-label="Save author" onClick={openSaveReview}>Save author</Button>{profile ? <Button variant="danger" onClick={openRemoveReview}>Remove profile</Button> : null}</div>
        {profile ? <CommandHelp href={operationDoc('git-author-settings', 'remove-an-author-profile')} label="Open remove author profile documentation" command="engram author unset --help" /> : null}
      </div>
      <div className="author-card">
        <div className="author-card-head"><div><h3>Resolved identity</h3><p>Workspace overrides global, then Engram falls back to Git.</p></div><CommandHelp href={operationDoc('git-author-settings', 'resolution-order')} label="Open author resolution documentation" command="engram author show --help" /></div>
        <div className="author-resolved"><div className="author-resolved-head"><strong>{resolved?.complete ? resolved.name : 'No complete identity'}</strong><span className={`badge author-source-badge source-${resolved?.source ?? 'unresolved'}`}>{sourceLabel(resolved?.source ?? 'unresolved')}</span></div><code>{resolved?.complete ? resolved.email : 'Configure an Engram or Git author'}</code></div>
      </div>
    </div>
    {scope === 'global' ? <div className="author-global-config"><ConfigFieldGroupEditor data={data} fields={globalGitFields} reload={reload} toast={toast} modal={modal} title="Global Git configuration" description="Git settings for shared global memory. These controls are available only in Global scope." /></div> : null}
    <div className="author-grid author-operations">
      {scope === 'global' ? <div className="author-card"><div className="author-card-head"><div><h3>Sync to global Git</h3><p>Preview and explicitly confirm changes to global Git configuration.</p></div><CommandHelp href={operationDoc('git-author-settings', 'sync-to-global-git')} label="Open global Git sync documentation" command="engram author sync-git-global --help" /></div><Button aria-label="Sync to global Git" onClick={() => void openSyncReview()}>Sync to global Git</Button></div> : null}
      <div className="author-card"><div className="author-card-head"><div><h3>Existing memories</h3><p>Preview deterministic backfill of legacy author metadata.</p></div><CommandHelp href={operationDoc('git-author-settings', 'migrate-existing-memories')} label="Open memory author migration documentation" command="engram author migrate-memories --help" /></div><Button aria-label="Preview memory migration" onClick={() => void openMigrationReview()}>Preview memory migration</Button></div>
    </div>
  </section>;
}
