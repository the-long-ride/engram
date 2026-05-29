import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

export const bin = path.resolve('dist/bin/engram.js');

export function workspaceMemoryRoot(cwd) {
  return path.join(cwd, '.agents', '.engram');
}

export async function tempWorkspace(prefix = 'engram-test-') {
  const cwd = await mkdtemp(path.join(os.tmpdir(), prefix));
  return { cwd, env: { ...process.env, ENGRAM_CONFIG_DIR: path.join(cwd, 'user-config'), ENGRAM_GLOBAL_DIR: path.join(cwd, 'global') } };
}

export function runEngram(cwd, env, args, input = '') {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [bin, ...args], { cwd, env });
    let stdout = '', stderr = '';
    child.stdout.on('data', (d) => stdout += d);
    child.stderr.on('data', (d) => stderr += d);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
    if (input) child.stdin.write(input);
    child.stdin.end();
  });
}

export function initGit(cwd) {
  return spawnSync('git', ['init'], { cwd, encoding: 'utf8' });
}
