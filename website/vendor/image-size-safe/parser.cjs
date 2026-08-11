'use strict';

const SUPPORTED_TYPES = ['bmp', 'gif', 'jpg', 'png', 'svg', 'webp'];

function asBuffer(input) {
  if (Buffer.isBuffer(input)) return input;
  if (input instanceof Uint8Array) return Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  throw new TypeError('Input must be a Buffer or Uint8Array');
}

function dimensions(width, height, type) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error(`Invalid ${type} dimensions`);
  }
  return { width, height, type };
}

function isSignature(input, bytes, offset = 0) {
  if (input.length < offset + bytes.length) return false;
  for (let i = 0; i < bytes.length; i += 1) {
    if (input[offset + i] !== bytes[i]) return false;
  }
  return true;
}

function readPng(input) {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (!isSignature(input, signature) || input.length < 24) return null;
  return dimensions(input.readUInt32BE(16), input.readUInt32BE(20), 'png');
}

function readGif(input) {
  if (input.length < 10) return null;
  const signature = input.toString('ascii', 0, 6);
  if (signature !== 'GIF87a' && signature !== 'GIF89a') return null;
  return dimensions(input.readUInt16LE(6), input.readUInt16LE(8), 'gif');
}

function readBmp(input) {
  if (input.length < 26 || input[0] !== 0x42 || input[1] !== 0x4d) return null;
  return dimensions(Math.abs(input.readInt32LE(18)), Math.abs(input.readInt32LE(22)), 'bmp');
}

function isJpegSof(marker) {
  return [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker);
}

function readJpeg(input) {
  if (input.length < 4 || input[0] !== 0xff || input[1] !== 0xd8) return null;
  let offset = 2;
  let iterations = 0;
  const maxIterations = Math.min(input.length, 65_536);

  while (offset + 1 < input.length && iterations < maxIterations) {
    iterations += 1;
    if (input[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    while (offset < input.length && input[offset] === 0xff) offset += 1;
    if (offset >= input.length) break;
    const marker = input[offset];
    offset += 1;

    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (marker === 0xd9 || marker === 0xda) break;
    if (offset + 2 > input.length) break;

    const segmentLength = input.readUInt16BE(offset);
    if (segmentLength < 2) throw new Error('Invalid jpg segment length');
    if (isJpegSof(marker)) {
      if (offset + 7 > input.length) break;
      return dimensions(input.readUInt16BE(offset + 5), input.readUInt16BE(offset + 3), 'jpg');
    }

    const nextOffset = offset + segmentLength;
    if (nextOffset <= offset || nextOffset > input.length) break;
    offset = nextOffset;
  }
  throw new Error('Invalid jpg image');
}

function read24LE(input, offset) {
  return input[offset] | (input[offset + 1] << 8) | (input[offset + 2] << 16);
}

function readWebp(input) {
  if (input.length < 16 || input.toString('ascii', 0, 4) !== 'RIFF' || input.toString('ascii', 8, 12) !== 'WEBP') return null;
  const chunk = input.toString('ascii', 12, 16);
  if (chunk === 'VP8X' && input.length >= 30) {
    return dimensions(read24LE(input, 24) + 1, read24LE(input, 27) + 1, 'webp');
  }
  if (chunk === 'VP8 ' && input.length >= 30 && isSignature(input, [0x9d, 0x01, 0x2a], 23)) {
    return dimensions(input.readUInt16LE(26) & 0x3fff, input.readUInt16LE(28) & 0x3fff, 'webp');
  }
  if (chunk === 'VP8L' && input.length >= 25 && input[20] === 0x2f) {
    const bits = input.readUInt32LE(21);
    const width = (bits & 0x3fff) + 1;
    const height = ((bits >>> 14) & 0x3fff) + 1;
    return dimensions(width, height, 'webp');
  }
  throw new Error('Invalid webp image');
}

function parseSvgNumber(value) {
  if (value === undefined) return null;
  const match = /^\s*([0-9]+(?:\.[0-9]+)?)(?:px)?\s*$/i.exec(value);
  return match ? Number(match[1]) : null;
}

function readSvg(input) {
  const probe = input.toString('utf8', 0, Math.min(input.length, 128 * 1024));
  const svgStart = probe.search(/<svg\b/i);
  if (svgStart < 0) return null;
  const tagEnd = probe.indexOf('>', svgStart);
  if (tagEnd < 0) throw new Error('Invalid svg image');
  const tag = probe.slice(svgStart, tagEnd + 1);
  const widthMatch = /\bwidth\s*=\s*["']([^"']+)["']/i.exec(tag);
  const heightMatch = /\bheight\s*=\s*["']([^"']+)["']/i.exec(tag);
  let width = parseSvgNumber(widthMatch?.[1]);
  let height = parseSvgNumber(heightMatch?.[1]);

  const viewBox = /\bviewBox\s*=\s*["']\s*[-+\d.eE]+[\s,]+[-+\d.eE]+[\s,]+([-+\d.eE]+)[\s,]+([-+\d.eE]+)\s*["']/i.exec(tag);
  if (viewBox) {
    width ??= Number(viewBox[1]);
    height ??= Number(viewBox[2]);
  }
  if (width === null || height === null) throw new Error('SVG must define width/height or viewBox');
  return dimensions(width, height, 'svg');
}

function imageSize(input) {
  const buffer = asBuffer(input);
  if (buffer.length === 0) throw new Error('Empty input');

  for (const reader of [readPng, readGif, readBmp, readJpeg, readWebp, readSvg]) {
    const result = reader(buffer);
    if (result) return result;
  }
  throw new Error('Unsupported image type');
}

function disableTypes(types) {
  if (types === undefined) return;
  if (!Array.isArray(types)) throw new TypeError('types must be an array');
  for (const type of types) {
    if (!SUPPORTED_TYPES.includes(type)) throw new Error(`Unsupported image type: ${type}`);
  }
}

module.exports = { imageSize, types: [...SUPPORTED_TYPES], disableTypes };
