import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function text(path) {
  return (await readFile(new URL(`../${path}`, import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
}

test('requested dependency versions are pinned in manifests', async () => {
  const root = JSON.parse(await text('package.json'));
  const website = JSON.parse(await text('website/package.json'));

  assert.equal(root.devDependencies.typescript, '^7.0.2');
  assert.equal(root.devDependencies['ts-jest'], undefined);

  for (const name of [
    '@docusaurus/core',
    '@docusaurus/faster',
    '@docusaurus/plugin-content-docs',
    '@docusaurus/preset-classic',
    '@docusaurus/theme-mermaid',
  ]) assert.equal(website.dependencies[name], '3.10.2');

  for (const name of [
    '@docusaurus/module-type-aliases',
    '@docusaurus/theme-common',
    '@docusaurus/tsconfig',
    '@docusaurus/types',
  ]) assert.equal(website.devDependencies[name], '3.10.2');

  assert.equal(website.dependencies['@fontsource-variable/geist'], '^5.3.0');
  assert.equal(website.devDependencies.tsx, '^4.23.1');
});

test('requested GitHub Action majors are used everywhere', async () => {
  const workflows = await Promise.all([
    text('.github/workflows/deploy-docs.yml'),
    text('.github/workflows/docs.yml'),
    text('.github/workflows/release.yml'),
    text('.github/workflows/test.yml'),
  ]);
  const all = workflows.join('\n');

  assert.match(all, /actions\/deploy-pages@v5/);
  assert.match(all, /softprops\/action-gh-release@v3/);
  assert.match(all, /actions\/setup-node@v7/);
  assert.match(all, /pnpm\/action-setup@v6/);
  assert.match(all, /actions\/download-artifact@v8/);

  for (const stale of [
    /actions\/deploy-pages@v4/,
    /softprops\/action-gh-release@v2/,
    /actions\/setup-node@v4/,
    /pnpm\/action-setup@v4/,
    /actions\/download-artifact@v4/,
  ]) assert.doesNotMatch(all, stale);
});
