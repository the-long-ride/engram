// Build script to copy static control panel web assets to dist directory.
import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const srcDir = path.join(root, 'src', 'core', 'web');
const distDir = path.join(root, 'dist', 'core', 'web');

await mkdir(distDir, { recursive: true });

const assets = ['panel.html', 'panel.css', 'favicon.svg'];
for (const asset of assets) {
  await copyFile(path.join(srcDir, asset), path.join(distDir, asset));
}
await copyFile(path.join(root, 'media', 'logo', 'engram-logo-black-transparent.svg'), path.join(distDir, 'engram-logo-black-transparent.svg'));
console.log('Control panel static assets copied successfully.');
