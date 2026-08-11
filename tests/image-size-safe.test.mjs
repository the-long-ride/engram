import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const shimUrl = new URL('../website/vendor/image-size-safe/index.mjs', import.meta.url);
const fromFileUrl = new URL('../website/vendor/image-size-safe/fromFile.mjs', import.meta.url);

test('safe image-size shim reads PNG and SVG dimensions used by docs', async () => {
  const { imageSize } = await import(shimUrl);
  const png = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(png, 0);
  png.writeUInt32BE(640, 16);
  png.writeUInt32BE(360, 20);

  assert.deepEqual(imageSize(png), { height: 360, width: 640, type: 'png' });
  assert.deepEqual(
    imageSize(Buffer.from('<svg viewBox="0 0 1280 720"></svg>')),
    { height: 720, width: 1280, type: 'svg' },
  );
});

test('safe image-size shim rejects complex vulnerable formats instead of parsing them', async () => {
  const { imageSize } = await import(shimUrl);
  const suspicious = [
    Buffer.from('icns\0\0\0\0', 'binary'),
    Buffer.from([0x00, 0x00, 0x00, 0x0c, 0x4a, 0x58, 0x4c, 0x20, 0x0d, 0x0a, 0x87, 0x0a]),
    Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63]),
  ];

  for (const input of suspicious) {
    assert.throws(() => imageSize(input), /Unsupported image type/);
  }
});

test('safe image-size fromFile API stays compatible with Docusaurus named import', async () => {
  const { imageSizeFromFile } = await import(fromFileUrl);
  const dir = await mkdtemp(path.join(os.tmpdir(), 'engram-image-size-'));
  const file = path.join(dir, 'logo.svg');
  try {
    await writeFile(file, '<svg width="320" height="180"></svg>');
    assert.deepEqual(await imageSizeFromFile(file), { height: 180, width: 320, type: 'svg' });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
