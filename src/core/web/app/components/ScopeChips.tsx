// Shared segmented chip controls for scope and type filters.
export function ScopeChips({ values, active, onToggle }: { values: Array<[string, string]>; active: string[]; onToggle: (value: string) => void }) {
  return <div className="core-scope-controls">{values.map(([value, label]) => <button key={value} className={'scope-chip' + (active.includes(value) ? ' active' : '')} onClick={() => onToggle(value)}>{label}</button>)}</div>;
}
