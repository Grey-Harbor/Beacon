import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, json } from './api';

describe('API requests', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not describe a bodyless request as JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await api('/api/v1/session', json('DELETE'));

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/session', { method: 'DELETE' });
  });

  it('sets the JSON content type when a request has a JSON body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await api('/api/v1/session', json('POST', { username: 'operator' }));

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/session', {
      method: 'POST',
      body: JSON.stringify({ username: 'operator' }),
      headers: { 'content-type': 'application/json' },
    });
  });
});
