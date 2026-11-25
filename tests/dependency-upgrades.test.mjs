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
  assert.equal(website.devDependencies.tsx, '^4.23.11');
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

test('website replaces vulnerable image-size registry package with bounded local shim', async () => {
  const workspace = await text('website/pnpm-workspace.yaml');
  const lock = await text('website/pnpm-lock.yaml');
  const shim = JSON.parse(await text('website/vendor/image-size-safe/package.json'));

  assert.match(workspace, /image-size: ['\"]link:\.\/vendor\/image-size-safe['\"]/);
  assert.doesNotMatch(workspace, /patchedDependencies:[\s\S]*image-size@2\.0\.2/);
  assert.doesNotMatch(lock, /image-size@2\.0\.2/);
  assert.doesNotMatch(lock, /image-size: 2\.0\.2\(patch_hash=/);
  assert.match(lock, /image-size: link:vendor\/image-size-safe/);
  assert.equal(shim.name, 'image-size');
  assert.equal(shim.version, '2.0.3-engram-safe.1');
  assert.equal(shim.private, true);
});

function parseMinSemver(range) {
  assert.equal(typeof range, 'string', `Expected semver range string, got ${typeof range}`);
  const match = range.trim().match(/^(?:\^|>=)?(\d+)\.(\d+)\.(\d+)/);
  assert.ok(match, `Unable to parse semver floor from "${range}"`);
  return match.slice(1, 4).map(Number);
}

function assertMinVersion(actualRange, minVersion, label) {
  const actual = parseMinSemver(actualRange);
  const expected = minVersion.split('.').map(Number);
  const isAtLeast =
    actual[0] > expected[0] ||
    (actual[0] === expected[0] &&
      (actual[1] > expected[1] || (actual[1] === expected[1] && actual[2] >= expected[2])));
  assert.ok(isAtLeast, `${label} expected >= ${minVersion}, got "${actualRange}"`);
}

function parseYamlOverrides(yaml) {
  const section = yaml.match(/^overrides:\n((?:[ \t]+.*\n?)*)/m);
  assert.ok(section, 'Expected overrides: section in pnpm-workspace.yaml');
  const map = {};
  for (const line of section[1].split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^(['"]?[^:'"]+['"]?):\s*['"]?([^'"]+)['"]?$/);
    if (match) {
      map[match[1].replace(/^['"]|['"]$/g, '')] = match[2].trim();
    }
  }
  return map;
}

test('security override minimum ranges are enforced across root and website manifests', async () => {
  const rootPkg = JSON.parse(await text('package.json'));
  const rootWorkspace = parseYamlOverrides(await text('pnpm-workspace.yaml'));
  const websitePkg = JSON.parse(await text('website/package.json'));
  const websiteWorkspace = parseYamlOverrides(await text('website/pnpm-workspace.yaml'));

  const rootMins = {
    glob: '14.0.6',
    minimatch: '11.0.9',
    'fast-xml-parser': '5.12.1',
    dompurify: '3.5.0',
    'fast-uri': '3.1.9',
    undici: '7.30.1',
  };

  for (const [pkg, min] of Object.entries(rootMins)) {
    assertMinVersion(rootPkg.overrides?.[pkg], min, `package.json overrides.${pkg}`);
    assertMinVersion(rootWorkspace[pkg], min, `pnpm-workspace.yaml overrides.${pkg}`);
  }

  const websiteMins = {
    'follow-redirects': '1.16.3',
    'launch-editor': '2.14.2',
    dompurify: '3.5.0',
    'body-parser': '1.20.9',
    undici: '7.30.1',
    'serialize-javascript': '7.1.4',
    'fast-uri': '3.1.9',
    qs: '6.17.1',
    joi: '17.13.9',
  };

  for (const [pkg, min] of Object.entries(websiteMins)) {
    assertMinVersion(websiteWorkspace[pkg], min, `website/pnpm-workspace.yaml overrides.${pkg}`);
  }

  assertMinVersion(
    websitePkg.overrides?.['serialize-javascript'],
    '7.1.4',
    'website/package.json overrides.serialize-javascript',
  );
});
