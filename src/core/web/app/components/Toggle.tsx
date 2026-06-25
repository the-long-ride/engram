// Shared toggle primitive for boolean controls in the React control panel.
export function Toggle({ on, onClick, title }: { on: boolean; onClick?: () => void; title?: string }) {
  return <button type="button" className={'tgl' + (on ? ' on' : '')} onClick={onClick} title={title} aria-pressed={on}><div className="tgl-thumb" /></button>;
}
