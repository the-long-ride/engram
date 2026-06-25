// Shared frontend types for the Engram React control panel.
import type { ReactNode } from 'react';

export type TabName = 'config' | 'runtime' | 'core' | 'memories' | 'profiles' | 'workspaces' | 'connection';

export interface ConfigField {
  key: string;
  label: string;
  group: string;
  description?: string;
  input?: 'toggle' | 'select' | 'number' | 'roles' | 'text' | string;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  risk?: string;
}

export interface PanelData {
  cwd?: string;
  version?: string;
  latestVersion?: string;
  sqliteAvailable?: boolean;
  isInitialized?: boolean;
  config?: Record<string, any>;
  configFields?: ConfigField[];
  runtime?: Array<{ group: string; rows: Array<[string, any]> }>;
  profiles?: any[];
  workspaces?: any[];
  entry?: Array<{ group: string; rows: Array<[string, any]> }>;
}

export interface ToastState { message: string; ok: boolean; id: number; }
export interface ModalState { title?: string; content: ReactNode; actions?: ReactNode; className?: string; copyContent?: string; copyLabel?: string; onKeyDown?: (event: KeyboardEvent) => void; }
export interface ModalController { open: (modal: ModalState) => void; close: () => void; }
export interface ApiResult<T = any> { ok?: boolean; message?: string; data?: T; error?: string; issues?: Array<{ key: string; message: string }>; riskyKeys?: string[]; content?: string; }
export type ShowToast = (message: string, ok?: boolean) => void;
