// Shared card primitive for grouped control panel content.
import type { ReactNode } from 'react';
import { HelpLink } from './HelpLink.js';

export function Card({ title, badge, children, helpHref, helpLabel }: { title: string; badge?: ReactNode; children: ReactNode; helpHref?: string; helpLabel?: string }) {
  return <div className="card"><div className="card-hdr"><span className="card-title-wrap"><span className="card-title">{title}</span>{helpHref ? <HelpLink href={helpHref} label={helpLabel || `Open ${title} docs`} /> : null}</span>{badge}</div><div>{children}</div></div>;
}
