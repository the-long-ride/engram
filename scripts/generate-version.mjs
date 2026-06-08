import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageFile = path.join(root, 'package.json');
const versionFile = path.join(root, 'src', 'core', 'runtime', 'version.ts');

const manifest = JSON.parse(await readFile(packageFile, 'utf8'));
const version = manifest.version;

if (typeof version !== 'string' || !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
  throw new Error(`package.json version is not a valid semver-like string: ${version}`);
}

const content = `/** Generated from package.json by scripts/generate-version.mjs. Do not edit directly. */
export const VERSION = ${JSON.stringify(version)};
`;

const existing = await readFile(versionFile, 'utf8').catch(() => '');
if (existing !== content) await writeFile(versionFile, content);
