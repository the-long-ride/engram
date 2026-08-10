import {
  getJson,
  postJson,
  loadPanelData,
  saveConfigPatch,
  validateConfigPatch,
  initializeWorkspace,
  shutdownServer,
  browseDirectories,
  loadUpgradePlan,
  applyUpgradePlan,
  loadUpgradeReview,
  saveUpgradeReview,
  saveUpgradeReviewsBatch,
  openUpgradeFile
} from '../../src/core/web/app/api-client.js';

describe('api-client', () => {
  let mockFetch: any;

  beforeEach(() => {
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('getJson fetches and returns data on ok response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ value: 'hello' })),
    });

    const res = await getJson<{ value: string }>('/test');
    expect(res).toEqual({ value: 'hello' });
    expect(mockFetch).toHaveBeenCalledWith('/test');
  });

  test('getJson throws on error response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve(JSON.stringify({ error: 'bad request' })),
    });

    await expect(getJson('/test')).rejects.toThrow('bad request');
  });

  test('getJson fallback error message', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve(''),
    });

    await expect(getJson('/test')).rejects.toThrow('Request failed (500)');
  });

  test('postJson posts and returns parsed result', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ ok: true })),
    });

    const res = await postJson('/post-test', { data: 123 });
    expect(res).toEqual({ ok: true });
    expect(mockFetch).toHaveBeenCalledWith('/post-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Engram-CSRF': '' },
      body: JSON.stringify({ data: 123 }),
    });
  });

  test('postJson throws when parsed ok is false', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ ok: false, error: 'failed action' })),
    });

    await expect(postJson('/post-test', {})).rejects.toThrow('failed action');
  });

  test('loadPanelData calls correct API endpoint', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ isInitialized: true })),
    });
    const data = await loadPanelData();
    expect(mockFetch).toHaveBeenCalledWith('/api/data');
    expect(data).toEqual({ isInitialized: true });
  });

  test('saveConfigPatch calls correct endpoint', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ ok: true })),
    });
    await saveConfigPatch({ key: 'val' });
    expect(mockFetch).toHaveBeenCalledWith('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Engram-CSRF': '' },
      body: JSON.stringify({ patch: { key: 'val' } }),
    });
  });

  test('validateConfigPatch calls correct endpoint', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ ok: true })),
    });
    await validateConfigPatch({ key: 'val' });
    expect(mockFetch).toHaveBeenCalledWith('/api/config/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Engram-CSRF': '' },
      body: JSON.stringify({ patch: { key: 'val' } }),
    });
  });

  test('initializeWorkspace calls correct endpoint', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ ok: true, message: 'Done' })),
    });
    const res = await initializeWorkspace();
    expect(res).toEqual({ ok: true, message: 'Done' });
    expect(mockFetch).toHaveBeenCalledWith('/api/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Engram-CSRF': '' },
      body: JSON.stringify({}),
    });
  });

  test('upgrade client calls plan, apply, review, batch, and open-file endpoints with server identifiers', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ ok: true, data: { fingerprint: 'fp', items: [] } })) })
      .mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ ok: true, data: { fingerprint: 'fp', transactions: [] } })) })
      .mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ ok: true, data: { plan: {}, proposal: {}, review: {}, saved: null } })) })
      .mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ ok: true, data: { review: { pendingReviewCount: 0 } } })) })
      .mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ ok: true, data: { review: {}, saved: [] } })) })
      .mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ ok: true, data: { file: '/tmp/AGENTS.md' } })) });

    await loadUpgradePlan();
    await applyUpgradePlan('fp', true);
    await loadUpgradeReview('fp value', 'item/id');
    await saveUpgradeReview({ fingerprint: 'fp', itemId: 'item', state: 'force-latest' });
    await saveUpgradeReviewsBatch('fp', ['a', 'b']);
    await expect(openUpgradeFile('fp', 'item')).resolves.toEqual({ file: '/tmp/AGENTS.md' });

    expect(mockFetch.mock.calls[0][0]).toBe('/api/upgrade/plan');
    expect(mockFetch.mock.calls[1][0]).toBe('/api/upgrade/apply');
    expect(mockFetch.mock.calls[1][1].body).toBe(JSON.stringify({ fingerprint: 'fp', confirmed: true }));
    expect(mockFetch.mock.calls[2][0]).toBe('/api/upgrade/review?fingerprint=fp%20value&item=item%2Fid');
    expect(mockFetch.mock.calls[3][0]).toBe('/api/upgrade/review');
    expect(mockFetch.mock.calls[3][1].body).toBe(JSON.stringify({ fingerprint: 'fp', itemId: 'item', state: 'force-latest' }));
    expect(mockFetch.mock.calls[4][0]).toBe('/api/upgrade/review/batch');
    expect(mockFetch.mock.calls[4][1].body).toBe(JSON.stringify({ fingerprint: 'fp', itemIds: ['a', 'b'] }));
    expect(mockFetch.mock.calls[5][0]).toBe('/api/upgrade/open-file');
    expect(mockFetch.mock.calls[5][1].body).toBe(JSON.stringify({ fingerprint: 'fp', itemId: 'item' }));
  });

  test('shutdownServer calls correct endpoint', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(''),
    });
    await shutdownServer();
    expect(mockFetch).toHaveBeenCalledWith('/shutdown', {
      method: 'POST',
      headers: { 'X-Engram-CSRF': '' }
    });
  });

  test('browseDirectories calls correct endpoint', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ ok: true })),
    });
    await browseDirectories('/some/path');
    expect(mockFetch).toHaveBeenCalledWith('/api/browse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Engram-CSRF': '' },
      body: JSON.stringify({ path: '/some/path' }),
    });
  });
});
