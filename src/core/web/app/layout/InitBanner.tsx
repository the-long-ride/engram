// Workspace initialization banner for uninitialized directories.
import { Button } from '../components/Button.js';
export function InitBanner({ show, init }: { show: boolean; init: () => void }) {
  if (!show) return null;
  return <div id="init-banner-container" style={{ padding: '28px 32px 0 32px' }}><div className="init-banner"><div className="init-banner-text"><strong style={{ color: 'var(--amber-dk)', fontSize: 14 }}>Workspace Not Initialized</strong><span style={{ fontSize: 12, color: 'var(--g700)', display: 'block', marginTop: 2 }}>This directory is not yet configured for Engram memory routing.</span></div><Button variant="primary" id="init-btn" onClick={init}>Initialize Workspace</Button></div></div>;
}
