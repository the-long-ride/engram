// Workspaces tab for managing registered Engram workspaces.
import { useState } from 'react';
import type { PanelData, ShowToast } from '../types.js';
import { postJson } from '../api-client.js';
import { Button } from '../components/Button.js';
import { Badge } from '../components/Badge.js';
import { SectionHeader } from '../components/SectionHeader.js';
import { HelpLink } from '../components/HelpLink.js';
import { entryDoc } from '../utils/docs.js';

export function WorkspacesTab({ data, reload, toast }: { data: PanelData; reload: () => Promise<void>; toast: ShowToast }) {
  const [open, setOpen] = useState(false);
  const [path, setPath] = useState('');
  const [name, setName] = useState('');
  const workspaces = data.workspaces || [];
  async function call(url: string, body: unknown) { const res: any = await postJson(url, body); toast(res.message || 'Saved'); await reload(); }
  async function toggleLink(workspacePath: string, linked: boolean) {
    if (linked && !window.confirm('Unlink workspace?')) return;
    await call('/api/workspace/link', { path: workspacePath, linked: !linked });
  }
  return <><SectionHeader title="Workspaces" copy="Register and link workspaces for memory routing." helpHref={entryDoc('workspaces')} />
    <div className="tab-actions inline-actions"><Button onClick={() => setOpen(!open)}>Add Workspace</Button></div>
    <div className={'add-form-row' + (open ? ' open' : '')}><div className="form-group"><label className="form-label label-with-help"><span>Name</span><HelpLink href={entryDoc('workspaces', 'workspace-name')} label="Open workspace name docs" /></label><input className="form-input" value={name} onChange={(e) => setName(e.target.value)} /></div><div className="form-group"><label className="form-label label-with-help"><span>Path</span><HelpLink href={entryDoc('workspaces', 'workspace-path')} label="Open workspace path docs" /></label><input className="form-input" value={path} onChange={(e) => setPath(e.target.value)} /></div><Button variant="primary" onClick={() => call('/api/workspace/add', { name, path })}>Save</Button></div>
    <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Name</th><th>Path</th><th>Linked</th><th /></tr></thead><tbody>{workspaces.map((workspace: any) => <tr key={workspace.path}><td>{workspace.name || '-'}</td><td className="mono">{workspace.path}</td><td>{workspace.linked ? <Badge tone="pos">linked</Badge> : <Badge>not linked</Badge>}</td><td className="actions"><Button variant="ghost" onClick={() => toggleLink(workspace.path, Boolean(workspace.linked))}>{workspace.linked ? 'Unlink' : 'Link'}</Button><Button variant="danger" onClick={() => call('/api/workspace/remove', { path: workspace.path })}>Delete</Button></td></tr>)}</tbody></table></div></>;
}
