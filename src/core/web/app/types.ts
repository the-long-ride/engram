// Shared frontend types for the Engram React control panel.
import type { ReactNode } from 'react';

export type TabName = 'recall' | 'review' | 'maintain' | 'connect' | 'config';

export interface ConfigField {
  key: string;
  label: string;
  group: string;
  description?: string;
  input?: 'toggle' | 'select' | 'number' | 'roles' | 'text' | 'textarea' | string;
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
  policy?: {
    path: string;
    exists: boolean;
    policy?: {
      version: 1;
      autonomous_writes: {
        enabled: boolean;
        mode: 'review_only' | 'autonomous';
        allowed_types: string[];
        allowed_scopes: string[];
        allowed_sources: string[];
        confidence_threshold: 'low' | 'medium' | 'high';
        daily_limit: number;
        rollback_retention_days: number;
      };
      review: { max_rule_lines: number; benchmark_min_recall_at_k: number; mandatory_metadata?: Record<string, boolean> };
    };
    diagnostics: Array<{ path: string; message: string }>;
  };
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
