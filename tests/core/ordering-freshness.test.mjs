import test from 'node:test';
import assert from 'node:assert/strict';
import { orderForAgentConsumption } from '../../dist/core/memory/ordering.js';
import { hasExplicitStartupSignal, routeDetailed } from '../../dist/core/memory/routing.js';
import { defaultConfig } from '../../dist/core/runtime/config.js';

function makeEntry(overrides = {}) {
  const id = overrides.id ?? 'sample-memory';
  const type = overrides.type ?? 'knowledge';
  const scope = overrides.scope ?? 'workspace';
  const tier = overrides.tier ?? 'durable';
  const dir = tier === 'working' ? `working/${type === 'rule' ? 'rules' : type === 'skill' ? 'skills' : 'knowledge'}` : (type === 'rule' ? 'rules' : type === 'skill' ? 'skills' : 'knowledge');
  return {
    id,
    type,
    scope,
    file: overrides.file ?? `${dir}/${id}.md`,
    summary: overrides.summary ?? `Summary for ${id}`,
    tags: overrides.tags ?? [id],
    triggers: overrides.triggers ?? [],
    created: overrides.created ?? '2025-01-01',
    updated: overrides.updated ?? '2025-01-01',
    author: 'dev@example.com',
    source: 'manual',
    confidence: 'high',
    tier,
    ...overrides
  };
}

test('orderForAgentConsumption places rules and prerequisites first, older durable middle, fresh/working leaves last', () => {
  const rule = { entry: makeEntry({ id: 'r-core', type: 'rule', updated: '2025-01-01' }) };
  const prereq = { entry: makeEntry({ id: 'k-prereq', type: 'knowledge', updated: '2025-02-01' }) };
  const dependent = { entry: makeEntry({ id: 'k-dependent', type: 'knowledge', dependsOn: ['k-prereq'], updated: '2025-03-01' }) };
  const freshLeaf = { entry: makeEntry({ id: 'k-fresh', type: 'knowledge', updated: '2026-11-20' }) };
  const workingLeaf = { entry: makeEntry({ id: 'k-working', type: 'knowledge', tier: 'working', updated: '2026-11-24' }) };

  const scores = new Map([
    ['workspace:rules/r-core.md', 0.5],
    ['workspace:knowledge/k-prereq.md', 0.4],
    ['workspace:knowledge/k-dependent.md', 0.9],
    ['workspace:knowledge/k-fresh.md', 0.95],
    ['workspace:working/knowledge/k-working.md', 0.99]
  ]);

  const ordered = orderForAgentConsumption([workingLeaf, freshLeaf, dependent, prereq, rule], undefined, scores, '2026-11-25');
  const ids = ordered.map((row) => row.entry.id);

  assert.ok(ids.indexOf('r-core') < ids.indexOf('k-dependent'), `rule before dependent: ${ids}`);
  assert.ok(ids.indexOf('k-prereq') < ids.indexOf('k-dependent'), `prereq before dependent: ${ids}`);
  assert.ok(ids.indexOf('k-dependent') < ids.indexOf('k-fresh'), `older durable before fresh leaf: ${ids}`);
  assert.ok(ids.indexOf('k-dependent') < ids.indexOf('k-working'), `older durable before working leaf: ${ids}`);
});

test('orderForAgentConsumption honors graph depends_on edges and stays cycle-safe', () => {
  const a = { entry: makeEntry({ id: 'node-a', updated: '2025-01-01' }) };
  const b = { entry: makeEntry({ id: 'node-b', updated: '2025-01-01' }) };
  const graph = {
    version: 1,
    nodes: [],
    edges: [
      { from: 'memory:workspace:node-a', to: 'memory:workspace:node-b', kind: 'depends_on' },
      { from: 'memory:workspace:node-b', to: 'memory:workspace:node-a', kind: 'depends_on' }
    ]
  };
  const scores = new Map([
    ['workspace:knowledge/node-a.md', 0.8],
    ['workspace:knowledge/node-b.md', 0.6]
  ]);

  const ordered = orderForAgentConsumption([b, a], graph, scores, '2026-11-25');
  assert.deepEqual(ordered.map((row) => row.entry.id), ['node-a', 'node-b']);
});

test('hasExplicitStartupSignal detects startup tags and summaries without matching ordinary session knowledge', () => {
  assert.equal(hasExplicitStartupSignal(makeEntry({ id: 'orient', tags: ['session-start'] })), true);
  assert.equal(hasExplicitStartupSignal(makeEntry({ id: 'always-on', tags: ['always-load'] })), true);
  assert.equal(hasExplicitStartupSignal(makeEntry({ id: 'workspace-session-startup', tags: ['workspace'] })), true);
  assert.equal(hasExplicitStartupSignal(makeEntry({ id: 'session-middleware-auth', tags: ['session', 'auth'], summary: 'Validates auth session cookies' })), false);
});

test('current session routing excludes non-startup session knowledge and path-scoped rules', () => {
  const startup = makeEntry({ id: 'startup-guide', type: 'knowledge', tags: ['session-start', 'startup'] });
  const generalRule = makeEntry({ id: 'general-rule', type: 'rule', tags: ['style'] });
  const pathRule = makeEntry({ id: 'sql-rule', type: 'rule', tags: ['sql'], appliesTo: ['db/*.sql'] });
  const sessionMiddleware = makeEntry({ id: 'session-middleware', type: 'knowledge', tags: ['session', 'auth'], summary: 'Session middleware validates tokens' });

  const index = { version: 1, updated: '2026-11-25', entries: [startup, generalRule, pathRule, sessionMiddleware] };
  const routed = routeDetailed(index, 'current session', defaultConfig(), false, { day: '2026-11-25' });
  const ids = routed.entries.map((entry) => entry.id);

  assert.ok(ids.includes('startup-guide'), `expected startup-guide in ${ids}`);
  assert.ok(ids.includes('general-rule'), `expected general-rule in ${ids}`);
  assert.ok(!ids.includes('sql-rule'), `path-scoped rule should be excluded: ${ids}`);
  assert.ok(!ids.includes('session-middleware'), `non-startup session knowledge should be excluded: ${ids}`);
});

test('freshness and working-tier boosts rank recent confirmed and working knowledge above stale knowledge', () => {
  const stale = makeEntry({
    id: 'cache-ttl-stale',
    summary: 'Cache invalidation TTL policy for catalog keys',
    tags: ['cache', 'invalidation', 'ttl', 'catalog'],
    updated: '2024-01-01',
    revision: 1
  });
  const fresh = makeEntry({
    id: 'cache-ttl-fresh',
    summary: 'Cache invalidation TTL policy for catalog keys',
    tags: ['cache', 'invalidation', 'ttl', 'catalog'],
    updated: '2026-11-20',
    lastConfirmed: '2026-11-24',
    revision: 3
  });
  const working = makeEntry({
    id: 'cache-ttl-working',
    summary: 'Cache invalidation TTL policy for catalog keys',
    tags: ['cache', 'invalidation', 'ttl', 'catalog'],
    tier: 'working',
    objective: 'task',
    updated: '2026-11-24',
    validUntil: '2099-12-31'
  });

  const index = { version: 1, updated: '2026-11-25', entries: [stale, fresh, working] };
  const routed = routeDetailed(index, 'cache invalidation ttl catalog', defaultConfig(), false, { day: '2026-11-25' });
  const scoreById = new Map(
    (routed.reasons ?? []).map((reason) => [reason.key.split('/').pop()?.replace(/\.md$/, ''), reason.score ?? 0])
  );

  assert.ok((scoreById.get('cache-ttl-working') ?? 0) > (scoreById.get('cache-ttl-stale') ?? 0), 'working outranks stale');
  assert.ok((scoreById.get('cache-ttl-fresh') ?? 0) > (scoreById.get('cache-ttl-stale') ?? 0), 'fresh confirmed revision outranks stale');
});
