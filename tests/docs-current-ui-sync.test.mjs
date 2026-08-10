import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const locales = ['es', 'fr', 'ja', 'ko', 'ru', 'vi', 'zh'];
const uiFeedbackPatterns = {
  en: [/green/i, /red/i, /success/i, /error/i],
  es: [/verde/i, /rojo/i, /éxito/i, /error/i],
  fr: [/vert/i, /rouge/i, /succès/i, /erreur/i],
  ja: [/緑/, /赤/, /成功/, /エラー|失敗/],
  ko: [/초록|녹색/, /빨간|빨강/, /성공/, /오류|에러/],
  ru: [/зел[её]н/i, /красн/i, /успех|успеш/i, /ошиб/i],
  vi: [/xanh/i, /đỏ/i, /thành công/i, /lỗi/i],
  zh: [/绿/, /红/, /成功/, /错误|失败/]
};
const uiControlPatterns = {
  en: [/checkbox/i, /toast/i],
  es: [/casilla/i, /notificaci/i],
  fr: [/case à cocher/i, /notification/i],
  ja: [/チェックボックス/, /トースト/],
  ko: [/체크박스/, /토스트/],
  ru: [/флаж/i, /уведомлен/i],
  vi: [/ô chọn/i, /thông báo/i],
  zh: [/复选框/, /提示/]
};

async function text(file) {
  return readFile(path.join(process.cwd(), file), 'utf8');
}

function authorDoc(locale) {
  return locale === 'en'
    ? 'website/docs/operations/git-author-settings.md'
    : `website/i18n/${locale}/docusaurus-plugin-content-docs/current/operations/git-author-settings.md`;
}

function upgradeDoc(locale) {
  return locale === 'en'
    ? 'website/docs/operations/configuration-upgrades.md'
    : `website/i18n/${locale}/docusaurus-plugin-content-docs/current/operations/configuration-upgrades.md`;
}

test('README maps current Entry source badge, checkbox, and toast UI semantics', async () => {
  const readme = await text('README.md');
  for (const literal of ['WORKSPACE', 'GLOBAL', 'checkbox', 'toast', 'green', 'red']) {
    assert.ok(readme.toLowerCase().includes(literal.toLowerCase()), `README.md missing current UI semantic ${literal}`);
  }
});

test('resolved identity source badges are documented in every supported current docs locale', async () => {
  for (const locale of ['en', ...locales]) {
    const file = authorDoc(locale);
    const content = await text(file);
    for (const literal of ['GLOBAL', 'WORKSPACE']) assert.ok(content.includes(literal), `${file} missing ${literal} resolved-source badge`);
  }
});

test('checkbox states and success/error toast colors are documented in every supported current docs locale', async () => {
  for (const locale of ['en', ...locales]) {
    const file = upgradeDoc(locale);
    const content = await text(file);
    for (const pattern of uiControlPatterns[locale]) assert.match(content, pattern, `${file} missing localized control semantic ${pattern}`);
    for (const pattern of uiFeedbackPatterns[locale]) assert.match(content, pattern, `${file} missing localized feedback semantic ${pattern}`);
    for (const host of ['Codex', 'Claude', 'Gemini']) assert.ok(content.includes(host), `${file} missing physical-file coalescing host ${host}`);
  }
});

const upgradeDashboardPatterns = {
  en: [/status banner/i, /Workspace.*Global.*Conflicts/i, /artifact table/i, /horizontal scroll/i],
  es: [/banner de estado/i, /Workspace.*Global.*Conflicts/i, /tabla.*artefact/i, /desplazamiento horizontal/i],
  fr: [/bannière (?:d’état|de statut)/i, /Workspace.*Global.*Conflicts/i, /tableau.*artefact/i, /défilement horizontal/i],
  ja: [/ステータスバナー/, /Workspace.*Global.*Conflicts/, /テーブル/, /横スクロール/],
  ko: [/상태 배너/, /Workspace.*Global.*Conflicts/, /테이블/, /가로 스크롤/],
  ru: [/баннер.*состоя/i, /Workspace.*Global.*Conflicts/i, /таблиц/i, /горизонтальн.*прокрут/i],
  vi: [/biểu ngữ trạng thái/i, /Workspace.*Global.*Conflicts/i, /bảng/i, /cuộn ngang/i],
  zh: [/状态横幅/, /Workspace.*Global.*Conflicts/, /表/, /水平滚动/]
};

test('Updates dashboard and actionable table layout are documented in every supported current docs locale', async () => {
  for (const locale of ['en', ...locales]) {
    const file = upgradeDoc(locale);
    const content = await text(file);
    for (const pattern of upgradeDashboardPatterns[locale]) assert.match(content, pattern, `${file} missing dashboard/table semantic ${pattern}`);
  }
});
