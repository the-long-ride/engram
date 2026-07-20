// Drift regression: the panel's navigation labels, README, CHANGELOG, and versioned docs must agree on the canonical Entry UI vocabulary and current package version. Locks down the P1 finding in `engram-repo-review.md`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('.');
const CANONICAL_TAB_LABELS = ['Construct', 'Memories', 'Review', 'Maintain', 'Connect'];
const STALE_TAB_TERMS = ['Core Tab', 'Connections Tab'];

async function read(rel) {
  return readFile(path.join(root, rel), 'utf8');
}

function parseTabLabelsFromSidebar(source) {
  // Matches lines like:   ["config", "Construct"],
  return Array.from(source.matchAll(/\[\s*['"][a-z]+['"]\s*,\s*['"]([A-Za-z ]+)['"]\s*\]/g))
    .map((m) => m[1]);
}

test('Sidebar exposes the canonical five tab labels in source order', async () => {
  const sidebar = await read('src/core/web/app/layout/Sidebar.tsx');
  const labels = parseTabLabelsFromSidebar(sidebar);
  assert.deepEqual(labels, CANONICAL_TAB_LABELS);
  // Internal TabName union must remain the same five keys.
  const types = await read('src/core/web/app/types.ts');
  assert.match(types, /export type TabName = 'recall' \| 'review' \| 'maintain' \| 'connect' \| 'config';/);
});

test('README documents every canonical tab label and avoids stale tab wording', async () => {
  const readme = await read('README.md');
  // The install section describes the four operational tabs by their `<Label> Tab` heading.
  // The Review tab uses the same label inside the canonical tab-order summary and elsewhere,
  // so it is not required to have its own install bullet.
  for (const label of ['Connect', 'Construct', 'Maintain', 'Memories']) {
    assert.ok(readme.includes(label + ' Tab'), 'README must describe the ' + label + ' Tab');
  }
  for (const label of CANONICAL_TAB_LABELS) {
    assert.ok(readme.includes(label), 'README must mention canonical label "' + label + '"');
  }
  for (const stale of STALE_TAB_TERMS) {
    assert.equal(readme.includes(stale), false, 'README still uses stale tab wording "' + stale + '"');
  }
  assert.equal(readme.includes('premium web interface'), false, 'README must not use promotional "premium web interface" wording');
});

test('README tab-order sentence lists each canonical label once', async () => {
  const readme = await read('README.md');
  const sentence = /The Entry UI groups work by task: ([\w, ]+)\./.exec(readme);
  assert.ok(sentence, 'README must carry the canonical tab-order sentence');
  const listed = sentence[1].replace(/\s+and\s+/g, ', ').split(/,\s*/).filter(Boolean);
  assert.deepEqual(listed.sort(), [...CANONICAL_TAB_LABELS].sort());
});

test('package.json, CHANGELOG head, and latest versioned docs folder agree on the current version', async () => {
  const pkg = JSON.parse(await read('package.json'));
  const changelog = await read('CHANGELOG.md');
  const head = /^## (\d+\.\d+\.\d+)/m.exec(changelog);
  assert.ok(head, 'CHANGELOG must have a semver heading at top');
  assert.equal(head[1], pkg.version, 'CHANGELOG head must match package.json version');

  const versionedDirs = (await readdir(path.join(root, 'website', 'versioned_docs')))
    .filter((entry) => /^version-\d+\.\d+\.\d+$/.test(entry))
    .map((entry) => entry.replace(/^version-/, ''))
    .sort((a, b) => {
      const [a1, a2, a3] = a.split('.').map(Number);
      const [b1, b2, b3] = b.split('.').map(Number);
      return a1 - b1 || a2 - b2 || a3 - b3;
    });
  assert.ok(versionedDirs.length > 0, 'versioned_docs must contain at least one released version');
  const latestPublished = versionedDirs[versionedDirs.length - 1];
  assert.equal(latestPublished, pkg.version, 'latest versioned_docs folder must match the package version (' + pkg.version + ')');
});
