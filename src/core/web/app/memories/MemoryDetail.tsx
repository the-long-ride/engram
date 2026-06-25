// Detail panel for the selected memory graph node.
import { useEffect, useState } from 'react';
import type { MemoryNode } from './graph-types.js';
import { Button } from '../components/Button.js';
import { Badge } from '../components/Badge.js';
import { getJson } from '../api-client.js';
import { copyText } from '../utils/clipboard.js';
import type { ShowToast } from '../types.js';

export function MemoryDetail({
  node,
  view,
  editMemoryFromGraph,
  archiveMemoryFromGraph,
  toast
}: {
  node: MemoryNode | null;
  view: (node: MemoryNode) => void;
  editMemoryFromGraph: (node: MemoryNode) => void;
  archiveMemoryFromGraph: (node: MemoryNode) => void;
  toast: ShowToast;
}) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!node) {
      setContent('');
      return;
    }
    let active = true;
    setLoading(true);
    setContent('');

    getJson('/api/memory?profile=' + encodeURIComponent(node.profile || '') + '&scope=' + encodeURIComponent(node.scope || node.sourceScope || 'global') + '&file=' + encodeURIComponent(node.file || ''))
      .then((res: any) => {
        if (active) {
          setContent(res.content || '');
          setLoading(false);
        }
      })
      .catch((e: any) => {
        if (active) {
          if (toast) toast(e.message, false);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [node]);

  if (!node) return <aside className="memory-detail"><div className="core-empty">Select a memory.</div></aside>;

  return (
    <aside className="memory-detail">
      <div className="memory-detail-hdr">
        <Badge>{node.profile}</Badge>
        <Badge>{node.scope || node.sourceScope}</Badge>
        {node.workspaceName ? <Badge tone="blue">{node.workspaceName}</Badge> : null}
      </div>
      <h2>{node.memoryId}</h2>

      <div className="memory-detail-body">
        {loading ? (
          <div className="core-empty">Loading content...</div>
        ) : (
          <pre className="mono memory-preview-content">{content || node.summary || ''}</pre>
        )}
      </div>

      <div className="memory-detail-footer">
        <div className="mono memory-file">{node.file}</div>
        <div className="memory-detail-actions">
          <Button data-action="view-memory" onClick={() => copyText(content || node.summary || '', toast, 'Copied memory')}>Copy</Button>
          <Button data-action="edit-memory" disabled={!node.canEdit} onClick={() => editMemoryFromGraph(node)}>Edit</Button>
          <Button variant="danger" data-action="delete-memory" disabled={!node.canDelete} onClick={() => archiveMemoryFromGraph(node)}>Delete</Button>
        </div>
      </div>
    </aside>
  );
}
