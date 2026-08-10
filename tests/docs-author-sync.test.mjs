import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

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

async function text(path) { return readFile(new URL(`../${path}`, import.meta.url), 'utf8'); }

test('README, CLI registry, help, canonical docs, sidebar, and Entry stay synchronized', async () => {
  const [readme, registry, help, docs, sidebar, authorTab] = await Promise.all([
    text('README.md'),
    text('src/core/cli/command-registry.ts'),
    text('src/core/cli/help-topics.ts'),
    text('website/docs/operations/git-author-settings.md'),
    text('website/sidebars.ts'),
    text('src/core/web/app/tabs/AuthorTab.tsx')
  ]);
  for (const command of commands) {
    assert.ok(readme.includes(command), `README missing ${command}`);
    const action = command.replace('engram author ', '');
    assert.ok(registry.includes('engram author') && registry.includes(action), `registry missing ${command}`);
    assert.ok(help.includes(command), `help missing ${command}`);
    assert.ok(docs.includes(command), `docs missing ${command}`);
  }
  for (const anchor of anchors) {
    assert.ok(docs.includes(`<a id="${anchor}"></a>`), `canonical docs missing ${anchor}`);
    assert.ok(authorTab.includes(`'${anchor}'`), `Entry missing ${anchor}`);
  }
  assert.ok(sidebar.includes("'operations/git-author-settings'"));
  assert.ok(readme.includes('author_name: Jane Doe'));
  assert.ok(readme.includes('author_email: jane@example.com'));
  assert.ok(readme.includes('**Git Tab**'));
  assert.ok(!readme.includes('**Git Author Tab**'));
  assert.ok(docs.includes('Settings → Git'));
  assert.ok(!docs.includes('Settings → Git Author'));
  assert.ok(authorTab.includes('>Git</h2>'));
  assert.ok(authorTab.includes('global_git.'));
});
