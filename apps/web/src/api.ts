export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...init.headers },
  });
  if (response.status === 204) return undefined as T;
  const body = (await response.json().catch(() => null)) as
    T | { error?: { code?: string; message?: string } } | null;
  if (!response.ok) {
    const error = body as { error?: { code?: string; message?: string } } | null;
    throw new ApiError(
      error?.error?.message ?? 'Request failed',
      response.status,
      error?.error?.code ?? 'request_failed',
    );
  }
  return body as T;
}

export const json = (method: string, body?: unknown): RequestInit => ({
  method,
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});
