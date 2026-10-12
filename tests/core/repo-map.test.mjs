import test from 'node:test';
import assert from 'node:assert/strict';
import { repoMap } from '../../dist/core/ingest/repo-map.js';
import { estimateTokens } from '../../dist/core/memory/payload-plan.js';

const digest = (file, symbols = [], lines = [], kind = 'code') => ({
  file, kind, lines: lines.length ? lines : symbols.map((name) => `export function ${name}()`), symbols, hash: 'h', rawHash: 'r', chars: 1
});
const thirty = () => ['src/api', 'src/core', 'src/web'].flatMap((dir, d) => Array.from({ length: 10 }, (_, i) => digest(
  `${dir}/file${i}.ts`, [`${dir.split('/')[1]}Fn${i}`, 'shared'], [`imports: ./dep${i}.js, node:fs`, `export function ${dir.split('/')[1]}Fn${i}()`]
)));

test('repoMap groups code digests by directory with counts, symbols, and one deduplicated imports line', () => {
  const map = repoMap(thirty(), 6000);
  const headings = map.split('\n').filter((line) => line.startsWith('## '));
  assert.deepEqual(headings, ['## src/api (10 files)', '## src/core (10 files)', '## src/web (10 files)']);
  assert.ok(estimateTokens(map) <= 6000);
  assert.equal(map.split('\n').filter((line) => line.startsWith('imports:')).length, 3);
  const api = map.split('## ')[1];
  assert.equal(api.match(/node:fs/g).length, 1);
  assert.match(api, /imports: .*\.\/dep0\.js/);
  assert.doesNotMatch(map, /export function/);
});

test('repoMap trims the largest directories first, ends with omitted, and stays within the budget', () => {
  const digests = [
    ...Array.from({ length: 12 }, (_, i) => digest(`big/f${i}.ts`, [`bigFn${i}`, `padding${i}LongerName`])),
    ...Array.from({ length: 6 }, (_, i) => digest(`mid/f${i}.ts`, [`midFn${i}`, `padding${i}LongerName`])),
    ...Array.from({ length: 6 }, (_, i) => digest(`amid/f${i}.ts`, [`amidFn${i}`])),
    digest('tiny/only.ts', ['tinyFn'])
  ];
  const full = repoMap(digests, 6000);
  assert.doesNotMatch(full, /omitted:/);
  const budget = estimateTokens(full) - 40;
  const trimmed = repoMap(digests, budget);
  assert.ok(estimateTokens(trimmed) <= budget, `${estimateTokens(trimmed)} > ${budget}`);
  const last = trimmed.trimEnd().split('\n').at(-1);
  assert.match(last, /^omitted: big/);
  assert.ok(!trimmed.includes('## big '));
  assert.ok(trimmed.includes('## tiny '));
  const tight = repoMap(digests, 60);
  assert.ok(estimateTokens(tight) <= 60);
  assert.match(tight.trimEnd().split('\n').at(-1), /^omitted: big, amid, mid/);
});

test('repoMap keeps the top 12 symbols by frequency with an alphabetical tie-break', () => {
  const names = Array.from({ length: 20 }, (_, i) => `sym${String(i).padStart(2, '0')}`);
  const digests = [
    digest('lib/a.ts', [...names, 'common']),
    digest('lib/b.ts', ['common', 'sym19', 'sym18'])
  ];
  const block = repoMap(digests, 6000);
  const symbols = /^symbols: (.*)$/m.exec(block)[1].split(', ');
  assert.equal(symbols.length, 12);
  assert.deepEqual(symbols.slice(0, 3), ['common', 'sym18', 'sym19']);
  assert.deepEqual(symbols.slice(3), names.slice(0, 9));
});

test('repoMap keeps docs and config digests per file and is empty for no input', () => {
  assert.equal(repoMap([], 1000), '');
  const map = repoMap([
    digest('docs/guide.md', ['Guide'], ['# Guide', 'Always run tests.'], 'docs'),
    digest('cfg/app.json', ['a.b'], ['a.b'], 'config'),
    digest('src/x.ts', ['x']), digest('src/y.ts', ['y'])
  ], 6000);
  assert.match(map, /### docs\/guide\.md \(2 lines/);
  assert.match(map, /### cfg\/app\.json \(1 lines/);
  assert.match(map, /Always run tests\./);
  assert.equal(map.split('\n').filter((line) => line.startsWith('## ')).length, 1);
  assert.match(map, /## src \(2 files\)/);
});

test('repoMap is deterministic regardless of input order and root files use a dot directory', () => {
  const digests = thirty();
  digests.push(digest('index.ts', ['main']));
  assert.equal(repoMap(digests, 6000), repoMap([...digests].reverse(), 6000));
  assert.match(repoMap(digests, 6000), /^## \. \(1 files\)$/m);
});
