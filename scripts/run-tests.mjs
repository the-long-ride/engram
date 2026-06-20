/** Sequential fail-fast test runner for the test suite. */
import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import path from 'node:path';

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

function runAllTests(files) {
  return new Promise((resolve, reject) => {
    console.log(`🏃 Running ${files.length} test files in parallel...`);
    const child = spawn(process.execPath, ['--test', ...files], { stdio: 'inherit' });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Test runner failed with exit code ${code}`));
    });
  });
}

async function main() {
  try {
    const rootTestDir = path.resolve('tests');
    const testFiles = await getTestFiles(rootTestDir);
    testFiles.sort();
    
    console.log(`Found ${testFiles.length} test files. Running in parallel...`);
    await runAllTests(testFiles);
    console.log('\n✅ All tests passed successfully!');
  } catch (error) {
    console.error(`\n❌ ${error.message}`);
    process.exit(1);
  }
}

main();
