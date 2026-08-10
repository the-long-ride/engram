// Core tab for duplicate memory candidates and resolution prompts.
import { useEffect, useState } from 'react';
import type { ModalController, ShowToast } from '../types.js';
import { getJson, postJson } from '../api-client.js';
import { Button } from '../components/Button.js';
import { MemoryPreviewContent } from '../components/MemoryPreviewContent.js';
import { Badge } from '../components/Badge.js';
import { Card } from '../components/Card.js';
import { ScopeChips } from '../components/ScopeChips.js';
import { SectionHeader } from '../components/SectionHeader.js';
import { Toggle } from '../components/Toggle.js';
import { HelpLink } from '../components/HelpLink.js';
import { copyText } from '../utils/clipboard.js';
import { entryDoc } from '../utils/docs.js';
import type { MemoryNode } from '../memories/graph-types.js';

function promptForPair(pair: any): string {
  const refLines = [pair.a, pair.b].map((ref) => '- id=' + ref.id + ' profile=' + ref.profile + ' scope=' + ref.scope + ' file=' + ref.file).join('\n');
  return ['Resolve these duplicate memories:', refLines, 'Decide whether to merge, archive, or keep both. Use TYPE, TEXT, CONTEXT, and UPDATE: memory-id. Preserve stronger, newer, and more specific guidance.'].join('\n');
}

function memoryNodeType(node: MemoryNode): string {
  return node.type
    || ((node.file || '').startsWith('rules/') ? 'rule'
      : (node.file || '').startsWith('skills/') ? 'skill'
      : (node.file || '').startsWith('workflows/') ? 'workflow'
      : 'knowledge');
}

function generateConnectionsPrompt(visibleNodes: MemoryNode[]): string {
  const scopeCounts = new Map<string, number>();
  for (const n of visibleNodes) {
    const s = n.scope || n.sourceScope || 'workspace';
    scopeCounts.set(s, (scopeCounts.get(s) || 0) + 1);
  }
  const dominantScope = [...scopeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'workspace';
  const scopeNote = scopeCounts.size > 1
    ? `Visible memories span multiple scopes: ${[...scopeCounts.entries()].map(([s, c]) => `${s} (${c})`).join(', ')}. Propose each parent in the scope that best matches its children; default to \`${dominantScope}\` when unclear.`
    : `All visible memories are in scope \`${dominantScope}\`.`;
  const entries = visibleNodes.map((n, i) => {
    const type = memoryNodeType(n);
    return `- **${String(i + 1).padStart(2, '0')}.** \`${n.memoryId}\` (${type}, ${n.scope || n.sourceScope}) — ${n.summary || '(no summary)'}`;
  });
  return [
    '# Engram Memories — Suggest Memory Connections',
    '',
    `**Visible memories:** ${visibleNodes.length}`,
    `**Scopes:** ${[...scopeCounts.keys()].join(', ')}`,
    '',
    '## Instructions',
    '',
    'Below is a list of currently visible memories (after any search/filter applied).',
    'Group memories that share a common theme or domain into parent candidates.',
    'A parent memory generalizes the shared theme; each child keeps its specific content but adds `DEPENDS_ON: <parent-id>` or `PARENT: <child-id>,<child-id>` so Engram wires the relationship cleanly.',
    '',
    'Rules for grouping:',
    '- Only group memories that genuinely share a theme (e.g., "Tauri 2 desktop patterns", "pnpm workspace rules", "security headers").',
    '- A parent must NOT duplicate child content — it captures only the shared abstraction.',
    '- A memory may belong to multiple parents if it spans themes.',
    '- Do not force groups; if memories are unrelated, leave them ungrouped.',
    `- Prefer children in the same scope for a parent. ${scopeNote}`,
    '- Aim for 2–6 children per parent. Larger groups should be split into multiple themed parents.',
    '',
    '## Output format',
    '',
    'For each proposed parent, output a block:',
    '',
    '```',
    '### PARENT: <short theme name>',
    'TYPE: knowledge | rule | ...',
    'SCOPE: profile | global | workspace',
    'TEXT: <one-to-three sentence generalization capturing the shared theme>',
    'TRIGGERS: shared,tags,for,retrieval',
    'CHILDREN:',
    '- <child-memory-id>',
    '- <child-memory-id>',
    '```',
    '',
    'After listing all parents, output a `## UNGROUPED` section listing memory IDs that do not fit any parent.',
    '',
    '## WRITE',
    '',
    scopeCounts.size > 1
      ? 'If you can write directly, save each parent with: `engram save-session --scope <its-scope> --force "<candidate>"` (use the SCOPE you set in each block, not a single default). Include a `PARENT: <child-id>,<child-id>` field on the candidate so Engram records the relationship without flagging the intentional overlap as a duplicate.'
      : `If you can write directly, save each parent with: engram save-session --scope ${dominantScope} --force "<candidate>" and include a PARENT: <child-id>,<child-id> field so Engram records the relationship without flagging the intentional overlap as a duplicate.`,
    'Alternatively, you can save the parent first, then run `engram link --parent <parent-id> --children <child-id1> --children <child-id2>` to bulk-wire the children afterwards.',
    '',
    '---',
    '',
    '## Visible memories',
    '',
    ...entries,
  ].join('\n');
}

function downloadPromptMd(content: string, filename: string, toast: ShowToast, okMessage: string) {
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast(okMessage);
}

export function CoreTab({ active, toast, modal }: { active: boolean; toast: ShowToast; modal: ModalController }) {
  const [data, setData] = useState<any>(null);
  const [memoriesData, setMemoriesData] = useState<{ nodes?: MemoryNode[] } | null>(null);
  const [options, setOptions] = useState({ scopes: ['profile', 'global', 'workspace'], types: ['rule', 'skill', 'workflow', 'knowledge'], semantic: false, limit: 50 });
  async function loadCore(rebuild = false) { try { const res: any = rebuild || data ? await postJson('/api/core', { ...options, rebuild }) : await getJson('/api/core'); setData(res.data || res); } catch (e: any) { toast(e.message, false); } }
  useEffect(() => { if (active && !data) void loadCore(false); }, [active]);
  useEffect(() => { if (active && data) void loadCore(false); }, [options]);
  useEffect(() => { if (!active || memoriesData) return; void (async () => { try { const res: any = await getJson('/api/memories'); if (res?.data?.nodes) setMemoriesData({ nodes: res.data.nodes }); else if (res?.nodes) setMemoriesData({ nodes: res.nodes }); } catch { /* best-effort: prompt buttons guard against empty */ } })(); }, [active]);
  function toggleList(key: 'scopes' | 'types', value: string) { setOptions((prev) => { const list = prev[key]; const next = list.includes(value) ? (list.length > 1 ? list.filter((item) => item !== value) : list) : [...list, value]; return { ...prev, [key]: next }; }); }
  function copyCorePrompt(key: string) { const text = data?.prompts?.[key]; if (text) copyText('/engram ' + text, toast, 'Copied prompt'); }
  function copyResolvePairPrompt(pair: any) { copyText('/engram ' + promptForPair(pair), toast, 'Copied resolve prompt'); }
  function copyConnectionsPrompt() { const nodes = memoriesData?.nodes ?? []; if (!nodes.length) { toast('No memories visible', false); return; } copyText(generateConnectionsPrompt(nodes), toast, `Copied suggest-connections prompt (${nodes.length} memories)`); }
  function downloadConnectionsPrompt() { const nodes = memoriesData?.nodes ?? []; if (!nodes.length) { toast('No memories visible', false); return; } downloadPromptMd(generateConnectionsPrompt(nodes), 'engram-suggest-connections.md', toast, 'Downloaded suggest-connections.md'); }
  function viewCorePrompt(key: string, title: string) { const text = data?.prompts?.[key]; if (!text) return; modal.open({ title, copyContent: '/engram ' + text, copyLabel: 'Copied prompt', className: 'modal-panel confirm-panel', content: <pre className="core-prompt-preview" style={{ margin: 0, userSelect: 'all' }}>{text}</pre>, actions: <Button variant="primary" onClick={modal.close}>Close</Button> }); }
  async function openMemoryPreview(ref: any) { try { const res: any = await getJson('/api/memory?profile=' + encodeURIComponent(ref.profile || '') + '&scope=' + encodeURIComponent(ref.scope || 'global') + '&file=' + encodeURIComponent(ref.file || '')); modal.open({ title: ref.id || ref.file, copyContent: res.content || '', copyLabel: 'Copied content', className: 'modal-panel memory-preview-modal', content: <MemoryPreviewContent content={res.content || ''} properties={res.properties} />, actions: <Button variant="primary" onClick={modal.close}>Close</Button> }); } catch (e: any) { toast(e.message, false); } }
  const duplicates = data?.duplicates || [];
  return <><SectionHeader title="Core" copy="Duplicate candidates and links across profile, global, and workspace scopes." className="core-hdr" helpHref={entryDoc('core')} actions={<Button onClick={() => loadCore(true)}>Refresh</Button>} />
    {data?.warning ? <div className="banner banner-warn">{data.warning}</div> : null}
    <div className="core-toolbar"><div className="toolbar-group"><span className="toolbar-label label-with-help"><span>Scopes</span><HelpLink href={entryDoc('core', 'scope-chips-profile-global-workspace')} label="Open Core scope docs" /></span><ScopeChips values={[[ 'profile', 'Profile' ], [ 'global', 'Global' ], [ 'workspace', 'Workspace' ]]} active={options.scopes} onToggle={(value) => toggleList('scopes', value)} /></div><div className="toolbar-group"><span className="toolbar-label label-with-help"><span>Types</span><HelpLink href={entryDoc('core', 'type-chips-rule-skill-workflow-knowledge')} label="Open Core type docs" /></span><ScopeChips values={[[ 'rule', 'Rule' ], [ 'skill', 'Skills' ], [ 'workflow', 'Workflow' ], [ 'knowledge', 'Knowledge' ]]} active={options.types} onToggle={(value) => toggleList('types', value)} /></div><div className="core-check" onClick={() => setOptions((prev) => ({ ...prev, semantic: !prev.semantic }))}><span className="label-with-help"><span>Include semantic candidates</span><HelpLink href={entryDoc('core', 'include-semantic-candidates')} label="Open semantic candidate docs" /></span><Toggle on={options.semantic} /></div><Badge>Active profile: {data?.scope?.activeProfile || '<none>'}</Badge></div>
    <div className="core-relationship"><div className="core-lane"><span>Profile</span><i /><span>Global</span><i /><span>Workspace</span></div><div className="core-rel-stats"><Badge tone="amber">{(data?.relationship?.links || []).filter((link: any) => link.kind === 'duplicate').length} duplicate links</Badge><Badge tone="blue">{(data?.relationship?.links || []).length} graph links</Badge></div></div>
    <div className="core-prompts"><Card title="Resolve duplicate memories" helpHref={entryDoc('core')} badge={<Button style={{ height: 24, fontSize: 11, padding: '0 8px' }} onClick={() => viewCorePrompt('resolveDuplicates', 'Resolve duplicate memories')}>Preview</Button>}><div className="core-prompt-body"><p>Copy prompt for an AI agent to resolve duplicate memories.</p><div className="core-prompt-actions"><Button variant="primary" onClick={() => copyCorePrompt('resolveDuplicates')}>Copy prompt</Button></div></div></Card><Card title="Metacognize memory" helpHref={entryDoc('core')} badge={<Button style={{ height: 24, fontSize: 11, padding: '0 8px' }} onClick={() => viewCorePrompt('metacognize', 'Metacognize memory')}>Preview</Button>}><div className="core-prompt-body"><p>Copy prompt for an AI agent to reason about memory quality and routing.</p><div className="core-prompt-actions"><Button variant="primary" onClick={() => copyCorePrompt('metacognize')}>Copy prompt</Button></div></div></Card><Card title="Suggest memories connection" helpHref={entryDoc('core')} badge={<span className="muted">{memoriesData?.nodes?.length ?? 0} memories</span>}><div className="core-prompt-body"><p>Copy prompt asking an AI to propose parent memories grouping the visible nodes by shared theme.</p><div className="core-prompt-actions"><Button variant="primary" onClick={copyConnectionsPrompt} title="Copy a prompt asking an AI to propose parent memories grouping the visible nodes">Copy prompt</Button><Button variant="outline" onClick={downloadConnectionsPrompt} title="Download the suggest-connections prompt as a markdown file">Download prompt.md</Button></div></div></Card></div>
    <Card title="Duplicate candidates" helpHref={entryDoc('core')} badge={<Badge tone="amber">{duplicates.length}</Badge>}>{duplicates.length ? duplicates.map((pair: any) => <div className="core-dup" key={pair.a.id + pair.b.id}><div className="core-dup-score">{Math.round(pair.score * 100)}%<span>{pair.method}</span><Button className="copy-resolve-pair compact" onClick={() => copyResolvePairPrompt(pair)}>Copy prompt</Button></div><div className="core-dup-body"><button className="core-memory-ref" data-action="view-memory" onClick={() => openMemoryPreview(pair.a)}><span className="badge badge-neutral">{pair.a.profile}</span> <span className="badge badge-neutral">{pair.a.scope}</span> <span className="mono">{pair.a.file}</span><strong>{pair.a.id}</strong><p>{pair.a.summary}</p></button><div className="core-link-line">profile &lt;-&gt; global &lt;-&gt; workspace</div><button className="core-memory-ref" data-action="view-memory" onClick={() => openMemoryPreview(pair.b)}><span className="badge badge-neutral">{pair.b.profile}</span> <span className="badge badge-neutral">{pair.b.scope}</span> <span className="mono">{pair.b.file}</span><strong>{pair.b.id}</strong><p>{pair.b.summary}</p></button></div></div>) : <div className="core-empty">No duplicate candidates found for this scope.</div>}</Card></>;
}
