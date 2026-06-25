// Connections tab for linking Engram instructions to AI agents.
import { useEffect, useState } from 'react';
import type { ShowToast } from '../types.js';
import { getJson, postJson } from '../api-client.js';
import { Button } from '../components/Button.js';
import { Toggle } from '../components/Toggle.js';
import { SectionHeader } from '../components/SectionHeader.js';

export function ConnectionsTab({ active, toast }: { active: boolean; toast: ShowToast }) {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  async function scanAgents() { setLoading(true); try { const res: any = await getJson('/api/agents/scan'); setAgents(res.data || []); } catch (e: any) { toast(e.message, false); } finally { setLoading(false); } }
  async function linkAgent(agentId: string, isGlobal: boolean) { const res: any = await postJson('/api/agents/link', { agentId, global: isGlobal }); toast(res.message || 'Connected'); await scanAgents(); }
  async function unlinkAgent(agentId: string, isGlobal: boolean) { if (!window.confirm('Unlink AI agent?')) return; const res: any = await postJson('/api/agents/unlink', { agentId, global: isGlobal }); toast(res.message || 'Disconnected'); await scanAgents(); }
  useEffect(() => { if (active) void scanAgents(); }, [active]);
  return <><SectionHeader title="Connections" copy="Connect Engram instructions to local AI agents." actions={<Button onClick={scanAgents}>{loading ? 'Scanning...' : 'Refresh'}</Button>} />
    <div className="conn-grid">{agents.map((agent) => <div key={agent.id} className={'conn-card' + (agent.detected ? '' : ' disabled')}><div><div className="conn-header"><strong className="conn-name">{agent.name}</strong><span className={'conn-status ' + (agent.detected ? 'detected' : 'missing')}>{agent.detected ? 'Detected' : 'Missing'}</span></div><p className="conn-desc">{agent.description || agent.id}{agent.path ? <span className="conn-path">{agent.path}</span> : null}</p></div><div className="conn-actions"><div className="conn-row"><span>Workspace</span><Toggle on={Boolean(agent.workspaceLinked)} onClick={() => agent.workspaceLinked ? unlinkAgent(agent.id, false) : linkAgent(agent.id, false)} /></div><div className="conn-row"><span>Global</span><Toggle on={Boolean(agent.globalLinked)} onClick={() => agent.globalLinked ? unlinkAgent(agent.id, true) : linkAgent(agent.id, true)} /></div></div></div>)}</div></>;
}
