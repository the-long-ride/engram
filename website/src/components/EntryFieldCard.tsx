import React from 'react';
import type {EntryFieldDoc} from '../data/entryFields';

type Props = {
  field: EntryFieldDoc;
};

const riskStyles: Record<string, {bg: string; border: string; label: string}> = {
  normal: {bg: 'var(--geist-gray-alpha-100)', border: 'var(--geist-gray-alpha-300)', label: 'Normal'},
  caution: {bg: 'var(--geist-amber-100)', border: 'var(--geist-amber-700)', label: 'Caution'},
  risky: {bg: 'var(--geist-red-100)', border: 'var(--geist-red-700)', label: 'Risky'},
};

export default function EntryFieldCard({field}: Props) {
  const risk = riskStyles[field.risk] ?? riskStyles.normal;
  return (
    <div
      style={{
        border: `1px solid ${risk.border}`,
        borderRadius: 'var(--geist-radius-md)',
        padding: '16px',
        margin: '16px 0',
        background: risk.bg,
        boxShadow: 'var(--geist-shadow-raised)',
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
