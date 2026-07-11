/** Run only test files related to changed repository paths. */
import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const changed = process.argv.slice(2).map(normalizePath).filter(Boolean);
const npmCli = process.env.npm_execpath;
const nodeCoverageArgs = ['--experimental-test-coverage', '--test'];
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const rules = [
  [/^src\/cli\//, ['tests/core.test.mjs', 'tests/cli/**/*.test.mjs']],
  [/^src\/commands\//, ['tests/cli/**/*.test.mjs']],
  [/^src\/mcp\//, ['tests/mcp.test.mjs']],
  [/^src\/core\/analysis\//, ['tests/core.test.mjs']],
  [/^src\/core\/cli\//, ['tests/core.test.mjs', 'tests/cli/**/*.test.mjs']],
  [/^src\/core\/config-db\//, ['tests/cli/config-db.test.mjs', 'tests/cli/config-cmd.test.mjs']],
  [/^src\/core\/integrations\//, ['tests/core.test.mjs', 'tests/skillset.test.mjs', 'tests/cli/agent-hooks.test.mjs']],
  [/^src\/core\/memory\//, ['tests/core.test.mjs', 'tests/safety.test.mjs', 'tests/conflict.test.mjs', 'tests/init-migration.test.mjs']],
  [/^src\/core\/runtime\//, ['tests/core.test.mjs', 'tests/init-migration.test.mjs', 'tests/skillset.test.mjs', 'tests/cli/**/*.test.mjs']],
  [/^src\/core\/safety\//, ['tests/core.test.mjs', 'tests/safety.test.mjs', 'tests/tamper.test.mjs']],
  [/^src\/core\/system\//, ['tests/core.test.mjs']],
  [/^src\/core\/vcs\//, ['tests/conflict.test.mjs', 'tests/cli/clone.test.mjs']],
  [/^src\/core\/web\/app\//, ['tests/app/**/*.test.ts', 'tests/app/**/*.test.tsx']],
  [/^src\/core\/web\/api\.ts$/, ['tests/web-api.test.mjs']],
  [/^src\/core\/web\/config-schema\.ts$/, ['tests/web-config-schema.test.mjs']],
  [/^src\/core\/web\/entry-server\.ts$/, ['tests/web-entry-server.test.mjs']],
  [/^src\/core\/web\/path-utils\.ts$/, ['tests/web-path-utils.test.mjs']],
  [/^src\/core\/web\/.*\.(css|html|svg)$/, ['tests/web-panel-ui.test.mjs']],
  [/^media\/logo\//, ['tests/web-panel-ui.test.mjs']],
  [/^website\/src\/css\/custom\.css$/, ['tests/website-footer.test.mjs', 'tests/website-mobile-nav-cleanup.test.mjs', 'tests/website-mobile-sidebar.test.mjs']],
  [/^website\/src\//, ['website/src/**/*.test.ts', 'website/src/**/*.test.tsx']],
  [/^website\//, ['tests/website-footer.test.mjs', 'tests/website-mobile-nav-cleanup.test.mjs', 'tests/website-mobile-sidebar.test.mjs']],
  [/^\.github\/workflows\/(docs|deploy-docs)\.yml$/, ['tests/docs-workflows.test.mjs']],
  [/^\.github\/workflows\/test\.yml$/, ['tests/core.test.mjs']],
  [/^\.vscode\//, ['tests/vscode-config.test.mjs', 'tests/vscode-debug-config.test.mjs']],
  [/^scripts\/check-web-assets\.mjs$/, ['tests/web-assets-budget.test.mjs']],
  [/^scripts\/(build-web|copy-assets)\.mjs$/, ['tests/web-panel-ui.test.mjs']],
  [/^scripts\/(run-tests|run-related-tests|generate-version)\.mjs$/, ['tests/core.test.mjs']],
  [/^(package|package-lock)\.json$/, ['tests/core.test.mjs', 'tests/publish/*.test.mjs']],
  [/^tsconfig\.json$/, ['tests/core.test.mjs']],
  [/^jest\.config\.cjs$/, ['tests/app/**/*.test.ts', 'tests/app/**/*.test.tsx']],
  [/^tests\/helpers\.mjs$/, [
    'tests/core.test.mjs',
    'tests/conflict.test.mjs',
    'tests/init-migration.test.mjs',
    'tests/mcp.test.mjs',
    'tests/safety.test.mjs',
    'tests/skillset.test.mjs',
    'tests/tamper.test.mjs',
    'tests/web-api.test.mjs',
    'tests/web-entry-server.test.mjs',
    'tests/cli/**/*.test.mjs',
  ]],
  [/^tests\/cli\/fixtures\.mjs$/, [
    'tests/mcp.test.mjs',
    'tests/cli/admin.test.mjs',
    'tests/cli/clone.test.mjs',
    'tests/cli/completion-help.test.mjs',
    'tests/cli/init.test.mjs',
    'tests/cli/metacognize.test.mjs',
    'tests/cli/misc.test.mjs',
    'tests/cli/profile.test.mjs',
    'tests/cli/read-ops.test.mjs',
    'tests/cli/rehash.test.mjs',
    'tests/cli/save.test.mjs',
    'tests/cli/take-control.test.mjs',
    'tests/cli/upgrade.test.mjs',
  ]],
  [/^tests\//, (file) => [file]],
];

if (isMain()) {
  const selected = await relatedTestsForChangedFiles(changed);

  if (!selected.length) {
    console.log('No related tests for changed files.');
    process.exit(0);
  }

  console.log('Running related tests:\n' + selected.map((file) => '- ' + file).join('\n'));
  if (selected.some(needsBuild)) await run('Build', 'npm run build', []);
  if (npmCli) {
    await run('Jest related tests', process.execPath, [npmCli, 'exec', '--', 'jest', '--config', 'jest.config.cjs', ...selected.filter(isJestTest)]);
  } else {
    await run('Jest related tests', npmCommand, ['exec', '--', 'jest', '--config', 'jest.config.cjs', ...selected.filter(isJestTest)]);
  }
  await runWebsiteTests(selected.filter(isWebsiteTest));
  await run('Node related tests', process.execPath, ['--test', ...selected.filter((file) => !isJestTest(file) && !isCoverageTest(file) && !isWebsiteTest(file))]);
  await run('Node related coverage', process.execPath, [...nodeCoverageArgs, ...selected.filter(isCoverageTest)]);
}

export async function relatedTestsForChangedFiles(files) {
  const normalized = files.map(normalizePath).filter(Boolean);
  if (shouldRunFullSuite(normalized)) return allTests();
  return [...new Set((await Promise.all(normalized.flatMap(testFilesFor).map(expandTestPattern))).flat())].sort();
}

function testFilesFor(file) {
  const matches = [];
  for (const [pattern, tests] of rules) {
    if (!pattern.test(file)) continue;
    matches.push(...(typeof tests === 'function' ? tests(file) : tests));
  }
  return matches.filter((testFile) => testFile !== file || /\.test\.(mjs|ts|tsx)$/.test(testFile));
}

function isJestTest(file) {
  return /^tests\/app\/.+\.test\.tsx?$/.test(file);
}

function isCoverageTest(file) {
  return /^tests\/.+\.test\.mjs$/.test(file) && !/^tests\/(website|vscode|docs-workflows|web-assets-budget|web-panel-ui)/.test(file);
}

function isWebsiteTest(file) {
  return /^website\/src\/.+\.test\.tsx?$/.test(file);
}

function needsBuild(file) {
  return isJestTest(file) || isCoverageTest(file) || /^tests\/(web-api|web-config-schema|web-entry-server|web-path-utils)\.test\.mjs$/.test(file);
}

function shouldRunFullSuite(files) {
  return files.some((file) => /^(src\/|scripts\/)/.test(file) && testFilesFor(file).length === 0);
}

function normalizePath(file) {
  return file.replace(/\\/g, '/').replace(/^\.\//, '');
}

function run(label, command, args) {
  const realArgs = args.filter(Boolean);
  const testArgs = realArgs.filter((arg) => /^(tests\/|--test$)/.test(arg) || !arg.startsWith('tests/'));
  if (!testArgs.some((arg) => arg.startsWith('tests/')) && command !== 'npm run build') return Promise.resolve();

  console.log('\n' + label + ':');
  return new Promise((resolve, reject) => {
    const child = command === 'npm run build'
      ? spawnBuild()
      : spawn(command, testArgs, { stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(label + ' failed with exit code ' + code));
    });
  });
}

function spawnBuild() {
  if (npmCli) return spawn(process.execPath, [npmCli, 'run', 'build'], { stdio: 'inherit' });
  return spawn(npmCommand, ['run', 'build'], { stdio: 'inherit', shell: process.platform === 'win32' });
}

export async function websiteTestFiles() {
  return [
    ...await expandTestPattern('website/src/**/*.test.ts'),
    ...await expandTestPattern('website/src/**/*.test.tsx')
  ].map((file) => file.replace(/^website\//, '')).sort();
}

function runWebsiteTests(files) {
  if (!files.length) return Promise.resolve();
  console.log('\nWebsite related tests:');
  return new Promise((resolve, reject) => {
    const relativeFiles = files.map((file) => file.replace(/^website\//, ''));
    const child = spawn(process.execPath, ['--experimental-test-coverage', '--import', 'tsx', '--test', '--test-isolation=none', ...relativeFiles], {
      cwd: 'website',
      stdio: 'inherit'
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error('Website related tests failed with exit code ' + code));
    });
  });
}

async function allTests() {
  return [
    ...await expandTestPattern('tests/**/*.test.mjs'),
    ...await expandTestPattern('tests/app/**/*.test.ts'),
    ...await expandTestPattern('tests/app/**/*.test.tsx'),
    ...await expandTestPattern('website/src/**/*.test.ts'),
    ...await expandTestPattern('website/src/**/*.test.tsx'),
  ].sort();
}

async function expandTestPattern(pattern) {
  if (!pattern.includes('*')) return [pattern];
  if (!pattern.includes('/**/')) {
    const slash = pattern.lastIndexOf('/');
    const dir = pattern.slice(0, slash);
    const suffix = pattern.slice(slash + 1).replace('*', '');
    const files = await walk(dir);
    return files.filter((file) => file.endsWith(suffix));
  }

  const [dir, suffix] = pattern.split('/**/');
  const files = await walk(dir);
  const ext = suffix.replace('*', '');
  return files.filter((file) => file.endsWith(ext));
}

async function walk(dir) {
  const files = [];
  const resolved = path.isAbsolute(dir) ? dir : path.join(repoRoot, dir);
  for (const entry of await readdir(resolved, { withFileTypes: true })) {
    const file = path.join(resolved, entry.name);
    if (entry.isDirectory()) files.push(...await walk(file));
    else files.push(path.relative(repoRoot, file).replace(/\\/g, '/'));
  }
  return files;
}

function isMain() {
  return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}
