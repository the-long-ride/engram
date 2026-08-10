import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const locales = ['es', 'fr', 'ja', 'ko', 'ru', 'vi', 'zh'];
const patterns = {
  es: [/forzar|forzada/i, /bloque.*Engram/i, /archivo.*generado/i, /masiva.*no|no.*masiva/i, /converg|verific/i],
  fr: [/forcer|forcé/i, /bloc.*Engram/i, /fichier.*généré/i, /lot.*force jamais|force jamais.*lot/i, /converg|vérifi/i],
  ja: [/強制/, /Engram.*ブロック|ブロック.*Engram/, /生成.*ファイル/, /一括.*強制|強制.*一括/, /収束|検証/],
  ko: [/강제/, /Engram.*블록|블록.*Engram/, /생성.*파일/, /일괄.*강제|강제.*일괄/, /수렴|검증/],
  ru: [/принуд/i, /блок.*Engram/i, /сгенерирован.*файл/i, /пакет.*принуд|принуд.*пакет/i, /сходим|провер/i],
  vi: [/buộc|cưỡng/i, /khối.*Engram/i, /tệp.*được tạo|tệp.*sinh/i, /hàng loạt.*buộc|buộc.*hàng loạt/i, /hội tụ|xác minh/i],
  zh: [/强制/, /Engram.*块|块.*Engram/, /生成.*文件/, /批量.*强制|强制.*批量/, /收敛|验证/]
};

function configDoc(locale) {
  return `website/i18n/${locale}/docusaurus-plugin-content-docs/current/operations/configuration-upgrades.md`;
}

function releaseDoc(locale) {
  return `website/i18n/${locale}/docusaurus-plugin-content-docs/current/operations/release-upgrade.md`;
}

test('ownership-aware force-upgrade safety is fully localized in every supported docs locale', async () => {
  for (const locale of locales) {
    for (const file of [configDoc(locale), releaseDoc(locale)]) {
      const content = await readFile(path.join(process.cwd(), file), 'utf8');
      for (const pattern of patterns[locale]) assert.match(content, pattern, `${file} missing localized ownership-aware upgrade concept ${pattern}`);
      assert.ok(content.includes('Force upgrade'), `${file} missing the literal UI action name Force upgrade`);
    }
  }
});
