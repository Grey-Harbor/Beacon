import assert from 'node:assert/strict';
import test from 'node:test';
import type { CompactorEvent, RedirectResource } from '@beacon/shared';
import { ProjectionStore } from '../src/projections.js';

const redirect: RedirectResource = {
  id: 'redirect-1',
  title: 'Current documentation',
  slug: 'docs-current',
  sourceUrl: 'https://go.example/docs',
  status: 'active',
  statusCode: 308,
  responseHeaders: {},
  destination: {
    id: 'destination-1',
    title: 'Documentation',
    url: 'https://docs.example/current',
    version: 1,
    updatedAt: '2026-08-01T00:00:00.000Z',
  },
  version: 1,
  updatedAt: '2026-08-01T00:00:00.000Z',
};

const event: CompactorEvent = {
  event_id: '01K1C6Y7M4T2Q8J3A5N9P0R6VW',
  redirect_id: 'redirect-1',
  occurred_at: '2026-08-01T00:00:00.000Z',
  duration_ms: 1.2,
  outcome: 'redirected',
  client: { address: null, user_agent: null },
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

test('search and resolution projections update together', () => {
  const store = new ProjectionStore(':memory:');
  store.upsertRedirect(redirect);
  assert.equal(store.findResolution(redirect.sourceUrl), redirect.id);
  assert.equal(store.search('documentation')[0]?.id, redirect.id);

  store.upsertRedirect({ ...redirect, status: 'disabled' });
  assert.equal(store.findResolution(redirect.sourceUrl), null);
  store.close();
});

test('event projection is idempotent and reportable', () => {
  const store = new ProjectionStore(':memory:');
  store.addEvent(event);
  store.addEvent(event);
  assert.equal(store.events({}).length, 1);
  assert.deepEqual(store.report(), [
    {
      redirectId: 'redirect-1',
      redirected: 1,
      notFound: 0,
      invalidRequest: 0,
      sourceError: 0,
      total: 1,
    },
  ]);
  store.close();
});
