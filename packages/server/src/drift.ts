import { z } from 'zod';
import { DriftError } from './errors.js';

const json = z.json();
export const vertexSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  type: z.string(),
  slug: z.string().nullable(),
  externalId: z.string().nullable(),
  title: z.string().nullable(),
  status: z.string(),
  data: json,
  metadata: json,
  version: z.number().int().positive(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});
export const edgeSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  fromVertexId: z.string(),
  toVertexId: z.string(),
  type: z.string(),
  status: z.string(),
  data: json,
  metadata: json,
  version: z.number().int().positive(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});
export type DriftVertex = z.infer<typeof vertexSchema>;
export type DriftEdge = z.infer<typeof edgeSchema>;

export interface DriftPort {
  listVertices(type: string, status?: string): Promise<DriftVertex[]>;
  createVertex(body: Record<string, unknown>): Promise<DriftVertex>;
  getVertex(id: string): Promise<DriftVertex>;
  patchVertex(id: string, body: Record<string, unknown>): Promise<DriftVertex>;
  deleteVertex(id: string, version: number): Promise<DriftVertex>;
  createEdge(body: Record<string, unknown>): Promise<DriftEdge>;
  deleteEdge(id: string, version: number): Promise<DriftEdge>;
  listEdges(query: {
    type?: string;
    fromVertexId?: string;
    toVertexId?: string;
  }): Promise<DriftEdge[]>;
  getOutgoing(
    id: string,
    edgeType: string,
  ): Promise<{ vertices: DriftVertex[]; edges: DriftEdge[] }>;
}

export class DriftGateway implements DriftPort {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  private async request<T>(path: string, schema: z.ZodType<T>, init: RequestInit = {}): Promise<T> {
    let response: Response;
    try {
      response = await this.fetcher(`${this.baseUrl.replace(/\/$/, '')}${path}`, {
        ...init,
        signal: init.signal ?? AbortSignal.timeout(1_250),
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          'content-type': 'application/json',
          ...init.headers,
        },
      });
    } catch (error) {
      throw new DriftError(502, 'drift_unavailable', 'Drift is unavailable', String(error));
    }
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const drift = body as { error?: { code?: string; message?: string; details?: unknown } };
      throw new DriftError(
        response.status,
        drift.error?.code ?? 'drift_error',
        drift.error?.message ?? 'Drift request failed',
        drift.error?.details,
      );
    }
    const result = schema.safeParse(body);
    if (!result.success) {
      throw new DriftError(502, 'invalid_drift_response', 'Drift returned an invalid response');
    }
    return result.data;
  }

  async listVertices(type: string, status?: string): Promise<DriftVertex[]> {
    const items: DriftVertex[] = [];
    let cursor: string | null = null;
    do {
      const query = new URLSearchParams({ type, limit: '100' });
      if (status) query.set('status', status);
      if (cursor) query.set('cursor', cursor);
      const page = await this.request(
        `/v1/vertices?${query}`,
        z.object({ items: z.array(vertexSchema), nextCursor: z.string().nullable() }),
      );
      items.push(...page.items);
      cursor = page.nextCursor;
    } while (cursor);
    return items;
  }

  createVertex(body: Record<string, unknown>) {
    return this.request('/v1/vertices', vertexSchema, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }
  getVertex(id: string) {
    return this.request(`/v1/vertices/${encodeURIComponent(id)}`, vertexSchema);
  }
  patchVertex(id: string, body: Record<string, unknown>) {
    return this.request(`/v1/vertices/${encodeURIComponent(id)}`, vertexSchema, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }
  deleteVertex(id: string, version: number) {
    return this.request(`/v1/vertices/${encodeURIComponent(id)}`, vertexSchema, {
      method: 'DELETE',
      body: JSON.stringify({ version }),
    });
  }
  createEdge(body: Record<string, unknown>) {
    return this.request('/v1/edges', edgeSchema, { method: 'POST', body: JSON.stringify(body) });
  }
  deleteEdge(id: string, version: number) {
    return this.request(`/v1/edges/${encodeURIComponent(id)}`, edgeSchema, {
      method: 'DELETE',
      body: JSON.stringify({ version }),
    });
  }
  async listEdges(queryInput: { type?: string; fromVertexId?: string; toVertexId?: string }) {
    const items: DriftEdge[] = [];
    let cursor: string | null = null;
    do {
      const query = new URLSearchParams({ limit: '100' });
      for (const [key, value] of Object.entries(queryInput)) if (value) query.set(key, value);
      if (cursor) query.set('cursor', cursor);
      const page = await this.request(
        `/v1/edges?${query}`,
        z.object({ items: z.array(edgeSchema), nextCursor: z.string().nullable() }),
      );
      items.push(...page.items);
      cursor = page.nextCursor;
    } while (cursor);
    return items;
  }
  getOutgoing(id: string, edgeType: string) {
    const query = new URLSearchParams({ edgeType, limit: '100' });
    return this.request(
      `/v1/vertices/${encodeURIComponent(id)}/out?${query}`,
      z.object({ vertices: z.array(vertexSchema), edges: z.array(edgeSchema) }),
    );
  }
}
