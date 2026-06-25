// Verify WebUI assets stay small enough for fast local panel startup.
import { access, readFile, stat } from 'node:fs/promises';

const rawBudgets = [
  ['src/core/web/panel.html', 7000],
  ['src/core/web/favicon.svg', 12000],
  ['media/logo/engram-logo-black-transparent.svg', 12000]
];

const staticBudgets = [
  ['src/core/web/panel.css', 28000, minifyCss]
];

const bundleBudgets = [
  ['dist/core/web/panel.js', 260000]
];

function minifyCss(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>])\s*/g, '$1')
    .replace(/;}\s*/g, '}')
    .trim();
}

async function exists(file) {
  try { await access(file); return true; } catch { return false; }
}

const failures = [];
for (const [file, maxBytes] of rawBudgets) {
  const size = (await stat(file)).size;
  if (size > maxBytes) failures.push(file + ': ' + size + ' bytes > ' + maxBytes + ' bytes (raw)');
}

for (const [file, maxBytes, transform] of staticBudgets) {
  const source = await readFile(file, 'utf8');
  const size = Buffer.byteLength(transform(source));
  if (size > maxBytes) failures.push(file + ': ' + size + ' bytes > ' + maxBytes + ' bytes (static)');
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
