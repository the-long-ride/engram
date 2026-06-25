// Core tab for duplicate memory candidates and resolution prompts.
import { useEffect, useState } from 'react';
import type { ModalController, ShowToast } from '../types.js';
import { getJson, postJson } from '../api-client.js';
import { Button } from '../components/Button.js';
import { Badge } from '../components/Badge.js';
import { Card } from '../components/Card.js';
import { ScopeChips } from '../components/ScopeChips.js';
import { SectionHeader } from '../components/SectionHeader.js';
import { Toggle } from '../components/Toggle.js';
import { copyText } from '../utils/clipboard.js';

function promptForPair(pair: any): string {
  const refLines = [pair.a, pair.b].map((ref) => '- id=' + ref.id + ' profile=' + ref.profile + ' scope=' + ref.scope + ' file=' + ref.file).join('\\n');
  return ['Resolve these duplicate memories:', refLines, 'Decide whether to merge, archive, or keep both. Use TYPE, TEXT, CONTEXT, and UPDATE: memory-id. Preserve stronger, newer, and more specific guidance.'].join('\\n');
}

export function CoreTab({ active, toast, modal }: { active: boolean; toast: ShowToast; modal: ModalController }) {
  const [data, setData] = useState<any>(null);
  const [options, setOptions] = useState({ scopes: ['profile', 'global', 'workspace'], types: ['rule', 'skill', 'workflow', 'knowledge'], semantic: false, limit: 50 });
  async function loadCore(rebuild = false) { try { const res: any = rebuild || data ? await postJson('/api/core', { ...options, rebuild }) : await getJson('/api/core'); setData(res.data || res); } catch (e: any) { toast(e.message, false); } }
  useEffect(() => { if (active && !data) void loadCore(false); }, [active]);
  useEffect(() => { if (active && data) void loadCore(false); }, [options]);
  function toggleList(key: 'scopes' | 'types', value: string) { setOptions((prev) => { const list = prev[key]; const next = list.includes(value) ? (list.length > 1 ? list.filter((item) => item !== value) : list) : [...list, value]; return { ...prev, [key]: next }; }); }
  function copyCorePrompt(key: string) { const text = data?.prompts?.[key]; if (text) copyText('/engram ' + text, toast, 'Copied prompt'); }
  function copyResolvePairPrompt(pair: any) { copyText('/engram ' + promptForPair(pair), toast, 'Copied resolve prompt'); }
  function viewCorePrompt(key: string, title: string) { const text = data?.prompts?.[key]; if (!text) return; modal.open({ title, copyContent: '/engram ' + text, copyLabel: 'Copied prompt', className: 'modal-panel confirm-panel', content: <pre className="core-prompt-preview" style={{ margin: 0, userSelect: 'all' }}>{text}</pre>, actions: <Button variant="primary" onClick={modal.close}>Close</Button> }); }
  async function openMemoryPreview(ref: any) { try { const res: any = await getJson('/api/memory?profile=' + encodeURIComponent(ref.profile || '') + '&scope=' + encodeURIComponent(ref.scope || 'global') + '&file=' + encodeURIComponent(ref.file || '')); modal.open({ title: ref.id || ref.file, copyContent: res.content || '', copyLabel: 'Copied content', className: 'modal-panel confirm-panel', content: <pre className="mono memory-preview-content">{res.content || ''}</pre>, actions: <Button variant="primary" onClick={modal.close}>Close</Button> }); } catch (e: any) { toast(e.message, false); } }
  const duplicates = data?.duplicates || [];
  return <><SectionHeader title="Core" copy="Duplicate memory candidates and relationships across profile, global, and workspace scopes." className="core-hdr" actions={<Button onClick={() => loadCore(true)}>Refresh</Button>} />
    {data?.warning ? <div className="banner banner-warn">{data.warning}</div> : null}
    <div className="core-toolbar"><ScopeChips values={[[ 'profile', 'Profile' ], [ 'global', 'Global' ], [ 'workspace', 'Workspace' ]]} active={options.scopes} onToggle={(value) => toggleList('scopes', value)} /><ScopeChips values={[[ 'rule', 'Rule' ], [ 'skill', 'Skills' ], [ 'workflow', 'Workflow' ], [ 'knowledge', 'Knowledge' ]]} active={options.types} onToggle={(value) => toggleList('types', value)} /><button className="core-check" onClick={() => setOptions((prev) => ({ ...prev, semantic: !prev.semantic }))}><span>Include semantic candidates</span><Toggle on={options.semantic} /></button><Badge>Active profile: {data?.scope?.activeProfile || '<none>'}</Badge></div>
    <div className="core-relationship"><div className="core-lane"><span>Profile</span><i /><span>Global</span><i /><span>Workspace</span></div><div className="core-rel-stats"><Badge tone="amber">{(data?.relationship?.links || []).filter((link: any) => link.kind === 'duplicate').length} duplicate links</Badge><Badge tone="blue">{(data?.relationship?.links || []).length} graph links</Badge></div></div>
    <div className="core-grid"><div><Card title="Duplicate candidates" badge={<Badge tone="amber">{duplicates.length}</Badge>}>{duplicates.length ? duplicates.map((pair: any) => <div className="core-dup" key={pair.a.id + pair.b.id}><div className="core-dup-score">{Math.round(pair.score * 100)}%<span>{pair.method}</span><Button className="copy-resolve-pair compact" onClick={() => copyResolvePairPrompt(pair)}>Copy prompt</Button></div><div className="core-dup-body"><button className="core-memory-ref" data-action="view-memory" onClick={() => openMemoryPreview(pair.a)}><span className="badge badge-neutral">{pair.a.profile}</span> <span className="badge badge-neutral">{pair.a.scope}</span> <span className="mono">{pair.a.file}</span><strong>{pair.a.id}</strong><p>{pair.a.summary}</p></button><div className="core-link-line">profile &lt;-&gt; global &lt;-&gt; workspace</div><button className="core-memory-ref" data-action="view-memory" onClick={() => openMemoryPreview(pair.b)}><span className="badge badge-neutral">{pair.b.profile}</span> <span className="badge badge-neutral">{pair.b.scope}</span> <span className="mono">{pair.b.file}</span><strong>{pair.b.id}</strong><p>{pair.b.summary}</p></button></div></div>) : <div className="core-empty">No duplicate candidates found for this scope.</div>}</Card></div><div className="core-prompts"><Card title="Resolve duplicate memories" badge={<Button style={{ height: 24, fontSize: 11, padding: '0 8px' }} onClick={() => viewCorePrompt('resolveDuplicates', 'Resolve duplicate memories')}>Preview</Button>}><div className="core-prompt-body"><p>Copy prompt for an AI agent to resolve duplicate memories.</p><Button variant="primary" onClick={() => copyCorePrompt('resolveDuplicates')}>Copy prompt</Button></div></Card><Card title="Metacognize memory" badge={<Button style={{ height: 24, fontSize: 11, padding: '0 8px' }} onClick={() => viewCorePrompt('metacognize', 'Metacognize memory')}>Preview</Button>}><div className="core-prompt-body"><p>Copy prompt for a stronger model to restructure memory with metacognition.</p><Button variant="primary" onClick={() => copyCorePrompt('metacognize')}>Copy prompt</Button></div></Card></div></div></>;
}
