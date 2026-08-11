'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { imageSize } = require('./parser.cjs');

const MAX_INPUT_SIZE = 512 * 1024;
let concurrency = 100;

function setConcurrency(value) {
  if (!Number.isInteger(value) || value < 1) throw new RangeError('Concurrency must be a positive integer');
  concurrency = value;
}

async function imageSizeFromFile(filePath) {
  const handle = await fs.open(path.resolve(filePath), 'r');
  try {
    const { size } = await handle.stat();
    if (size <= 0) throw new Error('Empty file');
    const inputSize = Math.min(size, MAX_INPUT_SIZE);
    const input = Buffer.allocUnsafe(inputSize);
    const { bytesRead } = await handle.read(input, 0, inputSize, 0);
    return imageSize(input.subarray(0, bytesRead));
  } finally {
    await handle.close();
  }
}

module.exports = { imageSizeFromFile, setConcurrency, get concurrency() { return concurrency; } };
