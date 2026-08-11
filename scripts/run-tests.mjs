/** Parallel, bounded test runner for the root suite. */
import { spawn } from 'node:child_process';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { selectWeightedShard } from './test-shard-planner.mjs';

async function getTestFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const res = path.resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (['cli', 'publish'].includes(entry.name)) {
        files.push(...await getTestFiles(res));
      }
    } else if (entry.name.endsWith('.test.mjs')) {
      files.push(res);
    }
  }
  return files;
}

async function selectTestFiles(files) {
  const shard = process.env.TEST_SHARD?.trim();
  if (!shard) return files;
  const entries = await Promise.all(files.map(async (file) => ({ file, size: (await stat(file)).size })));
  return selectWeightedShard(entries, shard);
}

function runAllTests(files) {
  return new Promise((resolve, reject) => {
    const shard = process.env.TEST_SHARD?.trim();
    console.log(`🏃 Running ${files.length} test files in parallel${shard ? ` (weighted shard ${shard})` : ''}...`);
    const child = spawn(process.execPath, [
      '--test',
      '--test-timeout=120000',
      '--test-force-exit',
      ...files,
    ], { stdio: 'inherit' });
    child.once('error', reject);
    child.once('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Test runner failed with exit code ${code}`));
    });
  });
}

async function main() {
  try {
    const rootTestDir = path.resolve('tests');
    const allTestFiles = await getTestFiles(rootTestDir);
    allTestFiles.sort();
    const testFiles = await selectTestFiles(allTestFiles);

    console.log(`Found ${allTestFiles.length} test files; selected ${testFiles.length}.`);
    await runAllTests(testFiles);
    console.log('\n✅ All tests passed successfully!');
  } catch (error) {
    console.error(`\n❌ ${error.message}`);
    process.exitCode = 1;
  }
}

main();
