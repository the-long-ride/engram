import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const websiteDir = path.resolve(__dirname, '..');
const docsDir = path.join(websiteDir, 'docs');
const requestedVersion = process.argv[2];
const versionName = requestedVersion ? `version-${requestedVersion.replace(/^version-/, '')}` : undefined;
const versionedDir = versionName ? path.join(websiteDir, 'versioned_docs', versionName) : undefined;
const locales = ['vi', 'es', 'fr', 'zh', 'ko', 'ja', 'ru'];

function getFilesRecursively(dir) {
  const files = [];
  function traverse(currentDir) {
    if (!fs.existsSync(currentDir)) return;
    for (const item of fs.readdirSync(currentDir)) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) traverse(fullPath);
      else if (stat.isFile() && item.endsWith('.md')) files.push(fullPath);
    }
  }
  traverse(dir);
  return files;
}

function copyMissing(sourceDir, destinationVersion, message) {
  for (const file of getFilesRecursively(sourceDir)) {
    const relativePath = path.relative(sourceDir, file);
    for (const locale of locales) {
      const destPath = path.join(
        websiteDir,
        'i18n',
        locale,
        'docusaurus-plugin-content-docs',
        destinationVersion,
        relativePath,
      );
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.copyFileSync(file, destPath);
        console.log(`${message}: ${destPath}`);
      }
    }
  }
}

copyMissing(docsDir, 'current', 'Synced default to current locale');

if (versionedDir && fs.existsSync(versionedDir)) {
  copyMissing(versionedDir, versionName, 'Synced default to versioned locale');
}
