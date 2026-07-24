// Shared compact checkbox group for small, fixed multi-value settings.
export function MultiChoice({ label, options, value, onChange, minSelected = 1 }: {
  label: string;
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
  minSelected?: number;
}) {
  const selected = [...new Set(value)];
  const available = [...new Set([...options, ...selected])];
  return <div className="multi-choice" role="group" aria-label={label}>{available.map((option) => {
    const checked = selected.includes(option);
    const disabled = checked && selected.length <= minSelected;
    return <label className={'multi-choice-option' + (checked ? ' selected' : '')} key={option}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={() => onChange(checked ? selected.filter((item) => item !== option) : [...selected, option])} />
      <span>{option}</span>
    </label>;
  })}</div>;
}
