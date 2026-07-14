import type { ReactNode } from 'react';

export type MemoryDiffProps = { current: string; proposed: string; title?: string; footer?: ReactNode };

type DiffKind = 'unchanged' | 'removed' | 'added';
type DiffLine = { text: string; kind: DiffKind };

function diffLines(current: string, proposed: string): { current: DiffLine[]; proposed: DiffLine[] } {
  const left = current ? current.split('\n') : [];
  const right = proposed ? proposed.split('\n') : [];
  const rows = left.length + 1;
  const cols = right.length + 1;
  const lcs = Array.from({ length: rows }, () => new Uint16Array(cols));

  for (let row = left.length - 1; row >= 0; row -= 1) {
    for (let col = right.length - 1; col >= 0; col -= 1) {
      lcs[row][col] = left[row] === right[col]
        ? lcs[row + 1][col + 1] + 1
        : Math.max(lcs[row + 1][col], lcs[row][col + 1]);
    }
  }

  const currentLines: DiffLine[] = [];
  const proposedLines: DiffLine[] = [];
  let row = 0;
  let col = 0;
  while (row < left.length || col < right.length) {
    if (row < left.length && col < right.length && left[row] === right[col]) {
      currentLines.push({ text: left[row], kind: 'unchanged' });
      proposedLines.push({ text: right[col], kind: 'unchanged' });
      row += 1;
      col += 1;
    } else if (row < left.length && (!col || lcs[row + 1][col] >= lcs[row][col + 1])) {
      currentLines.push({ text: left[row], kind: 'removed' });
      row += 1;
    } else {
      proposedLines.push({ text: right[col], kind: 'added' });
      col += 1;
    }
  }
  return { current: currentLines, proposed: proposedLines };
}

function DiffPane({ lines, side, empty }: { lines: DiffLine[]; side: 'current' | 'proposed'; empty: string }) {
  if (!lines.length) return <pre><span className="memory-diff-line-empty">{empty}</span></pre>;
  return <pre>{lines.map((line, index) => {
    const marker = line.kind === 'removed' ? '-' : line.kind === 'added' ? '+' : ' ';
    return <span className={`memory-diff-line memory-diff-line-${line.kind}`} key={`${side}-${index}`}>{marker} {line.text || ' '}</span>;
  })}</pre>;
}

/** Safe, read-only preview of a proposed memory change. Write controls belong to the approval flow. */
export function MemoryDiff({ current, proposed, title = 'Memory diff', footer }: MemoryDiffProps) {
  const diff = diffLines(current, proposed);
  return <section className="card memory-diff" aria-label={title}>
    <div className="memory-diff-header"><div><span className="card-title">{title}</span><p>Removed lines are highlighted in red; added lines are highlighted in green.</p></div><span className="memory-diff-readonly">Read-only</span></div>
    <div className="memory-diff-grid">
      <div className="memory-diff-pane current"><div className="memory-diff-pane-header"><h4>Current</h4><span>Source</span></div><DiffPane lines={diff.current} side="current" empty="(new memory)" /></div>
      <div className="memory-diff-pane proposed"><div className="memory-diff-pane-header"><h4>Proposed</h4><span>Preview</span></div><DiffPane lines={diff.proposed} side="proposed" empty="(empty proposal)" /></div>
    </div>
    {footer ? <div className="memory-diff-footer">{footer}</div> : null}
  </section>;
}
