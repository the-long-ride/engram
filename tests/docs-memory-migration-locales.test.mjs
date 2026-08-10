import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const locales = ['en', 'vi', 'es', 'fr', 'zh', 'ko', 'ja', 'ru'];
const pages = [
  'cli/inject-link-upgrade.md',
  'operations/release-upgrade.md',
  'operations/faq.md'
];
const contractTokens = [
  'engram upgrade --latest',
  'engram upgrade --latest --plan',
  'engram upgrade --migrate-memories',
  'engram upgrade --latest --no-migrate-memories',
  '.pre-v3.bak',
  'schema v3',
  'evidence_status: unverified'
];

function currentDoc(locale, relativePath) {
  return locale === 'en'
    ? path.join(root, 'website', 'docs', relativePath)
    : path.join(root, 'website', 'i18n', locale, 'docusaurus-plugin-content-docs', 'current', relativePath);
}

test('README and protocol docs explain safe legacy memory migration', async () => {
  for (const file of ['README.md', 'documentation/en/operations.md', 'documentation/en/quickstart.md']) {
    const raw = await readFile(path.join(root, file), 'utf8');
    for (const token of contractTokens) assert.match(raw, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), `${file} missing ${token}`);
  }
});

test('upgrade migration contract is translated across every supported docs locale', async () => {
  for (const locale of locales) {
    for (const page of pages) {
      const raw = await readFile(currentDoc(locale, page), 'utf8');
      for (const token of contractTokens) assert.match(raw, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), `${locale}/${page} missing ${token}`);
    }
  }
});
