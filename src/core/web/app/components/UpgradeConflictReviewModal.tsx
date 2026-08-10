// Review one conflicted upgrade artifact without making the browser authoritative.
import { useEffect, useState } from 'react';
import type { ShowToast, UpgradeInventoryItemDto, UpgradeReviewSummaryDto } from '../types.js';
import { loadUpgradeReview, openUpgradeFile, saveUpgradeReview } from '../api-client.js';
import { Button } from './Button.js';
import { UpgradeConflictDiff } from './UpgradeConflictDiff.js';

type Choice = 'accept-latest' | 'edited' | 'keep-current' | 'force-latest' | null;
type View = 'current' | 'proposed' | 'diff';
type Props = {
  fingerprint: string;
  item: UpgradeInventoryItemDto;
  close: () => void;
  onSaved: (review: UpgradeReviewSummaryDto) => void;
  toast?: ShowToast;
};

export function UpgradeConflictReviewModal({ fingerprint, item, close, onSaved, toast }: Props) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState<View>('current');
  const [current, setCurrent] = useState('');
  const [initialProposed, setInitialProposed] = useState('');
  const [proposed, setProposed] = useState('');
  const [replaceable, setReplaceable] = useState(false);
  const [forceMode, setForceMode] = useState<'replace-managed-region' | 'replace-file' | 'none'>('none');
  const [forceWarning, setForceWarning] = useState('');
  const [choice, setChoice] = useState<Choice>(null);

  useEffect(() => {
    let alive = true;
    void loadUpgradeReview(fingerprint, item.id).then((response) => {
      if (!alive) return;
      setCurrent(response.proposal.current);
      setInitialProposed(response.proposal.proposed);
      setReplaceable(response.proposal.replaceable);
      setForceMode(response.proposal.forceMode);
      setForceWarning(response.proposal.forceWarning ?? '');
      const savedText = response.saved.proposedContent ?? response.proposal.proposed;
      setProposed(savedText);
      setChoice(response.saved.state === 'pending' ? null : response.saved.state);
      setView(response.saved.state === 'pending' ? 'current' : 'proposed');
    }).catch((reason: any) => alive && setError(reason.message || String(reason))).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [fingerprint, item.id]);


  async function openCurrentFile() {
    setOpening(true); setError('');
    try {
      await openUpgradeFile(fingerprint, item.id);
      toast?.('Opened current file in editor.');
    } catch (reason: any) {
      const message = reason.message || String(reason);
      setError(message);
      toast?.(message, false);
    } finally {
      setOpening(false);
    }
  }

  async function confirm() {
    if (!choice) return;
    setBusy(true); setError('');
    try {
      const result = await saveUpgradeReview({
        fingerprint,
        itemId: item.id,
        state: choice,
        ...(choice === 'edited' ? { proposedContent: proposed } : {})
      });
      onSaved(result.review);
      close();
    } catch (reason: any) {
      setError(reason.message || String(reason));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="upgrade-conflict-review"><p>Loading conflict content…</p></div>;

  return <div className="upgrade-conflict-review">
    <div className="upgrade-review-meta"><strong>{item.kind}</strong><span>{item.scope}{(item.agents?.length ?? 0) > 0 ? ` · ${item.agents?.join(', ')}` : item.agent ? ` · ${item.agent}` : ''}</span></div>
    <div className="upgrade-review-file-row"><code>{item.file}</code><Button disabled={opening || busy} onClick={() => void openCurrentFile()}>{opening ? 'Opening…' : 'Open in editor'}</Button></div>
    {error ? <div className="author-error" role="alert">{error}</div> : null}
    <div className="upgrade-review-tabs" role="tablist" aria-label="Conflict content view">
      {(['current', 'proposed', 'diff'] as View[]).map((tab) => <button key={tab} type="button" role="tab" aria-selected={view === tab} className={view === tab ? 'active' : ''} onClick={() => setView(tab)}>{title(tab)}</button>)}
    </div>
    <div className="upgrade-review-content">
      {view === 'current' ? <pre aria-label="Current content" className="upgrade-code-view">{current}</pre> : null}
      {view === 'proposed' ? <textarea aria-label="Proposed content" className="upgrade-proposed-editor" value={proposed} readOnly={!replaceable} onChange={(event) => { setProposed(event.target.value); setChoice('edited'); }} /> : null}
      {view === 'diff' ? <UpgradeConflictDiff current={current} proposed={proposed} /> : null}
    </div>
    {!replaceable && forceMode === 'none' ? <p className="upgrade-review-note">Engram cannot prove a safe replacement boundary for this artifact. Confirm Keep current to acknowledge it before the final upgrade.</p> : null}
    {forceMode !== 'none' ? <p className="upgrade-review-force-note">{forceWarning}</p> : null}
    <div className="upgrade-review-choice" aria-live="polite">Decision: <strong>{choice ? choiceLabel(choice) : 'Pending review'}</strong></div>
    <div className="upgrade-review-actions">
      <Button disabled={!replaceable || busy} onClick={() => { setProposed(initialProposed); setChoice('accept-latest'); setView('proposed'); }}>Use latest</Button>
      {forceMode !== 'none' ? <Button variant="danger" disabled={busy} onClick={() => { setProposed(initialProposed); setChoice('force-latest'); setView('proposed'); }}>Force upgrade</Button> : null}
      <Button disabled={!replaceable || busy} onClick={() => { setProposed(initialProposed); setChoice(null); setView('proposed'); }}>Reset proposed</Button>
      <Button disabled={busy} onClick={() => { setChoice('keep-current'); setView('current'); }}>Keep current</Button>
      <span className="upgrade-review-action-spacer" />
      <Button disabled={busy} onClick={close}>Cancel</Button>
      <Button variant="primary" disabled={!choice || busy} onClick={() => void confirm()}>{busy ? 'Saving…' : 'Confirm change'}</Button>
    </div>
  </div>;
}

function title(view: View): string {
  return view === 'current' ? 'Current' : view === 'proposed' ? 'Proposed' : 'Diff';
}

function choiceLabel(choice: Exclude<Choice, null>): string {
  if (choice === 'accept-latest') return 'Confirmed · Latest';
  if (choice === 'edited') return 'Confirmed · Edited';
  if (choice === 'force-latest') return 'Confirmed · Force latest';
  return 'Confirmed · Keep current';
}
