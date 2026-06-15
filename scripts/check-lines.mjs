/** Verify each source/tooling file declares its responsibility. */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const roots = ['src', 'scripts'];
const codeExts = new Set(['.ts', '.js', '.mjs', '.cjs']);
const failures = [];

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(file);
    if (!entry.isFile() || !codeExts.has(path.extname(file))) continue;
    const text = await readFile(file, 'utf8');
    const firstLine = firstCodeLine(text);
    if (!isFileSummary(firstLine)) failures.push(`${file}: missing top file responsibility summary`);
  }
}

function firstCodeLine(text) {
  return text.split(/\r?\n/).find((line) => line.trim() && !line.trim().startsWith('#!'))?.trim() ?? '';
}

function isFileSummary(line) {
  return /^\/\*\*\s+\S.*\*\/$/.test(line) || /^\/\/\s+\S/.test(line);
}

for (const root of roots) await walk(root).catch(() => {});
if (failures.length) {
  console.error(`Source/tooling code files must declare their responsibility:\n${failures.join('\n')}`);
  process.exit(1);
}
console.log('line-check: source/tooling code files declare responsibility summaries');
