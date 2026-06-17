import test from 'node:test';
import assert from 'node:assert/strict';
import { rm, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { tempWorkspace, runEngram } from '../helpers.mjs';

test('migration dry-run reports counts from JSON configs', async () => {
  const { cwd, env } = await tempWorkspace('engram-migrate-');
  const configDir = path.join(env.ENGRAM_CONFIG_DIR);
  // Ensure config dir exists.
  await mkdir(configDir, { recursive: true });

  // Write user config and profiles JSON.
  await writeFile(
    path.join(configDir, 'engram.config.json'),
    JSON.stringify({ scope: 'both', read: 'always', global_path: cwd }, null, 2)
  );
  await writeFile(
    path.join(configDir, 'profiles.json'),
    JSON.stringify({
      active_profile: 'test-prof',
      profiles: {
        'test-prof': { global_path: path.join(cwd, 'global'), scope: 'global' }
      }
    }, null, 2)
  );

  // Init a workspace so there's something to discover.
  await runEngram(cwd, { ...env }, ['init', '--no-skillset']);

  // Dry-run migration.
  const dryRun = await runEngram(cwd, { ...env }, ['upgrade', '--db-migrate', '--dry-run']);
  assert.equal(dryRun.code, 0, dryRun.stderr);
  assert.match(dryRun.stdout, /Migration dry-run/);
  assert.match(dryRun.stdout, /Workspaces found:/);
  assert.match(dryRun.stdout, /User config keys migrated:/);
  assert.match(dryRun.stdout, /Profiles migrated:/);
  assert.match(dryRun.stdout, /Run with --force to apply/);

  await rm(cwd, { recursive: true, force: true });
});

test('migration force writes to DB', async () => {
  const { cwd, env } = await tempWorkspace('engram-migrate-');
  const configDir = path.join(env.ENGRAM_CONFIG_DIR);
  await mkdir(configDir, { recursive: true });

  await writeFile(
    path.join(configDir, 'engram.config.json'),
    JSON.stringify({ scope: 'global', read: 'manual' }, null, 2)
  );
  await writeFile(
    path.join(configDir, 'profiles.json'),
    JSON.stringify({
      active_profile: 'force-prof',
      profiles: {
        'force-prof': { global_path: path.join(cwd, 'global'), scope: 'both' }
      }
    }, null, 2)
  );

  await runEngram(cwd, { ...env }, ['init', '--no-skillset']);

  const force = await runEngram(cwd, { ...env }, ['upgrade', '--db-migrate', '--force']);
  assert.equal(force.code, 0, force.stderr);
  assert.match(force.stdout, /Migration applied/);
  assert.match(force.stdout, /Profiles migrated: 1/);

  // Running again idempotently.
  const force2 = await runEngram(cwd, { ...env }, ['upgrade', '--db-migrate', '--force']);
  assert.equal(force2.code, 0, force2.stderr);
  assert.match(force2.stdout, /Migration applied/);

  await rm(cwd, { recursive: true, force: true });
});

test('migration without --force or --dry-run shows help', async () => {
  const { cwd, env } = await tempWorkspace('engram-migrate-');
  const configDir = path.join(env.ENGRAM_CONFIG_DIR);
  await mkdir(configDir, { recursive: true });

  await writeFile(
    path.join(configDir, 'engram.config.json'),
    JSON.stringify({ scope: 'workspace' }, null, 2)
  );

  const result = await runEngram(cwd, { ...env }, ['upgrade', '--db-migrate']);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /SQLite config DB migration available/);
  assert.match(result.stdout, /engram upgrade --db-migrate --dry-run/);
  assert.match(result.stdout, /engram upgrade --db-migrate --force/);

  await rm(cwd, { recursive: true, force: true });
});

test('migration with no JSON configs reports nothing to migrate', async () => {
  const { cwd, env } = await tempWorkspace('engram-migrate-');
  const configDir = path.join(env.ENGRAM_CONFIG_DIR);
  await mkdir(configDir, { recursive: true });

  // No config files at all — needsMigration returns false.
  const result = await runEngram(cwd, { ...env }, ['upgrade', '--db-migrate']);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /No JSON configs to migrate/);

  await rm(cwd, { recursive: true, force: true });
});