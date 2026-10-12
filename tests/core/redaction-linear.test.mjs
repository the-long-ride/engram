import test from 'node:test';
import assert from 'node:assert/strict';
import { redactSensitive, scanSensitive } from '../../dist/core/safety/security.js';
import { safeClip, sanitizeSource } from '../../dist/core/ingest/text.js';

// The pre-fix (quadratic) patterns, kept here as the behavioural reference for the linear rewrites.
const OLD_PATTERNS = [
  ['api-key', /sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}/g, '<api-key>'],
  ['jwt', /eyJ[A-Za-z0-9+/=_-]{20,}\.[A-Za-z0-9+/=_-]{10,}/g, '<api-key>'],
  ['private-key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/g, '<private-key>'],
  ['password', /password\s*[:=]\s*\S+/gi, '<password>'],
  ['secret', /[A-Z_]*(SECRET|TOKEN|KEY)\s*=\s*\S+/g, '<api-key>'],
  ['email', /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '<team-email>'],
  ['card', /\b\d{4}[\s-]\d{4}[\s-]\d{4}[\s-]\d{4}\b/g, '<card-number>'],
  ['internal-ip', /\b(10|192\.168)\.\d+\.\d+\.\d+\b/g, '<internal-host>'],
  ['gps', /\b\d{1,3}\.\d{4,},\s*\d{1,3}\.\d{4,}\b/g, '<location>']
];

function oldRedact(text) {
  let output = text;
  for (const [, pattern, replacement] of OLD_PATTERNS) output = output.replace(pattern, replacement);
  return output;
}

function oldScan(text) {
  const out = [];
  for (const [kind, pattern] of OLD_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(text);
    if (match) out.push(`${kind}:${match[0]}`);
  }
  return out;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ALPHABET = 'aAzZ09SECRTOKNYeyx._%+-@.= _';

function randomString(rand, maxLength = 60) {
  const length = Math.floor(rand() * (maxLength + 1));
  let out = '';
  for (let i = 0; i < length; i += 1) out += ALPHABET[Math.floor(rand() * ALPHABET.length)];
  return out;
}

test('linear SECRET/email redaction matches the old patterns on random strings', () => {
  const rand = mulberry32(20261008);
  for (let i = 0; i < 25000; i += 1) {
    const text = randomString(rand);
    assert.equal(redactSensitive(text), oldRedact(text), `replace differs for ${JSON.stringify(text)}`);
    const found = scanSensitive(text).map((finding) => `${finding.kind}:${finding.value}`);
    assert.deepEqual(found, oldScan(text), `match differs for ${JSON.stringify(text)}`);
  }
});

test('email detection is unchanged for local parts longer than the 64-char bound', () => {
  const rand = mulberry32(7);
  for (let i = 0; i < 500; i += 1) {
    const local = Array.from({ length: 65 + Math.floor(rand() * 200) }, () => 'abc.XYZ_09%+-'[Math.floor(rand() * 13)]).join('');
    const text = `contact ${local}@mail.example.com today`;
    const kinds = (value) => value.map((finding) => finding.kind ?? finding.split(':')[0]);
    assert.deepEqual(kinds(scanSensitive(text)), kinds(oldScan(text)), text);
    const redacted = redactSensitive(text);
    // Detection parity: the address is replaced; only the part of the local name beyond 64 chars can remain.
    assert.match(redacted, /<team-email>/);
    assert.doesNotMatch(redacted, /@mail\.example\.com/);
  }
});

test('scanSensitive and redactSensitive stay linear on long single-run lines', () => {
  for (const unit of ['a', 'A', 'A_']) {
    const text = unit.repeat(Math.ceil(200000 / unit.length));
    for (const [name, fn] of [['scanSensitive', scanSensitive], ['redactSensitive', redactSensitive]]) {
      const started = performance.now();
      fn(text);
      const elapsed = performance.now() - started;
      assert.ok(elapsed < 200, `${name} on 200k x ${JSON.stringify(unit)} took ${Math.round(elapsed)}ms`);
    }
  }
});

test('compound secret flags are redacted; look-alike flags stay', () => {
  const line = 'tool --client-secret CS2_abc --private-key PK_xyz --api-token AT2_t --secret-key=SK_q --pass PW_z';
  const clipped = safeClip(line, 400);
  for (const value of ['CS2_abc', 'PK_xyz', 'AT2_t', 'SK_q', 'PW_z']) assert.ok(!clipped.includes(value), clipped);
  assert.match(clipped, /--client-secret <redacted> --private-key <redacted> --api-token <redacted> --secret-key=<redacted> --pass <redacted>/);
  assert.equal(safeClip('build --keyboard us && mkdir -p out'), 'build --keyboard us && mkdir -p out');
  const started = performance.now();
  safeClip(`--${'a-'.repeat(100000)}`, 200000);
  sanitizeSource(`--${'a-'.repeat(100000)}`);
  assert.ok(performance.now() - started < 200);
});

test('sanitizeSource strips URL passwords and secret flag values but keeps password-less URLs', () => {
  const text = [
    'Connect with postgres://admin:S3cretPwLocal@localhost:5432/app for local work.',
    'Run `deploy --client-secret abc` in CI.',
    'Clone ssh://deploy@build-host:22/repo and https://example.com/docs.'
  ].join('\n');
  const out = sanitizeSource(text);
  assert.ok(!out.includes('S3cretPwLocal'), out);
  assert.ok(!out.includes('--client-secret abc'), out);
  assert.match(out, /postgres:\/\/admin:<redacted>@localhost:5432\/app/);
  assert.match(out, /--client-secret <redacted>/);
  assert.match(out, /Clone ssh:\/\/deploy@build-host:22\/repo and https:\/\/example\.com\/docs\./);
});

test('non-secret flags never consume an adjacent secret flag before redaction', () => {
  assert.equal(safeClip('deploy --verbose --client-secret abc'), 'deploy --verbose --client-secret <redacted>');
  assert.equal(sanitizeSource('deploy --verbose --client-secret abc'), 'deploy --verbose --client-secret <redacted>');
});
