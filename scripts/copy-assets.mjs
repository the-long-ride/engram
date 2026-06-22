// Build script to copy control panel web assets to dist directory.
import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const srcDir = path.join(root, 'src', 'core', 'web');
const distDir = path.join(root, 'dist', 'core', 'web');

await mkdir(distDir, { recursive: true });

const assets = ['panel.html', 'panel.css', 'panel.js', 'favicon.svg'];
for (const asset of assets) {
  await copyFile(path.join(srcDir, asset), path.join(distDir, asset));
}
console.log('Control panel assets copied successfully.');
