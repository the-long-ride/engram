/** Bounded transcript event and ingestion result contracts. */
import type { Sensitivity, TraceRetention, TrustLevel } from '../runtime/types.js';

export type TranscriptEvent = {
  text: string;
  host: string;
  session_id?: string;
  turn_id?: number;
  speaker?: string;
  event_time?: string;
  source?: string;
  source_file?: string;
  trust_level?: TrustLevel;
  sensitivity?: Sensitivity;
  retention?: TraceRetention;
};

export type TranscriptIngestOptions = {
  enabled?: boolean;
  max_chars?: number;
  max_files?: number;
  sensitivity?: Sensitivity;
  retention?: TraceRetention;
};

export type TranscriptIngestResult = {
  status: 'stored' | 'disabled' | 'empty' | 'limited';
  file?: string;
  trace_id?: string;
  trace_file?: string;
  redacted: number;
  removed_injection_lines: number;
  truncated: boolean;
};
