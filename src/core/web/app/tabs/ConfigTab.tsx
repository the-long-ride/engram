// Construct tab for staging, validating, and saving config changes.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ConfigField, PanelData, ShowToast } from '../types.js';
import { saveConfigPatch, validateConfigPatch } from '../api-client.js';
import { Button } from '../components/Button.js';
import { Card } from '../components/Card.js';
import { Toggle } from '../components/Toggle.js';
import { SectionHeader } from '../components/SectionHeader.js';
import { HelpLink } from '../components/HelpLink.js';
import { clientValidationError, groupFields, gv, parseFieldValue, uiValue } from '../utils/config.js';
import { entryDoc, entryFieldGroupDoc } from '../utils/docs.js';

export function ConfigTab({ data, reload, toast }: { data: PanelData; reload: () => Promise<void>; toast: ShowToast }) {
  const fields = data.configFields || [];
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [reviewOpen, setReviewOpen] = useState(false);
  const [riskyConfirmed, setRiskyConfirmed] = useState(false);
  const [serverRiskyKeys, setServerRiskyKeys] = useState<string[]>([]);
  const [saveHeaderPulse, setSaveHeaderPulse] = useState(false);
  const validationSeq = useRef(0);

  useEffect(() => {
    const next: Record<string, string> = {};
    fields.forEach((field) => { next[field.key] = uiValue(field, gv(data.config, field.key)); });
    setDraft(next); setDirty({}); setErrors({}); setReviewOpen(false); setRiskyConfirmed(false); setServerRiskyKeys([]);
  }, [data]);

  const grouped = useMemo(() => groupFields(fields), [fields]);
  const dirtyKeys = Object.keys(dirty).filter((key) => dirty[key]);
  const patch = useMemo(() => {
    const next: Record<string, unknown> = {};
    for (const key of dirtyKeys) {
      const field = fields.find((item) => item.key === key);
      if (field) next[key] = parseFieldValue(field, draft[key] || '');
    }
    return next;
  }, [dirtyKeys.join('|'), draft, fields]);

  async function changeCfg(field: ConfigField, value: string) {
    const nextError = clientValidationError(field, value);
    const original = uiValue(field, gv(data.config, field.key));
    setDraft((prev) => ({ ...prev, [field.key]: value }));
    setDirty((prev) => ({ ...prev, [field.key]: value !== original }));
    setErrors((prev) => ({ ...prev, [field.key]: nextError }));
    if (value !== original) { setSaveHeaderPulse(true); window.setTimeout(() => setSaveHeaderPulse(false), 450); }
    if (field.key !== 'global_path') return;
    validationSeq.current += 1;
    const currentSeq = validationSeq.current;
    if (!nextError && value) {
      try {
        const res = await validateConfigPatch({ global_path: value });
        if (currentSeq !== validationSeq.current) return;
        const issue = res.issues?.find((item) => item.key === 'global_path');
        setErrors((prev) => ({ ...prev, global_path: res.ok === false ? (issue?.message || 'Global path validation failed') : '' }));
      } catch (e: any) { if (currentSeq === validationSeq.current) setErrors((prev) => ({ ...prev, global_path: e.message })); }
    }
  }

  function resetField(field: ConfigField) {
    validationSeq.current += 1;
    setDraft((prev) => ({ ...prev, [field.key]: uiValue(field, gv(data.config, field.key)) }));
    setDirty((prev) => ({ ...prev, [field.key]: false }));
    setErrors((prev) => ({ ...prev, [field.key]: '' }));
  }

  async function openCfgReview() {
    if (Object.values(errors).some(Boolean)) { toast('Fix validation errors first', false); return; }
    try {
      const res = await validateConfigPatch(patch); // /api/config/validate
      setServerRiskyKeys(res.riskyKeys || []);
      setRiskyConfirmed(!(res.riskyKeys || []).length);
      setReviewOpen(true);
    } catch (e: any) { toast(e.message, false); }
  }

  async function confirmCfgSave() {
    try {
      const res = await saveConfigPatch(patch);
      toast(res.message || 'Saved');
      await reload();
    } catch (e: any) { toast(e.message, false); }
  }

  function renderControl(field: ConfigField) {
    const value = draft[field.key] ?? '';
    if (field.input === 'toggle') return <Toggle on={value === 'true'} title={field.key} onClick={() => changeCfg(field, String(value !== 'true'))} />;
    if (field.input === 'select') {
      let options = field.options || [];
      if (field.key === 'default_profile') {
        options = [''];
        (data.profiles || []).forEach((profile: any) => { if (profile.name && !options.includes(profile.name)) options.push(profile.name); });
        if (value && !options.includes(value)) options.push(value);
      }
      return <select className="cfg-select" value={value} onChange={(event) => changeCfg(field, event.target.value)}>{options.map((option) => <option key={option} value={option}>{option === '' ? '<none>' : option}</option>)}</select>;
    }
    return <input className={'cfg-input' + (field.input === 'number' ? '' : ' wide')} type={field.input === 'number' ? 'number' : 'text'} value={value} min={field.min} max={field.max} step={field.step} placeholder={field.input === 'roles' ? 'agent, reviewer' : ''} onBlur={(event) => changeCfg(field, event.target.value)} onChange={(event) => setDraft((prev) => ({ ...prev, [field.key]: event.target.value }))} />;
  }

  function fieldLabel(field: ConfigField) {
    return <><span className="cfg-label-title"><span>{field.label}</span><HelpLink href={entryFieldGroupDoc(field.group)} label={`Open ${field.label} documentation`} /></span>{field.description ? <span className="cfg-desc">{field.description}</span> : null}{errors[field.key] ? <span className="cfg-error">{errors[field.key]}</span> : null}</>;
  }

  return <>
    <SectionHeader title="Construct" copy="Settings applied across all workspaces." helpHref={entryDoc('construct')} />
    {!data.sqliteAvailable ? <div className="banner banner-info">Running in JSON mode. Profiles/workspaces require SQLite.</div> : null}
    {dirtyKeys.length ? <div className={'config-actions' + (saveHeaderPulse ? ' enter' : '')}><span><strong>{dirtyKeys.length}</strong> unsaved {dirtyKeys.length === 1 ? 'change' : 'changes'}</span><div className="config-actions-btns"><Button onClick={() => { validationSeq.current += 1; const reset: Record<string, string> = {}; fields.forEach((field) => { reset[field.key] = uiValue(field, gv(data.config, field.key)); }); setDraft(reset); setDirty({}); setErrors({}); }}>Reset</Button><Button variant="primary" onClick={openCfgReview}>Save changes</Button></div></div> : null}
    <div className="grid-2">{Object.entries(grouped).reduce<any[][]>((cols, [group, groupFields], idx) => { cols[idx % 2].push(<Card key={group} title={group} helpHref={entryFieldGroupDoc(group)}>{groupFields.map((field) => <div key={field.key} className={'cfg-row' + (dirty[field.key] ? ' dirty' : '')} data-key={field.key}><div className="cfg-lbl">{fieldLabel(field)}</div><div className="cfg-ctl">{renderControl(field)}{dirty[field.key] ? <button className="cfg-reset" onClick={() => resetField(field)}>Reset</button> : null}</div></div>)}</Card>); return cols; }, [[], []]).map((col, idx) => <div key={idx} className="grid-col">{col}</div>)}</div>
    {reviewOpen ? <div className="modal-backdrop"><div className="modal-panel"><div className="modal-hdr"><h2>Review config changes</h2><button onClick={() => setReviewOpen(false)}>&times;</button></div><div className="modal-body"><table className="review-table"><thead><tr><th>Key</th><th>Value</th></tr></thead><tbody>{Object.entries(patch).map(([key, value]) => <tr key={key}><td className="mono">{key}</td><td>{Array.isArray(value) ? value.join(', ') : String(value)}</td></tr>)}</tbody></table>{serverRiskyKeys.length ? <label className="confirm-line"><input type="checkbox" checked={riskyConfirmed} onChange={(event) => setRiskyConfirmed(event.target.checked)} /> I reviewed risky changes: {serverRiskyKeys.join(', ')}</label> : null}</div><div className="modal-actions"><Button onClick={() => setReviewOpen(false)}>Cancel</Button><Button variant="primary" disabled={!riskyConfirmed} onClick={confirmCfgSave}>Save changes</Button></div></div></div> : null}
  </>;
}
