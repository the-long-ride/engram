// Fetch helpers for the Engram React control panel API.
import type { ApiResult, AuthorMigrationDto, AuthorStateDto, PanelData, UpgradeApplyResultDto, UpgradePlanDto, UpgradeReviewItemStateDto, UpgradeReviewResponseDto, UpgradeReviewSummaryDto } from './types.js';

const CSRF_TOKEN_HEADER = 'X-Engram-CSRF';

/** Read the per-server-start CSRF token published by the Entry server via `<meta name="engram-csrf-token">`. Falls back to an empty string when the meta tag is missing (e.g. tests outside the panel HTML). */
function readCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const meta = document.querySelector('meta[name="engram-csrf-token"]');
  return meta ? (meta.getAttribute('content') || '') : '';
}

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
    headers: {
      'Content-Type': 'application/json',
      [CSRF_TOKEN_HEADER]: readCsrfToken()
    },
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
export function shutdownServer(): Promise<void> {
  return fetch('/shutdown', {
    method: 'POST',
    headers: { [CSRF_TOKEN_HEADER]: readCsrfToken() }
  }).then(() => undefined);
}
export function browseDirectories(path: string): Promise<ApiResult> { return postJson('/api/browse', { path }); }
export function recall(query: string, explain = false): Promise<ApiResult> { return getJson(`/api/recall?query=${encodeURIComponent(query)}&explain=${String(explain)}`); }
export function reviewQueue(): Promise<ApiResult> { return getJson(`/api/review`); }
export function reviewInspect(id: string): Promise<ApiResult> { return getJson(`/api/review/inspect?id=${encodeURIComponent(id)}`); }
export function reviewPreview(id: string, memoryIds: string[] = []): Promise<ApiResult> {
  const params = new URLSearchParams({ id });
  if (memoryIds.length) params.set('memory_ids', memoryIds.join(','));
  return getJson(`/api/review/preview?${params.toString()}`);
}
export function reviewWrite(body: { proposal: string; scope: 'workspace' | 'global'; relations: Array<{ id: string; reason: 'DEPENDS_ON' | 'UPDATE' }>; confirmed: true }): Promise<ApiResult> { return postJson('/api/review/write', body); }
export function reviewDismiss(ids: string[]): Promise<ApiResult> { return postJson('/api/review/dismiss', { ids }); }
export function policyStatus(): Promise<ApiResult> { return getJson('/api/policy'); }
export function savePolicyPatch(patch: Record<string, unknown>): Promise<ApiResult> { return postJson('/api/policy', { patch }); }
export function capabilities(): Promise<ApiResult> { return getJson('/api/capabilities'); }
export function doctorStatus(): Promise<ApiResult> { return getJson('/api/doctor'); }

export function loadAuthorState(): Promise<ApiResult<AuthorStateDto>> { return getJson('/api/author'); }
export function setAuthorProfile(body: { scope: 'global' | 'workspace'; name: string; email: string; confirmed: true }): Promise<ApiResult> { return postJson('/api/author/set', body); }
export function unsetAuthorProfile(body: { scope: 'global' | 'workspace'; confirmed: true }): Promise<ApiResult> { return postJson('/api/author/unset', body); }
export function planGlobalGitAuthorSync(): Promise<ApiResult> { return postJson('/api/author/sync-git-global/plan', {}); }
export function syncGlobalGitAuthor(confirmed: true): Promise<ApiResult> { return postJson('/api/author/sync-git-global', { confirmed }); }
export function planAuthorMemoryMigration(scope: 'workspace' | 'global' | 'both'): Promise<ApiResult<AuthorMigrationDto>> { return postJson('/api/author/migrate/plan', { scope }); }
export function migrateMemoryAuthors(scope: 'workspace' | 'global' | 'both', confirmed: true): Promise<ApiResult<AuthorMigrationDto>> { return postJson('/api/author/migrate', { scope, confirmed }); }

export async function loadUpgradePlan(): Promise<UpgradePlanDto> {
  const response = await getJson<ApiResult<UpgradePlanDto>>('/api/upgrade/plan');
  if (!response.data) throw new Error(response.error || 'Upgrade plan response is missing data');
  return response.data;
}
export async function applyUpgradePlan(fingerprint: string, confirmed: true): Promise<UpgradeApplyResultDto> {
  const response = await postJson<ApiResult<UpgradeApplyResultDto>>('/api/upgrade/apply', { fingerprint, confirmed });
  if (!response.data) throw new Error(response.error || 'Upgrade result response is missing data');
  return response.data;
}


export async function loadUpgradeReview(fingerprint: string, itemId: string): Promise<UpgradeReviewResponseDto> {
  const response = await getJson<ApiResult<UpgradeReviewResponseDto>>(`/api/upgrade/review?fingerprint=${encodeURIComponent(fingerprint)}&item=${encodeURIComponent(itemId)}`);
  if (!response.data) throw new Error(response.error || 'Upgrade review response is missing data');
  return response.data;
}

export async function saveUpgradeReview(body: { fingerprint: string; itemId: string; state: 'accept-latest' | 'edited' | 'keep-current' | 'force-latest'; proposedContent?: string }): Promise<{ review: UpgradeReviewSummaryDto }> {
  const response = await postJson<ApiResult<{ review: UpgradeReviewSummaryDto }>>('/api/upgrade/review', body);
  if (!response.data) throw new Error(response.error || 'Upgrade review save response is missing data');
  return response.data;
}

export async function saveUpgradeReviewsBatch(fingerprint: string, itemIds: string[]): Promise<{ review: UpgradeReviewSummaryDto; saved: UpgradeReviewItemStateDto[] }> {
  const response = await postJson<ApiResult<{ review: UpgradeReviewSummaryDto; saved: UpgradeReviewItemStateDto[] }>>('/api/upgrade/review/batch', { fingerprint, itemIds });
  if (!response.data) throw new Error(response.error || 'Upgrade batch review response is missing data');
  return response.data;
}

export async function openUpgradeFile(fingerprint: string, itemId: string): Promise<{ file: string }> {
  const response = await postJson<ApiResult<{ file: string }>>('/api/upgrade/open-file', { fingerprint, itemId });
  if (!response.data) throw new Error(response.error || 'Upgrade open-file response is missing data');
  return response.data;
}
