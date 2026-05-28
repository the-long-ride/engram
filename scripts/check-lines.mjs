import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const roots = ['src', 'scripts'];
const codeExts = new Set(['.ts', '.js', '.mjs', '.cjs']);
const limit = 350;
const failures = [];

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(file);
    if (!entry.isFile() || !codeExts.has(path.extname(file))) continue;
    const text = await readFile(file, 'utf8');
    const lines = text.split(/\r?\n/).length;
    if (lines > limit) failures.push(`${file}: ${lines} lines`);
  }
}

for (const root of roots) await walk(root).catch(() => {});
if (failures.length) {
  console.error(`Source/tooling code files must stay under ${limit} lines:\n${failures.join('\n')}`);
  process.exit(1);
}
console.log(`line-check: source/tooling code files <= ${limit} lines`);
