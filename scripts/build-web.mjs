// Bundle the React control panel into the existing static panel.js route.
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

await build({
  entryPoints: [path.join(root, 'src/core/web/app/main.tsx')],
  outfile: path.join(root, 'dist/core/web/panel.js'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: ['es2022'],
  sourcemap: true,
  minify: true,
  jsx: 'automatic',
  logLevel: 'info'
});
