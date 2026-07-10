// Shared tab header primitive for control panel sections.
import type { ReactNode } from 'react';
import { HelpLink } from './HelpLink.js';

export function SectionHeader({ title, copy, actions, className = '', helpHref, helpLabel }: { title: string; copy?: string; actions?: ReactNode; className?: string; helpHref?: string; helpLabel?: string }) {
  return <div className={'tab-hdr ' + className}><div><div className="title-with-help"><h1>{title}</h1>{helpHref ? <HelpLink href={helpHref} label={helpLabel || `Open ${title} documentation`} /> : null}</div>{copy ? <p>{copy}</p> : null}</div>{actions}</div>;
}
