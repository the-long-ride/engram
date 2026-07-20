// Verify WebUI assets stay small enough for fast local panel startup.
import { access, readFile, readdir, stat } from 'node:fs/promises';

const rawBudgets = [
  ['src/core/web/panel.html', 7000],
  ['src/core/web/favicon.svg', 12000],
  ['media/logo/engram-logo-black-transparent.svg', 12000]
];

const cssDir = 'src/core/web';
const cssLineBudgetMax = 600;

const bundleBudgets = [
  ['dist/core/web/panel.js', 261000]
];

function lineCount(source) {
  const trimmed = source.trimEnd();
  if (!trimmed) return 0;
  return trimmed.split(/\r\n|\r|\n/).length;
}

async function exists(file) {
  try { await access(file); return true; } catch { return false; }
}

async function cssFiles() {
  const assets = await readdir(cssDir);
  return assets
    .filter((file) => file.endsWith('.css'))
    .map((file) => cssDir + '/' + file);
}

const failures = [];
for (const [file, maxBytes] of rawBudgets) {
  const size = (await stat(file)).size;
  if (size > maxBytes) failures.push(file + ': ' + size + ' bytes > ' + maxBytes + ' bytes (raw)');
}

for (const file of await cssFiles()) {
  const source = await readFile(file, 'utf8');
  const lines = lineCount(source);
  if (lines > cssLineBudgetMax) failures.push(file + ': ' + lines + ' lines > ' + cssLineBudgetMax + ' lines (css)');
}

for (const [file, maxBytes] of bundleBudgets) {
  if (!(await exists(file))) {
    console.warn('web-assets: skipping missing bundle ' + file + '; run npm run build to check budgets');
    continue;
  }
  const size = (await stat(file)).size;
  if (size > maxBytes) failures.push(file + ': ' + size + ' bytes > ' + maxBytes + ' bytes (bundle)');
}

if (failures.length) {
  console.error('Web asset budget exceeded:\n' + failures.join('\n'));
  process.exit(1);
}

console.log('web-assets: size budgets passed');
