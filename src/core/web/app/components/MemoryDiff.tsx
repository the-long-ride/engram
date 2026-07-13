import type { ReactNode } from 'react';

export type MemoryDiffProps = { current: string; proposed: string; title?: string; footer?: ReactNode };

/** Safe, read-only preview of a proposed memory change. Write controls belong to the approval flow. */
export function MemoryDiff({ current, proposed, title = 'Memory diff', footer }: MemoryDiffProps) {
  return <section className="card memory-diff" aria-label={title}>
    <h3>{title}</h3>
    <div className="memory-diff-grid">
      <div><h4>Current</h4><pre>{current || '(new memory)'}</pre></div>
      <div><h4>Proposed</h4><pre>{proposed || '(empty proposal)'}</pre></div>
    </div>
    {footer}
  </section>;
}
