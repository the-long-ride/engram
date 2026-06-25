// Detail panel for the selected memory graph node.
import type { MemoryNode } from './graph-types.js';
import { Button } from '../components/Button.js';
import { Badge } from '../components/Badge.js';
export function MemoryDetail({ node, view, editMemoryFromGraph, archiveMemoryFromGraph }: { node: MemoryNode | null; view: (node: MemoryNode) => void; editMemoryFromGraph: (node: MemoryNode) => void; archiveMemoryFromGraph: (node: MemoryNode) => void }) {
  if (!node) return <aside className="memory-detail"><div className="core-empty">Select a memory.</div></aside>;
  return <aside className="memory-detail"><div className="memory-detail-hdr"><Badge>{node.profile}</Badge><Badge>{node.scope || node.sourceScope}</Badge>{node.workspaceName ? <Badge tone="blue">{node.workspaceName}</Badge> : null}</div><h2>{node.memoryId}</h2><p>{node.summary || ''}</p><div className="mono memory-file">{node.file}</div><div className="memory-detail-actions"><Button data-action="view-memory" onClick={() => view(node)}>View</Button><Button data-action="edit-memory" disabled={!node.canEdit} onClick={() => editMemoryFromGraph(node)}>Edit</Button><Button variant="danger" data-action="delete-memory" disabled={!node.canDelete} onClick={() => archiveMemoryFromGraph(node)}>Delete</Button></div></aside>;
}
