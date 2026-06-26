import test from 'node:test';
import assert from 'node:assert/strict';
import { rm, writeFile, mkdir, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { initGit, runEngram, tempWorkspace, workspaceMemoryRoot } from '../helpers.mjs';
import { writeProfileMemory, profileMemoryRaw, invalidProfileMemoryRaw } from './fixtures.mjs';

test('profiles isolate global memory and support workspace defaults, cross-profile saves, and merge previews', async () => {
  const { cwd, env } = await tempWorkspace('engram-profile-');
  const personalRoot = path.join(cwd, 'profiles', 'personal');
  const companyRoot = path.join(cwd, 'profiles', 'company');

  const personal = await runEngram(cwd, env, ['profile', 'create', 'personal', '--global-path', personalRoot, '--use']);
  assert.equal(personal.code, 0, personal.stderr);
  assert.match(personal.stdout, /Profile created: personal/);
  const company = await runEngram(cwd, env, ['profile', 'create', 'company', '--global-path', companyRoot]);
  assert.equal(company.code, 0, company.stderr);

  const uninitializedSave = await runEngram(cwd, env, ['save', 'knowledge', 'Personal default profile memory'], 'A\n');
  assert.equal(uninitializedSave.code, 0, uninitializedSave.stderr);
  await readFile(path.join(personalRoot, 'knowledge', 'personal-default-profile-memory.md'), 'utf8');
  await assert.rejects(readFile(path.join(env.ENGRAM_GLOBAL_DIR, 'knowledge', 'personal-default-profile-memory.md'), 'utf8'));
  const uninitializedLoad = await runEngram(cwd, env, ['load', 'Personal default profile memory']);
  assert.equal(uninitializedLoad.code, 0, uninitializedLoad.stderr);
  assert.match(uninitializedLoad.stdout, /Personal default profile memory/);

  await runEngram(cwd, env, ['inject', '--no-skillset']);
  const workspaceDefault = await runEngram(cwd, env, ['profile', 'use', 'company', '--workspace']);
  assert.equal(workspaceDefault.code, 0, workspaceDefault.stderr);
  assert.match(workspaceDefault.stdout, /Workspace default profile: company/);
  const entry = await runEngram(cwd, env, ['entry']);
  assert.match(entry.stdout.replace(/\x1b\[[0-9;]*m/g, ''), /profile\.active:\s*company/);

  const companyWorkspace = await runEngram(cwd, env, ['save', '--scope', 'workspace', 'knowledge', 'Company workspace deployment policy'], 'A\n');
  assert.equal(companyWorkspace.code, 0, companyWorkspace.stderr);
  const crossProfile = await runEngram(cwd, env, ['save', '--profile', 'personal', 'knowledge', 'Remote database pooling configuration'], 'A\n');
  assert.equal(crossProfile.code, 0, crossProfile.stderr);
  await readFile(path.join(personalRoot, 'knowledge', 'remote-database-pooling-configuration.md'), 'utf8');
  await assert.rejects(readFile(path.join(companyRoot, 'knowledge', 'remote-database-pooling-configuration.md'), 'utf8'));
  await assert.rejects(readFile(path.join(workspaceMemoryRoot(cwd), 'knowledge', 'remote-database-pooling-configuration.md'), 'utf8'));

  const isolatedLoad = await runEngram(cwd, env, ['--profile', 'personal', 'load', '--dry-run', 'Company workspace deployment policy']);
  assert.equal(isolatedLoad.code, 0, isolatedLoad.stderr);
  assert.doesNotMatch(isolatedLoad.stdout, /workspace:knowledge\/company-workspace-deployment-policy\.md/);

  const duplicateMerge = await runEngram(cwd, env, ['profile', 'merge', 'personal', 'company', '--dry-run']);
  assert.equal(duplicateMerge.code, 0, duplicateMerge.stderr);
  assert.match(duplicateMerge.stdout, /Profile merge dry-run personal -> company/);
  assert.match(duplicateMerge.stdout, /Planned: 2/);

  const duplicateTarget = await runEngram(cwd, env, ['save', '--profile', 'company', '--scope', 'global', 'knowledge', 'Remote database pooling configuration'], 'A\n');
  assert.equal(duplicateTarget.code, 0, duplicateTarget.stderr);
  const duplicatePreview = await runEngram(cwd, env, ['profile', 'merge', '--from-profile', 'personal', '--to-profile', 'company', '--dry-run']);
  assert.equal(duplicatePreview.code, 0, duplicatePreview.stderr);
  assert.match(duplicatePreview.stdout, /Duplicates: 1/);

  const merged = await runEngram(cwd, env, ['profile', 'merge', 'personal', 'company']);
  assert.equal(merged.code, 0, merged.stderr);
  assert.match(merged.stdout, /Profile merge personal -> company/);
  await readFile(path.join(companyRoot, 'knowledge', 'personal-default-profile-memory.md'), 'utf8');

  await rm(cwd, { recursive: true, force: true });
});

test('profile command reports status, workspace defaults, user defaults, removal, and validation errors', async () => {
  const { cwd, env } = await tempWorkspace('engram-profile-admin-');
  const alphaRoot = path.join(cwd, 'profiles', 'alpha');
  const betaRoot = path.join(cwd, 'profiles', 'beta');

  const emptyList = await runEngram(cwd, env, ['profile', 'list']);
  assert.equal(emptyList.code, 0, emptyList.stderr);
  assert.match(emptyList.stdout, /No profiles configured/);
  const emptyStatus = await runEngram(cwd, env, ['pf', 'status']);
  assert.equal(emptyStatus.code, 0, emptyStatus.stderr);
  assert.match(emptyStatus.stdout, /<none>/);
  assert.match(emptyStatus.stdout, /Global path:\s+<none>/);

  const badAction = await runEngram(cwd, env, ['profile', 'whatever']);
  assert.equal(badAction.code, 1);
  assert.match(badAction.stderr, /profile expects list, status, create, use, remove, or merge/);
  const badName = await runEngram(cwd, env, ['profile', 'create', 'bad/name', '--global-path', alphaRoot]);
  assert.equal(badName.code, 1);
  assert.match(badName.stderr, /profile name must use letters/);
  const missingPath = await runEngram(cwd, env, ['profile', 'create', 'missing']);
  assert.equal(missingPath.code, 1);
  assert.match(missingPath.stderr, /profile create requires --global-path/);

  const alpha = await runEngram(cwd, env, ['profile', 'create', 'alpha', alphaRoot, '--scope', 'both']);
  assert.equal(alpha.code, 0, alpha.stderr);
  assert.match(alpha.stdout, /Profile created: alpha/);
  assert.match(alpha.stdout, /Default save target: both/);
  const beta = await runEngram(cwd, env, ['profile', 'create', 'beta', '--global-path', betaRoot, '--use', '--workspace']);
  assert.equal(beta.code, 0, beta.stderr);
  assert.match(beta.stdout, /Workspace default: beta/);
  assert.match(beta.stdout, /User default: beta/);
  const workspaceConfig = JSON.parse(await readFile(path.join(workspaceMemoryRoot(cwd), 'engram.config.json'), 'utf8'));
  assert.equal(workspaceConfig.default_profile, 'beta');
  assert.equal(workspaceConfig.global_path, '');

  const list = await runEngram(cwd, env, ['profile', 'ls']);
  assert.equal(list.code, 0, list.stderr);
  assert.match(list.stdout, /alpha/);
  assert.match(list.stdout, /beta \(active\)/);
  const status = await runEngram(cwd, env, ['profile', 'show']);
  assert.equal(status.code, 0, status.stderr);
  assert.match(status.stdout, /Source:\s+workspace/);
  assert.match(status.stdout, /Workspace default:\s+beta/);
  assert.match(status.stdout, /Workspace memory:\s+allowed/);

  const userDefault = await runEngram(cwd, env, ['profile', 'use', 'alpha', '--user']);
  assert.equal(userDefault.code, 0, userDefault.stderr);
  assert.match(userDefault.stdout, /User default profile: alpha/);
  const workspaceStillWins = await runEngram(cwd, env, ['entry']);
  assert.match(workspaceStillWins.stdout.replace(/\x1b\[[0-9;]*m/g, ''), /profile\.active:\s*beta/);
  const explicitAlpha = await runEngram(cwd, env, ['--profile=alpha', 'profile', 'status']);
  assert.equal(explicitAlpha.code, 0, explicitAlpha.stderr);
  assert.match(explicitAlpha.stdout, /Source:\s+env/);
  assert.match(explicitAlpha.stdout, /Workspace memory:\s+disabled for profile mismatch/);

  const duplicate = await runEngram(cwd, env, ['profile', 'create', 'beta', '--global-path', path.join(cwd, 'profiles', 'beta2')]);
  assert.equal(duplicate.code, 1);
  assert.match(duplicate.stderr, /profile already exists: beta/);
  const forced = await runEngram(cwd, env, ['profile', 'create', 'beta', '--global-path', betaRoot, '--force']);
  assert.equal(forced.code, 0, forced.stderr);
  assert.match(forced.stdout, /Profile created: beta/);

  const unknownUse = await runEngram(cwd, env, ['profile', 'use', 'ghost']);
  assert.equal(unknownUse.code, 1);
  assert.match(unknownUse.stderr, /unknown profile: ghost/);
  const removed = await runEngram(cwd, env, ['profile', 'remove', 'alpha']);
  assert.equal(removed.code, 0, removed.stderr);
  assert.match(removed.stdout, /Profile removed: alpha/);
  const missingRemove = await runEngram(cwd, env, ['pf', 'rm', 'alpha']);
  assert.equal(missingRemove.code, 1);
  assert.match(missingRemove.stderr, /unknown profile: alpha/);

  await rm(cwd, { recursive: true, force: true });
});

test('profile merge handles unsafe files, invalid memory, force copies, and long dry-run output', async () => {
  const { cwd, env } = await tempWorkspace('engram-profile-merge-');
  const sourceRoot = path.join(cwd, 'profiles', 'source');
  const targetRoot = path.join(cwd, 'profiles', 'target');
  const orphanRoot = path.join(cwd, 'profiles', 'orphan');
  assert.equal((await runEngram(cwd, env, ['profile', 'create', 'source', '--global-path', sourceRoot])).code, 0);
  assert.equal((await runEngram(cwd, env, ['profile', 'create', 'target', '--global-path', targetRoot])).code, 0);
  assert.equal((await runEngram(cwd, env, ['profile', 'create', 'orphan', '--global-path', orphanRoot])).code, 0);

  await writeProfileMemory(sourceRoot, 'knowledge/force-copy.md', profileMemoryRaw('force-copy', 'Force copy profile memory.'));
  await writeProfileMemory(targetRoot, 'knowledge/force-copy.md', profileMemoryRaw('force-copy', 'Existing target memory.'));
  await writeProfileMemory(sourceRoot, 'knowledge/invalid.md', invalidProfileMemoryRaw('invalid-profile-memory'));
  await writeProfileMemory(sourceRoot, 'knowledge/unsafe.md', profileMemoryRaw('unsafe-profile-memory', 'This hash will no longer match.'));
  await writeFile(path.join(sourceRoot, 'knowledge', 'unsafe.md'), profileMemoryRaw('unsafe-profile-memory', 'Tampered profile memory.'));
  for (let index = 0; index < 25; index += 1) {
    const id = `bulk-profile-${String(index).padStart(2, '0')}`;
    await writeProfileMemory(sourceRoot, `knowledge/${id}.md`, profileMemoryRaw(id, `Bulk profile merge memory ${index}.`));
  }

  const selfMerge = await runEngram(cwd, env, ['profile', 'merge', 'source', 'source']);
  assert.equal(selfMerge.code, 1);
  assert.match(selfMerge.stderr, /source and target must be different/);
  const unknownSource = await runEngram(cwd, env, ['profile', 'merge', 'missing', 'target']);
  assert.equal(unknownSource.code, 1);
  assert.match(unknownSource.stderr, /unknown source profile: missing/);
  await rm(orphanRoot, { recursive: true, force: true });
  const missingRoot = await runEngram(cwd, env, ['profile', 'merge', 'orphan', 'target']);
  assert.equal(missingRoot.code, 1);
  assert.match(missingRoot.stderr, /source profile root not found/);

  const dryRun = await runEngram(cwd, env, ['profile', 'merge', 'source', 'target', '--dry-run']);
  assert.equal(dryRun.code, 0, dryRun.stderr);
  assert.match(dryRun.stdout, /Profile merge dry-run source -> target/);
  assert.match(dryRun.stdout, /Planned: 25/);
  assert.match(dryRun.stdout, /Duplicates: 1/);
  assert.match(dryRun.stdout, /Unsafe: 1/);
  assert.match(dryRun.stdout, /Invalid: 1/);
  assert.match(dryRun.stdout, /\.\.\. 4 more/);

  const force = await runEngram(cwd, env, ['profile', 'merge', 'source', 'target', '--force']);
  assert.equal(force.code, 0, force.stderr);
  assert.match(force.stdout, /Force: yes/);
  assert.match(force.stdout, /Copied: 26/);
  assert.match(force.stdout, /Unsafe: 1/);
  assert.match(force.stdout, /Invalid: 1/);
  assert.match(await readFile(path.join(targetRoot, 'knowledge', 'force-copy.md'), 'utf8'), /Force copy profile memory/);

  await rm(cwd, { recursive: true, force: true });
});
