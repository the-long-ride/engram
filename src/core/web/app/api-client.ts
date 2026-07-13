// Fetch helpers for the Engram React control panel API.
import type { ApiResult, PanelData } from './types.js';

export async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : body.error?.message || 'Request failed (' + response.status + ')');
  return body as T;
}

export async function postJson<T = ApiResult>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {})
  });
  const text = await response.text();
  const parsed = text ? JSON.parse(text) : {};
  if (!response.ok || parsed.ok === false) throw new Error(typeof parsed.error === 'string' ? parsed.error : parsed.error?.message || parsed.message || 'Request failed (' + response.status + ')');
  return parsed as T;
}

export function loadPanelData(): Promise<PanelData> { return getJson<PanelData>('/api/data'); }
export function saveConfigPatch(patch: Record<string, unknown>): Promise<ApiResult> { return postJson('/api/config', { patch }); }
export function validateConfigPatch(patch: Record<string, unknown>): Promise<ApiResult> { return postJson('/api/config/validate', { patch }); }
export function initializeWorkspace(): Promise<ApiResult> { return postJson('/api/init', {}); }
export function shutdownServer(): Promise<void> { return fetch('/shutdown', { method: 'GET' }).then(() => undefined); }
export function browseDirectories(path: string): Promise<ApiResult> { return postJson('/api/browse', { path }); }
export function recall(query: string, explain = false): Promise<ApiResult> { return getJson(`/api/recall?query=${encodeURIComponent(query)}&explain=${String(explain)}`); }
export function reviewQueue(): Promise<ApiResult> { return getJson('/api/review'); }
export function reviewInspect(id: string): Promise<ApiResult> { return getJson(`/api/review/inspect?id=${encodeURIComponent(id)}`); }
export function policyStatus(): Promise<ApiResult> { return getJson('/api/policy'); }
export function capabilities(): Promise<ApiResult> { return getJson('/api/capabilities'); }
export function doctorStatus(): Promise<ApiResult> { return getJson('/api/doctor'); }
