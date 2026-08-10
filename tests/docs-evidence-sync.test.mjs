import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const locales = ['en', 'vi', 'es', 'fr', 'zh', 'ko', 'ja', 'ru'];

function currentDoc(locale, relativePath) {
  return locale === 'en'
    ? path.join(root, 'website', 'docs', relativePath)
    : path.join(root, 'website', 'i18n', locale, 'docusaurus-plugin-content-docs', 'current', relativePath);
}

const pageContracts = {
  'intro.md': ['schema_version: 3', 'authority', 'evidence_refs'],
  'concepts/protocol.md': ['traces/<trace-id>.jsonl', 'authority: evidence', 'evidence_refs'],
  'concepts/memory-types.md': ['schema_version: 3', 'authority', 'revision'],
  'concepts/write-path.md': ['engram observe --file', 'save-session --file', 'trace_id'],
  'concepts/safety.md': ['trust_level', 'sensitivity', 'retention'],
  'cli/save-session.md': ['engram observe --file', '.agents/.engram/traces/', 'evidence_refs'],
  'quickstart.md': ['engram observe --file', 'save-session --file'],
  'entry/memories.md': ['evidence_refs', 'derived_from', 'revision'],
  'entry/field-reference.md': ['schema_version', 'authority', 'evidence_refs', 'valid_until', 'last_confirmed']
};

const localizedEvidenceLabels = {
  en: 'Evidence-backed memory',
  vi: 'Bộ nhớ có bằng chứng',
  es: 'Memoria respaldada por evidencia',
  fr: 'Mémoire étayée par des preuves',
  zh: '证据支持的记忆',
  ko: '증거 기반 메모리',
  ja: '証拠に基づくメモリ',
  ru: 'Память, подкреплённая доказательствами'
};

test('README describes the evidence foundation and CLI/Web parity', async () => {
  const readme = await readFile(path.join(root, 'README.md'), 'utf8');
  for (const token of [
    'immutable evidence trace', 'schema v3', 'authority', 'evidence_refs',
    'engram observe --file', 'save-session --file', 'CLI and Entry Web UI'
  ]) {
    assert.match(readme, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), `README missing ${token}`);
  }
});

test('all evidence-related docs are synchronized in every supported locale', async () => {
  for (const locale of locales) {
    for (const [relativePath, tokens] of Object.entries(pageContracts)) {
      const raw = await readFile(currentDoc(locale, relativePath), 'utf8');
      assert.match(raw, new RegExp(localizedEvidenceLabels[locale].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${locale}/${relativePath} missing localized evidence heading`);
      for (const token of tokens) assert.match(raw, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), `${locale}/${relativePath} missing ${token}`);
    }
  }
});

test('memory-type docs no longer claim all current memories require legacy sections', async () => {
  for (const locale of locales) {
    const raw = await readFile(currentDoc(locale, 'concepts/memory-types.md'), 'utf8');
    assert.doesNotMatch(raw, /Every active memory file has `Context`, `Content`, and `Example` sections\./);
  }
});

test('homepage translations expose evidence-backed storage in every locale', async () => {
  const source = await readFile(path.join(root, 'website', 'src', 'data', 'translations.ts'), 'utf8');
  const titles = [
    'Evidence-backed file memory', 'Bộ nhớ tệp có bằng chứng',
    'Memoria de archivos con evidencia', 'Mémoire fichier étayée par des preuves',
    '证据支持的文件记忆', '증거 기반 파일 메모리',
    '証拠に基づくファイルメモリ', 'Файловая память с доказательствами'
  ];
  for (const title of titles) assert.match(source, new RegExp(title), `homepage missing ${title}`);
});
