import { readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const lockPath = resolve(root, '.beacon-build.lock');
const workspaces = ['@beacon/shared', '@beacon/server', '@beacon/web'];

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  await main();
}

async function main() {
  try {
    await acquireBuildLock(lockPath);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }

  try {
    for (const workspace of workspaces) {
      const status = await runNpm(['run', 'build', '-w', workspace]);
      if (status !== 0) process.exitCode = status;
      if (status !== 0) break;
    }
  } finally {
    await releaseBuildLock(lockPath);
  }
}

export async function acquireBuildLock(path, attempt = 0) {
  try {
    await writeFile(path, `${process.pid}\n`, { flag: 'wx' });
    return;
  } catch (error) {
    if (!isAlreadyExists(error)) throw error;
  }

  const owner = Number.parseInt(await readFile(path, 'utf8').catch(() => ''), 10);
  if (!Number.isInteger(owner) && attempt < 5) {
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 50));
    return acquireBuildLock(path, attempt + 1);
  }
  if (Number.isInteger(owner) && isProcessRunning(owner)) {
    throw new Error(
      `Beacon build already running (PID ${owner}). Wait for it to finish before running npm run build again.`,
    );
  }

  await releaseBuildLock(path);
  return acquireBuildLock(path);
}

export async function releaseBuildLock(path) {
  await rm(path, { force: true });
}

function isAlreadyExists(error) {
  return Boolean(error && typeof error === 'object' && error.code === 'EEXIST');
}

function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return Boolean(error && typeof error === 'object' && error.code === 'EPERM');
  }
}

function runNpm(args) {
  const npmCli = process.env.npm_execpath;
  if (!npmCli) throw new Error('npm_execpath is unavailable; run this build through npm.');
  return new Promise((resolveStatus, reject) => {
    const child = spawn(process.execPath, [npmCli, ...args], {
      cwd: root,
      env: process.env,
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => resolveStatus(code ?? (signal ? 1 : 0)));
  });
}
