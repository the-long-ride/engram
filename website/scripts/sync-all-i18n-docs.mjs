import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure paths are always relative to the website directory
const websiteDir = path.resolve(__dirname, '..');
const docsDir = path.join(websiteDir, 'docs');
const versionedDir = path.join(websiteDir, 'versioned_docs', 'version-0.0.26');

const locales = ['vi', 'es', 'fr', 'zh', 'ko', 'ja', 'ru'];

function getFilesRecursively(dir) {
  const files = [];
  function traverse(currentDir) {
    if (!fs.existsSync(currentDir)) return;
    const list = fs.readdirSync(currentDir);
    for (const item of list) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (stat.isFile() && item.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }
  traverse(dir);
  return files;
}

function syncDocs() {
  const currentVersion = 'current';
  const oldVersion = 'version-0.0.26';

  // Sync docs/ (current version)
  const docFiles = getFilesRecursively(docsDir);

  for (const file of docFiles) {
    const relativePath = path.relative(docsDir, file);

    for (const locale of locales) {
      const destPath = path.join(
        websiteDir,
        'i18n',
        locale,
        'docusaurus-plugin-content-docs',
        currentVersion,
        relativePath
      );

      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.copyFileSync(file, destPath);
        console.log(`Synced default to current locale: ${destPath}`);
      }
    }
  }

  // Sync versioned_docs/version-0.0.26/
  if (fs.existsSync(versionedDir)) {
    const versionedFiles = getFilesRecursively(versionedDir);

    for (const file of versionedFiles) {
      const relativePath = path.relative(versionedDir, file);

      for (const locale of locales) {
        const destPath = path.join(
          websiteDir,
          'i18n',
          locale,
          'docusaurus-plugin-content-docs',
          oldVersion,
          relativePath
        );

        if (!fs.existsSync(destPath)) {
          fs.mkdirSync(path.dirname(destPath), { recursive: true });
          fs.copyFileSync(file, destPath);
          console.log(`Synced default to versioned locale: ${destPath}`);
        }
      }
    }
  }
}

syncDocs();
