import test from 'node:test';
import assert from 'node:assert/strict';
import { findManagedBlock, replaceManagedBlock, replaceDelimitedManagedRegion, detectNewline } from '../../dist/core/upgrade/managed-block.js';

const source = [
  '# User intro',
  '',
  '<!-- engram:codex:start version=0.0.28 -->',
  'OLD ENGRAM CONTENT',
  '<!-- engram:codex:end -->',
  '',
  'User tail',
  ''
].join('\r\n');

test('managed block replacement preserves user bytes and CRLF', () => {
  const out = replaceManagedBlock(source, 'codex', 'NEW\nENGRAM');
  assert.ok(out.startsWith('# User intro\r\n\r\n'));
  assert.ok(out.endsWith('\r\n\r\nUser tail\r\n'));
  assert.match(out, /NEW\r\nENGRAM/);
  assert.ok(!out.includes('OLD ENGRAM CONTENT'));
});

test('ambiguous duplicate managed blocks are rejected', () => {
  const duplicate = `${source}\r\n${source}`;
  assert.throws(() => findManagedBlock(duplicate, 'codex'), /multiple Engram managed blocks/i);
});

test('newline detector returns source newline style', () => {
  assert.equal(detectNewline(source), '\r\n');
  assert.equal(detectNewline('a\nb\n'), '\n');
});


test('delimited force replacement preserves bytes outside the Engram region and CRLF', () => {
  const current = '# Human prefix\r\n\r\n<!-- engram:start -->\r\nOLD\r\n<!-- engram:end -->\r\n\r\nHuman suffix\r\n';
  const canonical = '<!-- engram:start -->\nNEW\nCONTENT\n<!-- engram:end -->\n';
  const out = replaceDelimitedManagedRegion(current, '<!-- engram:start -->', '<!-- engram:end -->', canonical);
  assert.equal(out, '# Human prefix\r\n\r\n<!-- engram:start -->\r\nNEW\r\nCONTENT\r\n<!-- engram:end -->\r\n\r\nHuman suffix\r\n');
});

test('delimited force replacement rejects duplicate ownership markers', () => {
  const current = '<!-- engram:start -->\nA\n<!-- engram:end -->\n<!-- engram:start -->\nB\n<!-- engram:end -->\n';
  assert.throws(
    () => replaceDelimitedManagedRegion(current, '<!-- engram:start -->', '<!-- engram:end -->', '<!-- engram:start -->\nNEW\n<!-- engram:end -->'),
    /duplicate|malformed/i
  );
});
