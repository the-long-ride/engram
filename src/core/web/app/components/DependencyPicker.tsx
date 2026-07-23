import type { Dispatch, SetStateAction } from 'react';

export type DependencyChoice = { id: string; reason: 'DEPENDS_ON' | 'UPDATE' };
export type DependencyPickerProps = { ids: string[]; value: DependencyChoice[]; onChange: Dispatch<SetStateAction<DependencyChoice[]>> };

/** ID-only relation picker. It never renders related memory bodies or performs a write. */
export function DependencyPicker({ ids, value, onChange }: DependencyPickerProps) {
  const toggle = (id: string, reason: DependencyChoice['reason']) => onChange((current) => {
    const exists = current.some((item) => item.id === id && item.reason === reason);
    if (exists) return current.filter((item) => !(item.id === id && item.reason === reason));
    if (reason === 'UPDATE') return [...current.filter((item) => item.reason !== 'UPDATE' && item.id !== id), { id, reason }];
    return [...current.filter((item) => item.id !== id), { id, reason }];
  });
  return (
    <div className="card dependency-picker">
      <div className="review-section-heading">
        <div>
          <span className="card-title">Relation instructions</span>
          <p className="review-section-note">Prompt will include the selected relation and memory IDs.</p>
        </div>
        <span className="review-step">03</span>
      </div>
      <div className="dependency-picker-body">
        {!ids.length ? (
          <p className="muted">No related memory IDs.</p>
        ) : (
          ids.map((id) => {
            const selected = value.find((item) => item.id === id);
            return (
              <div className="dependency-row" key={id}>
                <code>{id}</code>
                <button className={selected?.reason === 'DEPENDS_ON' ? 'btn btn-primary' : 'btn btn-outline'} onClick={() => toggle(id, 'DEPENDS_ON')}>Mark dependency</button>
                <button className={selected?.reason === 'UPDATE' ? 'btn btn-primary' : 'btn btn-outline'} onClick={() => toggle(id, 'UPDATE')}>Mark replacement</button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
