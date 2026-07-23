// Construct tab for staging, validating, and saving config changes.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ConfigField, PanelData, ShowToast } from '../types.js';
import { saveConfigPatch, savePolicyPatch, validateConfigPatch } from '../api-client.js';
import { Button } from '../components/Button.js';
import { Badge } from '../components/Badge.js';
import { Card } from '../components/Card.js';
import { Toggle } from '../components/Toggle.js';
import { MultiChoice } from '../components/MultiChoice.js';
import { SectionHeader } from '../components/SectionHeader.js';
import { HelpLink } from '../components/HelpLink.js';
import { clientValidationError, groupFields, gv, parseFieldValue, uiValue } from '../utils/config.js';
import { entryConfigFieldDoc, entryDoc, entryFieldGroupDoc } from '../utils/docs.js';
import { policyFieldMeta, type PolicyFieldPath } from '../data/policy-fields.js';

const DEFAULT_POLICY_DRAFT = {
  version: 1 as const,
  autonomous_writes: {
    enabled: false,
    mode: 'review_only' as const,
    allowed_types: ['knowledge'],
    allowed_scopes: ['workspace'],
    allowed_sources: ['autosave'],
    confidence_threshold: 'high' as const,
    daily_limit: 5,
    rollback_retention_days: 30
  },
  review: { max_rule_lines: 100, benchmark_min_recall_at_k: 0.9, mandatory_metadata: { context: false, triggers: false, role: false } }
};

type PolicyDraft = typeof DEFAULT_POLICY_DRAFT;
const POLICY_TYPE_OPTIONS = ['rule', 'skill', 'workflow', 'knowledge'];
const POLICY_SCOPE_OPTIONS = ['workspace', 'global'];
const POLICY_SOURCE_OPTIONS = ['autosave', 'agent-hook', 'cli', 'mcp'];

export function ConfigTab({ data, reload, toast }: { data: PanelData; reload: () => Promise<void>; toast: ShowToast }) {
  const fields = data.configFields || [];
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [reviewOpen, setReviewOpen] = useState(false);
  const [riskyConfirmed, setRiskyConfirmed] = useState(false);
  const [serverRiskyKeys, setServerRiskyKeys] = useState<string[]>([]);
  const [saveHeaderPulse, setSaveHeaderPulse] = useState(false);
  const [policyDraft, setPolicyDraft] = useState<PolicyDraft>(DEFAULT_POLICY_DRAFT);
  const [policySaving, setPolicySaving] = useState(false);
  const [policyError, setPolicyError] = useState('');
  const validationSeq = useRef(0);

  useEffect(() => {
    const next: Record<string, string> = {};
    fields.forEach((field) => { next[field.key] = uiValue(field, gv(data.config, field.key)); });
    setDraft(next); setDirty({}); setErrors({}); setReviewOpen(false); setRiskyConfirmed(false); setServerRiskyKeys([]);
    const loadedPolicy = data.policy?.policy;
    setPolicyDraft(loadedPolicy ? JSON.parse(JSON.stringify(loadedPolicy)) as PolicyDraft : JSON.parse(JSON.stringify(DEFAULT_POLICY_DRAFT)) as PolicyDraft);
    setPolicyError('');
  }, [data]);

  const initialPolicy = useMemo(() => {
    const loadedPolicy = data.policy?.policy;
    return loadedPolicy ? JSON.parse(JSON.stringify(loadedPolicy)) : JSON.parse(JSON.stringify(DEFAULT_POLICY_DRAFT));
  }, [data.policy?.policy]);

  const isPolicyDirty = useMemo(() => {
    return JSON.stringify(policyDraft) !== JSON.stringify(initialPolicy);
  }, [policyDraft, initialPolicy]);

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

  function changePolicyAuto(key: keyof PolicyDraft['autonomous_writes'], value: unknown) {
    setPolicyDraft((prev) => ({ ...prev, autonomous_writes: { ...prev.autonomous_writes, [key]: value } }));
    setPolicyError('');
  }

  function renderPolicyChoices(key: 'allowed_types' | 'allowed_scopes' | 'allowed_sources', options: string[]) {
    const value = policyDraft.autonomous_writes[key];
    return <MultiChoice label={key.replaceAll('_', ' ')} options={options} value={Array.isArray(value) && value.length ? value : [options[0]]} onChange={(next: string[]) => changePolicyAuto(key, next)} />;
  }

  function changePolicyList(key: 'allowed_types' | 'allowed_scopes' | 'allowed_sources', value: string) {
    changePolicyAuto(key, value.split(',').map((item) => item.trim()).filter(Boolean));
  }

  function renderPolicyList(key: 'allowed_types' | 'allowed_scopes' | 'allowed_sources', options: string[]) {
    const value = policyDraft.autonomous_writes[key];
    const selected = Array.isArray(value) && value.length ? value[0] : options[0];
    const available = [...new Set([...options, ...(Array.isArray(value) ? value : [])])];
    return <select className="cfg-select" value={selected} aria-label={key.replaceAll('_', ' ')} onChange={(event) => changePolicyAuto(key, [event.target.value])}>{available.map((option) => <option key={option} value={option}>{option}</option>)}</select>;
  }

  function changePolicyReview(key: keyof PolicyDraft['review'], value: unknown) {
    setPolicyDraft((prev) => ({ ...prev, review: { ...prev.review, [key]: value } }));
    setPolicyError('');
  }

  function changePolicyMetadata(key: 'context' | 'triggers' | 'role', value: boolean) {
    setPolicyDraft((prev) => ({ ...prev, review: { ...prev.review, mandatory_metadata: { ...(prev.review.mandatory_metadata ?? {}), [key]: value } } }));
    setPolicyError('');
  }

  async function savePolicy() {
    setPolicySaving(true); setPolicyError('');
    try {
      const res = await savePolicyPatch(policyDraft);
      toast(res.message || 'Auto-save policy saved');
      await reload();
    } catch (e: any) { setPolicyError(e.message); toast(e.message, false); }
    finally { setPolicySaving(false); }
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
    if (field.input === 'textarea') return <textarea className="cfg-input wide" rows={5} value={value} onChange={(event) => setDraft((prev) => ({ ...prev, [field.key]: event.target.value }))} onBlur={(event) => changeCfg(field, event.target.value)} />;
    return <input className={'cfg-input' + (field.input === 'number' ? '' : ' wide')} type={field.input === 'number' ? 'number' : 'text'} value={value} min={field.min} max={field.max} step={field.step} placeholder={field.input === 'roles' ? 'agent, reviewer' : ''} onBlur={(event) => changeCfg(field, event.target.value)} onChange={(event) => setDraft((prev) => ({ ...prev, [field.key]: event.target.value }))} />;
  }

  function fieldLabel(field: ConfigField) {
    return <>
      <span className="cfg-label-title">
        <span>{field.label}</span>
        <HelpLink href={entryConfigFieldDoc(field.docsAnchor)} label={`Open ${field.label} docs`} />
      </span>
      {field.description ? <span className="cfg-desc">{field.description}</span> : null}
      {errors[field.key] ? <span className="cfg-error">{errors[field.key]}</span> : null}
    </>;
  }

  function policyLabel(path: PolicyFieldPath) {
    const field = policyFieldMeta(path);
    return <>
      <span className="cfg-label-title">
        <span>{field.label}</span>
        <HelpLink href={entryDoc(field.docsPage, field.docsAnchor)} label={`Open ${field.label} docs`} />
      </span>
      {field.description ? <span className="cfg-desc">{field.description}</span> : null}
    </>;
  }

  return <>
  <SectionHeader title="Construct" copy="Settings shared across workspaces." helpHref={entryDoc('construct')} />
    {!data.sqliteAvailable ? <div className="banner banner-info">Running in JSON mode. Profiles/workspaces require SQLite.</div> : null}
    {dirtyKeys.length ? <div className={'config-actions' + (saveHeaderPulse ? ' enter' : '')}><span><strong>{dirtyKeys.length}</strong> unsaved {dirtyKeys.length === 1 ? 'change' : 'changes'}</span><div className="config-actions-btns"><Button onClick={() => { validationSeq.current += 1; const reset: Record<string, string> = {}; fields.forEach((field) => { reset[field.key] = uiValue(field, gv(data.config, field.key)); }); setDraft(reset); setDirty({}); setErrors({}); }}>Reset</Button><Button variant="primary" onClick={openCfgReview}>Save changes</Button></div></div> : null}
    <Card title="Auto-save policy" helpHref={entryDoc('policy')} badge={<Badge tone={policyDraft.autonomous_writes.enabled ? 'pos' : 'neutral'}>{policyDraft.autonomous_writes.enabled ? 'Enabled' : 'Off'}</Badge>}>
      <div className="config-policy-intro"><div><strong>Policy-gated autonomous writes</strong><p>Controls <span className="mono">engram autosave --policy</span>. Normal saves remain approval-based.</p></div><Button variant="primary" disabled={!isPolicyDirty || policySaving} onClick={savePolicy}>{policySaving ? 'Saving…' : 'Save policy'}</Button></div>
      {data.policy?.exists === false ? <div className="banner banner-info config-policy-banner">No policy file exists yet. Saving this component creates <span className="mono">.agents/engram.policy.json</span>.</div> : null}
      {policyError ? <div className="banner banner-warn config-policy-banner">{policyError}</div> : null}
      <div className="cfg-row"><div className="cfg-lbl">{policyLabel('autonomous_writes.enabled')}</div><div className="cfg-ctl"><Toggle on={policyDraft.autonomous_writes.enabled} title="Allow auto-save" onClick={() => changePolicyAuto('enabled', !policyDraft.autonomous_writes.enabled)} /></div></div>
      <div className="cfg-row"><div className="cfg-lbl">{policyLabel('autonomous_writes.mode')}</div><div className="cfg-ctl"><select className="cfg-select" value={policyDraft.autonomous_writes.mode} onChange={(event) => changePolicyAuto('mode', event.target.value)}><option value="review_only">Review only</option><option value="autonomous">Autonomous</option></select></div></div>
      <div className="cfg-row"><div className="cfg-lbl">{policyLabel('autonomous_writes.allowed_types')}</div><div className="cfg-ctl">{renderPolicyChoices('allowed_types', POLICY_TYPE_OPTIONS)}</div></div>
      <div className="cfg-row"><div className="cfg-lbl">{policyLabel('autonomous_writes.allowed_scopes')}</div><div className="cfg-ctl">{renderPolicyChoices('allowed_scopes', POLICY_SCOPE_OPTIONS)}</div></div>
      <div className="cfg-row"><div className="cfg-lbl">{policyLabel('autonomous_writes.allowed_sources')}</div><div className="cfg-ctl">{renderPolicyChoices('allowed_sources', POLICY_SOURCE_OPTIONS)}</div></div>
      <div className="cfg-row"><div className="cfg-lbl">{policyLabel('autonomous_writes.confidence_threshold')}</div><div className="cfg-ctl"><select className="cfg-select" value={policyDraft.autonomous_writes.confidence_threshold} onChange={(event) => changePolicyAuto('confidence_threshold', event.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div></div>
      <div className="cfg-row"><div className="cfg-lbl">{policyLabel('autonomous_writes.daily_limit')}</div><div className="cfg-ctl"><input className="cfg-input" type="number" min="0" value={policyDraft.autonomous_writes.daily_limit} onChange={(event) => changePolicyAuto('daily_limit', Number(event.target.value))} /></div></div>
      <div className="cfg-row"><div className="cfg-lbl">{policyLabel('autonomous_writes.rollback_retention_days')}</div><div className="cfg-ctl"><input className="cfg-input" type="number" min="0" value={policyDraft.autonomous_writes.rollback_retention_days} onChange={(event) => changePolicyAuto('rollback_retention_days', Number(event.target.value))} /></div></div>
      <div className="cfg-row"><div className="cfg-lbl">{policyLabel('review.max_rule_lines')}</div><div className="cfg-ctl"><input className="cfg-input" type="number" min="1" value={policyDraft.review.max_rule_lines} onChange={(event) => changePolicyReview('max_rule_lines', Number(event.target.value))} /></div></div>
      <div className="cfg-row"><div className="cfg-lbl">{policyLabel('review.benchmark_min_recall_at_k')}</div><div className="cfg-ctl"><input className="cfg-input" type="number" min="0" max="1" step="0.01" value={policyDraft.review.benchmark_min_recall_at_k} onChange={(event) => changePolicyReview('benchmark_min_recall_at_k', Number(event.target.value))} /></div></div>
      {(['context', 'triggers', 'role'] as const).map((key) => {
        const path = `review.mandatory_metadata.${key}` as PolicyFieldPath;
        return <div className="cfg-row" key={key}>
          <div className="cfg-lbl">{policyLabel(path)}</div>
          <div className="cfg-ctl">
            <Toggle
              on={Boolean(policyDraft.review.mandatory_metadata?.[key])}
              title={policyFieldMeta(path).label}
              onClick={() => changePolicyMetadata(key, !policyDraft.review.mandatory_metadata?.[key])}
            />
          </div>
        </div>;
      })}
    </Card>
    <div className="grid-2">{Object.entries(grouped).reduce<any[][]>((cols, [group, groupFields], idx) => { cols[idx % 2].push(<Card key={group} title={group} helpHref={entryFieldGroupDoc(group)}>{groupFields.map((field) => <div key={field.key} className={'cfg-row' + (dirty[field.key] ? ' dirty' : '')} data-key={field.key}><div className="cfg-lbl">{fieldLabel(field)}</div><div className="cfg-ctl">{renderControl(field)}{dirty[field.key] ? <button className="cfg-reset" onClick={() => resetField(field)}>Reset</button> : null}</div></div>)}</Card>); return cols; }, [[], []]).map((col, idx) => <div key={idx} className="grid-col">{col}</div>)}</div>
    {reviewOpen ? <div className="modal-backdrop"><div className="modal-panel"><div className="modal-hdr"><h2>Review config changes</h2><button onClick={() => setReviewOpen(false)}>&times;</button></div><div className="modal-body"><table className="review-table"><thead><tr><th>Key</th><th>Value</th></tr></thead><tbody>{Object.entries(patch).map(([key, value]) => <tr key={key}><td className="mono">{key}</td><td>{Array.isArray(value) ? value.join(', ') : String(value)}</td></tr>)}</tbody></table>{serverRiskyKeys.length ? <label className="confirm-line"><input type="checkbox" checked={riskyConfirmed} onChange={(event) => setRiskyConfirmed(event.target.checked)} /> I reviewed risky changes: {serverRiskyKeys.join(', ')}</label> : null}</div><div className="modal-actions"><Button onClick={() => setReviewOpen(false)}>Cancel</Button><Button variant="primary" disabled={!riskyConfirmed} onClick={confirmCfgSave}>Save changes</Button></div></div></div> : null}
  </>;
}
