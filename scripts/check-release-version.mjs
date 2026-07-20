// Verify a release tag matches the declared package version before publishing. Usage: `node scripts/check-release-version.mjs v0.0.27`.
import { readFile } from 'node:fs/promises';

const tag = process.argv[2];
if (!tag) {
  console.error('check-release-version: missing tag argument (expected: v0.0.27)');
  process.exit(2);
}
if (!/^v\d+\.\d+\.\d+$/.test(tag)) {
  console.error('check-release-version: tag "' + tag + '" is not shaped like vX.Y.Z');
  process.exit(2);
}
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const expected = 'v' + pkg.version;
if (tag !== expected) {
  console.error('check-release-version: tag "' + tag + '" does not match package version "' + expected + '".');
  process.exit(1);
}
console.log('check-release-version: tag ' + tag + ' matches package version ' + pkg.version);
