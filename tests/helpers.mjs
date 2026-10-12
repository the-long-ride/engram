import { existsSync, writeFileSync } from 'node:fs';
import { chmod, mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

// An empty global git config keeps the machine's core.hooksPath and aliases out of every test repo.
// Set on process.env so tests that spawn git without an explicit env are covered too.
const emptyGitConfig = path.join(os.tmpdir(), 'engram-test-empty-gitconfig');
writeFileSync(emptyGitConfig, '');
process.env.GIT_CONFIG_GLOBAL = emptyGitConfig;
process.env.GIT_CONFIG_NOSYSTEM = '1';

export const bin = path.resolve('dist/bin/engram.js');

export function workspaceMemoryRoot(cwd) {
  return path.join(cwd, '.agents', '.engram');
}

const MCP_SHIMS = ['engram-mcp', 'engram-mcp.cmd', 'engram-mcp.exe', 'engram-mcp.bat', 'engram-mcp.ps1'];

/** PATH without any directory that provides `engram-mcp`, so generated MCP configs fall back to npx deterministically. */
export function pathWithoutEngramMcp(pathValue = process.env.PATH ?? process.env.Path ?? '') {
  return pathValue.split(path.delimiter).filter((dir) => dir && !MCP_SHIMS.some((name) => existsSync(path.join(dir, name)))).join(path.delimiter);
}

/** Copy of env with PATH replaced; keeps the env key's original casing (Windows uses `Path`). */
export function withPath(env, pathValue) {
  const key = Object.keys(env).find((name) => name.toLowerCase() === 'path') ?? 'PATH';
  return { ...env, [key]: pathValue };
}

/** Create a temp bin directory holding an executable `engram-mcp` shim and return its path. */
export async function makeEngramMcpBin(root) {
  const dir = path.join(root, 'fake-bin');
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, process.platform === 'win32' ? 'engram-mcp.cmd' : 'engram-mcp');
  await writeFile(file, process.platform === 'win32' ? '@echo off\r\n' : '#!/bin/sh\nexit 0\n');
  await chmod(file, 0o755);
  return dir;
}

export async function tempWorkspace(prefix = 'engram-test-') {
  const cwd = await mkdtemp(path.join(os.tmpdir(), prefix));
  return { cwd, env: { ...withPath(process.env, pathWithoutEngramMcp()), NODE_ENV: 'test', ENGRAM_CONFIG_DIR: path.join(cwd, 'user-config'), ENGRAM_GLOBAL_DIR: path.join(cwd, 'global'), GIT_CONFIG_COUNT: '2', GIT_CONFIG_KEY_0: 'user.name', GIT_CONFIG_VALUE_0: 'Engram Test', GIT_CONFIG_KEY_1: 'user.email', GIT_CONFIG_VALUE_1: 'engram-test@example.com' } };
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
