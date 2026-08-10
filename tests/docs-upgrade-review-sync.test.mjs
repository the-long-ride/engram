import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const localeRoots = ['es', 'fr', 'ja', 'ko', 'ru', 'vi', 'zh'];
const requiredLiterals = [
  'engram upgrade --latest --review',
  'engram upgrade --latest --yes',
  '$VISUAL',
  '$EDITOR',
  'Current',
  'Proposed',
  'Diff',
  'Inline',
  'Parallel',
  'Keep current',
  'Use latest',
  'Select all visible',
  'Confirm selected changes',
  'Confirm all changes',
  'Open in editor',
  '<!-- engram:start -->',
  '.agents/engram.md'
];
const colorSemantics = {
  en: [/\bred\b/i, /\bgreen\b/i],
  es: [/rojo/i, /verde/i],
  fr: [/rouge/i, /vert/i],
  ja: [/赤/, /緑/],
  ko: [/빨간|빨강/, /초록|녹색/],
  ru: [/красн/i, /зел[её]н/i],
  vi: [/đỏ/i, /xanh/i],
  zh: [/红/, /绿/]
};

async function text(file) {
  return readFile(path.join(repoRoot, file), 'utf8');
}

function configDoc(locale) {
  return locale === 'en'
    ? 'website/docs/operations/configuration-upgrades.md'
    : `website/i18n/${locale}/docusaurus-plugin-content-docs/current/operations/configuration-upgrades.md`;
}

function releaseDoc(locale) {
  return locale === 'en'
    ? 'website/docs/operations/release-upgrade.md'
    : `website/i18n/${locale}/docusaurus-plugin-content-docs/current/operations/release-upgrade.md`;
}

function assertColorSemantics(content, locale, file) {
  for (const pattern of colorSemantics[locale]) assert.match(content, pattern, `${file} missing localized diff color semantics`);
}

test('README documents conflict review layouts and non-interactive safety', async () => {
  const readme = await text('README.md');
  for (const literal of requiredLiterals) assert.ok(readme.includes(literal), `README.md missing ${literal}`);
  assertColorSemantics(readme, 'en', 'README.md');
});

test('configuration upgrade docs document the shared Web and CLI review contract in every current locale', async () => {
  for (const locale of ['en', ...localeRoots]) {
    const file = configDoc(locale);
    const content = await text(file);
    for (const literal of requiredLiterals) assert.ok(content.includes(literal), `${file} missing ${literal}`);
    assert.ok(/pendingReviewCount/.test(content), `${file} missing pendingReviewCount`);
    assert.ok(/source hash/i.test(content), `${file} missing source hash stale-review rule`);
    assertColorSemantics(content, locale, file);
  }
});

test('release upgrade docs keep the conflict diff layout synchronized in every current locale', async () => {
  for (const locale of ['en', ...localeRoots]) {
    const file = releaseDoc(locale);
    const content = await text(file);
    for (const literal of ['Current', 'Proposed', 'Diff', 'Inline', 'Parallel', 'Keep current']) {
      assert.ok(content.includes(literal), `${file} missing ${literal}`);
    }
    assertColorSemantics(content, locale, file);
  }
});

test('contributor guide requires breaking-change and locale documentation synchronization', async () => {
  const guideline = await text('GUIDELINE.md');
  for (const literal of [
    'Breaking changes',
    'README.md',
    'canonical English docs-site',
    'all supported locale copies',
    'same change'
  ]) assert.ok(guideline.includes(literal), `GUIDELINE.md missing docs synchronization rule: ${literal}`);
});
