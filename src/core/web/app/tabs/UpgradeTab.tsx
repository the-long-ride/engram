import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ModalController, PanelData, ShowToast, UpgradeApplyResultDto, UpgradeArtifactKindDto, UpgradeInventoryItemDto, UpgradePlanDto, UpgradeReviewSummaryDto, UpgradeStatusCountsDto } from '../types.js';
import { applyUpgradePlan, loadUpgradePlan, saveUpgradeReviewsBatch } from '../api-client.js';
import { Button } from '../components/Button.js';
import { CommandHelp } from '../components/CommandHelp.js';
import { UpgradeConflictReviewModal } from '../components/UpgradeConflictReviewModal.js';
import { operationDoc } from '../utils/docs.js';
import { isReplaceableConflictKind } from '../../../upgrade/review-policy.js';

type Props = { data: PanelData; reload: () => Promise<void>; toast: ShowToast; modal: ModalController };

type UpgradeKindFilter = 'all' | UpgradeArtifactKindDto;
const KIND_TABS: Array<{ kind: UpgradeArtifactKindDto; label: string }> = [
  { kind: 'config', label: 'Config' },
  { kind: 'instruction', label: 'Instructions' },
  { kind: 'memory', label: 'Memories' },
  { kind: 'skillset', label: 'Skillsets' },
  { kind: 'hook', label: 'Hooks' },
  { kind: 'plugin', label: 'Plugins' }
];

function kindLabel(kind: UpgradeArtifactKindDto): string {
  return KIND_TABS.find((entry) => entry.kind === kind)?.label ?? kind;
}

type ConfirmProps = { children: ReactNode; close: () => void; run: () => Promise<void>; onError?: (message: string) => void };

function UpgradeConfirm({ children, close, run, onError }: ConfirmProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function apply() {
    setBusy(true); setError('');
    try { await run(); close(); }
    catch (e: any) { const message = e.message || String(e); setError(message); onError?.(message); }
    finally { setBusy(false); }
  }
  return <div className="upgrade-confirm">
    {children}
    <label className="confirm-line"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /> I reviewed the preview and want to apply these safe upgrades.</label>
    {error ? <div className="author-error" role="alert">{error}</div> : null}
    <div className="author-modal-actions"><Button onClick={close}>Cancel</Button><Button variant="primary" disabled={!confirmed || busy} onClick={() => void apply()}>{busy ? 'Upgrading…' : 'Upgrade'}</Button></div>
  </div>;
}

function actionable(counts: UpgradeStatusCountsDto): number {
  return counts.outdated + counts.conflict + counts.invalid;
}

function SummaryCard({ label, counts, testId }: { label: string; counts: UpgradeStatusCountsDto; testId: string }) {
  return <div className="upgrade-summary-card" data-testid={testId}><span>{label}</span><strong>{actionable(counts)}</strong><small>{counts.outdated} outdated · {counts.conflict} conflicts · {counts.invalid} invalid</small></div>;
}

function UpgradeStatusBanner({ plan }: { plan: UpgradePlanDto }) {
  const changes = actionable(plan.summary.workspace) + actionable(plan.summary.global);
  const blockers = blockerCount(plan);
  const tone = blockers > 0 ? 'danger' : changes > 0 ? 'warning' : 'success';
  const title = blockers > 0 ? 'Configuration review required' : changes > 0 ? 'Configuration update available' : 'Configuration is current';
  const copy = blockers > 0
    ? `${changes} actionable change${changes === 1 ? '' : 's'} detected · ${blockers} conflict/invalid blocker${blockers === 1 ? '' : 's'} require explicit review.`
    : changes > 0
      ? `${changes} actionable change${changes === 1 ? '' : 's'} detected. Review the preview before upgrading.`
      : 'No outdated, conflicting, or invalid Engram-managed artifacts were detected.';
  return <div className={`upgrade-status-banner upgrade-status-banner--${tone}`} role="status"><strong>{title}</strong><span>{copy}</span></div>;
}

function UpgradeSummaryCards({ plan, previewed }: { plan: UpgradePlanDto; previewed: boolean }) {
  const blockers = blockerCount(plan);
  const reviewed = previewed ? plan.review?.reviewedCount ?? 0 : 0;
  const pending = previewed ? plan.review?.pendingReviewCount ?? blockers : blockers;
  return <div className="upgrade-summary-grid">
    <SummaryCard label="Workspace" counts={plan.summary.workspace} testId="upgrade-summary-workspace" />
    <SummaryCard label="Global" counts={plan.summary.global} testId="upgrade-summary-global" />
    <div className="upgrade-summary-card upgrade-summary-card--conflicts" data-testid="upgrade-summary-conflicts"><span>Conflicts</span><strong>{blockers}</strong><small>{previewed && blockers > 0 ? `${reviewed} reviewed · ${pending} pending` : 'Conflicts and invalid items require explicit review'}</small></div>
  </div>;
}

function displayStatus(status: UpgradeInventoryItemDto['status']): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function UpgradeInventoryTable({ plan, items, batchBusy, selectedReviewIds, toggleSelected, openConflictReview }: {
  plan: UpgradePlanDto; items: UpgradeInventoryItemDto[]; batchBusy: boolean; selectedReviewIds: Set<string>;
  toggleSelected: (itemId: string) => void; openConflictReview: (item: UpgradeInventoryItemDto) => void;
}) {
  return <div className="upgrade-table-scroll">
    <table className="upgrade-table" aria-label="Actionable upgrade artifacts">
      <thead><tr><th scope="col" className="upgrade-table-select-column">Select</th><th scope="col">Artifact</th><th scope="col">Scope</th><th scope="col">Agent(s)</th><th scope="col">Status</th><th scope="col">Review</th><th scope="col">Actions</th></tr></thead>
      <tbody>{items.map((item) => {
        const blocker = item.status === 'conflict' || item.status === 'invalid';
        const eligible = blocker && bulkEligible(plan, item);
        const agents = item.agents?.length ? item.agents.join(', ') : item.agent ?? '—';
        return <tr className={`upgrade-table-row status-${item.status}`} data-kind={item.kind} key={item.id}>
          <td className="upgrade-table-select-cell"><input type="checkbox" aria-label={`Select ${item.file} for latest confirmation`} checked={eligible && selectedReviewIds.has(item.id)} disabled={batchBusy || !eligible} onChange={() => toggleSelected(item.id)} /></td>
          <td className="upgrade-artifact-cell"><strong>{kindLabel(item.kind)}</strong><code className="upgrade-artifact-path">{item.file}</code><small className="upgrade-artifact-detail">{item.reason} · {item.strategy} · user edits {item.userEditsPreserved ? 'preserved' : 'not automatically replaceable'}</small></td>
          <td><span className={`upgrade-table-badge upgrade-scope-badge--${item.scope}`}>{item.scope === 'workspace' ? 'Workspace' : 'Global'}</span></td>
          <td className="upgrade-table-agents">{agents}</td>
          <td><span className={`upgrade-table-badge upgrade-status-badge--${item.status}`}>{displayStatus(item.status)}</span></td>
          <td><span className="upgrade-review-state">{blocker ? reviewState(plan, item.id) : 'Automatic'}</span></td>
          <td className="upgrade-table-actions">{blocker ? <Button aria-label={`Review ${item.file}`} disabled={batchBusy} onClick={() => openConflictReview(item)}>Review</Button> : <span aria-hidden="true">—</span>}</td>
        </tr>;
      })}</tbody>
    </table>
  </div>;
}

function ResultSummary({ result }: { result: UpgradeApplyResultDto }) {
  const updated = result.transactions.filter((item) => item.status === 'updated').length;
  const failed = result.transactions.filter((item) => item.status === 'failed' || item.status === 'rolled-back').length;
  return <div className="upgrade-result" role="status">
    <strong>Upgrade result</strong>
    <span>{updated} transaction groups updated · {failed} failed/rolled back · {result.conflicts.length} reviewed items kept current</span>
    {result.vectorWarnings.map((warning) => <code key={warning}>Vector index: {warning}</code>)}
  </div>;
}

function blockerCount(plan: UpgradePlanDto): number {
  return plan.items.filter((item) => item.status === 'conflict' || item.status === 'invalid').length;
}

function reviewState(plan: UpgradePlanDto, itemId: string): string {
  const item = plan.review?.items.find((row) => row.itemId === itemId);
  if (!item || item.state === 'pending') return item?.stale ? 'Pending review · stale' : 'Pending review';
  if (item.state === 'accept-latest') return 'Confirmed · Latest';
  if (item.state === 'edited') return 'Confirmed · Edited';
  if (item.state === 'force-latest') return 'Confirmed · Force latest';
  return 'Confirmed · Keep current';
}

function bulkEligible(plan: UpgradePlanDto, item: UpgradeInventoryItemDto): boolean {
  if (item.status !== 'conflict' && item.status !== 'invalid') return false;
  if (!isReplaceableConflictKind(item.kind) || item.strategy === 'manual-review' || (item.forceMode ?? 'none') !== 'none') return false;
  const review = plan.review?.items.find((row) => row.itemId === item.id);
  return Boolean(review && review.state === 'pending' && !review.stale);
}

function finalSummary(plan: UpgradePlanDto) {
  const states = plan.review?.items ?? [];
  const automatic = plan.items.filter((item) => item.status === 'outdated').length;
  const latest = states.filter((item) => item.state === 'accept-latest').length;
  const edited = states.filter((item) => item.state === 'edited').length;
  const force = states.filter((item) => item.state === 'force-latest').length;
  const keep = states.filter((item) => item.state === 'keep-current').length;
  return { automatic, latest, edited, force, keep, backups: automatic + latest + edited + force };
}

export function UpgradeTab({ data, reload, toast, modal }: Props) {
  const [preview, setPreview] = useState<UpgradePlanDto | null>(null);
  const [result, setResult] = useState<UpgradeApplyResultDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [batchBusy, setBatchBusy] = useState(false);
  const [selectedReviewIds, setSelectedReviewIds] = useState<Set<string>>(() => new Set());
  const [activeKind, setActiveKind] = useState<UpgradeKindFilter>('all');
  const selectAllVisibleRef = useRef<HTMLInputElement>(null);
  const plan = preview ?? data.upgradePlan;
  const changeCount = plan ? actionable(plan.summary.workspace) + actionable(plan.summary.global) : 0;
  const actionableItems = useMemo(() => preview?.items.filter((item) => item.status !== 'current') ?? [], [preview]);
  const visibleKinds = useMemo(() => new Set(actionableItems.map((item) => item.kind)), [actionableItems]);
  const visibleTabs = useMemo(() => KIND_TABS.filter((entry) => visibleKinds.has(entry.kind)), [visibleKinds]);
  const visibleItems = useMemo(() => actionableItems.filter((item) => activeKind === 'all' || item.kind === activeKind), [actionableItems, activeKind]);
  const totalBlockers = preview ? blockerCount(preview) : 0;
  const reviewedBlockers = preview?.review?.reviewedCount ?? 0;
  const pendingReviewCount = preview ? (preview.review?.pendingReviewCount ?? totalBlockers) : 0;
  const eligibleAllItems = useMemo(() => preview ? actionableItems.filter((item) => bulkEligible(preview, item)) : [], [actionableItems, preview]);
  const eligibleVisibleItems = useMemo(() => preview ? visibleItems.filter((item) => bulkEligible(preview, item)) : [], [visibleItems, preview]);
  const eligibleIds = useMemo(() => new Set(eligibleAllItems.map((item) => item.id)), [eligibleAllItems]);
  const selectedItemIds = useMemo(() => actionableItems.filter((item) => eligibleIds.has(item.id) && selectedReviewIds.has(item.id)).map((item) => item.id), [actionableItems, eligibleIds, selectedReviewIds]);
  const visibleSelectedCount = eligibleVisibleItems.filter((item) => selectedReviewIds.has(item.id)).length;

  useEffect(() => {
    if (activeKind !== 'all' && !visibleKinds.has(activeKind)) setActiveKind('all');
  }, [activeKind, visibleKinds]);

  useEffect(() => {
    setSelectedReviewIds((current) => {
      const next = new Set([...current].filter((id) => eligibleIds.has(id)));
      if (next.size === current.size && [...next].every((id) => current.has(id))) return current;
      return next;
    });
  }, [eligibleIds]);

  useEffect(() => {
    if (!selectAllVisibleRef.current) return;
    selectAllVisibleRef.current.indeterminate = visibleSelectedCount > 0 && visibleSelectedCount < eligibleVisibleItems.length;
  }, [eligibleVisibleItems.length, visibleSelectedCount]);

  async function refreshPreview() {
    setBusy(true);
    try { setPreview(await loadUpgradePlan()); setResult(null); }
    catch (e: any) { toast(e.message || String(e), false); }
    finally { setBusy(false); }
  }

  function updateReview(review: UpgradeReviewSummaryDto) {
    setPreview((current) => current ? { ...current, review } : current);
  }

  async function confirmBatch(itemIds: string[]) {
    if (!preview || itemIds.length === 0) return;
    setBatchBusy(true);
    try {
      const response = await saveUpgradeReviewsBatch(preview.fingerprint, itemIds);
      updateReview(response.review);
      setSelectedReviewIds((current) => new Set([...current].filter((id) => !itemIds.includes(id))));
      toast(`Confirmed latest for ${itemIds.length} conflict${itemIds.length === 1 ? '' : 's'}.`);
    } catch (e: any) {
      const message = e.message || String(e);
      if (/stale/i.test(message)) {
        try { setPreview(await loadUpgradePlan()); setSelectedReviewIds(new Set()); } catch {}
      }
      toast(message, false);
    } finally {
      setBatchBusy(false);
    }
  }

  function toggleSelected(itemId: string) {
    setSelectedReviewIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
      return next;
    });
  }

  function toggleSelectAllVisible() {
    const ids = eligibleVisibleItems.map((item) => item.id);
    if (!ids.length) return;
    setSelectedReviewIds((current) => {
      const next = new Set(current);
      const clear = ids.every((id) => next.has(id));
      for (const id of ids) clear ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function openConflictReview(item: UpgradeInventoryItemDto) {
    if (!preview) return;
    modal.open({
      title: `Review ${kindLabel(item.kind)} conflict`,
      className: 'modal-panel upgrade-conflict-modal',
      content: <UpgradeConflictReviewModal fingerprint={preview.fingerprint} item={item} close={modal.close} onSaved={updateReview} toast={toast} />
    });
  }

  function openApplyReview() {
    if (!preview) return;
    if (pendingReviewCount > 0) { toast(`Review all ${pendingReviewCount} pending conflict file(s) before upgrading.`, false); return; }
    const selected = preview;
    const summary = finalSummary(selected);
    modal.open({
      title: 'Apply Engram configuration upgrade',
      className: 'modal-panel upgrade-confirm-modal',
      content: <UpgradeConfirm close={modal.close} onError={(message) => toast(message, false)} run={async () => {
        try {
          const applied = await applyUpgradePlan(selected.fingerprint, true);
          setResult(applied);
          await reload();
          setPreview(null);
          toast('Engram configuration upgrade complete');
        } catch (e: any) {
          const message = e.message || String(e);
          if (/stale/i.test(message)) {
            try { setPreview(await loadUpgradePlan()); } catch {}
          }
          throw e;
        }
      }}>
        <p className="confirm-copy">All conflicts are reviewed. Apply the exact automatic and confirmed changes below.</p>
        <div className="upgrade-confirm-summary"><span>Automatic: {summary.automatic}</span><span>Accept latest: {summary.latest}</span><span>Edited: {summary.edited}</span><span>Force latest: {summary.force}</span><span>Keep current: {summary.keep}</span><span>Backups: {summary.backups}</span></div>
      </UpgradeConfirm>
    });
  }

  return <section className="upgrade-page" aria-labelledby="upgrade-title">
    <div className="section-header"><div><h2 id="upgrade-title">{changeCount ? 'Engram configuration update available' : 'Configuration upgrades'}</h2><p>Detect and safely upgrade old Engram memories and connected-agent configuration in workspace and global scope.</p></div><CommandHelp href={operationDoc('configuration-upgrades')} label="Open configuration upgrade documentation" command="engram upgrade --help" /></div>
    {plan ? <UpgradeStatusBanner plan={plan} /> : null}
    {plan ? <UpgradeSummaryCards plan={plan} previewed={Boolean(preview)} /> : null}
    <div className="upgrade-actions">
      <Button aria-label="Preview changes" disabled={busy || batchBusy} onClick={() => void refreshPreview()}>{busy ? 'Scanning…' : 'Preview changes'}</Button>
      {preview && changeCount ? <Button variant="primary" aria-label="Upgrade" disabled={pendingReviewCount > 0 || batchBusy} onClick={openApplyReview}>Upgrade</Button> : null}
      {preview && totalBlockers > 0 ? <span className="upgrade-review-progress">Conflicts reviewed: {reviewedBlockers} / {totalBlockers}</span> : null}
    </div>
    {preview ? <div className="upgrade-preview" aria-label="Upgrade preview">
      <div className="upgrade-preview-head"><strong>Preview</strong><code>{preview.currentVersion} → {preview.targetVersion}</code></div>
      <div className="upgrade-kind-tabs" role="tablist" aria-label="Upgrade artifact kind">
        <button role="tab" aria-selected={activeKind === 'all'} className={activeKind === 'all' ? 'active' : ''} onClick={() => setActiveKind('all')}>All</button>
        {visibleTabs.map((entry) => <button key={entry.kind} role="tab" aria-selected={activeKind === entry.kind} className={activeKind === entry.kind ? 'active' : ''} onClick={() => setActiveKind(entry.kind)}>{entry.label}</button>)}
      </div>
      {totalBlockers > 0 ? <div className="upgrade-batch-review-actions">
        <label className="upgrade-select-all"><input ref={selectAllVisibleRef} type="checkbox" aria-label="Select all visible eligible conflicts" checked={eligibleVisibleItems.length > 0 && visibleSelectedCount === eligibleVisibleItems.length} disabled={batchBusy || eligibleVisibleItems.length === 0} onChange={toggleSelectAllVisible} /> Select all visible</label>
        <Button disabled={batchBusy || selectedItemIds.length === 0} onClick={() => void confirmBatch(selectedItemIds)}>{batchBusy ? 'Confirming…' : `Confirm selected changes (${selectedItemIds.length})`}</Button>
        <Button variant="primary" disabled={batchBusy || eligibleAllItems.length === 0} onClick={() => void confirmBatch(eligibleAllItems.map((item) => item.id))}>{batchBusy ? 'Confirming…' : 'Confirm all changes'}</Button>
      </div> : null}
      <UpgradeInventoryTable plan={preview} items={visibleItems} batchBusy={batchBusy} selectedReviewIds={selectedReviewIds} toggleSelected={toggleSelected} openConflictReview={openConflictReview} />
      {preview.warnings.map((warning) => <div className="upgrade-warning" key={warning}>{warning}</div>)}
    </div> : null}
    {result ? <ResultSummary result={result} /> : null}
  </section>;
}
