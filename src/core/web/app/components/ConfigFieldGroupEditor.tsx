// Reusable editor for a bounded group of panel configuration fields.
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ConfigField, ModalController, PanelData, ShowToast } from '../types.js';
import { saveConfigPatch, validateConfigPatch } from '../api-client.js';
import { Button } from './Button.js';
import { Card } from './Card.js';
import { HelpLink } from './HelpLink.js';
import { Toggle } from './Toggle.js';
import { clientValidationError, gv, parseFieldValue, uiValue } from '../utils/config.js';
import { entryConfigFieldDoc, entryFieldGroupDoc } from '../utils/docs.js';

type Props = {
  data: PanelData;
  fields: ConfigField[];
  reload: () => Promise<void>;
  toast: ShowToast;
  modal: ModalController;
  title: string;
  description: string;
  saveLabel?: string;
};

type ReviewProps = {
  patch: Record<string, unknown>;
  riskyKeys: string[];
  close: () => void;
  run: () => Promise<void>;
};

function ConfigPatchReview({ patch, riskyKeys, close, run }: ReviewProps) {
  const [confirmed, setConfirmed] = useState(riskyKeys.length === 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save() {
    setBusy(true);
    setError('');
    try {
      await run();
      close();
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }
  return <div className="config-group-review">
    <table className="review-table"><thead><tr><th>Key</th><th>Value</th></tr></thead><tbody>{Object.entries(patch).map(([key, value]) => <tr key={key}><td className="mono">{key}</td><td>{Array.isArray(value) ? value.join(', ') : String(value)}</td></tr>)}</tbody></table>
    {riskyKeys.length ? <label className="confirm-line"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /> I reviewed risky changes: {riskyKeys.join(', ')}</label> : null}
    {error ? <div className="author-error" role="alert">{error}</div> : null}
    <div className="author-modal-actions"><Button onClick={close}>Cancel</Button><Button variant="primary" disabled={!confirmed || busy} onClick={() => void save()}>{busy ? 'Saving…' : 'Confirm Git configuration'}</Button></div>
  </div>;
}

export function ConfigFieldGroupEditor({ data, fields, reload, toast, modal, title, description, saveLabel = 'Save Git configuration' }: Props) {
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const field of fields) next[field.key] = uiValue(field, gv(data.config, field.key));
    setDraft(next);
    setDirty({});
    setErrors({});
  }, [data.config, fields]);

  const dirtyKeys = Object.keys(dirty).filter((key) => dirty[key]);
  const patch = useMemo(() => {
    const next: Record<string, unknown> = {};
    for (const field of fields) {
      if (dirty[field.key]) next[field.key] = parseFieldValue(field, draft[field.key] ?? '');
    }
    return next;
  }, [dirty, draft, fields]);

  function baseline(field: ConfigField): string {
    return uiValue(field, gv(data.config, field.key));
  }

  function changeField(field: ConfigField, value: string) {
    const error = clientValidationError(field, value);
    setDraft((prev) => ({ ...prev, [field.key]: value }));
    setErrors((prev) => ({ ...prev, [field.key]: error }));
    setDirty((prev) => ({ ...prev, [field.key]: value !== baseline(field) }));
  }

  function resetField(field: ConfigField) {
    const value = baseline(field);
    setDraft((prev) => ({ ...prev, [field.key]: value }));
    setErrors((prev) => ({ ...prev, [field.key]: '' }));
    setDirty((prev) => ({ ...prev, [field.key]: false }));
  }

  function renderControl(field: ConfigField): ReactNode {
    const value = draft[field.key] ?? '';
    if (field.input === 'toggle') return <Toggle on={value === 'true'} title={field.key} onClick={() => changeField(field, String(value !== 'true'))} />;
    if (field.input === 'select') return <select className="cfg-select" value={value} onChange={(event) => changeField(field, event.target.value)}>{(field.options || []).map((option) => <option value={option} key={option}>{option}</option>)}</select>;
    if (field.input === 'textarea') return <textarea className="cfg-input wide" rows={4} value={value} onChange={(event) => setDraft((prev) => ({ ...prev, [field.key]: event.target.value }))} onBlur={(event) => changeField(field, event.target.value)} />;
    return <input className={'cfg-input' + (field.input === 'number' ? '' : ' wide')} type={field.input === 'number' ? 'number' : 'text'} value={value} min={field.min} max={field.max} step={field.step} onChange={(event) => setDraft((prev) => ({ ...prev, [field.key]: event.target.value }))} onBlur={(event) => changeField(field, event.target.value)} />;
  }

  async function openReview() {
    if (!dirtyKeys.length) return;
    const localError = dirtyKeys.find((key) => errors[key]);
    if (localError) {
      toast(errors[localError], false);
      return;
    }
    try {
      const validation = await validateConfigPatch(patch);
      if (validation.ok === false || validation.issues?.length) {
        const message = validation.issues?.map((issue) => issue.message).join('; ') || validation.error || 'Configuration validation failed';
        throw new Error(message);
      }
      const riskyKeys = validation.riskyKeys || [];
      const selectedPatch = { ...patch };
      modal.open({
        title: 'Review Global Git configuration',
        className: 'modal-panel confirm-panel',
        content: <ConfigPatchReview patch={selectedPatch} riskyKeys={riskyKeys} close={modal.close} run={async () => {
          const saved = await saveConfigPatch(selectedPatch);
          toast(saved.message || 'Git configuration saved');
          await reload();
        }} />
      });
    } catch (e: any) {
      toast(e.message || String(e), false);
    }
  }

  if (!fields.length) return null;
  return <Card title={title} helpHref={entryFieldGroupDoc('Global Git')} helpLabel="Open Global Git configuration documentation">
    <p className="git-config-desc" style={{ padding: '12px 16px 4px', color: 'var(--g600)', fontSize: 11, margin: 0 }}>{description}</p>
    <div className="git-config-fields">{fields.map((field) => <div key={field.key} className={'cfg-row' + (dirty[field.key] ? ' dirty' : '')} data-key={field.key}>
      <div className="cfg-lbl"><span className="cfg-label-title"><span>{field.label}</span><HelpLink href={entryConfigFieldDoc(field.docsAnchor)} label={`Open ${field.label} docs`} /></span>{field.description ? <span className="cfg-desc">{field.description}</span> : null}{errors[field.key] ? <span className="cfg-error">{errors[field.key]}</span> : null}</div>
      <div className="cfg-ctl">{renderControl(field)}{dirty[field.key] ? <button className="cfg-reset" onClick={() => resetField(field)}>Reset</button> : null}</div>
    </div>)}</div>
    <div className="author-actions" style={{ padding: '12px 16px' }}><Button variant="primary" aria-label={saveLabel} disabled={!dirtyKeys.length} onClick={() => void openReview()}>{saveLabel}</Button></div>
  </Card>;
}
