// Modal presenter for focused control panel dialogs.
import { useEffect } from 'react';
import type { ModalState, ShowToast } from '../types.js';
import { copyText } from '../utils/clipboard.js';

export function Modal({ modal, close, toast }: { modal: ModalState | null; close: () => void; toast: ShowToast }) {
  useEffect(() => {
    if (!modal) return;
    const handler = (event: KeyboardEvent) => {
      if (modal.onKeyDown) modal.onKeyDown(event);
      else if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [modal, close]);
  if (!modal) return null;
  return <div id="modal-root" className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
    <div className={modal.className || 'modal-panel'} role="dialog" aria-modal="true">
      <div className="modal-hdr"><h2>{modal.title || ''}</h2><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{modal.copyContent ? <button className="btn btn-outline modal-copy-btn" aria-label="Copy content" title="Copy" onClick={() => copyText(modal.copyContent || '', toast, modal.copyLabel || 'Copied content')}><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true"><rect x="4" y="4" width="8" height="8" /><path d="M2 10V2h8" /></svg></button> : null}<button onClick={close}>&times;</button></div></div>
      <div className="modal-body">{modal.content}</div>
      {modal.actions ? <div className="modal-actions">{modal.actions}</div> : null}
    </div>
  </div>;
}
