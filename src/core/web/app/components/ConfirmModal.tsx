// Confirmation modal building blocks for destructive actions.
import { Button } from './Button.js';
export function ConfirmBody({ message }: { message: string }) { return <p className="confirm-copy">{message}</p>; }
export function ConfirmActions({ cancel, confirm, confirmText = 'Confirm', danger = false }: { cancel: () => void; confirm: () => void; confirmText?: string; danger?: boolean }) {
  return <><Button variant="outline" data-confirm-cancel onClick={cancel}>Cancel</Button><Button variant={danger ? 'danger-solid' : 'primary'} data-confirm-confirm onClick={confirm}>{confirmText}</Button></>;
}
