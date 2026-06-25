// Shared card primitive for grouped control panel content.
import type { ReactNode } from 'react';
export function Card({ title, badge, children }: { title: string; badge?: ReactNode; children: ReactNode }) {
  return <div className="card"><div className="card-hdr"><span className="card-title">{title}</span>{badge}</div><div>{children}</div></div>;
}
