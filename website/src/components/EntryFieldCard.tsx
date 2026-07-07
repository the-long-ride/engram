import React from 'react';
import type {EntryFieldDoc} from '../data/entryFields';

type Props = {
  field: EntryFieldDoc;
};

const riskStyles: Record<string, {bg: string; border: string; label: string}> = {
  normal: {bg: 'var(--ifm-color-emphasis-100)', border: 'var(--ifm-color-emphasis-300)', label: 'Normal'},
  caution: {bg: 'rgba(255, 193, 7, 0.1)', border: '#ffc107', label: 'Caution'},
  risky: {bg: 'rgba(220, 53, 69, 0.1)', border: '#dc3545', label: 'Risky'},
};

export default function EntryFieldCard({field}: Props) {
  const risk = riskStyles[field.risk] ?? riskStyles.normal;
  return (
    <div
      style={{
        border: `1px solid ${risk.border}`,
        borderRadius: '8px',
        padding: '1rem',
        margin: '1rem 0',
        background: risk.bg,
      }}>
      <h3 style={{marginTop: 0}}>
        {field.label} <code>{field.key}</code>
      </h3>
      <p>
        <strong>Control:</strong> {field.control} &nbsp;|&nbsp; <strong>Default:</strong>{' '}
        {field.defaultValue ?? '—'} &nbsp;|&nbsp; <strong>Risk:</strong> {risk.label}
      </p>
      <p>{field.shortDescription}</p>
      {field.allowedValues && (
        <p>
          <strong>Allowed values:</strong>{' '}
          {field.allowedValues.map((v) => (
            <code key={v}>{v}</code>
          ))}
        </p>
      )}
      {field.useCases.length > 0 && (
        <>
          <h4>Use cases</h4>
          <ul>
            {field.useCases.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        </>
      )}
      {field.guidelines.length > 0 && (
        <>
          <h4>Guidelines</h4>
          <ul>
            {field.guidelines.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </>
      )}
      {field.cliEquivalent && field.cliEquivalent.length > 0 && (
        <>
          <h4>CLI equivalent</h4>
          <pre>
            <code>{field.cliEquivalent.join('\n')}</code>
          </pre>
        </>
      )}
    </div>
  );
}
