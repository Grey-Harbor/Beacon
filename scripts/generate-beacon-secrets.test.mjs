import assert from 'node:assert/strict';
import test from 'node:test';

import { generateBeaconSecrets, renderShellExports } from './generate-beacon-secrets.mjs';

test('generates distinct sourceable Beacon credentials', () => {
  const values = [Buffer.alloc(32, 1), Buffer.alloc(32, 2)];
  const secrets = generateBeaconSecrets(() => values.shift());

  assert.match(secrets.sessionSecret, /^[A-Za-z0-9_-]{43}$/);
  assert.match(secrets.setupToken, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(secrets.sessionSecret, secrets.setupToken);

  assert.equal(
    renderShellExports(secrets),
    [
      `export BEACON_SESSION_SECRET=${secrets.sessionSecret}`,
      `export BEACON_SETUP_TOKEN=${secrets.setupToken}`,
      'printf \'%s\\n\' "BEACON_SESSION_SECRET=$BEACON_SESSION_SECRET"',
      'printf \'%s\\n\' "BEACON_SETUP_TOKEN=$BEACON_SETUP_TOKEN"',
      '',
    ].join('\n'),
  );
});
