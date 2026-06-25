// Memories tab for graph exploration and memory actions.
import { useEffect, useState } from 'react';
import type { ModalController, ShowToast } from '../types.js';
import { getJson, postJson } from '../api-client.js';
import { Button } from '../components/Button.js';
import { Badge } from '../components/Badge.js';
import { ScopeChips } from '../components/ScopeChips.js';
import { SectionHeader } from '../components/SectionHeader.js';
import { Toggle } from '../components/Toggle.js';
import { MemoryGraph } from '../memories/MemoryGraph.js';
import { MemoryDetail } from '../memories/MemoryDetail.js';
import type { MemoryNode } from '../memories/graph-types.js';
import { copyText } from '../utils/clipboard.js';

export function MemoriesTab({ active, toast, modal }: { active: boolean; toast: ShowToast; modal: ModalController }) {
  const [data, setData] = useState<any>(null);
  const [selectedId, setSelectedId] = useState('');
  const [options, setOptions] = useState({ scopes: ['profile', 'global', 'workspace'], types: ['rule', 'skill', 'workflow', 'knowledge'], semantic: true, limit: 100 });
  async function loadMemories(rebuild = false) { try { const res: any = rebuild || data ? await postJson('/api/memories', { scopes: options.scopes, types: options.types, semantic: options.semantic, limit: options.limit, rebuild }) : await getJson('/api/memories'); setData(res.data || res); } catch (e: any) { toast(e.message, false); } }
  useEffect(() => { if (active && !data) void loadMemories(false); }, [active]);
  useEffect(() => { if (active && data) void loadMemories(false); }, [options]);
  function toggleList(key: 'scopes' | 'types', value: string) { setOptions((prev) => { const list = prev[key]; const next = list.includes(value) ? (list.length > 1 ? list.filter((item) => item !== value) : list) : [...list, value]; return { ...prev, [key]: next }; }); }
  const nodes: MemoryNode[] = data?.nodes || [];
  const selected = nodes.find((node) => node.id === selectedId) || nodes[0] || null;
  async function openMemoryPreview(node: MemoryNode) { try { const res: any = await getJson('/api/memory?profile=' + encodeURIComponent(node.profile || '') + '&scope=' + encodeURIComponent(node.scope || node.sourceScope || 'global') + '&file=' + encodeURIComponent(node.file || '')); modal.open({ title: node.memoryId || node.file, copyContent: res.content || '', copyLabel: 'Copied content', className: 'modal-panel confirm-panel', content: <pre className="mono memory-preview-content">{res.content || ''}</pre>, actions: <Button variant="primary" onClick={modal.close}>Close</Button> }); } catch (e: any) { toast(e.message, false); } }
  async function editMemoryFromGraph(node: MemoryNode) { try { const res: any = await getJson('/api/memory/file?profile=' + encodeURIComponent(node.profile || '') + '&scope=' + encodeURIComponent(node.scope || node.sourceScope || 'global') + '&file=' + encodeURIComponent(node.file || '')); window.open(res.data.editorUrl, '_blank', 'noopener,noreferrer'); await copyText(res.data.path, toast, 'Opening editor. Path copied.'); } catch (e: any) { toast(e.message, false); } }
  async function archiveMemoryFromGraph(node: MemoryNode) { if (!window.confirm('Delete memory? Remove ' + node.memoryId + ' from active routing? Preserved under archive.')) return; try { const res: any = await postJson('/api/memory/archive', { profile: node.profile, scope: node.scope || node.sourceScope, file: node.file, id: node.memoryId, reason: 'Deleted from Memories graph view' }); toast(res.data?.message || 'Memory archived'); setSelectedId(''); await loadMemories(true); } catch (e: any) { toast(e.message, false); } }
  return <><SectionHeader title="Memories" copy="Explore routed memories and their dependency or duplicate links." className="memories-hdr" actions={<Button onClick={() => loadMemories(true)}>Refresh</Button>} />
    <div className="memories-toolbar"><ScopeChips values={[[ 'profile', 'Profile' ], [ 'global', 'Global' ], [ 'workspace', 'Workspace' ]]} active={options.scopes} onToggle={(value) => toggleList('scopes', value)} /><ScopeChips values={[[ 'rule', 'Rule' ], [ 'skill', 'Skills' ], [ 'workflow', 'Workflow' ], [ 'knowledge', 'Knowledge' ]]} active={options.types} onToggle={(value) => toggleList('types', value)} /><button className="core-check" onClick={() => setOptions((prev) => ({ ...prev, semantic: !prev.semantic }))}><span>Semantic links</span><Toggle on={options.semantic} /></button>{data?.stats ? <Badge>{data.stats.total || nodes.length} memories</Badge> : null}</div>
    <div className="memories-shell"><MemoryGraph nodes={nodes} links={data?.links || []} selectedId={selected?.id || ''} select={setSelectedId} /><MemoryDetail node={selected} view={openMemoryPreview} editMemoryFromGraph={editMemoryFromGraph} archiveMemoryFromGraph={archiveMemoryFromGraph} /></div></>;
}
