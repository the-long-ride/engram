// Toast presenter for transient control panel feedback.
import type { ToastState } from '../types.js';
export function Toast({ toast }: { toast: ToastState | null }) { return <div id="toast" className={toast ? 'show ' + (toast.ok ? 'ok' : 'err') : ''}>{toast?.message || ''}</div>; }
