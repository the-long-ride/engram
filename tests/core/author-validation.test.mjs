import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeAuthorEmail,
  normalizeAuthorName,
  normalizeAuthorProfile
} from '../../dist/core/author/validate.js';

test('author validation trims and preserves Unicode names', () => {
  assert.equal(normalizeAuthorName('  Nguyễn Văn An  '), 'Nguyễn Văn An');
  assert.equal(normalizeAuthorEmail('  an@example.com  '), 'an@example.com');
});

test('author name rejects empty, controls, newlines, NUL, and over 200 code points', () => {
  for (const value of ['', '   ', 'Jane\nDoe', 'Jane\rDoe', 'Jane\0Doe', `${'界'.repeat(201)}`]) {
    assert.throws(() => normalizeAuthorName(value), /author name/i);
  }
});

test('author email rejects malformed, whitespace, controls, angle brackets, and over 320 characters', () => {
  for (const value of ['jane', '@example.com', 'jane@', 'ja ne@example.com', 'jane\n@example.com', '<jane@example.com>', `${'a'.repeat(310)}@example.com`]) {
    assert.throws(() => normalizeAuthorEmail(value), /author email/i);
  }
});

test('author profile validation is all-or-nothing', () => {
  assert.deepEqual(normalizeAuthorProfile({ name: ' Jane Doe ', email: ' jane@example.com ' }), {
    name: 'Jane Doe', email: 'jane@example.com'
  });
  assert.throws(() => normalizeAuthorProfile({ name: 'Jane Doe', email: '' }), /author email/i);
});
