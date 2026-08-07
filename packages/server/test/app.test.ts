import assert from 'node:assert/strict';
import test from 'node:test';
import type { Config } from '../src/config.js';
import type { DriftEdge, DriftPort, DriftVertex } from '../src/drift.js';
import { createApp } from '../src/app.js';
import { ProjectionStore } from '../src/projections.js';
import { BeaconService } from '../src/service.js';

class MemoryDrift implements DriftPort {
  vertices: DriftVertex[] = [];
  edges: DriftEdge[] = [];
  private counter = 0;
  private now() {
    return new Date(1_786_000_000_000 + this.counter * 1000).toISOString();
  }
  async listVertices(type: string, status?: string) {
    return this.vertices.filter(
      (item) => item.type === type && (!status || item.status === status),
    );
  }
  async createVertex(body: Record<string, unknown>) {
    const timestamp = this.now();
    const vertex: DriftVertex = {
      id: `vertex-${++this.counter}`,
      tenantId: 'tenant-1',
      type: String(body.type),
      slug: (body.slug as string | null | undefined) ?? null,
      externalId: (body.externalId as string | null | undefined) ?? null,
      title: (body.title as string | null | undefined) ?? null,
      status: String(body.status ?? 'active'),
      data: (body.data ?? {}) as never,
      metadata: {},
      version: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
    };
    this.vertices.push(vertex);
    return vertex;
  }
  async getVertex(id: string) {
    const item = this.vertices.find((candidate) => candidate.id === id);
    if (!item) throw Object.assign(new Error('missing'), { statusCode: 404 });
    return item;
  }
  async patchVertex(id: string, body: Record<string, unknown>) {
    const item = await this.getVertex(id);
    if (body.version !== item.version)
      throw Object.assign(new Error('conflict'), { statusCode: 409 });
    Object.assign(item, body, { version: item.version + 1, updatedAt: this.now() });
    return item;
  }
  async deleteVertex(id: string, version: number) {
    const item = await this.getVertex(id);
    if (version !== item.version) throw new Error('conflict');
    this.vertices = this.vertices.filter((candidate) => candidate.id !== id);
    this.edges = this.edges.filter((edge) => edge.fromVertexId !== id && edge.toVertexId !== id);
    return item;
  }
  async createEdge(body: Record<string, unknown>) {
    const timestamp = this.now();
    const edge: DriftEdge = {
      id: `edge-${++this.counter}`,
      tenantId: 'tenant-1',
      fromVertexId: String(body.fromVertexId),
      toVertexId: String(body.toVertexId),
      type: String(body.type),
      status: 'active',
      data: {},
      metadata: {},
      version: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
    };
    this.edges.push(edge);
    return edge;
  }
  async deleteEdge(id: string, _version: number) {
    const edge = this.edges.find((candidate) => candidate.id === id)!;
    this.edges = this.edges.filter((candidate) => candidate.id !== id);
    return edge;
  }
  async listEdges(query: { type?: string; fromVertexId?: string; toVertexId?: string }) {
    return this.edges.filter(
      (edge) =>
        (!query.type || edge.type === query.type) &&
        (!query.fromVertexId || edge.fromVertexId === query.fromVertexId) &&
        (!query.toVertexId || edge.toVertexId === query.toVertexId),
    );
  }
  async getOutgoing(id: string, edgeType: string) {
    const edges = this.edges.filter((edge) => edge.fromVertexId === id && edge.type === edgeType);
    return {
      edges,
      vertices: this.vertices.filter((vertex) =>
        edges.some((edge) => edge.toVertexId === vertex.id),
      ),
    };
  }
}

const config: Config = {
  BEACON_HOST: '127.0.0.1',
  BEACON_PORT: 3100,
  BEACON_DATA_PATH: ':memory:',
  BEACON_SESSION_SECRET: 's'.repeat(32),
  BEACON_SETUP_TOKEN: 'setup-token-123456',
  BEACON_SOURCE_TOKEN: 'source-token-123456',
  BEACON_EVENT_TOKEN: 'event-token-1234567',
  DRIFT_URL: 'http://drift.test',
  DRIFT_API_KEY: 'key',
  NODE_ENV: 'test',
};

test('Compactor endpoints resolve exact records and persist exact events', async () => {
  const drift = new MemoryDrift();
  const projections = new ProjectionStore(':memory:');
  const service = new BeaconService(drift, projections);
  const destination = await service.createDestination({
    title: 'Docs',
    url: 'https://docs.example/current',
  });
  const redirect = await service.createRedirect({
    title: 'Docs current',
    slug: 'docs-current',
    sourceUrl: 'HTTPS://GO.EXAMPLE:443/docs?ignored=1',
    destinationId: destination.id,
    status: 'active',
    statusCode: 308,
    responseHeaders: { 'Cache-Control': 'public' },
  });
  const app = await createApp(config, service, projections);
  const found = await app.inject({
    method: 'GET',
    url: '/integrations/compactor/v1/resolve?url=https%3A%2F%2Fgo.example%2Fdocs',
    headers: { authorization: `Bearer ${config.BEACON_SOURCE_TOKEN}` },
  });
  assert.equal(found.statusCode, 200);
  assert.deepEqual(found.json(), {
    id: redirect.id,
    canonical_url: 'https://go.example/docs',
    redirect_url: 'https://docs.example/current',
    status_code: 308,
    response_headers: { 'Cache-Control': 'public' },
  });
  const missing = await app.inject({
    method: 'GET',
    url: '/integrations/compactor/v1/resolve?url=https%3A%2F%2Fgo.example%2Fmissing',
    headers: { authorization: `Bearer ${config.BEACON_SOURCE_TOKEN}` },
  });
  assert.equal(missing.statusCode, 404);
  const payload = {
    event_id: '01K1C6Y7M4T2Q8J3A5N9P0R6VW',
    redirect_id: redirect.id,
    occurred_at: '2026-08-01T00:00:00.000Z',
    duration_ms: 1.2,
    outcome: 'redirected',
    client: { address: null, user_agent: 'test' },
    request: {
      method: 'GET',
      scheme: 'https',
      host: 'go.example',
      path: '/docs',
      query: null,
      protocol: 'HTTP/1.1',
      headers: {},
    },
    response: { status_code: 308, location: 'https://docs.example/current' },
  };
  const ingested = await app.inject({
    method: 'POST',
    url: '/integrations/compactor/v1/events',
    headers: { authorization: `Bearer ${config.BEACON_EVENT_TOKEN}` },
    payload,
  });
  assert.equal(ingested.statusCode, 204);
  const duplicate = await app.inject({
    method: 'POST',
    url: '/integrations/compactor/v1/events',
    headers: { authorization: `Bearer ${config.BEACON_EVENT_TOKEN}` },
    payload,
  });
  assert.equal(duplicate.statusCode, 204);
  assert.deepEqual(projections.events({})[0], payload);
  assert.equal(drift.vertices.filter((vertex) => vertex.type === 'beacon.event').length, 1);
  await app.close();
  projections.close();
});

test('first-run setup closes and creates an authenticated session', async () => {
  const projections = new ProjectionStore(':memory:');
  const app = await createApp(
    config,
    new BeaconService(new MemoryDrift(), projections),
    projections,
  );
  const setup = await app.inject({
    method: 'POST',
    url: '/api/v1/setup',
    payload: {
      setupToken: config.BEACON_SETUP_TOKEN,
      username: 'operator',
      password: 'a-calm-password-123',
    },
  });
  assert.equal(setup.statusCode, 200);
  const repeated = await app.inject({
    method: 'POST',
    url: '/api/v1/setup',
    payload: {
      setupToken: config.BEACON_SETUP_TOKEN,
      username: 'second',
      password: 'another-password-123',
    },
  });
  assert.equal(repeated.statusCode, 409);
  const login = await app.inject({
    method: 'POST',
    url: '/api/v1/session',
    payload: { username: 'operator', password: 'a-calm-password-123' },
  });
  assert.equal(login.statusCode, 200);
  const cookie = login.headers['set-cookie'];
  assert.ok(cookie);
  const session = await app.inject({ method: 'GET', url: '/api/v1/session', headers: { cookie } });
  assert.equal(session.json().authenticated, true);
  await app.close();
  projections.close();
});

test('configured browser origin permits the local development proxy only', async () => {
  const projections = new ProjectionStore(':memory:');
  const app = await createApp(
    { ...config, BEACON_BROWSER_ORIGIN: 'http://localhost:5173' },
    new BeaconService(new MemoryDrift(), projections),
    projections,
  );
  const setup = await app.inject({
    method: 'POST',
    url: '/api/v1/setup',
    headers: { host: '127.0.0.1:3100', origin: 'http://localhost:5173' },
    payload: {
      setupToken: config.BEACON_SETUP_TOKEN,
      username: 'operator',
      password: 'a-calm-password-123',
    },
  });
  assert.equal(setup.statusCode, 200);

  const rejected = await app.inject({
    method: 'POST',
    url: '/api/v1/session',
    headers: { host: '127.0.0.1:3100', origin: 'http://localhost:5174' },
    payload: { username: 'operator', password: 'a-calm-password-123' },
  });
  assert.equal(rejected.statusCode, 403);
  assert.equal(rejected.json().error.code, 'invalid_origin');
  await app.close();
  projections.close();
});

test('integration credentials and unknown event fields are rejected', async () => {
  const projections = new ProjectionStore(':memory:');
  const app = await createApp(
    config,
    new BeaconService(new MemoryDrift(), projections),
    projections,
  );
  assert.equal(
    (
      await app.inject({
        method: 'GET',
        url: '/integrations/compactor/v1/resolve?url=https%3A%2F%2Fgo.example%2F',
      })
    ).statusCode,
    401,
  );
  const response = await app.inject({
    method: 'POST',
    url: '/integrations/compactor/v1/events',
    headers: { authorization: `Bearer ${config.BEACON_EVENT_TOKEN}` },
    payload: { unexpected: true },
  });
  assert.equal(response.statusCode, 400);
  await app.close();
  projections.close();
});
