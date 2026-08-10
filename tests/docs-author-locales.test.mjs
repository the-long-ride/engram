import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const locales = ['en', 'vi', 'es', 'fr', 'zh', 'ko', 'ja', 'ru'];
const commands = [
  'engram author show',
  'engram author set',
  'engram author unset',
  'engram author sync-git-global',
  'engram author migrate-memories'
];
const anchors = [
  'global-author',
  'workspace-override',
  'resolution-order',
  'remove-an-author-profile',
  'sync-to-global-git',
  'migrate-existing-memories'
];

const relatedDocs = [
  'cli/overview.md',
  'cli/profiles-workspaces-config.md',
  'cli/save-session.md',
  'concepts/memory-types.md',
  'entry/index.md',
  'entry/field-reference.md',
  'operations/team-git-workflow.md',
  'operations/release-upgrade.md',
  'operations/troubleshooting.md'
];
function currentDocsRoot(locale) {
  return locale === 'en'
    ? new URL('../website/docs/', import.meta.url)
    : new URL(`../website/i18n/${locale}/docusaurus-plugin-content-docs/current/`, import.meta.url);
}

function pathFor(locale) {
  return locale === 'en'
    ? new URL('../website/docs/operations/git-author-settings.md', import.meta.url)
    : new URL(`../website/i18n/${locale}/docusaurus-plugin-content-docs/current/operations/git-author-settings.md`, import.meta.url);
}
function proseWithoutCode(value) {
  return value.replace(/```[\s\S]*?```/g, '').replace(/^---[\s\S]*?---/m, '').replace(/\s+/g, ' ').trim();
}

test('Git author canonical page exists with complete semantics in every locale', async () => {
  const english = await readFile(pathFor('en'), 'utf8');
  const englishProse = proseWithoutCode(english);
  for (const locale of locales) {
    const doc = await readFile(pathFor(locale), 'utf8');
    for (const command of commands) assert.ok(doc.includes(command), `${locale} missing ${command}`);
    for (const anchor of anchors) assert.ok(doc.includes(`<a id="${anchor}"></a>`), `${locale} missing ${anchor}`);
    for (const key of ['author_name', 'author_email']) assert.ok(doc.includes(key), `${locale} missing ${key}`);
    assert.match(doc, /--confirm/);
    assert.ok(doc.includes('<!-- future-memories-only -->'), `${locale} missing future-memory semantic marker`);
    assert.ok(doc.includes('<!-- workspace-never-syncs-global-git -->'), `${locale} missing workspace safety semantic marker`);
    if (locale !== 'en') assert.notEqual(proseWithoutCode(doc), englishProse, `${locale} copied English prose`);
  }
});


test('related Git author docs are synchronized in every locale', async () => {
  for (const locale of locales) {
    for (const relative of relatedDocs) {
      const doc = await readFile(new URL(relative, currentDocsRoot(locale)), 'utf8');
      for (const command of ['engram author show', 'engram author set', 'engram author unset', 'engram author sync-git-global', 'engram author migrate-memories']) {
        assert.ok(doc.includes(command), `${locale}/${relative} missing ${command}`);
      }
      assert.ok(doc.includes('git-author-settings.md'), `${locale}/${relative} missing canonical link`);
    }
  }
});
