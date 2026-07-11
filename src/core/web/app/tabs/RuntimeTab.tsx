// Runtime tab for displaying current Engram runtime values.
import { useState } from 'react';
import type { PanelData, ShowToast } from '../types.js';
import { SectionHeader } from '../components/SectionHeader.js';
import { Card } from '../components/Card.js';
import { HelpLink } from '../components/HelpLink.js';
import { copyText } from '../utils/clipboard.js';
import { entryDoc } from '../utils/docs.js';

function valueClass(value: unknown): string {
  const s = String(value ?? '');
  if (/^(true|enabled|yes|on)$/i.test(s)) return 'val-pos';
  if (/^(false|disabled|no|off)$/i.test(s)) return 'val-neg';
  if (/^v?\d+\.\d+/.test(s)) return 'val-ver';
  if (/[\\/]/.test(s)) return 'val-path';
  if (!s || s === '-') return 'val-muted';
  return 'val-neutral';
}

export function RuntimeTab({ data, toast }: { data: PanelData; toast: ShowToast }) {
  const groups = data.runtime || data.entry || [];
  const [copiedKey, setCopiedKey] = useState('');
  async function copyRuntimeValue(event: React.MouseEvent, key: string, value: unknown) {
    event.stopPropagation();
    await copyText(String(value ?? ''), toast);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey((current) => current === key ? '' : current), 2000);
  }
  return <><SectionHeader title="Runtime" copy="Current Engram runtime and environment values." helpHref={entryDoc('runtime')} /><div className="rt-grid">{groups.map((group, idx) => <Card key={group.group || idx} title={group.group || 'Runtime'} helpHref={entryDoc('runtime', 'runtime-report-groups')} helpLabel="Open Runtime report groups documentation">{(group.rows || []).map(([key, value]) => <div key={key} className="rt-row"><span className="rt-key label-with-help"><span><span className="rt-key-pre">{String(key).split('.')[0]}</span>{String(key).includes('.') ? '.' + String(key).split('.').slice(1).join('.') : ''}</span><HelpLink href={entryDoc('runtime', 'runtime-report-groups')} label="Open runtime report groups documentation" /></span><button className={'rt-val ' + valueClass(value) + (copiedKey === key ? ' copied-value' : '')} onClick={(event) => copyRuntimeValue(event, String(key), value)}>{copiedKey === key ? 'Copied' : String(value ?? '-')}</button></div>)}</Card>)}</div></>;
}
