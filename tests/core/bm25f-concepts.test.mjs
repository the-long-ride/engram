import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBm25, buildBm25F, stem } from '../../dist/core/system/bm25.js';
import { expandConceptStems, hasStrongConceptOverlap } from '../../dist/core/memory/concepts.js';
import { route } from '../../dist/core/memory/routing.js';
import { defaultConfig } from '../../dist/core/runtime/config.js';

function makeEntry(overrides) {
  return {
    id: overrides.id,
    file: overrides.file ?? `knowledge/${overrides.id}.md`,
    type: overrides.type ?? 'knowledge',
    scope: overrides.scope ?? 'workspace',
    tags: overrides.tags ?? [],
    summary: overrides.summary ?? '',
    directive: overrides.directive,
    appliesTo: overrides.appliesTo,
    routingTerms: overrides.routingTerms,
    autoTags: overrides.autoTags,
    confidence: overrides.confidence ?? 'high',
    lifecycle: overrides.lifecycle ?? 'active',
    created: '2026-10-01',
    updated: '2026-10-01',
    ...overrides
  };
}

function makeIndex(entries) {
  return {
    version: 1,
    generated: '2026-10-01T00:00:00.000Z',
    entries
  };
}

test('buildBm25F weights title/directive matches above long diluted body matches', () => {
  const specs = [
    { name: 'title', weight: 3.0, b: 0.35 },
    { name: 'tags', weight: 2.2, b: 0.45 },
    { name: 'body', weight: 1.0, b: 0.75 }
  ];
  const filler = Array.from({ length: 40 }, (_, i) => `filler${i}`);
  const index = buildBm25F(
    [
      {
        key: 'title-hit',
        fields: {
          title: ['jwt', 'validation'],
          tags: ['auth'],
          body: ['short', 'note']
        }
      },
      {
        key: 'diluted-body-hit',
        fields: {
          title: ['general', 'notes'],
          tags: ['misc'],
          body: ['jwt', 'jwt', ...filler]
        }
      }
    ],
    specs
  );

  const scores = index.score(['jwt']);
  assert.ok((scores.get('title-hit') ?? 0) > (scores.get('diluted-body-hit') ?? 0));
  assert.equal(index.score(['nonexistent']).size, 0);

  // Verify original buildBm25 remains intact.
  const flat = buildBm25([{ key: 'a', terms: ['jwt', 'auth'] }]);
  assert.ok((flat.score(['jwt']).get('a') ?? 0) > 0);
});

test('expandConceptStems excludes input stems and hasStrongConceptOverlap rejects prose-only hits', () => {
  const input = new Set([stem('oauth'), stem('bearer')]);
  const synonyms = expandConceptStems(input);
  assert.ok(synonyms.has('jwt'));
  assert.ok(!synonyms.has('oauth'));
  assert.ok(!synonyms.has('bearer'));

  // Prose-only synonym hit must not pass gate.
  assert.equal(
    hasStrongConceptOverlap(input, new Set(['misc', 'guide']), new Set(['misc', 'guide', 'jwt'])),
    false
  );
  // Strong-field synonym hit passes gate.
  assert.equal(
    hasStrongConceptOverlap(input, new Set(['jwt', 'signing']), new Set(['jwt', 'signing'])),
    true
  );
  // 4+ stem query requires at least 2 total hits even with a strong synonym hit.
  const longQuery = new Set(['oauth', 'bearer', 'header', 'endpoint']);
  assert.equal(
    hasStrongConceptOverlap(longQuery, new Set(['jwt']), new Set(['jwt'])),
    false
  );
  assert.equal(
    hasStrongConceptOverlap(longQuery, new Set(['jwt']), new Set(['jwt', 'endpoint'])),
    true
  );
});

test('route recalls concept synonyms for strong fields and preserves zero-result precision', () => {
  const config = defaultConfig();
  const entries = [
    makeEntry({
      id: 'jwt-signing-policy',
      tags: ['jwt', 'signing'],
      directive: 'Verify JWT issuer and signature expiry on protected routes.',
      summary: 'Verify JWT issuer and signature expiry.'
    }),
    makeEntry({
      id: 'onboarding-checklist-note',
      tags: ['handbook', 'onboarding'],
      directive: 'Follow standard onboarding checklist for new hires.',
      summary: 'Mentions jwt briefly in background prose.'
    }),
    makeEntry({
      id: 'api-rate-limit-policy',
      tags: ['rate-limit', 'gateway'],
      directive: 'Enforce per-tenant rate-limit ceilings at the gateway.',
      summary: 'Enforce per-tenant rate-limit ceilings.'
    }),
    makeEntry({
      id: 'exponential-backoff-policy',
      tags: ['backoff', 'resilience'],
      directive: 'Use capped exponential backoff for transient upstream errors.',
      summary: 'Use capped exponential backoff for transient upstream errors.'
    })
  ];
  const index = makeIndex(entries);

  const authHits = route(index, 'oauth bearer validation', config);
  assert.deepEqual(authHits.map((e) => e.id), ['jwt-signing-policy']);

  const rateHits = route(index, 'api throttling quota', config);
  assert.deepEqual(rateHits.map((e) => e.id), ['api-rate-limit-policy']);

  const retryHits = route(index, 'exponential retry jitter', config);
  assert.deepEqual(retryHits.map((e) => e.id), ['exponential-backoff-policy']);

  const unrelatedHits = route(index, 'sourdough starter hydration ratio', config);
  assert.deepEqual(unrelatedHits, []);
});
