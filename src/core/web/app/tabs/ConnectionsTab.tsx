// Connections tab for linking Engram instructions to AI agents.
import { useEffect, useState } from 'react';
import type { ModalController, ShowToast } from '../types.js';
import { getJson, postJson } from '../api-client.js';
import { Button } from '../components/Button.js';
import { Toggle } from '../components/Toggle.js';
import { SectionHeader } from '../components/SectionHeader.js';
import { ConfirmActions, ConfirmBody } from '../components/ConfirmModal.js';
import { entryDoc } from '../utils/docs.js';

export function ConnectionsTab({ active, toast, modal }: { active: boolean; toast: ShowToast; modal?: ModalController }) {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  async function scanAgents() {
    setLoading(true);
    try {
      const res: any = await getJson('/api/agents/scan');
      setAgents(res.data || []);
    } catch (e: any) {
      toast(e.message, false);
    } finally {
      setLoading(false);
    }
  }

  async function linkAgent(agentId: string, isGlobal: boolean) {
    const res: any = await postJson('/api/agents/link', { agentId, global: isGlobal });
    toast(res.message || 'Connected');
    await scanAgents();
  }

  function unlinkAgent(agent: any, isGlobal: boolean) {
    const targetScope = isGlobal ? 'Global' : 'Workspace';
    const message = `Disconnect ${agent.name || agent.id} from ${targetScope} Engram instructions?`;

    if (!modal) {
      if (typeof window !== 'undefined' && window.confirm && !window.confirm(`Unlink ${agent.name || agent.id}?`)) return;
      void (async () => {
        const res: any = await postJson('/api/agents/unlink', { agentId: agent.id, global: isGlobal });
        toast(res.message || 'Disconnected');
        await scanAgents();
      })();
      return;
    }

    modal.open({
      title: `Unlink ${agent.name || agent.id}?`,
      className: 'modal-panel confirm-panel',
      content: <ConfirmBody message={message} />,
      actions: (
        <ConfirmActions
          cancel={modal.close}
          confirm={() => {
            modal.close();
            void (async () => {
              try {
                const res: any = await postJson('/api/agents/unlink', { agentId: agent.id, global: isGlobal });
                toast(res.message || 'Disconnected');
                await scanAgents();
              } catch (e: any) {
                toast(e.message || String(e), false);
              }
            })();
          }}
          confirmText="Unlink agent"
          danger
        />
      )
    });
  }

  function toggleExpand(agentId: string) {
    setExpanded((prev) => ({ ...prev, [agentId]: !prev[agentId] }));
  }

  useEffect(() => {
    if (active) void scanAgents();
  }, [active]);

  return (
    <>
      <SectionHeader
        title="Connections"
        copy="Connect Engram to local AI agents."
        helpHref={entryDoc('connections')}
        actions={<Button onClick={scanAgents}>{loading ? 'Scanning...' : 'Refresh'}</Button>}
      />
      <div className="conn-grid">
        {agents.map((agent) => {
          const isExpanded = Boolean(expanded[agent.id]);
          const globalTargetFiles: string[] = agent.globalTargets && agent.globalTargets.length > 0 ? agent.globalTargets : [];
          return (
            <div key={agent.id} className={'conn-card' + (agent.detected ? '' : ' disabled')}>
              <div>
                <div className="conn-header">
                  <strong className="conn-name">{agent.name}</strong>
                  <span className={'conn-status ' + (agent.detected ? 'detected' : 'missing')}>
                    {agent.detected ? 'Detected' : 'Missing'}
                  </span>
                </div>
                <div className="conn-desc-wrap">
                  <p className="conn-desc">{agent.description || agent.id}</p>
                  <div className="conn-path-row">
                    {agent.path ? <span className="conn-path" title={agent.path}>{agent.path}</span> : <span className="conn-path" />}
                    <button
                      type="button"
                      className={'conn-expand-btn' + (isExpanded ? ' expanded' : '')}
                      title={isExpanded ? 'Hide global target file paths' : 'Show global target file paths'}
                      onClick={() => toggleExpand(agent.id)}
                      aria-expanded={isExpanded}
                    >
                      <svg className="conn-expand-icon" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 6l4 4 4-4" />
                      </svg>
                    </button>
                  </div>
                </div>
                {isExpanded ? (
                  <div className="conn-targets-panel">
                    <div className="conn-targets-header">Global target file paths:</div>
                    {globalTargetFiles.length > 0 ? (
                      <ul className="conn-targets-list">
                        {globalTargetFiles.map((targetPath) => (
                          <li key={targetPath} className="conn-target-item">
                            <code>{targetPath}</code>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="conn-targets-empty">No global target file paths defined</div>
                    )}
                  </div>
                ) : null}
              </div>
              <div className="conn-actions">
                <div className="conn-row">
                  <span>Workspace</span>
                  <Toggle on={Boolean(agent.workspaceLinked)} onClick={() => agent.workspaceLinked ? unlinkAgent(agent, false) : linkAgent(agent.id, false)} />
                </div>
                <div className="conn-row">
                  <span>Global</span>
                  <Toggle on={Boolean(agent.globalLinked)} onClick={() => agent.globalLinked ? unlinkAgent(agent, true) : linkAgent(agent.id, true)} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
