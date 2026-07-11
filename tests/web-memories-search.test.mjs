import test from 'node:test';
import assert from 'node:assert/strict';
import { filterMemoryGraph } from '../dist/core/web/memories-search.js';

const nodes = [
  { id: 'base', memoryId: 'base-memory', file: 'rules/base.md', summary: 'Base summary', content: 'The hidden phrase is glacier.' },
  { id: 'dependent', memoryId: 'dependent-memory', file: 'rules/dependent.md', summary: 'Dependent summary', content: 'Depends on the base memory.' },
  { id: 'semantic', memoryId: 'semantic-memory', file: 'rules/semantic.md', summary: 'Semantic summary', content: 'Related graph concept.' },
  { id: 'unrelated', memoryId: 'unrelated-memory', file: 'rules/unrelated.md', summary: 'Unrelated summary', content: 'No matching terms.' }
];

const links = [
  { id: 'dependency:dependent:base', from: 'dependent', to: 'base', kind: 'dependency' },
  { id: 'semantic:base:semantic', from: 'base', to: 'semantic', kind: 'semantic' }
];

test('matches full content case-insensitively and keeps only direct matches', () => {
  const result = filterMemoryGraph(nodes, links, 'GLACIER', 'direct');

  assert.deepEqual(result.nodes.map((node) => node.id), ['base']);
  assert.deepEqual(result.links, []);
});

test('related mode expands direct matches through every graph link', () => {
  const result = filterMemoryGraph(nodes, links, 'glacier', 'related');

  assert.deepEqual(result.nodes.map((node) => node.id), ['base', 'dependent', 'semantic']);
  assert.equal(result.links.length, 2);
  assert.equal(result.nodes.some((node) => node.id === 'unrelated'), false);
});

test('empty query returns the original graph without filtering', () => {
  const result = filterMemoryGraph(nodes, links, '  ', 'direct');

  assert.equal(result.nodes, nodes);
  assert.equal(result.links, links);
});
