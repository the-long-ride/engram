// Present upgrade conflict diffs in accessible inline and parallel layouts.
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { buildUpgradeConflictDiff, type UpgradeDiffOp, type UpgradeDiffRow } from './upgrade-conflict-diff-model.js';

type DiffMode = 'inline' | 'parallel';
type Props = { current: string; proposed: string };

function modeTitle(mode: DiffMode): string {
  return mode === 'inline' ? 'Inline' : 'Parallel';
}

function InlineDiff({ ops, changed }: { ops: UpgradeDiffOp[]; changed: boolean }) {
  if (!changed) return <div className="upgrade-diff-empty">(no changes)</div>;
  return <div className="upgrade-diff-inline" aria-label="Inline conflict diff">{ops.map((op, index) => {
    const marker = op.kind === 'removed' ? '-' : op.kind === 'added' ? '+' : ' ';
    return <span className={`upgrade-diff-line upgrade-diff-line--${op.kind}`} key={`${op.kind}-${index}`}>{marker} {op.text || ' '}</span>;
  })}</div>;
}

function ParallelCell({ row, side }: { row: UpgradeDiffRow; side: 'current' | 'proposed' }) {
  const cell = row[side];
  if (!cell) return <span className="upgrade-diff-cell upgrade-diff-cell--empty" aria-hidden="true"> </span>;
  return <span className={`upgrade-diff-cell upgrade-diff-cell--${cell.kind}`}>{cell.text || ' '}</span>;
}

function ParallelPane({ rows, side, title, bodyRef }: {
  rows: UpgradeDiffRow[];
  side: 'current' | 'proposed';
  title: string;
  bodyRef: RefObject<HTMLDivElement | null>;
}) {
  return <div className={`upgrade-diff-pane upgrade-diff-pane--${side}`}>
    <div className="upgrade-diff-column-header">{title}</div>
    <div ref={bodyRef} className="upgrade-diff-column-body" aria-label={`${title} diff content`}>
      {rows.map((row, index) => <ParallelCell key={`${side}-${index}`} row={row} side={side} />)}
    </div>
  </div>;
}

function ParallelDiff({ rows, changed }: { rows: UpgradeDiffRow[]; changed: boolean }) {
  const currentBodyRef = useRef<HTMLDivElement>(null);
  const proposedBodyRef = useRef<HTMLDivElement>(null);
  const syncScrollRef = useRef<HTMLDivElement>(null);
  const [syncWidth, setSyncWidth] = useState(0);

  useEffect(() => {
    if (!changed) return undefined;
    const measure = () => {
      const currentBody = currentBodyRef.current;
      const proposedBody = proposedBodyRef.current;
      const syncScroll = syncScrollRef.current;
      if (!currentBody || !proposedBody || !syncScroll) return;
      const maxRange = Math.max(
        currentBody.scrollWidth - currentBody.clientWidth,
        proposedBody.scrollWidth - proposedBody.clientWidth,
        0,
      );
      setSyncWidth(syncScroll.clientWidth + maxRange);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [changed, rows]);

  if (!changed) return <div className="upgrade-diff-empty">(no changes)</div>;

  const syncHorizontalScroll = () => {
    const scrollLeft = syncScrollRef.current?.scrollLeft ?? 0;
    if (currentBodyRef.current) currentBodyRef.current.scrollLeft = scrollLeft;
    if (proposedBodyRef.current) proposedBodyRef.current.scrollLeft = scrollLeft;
  };

  return <div className="upgrade-diff-parallel" aria-label="Parallel conflict diff">
    <ParallelPane rows={rows} side="current" title="Current" bodyRef={currentBodyRef} />
    <ParallelPane rows={rows} side="proposed" title="Proposed" bodyRef={proposedBodyRef} />
    <div
      ref={syncScrollRef}
      className="upgrade-diff-sync-scroll"
      aria-label="Parallel diff horizontal scroll"
      onScroll={syncHorizontalScroll}
      tabIndex={0}
    >
      <div className="upgrade-diff-sync-scroll-content" style={{ width: `${syncWidth}px` }} />
    </div>
  </div>;
}

export function UpgradeConflictDiff({ current, proposed }: Props) {
  const [mode, setMode] = useState<DiffMode>('inline');
  const diff = useMemo(() => buildUpgradeConflictDiff(current, proposed), [current, proposed]);

  return <section className="upgrade-diff">
    <div className="upgrade-diff-mode-tabs" role="tablist" aria-label="Diff layout">
      {(['inline', 'parallel'] as DiffMode[]).map((candidate) => <button
        key={candidate}
        type="button"
        role="tab"
        aria-selected={mode === candidate}
        className={mode === candidate ? 'active' : ''}
        onClick={() => setMode(candidate)}
      >{modeTitle(candidate)}</button>)}
    </div>
    {mode === 'inline'
      ? <InlineDiff ops={diff.ops} changed={diff.changed} />
      : <ParallelDiff rows={diff.rows} changed={diff.changed} />}
  </section>;
}
