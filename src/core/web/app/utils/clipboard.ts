// Clipboard helpers with toast feedback for the web UI.
import type { ShowToast } from '../types.js';

export async function copyText(text: string, toast: ShowToast, label = 'Copied'): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast(label);
  } catch {
    toast('Copy failed', false);
  }
}
