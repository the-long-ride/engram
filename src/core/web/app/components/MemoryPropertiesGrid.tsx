import { useState, type ReactNode } from 'react';
import { Button } from './Button.js';

const LEFT_PROPS = new Set(['id', 'tags', 'source', 'source_hash', 'source_hashes', 'source_files', 'file', 'path']);
const SPLIT_PROPS = new Set(['source_files', 'source_hashes', 'source_hash', 'tags']);

function formatModalValue(label: string, rawValue: string): string {
  const key = label.toLowerCase().trim();
  if (SPLIT_PROPS.has(key) && rawValue.includes(',')) {
    return rawValue
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .join('\n');
  }
  return rawValue;
}

export function MemoryPropertiesGrid({ properties }: { properties?: Array<[string, string]> }): ReactNode {
  const [activeProp, setActiveProp] = useState<{ label: string; value: string } | null>(null);

  if (!properties?.length) return null;

  const displayVal = activeProp ? formatModalValue(activeProp.label, activeProp.value) : '';

  return (
    <>
      <dl className="memory-modal-properties">
        {properties.map(([key, value]) => {
          const isLeft = LEFT_PROPS.has(key.toLowerCase());
          return (
            <div key={key} className={isLeft ? 'prop-span-2' : 'prop-span-1'}>
              <dt>{key}</dt>
              <dd
                className="prop-val-clickable"
                title="Click to view full value"
                onClick={() => setActiveProp({ label: key, value })}
              >
                {value}
              </dd>
            </div>
          );
        })}
      </dl>

      {activeProp ? (
        <div className="modal-backdrop" onClick={() => setActiveProp(null)} style={{ zIndex: 10050 }}>
          <div className="modal-panel prop-detail-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={activeProp.label}>
            <div className="modal-hdr">
              <span className="card-title">{activeProp.label.toUpperCase()}</span>
              <button className="modal-close" onClick={() => setActiveProp(null)} aria-label="Close detail modal">&times;</button>
            </div>
            <div className="modal-body" style={{ padding: '16px' }}>
              <pre className="mono prop-full-val">{displayVal}</pre>
            </div>
            <div className="modal-actions">
              <Button variant="outline" onClick={() => navigator.clipboard.writeText(displayVal)}>Copy value</Button>
              <Button variant="primary" onClick={() => setActiveProp(null)}>Close</Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
