import type { ReactNode } from 'react';
import { Button } from './Button.js';
import { MemoryPropertiesGrid } from './MemoryPropertiesGrid.js';

export type CompareItem = {
  id: string;
  type?: string;
  scope?: string;
  file?: string;
  properties?: Array<[string, string]>;
  content: string;
};

export function CompareModal({
  title = 'Compare memories',
  items,
  onClose,
}: {
  title?: string;
  items: CompareItem[];
  onClose: () => void;
}): ReactNode {
  if (!items.length) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel compare-modal-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-hdr">
          <h2>{title} ({items.length})</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close compare modal">
            &times;
          </button>
        </div>
        <div className="modal-body compare-modal-body">
          <div className="compare-grid" style={{ gridTemplateColumns: `repeat(${Math.min(items.length, 3)}, minmax(300px, 1fr))` }}>
            {items.map((item, idx) => (
              <div className="compare-column" key={`${item.id}:${idx}`}>
                <div className="compare-column-header">
                  <div className="compare-column-meta">
                    {item.type ? <span className="badge badge-primary">{item.type.toUpperCase()}</span> : null}
                    {item.scope ? <span className="badge badge-neutral">{item.scope.toUpperCase()}</span> : null}
                  </div>
                  <strong className="mono compare-id" title={item.id}>{item.id}</strong>
                  {item.file ? <p className="compare-file mono">{item.file}</p> : null}
                </div>
                {item.properties?.length ? (
                  <MemoryPropertiesGrid properties={item.properties} />
                ) : null}
                <div className="memory-modal-content">
                  <span className="memory-modal-content-label">Content</span>
                  <pre className="mono memory-preview-content">{item.content || '(empty content)'}</pre>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-actions">
          <Button variant="primary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
