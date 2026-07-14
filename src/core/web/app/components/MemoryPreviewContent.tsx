import type { ReactNode } from 'react';

export function MemoryPreviewContent({ content, properties }: { content: string; properties?: Array<[string, string]> }): ReactNode {
  return <div className="memory-modal-document">
    {properties?.length ? <dl className="memory-modal-properties">{properties.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl> : null}
    <div className="memory-modal-content"><span className="memory-modal-content-label">Content</span><pre className="mono memory-preview-content">{content || '(empty content)'}</pre></div>
  </div>;
}
