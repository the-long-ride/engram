import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiResult, ModalController, ShowToast } from '../types.js';
import { DependencyPicker, type DependencyChoice } from '../components/DependencyPicker.js';
import { MemoryDiff } from '../components/MemoryDiff.js';
import { Button } from '../components/Button.js';
import { CompareModal } from '../components/CompareModal.js';
import { MemoryPreviewContent } from '../components/MemoryPreviewContent.js';
import { reviewInspect, reviewPreview, reviewQueue, reviewWrite, reviewDismiss, reviewApplyReceipts } from '../api-client.js';
import { copyText } from '../utils/clipboard.js';

type Candidate = { type?: string; text?: string; context?: string; triggers?: string[]; dependsOn?: string[]; updateId?: string };
type ReviewItem = {
  id: string;
  kind: string;
  safe_summary: string;
  scope?: 'workspace' | 'global';
  memory_ids?: string[];
  related_ids?: string[];
  candidate?: Candidate;
  source?: string;
};
type ReviewMemoryPreview = { id: string; kind: 'memory' | 'candidate'; type: string; scope: string; file?: string; properties: Array<[string, string]>; content: string };
type PreviewData = { previews?: ReviewMemoryPreview[] };
type QueueData = { findings?: ReviewItem[]; receipts?: Array<Omit<ReviewItem, 'kind' | 'safe_summary'>> };
type ReviewFilter = 'all' | 'session-learning' | 'inbox' | 'finding';

export function ReviewTab({ active, toast, modal }: { active: boolean; toast: ShowToast; modal?: ModalController }) {
  const [proposal, setProposal] = useState('');
  const [relations, setRelations] = useState<DependencyChoice[]>([]);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [filter, setFilter] = useState<ReviewFilter>('all');
  const [selected, setSelected] = useState<ReviewItem | null>(null);
  const [memoryPreviews, setMemoryPreviews] = useState<ReviewMemoryPreview[]>([]);
  const [memoryPreviewLoading, setMemoryPreviewLoading] = useState(false);
  const [memoryPreviewError, setMemoryPreviewError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [writing, setWriting] = useState(false);
  const [applying, setApplying] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const requestVersion = useRef(0);
  const queueVersion = useRef(0);
  const previewVersion = useRef(0);

  function openMemoryModal(preview: ReviewMemoryPreview) {
    if (!modal) return;
    modal.open({
      title: preview.id || preview.file || 'Memory detail',
      copyContent: preview.content || '',
      copyLabel: 'Copied content',
      className: 'modal-panel memory-preview-modal',
      content: <MemoryPreviewContent content={preview.content || ''} properties={preview.properties} />,
      actions: <Button variant="primary" onClick={modal.close}>Close</Button>
    });
  }

  const applySelection = (item: ReviewItem) => {
    setSelected(item);
    setProposal('');
  };

  function toggleCheck(id: string) {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function generateBulkPrompt(bulkItems: ReviewItem[], scope: 'workspace' | 'global'): string {
    const sections = bulkItems.map((item, i) => {
      const relatedIds = [...(item.memory_ids ?? []), ...(item.related_ids ?? [])];
      return [
        `### Item ${String(i + 1).padStart(2, '0')}: ${item.id}`,
        `**Kind:** ${item.kind}`,
        `**Summary:** ${item.safe_summary}`,
        relatedIds.length ? `**Related IDs:** ${relatedIds.join(', ')}` : '',
      ].filter(Boolean).join('\n');
    });

    return [
      '# Engram Review Queue — Bulk Review',
      '',
      `**Total items:** ${bulkItems.length}`,
      `**Scope:** ${scope}`,
      '',
      '## Instructions',
      '',
      'For each finding below, classify the relationship between the two memory IDs and output exactly one of:',
      '',
      '- **MERGE**: True duplicate. Both memories cover the same fact.',
      '  Output one merged candidate. Keep one ID. Add `UPDATE: <other-id>` so Engram archives the loser.',
      '',
      '- **CONTRADICT**: True contradiction. Both cannot be true simultaneously.',
      '  Pick the winner. Output a candidate keeping the winner ID. Add `ARCHIVE: <loser-id>` so Engram removes it.',
      '  Use sparingly — most flagged "contradictions" are actually siblings (see below).',
      '',
      '- **SIBLING**: Distinct memories that share a theme but are not duplicates or contradictions.',
      '  This is the most common case. Propose a NEW parent memory that generalizes both.',
      '  The parent must capture the shared theme without duplicating child-specific content.',
      '  Output: `PARENT CANDIDATE` (a new memory), then for each child add `DEPENDS_ON: <parent-id>` (or `UPDATE: <parent-id>` if replacing).',
      '  The new parent id will be derived from its TYPE + summary; reference children by their full IDs.',
      '  If the two memories have no genuine shared theme, choose DISMISS instead.',
      '',
      '- **DISMISS**: False positive. The two memories are unrelated or the finding is noise.',
      '  Output: `RESULT: DISMISS\\nID: <finding-id>\\nNOTE: <short reason>`.',
      '  The user can then run: `engram review dismiss <finding-id> --note "<reason>"` (or use the web UI Dismiss button).',
      '',
      'Do not invent facts not present in the summaries. If a summary is too short to classify, choose DISMISS with note "insufficient signal to classify".',
      '',
      '---',
      '',
      '## Findings',
      '',
      ...sections,
      '',
      '---',
      '',
      '## Output format',
      '',
      'For each item, output a block starting with the item header:',
      '',
      '```',
      '### Item NN: <finding-id>',
      'RESULT: MERGE | CONTRADICT | SIBLING | DISMISS',
      'KEEP: <id>                     # for MERGE / CONTRADICT',
      'UPDATE: <other-id>              # for MERGE (marks loser as replaced)',
      'ARCHIVE: <loser-id>             # for CONTRADICT',
      'PARENT CANDIDATE:              # for SIBLING',
      'TYPE: knowledge | rule | ...',
      'TEXT: <generalizing theme>',
      'TRIGGERS: shared,tags',
      'CHILDREN: <id-a>, <id-b>       # add DEPENDS_ON: <parent-derived-id> to each child',
      'NOTE: <why>                    # for DISMISS',
      '```',
      '',
      'Return all item blocks in order. No extra commentary.',
      '',
      '## WRITE',
      '',
      `If you can write directly, run: engram save-session --scope ${scope} --force "<exact sanitized proposal>" per accepted candidate.`,
      'For SIBLING parents, save the parent first, then update each child to add DEPENDS_ON.',
      'For DISMISS, the user runs: engram review dismiss <finding-id> --note "<reason>"',
    ].join('\n');
  }

  function copyAllPrompts() {
    if (!items.length) { toast('No items in queue', false); return; }
    copyText(generateBulkPrompt(items, writeScope), toast, 'Copied all prompts');
  }

  function copySelectedPrompts() {
    const selected = items.filter(i => checkedIds.has(i.id));
    if (!selected.length) { toast('No items selected', false); return; }
    copyText(generateBulkPrompt(selected, writeScope), toast, `Copied ${selected.length} prompts`);
  }

  function downloadPromptsMd() {
    if (!items.length) { toast('No items in queue', false); return; }
    const content = generateBulkPrompt(items, writeScope);
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'engram-review-queue.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('Downloaded prompt.md');
  }

  async function dismissSelected() {
    const selected = items.filter(i => checkedIds.has(i.id));
    if (!selected.length) { toast('No items selected', false); return; }

    async function doDismiss() {
      const result = await reviewDismiss(selected.map(i => i.id));
      const count = result.data?.dismissed?.length ?? 0;
      const errs = result.data?.errors;
      toast(`Dismissed ${count} item${count !== 1 ? 's' : ''}${errs ? `, ${errs.length} failed` : ''}`, !errs?.length);
      setCheckedIds(new Set());
      await refreshQueue();
    }

    if (!modal) { await doDismiss(); return; }
    modal.open({
      title: 'Dismiss items?',
      content: <div className="confirm-copy"><p>Dismiss {selected.length} selected item{selected.length !== 1 ? 's' : ''} from the review queue.</p><p>Dismissals persist by fingerprint and do not reappear on rebuild.</p></div>,
      actions: <><button className="btn btn-outline" onClick={modal.close}>Cancel</button><button className="btn btn-danger" onClick={() => { modal.close(); void doDismiss(); }}>Dismiss</button></>
    });
  }

  const inspect = (item: ReviewItem) => {
    const version = ++requestVersion.current;
    applySelection(item);
    loadMemoryPreview(item);
    void reviewInspect(item.id).then((detail: ApiResult<{ finding?: ReviewItem; receipt?: ReviewItem }>) => {
      if (version !== requestVersion.current) return;
      const inspected = normalizeItem(detail.data?.finding ?? detail.data?.receipt ?? item);
      applySelection(inspected);
    }).catch(() => undefined);
  };

  function loadMemoryPreview(item: ReviewItem) {
    const version = ++previewVersion.current;
    setMemoryPreviewLoading(true);
    setMemoryPreviewError('');
    setMemoryPreviews([]);
    void reviewPreview(item.id, item.memory_ids ?? []).then((result: ApiResult<PreviewData>) => {
      if (version !== previewVersion.current) return;
      setMemoryPreviews(result.data?.previews ?? []);
    }).catch((error: any) => {
      if (version !== previewVersion.current) return;
      setMemoryPreviewError(error.message || 'Memory preview unavailable');
    }).finally(() => {
      if (version === previewVersion.current) setMemoryPreviewLoading(false);
    });
  }

  const refreshQueue = useCallback(() => {
    const version = ++queueVersion.current;
    setRefreshing(true);
    void reviewQueue().then((result: ApiResult<QueueData>) => {
      if (version !== queueVersion.current) return;
      const findings = result.data?.findings ?? [];
      const receipts = (result.data?.receipts ?? []).map(normalizeItem);
      const next = [...findings, ...receipts];
      setItems(next);
      setRelations([]);
      setCheckedIds(new Set());
      setSelected(next[0] ?? null);
      setProposal('');
      if (next[0]) inspect(next[0]);
      else { setMemoryPreviews([]); setMemoryPreviewError(''); }
    }).catch(() => {
      if (version === queueVersion.current) {
        setItems([]);
        setSelected(null);
        setProposal('');
        setMemoryPreviews([]);
      }
    }).finally(() => {
      if (version === queueVersion.current) setRefreshing(false);
    });
  }, []);

  useEffect(() => {
    if (!active) return;
    refreshQueue();
    return () => { requestVersion.current += 1; queueVersion.current += 1; previewVersion.current += 1; };
  }, [active, refreshQueue]);

  const selectItem = (item: ReviewItem) => {
    setRelations([]);
    inspect(item);
  };
  const relatedIds = [...(selected?.memory_ids ?? []), ...(selected?.related_ids ?? [])];
  const currentMemory = memoryPreviews.map((preview) => preview.content).filter(Boolean).join('\n\n---\n\n');
  const writeScope: 'workspace' | 'global' = selected?.scope === 'global' || memoryPreviews[0]?.scope === 'global' ? 'global' : 'workspace';
  const generatedCandidate = selected ? candidateText(selected.candidate) || selected.safe_summary : '';
  const reviewPrompt = selected ? buildReviewPrompt(selected, generatedCandidate, memoryPreviews, relations, writeScope) : '';
  const sessionLearningCount = items.filter((item) => item.kind === 'inbox' && item.source === 'session-learning').length;
  const deferredCount = items.filter((item) => item.kind === 'inbox').length;
  const findingCount = items.length - deferredCount;
  const visibleItems = items.filter((item) => {
    if (filter === 'session-learning') return item.kind === 'inbox' && item.source === 'session-learning';
    if (filter === 'inbox') return item.kind === 'inbox' && item.source !== 'session-learning';
    if (filter === 'finding') return item.kind !== 'inbox';
    return true;
  });
  const selectFilter = (nextFilter: 'all' | 'session-learning' | 'inbox' | 'finding') => {
    setFilter(nextFilter);
    const nextVisible = items.filter((item) => {
      if (nextFilter === 'session-learning') return item.kind === 'inbox' && item.source === 'session-learning';
      if (nextFilter === 'inbox') return item.kind === 'inbox' && item.source !== 'session-learning';
      if (nextFilter === 'finding') return item.kind !== 'inbox';
      return true;
    });
    if (selected && nextVisible.some((item) => item.id === selected.id)) return;
    if (nextVisible[0]) {
      selectItem(nextVisible[0]);
    } else {
      setSelected(null);
      setProposal('');
      setRelations([]);
      setMemoryPreviews([]);
      setMemoryPreviewError('');
    }
  };
  const checkedReceiptIds = items.filter((item) => item.kind === 'inbox' && checkedIds.has(item.id)).map((item) => item.id);

  function approveReceipts(ids: string[]) {
    if (!ids.length) { toast('No receipts selected', false); return; }

    async function doApprove() {
      setApplying(true);
      try {
        const result = await reviewApplyReceipts({ ids, scope: writeScope, confirmed: true });
        const data = result.data ?? {};
        const appliedCount = data.applied?.length ?? 0;
        const deferredLen = data.deferred?.length ?? 0;
        const errsLen = data.errors?.length ?? 0;
        toast(data.message || `Applied ${appliedCount} receipt${appliedCount === 1 ? '' : 's'}`, errsLen === 0 && deferredLen === 0);
        setCheckedIds(new Set());
        await refreshQueue();
      } catch (error: any) {
        toast(error.message || 'Receipt approval failed', false);
      } finally {
        setApplying(false);
      }
    }

    if (!modal) { void doApprove(); return; }
    modal.open({
      title: ids.length === 1 ? 'Approve receipt?' : `Approve ${ids.length} receipts?`,
      content: <div className="confirm-copy"><p>Save {ids.length} selected receipt{ids.length !== 1 ? 's' : ''} to <strong>{writeScope}</strong> memory.</p><p>Engram validates duplicates and dependencies before writing; receipts needing manual review stay in the queue.</p></div>,
      actions: <><button className="btn btn-outline" onClick={modal.close}>Cancel</button><button className="btn btn-primary" onClick={() => { modal.close(); void doApprove(); }}>{ids.length === 1 ? 'Approve receipt' : `Approve ${ids.length}`}</button></>
    });
  }

  async function dismissSingle(item: ReviewItem) {
    try {
      const result = await reviewDismiss([item.id]);
      const count = result.data?.dismissed?.length ?? 0;
      const errs = result.data?.errors;
      toast(`Dismissed ${count} item${count !== 1 ? 's' : ''}${errs ? `, ${errs.length} failed` : ''}`, !errs?.length);
      await refreshQueue();
    } catch (error: any) {
      toast(error.message || 'Dismiss failed', false);
    }
  }

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = (event.target as HTMLElement | null) || (document.activeElement as HTMLElement | null);
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) return;
      if (document.querySelector('.modal-backdrop')) return;
      if (!visibleItems.length) return;
      const idx = selected ? visibleItems.findIndex((i) => i.id === selected.id) : -1;
      if (event.key === 'j' || event.key === 'ArrowDown') {
        event.preventDefault();
        const next = visibleItems[idx < 0 ? 0 : Math.min(idx + 1, visibleItems.length - 1)];
        if (next && next.id !== selected?.id) selectItem(next);
      } else if (event.key === 'k' || event.key === 'ArrowUp') {
        event.preventDefault();
        const prev = visibleItems[idx <= 0 ? 0 : idx - 1];
        if (prev && prev.id !== selected?.id) selectItem(prev);
      } else if (event.key === 'a' && selected?.kind === 'inbox' && !applying) {
        event.preventDefault();
        approveReceipts([selected.id]);
      } else if (event.key === 'd' && selected) {
        event.preventDefault();
        void dismissSingle(selected);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active, visibleItems, selected, applying]);

  const writeProposal = async () => {
    if (!proposal.trim()) return;
    setWriting(true);
    try {
      const result = await reviewWrite({ proposal, scope: writeScope, relations, confirmed: true });
      toast(result.data?.message || 'Memory written');
      setProposal('');
      setRelations([]);
      await refreshQueue();
    } catch (error: any) {
      toast(error.message || 'Memory write failed', false);
    } finally {
      setWriting(false);
    }
  };
  const confirmWrite = () => {
    if (!proposal.trim()) { toast('Paste proposal before writing', false); return; }
    if (!modal) { toast('Confirmation dialog unavailable', false); return; }
    modal.open({ title: 'Write memory?', content: <div className="confirm-copy"><p>Write reviewed proposal to <strong>{writeScope}</strong> memory.</p><p>Engram validates before saving.</p></div>, actions: <><button className="btn btn-outline" onClick={modal.close}>Cancel</button><button className="btn btn-primary" onClick={() => { modal.close(); void writeProposal(); }}>Write memory</button></> });
  };
  return <div className="tab-content task-review">
    <div className="page-header review-page-header"><div><h1>Review</h1><p className="muted">Inspect findings, copy prompt, then confirm. <span className="review-shortcut-hint">j/k nav · a approve · d dismiss</span></p></div><div className="review-header-meta"><span className="review-count">{items.length} {items.length === 1 ? 'item' : 'items'}</span><span className="review-readonly">Confirm</span><button className="btn btn-outline review-refresh" onClick={refreshQueue} disabled={refreshing} aria-label="Refresh review queue">{refreshing ? 'Refreshing…' : '↻ Refresh'}</button></div></div>
    <div className="review-shell">
      <aside className="card review-queue" aria-label="Pending review items">
        <div className="review-queue-header">
          <div>
            <span className="card-title">Queue</span>
            <p className="review-queue-meta">{findingCount} findings · {deferredCount} deferred</p>
          </div>
          <div className="review-queue-toolbar">
            <button className="btn btn-outline btn-xs" type="button" onClick={copyAllPrompts} title="Copy review prompts for all items">Copy all</button>
            <button className="btn btn-outline btn-xs" type="button" onClick={downloadPromptsMd} title="Download all prompts as markdown">Download .md</button>
            {checkedIds.size > 0 && (
              <>
                {checkedReceiptIds.length > 0 && (
                  <button className="btn btn-primary btn-xs" type="button" disabled={applying} onClick={() => approveReceipts(checkedReceiptIds)} title="Approve and save selected receipts">{applying ? 'Approving…' : `Approve ${checkedReceiptIds.length}`}</button>
                )}
                <button className="btn btn-outline btn-xs" type="button" onClick={copySelectedPrompts} title="Copy prompts for selected items">Copy {checkedIds.size}</button>
                <button className="btn btn-outline-danger btn-xs" type="button" onClick={dismissSelected} title="Dismiss selected items from review queue">Dismiss {checkedIds.size}</button>
              </>
            )}
            <span className="review-queue-total">{visibleItems.length}</span>
          </div>
        </div>
        <div className="review-filter-tabs" role="tablist" aria-label="Filter review queue">
          {([
            ['all', 'All', items.length],
            ['session-learning', 'Session learning', sessionLearningCount],
            ['inbox', 'Deferred', deferredCount - sessionLearningCount],
            ['finding', 'Findings', findingCount],
          ] as const).map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              className={'btn btn-xs ' + (filter === key ? 'btn-primary' : 'btn-outline')}
              onClick={() => selectFilter(key)}
            >
              {label}{count > 0 ? ` (${count})` : ''}
            </button>
          ))}
        </div>
        {!items.length ? <div className="review-empty"><span className="review-empty-mark">✓</span><p>No findings</p><span className="muted">Queue clear.</span></div> : !visibleItems.length ? <div className="review-empty"><span className="review-empty-mark">✓</span><p>No matching items</p><span className="muted">Try another filter.</span></div> : <div className="review-queue-list">{visibleItems.map((item, index) => (
            <div
              key={item.id}
              className={'review-row' + (selected?.id === item.id ? ' selected' : '') + (checkedIds.has(item.id) ? ' checked' : '')}
              aria-current={selected?.id === item.id ? 'true' : undefined}
              role="button"
              tabIndex={0}
              onClick={() => selectItem(item)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectItem(item); }}}
            >
              <div className="review-row-top">
                <label className="review-row-check" onClick={(e) => e.stopPropagation()} title="Select for bulk operations">
                  <input
                    type="checkbox"
                    checked={checkedIds.has(item.id)}
                    onChange={() => toggleCheck(item.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </label>
                <span className="review-kind">{itemKindLabel(item)}</span>
                <span className="review-row-index">{String(index + 1).padStart(2, '0')}</span>
              </div>
              <strong title={item.id}>{shortId(item.id)}</strong>
              <span className="review-row-summary">{item.safe_summary}</span>
            </div>
          ))}</div>}
      </aside>
      <section className="review-detail" aria-label="Selected review item">
        {!selected ? <div className="review-empty review-detail-empty"><span className="review-empty-mark">↗</span><h2>Select an item</h2><p className="muted">Choose a finding to inspect context and preview a proposal.</p></div> : <>
          <div className="card review-summary"><div className="review-summary-top"><div><span className="review-kind">{itemKindLabel(selected, true)}</span><h2 title={selected.id}>{shortId(selected.id)}</h2></div><div className="review-summary-actions">{selected.kind === 'inbox' ? <button className="btn btn-primary btn-xs" type="button" disabled={applying} onClick={() => approveReceipts([selected.id])}>{applying ? 'Approving…' : 'Approve receipt'}</button> : null}<button className="btn btn-outline-danger btn-xs" type="button" onClick={() => void dismissSingle(selected)}>Dismiss</button><span className="review-state">Review</span></div></div><p>{selected.safe_summary}</p><div className="review-summary-meta"><span>{relatedIds.length} related {relatedIds.length === 1 ? 'memory' : 'memories'}</span><span className="review-id" title={selected.id}>{selected.id}</span></div></div>
          <div className="card review-memory-preview"><div className="review-section-heading"><div><span className="card-title">Context</span><p className="review-section-note">Open only when needed.</p></div><div className="review-section-right">{memoryPreviews.length >= 2 ? <Button variant="outline" className="review-compare-btn" onClick={() => setCompareOpen(true)}>Compare</Button> : null}<span className="review-step">01</span></div></div>{memoryPreviewLoading ? <div className="review-preview-state">Loading…</div> : memoryPreviewError ? <div className="review-preview-state error">{memoryPreviewError}</div> : !memoryPreviews.length ? <div className="review-preview-state">No readable memory linked.</div> : <div className="review-preview-list">{memoryPreviews.map((preview) => <article className="review-memory-item" key={`${preview.kind}:${preview.id}`}><div className="review-memory-item-hdr"><div className="review-memory-item-meta"><span className="badge badge-primary">{preview.type ? preview.type.toUpperCase() : 'MEMORY'}</span><span className="badge badge-neutral">{preview.scope ? preview.scope.toUpperCase() : 'WORKSPACE'}</span><strong className="mono review-memory-item-id" title={preview.id}>{preview.id}</strong></div><Button variant="primary" className="btn-xs" onClick={() => openMemoryModal(preview)}>Open</Button></div></article>)}</div>}</div>
          <details className="card review-proposal" open={selected.kind !== 'inbox'}><summary className="review-section-heading"><div><span className="card-title">Review prompt</span><p className="review-section-note">Copied prompt lets agent write.</p></div><span className="review-step">02</span></summary><div className="review-candidate-block"><div className="review-candidate-heading"><span>Candidate</span><span className="review-readonly">Read-only</span></div><pre className="review-candidate">{generatedCandidate || '(no candidate text)'}</pre></div><div className="review-prompt-actions"><button className="btn btn-outline" onClick={() => copyText(reviewPrompt, toast, 'Copied review prompt')}>Copy review prompt</button><button className="btn btn-primary" onClick={confirmWrite} disabled={!proposal.trim() || writing}>{writing ? 'Writing…' : 'Write'}</button><span className="muted">If agent cannot write, paste reply and confirm.</span></div><details className="review-paste"><summary>Paste AI output</summary><label className="field-label" htmlFor="review-proposal">Proposal</label><textarea id="review-proposal" aria-label="Paste AI output" value={proposal} onChange={(event) => setProposal(event.target.value)} placeholder="Paste AI output" rows={7} /><p className="muted">Writes to {writeScope} memory after confirmation.</p></details></details>
          <DependencyPicker ids={relatedIds} value={relations} onChange={setRelations} />
          <RelationSummary relations={relations} />
        </>}
      </section>
    </div>
    {compareOpen ? <CompareModal items={memoryPreviews} onClose={() => setCompareOpen(false)} /> : null}
    {proposal.trim() ? <MemoryDiff current={currentMemory || selected?.safe_summary || ''} proposed={proposal} footer={<div className="tab-actions"><button className="btn btn-outline" onClick={() => { setProposal(''); setRelations([]); toast('Review preview cleared'); }}>Clear preview</button></div>} /> : null}
  </div>;
}

function shortId(id: string): string {
  if (id.length <= 62) return id;
  return `${id.slice(0, 29)}…${id.slice(-28)}`;
}

function itemKindLabel(item: ReviewItem, detail = false): string {
  if (item.kind === 'inbox') {
    if (item.source === 'session-learning') return 'Session learning';
    return detail ? 'Deferred candidate' : 'Deferred';
  }
  return detail ? `${item.kind} finding` : item.kind;
}

function normalizeItem(item: Omit<ReviewItem, 'kind' | 'safe_summary'> | ReviewItem): ReviewItem {
  if ('kind' in item && 'safe_summary' in item) return item;
  return {
    ...item,
    kind: 'inbox',
    source: item.source,
    safe_summary: `[${item.candidate?.type ?? 'memory'}] ${item.candidate?.text ?? 'candidate awaiting review'}`
  };
}

function candidateText(candidate?: Candidate): string {
  if (!candidate?.text) return '';
  const fields = [`TYPE: ${candidate.type ?? 'knowledge'}`, `TEXT: ${candidate.text}`];
  if (candidate.context) fields.push(`ORIGIN: ${candidate.context}`);
  if (candidate.triggers?.length) fields.push(`TRIGGERS: ${candidate.triggers.join(', ')}`);
  if (candidate.dependsOn?.length) fields.push(`DEPENDS_ON: ${candidate.dependsOn.join(', ')}`);
  if (candidate.updateId) fields.push(`UPDATE: ${candidate.updateId}`);
  return fields.join(' | ');
}

function RelationSummary({ relations }: { relations: DependencyChoice[] }) {
  return <div className="review-relation-summary" aria-live="polite"><span className="review-relation-summary-label">Relations</span>{relations.length ? relations.map((relation) => <span className="review-relation-chip" key={`${relation.reason}:${relation.id}`}><strong>{relation.reason === 'UPDATE' ? 'Replaces' : 'Depends on'}</strong><code title={relation.id}>{shortId(relation.id)}</code></span>) : <span className="muted">No relation selected.</span>}</div>;
}

function buildReviewPrompt(item: ReviewItem, candidate: string, previews: ReviewMemoryPreview[], relations: DependencyChoice[], scope: 'workspace' | 'global'): string {
  const context = previews.length
    ? previews.map((preview) => [`MEMORY ID: ${preview.id}`, `SCOPE: ${preview.scope}`, preview.file ? `FILE: ${preview.file}` : '', 'CONTENT:', preview.content || '(empty content)'].filter(Boolean).join('\n')).join('\n\n---\n\n')
    : '(memory content unavailable)';
  const relatedIds = [...(item.memory_ids ?? []), ...(item.related_ids ?? [])];
  const relationIds = relatedIds.length ? relatedIds.join(', ') : '(none available)';
  const selectedRelations = relations.length
    ? relations.map((relation) => `${relation.reason}: ${relation.id}`).join(', ')
    : '(none selected)';
  return [
    'Review Engram candidate.',
    'Return only sanitized proposal. No commentary, fences, or invented facts.',
    `ITEM: ${item.id}`,
    `CANDIDATE:\n${candidate || '(empty candidate)'}`,
    `CONTEXT:\n${context}`,
    `RELATION IDS: ${relationIds}`,
    `RELATIONS: ${selectedRelations}`,
    'WRITE:',
    `If you can write here, run: engram save-session --scope ${scope} --force "<exact sanitized proposal>". Otherwise return only the proposal.`
  ].join('\n\n');
}
