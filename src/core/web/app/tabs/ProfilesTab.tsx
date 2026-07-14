// Profiles tab for managing Engram memory profiles.
import { useState } from 'react';
import type { PanelData, ShowToast } from '../types.js';
import { postJson } from '../api-client.js';
import { Button } from '../components/Button.js';
import { Badge } from '../components/Badge.js';
import { SectionHeader } from '../components/SectionHeader.js';
import { HelpLink } from '../components/HelpLink.js';
import { entryDoc } from '../utils/docs.js';

export function ProfilesTab({ data, reload, toast }: { data: PanelData; reload: () => Promise<void>; toast: ShowToast }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [globalPath, setGlobalPath] = useState('');
  const profiles = data.profiles || [];
  async function call(url: string, body: unknown) { const res: any = await postJson(url, body); toast(res.message || 'Saved'); await reload(); }
  return <><SectionHeader title="Profiles" copy="Manage memory profiles." helpHref={entryDoc('profiles')} />
    <div className="tab-actions inline-actions"><Button onClick={() => setOpen(!open)}>Add Profile</Button></div>
    <div className={'add-form-row' + (open ? ' open' : '')}><div className="form-group"><label className="form-label label-with-help"><span>Name</span><HelpLink href={entryDoc('profiles', 'profile-name')} label="Open profile name docs" /></label><input className="form-input" value={name} onChange={(e) => setName(e.target.value)} /></div><div className="form-group"><label className="form-label label-with-help"><span>Global path</span><HelpLink href={entryDoc('profiles', 'global-path')} label="Open profile path docs" /></label><input className="form-input" value={globalPath} onChange={(e) => setGlobalPath(e.target.value)} /></div><Button variant="primary" onClick={() => call('/api/profile/add', { name, globalPath, scope: 'global' })}>Save</Button></div>
    <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Name</th><th>Path</th><th>Status</th><th /></tr></thead><tbody>{profiles.map((profile: any) => <tr key={profile.name || profile.path}><td>{profile.name}</td><td className="mono">{profile.globalPath || profile.path || '-'}</td><td>{profile.active ? <Badge tone="pos">active</Badge> : <Badge>available</Badge>}</td><td className="actions"><Button variant="ghost" onClick={() => call('/api/profile/activate', { name: profile.name })}>Activate</Button><Button variant="danger" onClick={() => call('/api/profile/remove', { name: profile.name })}>Delete</Button></td></tr>)}</tbody></table></div></>;
}
