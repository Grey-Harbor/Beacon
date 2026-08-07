import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const SECRET_BYTES = 32;

export function generateBeaconSecrets(random = randomBytes) {
  return {
    sessionSecret: random(SECRET_BYTES).toString('base64url'),
    setupToken: random(SECRET_BYTES).toString('base64url'),
    sourceToken: random(SECRET_BYTES).toString('base64url'),
    eventToken: random(SECRET_BYTES).toString('base64url'),
  };
}

export function renderShellExports({ sessionSecret, setupToken, sourceToken, eventToken }) {
  return [
    `export BEACON_SESSION_SECRET=${sessionSecret}`,
    `export BEACON_SETUP_TOKEN=${setupToken}`,
    `export BEACON_SOURCE_TOKEN=${sourceToken}`,
    `export BEACON_EVENT_TOKEN=${eventToken}`,
    'printf \'%s\\n\' "BEACON_SESSION_SECRET=$BEACON_SESSION_SECRET"',
    'printf \'%s\\n\' "BEACON_SETUP_TOKEN=$BEACON_SETUP_TOKEN"',
    'printf \'%s\\n\' "BEACON_SOURCE_TOKEN=$BEACON_SOURCE_TOKEN"',
    'printf \'%s\\n\' "BEACON_EVENT_TOKEN=$BEACON_EVENT_TOKEN"',
    '',
  ].join('\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.stdout.write(renderShellExports(generateBeaconSecrets()));
}
