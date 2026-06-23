// Verify WebUI assets stay small enough for fast local panel startup.
import { readFile, stat } from 'node:fs/promises';
import ts from 'typescript';

const rawBudgets = [
  ['src/core/web/panel.html', 7000],
  ['src/core/web/favicon.svg', 12000]
];

const shippedBudgets = [
  ['src/core/web/panel.js', 52000, minifyJs],
  ['src/core/web/panel.css', 24000, minifyCss]
];

function minifyCss(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

function minifyJs(source) {
  const scanner = ts.createScanner(ts.ScriptTarget.ES2022, true, ts.LanguageVariant.Standard, source);
  let out = '';
  let prev = '';
  const isWord = (ch) => /[A-Za-z0-9_$]/.test(ch);
  const needsSpace = (left, right) => {
    if (!left || !right) return false;
    const last = left[left.length - 1];
    const first = right[0];
    if (isWord(last) && isWord(first)) return true;
    if ((last === '+' && first === '+') || (last === '-' && first === '-')) return true;
    if ((last === '/' && first === '*') || (last === '/' && first === '/')) return true;
    return false;
  };

  for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
    const text = scanner.getTokenText();
    if (needsSpace(prev, text)) out += ' ';
    out += text;
    prev = text;
  }
  return out;
}

const failures = [];
for (const [file, maxBytes] of rawBudgets) {
  const size = (await stat(file)).size;
  if (size > maxBytes) failures.push(`${file}: ${size} bytes > ${maxBytes} bytes (raw)`);
}

for (const [file, maxBytes, transform] of shippedBudgets) {
  const source = await readFile(file, 'utf8');
  const size = Buffer.byteLength(transform(source));
  if (size > maxBytes) failures.push(`${file}: ${size} bytes > ${maxBytes} bytes (shipped)`);
}

if (failures.length) {
  console.error('Web asset budget exceeded:\n' + failures.join('\n'));
  process.exit(1);
}

console.log('web-assets: size budgets passed');
