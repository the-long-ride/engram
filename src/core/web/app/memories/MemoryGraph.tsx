// Interactive memory graph renderer for the Memories tab.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { MemoryLink, MemoryNode, NodeBox } from './graph-types.js';
import { edgePath, layoutMemoryGraph } from './graph-layout.js';

type CanvasDrag = { x: number; y: number; panX: number; panY: number };
type NodeDrag = { id: string; x: number; y: number; nodeX: number; nodeY: number };

export function MemoryGraph({ nodes, links, selectedId, select }: { nodes: MemoryNode[]; links: MemoryLink[]; selectedId: string; select: (id: string) => void }) {
  const layout = useMemo(() => layoutMemoryGraph(nodes, links), [nodes, links]);
  const [positions, setPositions] = useState<Record<string, NodeBox>>(layout.positions);
  const [viewport, setViewport] = useState({ panX: 0, panY: 0, zoom: 1, isFullscreen: false });
  const [canvasDrag, setCanvasDrag] = useState<CanvasDrag | null>(null);
  const [nodeDrag, setNodeDrag] = useState<NodeDrag | null>(null);
  const draggedNodeRef = useRef('');
  const [highlight, setHighlight] = useState<string>('');
  useEffect(() => { setPositions(layout.positions); draggedNodeRef.current = ''; }, [layout]);
  if (!nodes.length) return <div className="memories-graph empty">No memories found for this scope.</div>;
  function zoomMemories(direction: number) { setViewport((prev) => ({ ...prev, zoom: Math.max(0.2, Math.min(3, prev.zoom * (direction > 0 ? 1.2 : 1 / 1.2))) })); }
  function resetMemories() { setViewport((prev) => ({ ...prev, panX: 0, panY: 0, zoom: 1 })); setPositions(layout.positions); draggedNodeRef.current = ''; }
  function toggleMemoriesFullscreen() { setViewport((prev) => ({ ...prev, isFullscreen: !prev.isFullscreen })); }
  function onCanvasMouseDown(event: React.MouseEvent<HTMLDivElement>) { if ((event.target as HTMLElement).closest('.memory-node')) return; setCanvasDrag({ x: event.clientX, y: event.clientY, panX: viewport.panX, panY: viewport.panY }); }
  function onNodeMouseDown(event: React.MouseEvent<HTMLButtonElement>, node: MemoryNode) { const pos = positions[node.id]; if (!pos) return; event.stopPropagation(); draggedNodeRef.current = ''; setNodeDrag({ id: node.id, x: event.clientX, y: event.clientY, nodeX: pos.x, nodeY: pos.y }); }
  function onMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    if (nodeDrag) {
      const dx = (event.clientX - nodeDrag.x) / viewport.zoom;
      const dy = (event.clientY - nodeDrag.y) / viewport.zoom;
      if (Math.abs(event.clientX - nodeDrag.x) > 3 || Math.abs(event.clientY - nodeDrag.y) > 3) draggedNodeRef.current = nodeDrag.id;
      setPositions((prev) => ({ ...prev, [nodeDrag.id]: { ...prev[nodeDrag.id], x: nodeDrag.nodeX + dx, y: nodeDrag.nodeY + dy } }));
      return;
    }
    if (!canvasDrag) return;
    setViewport((prev) => ({ ...prev, panX: canvasDrag.panX + event.clientX - canvasDrag.x, panY: canvasDrag.panY + event.clientY - canvasDrag.y }));
  }
  function endDrag() { setCanvasDrag(null); setNodeDrag(null); }
  function renderEdge(link: MemoryLink) {
    const from = positions[link.from], to = positions[link.to];
    if (!from || !to) return null;
    const pathFrom = link.kind === 'dependency' ? to : from;
    const pathTo = link.kind === 'dependency' ? from : to;
    const cls = 'memory-edge ' + (link.thin ? 'memory-edge-thin' : 'memory-edge-dependency') + (highlight === link.from || highlight === link.to ? ' highlighted' : '');
    return <path key={link.from + link.to + link.kind} className={cls} data-from={link.from} data-to={link.to} data-kind={link.kind} d={edgePath(pathFrom, pathTo)} markerEnd={link.thin ? 'url(#mem-arrow-thin)' : 'url(#mem-arrow-dependency)'} onClick={() => setHighlight(link.from)}><title>{link.label || link.kind}</title></path>;
  }
  const active = Boolean(highlight);
  return <div className={'memories-graph' + (viewport.isFullscreen ? ' fullscreen' : '')} onMouseDown={onCanvasMouseDown} onMouseMove={onMouseMove} onMouseUp={endDrag} onMouseLeave={endDrag}>
    <div className="memories-controls"><button id="memories-clear-hi-btn" style={{ display: active ? 'inline-flex' : 'none' }} onClick={() => setHighlight('')} aria-label="Clear highlight">Clear</button><button onClick={() => zoomMemories(1)} aria-label="Zoom in" title="Zoom In">+</button><button onClick={() => zoomMemories(-1)} aria-label="Zoom out" title="Zoom Out">-</button><button onClick={resetMemories} aria-label="Reset view" title="Reset View">⟲</button><button id="memories-fullscreen-btn" onClick={toggleMemoriesFullscreen} aria-label="Toggle fullscreen" title="Toggle Fullscreen">{viewport.isFullscreen ? '✕' : '⛶'}</button></div>
    <div className={'memories-canvas' + (active ? ' highlight-active' : '') + (nodeDrag || canvasDrag ? ' dragging' : '')} style={{ width: layout.width, height: layout.height, transform: 'translate(' + viewport.panX + 'px, ' + viewport.panY + 'px) scale(' + viewport.zoom + ')' }}>
      <svg className="memories-svg" style={{ width: layout.width, height: layout.height }} viewBox={'0 0 ' + layout.width + ' ' + layout.height} aria-hidden="true"><defs><marker id="mem-arrow-dependency" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="strokeWidth"><path d="M1,1 L8,5 L1,9 Z" /></marker><marker id="mem-arrow-thin" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="strokeWidth"><path d="M1,1 L8,5 L1,9 Z" /></marker></defs>{links.map(renderEdge)}</svg>
      {nodes.map((node) => { const pos = positions[node.id]; if (!pos) return null; const connected = !highlight || highlight === node.id || links.some((link) => (link.from === highlight && link.to === node.id) || (link.to === highlight && link.from === node.id)); return <button type="button" id={node.id} key={node.id} className={'memory-node memory-node-' + node.sourceScope + (node.id === selectedId ? ' active' : '') + (connected && highlight ? ' highlighted' : '')} style={{ left: pos.x, top: pos.y, width: pos.w, height: pos.h }} data-action="select-memory-node" data-node-id={node.id} onMouseDown={(event) => onNodeMouseDown(event, node)} onClick={() => { if (draggedNodeRef.current === node.id) { draggedNodeRef.current = ''; return; } select(node.id); setHighlight(node.id); }}><span className="memory-node-kicker">{node.sourceScope === 'workspace' ? node.profile + '/' + (node.workspaceName || 'workspace') : node.profile + ' / ' + node.sourceScope}</span><strong>{node.memoryId}</strong><span>{node.summary || node.file}</span></button>; })}
    </div>
  </div>;
}
