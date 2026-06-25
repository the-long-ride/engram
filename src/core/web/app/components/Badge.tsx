// Shared badge primitive for compact status labels.
import type { ReactNode } from 'react';
export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'pos' | 'neg' | 'blue' | 'amber'; children: ReactNode }) {
  return <span className={'badge badge-' + tone}>{children}</span>;
}
