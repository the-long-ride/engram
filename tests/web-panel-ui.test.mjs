import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

async function read(rel) {
  return readFile(new URL('../' + rel, import.meta.url), 'utf8');
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

test('React app preserves key entry UI tabs and actions in source', async () => {
  const sidebar = await read('src/core/web/app/layout/Sidebar.tsx');
  for (const label of ['Construct', 'Runtime', 'Core', 'Memories', 'Profiles', 'Workspaces', 'Connections']) {
    assert.ok(sidebar.includes(label), label);
  }
  assert.ok(sidebar.includes('engram upgrade --latest'));
  assert.ok(sidebar.includes('{upgrade}'));
  assert.ok(sidebar.includes('latestVersion'));

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
  assert.ok(copyAssets.includes('engram-logo-black-transparent.svg'));
});

test('panel css keeps existing visual primitives', async () => {
  const css = await read('src/core/web/panel.css');
  assert.ok(css.includes('--logo-url: url("/favicon.svg")'));
  assert.ok(css.includes('--logo-url: url("/engram-logo-black-transparent.svg")'));
  assert.match(css, /\.form-input\s*\{[^}]*color:\s*var\(--g1000\)/);
  assert.match(css, /\.form-select\s*\{[^}]*color:\s*var\(--g1000\)/);
  for (const token of ['.conn-grid', '.core-toolbar', '.memories-shell', '.memory-edge-dependency']) {
    assert.ok(css.includes(token), token);
  }
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
