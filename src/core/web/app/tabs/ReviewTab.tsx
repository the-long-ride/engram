import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiResult, ModalController, ShowToast } from '../types.js';
import { DependencyPicker, type DependencyChoice } from '../components/DependencyPicker.js';
import { MemoryDiff } from '../components/MemoryDiff.js';
import { Button } from '../components/Button.js';
import { CompareModal } from '../components/CompareModal.js';
import { MemoryPreviewContent } from '../components/MemoryPreviewContent.js';
import { reviewInspect, reviewPreview, reviewQueue, reviewWrite } from '../api-client.js';
import { copyText } from '../utils/clipboard.js';

type Candidate = { type?: string; text?: string; context?: string; triggers?: string[]; dependsOn?: string[]; updateId?: string };
type ReviewItem = {
  id: string;
  kind: string;
  safe_summary: string;
  memory_ids?: string[];
  related_ids?: string[];
  candidate?: Candidate;
  source?: string;
};
type ReviewMemoryPreview = { id: string; kind: 'memory' | 'candidate'; type: string; scope: string; file?: string; properties: Array<[string, string]>; content: string };
type PreviewData = { previews?: ReviewMemoryPreview[] };
type QueueData = { findings?: ReviewItem[]; receipts?: Array<Omit<ReviewItem, 'kind' | 'safe_summary'>> };

export function ReviewTab({ active, toast, modal }: { active: boolean; toast: ShowToast; modal?: ModalController }) {
  const [proposal, setProposal] = useState('');
  const [relations, setRelations] = useState<DependencyChoice[]>([]);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [selected, setSelected] = useState<ReviewItem | null>(null);
  const [memoryPreviews, setMemoryPreviews] = useState<ReviewMemoryPreview[]>([]);
  const [memoryPreviewLoading, setMemoryPreviewLoading] = useState(false);
  const [memoryPreviewError, setMemoryPreviewError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [writing, setWriting] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
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
  const writeScope: 'workspace' | 'global' = memoryPreviews[0]?.scope === 'global' ? 'global' : 'workspace';
  const generatedCandidate = selected ? candidateText(selected.candidate) || selected.safe_summary : '';
  const reviewPrompt = selected ? buildReviewPrompt(selected, generatedCandidate, memoryPreviews, relations, writeScope) : '';
  const deferredCount = items.filter((item) => item.kind === 'inbox').length;
  const findingCount = items.length - deferredCount;
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
    <div className="page-header review-page-header"><div><h1>Review</h1><p className="muted">Inspect findings, copy prompt, then confirm.</p></div><div className="review-header-meta"><span className="review-count">{items.length} {items.length === 1 ? 'item' : 'items'}</span><span className="review-readonly">Confirm</span><button className="btn btn-outline review-refresh" onClick={refreshQueue} disabled={refreshing} aria-label="Refresh review queue">{refreshing ? 'Refreshing…' : '↻ Refresh'}</button></div></div>
    <div className="review-shell">
      <aside className="card review-queue" aria-label="Pending review items">
        <div className="review-queue-header"><div><span className="card-title">Queue</span><p className="review-queue-meta">{findingCount} findings · {deferredCount} deferred</p></div><span className="review-queue-total">{items.length}</span></div>
        {!items.length ? <div className="review-empty"><span className="review-empty-mark">✓</span><p>No findings</p><span className="muted">Queue clear.</span></div> : <div className="review-queue-list">{items.map((item, index) => <button key={item.id} className={'review-row' + (selected?.id === item.id ? ' selected' : '')} aria-current={selected?.id === item.id ? 'true' : undefined} onClick={() => selectItem(item)}><span className="review-row-top"><span className="review-kind">{item.kind === 'inbox' ? 'Deferred' : item.kind}</span><span className="review-row-index">{String(index + 1).padStart(2, '0')}</span></span><strong title={item.id}>{shortId(item.id)}</strong><span className="review-row-summary">{item.safe_summary}</span></button>)}</div>}
      </aside>
      <section className="review-detail" aria-label="Selected review item">
        {!selected ? <div className="review-empty review-detail-empty"><span className="review-empty-mark">↗</span><h2>Select an item</h2><p className="muted">Choose a finding to inspect context and preview a proposal.</p></div> : <>
          <div className="card review-summary"><div className="review-summary-top"><div><span className="review-kind">{selected.kind === 'inbox' ? 'Deferred candidate' : `${selected.kind} finding`}</span><h2 title={selected.id}>{shortId(selected.id)}</h2></div><span className="review-state">Review</span></div><p>{selected.safe_summary}</p><div className="review-summary-meta"><span>{relatedIds.length} related {relatedIds.length === 1 ? 'memory' : 'memories'}</span><span className="review-id" title={selected.id}>{selected.id}</span></div></div>
          <div className="card review-memory-preview"><div className="review-section-heading"><div><span className="card-title">Context</span><p className="review-section-note">Open only when needed.</p></div><div className="review-section-right">{memoryPreviews.length >= 2 ? <Button variant="outline" className="review-compare-btn" onClick={() => setCompareOpen(true)}>Compare</Button> : null}<span className="review-step">01</span></div></div>{memoryPreviewLoading ? <div className="review-preview-state">Loading…</div> : memoryPreviewError ? <div className="review-preview-state error">{memoryPreviewError}</div> : !memoryPreviews.length ? <div className="review-preview-state">No readable memory linked.</div> : <div className="review-preview-list">{memoryPreviews.map((preview) => <article className="review-memory-item" key={`${preview.kind}:${preview.id}`}><div className="review-memory-item-hdr"><div className="review-memory-item-meta"><span className="badge badge-primary">{preview.type ? preview.type.toUpperCase() : 'MEMORY'}</span><span className="badge badge-neutral">{preview.scope ? preview.scope.toUpperCase() : 'WORKSPACE'}</span><strong className="mono review-memory-item-id" title={preview.id}>{preview.id}</strong></div><Button variant="primary" style={{ height: 26, fontSize: 11, padding: '0 12px', fontWeight: 600 }} onClick={() => openMemoryModal(preview)}>Open</Button></div></article>)}</div>}</div>
          <div className="card review-proposal"><div className="review-section-heading"><div><span className="card-title">Review prompt</span><p className="review-section-note">Copied prompt lets agent write.</p></div><span className="review-step">02</span></div><div className="review-candidate-block"><div className="review-candidate-heading"><span>Candidate</span><span className="review-readonly">Read-only</span></div><pre className="review-candidate">{generatedCandidate || '(no candidate text)'}</pre></div><div className="review-prompt-actions"><button className="btn btn-outline" onClick={() => copyText(reviewPrompt, toast, 'Copied review prompt')}>Copy review prompt</button><button className="btn btn-primary" onClick={confirmWrite} disabled={!proposal.trim() || writing}>{writing ? 'Writing…' : 'Write'}</button><span className="muted">If agent cannot write, paste reply and confirm.</span></div><details className="review-paste"><summary>Paste AI output</summary><label className="field-label" htmlFor="review-proposal">Proposal</label><textarea id="review-proposal" aria-label="Paste AI output" value={proposal} onChange={(event) => setProposal(event.target.value)} placeholder="Paste AI output" rows={7} /><p className="muted">Writes to {writeScope} memory after confirmation.</p></details></div>
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

function normalizeItem(item: Omit<ReviewItem, 'kind' | 'safe_summary'> | ReviewItem): ReviewItem {
  if ('kind' in item && 'safe_summary' in item) return item;
  return {
    ...item,
    kind: 'inbox',
    safe_summary: `${item.source ?? 'deferred save'}: ${item.candidate?.type ?? 'memory'} candidate awaiting relation review`
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
