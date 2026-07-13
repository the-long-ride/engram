/** Generate the runtime version module from package metadata. */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageFile = path.join(root, 'package.json');
const versionFile = path.join(root, 'src', 'core', 'runtime', 'version.ts');
const docsVersionsFile = path.join(root, 'website', 'versions.json');
const docsSiteFile = path.join(root, 'src', 'core', 'runtime', 'docs-site.ts');

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

const docsVersions = JSON.parse(await readFile(docsVersionsFile, 'utf8'));
if (!Array.isArray(docsVersions) || docsVersions.some((value) => typeof value !== 'string')) {
  throw new Error('website/versions.json must be a JSON array of version strings');
}
if (docsVersions.length === 0) {
  throw new Error('website/versions.json must contain at least one published docs version');
}
const docsSiteContent = `/** Generated from website/versions.json by scripts/generate-version.mjs. Do not edit directly. */
export const DOCS_SITE_BASE_URL = "https://the-long-ride.github.io/engram/docs";
export const DOCS_SITE_VERSIONS = ${JSON.stringify(docsVersions)} as const;
export const DOCS_SITE_LATEST_VERSION = ${JSON.stringify(docsVersions[docsVersions.length - 1])};
`;

const existingDocsSite = await readFile(docsSiteFile, 'utf8').catch(() => '');
if (existingDocsSite !== docsSiteContent) await writeFile(docsSiteFile, docsSiteContent);
