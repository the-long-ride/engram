import test from 'node:test';
import assert from 'node:assert/strict';
import { link, mkdir, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { initGit, runEngram, tempWorkspace, workspaceMemoryRoot } from '../helpers.mjs';
import { sourceDigestHash } from '../../dist/core/memory/freshness.js';

const SECRET = 'sk-live-FRESHNESS0123456789abcdef';
const BILLING = [
  "import { ledger } from './ledger';",
  '',
  '/** Billing export entry point. */',
  'export function exportInvoices(month: string): number {',
  `  const token = "${SECRET}";`,
  '  return ledger(month, token).length;',
  '}',
  ''
].join('\n');
const BILLING_TEXT = 'Billing exports invoices per month through exportInvoices in the ledger';
const OTHER_TEXT = 'Billing invoices export retries failed billing invoices export jobs three times';
const QUERY = 'billing invoices export';

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

function staleFile(cwd) {
  return path.join(workspaceMemoryRoot(cwd), 'stale.json');
}

async function memoryFiles(cwd) {
  const dir = path.join(workspaceMemoryRoot(cwd), 'knowledge');
  return (await readdir(dir)).filter((name) => name.endsWith('.md'));
}

/** A workspace with one approved take-control memory digested from src/billing.ts (code kind). */
async function codeWorkspace(prefix) {
  const { cwd, env } = await tempWorkspace(prefix);
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  await mkdir(path.join(cwd, 'src'), { recursive: true });
  await writeFile(path.join(cwd, 'src', 'billing.ts'), BILLING);
  const saved = await runEngram(cwd, env, ['take-control', '--kind', 'code', '--file', 'src/billing.ts', '--scope', 'workspace', `TYPE: knowledge | TEXT: ${BILLING_TEXT}`], 'A\n');
  assert.equal(saved.code, 0, saved.stderr);
  const [file] = await memoryFiles(cwd);
  assert.ok(file, saved.stdout);
  return { cwd, env, id: file.replace(/\.md$/, ''), key: `workspace:knowledge/${file}`, file: path.join(workspaceMemoryRoot(cwd), 'knowledge', file) };
}

test('code take-control records digest source hashes; signature edits mark the memory stale, whitespace edits do not', async () => {
  const { cwd, env, id, key, file } = await codeWorkspace('engram-fresh-code-');
  const raw = await readFile(file, 'utf8');
  assert.match(raw, /^source: take-control$/m);
  assert.match(raw, /^source_hash_mode: digest$/m);
  const digest = sourceDigestHash('src/billing.ts', BILLING, 'code');
  assert.ok(digest && raw.includes(digest), 'source_hashes records the digest-text hash');
  assert.ok(!raw.includes(sha256(BILLING)), 'code sources do not record the raw-file hash');

  // A second memory makes the billing one render as a card once load.expand_top is 1.
  const other = await runEngram(cwd, env, ['save', 'knowledge', OTHER_TEXT, '--scope', 'workspace'], 'A\n');
  assert.equal(other.code, 0, other.stderr);
  assert.equal((await memoryFiles(cwd)).length, 2, other.stdout);
  const configFile = path.join(workspaceMemoryRoot(cwd), 'engram.config.json');
  const config = JSON.parse(await readFile(configFile, 'utf8'));
  await writeFile(configFile, JSON.stringify({ ...config, load: { ...config.load, expand_top: 1 } }, null, 2));
  const before = await runEngram(cwd, env, ['load', QUERY]);
  assert.equal(before.code, 0, before.stderr);
  assert.match(before.stdout, new RegExp(`^- ${id} \\[knowledge\\] `, 'm'));

  const clean = await runEngram(cwd, env, ['verify', '--sources']);
  assert.equal(clean.code, 0, clean.stdout + clean.stderr);
  assert.match(clean.stdout, /No stale memories/);
  assert.equal(existsSync(staleFile(cwd)), false, 'nothing stale writes no stale.json');
  const unchanged = await runEngram(cwd, env, ['load', QUERY]);
  assert.equal(unchanged.stdout, before.stdout, 'load output is byte-identical without stale.json');
  assert.doesNotMatch(unchanged.stdout, /\(stale\)/);

  // Whitespace-only edit: blank lines, re-indented body, trailing spaces.
  await writeFile(path.join(cwd, 'src', 'billing.ts'), BILLING.replace('  return', '\n\n      return').replace('number {', 'number {   ').replace(/\n/g, '\r\n'));
  const whitespace = await runEngram(cwd, env, ['verify', '--sources']);
  assert.equal(whitespace.code, 0, whitespace.stdout + whitespace.stderr);
  assert.match(whitespace.stdout, /No stale memories/);
  assert.equal(existsSync(staleFile(cwd)), false);

  await writeFile(path.join(cwd, 'src', 'billing.ts'), BILLING.replace('exportInvoices(month: string)', 'exportInvoices(month: string, currency: string)'));
  const stale = await runEngram(cwd, env, ['verify', '--sources']);
  assert.equal(stale.code, 0, 'stale sources never fail verify');
  assert.match(stale.stdout, new RegExp(`STALE ${key.replace(/\./g, '\\.')}`));
  assert.match(stale.stdout, /src\/billing\.ts/);
  assert.deepEqual(JSON.parse(await readFile(staleFile(cwd), 'utf8')), { [key]: ['src/billing.ts'] });
  const json = await runEngram(cwd, env, ['verify', '--sources', '--json']);
  assert.equal(json.code, 0, json.stderr);
  const data = JSON.parse(json.stdout).data;
  assert.deepEqual(data.sources.stale, { [key]: ['src/billing.ts'] });
  assert.equal(data.sources.stale_count, 1);
  assert.equal(data.mismatches, 0);

  const loaded = await runEngram(cwd, env, ['load', QUERY]);
  assert.equal(loaded.code, 0, loaded.stderr);
  assert.match(loaded.stdout, new RegExp(`^- ${id} \\[knowledge\\] .+ \\(stale\\)$`, 'm'));
  const loadedJson = JSON.parse((await runEngram(cwd, env, ['load', QUERY, '--json'])).stdout).data;
  assert.equal(loadedJson.cards.find((card) => card.id === id)?.stale, true);

  for (const output of [stale.stdout, json.stdout, loaded.stdout, await readFile(staleFile(cwd), 'utf8')]) {
    assert.ok(!output.includes(SECRET), 'no secret value in freshness output');
  }
  await rm(cwd, { recursive: true, force: true });
});

test('take-control --refresh proposes exactly one UPDATE per stale memory and an approved update clears it', async () => {
  const { cwd, env, id, key, file } = await codeWorkspace('engram-fresh-refresh-');
  const nothing = await runEngram(cwd, env, ['take-control', '--refresh', '--dry-run']);
  assert.equal(nothing.code, 0, nothing.stderr);
  assert.match(nothing.stdout, /No stale memories/);
  assert.doesNotMatch(nothing.stdout, /UPDATE:/);

  const changed = BILLING.replace('exportInvoices(month: string)', 'exportInvoices(month: string, currency: string)');
  await writeFile(path.join(cwd, 'src', 'billing.ts'), changed);
  assert.equal((await runEngram(cwd, env, ['verify', '--sources'])).code, 0);
  const guidance = await runEngram(cwd, env, ['take-control', '--refresh', '--dry-run']);
  assert.equal(guidance.code, 0, guidance.stderr);
  assert.equal(guidance.stdout.split(`UPDATE: ${id}`).length - 1, 1, guidance.stdout);
  assert.equal((guidance.stdout.match(/UPDATE: /g) ?? []).length, 1);
  assert.match(guidance.stdout, /exportInvoices\(month: string, currency: string\)/);
  assert.ok(!guidance.stdout.includes(SECRET), 'the refresh pack is a digest, never the raw body');

  const rejected = await runEngram(cwd, env, ['take-control', '--refresh', '--scope', 'workspace', 'TYPE: knowledge | TEXT: Unrelated new fact about deploy windows'], 'A\n');
  assert.equal(rejected.code, 0, rejected.stderr);
  assert.match(rejected.stdout, /No file written/);
  assert.match(rejected.stdout, /Candidate 1: take-control --refresh accepts only UPDATE candidates for stale memories/);
  assert.equal((await memoryFiles(cwd)).length, 1, 'a skipped refresh candidate writes nothing');

  // A non-UPDATE candidate is skipped and listed; the UPDATE in the same batch is still written.
  const batch = [
    `TYPE: knowledge | TEXT: Billing exports invoices per month and currency through exportInvoices | UPDATE: ${id}`,
    'TYPE: knowledge | TEXT: Unrelated new fact about deploy windows'
  ].join('\n');
  const updated = await runEngram(cwd, env, ['take-control', '--refresh', '--scope', 'workspace', batch], 'A\n');
  assert.equal(updated.code, 0, updated.stderr);
  assert.match(updated.stdout, /Update existing memory/);
  assert.match(updated.stdout, /Refresh candidates skipped \(not written\):\nCandidate 2: take-control --refresh accepts only UPDATE/);
  assert.equal((await memoryFiles(cwd)).length, 1);
  const raw = await readFile(file, 'utf8');
  assert.match(raw, /^revision: 2$/m);
  assert.ok(raw.includes(sourceDigestHash('src/billing.ts', changed, 'code')), 'refresh records the new digest hash');
  assert.equal(existsSync(staleFile(cwd)), false, 'the applied update clears its stale.json entry');
  const verified = await runEngram(cwd, env, ['verify', '--sources']);
  assert.match(verified.stdout, /No stale memories/);
  assert.doesNotMatch(verified.stdout, /STALE /);
  assert.ok(!(await runEngram(cwd, env, ['load', 'billing invoices currency'])).stdout.includes('(stale)'));
  await rm(cwd, { recursive: true, force: true });
});

test('a deleted source reports missing, docs memories use raw hashes, and stale.json stays gitignored', async () => {
  const { cwd, env, key } = await codeWorkspace('engram-fresh-missing-');
  initGit(cwd);
  await mkdir(path.join(cwd, 'notes'), { recursive: true });
  const notes = 'Release notes are written in the release channel before deploy.\n';
  await writeFile(path.join(cwd, 'notes', 'release.md'), notes);
  const docs = await runEngram(cwd, env, ['take-control', '--file', 'notes/release.md', '--scope', 'workspace', 'TYPE: knowledge | TEXT: Release notes go to the release channel before each deploy'], 'A\n');
  assert.equal(docs.code, 0, docs.stderr);
  const docsFile = (await memoryFiles(cwd)).find((name) => name.startsWith('release-notes'));
  const docsRaw = await readFile(path.join(workspaceMemoryRoot(cwd), 'knowledge', docsFile), 'utf8');
  assert.doesNotMatch(docsRaw, /^source_hash_mode:/m, 'docs memories keep today\'s frontmatter');
  assert.ok(docsRaw.includes(sha256(notes)));

  await rm(path.join(cwd, 'src', 'billing.ts'));
  await writeFile(path.join(cwd, 'notes', 'release.md'), `${notes}\n`);
  const result = await runEngram(cwd, env, ['verify', '--sources']);
  assert.equal(result.code, 0, result.stdout + result.stderr);
  assert.deepEqual(JSON.parse(await readFile(staleFile(cwd), 'utf8')), {
    [key]: ['missing: src/billing.ts'],
    [`workspace:knowledge/${docsFile}`]: ['notes/release.md']
  });

  const ignored = spawnSync('git', ['check-ignore', '-q', staleFile(cwd)], { cwd, encoding: 'utf8' });
  assert.equal(ignored.status, 0, 'stale.json must be gitignored');
  assert.match(await readFile(path.join(workspaceMemoryRoot(cwd), '.gitignore'), 'utf8'), /^stale\.json$/m);
  spawnSync('git', ['add', '-A'], { cwd, encoding: 'utf8' });
  const staged = spawnSync('git', ['diff', '--cached', '--name-only'], { cwd, encoding: 'utf8' }).stdout;
  assert.doesNotMatch(staged, /stale\.json/);
  await rm(cwd, { recursive: true, force: true });
});

test('source_files outside the workspace are rejected, never read', async () => {
  const { cwd: parent, env } = await tempWorkspace('engram-fresh-traversal-');
  const cwd = path.join(parent, 'ws');
  await mkdir(path.join(cwd, 'notes'), { recursive: true });
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  await mkdir(path.join(parent, 'outside'), { recursive: true });
  await writeFile(path.join(parent, 'outside.txt'), `Outside secret ${SECRET}\n`);
  await writeFile(path.join(parent, 'outside', 'leak.md'), `Outside secret ${SECRET}\n`);
  await writeFile(path.join(cwd, 'notes', 'team.md'), 'The team ships on Tuesdays.\n');
  // In-workspace files the take-control size/binary guards refuse; freshness must not read them either.
  await writeFile(path.join(cwd, 'notes', 'big.md'), `${'large line of notes\n'.repeat(14000)}`);
  await writeFile(path.join(cwd, 'notes', 'blob.md'), Buffer.from([0x61, 0x00, 0x62]));
  // A directory link inside the workspace that leaves it: a junction on Windows (no privilege needed), a symlink elsewhere.
  const linked = await symlink(path.join(parent, 'outside'), path.join(cwd, 'notes', 'linked'), 'junction').then(() => true, () => false);
  const saved = await runEngram(cwd, env, ['take-control', '--file', 'notes/team.md', '--scope', 'workspace', 'TYPE: knowledge | TEXT: The team ships releases every Tuesday afternoon'], 'A\n');
  assert.equal(saved.code, 0, saved.stderr);
  const [name] = await memoryFiles(cwd);
  const file = path.join(workspaceMemoryRoot(cwd), 'knowledge', name);
  const raw = await readFile(file, 'utf8');
  // The stored hash matches nothing, so reading any of these paths would mark the memory stale.
  const paths = ['../outside.txt', '/etc/passwd', 'C:/Windows/win.ini', 'notes/big.md', 'notes/blob.md', ...(linked ? ['notes/linked/leak.md'] : [])];
  const tampered = raw
    .replace(/^source_files:[\s\S]*?(?=^source_hashes:)/m, `source_files:\n${paths.map((item) => `  - "${item}"\n`).join('')}`)
    .replace(/^source_hashes:[\s\S]*?(?=^\S)/m, `source_hashes:\n  - ${sha256('not any of these files')}\n`);
  assert.notEqual(tampered, raw);
  await writeFile(file, tampered);
  assert.equal((await runEngram(cwd, env, ['rehash', 'workspace'])).code, 0);
  const result = await runEngram(cwd, env, ['verify', '--sources']);
  assert.equal(result.code, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /\.\.\/outside\.txt: path outside the workspace/);
  assert.match(result.stdout, /\/etc\/passwd: path outside the workspace/);
  assert.match(result.stdout, /C:\/Windows\/win\.ini: path outside the workspace/);
  assert.match(result.stdout, /notes\/big\.md: larger than 256 KB/);
  assert.match(result.stdout, /notes\/blob\.md: binary file/);
  assert.ok(linked, 'a directory junction or symlink could be created');
  assert.match(result.stdout, /notes\/linked\/leak\.md: path outside the workspace/);
  assert.ok(!result.stdout.includes(SECRET));
  assert.equal(existsSync(staleFile(cwd)), false, 'rejected paths are never read, so nothing is marked stale');
  await rm(parent, { recursive: true, force: true });
});

test('global memories are checked and refreshed only in their origin workspace, and forced refreshes keep the scope guard', async () => {
  const { cwd: parent, env } = await tempWorkspace('engram-fresh-global-');
  const cwd = path.join(parent, 'ws');
  const elsewhere = path.join(parent, 'other');
  for (const dir of [cwd, elsewhere]) {
    await mkdir(path.join(dir, 'src'), { recursive: true });
    await runEngram(dir, env, ['inject', '--no-skillset']);
  }
  await writeFile(path.join(cwd, 'src', 'billing.ts'), BILLING);
  // The other workspace has a different file at the same relative path; it must never be compared or read.
  const otherBilling = BILLING.replace('exportInvoices', 'exportOther');
  await writeFile(path.join(elsewhere, 'src', 'billing.ts'), otherBilling);
  const saved = await runEngram(cwd, env, ['take-control', '--kind', 'code', '--file', 'src/billing.ts', '--scope', 'global', `TYPE: knowledge | TEXT: ${BILLING_TEXT}`], 'A\n');
  assert.equal(saved.code, 0, saved.stderr);
  const [name] = (await readdir(path.join(env.ENGRAM_GLOBAL_DIR, 'knowledge'))).filter((item) => item.endsWith('.md'));
  const key = `global:knowledge/${name}`;
  const globalFile = path.join(env.ENGRAM_GLOBAL_DIR, 'knowledge', name);
  const globalRaw = await readFile(globalFile, 'utf8');
  assert.match(globalRaw, /^source_origin: [0-9a-f]{64}$/m, 'a global take-control memory records its origin fingerprint');
  for (const raw of [cwd, cwd.replace(/\\/g, '/'), path.basename(parent)]) assert.ok(!globalRaw.includes(raw), 'never the workspace path itself');

  const other = await runEngram(elsewhere, env, ['verify', '--sources', '--json']);
  assert.equal(other.code, 0, other.stderr);
  const otherData = JSON.parse(other.stdout).data.sources;
  assert.deepEqual(otherData.stale, {});
  assert.deepEqual(otherData.skipped, [{ key, reason: 'global memory from another workspace' }]);
  assert.equal(existsSync(staleFile(elsewhere)), false, 'a different same-named source does not make it stale elsewhere');
  // Even a stale.json naming it does not let another workspace replace its sources.
  await writeFile(staleFile(elsewhere), JSON.stringify({ [key]: ['src/billing.ts'] }));
  const otherRefresh = await runEngram(elsewhere, env, ['take-control', '--refresh', '--dry-run']);
  assert.match(otherRefresh.stdout, /No stale memories/);
  assert.ok(!otherRefresh.stdout.includes('exportOther'));
  const otherLoad = await runEngram(elsewhere, env, ['load', QUERY]);
  assert.equal(otherLoad.code, 0, otherLoad.stderr);
  await rm(staleFile(elsewhere));

  await writeFile(path.join(cwd, 'src', 'billing.ts'), BILLING.replace('(month: string)', '(month: string, currency: string)'));
  const here = await runEngram(cwd, env, ['verify', '--sources']);
  assert.equal(here.code, 0, here.stderr);
  assert.deepEqual(JSON.parse(await readFile(staleFile(cwd), 'utf8')), { [key]: ['src/billing.ts'] });
  assert.equal(existsSync(path.join(env.ENGRAM_GLOBAL_DIR, 'stale.json')), false, 'freshness state lives in the workspace, never in global memory');
  assert.doesNotMatch(spawnSync('git', ['ls-files'], { cwd: env.ENGRAM_GLOBAL_DIR, encoding: 'utf8' }).stdout, /stale\.json/);
  const guidance = await runEngram(cwd, env, ['take-control', '--refresh', '--dry-run']);
  assert.equal((guidance.stdout.match(/UPDATE: /g) ?? []).length, 1, 'the origin workspace can refresh it');

  const id = name.replace(/\.md$/, '');
  const forced = await runEngram(cwd, env, ['take-control', '--refresh', '--force', '--scope', 'workspace', `TYPE: knowledge | TEXT: Billing exports invoices per month and currency | UPDATE: ${id}`]);
  assert.equal(forced.code, 0, forced.stderr);
  assert.match(forced.stdout, /No file written/);
  assert.match(forced.stdout, /requests SCOPE: global outside command scope workspace/);
  assert.match(await readFile(globalFile, 'utf8'), /^revision: 1$/m);

  // An older global memory without an origin is skipped everywhere, never read.
  await writeFile(globalFile, (await readFile(globalFile, 'utf8')).replace(/^source_origin: .*\n/m, ''));
  assert.equal((await runEngram(cwd, env, ['rehash', 'global'])).code, 0);
  const legacy = JSON.parse((await runEngram(cwd, env, ['verify', '--sources', '--json'])).stdout).data.sources;
  assert.deepEqual(legacy.stale, {});
  assert.deepEqual(legacy.skipped, [{ key, reason: 'global memory without origin' }]);
  assert.equal(existsSync(staleFile(cwd)), false, 'its old stale entry is dropped');
  await rm(parent, { recursive: true, force: true });
});

test('a corrupt stale.json is ignored by load', async () => {
  const { cwd, env, id } = await codeWorkspace('engram-fresh-corrupt-');
  const before = await runEngram(cwd, env, ['load', QUERY]);
  await writeFile(staleFile(cwd), '{ not json');
  const after = await runEngram(cwd, env, ['load', QUERY]);
  assert.equal(after.code, 0, after.stderr);
  assert.equal(after.stdout, before.stdout);
  assert.match(after.stdout, new RegExp(id));
  await rm(cwd, { recursive: true, force: true });
});

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

test('links, secret files, VCS metadata, and Engram data listed as sources are never read', async (t) => {
  const { cwd, env } = await tempWorkspace('engram-fresh-links-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  initGit(cwd);
  const MARKERS = { git: 'GITCONFIGMARKER0451', json: 'plainsecretvalue42xyz', pem: 'MIIEvplainkeymaterialXYZ' };
  spawnSync('git', ['config', 'engram.probe', MARKERS.git], { cwd });
  await mkdir(path.join(cwd, 'notes'), { recursive: true });
  await writeFile(path.join(cwd, 'notes', 'team.md'), 'The team ships on Tuesdays.\n');
  await writeFile(path.join(cwd, 'secrets.json'), `{"dbPassword":"${MARKERS.json}"}\n`);
  await writeFile(path.join(cwd, 'key.pem'), `-----BEGIN PRIVATE KEY-----\n${MARKERS.pem}\n-----END PRIVATE KEY-----\n`);
  // Hard links need no privilege on any OS and are invisible to realpath: innocent names for secret files.
  await link(path.join(cwd, 'secrets.json'), path.join(cwd, 'notes', 'cfg.md'));
  await link(path.join(cwd, 'key.pem'), path.join(cwd, 'notes', 'k.md'));
  // A directory link into .git (a junction on Windows, a symlink elsewhere).
  await symlink(path.join(cwd, '.git'), path.join(cwd, 'notes', 'gitdir'), 'junction');
  const fileLink = await symlink(path.join(cwd, 'secrets.json'), path.join(cwd, 'notes', 'sym.md'), 'file').then(() => true, (error) => error.code);
  if (fileLink !== true) t.diagnostic(`file symlink variant skipped: this host refuses file symlinks (${fileLink})`);

  const saved = await runEngram(cwd, env, ['take-control', '--file', 'notes/team.md', '--scope', 'workspace', 'TYPE: knowledge | TEXT: The team ships releases every Tuesday afternoon'], 'A\n');
  assert.equal(saved.code, 0, saved.stderr);
  const [name] = await memoryFiles(cwd);
  const key = `workspace:knowledge/${name}`;
  const file = path.join(workspaceMemoryRoot(cwd), 'knowledge', name);
  const expected = {
    'notes/cfg.md': 'link', 'notes/k.md': 'link', 'notes/gitdir/config': 'VCS metadata', '.git/config': 'VCS metadata',
    'Secrets.JSON': 'secret file', '.agents/.engram/engram.config.json': 'Engram data', [`.agents/.engram/knowledge/${name}`]: 'Engram data',
    ...(fileLink === true ? { 'notes/sym.md': 'link' } : {})
  };
  const raw = await readFile(file, 'utf8');
  await writeFile(file, raw
    .replace(/^source_files:[\s\S]*?(?=^source_hashes:)/m, `source_files:\n${Object.keys(expected).map((item) => `  - "${item}"\n`).join('')}`)
    .replace(/^source_hashes:[\s\S]*?(?=^\S)/m, `source_hashes:\n  - ${sha256('not any of these files')}\n`));
  assert.equal((await runEngram(cwd, env, ['rehash', 'workspace'])).code, 0);

  const result = await runEngram(cwd, env, ['verify', '--sources']);
  assert.equal(result.code, 0, result.stdout + result.stderr);
  const flat = result.stdout.replace(/\s+/g, ' ');
  for (const [source, reason] of Object.entries(expected)) {
    assert.match(flat, new RegExp(`${escapeRegExp(source)}: ${reason}`), `${source} is ${reason}`);
  }
  assert.equal(existsSync(staleFile(cwd)), false, 'nothing was read, so nothing is stale');

  // take-control itself refuses a directory link into .git (and the file symlink where the host allows one).
  const direct = await runEngram(cwd, env, ['take-control', '--plan', '--file', 'notes/gitdir/config', ...(fileLink === true ? ['--file', 'notes/sym.md'] : [])]);
  assert.match(direct.stdout, /notes\/gitdir\/config.*VCS metadata/);
  if (fileLink === true) assert.match(direct.stdout, /notes\/sym\.md.*secret file/);

  // A stale.json naming the memory: the refresh pack still reads none of them.
  await writeFile(staleFile(cwd), JSON.stringify({ [key]: ['notes/cfg.md'] }));
  const refresh = await runEngram(cwd, env, ['take-control', '--refresh', '--dry-run']);
  assert.equal(refresh.code, 0, refresh.stderr);
  assert.match(refresh.stdout, /No readable source files remain/);
  for (const output of [result.stdout, direct.stdout, refresh.stdout, refresh.stderr]) {
    for (const marker of Object.values(MARKERS)) assert.ok(!output.includes(marker), `no ${marker} in output`);
  }
  await rm(cwd, { recursive: true, force: true });
});

test('docs freshness ignores line-ending and BOM changes but not text changes', async () => {
  const { cwd, env } = await codeWorkspace('engram-fresh-eol-');
  await mkdir(path.join(cwd, 'notes'), { recursive: true });
  const notes = 'Release notes are written first.\nThen deploy.\n';
  await writeFile(path.join(cwd, 'notes', 'release.md'), notes);
  const docs = await runEngram(cwd, env, ['take-control', '--file', 'notes/release.md', '--scope', 'workspace', 'TYPE: knowledge | TEXT: Release notes are written before each deploy'], 'A\n');
  assert.equal(docs.code, 0, docs.stderr);
  const docsFile = (await memoryFiles(cwd)).find((item) => item.startsWith('release-notes'));
  assert.ok((await readFile(path.join(workspaceMemoryRoot(cwd), 'knowledge', docsFile), 'utf8')).includes(sha256(notes)), 'stored hash is the raw LF text');

  for (const variant of [notes.replace(/\n/g, '\r\n'), `﻿${notes}`, `﻿${notes.replace(/\n/g, '\r\n')}`]) {
    await writeFile(path.join(cwd, 'notes', 'release.md'), variant);
    await writeFile(path.join(cwd, 'src', 'billing.ts'), `﻿${BILLING.replace(/\n/g, '\r\n')}`);
    const fresh = await runEngram(cwd, env, ['verify', '--sources']);
    assert.equal(fresh.code, 0, fresh.stderr);
    assert.match(fresh.stdout, /No stale memories \(2 checked\)/, JSON.stringify(variant.slice(0, 12)));
  }
  await writeFile(path.join(cwd, 'notes', 'release.md'), notes.replace('first', 'last').replace(/\n/g, '\r\n'));
  const changed = await runEngram(cwd, env, ['verify', '--sources']);
  assert.equal(changed.code, 0, changed.stderr);
  assert.deepEqual(JSON.parse(await readFile(staleFile(cwd), 'utf8')), { [`workspace:knowledge/${docsFile}`]: ['notes/release.md'] });
  await rm(cwd, { recursive: true, force: true });
});

test('verify --sources --json keeps stale sources as diagnostics when a memory hash mismatches', async () => {
  const { cwd, env, key, file } = await codeWorkspace('engram-fresh-mismatch-');
  await writeFile(path.join(cwd, 'src', 'billing.ts'), BILLING.replace('(month: string)', '(month: string, currency: string)'));
  await writeFile(file, `${await readFile(file, 'utf8')}\nHand edit.\n`);
  const result = await runEngram(cwd, env, ['verify', '--sources', '--json']);
  assert.notEqual(result.code, 0);
  const envelope = JSON.parse(result.stdout || result.stderr);
  assert.equal(envelope.ok, false);
  assert.ok(envelope.diagnostics.some((item) => item.id === 'hash.mismatch'));
  assert.deepEqual(envelope.diagnostics.filter((item) => item.id === 'sources.stale').map((item) => item.message), [`${key}: src/billing.ts`]);
  await rm(cwd, { recursive: true, force: true });
});

test('sources covered by Engram ignore rules are never read by verify --sources or take-control --refresh', async () => {
  const { cwd, env, id, file } = await codeWorkspace('engram-fresh-ignored-');
  await mkdir(path.join(cwd, 'config'), { recursive: true });
  await mkdir(path.join(cwd, 'private'), { recursive: true });
  const dbMarker = 'DB_PASSWORD_MARKER_ALPHA';
  const planMarker = 'PRIVATE_PLAN_MARKER_BETA';
  await writeFile(path.join(cwd, 'config', 'db.secret'), `export const password = "${dbMarker}";\n`);
  await writeFile(path.join(cwd, 'private', 'plan.md'), `# Plan\n\n${planMarker}\n`);
  const raw = await readFile(file, 'utf8');
  // Edited to also name files DEFAULT_IGNORE covers (`*.secret`, `private/**`); their hashes match nothing.
  const tampered = raw.replace(/^source_files: \[src\/billing\.ts\]$/m, 'source_files: [src/billing.ts, config/db.secret, private/plan.md]');
  assert.notEqual(tampered, raw);
  await writeFile(file, tampered);
  assert.equal((await runEngram(cwd, env, ['rehash', 'workspace'])).code, 0);

  const verified = await runEngram(cwd, env, ['verify', '--sources']);
  assert.equal(verified.code, 0, verified.stdout + verified.stderr);
  assert.match(verified.stdout, /config\/db\.secret: ignored by Engram ignore rules/);
  assert.match(verified.stdout, /private\/plan\.md: ignored by Engram ignore rules/);
  assert.equal(existsSync(staleFile(cwd)), false, 'ignored sources are never read, so nothing is stale');

  await writeFile(path.join(cwd, 'src', 'billing.ts'), BILLING.replace('exportInvoices(month: string)', 'exportInvoices(month: string, region: string)'));
  assert.equal((await runEngram(cwd, env, ['verify', '--sources'])).code, 0);
  const guidance = await runEngram(cwd, env, ['take-control', '--refresh', '--dry-run']);
  assert.equal(guidance.code, 0, guidance.stderr);
  assert.match(guidance.stdout, new RegExp(`UPDATE: ${id}`));
  assert.match(guidance.stdout, /region: string/);
  for (const marker of [dbMarker, planMarker]) assert.ok(!guidance.stdout.includes(marker), `${marker} is never printed`);
  assert.doesNotMatch(guidance.stdout, /db\.secret|private\/plan\.md/);
  await rm(cwd, { recursive: true, force: true });
});
