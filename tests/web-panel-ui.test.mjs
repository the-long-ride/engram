import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

async function read(rel) {
  return readFile(new URL('../' + rel, import.meta.url), 'utf8');
}

async function readPanelCss() {
  const files = [
    'src/core/web/panel.css',
    'src/core/web/panel-core.css',
    'src/core/web/panel-data.css',
    'src/core/web/panel-graph.css',
    'src/core/web/panel-memory.css'
  ];
  const parts = await Promise.all(files.map((file) => read(file)));
  return parts.join('\n').replace(/\r\n/g, '\n');
}

async function exists(rel) {
  try {
    await stat(new URL('../' + rel, import.meta.url));
    return true;
  } catch {
    return false;
  }
}

test('panel html uses React mount shell and no inline event handlers', async () => {
  const html = await read('src/core/web/panel.html');
  assert.ok(html.includes('<div id="root"></div>'));
  assert.ok(html.includes('<script type="module" src="/panel.js"></script>'));
  assert.equal(/onclick=|onchange=|onblur=/.test(html), false);
  assert.ok(html.includes('href="/favicon.svg"'));
});

test('React TypeScript web app is split by responsibility', async () => {
  const files = [
    'src/core/web/app/main.tsx',
    'src/core/web/app/App.tsx',
    'src/core/web/app/api-client.ts',
    'src/core/web/app/types.ts',
    'src/core/web/app/components/Button.tsx',
    'src/core/web/app/components/Toggle.tsx',
    'src/core/web/app/components/Modal.tsx',
    'src/core/web/app/layout/Sidebar.tsx',
    'src/core/web/app/tabs/ConfigTab.tsx',
    'src/core/web/app/tabs/CoreTab.tsx',
    'src/core/web/app/tabs/MemoriesTab.tsx',
    'src/core/web/app/tabs/ConnectionsTab.tsx',
    'src/core/web/app/memories/MemoryGraph.tsx',
    'src/core/web/app/memories/graph-layout.ts'
  ];
  for (const file of files) {
    assert.equal(await exists(file), true, file + ' should exist');
  }
});

test('React app exposes task-oriented entry tabs and actions in source', async () => {
  const sidebar = await read('src/core/web/app/layout/Sidebar.tsx');
  for (const label of ['Memories', 'Review', 'Core', 'Connect', 'Construct']) {
    assert.ok(sidebar.includes(label), label);
  }
  const app = await read('src/core/web/app/App.tsx');
  assert.ok(app.includes("active === 'review'"));
  assert.ok(app.includes("active === 'maintain'"));
  assert.equal(app.includes('Object.keys(panes)'), false);
  assert.ok(sidebar.includes('engram upgrade --latest'));
  assert.ok(sidebar.includes('{upgrade}'));
  assert.ok(sidebar.includes('latestVersion'));
  assert.ok(sidebar.includes('Migrates active v1/v2 memories to schema v3'));

  const config = await read('src/core/web/app/tabs/ConfigTab.tsx');
  for (const token of ['Review config changes', 'I reviewed risky changes', '/api/config/validate', 'default_profile']) {
    assert.ok(config.includes(token), token);
  }
  const configUtils = await read('src/core/web/app/utils/config.ts');
  assert.ok(configUtils.includes('roles cannot contain empty role names'));
  assert.ok(configUtils.includes('\\s'));

  const memories = await read('src/core/web/app/tabs/MemoriesTab.tsx');
  assert.ok(memories.includes('/api/memories'));
  const memoryDetail = await read('src/core/web/app/memories/MemoryDetail.tsx');
  for (const token of ['view-memory', 'edit-memory', 'delete-memory']) {
    assert.ok(memoryDetail.includes(token), token);
  }
});

test('web build pipeline bundles React app to existing panel route', async () => {
  const pkg = JSON.parse(await read('package.json'));
  assert.match(pkg.scripts.build, /build-web\.mjs/);
  assert.match(pkg.dependencies.react, /^\^19\.2\./);
  assert.match(pkg.dependencies['react-dom'], /^\^19\.2\./);
  assert.match(pkg.devDependencies.esbuild, /^\^0\.(27|28)\./);

  const buildWeb = await read('scripts/build-web.mjs');
  assert.ok(buildWeb.includes('src/core/web/app/main.tsx'));
  assert.ok(buildWeb.includes('dist/core/web/panel.js'));

  const copyAssets = await read('scripts/copy-assets.mjs');
  assert.equal(copyAssets.includes("'panel.js'"), false);
  assert.ok(copyAssets.includes("asset.endsWith('.css')"));
  assert.ok(copyAssets.includes('engram-logo-black-transparent.svg'));
});

test('panel css keeps existing visual primitives', async () => {
  const css = await readPanelCss();
  assert.ok(css.includes('--logo-url: url("/favicon.svg")'));
  assert.ok(css.includes('--logo-url: url("/engram-logo-black-transparent.svg")'));
  assert.match(css, /\.form-input\s*\{[^}]*color:\s*var\(--g1000\)/);
  assert.match(css, /\.form-select\s*\{[^}]*color:\s*var\(--g1000\)/);
  for (const token of ['.conn-grid', '.core-toolbar', '.memories-shell', '.memory-edge-dependency']) {
    assert.ok(css.includes(token), token);
  }
});

test('panel css reflows index panes and expands sidebar full vertical on small viewports', async () => {
  const css = await readPanelCss();
  assert.ok(css.includes('width: 100vw;'));
  assert.ok(css.includes('right: 0;'));
  assert.ok(css.includes('padding-bottom: 24px;'));
  assert.ok(css.includes('flex-wrap: wrap;'));
  assert.ok(css.includes('justify-content: flex-start;'));
  assert.ok(css.includes('.tbl-wrap {\n    overflow-x: auto;'));
});


test('React migration restores tab icons, shared preview modal, and core prompt previews', async () => {
  const sidebar = await read('src/core/web/app/layout/Sidebar.tsx');
  assert.match(sidebar, /<svg/);
  assert.match(sidebar, /strokeWidth/);
  assert.equal(sidebar.includes('tab.slice(0, 1).toUpperCase()'), false);

  const modal = await read('src/core/web/app/components/Modal.tsx');
  assert.ok(modal.includes('copyContent'));
  assert.ok(modal.includes('aria-label="Copy content"'));
  assert.ok(modal.includes('<svg'));
  assert.equal(modal.includes('>Copy</button>'), false);

  const core = await read('src/core/web/app/tabs/CoreTab.tsx');
  assert.ok(core.includes('viewCorePrompt'));
  assert.ok(core.includes('Preview'));
  assert.ok(core.includes('core-prompt-preview'));
  assert.ok(core.includes('modal.open'));
  assert.ok(core.includes('copy-resolve-pair compact'));
});

test('React migration restores memory preview modal instead of copy-only behavior', async () => {
  const core = await read('src/core/web/app/tabs/CoreTab.tsx');
  const memories = await read('src/core/web/app/tabs/MemoriesTab.tsx');
  assert.match(core, /openMemoryPreview/);
  assert.match(memories, /openMemoryPreview/);
  assert.equal(core.includes("copyText(res.content || '', toast, 'Copied memory')"), false);
  assert.equal(memories.includes("copyText(res.content || '', toast, 'Copied memory')"), false);
});

test('React migration restores memories type filtering, pan gestures, and icon graph controls', async () => {
  const memories = await read('src/core/web/app/tabs/MemoriesTab.tsx');
  assert.ok(memories.includes('types: options.types'));
  assert.ok(memories.includes("toggleList('types'"));

  const graph = await read('src/core/web/app/memories/MemoryGraph.tsx');
  assert.match(graph, /onMouseDown/);
  assert.match(graph, /onMouseMove/);
  assert.match(graph, /panX/);
  assert.ok(graph.includes('type NodeDrag'));
  assert.ok(graph.includes("link.kind === 'dependency' ? to : from"));
  assert.ok(graph.includes('links.map(renderEdge)'));
  assert.ok(graph.includes('url(#mem-arrow-dependency)'));
  assert.ok(graph.includes('url(#mem-arrow-thin)'));
  assert.match(graph, /aria-label="Zoom in"/);
  assert.match(graph, /aria-label="Zoom out"/);
  assert.match(graph, /aria-label="Reset view"/);
  assert.match(graph, /aria-label="Toggle fullscreen"/);

  const layout = await read('src/core/web/app/memories/graph-layout.ts');
  assert.ok(layout.includes('links: MemoryLink[]'));
  assert.ok(layout.includes('connectedComponents'));
  assert.ok(layout.includes('MIN_EDGE'));
  assert.ok(layout.includes("return 'M ' + start.x + ' ' + start.y + ' L '"));
});

test('React migration restores runtime value-only copy overlay and connection paths', async () => {
  const runtime = await read('src/core/web/app/tabs/RuntimeTab.tsx');
  assert.match(runtime, /copiedKey/);
  assert.match(runtime, /setTimeout/);
  assert.ok(runtime.includes('onClick={(event) => copyRuntimeValue'));
  assert.match(runtime, /className={'rt-val/);
  assert.ok(runtime.includes('\\d+\\.\\d+'));
  assert.ok(runtime.includes('[\\\\/]'));

  const connections = await read('src/core/web/app/tabs/ConnectionsTab.tsx');
  assert.match(connections, /conn-path/);
  assert.match(connections, /agent.path/);
});

test('React migration keeps add actions top-right with tab headers and save header animation hook', async () => {
  const profiles = await read('src/core/web/app/tabs/ProfilesTab.tsx');
  const workspaces = await read('src/core/web/app/tabs/WorkspacesTab.tsx');
  assert.match(profiles, /className="tab-actions inline-actions"/);
  assert.match(workspaces, /className="tab-actions inline-actions"/);

  const config = await read('src/core/web/app/tabs/ConfigTab.tsx');
  assert.ok(config.includes("saveHeaderPulse ? ' enter' : ''"));
  assert.match(config, /saveHeaderPulse/);
});


test('Git Entry UI owns author and global Git config controls with docs and CLI help', async () => {
  const author = await read('src/core/web/app/tabs/AuthorTab.tsx');
  const help = await read('src/core/web/app/components/CommandHelp.tsx');
  const sidebar = await read('src/core/web/app/layout/Sidebar.tsx');
  const app = await read('src/core/web/app/App.tsx');
  const config = await read('src/core/web/app/tabs/ConfigTab.tsx');
  for (const token of ['setAuthorProfile', 'unsetAuthorProfile', 'planGlobalGitAuthorSync', 'planAuthorMemoryMigration']) assert.ok(author.includes(token), token);
  for (const command of ['engram author set --help', 'engram author show --help', 'engram author unset --help', 'engram author sync-git-global --help', 'engram author migrate-memories --help']) assert.ok(author.includes(command), command);
  assert.ok(help.includes('HelpLink'));
  assert.ok(help.includes('CLI:'));
  assert.ok(sidebar.includes('Settings'));
  assert.ok(sidebar.includes('["author", "Git"]'));
  assert.ok(author.includes("field.key.startsWith('global_git.')"));
  assert.ok(author.includes('ConfigFieldGroupEditor'));
  assert.ok(author.includes("scope === 'global'"));
  assert.ok(author.includes('author-source-badge'));
  assert.ok(author.includes('author-resolved-head'));
  assert.ok(config.includes("!field.key.startsWith('global_git.')"));
  assert.ok(app.includes("active === 'author'"));
});

test('configuration upgrade UI uses shared API, preview-first flow, docs link, and CLI help', async () => {
  assert.equal(await exists('src/core/web/app/tabs/UpgradeTab.tsx'), true);
  const upgrade = await read('src/core/web/app/tabs/UpgradeTab.tsx');
  const sidebar = await read('src/core/web/app/layout/Sidebar.tsx');
  const app = await read('src/core/web/app/App.tsx');
  const client = await read('src/core/web/app/api-client.ts');
  for (const token of ['loadUpgradePlan', 'applyUpgradePlan', 'Preview changes', 'Engram configuration update available', 'Workspace', 'Global', 'Conflicts']) assert.ok(upgrade.includes(token), token);
  for (const token of ['upgrade-status-banner', 'upgrade-summary-card', 'upgrade-table-scroll', 'upgrade-table', 'Actionable upgrade artifacts', '<table', '<thead', '<tbody', 'scope="col"']) assert.ok(upgrade.includes(token), token);
  const css = await read('src/core/web/panel-data.css');
  assert.match(css, /\.upgrade-table-scroll\s*\{[^}]*overflow-x:\s*auto;/);
  assert.doesNotMatch(css, /\.upgrade-table(?:\s+|[^,{]*)(?:tr|td)[^{]*\{[^}]*overflow-x:/);
  for (const label of ['All', 'Config', 'Instructions', 'Memories', 'Skillsets', 'Hooks', 'Plugins']) assert.ok(upgrade.includes(label), label);
  assert.ok(upgrade.includes("operationDoc('configuration-upgrades')"));
  assert.ok(upgrade.includes('engram upgrade --help'));
  assert.ok(sidebar.includes('Configuration update available'));
  assert.ok(sidebar.includes("setActive('upgrade')"));
  assert.ok(sidebar.includes('Copy upgrade preview command'));
  assert.ok(sidebar.includes('event.stopPropagation()'));
  assert.ok(sidebar.includes("copyText('engram upgrade --latest --plan'"));
  assert.ok(sidebar.includes('engram upgrade --latest --plan'));
  assert.ok(app.includes("active === 'upgrade'"));
  assert.ok(client.includes("/api/upgrade/plan"));
  assert.ok(client.includes("/api/upgrade/apply"));
});

test('upgrade UI requires per-conflict review and exposes current proposed diff workflow', async () => {
  const upgrade = await read('src/core/web/app/tabs/UpgradeTab.tsx');
  const review = await read('src/core/web/app/components/UpgradeConflictReviewModal.tsx');
  const diff = await read('src/core/web/app/components/UpgradeConflictDiff.tsx');
  const client = await read('src/core/web/app/api-client.ts');
  const css = await read('src/core/web/panel-data.css');
  assert.match(upgrade, /Conflicts reviewed:/);
  assert.match(upgrade, /pendingReviewCount/);
  assert.match(upgrade, /Review/);
  assert.match(review, /Current/);
  assert.match(review, /Proposed/);
  assert.match(review, /Diff/);
  assert.match(review, /Use latest/);
  assert.match(review, /Force upgrade/);
  assert.match(review, /forceMode/);
  assert.match(review, /upgrade-review-force-note/);
  assert.match(review, /Reset proposed/);
  assert.match(review, /Keep current/);
  assert.match(review, /Confirm change/);
  assert.match(review, /saveUpgradeReview/);
  assert.match(review, /Open in editor/);
  assert.match(review, /openUpgradeFile/);
  assert.ok(client.includes('/api/upgrade/open-file'));
  for (const token of ['Inline', 'Parallel', 'Diff layout', 'Inline conflict diff', 'Parallel conflict diff']) assert.ok(diff.includes(token), token);
  for (const token of ['upgrade-diff-line--removed', 'upgrade-diff-line--added', 'var(--red-bg)', 'var(--green-bg)']) assert.ok(css.includes(token), token);
  assert.match(diff, /Parallel diff horizontal scroll/);
  assert.match(diff, /currentBodyRef\.current\.scrollLeft = scrollLeft/);
  assert.match(diff, /proposedBodyRef\.current\.scrollLeft = scrollLeft/);
  assert.match(css, /\.upgrade-diff-parallel\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) minmax\(0, 1fr\)/);
  assert.match(css, /\.upgrade-diff-parallel\s*\{[^}]*overflow-x:\s*hidden;/);
  assert.match(css, /\.upgrade-diff-column-body\s*\{[^}]*overflow-x:\s*hidden;/);
  assert.match(css, /\.upgrade-diff-sync-scroll\s*\{[^}]*grid-column:\s*1 \/ -1;[^}]*overflow-x:\s*auto;/);
  for (const token of ['Confirm all changes', 'Select all visible', 'Confirm selected changes', 'saveUpgradeReviewsBatch', 'selectedReviewIds', 'isReplaceableConflictKind']) assert.ok(upgrade.includes(token) || client.includes(token), token);
  assert.ok(client.includes('/api/upgrade/review/batch'));
  const panelCss = await readPanelCss();
  assert.match(panelCss, /input\[type=["']checkbox["']\]/);
  assert.match(panelCss, /input\[type=["']checkbox["']\]:checked/);
  assert.match(panelCss, /input\[type=["']checkbox["']\]:focus-visible/);
  assert.match(panelCss, /input\[type=["']checkbox["']\]:disabled/);
  assert.match(panelCss, /#toast\.ok\s*\{[^}]*box-shadow/);
  assert.match(panelCss, /#toast\.err\s*\{[^}]*box-shadow/);
  assert.match(panelCss, /input\[type=["']checkbox["']\]::before/);
  assert.match(panelCss, /@media \(forced-colors: active\)/);
  assert.match(panelCss, /\.author-source-badge\s*\{[^}]*text-transform:\s*uppercase/);
  const toast = await read('src/core/web/app/components/Toast.tsx');
  assert.match(toast, /toast\.ok \? 'ok' : 'err'/);
  const author = await read('src/core/web/app/tabs/AuthorTab.tsx');
  assert.match(author, /source === 'workspace'[^;]*return 'Workspace'/s);
  assert.match(author, /source === 'global'[^;]*return 'Global'/s);
});
