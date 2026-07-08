import React from 'react';

type Props = {
  level?: 'normal' | 'caution' | 'risky';
  children: React.ReactNode;
};

const styles: Record<string, {bg: string; border: string; label: string}> = {
  normal: {bg: 'var(--geist-gray-alpha-100)', border: 'var(--geist-gray-alpha-300)', label: 'Note'},
  caution: {bg: 'var(--geist-amber-100)', border: 'var(--geist-amber-700)', label: 'Caution'},
  risky: {bg: 'var(--geist-red-100)', border: 'var(--geist-red-700)', label: 'Warning'},
};

export default function RiskCallout({level = 'normal', children}: Props) {
  const s = styles[level] ?? styles.normal;
  return (
    <div
      style={{
        border: `1px solid ${s.border}`,
        borderLeft: `3px solid ${s.border}`,
        borderRadius: 'var(--geist-radius-md)',
        padding: '12px 16px',
        margin: '1rem 0',
        background: s.bg,
      }}>
      <strong>{s.label}: </strong>
      {children}
    </div>
  );
}
