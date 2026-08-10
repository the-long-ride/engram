import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fields = [
  'schema_version', 'authority', 'evidence_refs', 'derived_from', 'revision',
  'supersedes', 'superseded_by', 'valid_from', 'valid_until', 'last_confirmed',
  'trace_id', 'session_id', 'source_hash', 'trust_level', 'sensitivity', 'retention'
];
const localizedHeadings = {
  en: '# Evidence traces and provenance',
  vi: '# Dấu vết bằng chứng và nguồn gốc',
  es: '# Trazas de evidencia y procedencia',
  fr: '# Traces de preuve et provenance',
  zh: '# 证据追踪与来源',
  ko: '# 증거 추적과 출처',
  ja: '# 証拠トレースと来歴',
  ru: '# Следы доказательств и происхождение'
};

function docsFile(locale) {
  return locale === 'en'
    ? path.join(root, 'website', 'docs', 'concepts', 'evidence-traces.md')
    : path.join(root, 'website', 'i18n', locale, 'docusaurus-plugin-content-docs', 'current', 'concepts', 'evidence-traces.md');
}

test('evidence trace docs exist in every supported locale with the same protocol contract', async () => {
  for (const [locale, heading] of Object.entries(localizedHeadings)) {
    const raw = await readFile(docsFile(locale), 'utf8');
    assert.match(raw, new RegExp(heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    for (const field of fields) assert.match(raw, new RegExp('`' + field + '`'), `${locale} missing ${field}`);
    assert.match(raw, /CLI/);
    assert.match(raw, /Web UI/);
  }
});

test('evidence trace page is linked from the docs sidebar', async () => {
  const sidebar = await readFile(path.join(root, 'website', 'sidebars.ts'), 'utf8');
  assert.match(sidebar, /'concepts\/evidence-traces'/);
});

test('protocol operations docs describe schema v3 and immutable traces', async () => {
  const protocol = await readFile(path.join(root, 'documentation', 'en', 'protocol.md'), 'utf8');
  const operations = await readFile(path.join(root, 'documentation', 'en', 'operations.md'), 'utf8');
  assert.match(protocol, /schema_version:\s*3/);
  assert.match(protocol, /legacy v1 and v2/i);
  assert.match(operations, /traces\/<trace-id>\.jsonl/);
  assert.match(operations, /exactly one canonical record/i);
  assert.match(operations, /authority:\s*evidence/);
});

test('compact load docs list authority and evidence refs in every current locale', async () => {
  for (const locale of Object.keys(localizedHeadings)) {
    const file = locale === 'en'
      ? path.join(root, 'website', 'docs', 'cli', 'load-search-graph.md')
      : path.join(root, 'website', 'i18n', locale, 'docusaurus-plugin-content-docs', 'current', 'cli', 'load-search-graph.md');
    const raw = await readFile(file, 'utf8');
    const compactLine = raw.split(/\r?\n/).find((line) => line.includes('`load`') && line.includes('`evidence_refs`')) ?? '';
    assert.match(compactLine, /`authority`/);
    assert.match(compactLine, /`evidence_refs`/);
  }
});
