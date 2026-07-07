import React from 'react';

type Props = {
  level?: 'normal' | 'caution' | 'risky';
  children: React.ReactNode;
};

const styles: Record<string, {bg: string; border: string; label: string}> = {
  normal: {bg: 'var(--ifm-color-emphasis-100)', border: 'var(--ifm-color-emphasis-300)', label: 'Note'},
  caution: {bg: 'rgba(255, 193, 7, 0.1)', border: '#ffc107', label: 'Caution'},
  risky: {bg: 'rgba(220, 53, 69, 0.1)', border: '#dc3545', label: 'Warning'},
};

export default function RiskCallout({level = 'normal', children}: Props) {
  const s = styles[level] ?? styles.normal;
  return (
    <div
      style={{
        border: `1px solid ${s.border}`,
        borderLeft: `4px solid ${s.border}`,
        borderRadius: '4px',
        padding: '0.75rem 1rem',
        margin: '1rem 0',
        background: s.bg,
      }}>
      <strong>{s.label}: </strong>
      {children}
    </div>
  );
}
