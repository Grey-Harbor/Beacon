import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import test from 'node:test';

const execute = promisify(execFile);
const variables = [
  'BEACON_SESSION_SECRET',
  'BEACON_SETUP_TOKEN',
  'BEACON_SOURCE_TOKEN',
  'BEACON_EVENT_TOKEN',
];

test('generates and prints sourceable Beacon credentials', async () => {
  const { stdout } = await execute('sh', ['-c', '. scripts/generate-beacon-secrets.sh']);
  const lines = stdout.trim().split('\n');

  assert.equal(lines.length, variables.length);
  const generated = lines.map((line, index) => {
    const [name, value] = line.split('=', 2);
    assert.equal(name, variables[index]);
    assert.ok(/^[A-Za-z0-9_-]{43}$/.test(value));
    return value;
  });
  assert.equal(new Set(generated).size, generated.length);
});

test('exports generated credentials to the sourcing shell', async () => {
  const command = [
    '. scripts/generate-beacon-secrets.sh >/dev/null',
    ...variables.map((variable) => `test ${`\${#${variable}}`} -eq 43`),
  ].join('; ');

  await execute('sh', ['-c', command]);
});
