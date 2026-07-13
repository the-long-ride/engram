import type { Dispatch, SetStateAction } from 'react';

export type DependencyChoice = { id: string; reason: 'DEPENDS_ON' | 'UPDATE' };
export type DependencyPickerProps = { ids: string[]; value: DependencyChoice[]; onChange: Dispatch<SetStateAction<DependencyChoice[]>> };

/** ID-only relation picker. It never renders related memory bodies or performs a write. */
export function DependencyPicker({ ids, value, onChange }: DependencyPickerProps) {
  const toggle = (id: string, reason: DependencyChoice['reason']) => onChange((current) => {
    const exists = current.some((item) => item.id === id && item.reason === reason);
    return exists ? current.filter((item) => !(item.id === id && item.reason === reason)) : [...current.filter((item) => item.id !== id), { id, reason }];
  });
  return <fieldset className="dependency-picker">
    <legend>Dependencies (IDs only)</legend>
    {!ids.length ? <p className="muted">No related memory IDs.</p> : ids.map((id) => {
      const selected = value.find((item) => item.id === id);
      return <div className="dependency-row" key={id}>
        <code>{id}</code>
        <button className={selected?.reason === 'DEPENDS_ON' ? 'btn btn-primary' : 'btn btn-outline'} onClick={() => toggle(id, 'DEPENDS_ON')}>Depends on</button>
        <button className={selected?.reason === 'UPDATE' ? 'btn btn-primary' : 'btn btn-outline'} onClick={() => toggle(id, 'UPDATE')}>Update</button>
      </div>;
    })}
  </fieldset>;
}
