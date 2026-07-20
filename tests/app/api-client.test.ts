import {
  getJson,
  postJson,
  loadPanelData,
  saveConfigPatch,
  validateConfigPatch,
  initializeWorkspace,
  shutdownServer,
  browseDirectories
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
