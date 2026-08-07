import assert from 'node:assert/strict';
import test from 'node:test';

import { loadConfig } from '../src/config.js';

const environment = {
  BEACON_SESSION_SECRET: 's'.repeat(32),
  BEACON_SETUP_TOKEN: 'setup-token-123456',
  BEACON_SOURCE_TOKEN: 'source-token-123456',
  BEACON_EVENT_TOKEN: 'event-token-1234567',
  DRIFT_URL: 'http://drift.test',
  DRIFT_API_KEY: 'key',
};

test('validates the configured browser origin', () => {
  assert.equal(
    loadConfig({ ...environment, BEACON_BROWSER_ORIGIN: 'http://localhost:5173' })
      .BEACON_BROWSER_ORIGIN,
    'http://localhost:5173',
  );

  assert.throws(() =>
    loadConfig({ ...environment, BEACON_BROWSER_ORIGIN: 'https://beacon.example.com/setup' }),
  );
});
