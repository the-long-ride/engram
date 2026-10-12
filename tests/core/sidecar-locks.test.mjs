import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readdir, readFile, rm, utimes, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import { withFileLock } from '../../dist/core/system/fsx.js';
import { SCOPE_GITIGNORE } from '../../dist/core/memory/scope-gitignore.js';
import { runEngram, tempWorkspace, workspaceMemoryRoot } from '../helpers.mjs';

const moduleUrl = (rel) => pathToFileURL(path.resolve('dist', rel)).href;

/** Run `count` node children of one ESM script at once; each gets its index as argv[1]. */
function runChildren(count, script, env = process.env, cwd = process.cwd()) {
  return Promise.all(Array.from({ length: count }, (_, index) => new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, ['--input-type=module', '-e', script, String(index)], { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (chunk) => { stdout += chunk; });
    proc.stderr.on('data', (chunk) => { stderr += chunk; });
    proc.on('close', (code) => (code === 0 ? resolve(stdout.trim()) : reject(new Error(stderr))));
  })));
}

test('withFileLock serializes, releases in finally, and breaks a stale lock', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'engram-lock-'));
  const file = path.join(root, 'state.json');
  let inside = 0;
  let maxInside = 0;
  await Promise.all(Array.from({ length: 6 }, () => withFileLock(file, async () => {
    inside += 1;
    maxInside = Math.max(maxInside, inside);
    await new Promise((resolve) => setTimeout(resolve, 5));
    inside -= 1;
  })));
  assert.equal(maxInside, 1, 'only one holder at a time');
  await assert.rejects(withFileLock(file, async () => { throw new Error('boom'); }), /boom/);
  assert.equal(existsSync(`${file}.lock`), false, 'a throwing body still releases the lock');

  await writeFile(`${file}.lock`, 'dead-process');
  const old = new Date(Date.now() - 60_000);
  await utimes(`${file}.lock`, old, old);
  assert.equal(await withFileLock(file, async () => 'ran', { timeoutMs: 500, staleMs: 10_000 }), 'ran');
  assert.equal(existsSync(`${file}.lock`), false);

  await writeFile(`${file}.lock`, 'live-process');
  await assert.rejects(withFileLock(file, async () => 'never', { timeoutMs: 100, staleMs: 10_000 }), /lock/i);
  assert.equal(await readFile(`${file}.lock`, 'utf8'), 'live-process', 'a fresh foreign lock is never removed');
  await rm(root, { recursive: true, force: true });
});

test('scope .gitignore covers sidecar lock files', () => {
  assert.match(SCOPE_GITIGNORE, /^\*\.json\.lock$/mu);
});

test('parallel processes writing distinct hook sessions keep every record', async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), 'engram-hook-lock-'));
  await mkdir(path.join(cwd, '.agents', '.engram'), { recursive: true });
  const script = `const { writeSession } = await import(${JSON.stringify(moduleUrl('core/integrations/hook-session.js'))});
await writeSession(${JSON.stringify(cwd)}, 'session-' + process.argv[1], ['workspace:knowledge/k' + process.argv[1] + '.md']);`;
  await runChildren(10, script);
  const cache = JSON.parse(await readFile(path.join(cwd, '.agents', '.engram', 'agent-hook-cache.json'), 'utf8'));
  const missing = Array.from({ length: 10 }, (_, i) => `session-${i}`).filter((key) => !cache.records[key]);
  assert.deepEqual(missing, [], `lost hook sessions: ${missing.join(', ')}`);
  assert.deepEqual((await readdir(path.join(cwd, '.agents', '.engram'))).filter((name) => name.endsWith('.lock')), []);
  await rm(cwd, { recursive: true, force: true });
});

test('parallel recordUsage processes on distinct keys lose no keys', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'engram-usage-lock-'));
  const script = `const { recordUsage } = await import(${JSON.stringify(moduleUrl('core/memory/usage.js'))});
for (let n = 0; n < 5; n += 1) await recordUsage(${JSON.stringify(root)}, ['workspace:knowledge/p' + process.argv[1] + '-' + n + '.md'], 'injected');`;
  await runChildren(8, script);
  const usage = JSON.parse(await readFile(path.join(root, 'usage.json'), 'utf8'));
  const expected = Array.from({ length: 8 }, (_, p) => Array.from({ length: 5 }, (_, n) => `workspace:knowledge/p${p}-${n}.md`)).flat();
  const lost = expected.filter((key) => !usage[key]);
  assert.deepEqual(lost, [], `lost usage keys: ${lost.length}`);
  await rm(root, { recursive: true, force: true });
});

test('concurrent redeems of one approval token: exactly one succeeds', async () => {
  const { cwd, env } = await tempWorkspace('engram-token-lock-');
  const home = path.join(cwd, 'home');
  const childEnv = { ...env, HOME: home, USERPROFILE: home };
  const inject = await runEngram(cwd, childEnv, ['inject', '--no-skillset']);
  assert.equal(inject.code, 0, inject.stderr);
  const tokens = moduleUrl('mcp/approval-tokens.js');
  const [token] = await runChildren(1, `const { issueToken } = await import(${JSON.stringify(tokens)});
console.log(await issueToken(process.cwd(), [{ type: 'knowledge', text: 'Concurrent redeem probe memory text.' }], 'workspace'));`, childEnv, cwd);
  assert.ok(token);
  const results = await runChildren(6, `const { redeemToken } = await import(${JSON.stringify(tokens)});
const result = await redeemToken(process.cwd(), ${JSON.stringify(token)});
console.log('error' in result ? result.error : 'ok');`, childEnv, cwd);
  assert.equal(results.filter((item) => item === 'ok').length, 1, `results: ${results.join(',')}`);
  assert.ok(results.filter((item) => item !== 'ok').every((item) => item === 'used'));
  assert.equal(existsSync(path.join(workspaceMemoryRoot(cwd), 'pending-approvals.json.lock')), false);
  await rm(cwd, { recursive: true, force: true });
});
