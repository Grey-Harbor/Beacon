import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { acquireBuildLock, releaseBuildLock } from './build.mjs';

test('build lock rejects a concurrent owner and recovers a stale owner', async (context) => {
  const directory = await mkdtemp(join(tmpdir(), 'beacon-build-lock-'));
  const lockPath = join(directory, 'build.lock');
  context.after(() => rm(directory, { recursive: true, force: true }));

  await writeFile(lockPath, `${process.pid}\n`);
  await assert.rejects(acquireBuildLock(lockPath), /Beacon build already running/);

  await writeFile(lockPath, '99999999\n');
  await acquireBuildLock(lockPath);
  assert.equal(await readFile(lockPath, 'utf8'), `${process.pid}\n`);
  await releaseBuildLock(lockPath);
});
