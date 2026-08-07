import assert from 'node:assert/strict';
import test from 'node:test';

import { generateBeaconSecrets, renderShellExports } from './generate-beacon-secrets.mjs';

test('generates distinct sourceable Beacon credentials', () => {
  const values = [
    Buffer.alloc(32, 1),
    Buffer.alloc(32, 2),
    Buffer.alloc(32, 3),
    Buffer.alloc(32, 4),
  ];
  const secrets = generateBeaconSecrets(() => values.shift());

  const generated = [
    secrets.sessionSecret,
    secrets.setupToken,
    secrets.sourceToken,
    secrets.eventToken,
  ];
  for (const value of generated) assert.match(value, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(new Set(generated).size, generated.length);

  assert.equal(
    renderShellExports(secrets),
    [
      `export BEACON_SESSION_SECRET=${secrets.sessionSecret}`,
      `export BEACON_SETUP_TOKEN=${secrets.setupToken}`,
      `export BEACON_SOURCE_TOKEN=${secrets.sourceToken}`,
      `export BEACON_EVENT_TOKEN=${secrets.eventToken}`,
      'printf \'%s\\n\' "BEACON_SESSION_SECRET=$BEACON_SESSION_SECRET"',
      'printf \'%s\\n\' "BEACON_SETUP_TOKEN=$BEACON_SETUP_TOKEN"',
      'printf \'%s\\n\' "BEACON_SOURCE_TOKEN=$BEACON_SOURCE_TOKEN"',
      'printf \'%s\\n\' "BEACON_EVENT_TOKEN=$BEACON_EVENT_TOKEN"',
      '',
    ].join('\n'),
  );
});
