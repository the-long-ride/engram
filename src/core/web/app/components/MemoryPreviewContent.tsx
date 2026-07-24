import type { ReactNode } from 'react';
import { MemoryPropertiesGrid } from './MemoryPropertiesGrid.js';

export function MemoryPreviewContent({ content, properties }: { content: string; properties?: Array<[string, string]> }): ReactNode {
  return (
    <div className="memory-modal-document">
      <MemoryPropertiesGrid properties={properties} />
      <div className="memory-modal-content">
        <span className="memory-modal-content-label">Content</span>
        <pre className="mono memory-preview-content">{content || '(empty content)'}</pre>
      </div>
    </div>
  );
}
