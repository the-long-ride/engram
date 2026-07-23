// Shared card primitive for grouped control panel content.
import { useState, type ReactNode } from 'react';
import { HelpLink } from './HelpLink.js';

export function Card({
  title,
  badge,
  children,
  helpHref,
  helpLabel,
  collapsible = true,
  defaultExpanded = true,
}: {
  title: string;
  badge?: ReactNode;
  children: ReactNode;
  helpHref?: string;
  helpLabel?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  function handleHeaderClick() {
    if (!collapsible) return;
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) return;
    setExpanded((prev) => !prev);
  }

  return (
    <div className={'card' + (collapsible ? ' collapsible' : '') + (expanded ? '' : ' collapsed')}>
      <div
        className="card-hdr"
        onClick={handleHeaderClick}
        style={collapsible ? { cursor: 'pointer' } : undefined}
      >
        <span className="card-title-wrap">
          <span className="card-title">{title}</span>
          {helpHref ? <HelpLink href={helpHref} label={helpLabel || `Open ${title} docs`} /> : null}
        </span>
        <div className="card-hdr-right" onClick={(e) => e.stopPropagation()}>
          {badge}
          {collapsible ? (
            <button
              type="button"
              className="card-collapse-btn"
              title={expanded ? 'Collapse section' : 'Expand section'}
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((prev) => !prev);
              }}
              aria-expanded={expanded}
            >
              <svg
                className={'card-collapse-icon' + (expanded ? ' expanded' : '')}
                viewBox="0 0 16 16"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 6l4 4 4-4" />
              </svg>
            </button>
          ) : null}
        </div>
      </div>
      {expanded ? <div className="card-body">{children}</div> : null}
    </div>
  );
}
