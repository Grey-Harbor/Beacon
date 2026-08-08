import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  acquireBuildLock,
  assertNoDevelopmentServer,
  cleanGeneratedOutput,
  releaseBuildLock,
} from './build.mjs';

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

test('build cleanup removes generated output and preserves other files', async (context) => {
  const directory = await mkdtemp(join(tmpdir(), 'beacon-build-clean-'));
  const generated = [join(directory, '.next'), join(directory, 'out'), join(directory, 'dist')];
  const preserved = join(directory, 'source.ts');
  context.after(() => rm(directory, { recursive: true, force: true }));
  await Promise.all(generated.map((path) => mkdir(path)));
  await writeFile(preserved, 'source');

  await cleanGeneratedOutput(generated);

  await Promise.all(generated.map((path) => assert.rejects(access(path))));
  assert.equal(await readFile(preserved, 'utf8'), 'source');
});

test('build cleanup refuses to remove an active development directory', async (context) => {
  const directory = await mkdtemp(join(tmpdir(), 'beacon-dev-lock-'));
  const devLock = join(directory, 'lock');
  context.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(devLock, JSON.stringify({ pid: process.pid }));

  await assert.rejects(assertNoDevelopmentServer(devLock), /development server is running/);
});
