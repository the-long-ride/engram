/** Bounded transcript event and ingestion result contracts. */
export type TranscriptEvent = { text: string; host: string; session_id?: string; source_file?: string };
export type TranscriptIngestOptions = { enabled?: boolean; max_chars?: number; max_files?: number };
export type TranscriptIngestResult = { status: 'stored' | 'disabled' | 'empty' | 'limited'; file?: string; redacted: number; removed_injection_lines: number; truncated: boolean };
