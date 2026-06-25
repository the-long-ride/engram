// Shared tab header primitive for control panel sections.
import type { ReactNode } from 'react';
export function SectionHeader({ title, copy, actions, className = '' }: { title: string; copy?: string; actions?: ReactNode; className?: string }) {
  return <div className={'tab-hdr ' + className}><div><h1>{title}</h1>{copy ? <p>{copy}</p> : null}</div>{actions}</div>;
}
