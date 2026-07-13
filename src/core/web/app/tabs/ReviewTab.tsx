import { useEffect, useRef, useState } from 'react';
import type { ApiResult, ModalController, ShowToast } from '../types.js';
import { Card } from '../components/Card.js';
import { DependencyPicker, type DependencyChoice } from '../components/DependencyPicker.js';
import { MemoryDiff } from '../components/MemoryDiff.js';
import { reviewInspect, reviewQueue } from '../api-client.js';

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
type QueueData = { findings?: ReviewItem[]; receipts?: Array<Omit<ReviewItem, 'kind' | 'safe_summary'>> };

export function ReviewTab({ active, toast }: { active: boolean; toast: ShowToast; modal?: ModalController }) {
  const [proposal, setProposal] = useState('');
  const [relations, setRelations] = useState<DependencyChoice[]>([]);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [selected, setSelected] = useState<ReviewItem | null>(null);
  const requestVersion = useRef(0);

  const applySelection = (item: ReviewItem) => {
    setSelected(item);
    setProposal(candidateText(item.candidate));
  };

  const inspect = (item: ReviewItem) => {
    const version = ++requestVersion.current;
    applySelection(item);
    void reviewInspect(item.id).then((detail: ApiResult<{ finding?: ReviewItem; receipt?: ReviewItem }>) => {
      if (version !== requestVersion.current) return;
      applySelection(normalizeItem(detail.data?.finding ?? detail.data?.receipt ?? item));
    }).catch(() => undefined);
  };

  useEffect(() => {
    if (!active) return;
    const version = ++requestVersion.current;
    void reviewQueue().then((result: ApiResult<QueueData>) => {
      if (version !== requestVersion.current) return;
      const findings = result.data?.findings ?? [];
      const receipts = (result.data?.receipts ?? []).map(normalizeItem);
      const next = [...findings, ...receipts];
      setItems(next);
      if (next[0]) inspect(next[0]);
    }).catch(() => setItems([]));
    return () => { requestVersion.current += 1; };
  }, [active]);

  const selectItem = (item: ReviewItem) => {
    setRelations([]);
    inspect(item);
  };
  const relatedIds = [...(selected?.memory_ids ?? []), ...(selected?.related_ids ?? [])];
  return <div className="tab-content task-review">
    <div className="page-header"><div><p className="eyebrow">Review</p><h1>Review queue</h1><p className="muted">Inspect findings and deferred candidates, choose relations, then approve through the normal CLI flow.</p></div></div>
    <Card title="Pending findings">{!items.length ? <p className="muted">No pending findings.</p> : <div className="review-findings">{items.map((item) => <button key={item.id} className={selected?.id === item.id ? 'btn btn-primary' : 'btn btn-outline'} onClick={() => selectItem(item)}>{item.kind}: {item.id}</button>)}</div>}</Card>
    <Card title={selected ? `Finding: ${selected.id}` : 'Finding details'}><p className="muted">{selected?.safe_summary || 'Select a finding to inspect it.'}</p>{relatedIds.length ? <p className="muted">Memory IDs: {relatedIds.join(', ')}</p> : null}</Card>
    <Card title="Proposal preview"><label className="field-label" htmlFor="review-proposal">Proposed memory</label><textarea id="review-proposal" value={proposal} onChange={(event) => setProposal(event.target.value)} placeholder="Paste a sanitized proposal for preview" rows={5} /><p className="muted">Preview only. This screen never writes memory.</p></Card>
    <DependencyPicker ids={relatedIds} value={relations} onChange={setRelations} />
    <MemoryDiff current={selected?.safe_summary ?? ''} proposed={proposal} footer={<div className="tab-actions"><button className="btn btn-outline" onClick={() => { setProposal(''); setRelations([]); toast('Review preview cleared'); }}>Clear preview</button><span className="muted">Selected: {relations.map((item) => `${item.reason}:${item.id}`).join(', ') || 'none'}</span></div>} />
  </div>;
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
